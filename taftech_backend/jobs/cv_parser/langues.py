"""Niveaux de langue d'un CV ramenés aux quatre niveaux de TafTech.

L'IA recopie souvent le texte du CV (« Arabe:maternelle, Français:courant, Anglais:B2 ») au lieu des quatre
niveaux demandés. Ces libellés ne figurent dans aucune liste de l'écran (« B2 » s'ajoutait comme 5e option) et
le score du profil (`profile_score.POINTS_NIVEAU_LANGUE`) ne reconnaît que ces quatre-là : le reste ne
rapporte aucun point. Correspondance déterministe, sans appel à l'IA :
A1-A2, « notions » → Débutant ; B1-B2 → Intermédiaire ; C1-C2, « courant » → Avancé ;
« maternelle », « bilingue », « natif » → Bilingue / Maternelle."""
import re

from ..referentiel_utils import normaliser_recherche

NIVEAUX = ("Débutant", "Intermédiaire", "Avancé", "Bilingue / Maternelle")
NIVEAU_PAR_DEFAUT = "Intermédiaire"  # même défaut que le prompt (« Si pas de niveau précisé »)

_CECRL = {"a1": "Débutant", "a2": "Débutant", "b1": "Intermédiaire", "b2": "Intermédiaire",
          "c1": "Avancé", "c2": "Avancé"}
# Début de mot (accents retirés) → niveau. L'ordre est la priorité : « langue maternelle » avant « courant ».
_MOTS = (
    ("Bilingue / Maternelle", ("maternel", "natal", "natif", "native", "bilingue", "mother")),
    ("Avancé", ("avance", "courant", "couram", "fluent", "excellent", "professionnel", "expert", "superieur", "proficient")),
    ("Débutant", ("debutant", "notion", "elementaire", "basique", "faible", "beginner", "scolaire")),
    ("Intermédiaire", ("intermediaire", "moyen", "correct", "bon", "good")),
)


def niveau_canonique(texte):
    """L'un des quatre niveaux ; le cadre européen (B2…) prime sur les mots (« Courant (C1) »)."""
    jetons = re.findall(r"\w+", normaliser_recherche(texte or ""))
    for jeton in jetons:
        if jeton in _CECRL:
            return _CECRL[jeton]
    for niveau, debuts in _MOTS:
        if any(jeton.startswith(debut) for jeton in jetons for debut in debuts):
            return niveau
    return NIVEAU_PAR_DEFAUT


def _langue_et_niveau(item):
    if ":" in item:
        langue, niveau = item.split(":", 1)
        return langue, niveau
    entre_parentheses = re.match(r"^(.+?)\s*\((.+?)\)$", item)
    if entre_parentheses:
        return entre_parentheses.group(1), entre_parentheses.group(2)
    return item, ""


def _elements(brut):
    if isinstance(brut, (list, tuple)):
        return [f"{e.get('langue', '')}:{e.get('niveau', '')}" if isinstance(e, dict) else str(e) for e in brut]
    return re.split(r"[,;]", str(brut))


def normaliser_langues(brut):
    """« Langue:Niveau,Langue:Niveau » avec des niveaux canoniques ; None et vide sont rendus tels quels."""
    if not brut or not str(brut).strip():
        return brut
    langues = []
    for element in _elements(brut):
        langue, niveau = _langue_et_niveau(element.strip())
        if langue.strip():
            langues.append(f"{langue.strip()}:{niveau_canonique(niveau)}")
    return ",".join(langues) or brut
