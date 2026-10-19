"""Point d'entrée unique pour tous les appels LLM du projet — isole le fournisseur (Groq
aujourd'hui, Ollama prévu post-déploiement) derrière une interface commune. Avant ce module,
Groq était appelé en dur à 3 endroits différents (cv_parser.py, jobs/views/ia.py x2) ; le champ
`AIConfig.provider` existait mais n'avait aucun effet réel. Objectif : que basculer vers Ollama en
prod soit un changement de config admin, pas un futur chantier de refactor.
"""
import os
import logging
from contextvars import ContextVar
from django.core.cache import cache
from groq import Groq, RateLimitError
import ollama

logger = logging.getLogger(__name__)

_groq_client = None

# Disjoncteur : quand Groq répond 429 (quota du plan atteint), on arrête d'appeler le fournisseur
# pendant quelques instants au lieu de le marteler (ce qui ne ferait qu'aggraver la saturation du
# plan gratuit). Le site continue de fonctionner : seules les fonctions IA sont indisponibles.
CLE_SATURATION = 'ia_fournisseur_sature'
DELAI_SATURATION_DEFAUT = 60
DELAI_SATURATION_MIN = 30
DELAI_SATURATION_MAX = 3600


class FournisseurIASature(Exception):
    """Le fournisseur IA a refusé l'appel faute de quota (HTTP 429), ou est en pause de précaution.
    Distinct d'une panne : l'appel de l'utilisateur est remboursé (voir ia_quota.rembourser_quota_ia)."""


def fournisseur_sature() -> bool:
    return bool(cache.get(CLE_SATURATION))


# Vrai quand la demande EN COURS a elle-même été refusée par le fournisseur (429 reçu, ou appel
# bloqué par la pause). Sert à ne rembourser que les appels réellement refusés pour cette raison :
# le drapeau global `fournisseur_sature()` peut être levé alors qu'une demande échoue pour une autre
# cause (modèle de détection indisponible, par exemple). Remis à zéro à la fin de la demande.
SATURATION_DEMANDE: ContextVar = ContextVar("saturation_demande", default=False)


def saturation_de_la_demande() -> bool:
    return SATURATION_DEMANDE.get()


def _delai_attente(exc) -> int:
    """Durée de pause : l'en-tête `retry-after` du fournisseur s'il existe, borné pour ne jamais
    bloquer l'IA trop longtemps ni marteler un fournisseur saturé."""
    try:
        brut = exc.response.headers.get('retry-after')
        delai = int(float(brut)) if brut is not None else DELAI_SATURATION_DEFAUT
    except Exception:
        delai = DELAI_SATURATION_DEFAUT
    return max(DELAI_SATURATION_MIN, min(DELAI_SATURATION_MAX, delai))


def _get_groq_client():
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            return None
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def _entier(valeur):
    """Nombre de tokens exploitable, sinon 0 : un fournisseur qui ne renvoie pas d'usage (ou une
    valeur inattendue) ne doit jamais faire échouer l'appel IA de l'utilisateur."""
    return valeur if isinstance(valeur, int) and not isinstance(valeur, bool) and valeur >= 0 else 0


def _enregistrer_usage(modele, entree, sortie):
    """Journalise les tokens consommés (décomptes seulement, jamais de contenu) et les cumule sur la
    ligne UtilisationIA de la demande en cours, quand il y en a une (voir ia_quota)."""
    logger.info("IA tokens modele=%s entree=%s sortie=%s", modele, entree, sortie)
    try:
        from django.db.models import F
        from .ia_quota import utilisation_courante
        from .models import UtilisationIA
        pk = utilisation_courante()
        if pk:
            UtilisationIA.objects.filter(pk=pk).update(
                tokens_entree=F('tokens_entree') + entree,
                tokens_sortie=F('tokens_sortie') + sortie,
                modele=modele or '',
            )
    except Exception:
        logger.exception("Enregistrement des tokens IA en échec")


def call_ai(messages, max_tokens=500, temperature=None, response_format=None, timeout=25,
            donnees_candidat=None):
    """Appelle le moteur IA configuré (`AIConfig.provider`) et retourne le texte brut de la
    réponse. Lève une exception si l'appel échoue — à charge de l'appelant de la catcher, comme
    c'était déjà le cas avant ce module.

    `donnees_candidat` : texte des données d'un candidat contenues dans `messages`. S'il est
    fourni, l'appel est refusé (FuiteDonneesPersonnelles) quand il contient encore un e-mail,
    un téléphone, une URL personnelle ou un NIN — dernier garde-fou après le nettoyage."""
    if donnees_candidat is not None:
        from .confidentialite_ia import verifier_absence_pii
        verifier_absence_pii(donnees_candidat)
    from .models import AIConfig
    config = AIConfig.get_solo()
    temp = temperature if temperature is not None else config.temperature

    if config.provider == 'OLLAMA':
        return _call_ollama(messages, config.ollama_model, max_tokens, temp)
    if fournisseur_sature():
        SATURATION_DEMANDE.set(True)
        raise FournisseurIASature("Fournisseur IA en pause (quota atteint).")
    return _call_groq(messages, config.groq_model, config.reasoning_effort, max_tokens, temp, response_format, timeout)


def _call_groq(messages, model, reasoning_effort, max_tokens, temperature, response_format, timeout):
    client = _get_groq_client()
    if client is None:
        raise Exception("GROQ_API_KEY non configurée.")
    kwargs = dict(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=timeout,
        reasoning_effort=reasoning_effort,
    )
    if response_format:
        kwargs['response_format'] = response_format
    try:
        response = client.chat.completions.create(**kwargs)
    except RateLimitError as exc:
        delai = _delai_attente(exc)
        cache.set(CLE_SATURATION, True, timeout=delai)
        # Jamais le corps de la réponse d'erreur dans les journaux : seulement le fait et la durée.
        logger.warning("Groq : quota atteint (429), appels IA suspendus %s s", delai)
        SATURATION_DEMANDE.set(True)
        raise FournisseurIASature("Quota du fournisseur IA atteint.") from exc
    usage = getattr(response, 'usage', None)
    _enregistrer_usage(
        model,
        _entier(getattr(usage, 'prompt_tokens', 0)),
        _entier(getattr(usage, 'completion_tokens', 0)),
    )
    return response.choices[0].message.content


def _call_ollama(messages, model, max_tokens, temperature):
    """⚠️ Non validé en conditions réelles — aucun serveur Ollama local n'est disponible dans cet
    environnement de dev pour tester. Câblage prêt pour la migration post-déploiement (roadmap
    CLAUDE.md), mais à vérifier contre un vrai serveur `ollama serve` avant tout usage prod."""
    response = ollama.chat(
        model=model,
        messages=messages,
        options={"temperature": temperature, "num_predict": max_tokens},
    )
    _enregistrer_usage(
        model,
        _entier(getattr(response, 'prompt_eval_count', 0)),
        _entier(getattr(response, 'eval_count', 0)),
    )
    return response['message']['content']
