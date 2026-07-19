"""Agent IA dédié à la classification du Domaine ANEM d'une expérience professionnelle.

Séparé du parsing CV (qui extrait 10 choses différentes en un seul appel Groq surchargé)
car la précision de ce code conditionne directement le score de matching. Un appel Groq
dédié, plus petit, et grounded sur de vraies appellations MetierReferentiel trouvées par
mots-clés (RAG léger) réduit les erreurs d'un modèle qui devait deviner un domaine parmi
87 en même temps qu'il extrayait tout le reste du CV.
"""
import logging
import re

from django.db.models import Q

from .models import Domaine, MetierReferentiel
from .referentiel_utils import domaines_list_pour_prompt

logger = logging.getLogger(__name__)

_MOTS_MIN_LEN = 4


def _candidats_pour_experience(titre_poste, description, limite=10):
    """Appellations ANEM réelles dont le titre partage des mots avec le poste/la description
    — sert d'indice concret à l'IA plutôt que de la laisser deviner dans le vide."""
    texte = f"{titre_poste or ''} {description or ''}"
    mots = [m for m in re.findall(r"\w+", texte.lower()) if len(m) >= _MOTS_MIN_LEN]
    if not mots:
        return []
    q = Q()
    for mot in mots:
        q |= Q(titre__icontains=mot)
    qs = (
        MetierReferentiel.objects.filter(q, est_actif=True, domaine__isnull=False)
        .select_related('domaine')
        .values_list('titre', 'domaine__code', 'domaine__libelle')
        .distinct()[:limite]
    )
    return list(qs)


PROMPT_CLASSIFICATION = """Tu es un expert RH spécialisé dans la nomenclature officielle des métiers ANEM (Algérie).

Voici une liste d'expériences professionnelles extraites d'un CV. Pour CHACUNE, détermine le CODE Domaine ANEM le plus précis qui correspond au MÉTIER RÉELLEMENT EXERCÉ (titre du poste + missions décrites), PAS au secteur d'activité de l'entreprise employeuse.

RÈGLES :
- Ignore le secteur de l'employeur si le métier exercé est transverse (ex: comptable dans une clinique = comptabilité, pas santé ; développeur chez un fabricant de véhicules = informatique, pas industrie).
- Chaque expérience est accompagnée d'appellations réelles de la nomenclature ANEM trouvées par recherche de mots-clés, à titre d'indice. Utilise-les comme piste forte si l'une correspond clairement, mais choisis un autre domaine de la liste complète si aucune ne colle vraiment.
- Si le poste est trop vague pour être classé avec confiance (ex: "Stage", "Employé polyvalent" sans autre détail), réponds "" plutôt que de deviner au hasard.
- Réfléchis à la fonction réellement exercée, pas à un seul mot isolé du titre.

LISTE COMPLÈTE DES DOMAINES ANEM (code — libellé) :
{domaines_list}

EXPÉRIENCES À CLASSER :
{experiences_bloc}

FORMAT DE RÉPONSE EXIGÉ (JSON strict, un seul objet, rien d'autre avant/après) :
{{"classifications": [{{"index": 0, "domaine_code": "code ou vide", "raison": "1 phrase courte"}}]}}
"""


def _bloc_experience(i, titre_poste, description, candidats):
    lignes = [f"[{i}] Poste : {titre_poste or '(vide)'}"]
    if description:
        lignes.append(f"Missions : {description[:400]}")
    if candidats:
        appellations = "; ".join(f"{t} → {c} ({l})" for t, c, l in candidats)
        lignes.append(f"Appellations ANEM proches trouvées : {appellations}")
    else:
        lignes.append("Appellations ANEM proches trouvées : aucune")
    return "\n".join(lignes)


def classifier_domaines_experiences(experiences):
    """Classe le Domaine ANEM de chaque expérience via un appel Groq dédié.

    `experiences` : liste de dicts avec au moins titre_poste/description.
    Retourne {index: domaine_code} — n'inclut que les index où l'IA a répondu un code valide.
    """
    from .cv_parser import _call_groq, _extract_json_object  # import différé, évite le cycle

    if not experiences:
        return {}

    blocs = []
    for i, exp in enumerate(experiences):
        titre_poste = exp.get('titre_poste', '') if isinstance(exp, dict) else ''
        description = exp.get('description', '') if isinstance(exp, dict) else ''
        candidats = _candidats_pour_experience(titre_poste, description)
        blocs.append(_bloc_experience(i, titre_poste, description, candidats))

    prompt = PROMPT_CLASSIFICATION.replace(
        "{domaines_list}", domaines_list_pour_prompt()
    ).replace("{experiences_bloc}", "\n\n".join(blocs))

    content = _call_groq(prompt, max_tokens=2000)
    infos = _extract_json_object(content)
    if not infos or not isinstance(infos.get('classifications'), list):
        logger.warning("Agent domaine : réponse Groq invalide ou vide, fallback appelant.")
        return {}

    codes_valides = set(Domaine.objects.values_list('code', flat=True))
    resultats = {}
    for item in infos['classifications']:
        if not isinstance(item, dict):
            continue
        idx = item.get('index')
        code = str(item.get('domaine_code') or '').strip()
        if isinstance(idx, int) and code in codes_valides:
            resultats[idx] = code
    return resultats
