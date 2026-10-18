"""Revenus et abonnements : état actuel + revenu de la période.

`AbonnementEntreprise` est en OneToOne sans historique des changements de palier : on ne peut
montrer que l'ÉTAT ACTUEL (répartition, expirations), pas une conversion gratuit → payant dans
le temps. Le revenu vient de `PaiementAbonnement` (hors activations manuelles sans paiement).
"""
import datetime

from django.db.models import Count, Q, Sum
from django.utils import timezone

from ..models import AbonnementEntreprise, PaiementAbonnement
from .periode import restreindre

FENETRES_EXPIRATION_JOURS = (7, 30)


def calculer_abonnements(debut, fin, entreprise_id=None):
    maintenant = timezone.now()
    actifs = restreindre(
        AbonnementEntreprise.objects.filter(
            Q(date_expiration__isnull=True) | Q(date_expiration__gte=maintenant)),
        'entreprise_id', entreprise_id)
    par_palier = [
        {'palier': ligne['palier__nom'], 'nb': ligne['nb']}
        for ligne in actifs.values('palier__nom').annotate(nb=Count('id')).order_by('-nb')
    ]
    expirations = {
        f"sous_{jours}_jours": actifs.filter(
            date_expiration__isnull=False,
            date_expiration__lte=maintenant + datetime.timedelta(days=jours),
        ).count()
        for jours in FENETRES_EXPIRATION_JOURS
    }
    paiements = restreindre(
        PaiementAbonnement.objects.filter(date_paiement__date__range=[debut, fin]),
        'entreprise_id', entreprise_id)
    revenu_par_palier = [
        {'palier': ligne['palier_nom'], 'nb_paiements': ligne['nb'], 'total_da': ligne['total'] or 0}
        for ligne in paiements.values('palier_nom')
        .annotate(nb=Count('id'), total=Sum('montant_da')).order_by('-total')
    ]
    return {
        'actifs': actifs.count(),
        'par_palier': par_palier,
        'expirations': expirations,
        'revenu_par_palier': revenu_par_palier,
    }
