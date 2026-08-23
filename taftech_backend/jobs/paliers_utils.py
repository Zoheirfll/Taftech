"""Helpers de gating pour le nouveau système de paliers d'abonnement (Starter/Pro/Business/
Enterprise) — voir docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md.

Le palier "Gratuit" n'est pas une ligne en base : c'est l'absence d'AbonnementEntreprise actif
pour l'entreprise. Ces fonctions sont la seule source de vérité pour "quel palier / quel accès a
cette entreprise" — ne pas dupliquer cette logique ailleurs."""


def get_palier_actif(entreprise):
    """Retourne le Palier actif de l'entreprise, ou None si aucun abonnement actif (palier
    Gratuit implicite).

    Repli legacy : si l'entreprise a `est_premium_actif=True` (ancien champ binaire) mais pas
    encore d'AbonnementEntreprise, on retombe sur BUSINESS — même mapping que la migration de
    données 0080. Nécessaire car les flux d'activation existants (AdminDemandesPremiumAPIView,
    webhook Chargily) écrivent encore directement `est_premium`/`premium_expire_at` sans créer
    d'AbonnementEntreprise (leur rebranchement sur le nouveau modèle est hors scope de cette
    phase) — sans ce repli, un compte fraîchement activé par ces flux se retrouverait bloqué
    partout malgré un paiement réel."""
    if entreprise is None:
        return None
    abonnement = getattr(entreprise, 'abonnement', None)
    if abonnement is not None and abonnement.est_actif:
        return abonnement.palier
    if entreprise.est_premium_actif:
        from .models import Palier
        return Palier.objects.filter(nom='BUSINESS').first()
    return None


def limite_offres_actives(entreprise):
    """Nombre max d'offres actives autorisées (None = illimité). Gratuit = 1 (pas de ligne
    Palier pour ce cas, valeur codée en dur ici — seul endroit où ce chiffre existe)."""
    palier = get_palier_actif(entreprise)
    if palier is None:
        return 1
    return palier.limite_offres


def quota_cv_atteint(entreprise):
    """True si l'entreprise a atteint son quota mensuel de téléchargements CV (limite_cv_mois).
    Recompte toujours les logs du mois calendaire en cours — pas de compteur stocké à
    incrémenter/reset, aucun risque de dérive. None de limite = jamais atteint."""
    palier = get_palier_actif(entreprise)
    limite = palier.limite_cv_mois if palier else 0  # Gratuit n'a de toute façon pas accès à la CVthèque
    if limite is None:
        return False
    from django.utils import timezone
    from .models import TelechargementCV
    debut_mois = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    nb_ce_mois = TelechargementCV.objects.filter(
        entreprise=entreprise, date_telechargement__gte=debut_mois,
    ).count()
    return nb_ce_mois >= limite
