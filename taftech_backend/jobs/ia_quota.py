"""Quotas d'usage IA — vérification serveur avant tout appel Groq/Ollama, résolution du quota
effectif (override compte > palier recruteur / config candidat > illimité), anti-appels
simultanés, plafond global de dépense. Voir CLAUDE.md pour le contexte client (demande de
limiter parser CV / suggestions métiers / génération offre / analyse recruteur / conseils
dashboard, par compte, avec compteur visible et repli manuel).

Convention du projet reconduite ici (déjà utilisée par quota_cv_atteint) : jamais de compteur
stocké à incrémenter/reset — toujours recompter les lignes UtilisationIA de la période en cours.
"""
import logging
from contextvars import ContextVar

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .confidentialite_ia.audit import COMPTEUR_ENTITES
from .models import AIConfig, QuotaIAOverride, UtilisationIA

logger = logging.getLogger(__name__)

# Clé (pk) de la ligne UtilisationIA de la demande en cours : `call_ai` y ajoute les tokens
# consommés, `liberer_verrou_ia` la vide. Une demande peut faire plusieurs appels IA (parser,
# métiers, diplômes) : tous se cumulent sur la même ligne.
_utilisation_courante: ContextVar = ContextVar("utilisation_ia_courante", default=None)

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


def appels_ia_du_mois():
    """Appels IA du mois en cours, tous comptes et toutes fonctions confondus (base du plafond global)."""
    return UtilisationIA.objects.filter(date_heure__gte=_debut_mois()).exclude(statut='REMBOURSE').count()


def consommation_par_fonction_du_mois():
    """Consommation IA du mois en cours, par fonctionnalité : appels décomptés, appels remboursés
    (refus du fournisseur) et tokens (entrée/sortie). Base du futur plafond de dépense Groq."""
    from django.db.models import Count, Q, Sum
    agregats = {
        a['fonction']: a
        for a in UtilisationIA.objects.filter(date_heure__gte=_debut_mois()).values('fonction').annotate(
            appels=Count('id', filter=~Q(statut='REMBOURSE')),
            remboursees=Count('id', filter=Q(statut='REMBOURSE')),
            entree=Sum('tokens_entree'),
            sortie=Sum('tokens_sortie'),
        )
    }
    resultat = []
    for fonction, libelle in UtilisationIA.FONCTION_CHOICES:
        a = agregats.get(fonction, {})
        appels, entree, sortie = a.get('appels', 0), a.get('entree') or 0, a.get('sortie') or 0
        resultat.append({
            'fonction': fonction,
            'libelle': libelle,
            'appels': appels,
            'remboursees': a.get('remboursees', 0),
            'tokens_entree': entree,
            'tokens_sortie': sortie,
            'moyenne_tokens': round((entree + sortie) / appels) if appels else 0,
        })
    return resultat


def _compter(user, fonction, depuis):
    # Un appel remboursé (refus du fournisseur) ne compte dans aucun quota.
    return UtilisationIA.objects.filter(
        user_id__in=_utilisateurs_du_quota(user, fonction), fonction=fonction, date_heure__gte=depuis,
    ).exclude(statut='REMBOURSE').count()


def verifier_quota_ia(user, fonction):
    """Retourne (ok: bool, payload: dict). `payload` contient toujours quota_restant_jour/mois
    (None = illimité) ; si ok=False, ajoute 'error', 'code', 'renouvellement_le'."""
    config = AIConfig.get_solo()
    # Fournisseur en pause (quota du plan Groq atteint) : on le dit tout de suite, sans verrou ni
    # décompte. Le reste de la plateforme n'est pas concerné ; la lecture d'un résultat déjà stocké
    # est traitée avant cette vérification par les vues.
    from .ai_engine import fournisseur_sature
    if config.provider == 'GROQ' and fournisseur_sature():
        return False, {
            'error': "L'analyse IA est temporairement indisponible. Vous pouvez poursuivre manuellement.",
            'code': 'IA_FOURNISSEUR_SATURE',
            'renouvellement_le': None,
        }
    if config.budget_ia_appels_mois_max is not None:
        total_mois = appels_ia_du_mois()
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
    ligne = UtilisationIA.objects.create(user=user, fonction=fonction)
    # La demande en cours : les appels IA qui suivent y cumulent leurs tokens, et le masquage y
    # compte les entités retirées (flush dans liberer_verrou_ia).
    _utilisation_courante.set(ligne.pk)
    COMPTEUR_ENTITES.set({})
    try:
        verifier_alertes_budget_ia()
    except Exception:
        # Une panne d'alerte ne doit jamais bloquer la fonctionnalité IA de l'utilisateur.
        logger.exception("Vérification des alertes de budget IA en échec")
    return ligne


def utilisation_courante():
    """Clé de la ligne UtilisationIA de la demande en cours, ou None hors contexte de quota."""
    return _utilisation_courante.get()


def rembourser_quota_ia():
    """Rembourse l'appel de la demande en cours : le fournisseur a refusé faute de quota (429), ce
    n'est pas la faute de l'utilisateur. La ligne reste dans le journal (traçabilité) mais ne compte
    plus dans aucun quota ni dans le plafond global. À appeler avant `liberer_verrou_ia`.
    Les autres pannes (délai dépassé, JSON invalide) restent décomptées, comme demandé le 18/08."""
    pk = _utilisation_courante.get()
    if pk:
        UtilisationIA.objects.filter(pk=pk).update(statut='REMBOURSE')


def verifier_alertes_budget_ia():
    """Alerte les Super Admins quand le plafond global mensuel approche (seuil `budget_ia_alerte_pct`)
    puis quand il est épuisé. Sans plafond défini, rien à surveiller."""
    config = AIConfig.get_solo()
    plafond = config.budget_ia_appels_mois_max
    if not plafond:
        return
    total = appels_ia_du_mois()
    if total >= plafond:
        niveau = 'EPUISE'
    elif total * 100 >= plafond * config.budget_ia_alerte_pct:
        niveau = 'ALERTE'
    else:
        return
    _notifier_budget_une_fois(niveau, total, plafond, config.budget_ia_alerte_pct)


def _notifier_budget_une_fois(niveau, total, plafond, pct):
    """Une alerte par mois et par niveau : la clé est enregistrée en base sous verrou de ligne
    (deux appels simultanés n'envoient pas deux emails), l'email part après le commit."""
    cle = f"{_debut_mois():%Y-%m}:{niveau}"
    mois = cle.split(':')[0]
    with transaction.atomic():
        config = AIConfig.objects.select_for_update().get(pk=1)
        deja = config.budget_ia_alertes_envoyees or []
        if cle in deja:
            return
        config.budget_ia_alertes_envoyees = [k for k in deja if k.startswith(mois)] + [cle]
        config.save(update_fields=['budget_ia_alertes_envoyees'])
        transaction.on_commit(lambda: _envoyer_alerte_budget(niveau, total, plafond, pct))


def _destinataires_alerte_budget():
    emails = list(
        get_user_model().objects.filter(is_superuser=True, is_active=True).exclude(email='').values_list('email', flat=True)
    )
    return emails or ([settings.EMAIL_HOST_USER] if settings.EMAIL_HOST_USER else [])


def _envoyer_alerte_budget(niveau, total, plafond, pct):
    destinataires = _destinataires_alerte_budget()
    if not destinataires:
        logger.warning("Alerte budget IA (%s) non envoyée : aucun destinataire.", niveau)
        return
    if niveau == 'EPUISE':
        sujet = "[TafTech] Budget IA épuisé : fonctionnalités IA suspendues"
        situation = (
            f"Le plafond mensuel global de {plafond} appels IA est atteint ({total} appels ce mois-ci). "
            "Toutes les fonctionnalités IA sont temporairement indisponibles pour tous les comptes "
            "jusqu'au début du mois prochain, ou jusqu'à relèvement du plafond."
        )
    else:
        sujet = f"[TafTech] Budget IA : {pct} % du plafond mensuel atteint"
        situation = (
            f"{total} appels IA sur un plafond mensuel global de {plafond} (seuil d'alerte : {pct} %). "
            "Au plafond, toutes les fonctionnalités IA seront suspendues pour tous les comptes."
        )
    corps = (
        f"{situation}\n\n"
        "Si cette consommation est inhabituelle, consultez le journal d'audit et les quotas par compte "
        "(Administration > Configuration IA) avant de relever le plafond.\n\nTafTech"
    )
    try:
        send_mail(sujet, corps, settings.DEFAULT_FROM_EMAIL, destinataires, fail_silently=False)
    except Exception:
        logger.exception("Envoi de l'alerte budget IA (%s) en échec", niveau)


def acquerir_verrou_ia(user, fonction, ttl=30):
    """Anti-appels simultanés — True si le verrou est obtenu, False si un appel est déjà en cours
    pour ce compte/fonction (`cache.add` est atomique)."""
    return cache.add(f"ia_lock_{user.id}_{fonction}", 1, timeout=ttl)


def liberer_verrou_ia(user, fonction):
    """Libère le verrou et clôt la demande : enregistre le décompte des entités masquées sur la ligne
    UtilisationIA, puis vide le contexte (aucune fuite d'une requête vers la suivante)."""
    try:
        pk, compteur = _utilisation_courante.get(), COMPTEUR_ENTITES.get()
        if pk and compteur:
            UtilisationIA.objects.filter(pk=pk).update(entites_masquees=compteur)
    except Exception:
        # Le journal d'audit ne doit jamais empêcher de libérer le verrou de l'utilisateur.
        logger.exception("Enregistrement du décompte des entités masquées en échec")
    finally:
        _utilisation_courante.set(None)
        COMPTEUR_ENTITES.set(None)
        cache.delete(f"ia_lock_{user.id}_{fonction}")
