"""Évolution mensuelle : une ligne par mois de la période (mois vides inclus)."""
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum
from django.db.models.functions import TruncMonth

from ..models import Candidature, OffreEmploi, PaiementAbonnement
from .periode import mois_de_la_periode, restreindre

User = get_user_model()


def _par_mois(queryset, champ_date, agregat):
    """{'AAAA-MM': valeur} en une seule requête GROUP BY."""
    lignes = (
        queryset.annotate(mois=TruncMonth(champ_date))
        .values('mois').annotate(valeur=agregat).order_by('mois')
    )
    return {ligne['mois'].strftime('%Y-%m'): ligne['valeur'] or 0 for ligne in lignes if ligne['mois']}


def calculer_evolution(debut, fin, entreprise_id=None):
    plage = [debut, fin]
    series = {
        'offres': _par_mois(
            restreindre(OffreEmploi.objects.filter(date_publication__date__range=plage),
                        'entreprise_id', entreprise_id),
            'date_publication', Count('id')),
        'candidatures': _par_mois(
            restreindre(Candidature.objects.filter(date_postulation__date__range=plage),
                        'offre__entreprise_id', entreprise_id),
            'date_postulation', Count('id')),
        'recrutements': _par_mois(
            restreindre(Candidature.objects.filter(statut='RETENU', date_maj__date__range=plage),
                        'offre__entreprise_id', entreprise_id),
            'date_maj', Count('id')),
        'revenu_da': _par_mois(
            restreindre(PaiementAbonnement.objects.filter(date_paiement__date__range=plage),
                        'entreprise_id', entreprise_id),
            'date_paiement', Sum('montant_da')),
    }
    if not entreprise_id:  # inscriptions : non rattachables à une entreprise
        series['inscriptions_candidats'] = _par_mois(
            User.objects.filter(role='CANDIDAT', date_joined__date__range=plage),
            'date_joined', Count('id'))
        series['inscriptions_recruteurs'] = _par_mois(
            User.objects.filter(role='RECRUTEUR', date_joined__date__range=plage),
            'date_joined', Count('id'))
    resultat = []
    for premier_jour in mois_de_la_periode(debut, fin):
        cle = premier_jour.strftime('%Y-%m')
        ligne = {'mois': cle}
        for nom, valeurs in series.items():
            ligne[nom] = valeurs.get(cle, 0)
        resultat.append(ligne)
    return resultat
