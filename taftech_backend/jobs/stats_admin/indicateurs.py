"""Indicateurs clés d'une période, avec variation par rapport à la période précédente."""
from django.contrib.auth import get_user_model
from django.db.models import Sum

from ..models import Candidature, OffreEmploi, PaiementAbonnement
from .periode import periode_precedente, restreindre, variation_pct

User = get_user_model()

# Inscriptions de candidats / recruteurs : non rattachables à une entreprise → masquées quand
# le filtre « entreprise » est actif (plutôt qu'un chiffre trompeur).
INDICATEURS_GLOBAUX = ('inscriptions_candidats', 'inscriptions_recruteurs')


def _offres(debut, fin, entreprise_id):
    qs = OffreEmploi.objects.filter(date_publication__date__range=[debut, fin])
    return restreindre(qs, 'entreprise_id', entreprise_id).count()


def _candidatures(debut, fin, entreprise_id):
    qs = Candidature.objects.filter(date_postulation__date__range=[debut, fin])
    return restreindre(qs, 'offre__entreprise_id', entreprise_id).count()


def _inscriptions(role):
    def compter(debut, fin, entreprise_id):
        return User.objects.filter(role=role, date_joined__date__range=[debut, fin]).count()
    return compter


def _recrutements(debut, fin, entreprise_id):
    # `date_maj` = dernière modification : approximation de la date du passage à « Retenu »
    # (pas d'historique des changements de statut).
    qs = Candidature.objects.filter(statut='RETENU', date_maj__date__range=[debut, fin])
    return restreindre(qs, 'offre__entreprise_id', entreprise_id).count()


def _revenu(debut, fin, entreprise_id):
    qs = PaiementAbonnement.objects.filter(date_paiement__date__range=[debut, fin])
    return restreindre(qs, 'entreprise_id', entreprise_id).aggregate(t=Sum('montant_da'))['t'] or 0


INDICATEURS = {
    'offres': _offres,
    'candidatures': _candidatures,
    'inscriptions_candidats': _inscriptions('CANDIDAT'),
    'inscriptions_recruteurs': _inscriptions('RECRUTEUR'),
    'recrutements': _recrutements,
    'revenu_da': _revenu,
}


def calculer_indicateurs(debut, fin, entreprise_id=None):
    debut_prec, fin_prec = periode_precedente(debut, fin)
    resultat = {}
    for nom, compter in INDICATEURS.items():
        if entreprise_id and nom in INDICATEURS_GLOBAUX:
            continue
        valeur = compter(debut, fin, entreprise_id)
        precedente = compter(debut_prec, fin_prec, entreprise_id)
        resultat[nom] = {
            'valeur': valeur,
            'precedente': precedente,
            'variation_pct': variation_pct(valeur, precedente),
        }
    return resultat
