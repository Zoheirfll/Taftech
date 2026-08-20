"""Point d'entrée unique pour tous les appels LLM du projet — isole le fournisseur (Groq
aujourd'hui, Ollama prévu post-déploiement) derrière une interface commune. Avant ce module,
Groq était appelé en dur à 3 endroits différents (cv_parser.py, jobs/views/ia.py x2) ; le champ
`AIConfig.provider` existait mais n'avait aucun effet réel. Objectif : que basculer vers Ollama en
prod soit un changement de config admin, pas un futur chantier de refactor.
"""
import os
import logging
from groq import Groq
import ollama

logger = logging.getLogger(__name__)

_groq_client = None


def _get_groq_client():
    global _groq_client
    if _groq_client is None:
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            return None
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def call_ai(messages, max_tokens=500, temperature=None, response_format=None, timeout=25):
    """Appelle le moteur IA configuré (`AIConfig.provider`) et retourne le texte brut de la
    réponse. Lève une exception si l'appel échoue — à charge de l'appelant de la catcher, comme
    c'était déjà le cas avant ce module (aucun changement de contrat pour les appelants)."""
    from .models import AIConfig
    config = AIConfig.get_solo()
    temp = temperature if temperature is not None else config.temperature

    if config.provider == 'OLLAMA':
        return _call_ollama(messages, config.ollama_model, max_tokens, temp)
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
    response = client.chat.completions.create(**kwargs)
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
    return response['message']['content']
