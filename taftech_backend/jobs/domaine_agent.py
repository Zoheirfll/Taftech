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

SPECIALITE_INDEX = -1  # clé de retour réservée à la spécialité du profil dans le dict résultat

_MOTS_MIN_LEN = 4

# Mots trop génériques dans un titre de poste pour servir seuls d'indice de matching —
# "ingénieur"/"cadre"/"chargé" seuls correspondent à des milliers de fiches sans rapport
# (ex: "Ingénieur agronome") et biaisaient le RAG vers le premier secteur de la base (agricole).
_MOTS_GENERIQUES = {
    "ingenieur", "cadre", "charge", "chargee", "responsable", "agent", "technicien",
    "directeur", "directrice", "chef", "assistant", "assistante", "employe", "employee",
    "operateur", "operatrice", "administratif", "administrative", "developpement",
    "gestion", "operations", "activites", "service", "national", "general", "generale",
    "professionnel", "professionnelle", "poste", "travail", "expert", "experte",
}


def _sans_accents(s):
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def _candidats_pour_experience(titre_poste, description, limite=10):
    """Appellations ANEM réelles dont le titre partage des mots significatifs avec le poste/la
    description — sert d'indice concret à l'IA plutôt que de la laisser deviner dans le vide.
    Triées par pertinence (nombre de mots communs), pas par ordre brut de la base — sinon les
    mots génériques ("ingénieur", "développement"...) ramènent en premier les fiches du secteur
    Agricole (premier secteur ANEM par ordre alphabétique/d'insertion), quel que soit le métier."""
    texte = f"{titre_poste or ''} {description or ''}"
    tous_mots = [m for m in re.findall(r"\w+", _sans_accents(texte.lower())) if len(m) >= _MOTS_MIN_LEN]
    mots = [m for m in tous_mots if m not in _MOTS_GENERIQUES]
    # Si le titre est entièrement générique (ex: "Cadre administratif"), aucun indice fiable —
    # mieux vaut ne rien suggérer que suggérer au hasard.
    if not mots:
        return []
    q = Q()
    for mot in mots:
        q |= Q(titre__icontains=mot)
    pool = list(
        MetierReferentiel.objects.filter(q, est_actif=True, domaine__isnull=False)
        .select_related('domaine')
        .values_list('titre', 'domaine__code', 'domaine__libelle')
        .distinct()[:500]
    )
    mots_set = set(mots)

    def _score(titre):
        titre_mots = set(re.findall(r"\w+", _sans_accents(titre.lower())))
        return len(mots_set & titre_mots)

    pool_scores = [(t, c, l, _score(t)) for t, c, l in pool]
    pool_scores = [item for item in pool_scores if item[3] > 0]
    pool_scores.sort(key=lambda item: item[3], reverse=True)
    return [(t, c, l) for t, c, l, _ in pool_scores[:limite]]


PROMPT_CLASSIFICATION = """Tu es un expert RH spécialisé dans la nomenclature officielle des métiers ANEM (Algérie).

Voici une liste d'expériences professionnelles extraites d'un CV, plus éventuellement un élément [PROFIL] qui représente le titre professionnel / la spécialité recherchée par le candidat (pas une expérience passée). Pour CHACUN, détermine le CODE Domaine ANEM le plus précis qui correspond au MÉTIER RÉELLEMENT EXERCÉ OU RECHERCHÉ (titre + missions décrites), PAS au secteur d'activité de l'entreprise employeuse.

RÈGLES :
- Ignore le secteur de l'employeur si le métier exercé est transverse (ex: comptable dans une clinique = comptabilité, pas santé ; développeur chez un fabricant de véhicules = informatique, pas industrie).
- Chaque élément est accompagné d'appellations réelles de la nomenclature ANEM trouvées par recherche de mots-clés, à titre d'indice. Utilise-les comme piste forte si l'une correspond clairement, mais choisis un autre domaine de la liste complète si aucune ne colle vraiment.
- Si l'élément est trop vague pour être classé avec confiance (ex: "Stage", "Employé polyvalent" sans autre détail), réponds "" plutôt que de deviner au hasard.
- Exception : pour l'élément [PROFIL], ne réponds JAMAIS "" — c'est le titre professionnel choisi par le candidat lui-même, il y a toujours un domaine pertinent. Si ce titre combine plusieurs fonctions (ex: "Ingénieur IA et Cadre administratif"), classe-le selon la PREMIÈRE fonction mentionnée dans le titre (ici : informatique, pas administratif).
- Réfléchis à la fonction réellement exercée ou recherchée, pas à un seul mot isolé du titre.

LISTE COMPLÈTE DES DOMAINES ANEM (code — libellé) :
{domaines_list}

ÉLÉMENTS À CLASSER :
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


def classifier_domaines_experiences(experiences, titre_professionnel=None):
    """Classe le Domaine ANEM de chaque expérience (+ du profil global si fourni) via un
    appel Groq dédié.

    `experiences` : liste de dicts avec au moins titre_poste/description.
    `titre_professionnel` : si fourni, ajouté au batch comme premier élément [PROFIL] (index 0
    pour l'appel Groq, les expériences sont alors décalées à 1..n) pour déterminer la spécialité
    globale du candidat avec la même fiabilité que les expériences, au lieu de l'ancienne
    heuristique par fréquence de mots sur tout le texte du CV. Un index négatif dédié (-1) a été
    testé en premier mais l'IA l'ignorait silencieusement dès qu'il y avait plusieurs vraies
    expériences dans le batch (elle ne renvoyait alors QUE les index positifs) — un index
    séquentiel classique (0, 1, 2...) est bien plus fiable pour un LLM.
    Retourne {index_appelant: domaine_code} — l'entrée profil (si demandée) est sous la clé
    SPECIALITE_INDEX, les entrées d'expériences sous leur position dans `experiences` (0..n-1).
    N'inclut que les entrées où l'IA a répondu un code valide.
    """
    from .cv_parser import _call_groq, _extract_json_object  # import différé, évite le cycle

    if not experiences and not titre_professionnel:
        return {}

    decalage = 1 if titre_professionnel else 0
    blocs = []
    if titre_professionnel:
        candidats = _candidats_pour_experience(titre_professionnel, "")
        blocs.append(_bloc_experience(0, f"[PROFIL] {titre_professionnel}", "", candidats))
    for i, exp in enumerate(experiences):
        titre_poste = exp.get('titre_poste', '') if isinstance(exp, dict) else ''
        description = exp.get('description', '') if isinstance(exp, dict) else ''
        candidats = _candidats_pour_experience(titre_poste, description)
        blocs.append(_bloc_experience(i + decalage, titre_poste, description, candidats))

    prompt = PROMPT_CLASSIFICATION.replace(
        "{domaines_list}", domaines_list_pour_prompt()
    ).replace("{experiences_bloc}", "\n\n".join(blocs))

    content = _call_groq(prompt, max_tokens=2000)
    infos = _extract_json_object(content)
    if not infos or not isinstance(infos.get('classifications'), list):
        logger.warning("Agent domaine : réponse Groq invalide ou vide, fallback appelant.")
        return {}

    codes_valides = set(Domaine.objects.values_list('code', flat=True))
    brut = {}
    for item in infos['classifications']:
        if not isinstance(item, dict):
            continue
        idx = item.get('index')
        code = str(item.get('domaine_code') or '').strip()
        if isinstance(idx, int) and code in codes_valides:
            brut[idx] = code

    # Ramène les index à ceux attendus par l'appelant : SPECIALITE_INDEX pour le profil,
    # 0..n-1 pour les expériences (annule le décalage appliqué pour l'appel Groq).
    resultats = {}
    if titre_professionnel and 0 in brut:
        resultats[SPECIALITE_INDEX] = brut[0]
    for i in range(len(experiences)):
        if (i + decalage) in brut:
            resultats[i] = brut[i + decalage]
    return resultats
