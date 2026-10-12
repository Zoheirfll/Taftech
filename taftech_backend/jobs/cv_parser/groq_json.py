"""Appel Groq pour le parsing et réparation/extraction du JSON renvoyé par l'IA."""
import re
import json
import logging


logger = logging.getLogger(__name__)


def _call_groq(prompt, max_tokens=3000):
    """
    Appelle le moteur IA configuré (Groq ou Ollama selon AIConfig.provider) avec un timeout.
    Nom conservé pour compatibilité (domaine_agent.py l'importe) même si l'appel réel passe
    désormais par jobs.ai_engine, pas forcément Groq.
    Retourne la string de réponse ou None en cas d'erreur.
    """
    from ..ai_engine import call_ai
    try:
        content = call_ai(
            [{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0,  # extraction/classification : mêmes entrées => mêmes sorties
        )
        return content.strip() if content else None
    except Exception as e:
        logger.error("IA (parser CV) : erreur - %s", e)
        return None


def _extract_json_array(content):
    """Helper : nettoie et extrait un tableau JSON depuis la réponse d'Ollama."""
    if not content:
        return None

    # Nettoie les fences markdown
    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)

    # Cherche le premier [ et le dernier ]
    first = content.find("[")
    last = content.rfind("]")
    if first == -1 or last == -1:
        return None

    json_str = content[first:last + 1]
    try:
        data = json.loads(json_str)
        if isinstance(data, list):
            return data
    except json.JSONDecodeError as e:
        logger.warning("Ollama : JSON invalide - %s", e)
    return None

def _repair_truncated_json(json_str):
    """Tente de récupérer les données déjà générées par une réponse Groq coupée en
    plein milieu (max_tokens atteint pendant "experiences"/"formations", typiquement sur
    un CV avec plusieurs entrées) — plutôt que de tout jeter, referme proprement les
    structures encore ouvertes. Essaie d'abord de simplement fermer ce qui reste ouvert
    (le contenu peut déjà être complet, seule la fermeture finale manque) ; si ça échoue,
    revient au dernier élément complet du tableau/objet ("sûr", juste après une virgule),
    puis à l'avant-dernier, etc., jusqu'à obtenir un JSON valide. Retourne le dict décodé,
    ou None si rien n'est récupérable."""
    stack = []
    in_string = False
    escape = False
    coupures = []  # [(index juste après la virgule, snapshot de la pile)], dans l'ordre

    for i, ch in enumerate(json_str):
        if in_string:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch in '{[':
            stack.append(ch)
        elif ch in '}]':
            if stack:
                stack.pop()
        elif ch == ',' and stack:
            coupures.append((i + 1, list(stack)))

    if not stack:
        return None  # déjà bien formé — pas de coupure à réparer ici

    def _fermer(texte, pile_ouverte):
        return texte + ''.join('}' if b == '{' else ']' for b in reversed(pile_ouverte))

    candidats = [_fermer(json_str, stack)]
    for idx, pile in reversed(coupures):
        candidats.append(_fermer(json_str[:idx], pile))

    for candidat in candidats:
        try:
            data = json.loads(candidat)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            continue
    return None


def _extract_json_object(content):
    """Helper : nettoie et extrait un objet JSON depuis la réponse de Groq."""
    if not content:
        return None

    content = re.sub(r"^```(?:json)?\s*", "", content)
    content = re.sub(r"\s*```$", "", content)

    first = content.find("{")
    if first == -1:
        return None
    last = content.rfind("}")
    # Aucune accolade fermante du tout = réponse coupée avant même la fin de l'objet
    # racine (max_tokens atteint) — on garde tout depuis la 1ère accolade, la
    # réparation ci-dessous se charge de refermer proprement.
    json_str = content[first:last + 1] if last != -1 else content[first:]

    # Groq échappe parfois les apostrophes françaises en \' , une séquence invalide en
    # JSON strict (seul \" est un échappement JSON valide) — testé sur les deux variantes.
    candidats = (json_str, json_str.replace("\\'", "'"))

    for candidat in candidats:
        try:
            data = json.loads(candidat)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            continue

    for candidat in candidats:
        data = _repair_truncated_json(candidat)
        if isinstance(data, dict):
            logger.warning(
                "Groq : réponse JSON tronquée par max_tokens, récupérée partiellement "
                "(certaines entrées de fin de tableau ont pu être perdues)"
            )
            return data

    logger.warning("Groq : JSON object invalide, irrécupérable")
    return None
