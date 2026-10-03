"""Quotas d'usage IA — vérification serveur avant tout appel Groq/Ollama, résolution du quota
effectif (override compte > palier recruteur / config candidat > illimité), anti-appels
simultanés, plafond global de dépense. Voir CLAUDE.md pour le contexte client (demande de
limiter parser CV / suggestions métiers / génération offre / analyse recruteur / conseils
dashboard, par compte, avec compteur visible et repli manuel).

Convention du projet reconduite ici (déjà utilisée par quota_cv_atteint) : jamais de compteur
stocké à incrémenter/reset — toujours recompter les lignes UtilisationIA de la période en cours.
"""
from django.core.cache import cache
from django.utils import timezone

from .models import AIConfig, QuotaIAOverride, UtilisationIA

# Fonctions gérées côté Palier recruteur (le reste est géré côté AIConfig candidat, flat).
FONCTIONS_RECRUTEUR = {'GENERATION_OFFRE', 'ANALYSE_RECRUTEUR'}

_CHAMP_AICONFIG = {
    'PARSER_CV': 'parser_cv',
    'SUGGESTIONS_METIER': 'analyse_carriere',
    'CONSEILS_DASHBOARD': 'conseils_dashboard',
}
_CHAMP_PALIER = {
    'GENERATION_OFFRE': 'quota_generation_offre',
    'ANALYSE_RECRUTEUR': 'quota_analyse_recruteur',
}


def _debut_jour():
    now = timezone.now()
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


def _debut_mois():
    return _debut_jour().replace(day=1)


def _renouvellement_jour():
    return _debut_jour() + timezone.timedelta(days=1)


def _renouvellement_mois():
    debut = _debut_mois()
    if debut.month == 12:
        return debut.replace(year=debut.year + 1, month=1)
    return debut.replace(month=debut.month + 1)


def _limites_defaut(user, fonction):
    """(limite_jour, limite_mois) — depuis le palier (recruteur) ou AIConfig (candidat)."""
    if fonction in FONCTIONS_RECRUTEUR:
        from .views.equipe import get_entreprise_for_user
        from .paliers_utils import get_palier_actif
        entreprise = get_entreprise_for_user(user)
        palier = get_palier_actif(entreprise) if entreprise else None
        if palier is None:
            return (0, 0)  # pas d'abonnement actif = pas d'accès (cohérent avec le gate existant)
        prefixe = _CHAMP_PALIER[fonction]
        return (getattr(palier, f"{prefixe}_jour"), getattr(palier, f"{prefixe}_mois"))
    config = AIConfig.get_solo()
    prefixe = _CHAMP_AICONFIG[fonction]
    return (getattr(config, f"{prefixe}_limite_jour"), getattr(config, f"{prefixe}_limite_mois"))


def _limites_effectives(user, fonction):
    override = QuotaIAOverride.objects.filter(user=user, fonction=fonction).first()
    if override is not None:
        return (override.limite_jour, override.limite_mois)
    return _limites_defaut(user, fonction)


def _utilisateurs_du_quota(user, fonction):
    """Comptes dont la consommation s'additionne pour le quota de `user`.

    Fonctions recruteur (génération d'offre, analyse candidature) : le quota du palier est celui
    de l'ENTREPRISE — propriétaire + tous ses membres partagent un seul compteur (« 10 au total »,
    pas 10 par membre, sinon une équipe multiplierait le quota affiché). Une dérogation
    (`QuotaIAOverride`) reste par compte, et les fonctions candidat sont toujours par compte."""
    if fonction not in FONCTIONS_RECRUTEUR:
        return [user.id]
    if QuotaIAOverride.objects.filter(user=user, fonction=fonction).exists():
        return [user.id]
    from .views.equipe import get_entreprise_for_user
    from .models import MembreEquipe
    entreprise = get_entreprise_for_user(user)
    if entreprise is None:
        return [user.id]
    ids = {entreprise.user_id, user.id}
    ids.update(MembreEquipe.objects.filter(entreprise=entreprise).values_list('user_id', flat=True))
    return list(ids)


def _compter(user, fonction, depuis):
    return UtilisationIA.objects.filter(
        user_id__in=_utilisateurs_du_quota(user, fonction), fonction=fonction, date_heure__gte=depuis,
    ).count()


def verifier_quota_ia(user, fonction):
    """Retourne (ok: bool, payload: dict). `payload` contient toujours quota_restant_jour/mois
    (None = illimité) ; si ok=False, ajoute 'error', 'code', 'renouvellement_le'."""
    config = AIConfig.get_solo()
    if config.budget_ia_appels_mois_max is not None:
        total_mois = UtilisationIA.objects.filter(date_heure__gte=_debut_mois()).count()
        if total_mois >= config.budget_ia_appels_mois_max:
            return False, {
                'error': "Service IA temporairement saturé (budget mensuel atteint). Réessayez plus tard ou poursuivez manuellement.",
                'code': 'BUDGET_IA_EPUISE',
                'renouvellement_le': _renouvellement_mois().isoformat(),
            }

    limite_jour, limite_mois = _limites_effectives(user, fonction)

    if fonction in FONCTIONS_RECRUTEUR and limite_jour == 0 and limite_mois == 0:
        return False, {
            'error': "Cette fonctionnalité IA nécessite un abonnement actif.",
            'code': 'PALIER_INSUFFISANT',
            'renouvellement_le': None,
        }

    count_jour = _compter(user, fonction, _debut_jour()) if limite_jour is not None else None
    if limite_jour is not None and count_jour >= limite_jour:
        renouvellement = _renouvellement_jour()
        return False, {
            'error': f"Quota IA journalier atteint pour cette fonctionnalité. Renouvellement demain à {renouvellement.strftime('%Hh%M')}. Vous pouvez poursuivre manuellement.",
            'code': 'QUOTA_IA_JOUR_ATTEINT',
            'renouvellement_le': renouvellement.isoformat(),
            'quota_restant_jour': 0,
        }

    count_mois = _compter(user, fonction, _debut_mois()) if limite_mois is not None else None
    if limite_mois is not None and count_mois >= limite_mois:
        renouvellement = _renouvellement_mois()
        return False, {
            'error': f"Quota IA mensuel atteint pour cette fonctionnalité. Renouvellement le {renouvellement.strftime('%d/%m/%Y')}. Vous pouvez poursuivre manuellement.",
            'code': 'QUOTA_IA_MOIS_ATTEINT',
            'renouvellement_le': renouvellement.isoformat(),
            'quota_restant_mois': 0,
        }

    return True, {
        'quota_restant_jour': None if limite_jour is None else max(0, limite_jour - (count_jour or 0)),
        'quota_restant_mois': None if limite_mois is None else max(0, limite_mois - (count_mois or 0)),
        'renouvellement_jour': _renouvellement_jour().isoformat(),
        'renouvellement_mois': _renouvellement_mois().isoformat(),
    }


def consommer_quota_ia(user, fonction):
    """Log l'appel — à appeler dès que la demande est acceptée, avant l'appel IA réel (compte
    même un appel qui échouera côté Groq, sur demande explicite du client)."""
    UtilisationIA.objects.create(user=user, fonction=fonction)


def acquerir_verrou_ia(user, fonction, ttl=30):
    """Anti-appels simultanés — True si le verrou est obtenu, False si un appel est déjà en cours
    pour ce compte/fonction (`cache.add` est atomique)."""
    return cache.add(f"ia_lock_{user.id}_{fonction}", 1, timeout=ttl)


def liberer_verrou_ia(user, fonction):
    cache.delete(f"ia_lock_{user.id}_{fonction}")
