"""Page admin « KPI » : une quinzaine d'indicateurs de pilotage, chacun comparé à la période précédente.

Réutilise `periode.py` (période, variation) et les calculs de la page « Statistiques » quand ils
existent déjà (`indicateurs`, `abonnements`, `recrutement`). Ne contient que des agrégats : aucune
donnée personnelle de candidat ou de recruteur, aucun contenu de CV.

Limites assumées (affichées à l'écran) :
- « comptes connectés » = `last_login` dans la période : un compte qui s'est reconnecté plus tard
  n'est plus compté sur une période passée (Django ne garde que la dernière connexion) ;
- le délai de réponse du recruteur n'est PAS calculé : `Candidature.date_reponse` est en `auto_now`
  (modifiée à chaque sauvegarde), elle ne mesure donc pas une première réponse.
"""
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum

from ..models import (
    AccesCandidatDebloque, Candidature, DemandeAjout, OffreEmploi, ParsingCV, PaiementCreditPack,
    ProfilEntreprise, UtilisationIA,
)
from .abonnements import calculer_abonnements
from .indicateurs import calculer_indicateurs
from .periode import periode_precedente, variation_pct
from .recrutement import calculer_matching, calculer_offres

User = get_user_model()


def _comptes_connectes(debut, fin):
    return User.objects.filter(last_login__date__range=[debut, fin]).count()


def _revenu_packs(debut, fin):
    return PaiementCreditPack.objects.filter(
        date_paiement__date__range=[debut, fin]).aggregate(t=Sum('montant_da'))['t'] or 0


def _deblocages(debut, fin):
    return AccesCandidatDebloque.objects.filter(date_debloque__date__range=[debut, fin]).count()


def _appels_ia(debut, fin):
    return UtilisationIA.objects.filter(statut='ACCEPTE', date_heure__date__range=[debut, fin]).count()


def _tokens_ia(debut, fin):
    total = UtilisationIA.objects.filter(statut='ACCEPTE', date_heure__date__range=[debut, fin]).aggregate(
        e=Sum('tokens_entree'), s=Sum('tokens_sortie'))
    return (total['e'] or 0) + (total['s'] or 0)


def _cv_analyses(debut, fin):
    return ParsingCV.objects.filter(date__date__range=[debut, fin]).count()


def _cv_en_echec(debut, fin):
    return ParsingCV.objects.filter(date__date__range=[debut, fin], succes=False).count()


def _taux_echec_cv(debut, fin):
    """% de parsings en échec ; None s'il n'y a eu aucun parsing (rien à mesurer)."""
    total = _cv_analyses(debut, fin)
    return round(_cv_en_echec(debut, fin) / total * 100, 1) if total else None


def _mesure(compter, debut, fin, debut_prec, fin_prec):
    valeur, precedente = compter(debut, fin), compter(debut_prec, fin_prec)
    variation = None if valeur is None or precedente is None else variation_pct(valeur, precedente)
    return {'valeur': valeur, 'precedente': precedente, 'variation_pct': variation}


def calculer_kpi(debut, fin):
    debut_prec, fin_prec = periode_precedente(debut, fin)
    indicateurs = calculer_indicateurs(debut, fin)
    offres = calculer_offres(debut, fin)
    abonnements = calculer_abonnements(debut, fin)

    def mesure(compter):
        return _mesure(compter, debut, fin, debut_prec, fin_prec)

    candidatures = indicateurs['candidatures']['valeur']
    return {
        'periode': {'debut': debut.isoformat(), 'fin': fin.isoformat()},
        'croissance': {
            'inscriptions_candidats': indicateurs['inscriptions_candidats'],
            'inscriptions_recruteurs': indicateurs['inscriptions_recruteurs'],
            'comptes_connectes': mesure(_comptes_connectes),
        },
        'activite': {
            'offres': indicateurs['offres'],
            'candidatures': indicateurs['candidatures'],
            'recrutements': indicateurs['recrutements'],
            'candidatures_par_offre': offres['candidatures_par_offre'],
            'offres_sans_candidature': offres['sans_candidature'],
            # Part des candidatures déposées pendant la période qui ont abouti à « Retenu ».
            'taux_recrutement_pct': round(indicateurs['recrutements']['valeur'] / candidatures * 100, 1)
            if candidatures else None,
            'score_matching_moyen': calculer_matching(debut, fin)['moyenne'],
        },
        'revenus': {
            'revenu_abonnements_da': indicateurs['revenu_da'],
            'revenu_packs_da': mesure(_revenu_packs),
            'deblocages_cvtheque': mesure(_deblocages),
            'abonnements_actifs': abonnements['actifs'],
            'expirent_sous_7_jours': abonnements['expirations']['sous_7_jours'],
            'expirent_sous_30_jours': abonnements['expirations']['sous_30_jours'],
        },
        'ia': {
            'appels': mesure(_appels_ia),
            'tokens': mesure(_tokens_ia),
            'cv_analyses': mesure(_cv_analyses),
            'cv_en_echec': mesure(_cv_en_echec),
            'taux_echec_cv_pct': mesure(_taux_echec_cv),
        },
        'a_traiter': {
            'entreprises_a_valider': ProfilEntreprise.objects.filter(est_approuvee=False).count(),
            'offres_a_moderer': OffreEmploi.objects.filter(statut_moderation='EN_ATTENTE').count(),
            'demandes_ajout': DemandeAjout.objects.filter(statut=DemandeAjout.STATUT_A_EXAMINER).count(),
            # Candidatures jamais ouvertes par un recruteur (statut d'origine), toutes périodes confondues.
            'candidatures_recues': Candidature.objects.filter(statut='RECUE').count(),
        },
    }
