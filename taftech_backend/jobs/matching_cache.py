"""Cache partagé des scores de matching (candidat -> toutes les offres actives).

Contexte : le dashboard candidat (`CandidatDashboard.jsx`) charge en parallèle
`OffresRecommandeesAPIView` ET le Score de profil (`profile_score._score_pertinence_marche`)
— les deux scoraient indépendamment TOUTES les offres actives du catalogue à chaque
chargement (~500 offres = ~1000 calculs de matching synchrones par visite). Ce module
mutualise ce calcul en un seul endroit, mis en cache par candidat.

Ne JAMAIS utiliser ce cache pour le score figé au moment d'une vraie candidature
(`PostulerAPIView`/`PostulerRapideAPIView`) ni pour le matching CVthèque (une offre à la
fois, déjà bon marché) — uniquement pour les vues qui scorent tout le catalogue.
"""
from django.core.cache import cache
from .models import OffreEmploi
from .matcher import calculer_score_matching

# 10 min : le matching évolue lentement (nouvelle offre, profil modifié) — une fraîcheur
# à la minute près n'a aucune valeur produit ici, contrairement au score figé à la candidature.
SCORES_CACHE_TTL = 600


def scores_offres_actives_pour_candidat(candidat_user, force=False):
    """Retourne [(offre_id, score_total), ...] pour toutes les offres actives.

    `force=True` recalcule et réécrit le cache même s'il existe déjà — utilisé par la
    commande `precalculer_scores_matching` pour pré-chauffer le cache en tâche de fond.
    """
    if not candidat_user or not hasattr(candidat_user, 'profil_candidat'):
        return []

    cache_key = f"scores_offres_actives_{candidat_user.id}"
    if not force:
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

    offres = OffreEmploi.objects.filter(
        est_active=True, statut_moderation='APPROUVEE', est_cloturee=False
    ).select_related('entreprise')

    resultats = [
        (offre.id, calculer_score_matching(candidat_user, offre)['total'])
        for offre in offres
    ]
    cache.set(cache_key, resultats, SCORES_CACHE_TTL)
    return resultats


def invalider_scores_candidat(candidat_user):
    """À appeler si on veut forcer un recalcul immédiat (ex. après un gros changement de
    profil) — non branché automatiquement pour l'instant, la fraîcheur 10 min est jugée
    suffisante (voir CLAUDE.md)."""
    cache.delete(f"scores_offres_actives_{candidat_user.id}")
