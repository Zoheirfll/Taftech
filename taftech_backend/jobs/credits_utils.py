"""Helpers de gestion des crédits CVthèque — voir
docs/superpowers/specs/2026-08-29-credits-cvtheque-design.md.

1 crédit débloque coordonnées + CV d'un candidat, à vie, partagé par toute l'équipe de
l'entreprise. Deux pools consommés dans l'ordre : le quota mensuel du palier
(Palier.credits_mois, recompté chaque mois — même principe que quota_cv_atteint avant lui,
jamais un compteur stocké à décrémenter), puis le pool de crédits achetés
(AbonnementEntreprise.credits_achetes_restants, jamais reset, décrémenté à l'usage)."""
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .paliers_utils import get_palier_actif


class CreditsEpuisesError(Exception):
    """Levée par deverrouiller_candidat() quand ni le quota mensuel ni le pool acheté ne
    peuvent couvrir un nouveau déblocage."""
    pass


def _credits_mensuel_utilises_ce_mois(entreprise):
    from .models import AccesCandidatDebloque
    debut_mois = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    return AccesCandidatDebloque.objects.filter(
        entreprise=entreprise, source='MENSUEL', date_debloque__gte=debut_mois,
    ).count()


def credits_disponibles(entreprise):
    """Retourne {'mensuel_restant': int|None, 'achetes_restant': int}. mensuel_restant est
    None si le palier n'a pas de limite (illimité, même sémantique que credits_mois=None)."""
    palier = get_palier_actif(entreprise)
    abonnement = getattr(entreprise, 'abonnement', None)
    achetes_restant = abonnement.credits_achetes_restants if abonnement else 0
    if palier is None:
        return {'mensuel_restant': 0, 'achetes_restant': achetes_restant}
    if palier.credits_mois is None:
        return {'mensuel_restant': None, 'achetes_restant': achetes_restant}
    utilises = _credits_mensuel_utilises_ce_mois(entreprise)
    return {'mensuel_restant': max(0, palier.credits_mois - utilises), 'achetes_restant': achetes_restant}


@transaction.atomic
def deverrouiller_candidat(entreprise, candidat):
    """Débloque coordonnées+CV d'un candidat pour l'entreprise — idempotent (un candidat déjà
    débloqué ne consomme rien, retourne l'accès existant). Consomme le quota mensuel en
    priorité, puis le pool acheté. Lève CreditsEpuisesError si aucun des deux pools ne peut
    couvrir ce déblocage."""
    from .models import AccesCandidatDebloque

    existant = AccesCandidatDebloque.objects.filter(entreprise=entreprise, candidat=candidat).first()
    if existant:
        return existant

    disponibles = credits_disponibles(entreprise)
    if disponibles['mensuel_restant'] is None or disponibles['mensuel_restant'] > 0:
        return AccesCandidatDebloque.objects.create(entreprise=entreprise, candidat=candidat, source='MENSUEL')

    if disponibles['achetes_restant'] > 0:
        from .models import AbonnementEntreprise
        abonnement = entreprise.abonnement
        # Atomic update at database level: decrement only if > 0 (prevents race condition with
        # concurrent calls). If another concurrent request already spent the last credit,
        # updated_count will be 0 and we raise CreditsEpuisesError instead of creating a duplicate row.
        updated_count = AbonnementEntreprise.objects.filter(
            pk=abonnement.pk,
            credits_achetes_restants__gt=0
        ).update(credits_achetes_restants=F('credits_achetes_restants') - 1)
        if updated_count == 0:
            # Another concurrent request already spent the last credit(s)
            raise CreditsEpuisesError("Aucun crédit disponible.")
        return AccesCandidatDebloque.objects.create(entreprise=entreprise, candidat=candidat, source='ACHETE')

    raise CreditsEpuisesError("Aucun crédit disponible.")
