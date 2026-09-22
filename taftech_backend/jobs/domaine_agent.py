"""Agent IA dédié à la classification du Metier (référentiel v2) d'une expérience
professionnelle.

Remplace l'ancien classifieur de Domaine ANEM (session 19/07/2026) — le système
NAME/Secteur/Domaine/SousDomaine/MetierReferentiel a été retiré (cutover complet,
session 18/09/2026). Séparé du parsing CV (qui extrait 10 choses différentes en un
seul appel Groq surchargé) car la précision de ce code conditionne directement le
score de matching.

Différence structurante avec l'ancien agent : le référentiel v2 compte 1038 métiers
(contre 87 domaines) — bien trop pour tenir dans un prompt sous forme de liste
complète. L'agent ne choisit donc plus dans une liste exhaustive : il choisit
UNIQUEMENT parmi les appellations réelles trouvées par recherche de mots-clés (RAG,
`_candidats_pour_experience`), ou s'abstient si aucune ne correspond clairement —
jamais un choix à l'aveugle parmi les 1038 métiers jamais montrés (REGLES_MATCHING
R02 du client : ambiguïté → proposer les choix trouvés, ne jamais réécrire/deviner)."""
import logging
import re

from django.db.models import Q

from .models import Appellation
from .referentiel_utils import normaliser_recherche, corriger_mots_flous

logger = logging.getLogger(__name__)

SPECIALITE_INDEX = -1  # clé de retour réservée à la spécialité du profil dans le dict résultat

_MOTS_MIN_LEN = 4

# Mots trop génériques dans un titre de poste pour servir seuls d'indice de matching —
# "ingénieur"/"cadre"/"chargé" seuls correspondent à des milliers d'appellations sans
# rapport et biaisaient le RAG vers les premières fiches trouvées en base.
_MOTS_GENERIQUES = {
    "ingenieur", "cadre", "charge", "chargee", "responsable", "agent", "technicien",
    "directeur", "directrice", "chef", "assistant", "assistante", "employe", "employee",
    "operateur", "operatrice", "administratif", "administrative", "developpement",
    "gestion", "operations", "activites", "service", "national", "general", "generale",
    "professionnel", "professionnelle", "poste", "travail", "expert", "experte",
}


def _candidats_pour_experience(titre_poste, description, limite=10):
    """Appellations réelles (référentiel v2) dont le libellé partage des mots
    significatifs avec le poste/la description — sert d'indice concret à l'IA plutôt
    que de la laisser deviner dans le vide. Triées par pertinence (nombre de mots
    communs), pas par ordre brut de la base."""
    texte = f"{titre_poste or ''} {description or ''}"
    tous_mots = [m for m in re.findall(r"\w+", normaliser_recherche(texte)) if len(m) >= _MOTS_MIN_LEN]
    mots = [m for m in tous_mots if m not in _MOTS_GENERIQUES]
    # Si le titre est entièrement générique (ex: "Cadre administratif"), aucun indice fiable —
    # mieux vaut ne rien suggérer que suggérer au hasard.
    if not mots:
        return []
    mots = corriger_mots_flous(mots)  # N04 : flou Levenshtein<=1, exact d'abord
    q = Q()
    for mot in mots:
        q |= Q(cle_recherche__icontains=mot)
    pool = list(
        Appellation.objects.filter(q, actif=True, metier__selectionnable=True)
        .select_related('metier', 'metier__metier_canonique')
        .values_list('libelle', 'metier__id', 'metier__libelle', 'metier__metier_canonique_id')
        .distinct()[:500]
    )
    mots_set = set(mots)

    def _score(libelle):
        libelle_mots = set(re.findall(r"\w+", normaliser_recherche(libelle)))
        return len(mots_set & libelle_mots)

    pool_scores = [(lib, mid, mlib, canon_id, _score(lib)) for lib, mid, mlib, canon_id in pool]
    pool_scores = [item for item in pool_scores if item[4] > 0]
    pool_scores.sort(key=lambda item: item[4], reverse=True)
    # (libelle_appellation, metier_id_canonique, libelle_metier)
    resultats = []
    vus = set()
    for lib, mid, mlib, canon_id, _ in pool_scores:
        metier_id_final = canon_id or mid
        if metier_id_final in vus:
            continue
        vus.add(metier_id_final)
        resultats.append((lib, metier_id_final, mlib))
        if len(resultats) >= limite:
            break
    return resultats


PROMPT_CLASSIFICATION = """Tu es un expert RH spécialisé dans la nomenclature des métiers utilisée par TAFTECH (Algérie).

Voici une liste d'expériences professionnelles extraites d'un CV, plus éventuellement un élément [PROFIL] qui représente le titre professionnel / la spécialité recherchée par le candidat (pas une expérience passée). Pour CHACUN, choisis, PARMI LES APPELLATIONS PROPOSÉES pour cet élément, celle qui correspond le mieux au MÉTIER RÉELLEMENT EXERCÉ OU RECHERCHÉ (titre + missions décrites), PAS au secteur d'activité de l'entreprise employeuse.

RÈGLES :
- Tu dois choisir UNIQUEMENT parmi les appellations listées pour chaque élément (identifiées par leur position dans la liste, ex: appellation n°2) — jamais un métier hors de cette liste, même s'il te semble plus juste : si aucune ne convient, réponds "" pour cet élément.
- Ignore le secteur de l'employeur si le métier exercé est transverse (ex: comptable dans une clinique = comptabilité, pas santé ; développeur chez un fabricant de véhicules = informatique, pas industrie).
- Si aucune appellation proposée ne correspond, ou si l'élément est trop vague (ex: "Stage", "Employé polyvalent" sans autre détail), réponds "" plutôt que de deviner au hasard.
- Exception : pour l'élément [PROFIL], ne réponds "" que si VRAIMENT aucune des appellations proposées ne convient — c'est le titre professionnel choisi par le candidat lui-même. Si ce titre combine plusieurs fonctions (ex: "Ingénieur IA et Cadre administratif"), classe-le selon la PREMIÈRE fonction mentionnée.

ÉLÉMENTS À CLASSER (avec leurs appellations candidates numérotées) :
{experiences_bloc}

FORMAT DE RÉPONSE EXIGÉ (JSON strict, un seul objet, rien d'autre avant/après) :
{{"classifications": [{{"index": 0, "appellation_choisie": 2, "raison": "1 phrase courte"}}]}}
(`appellation_choisie` = numéro de l'appellation choisie dans la liste proposée pour cet index, ou -1 si aucune ne convient)
"""


def _bloc_experience(i, titre_poste, description, candidats):
    lignes = [f"[{i}] Poste : {titre_poste or '(vide)'}"]
    if description:
        lignes.append(f"Missions : {description[:400]}")
    if candidats:
        for n, (lib, _metier_id, mlib) in enumerate(candidats):
            lignes.append(f"  Appellation {n} : {lib} (métier : {mlib})")
    else:
        lignes.append("  Aucune appellation candidate trouvée.")
    return "\n".join(lignes)


def classifier_metiers_experiences(experiences, titre_professionnel=None):
    """Classe le Metier de chaque expérience (+ du profil global si fourni) via un
    appel Groq dédié, grounded exclusivement sur des appellations réelles trouvées par
    mots-clés (jamais un choix parmi les 1038 métiers du référentiel, jamais montrés).

    `experiences` : liste de dicts avec au moins titre_poste/description.
    `titre_professionnel` : si fourni, ajouté au batch comme premier élément [PROFIL].
    Retourne {index_appelant: metier_id} — l'entrée profil (si demandée) est sous la
    clé SPECIALITE_INDEX, les entrées d'expériences sous leur position dans
    `experiences` (0..n-1). N'inclut que les entrées où l'IA a choisi une appellation
    proposée."""
    from .cv_parser import _call_groq, _extract_json_object  # import différé, évite le cycle

    if not experiences and not titre_professionnel:
        return {}

    decalage = 1 if titre_professionnel else 0
    blocs = []
    candidats_par_index = {}
    if titre_professionnel:
        candidats = _candidats_pour_experience(titre_professionnel, "")
        candidats_par_index[0] = candidats
        blocs.append(_bloc_experience(0, f"[PROFIL] {titre_professionnel}", "", candidats))
    for i, exp in enumerate(experiences):
        titre_poste = exp.get('titre_poste', '') if isinstance(exp, dict) else ''
        description = exp.get('description', '') if isinstance(exp, dict) else ''
        candidats = _candidats_pour_experience(titre_poste, description)
        candidats_par_index[i + decalage] = candidats
        blocs.append(_bloc_experience(i + decalage, titre_poste, description, candidats))

    prompt = PROMPT_CLASSIFICATION.replace("{experiences_bloc}", "\n\n".join(blocs))

    content = _call_groq(prompt, max_tokens=2000)
    infos = _extract_json_object(content)
    if not infos or not isinstance(infos.get('classifications'), list):
        logger.warning("Agent métier : réponse Groq invalide ou vide, fallback appelant.")
        return {}

    brut = {}
    for item in infos['classifications']:
        if not isinstance(item, dict):
            continue
        idx = item.get('index')
        choix = item.get('appellation_choisie')
        if not isinstance(idx, int) or not isinstance(choix, int) or choix < 0:
            continue
        candidats = candidats_par_index.get(idx, [])
        if 0 <= choix < len(candidats):
            brut[idx] = candidats[choix][1]  # metier_id

    # Ramène les index à ceux attendus par l'appelant : SPECIALITE_INDEX pour le profil,
    # 0..n-1 pour les expériences (annule le décalage appliqué pour l'appel Groq).
    resultats = {}
    if titre_professionnel and 0 in brut:
        resultats[SPECIALITE_INDEX] = brut[0]
    for i in range(len(experiences)):
        if (i + decalage) in brut:
            resultats[i] = brut[i + decalage]
    return resultats
