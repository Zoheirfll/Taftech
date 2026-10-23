"""Langue d'un CV (français ou anglais) par comptage de mots-outils : sans dépendance ni modèle, et
déterministe (même entrée, même sortie, comme le reste du nettoyage).

Le doute se résout toujours vers le français, comportement historique du masquage : un texte court,
arabe, mêlé ou sans mot-outil suit le modèle français. Seul un texte nettement anglais prend le chemin
anglais (ner.py)."""
import re

LONGUEUR_ANALYSEE = 5000   # un CV réel est identifiable bien avant
SEUIL_MOTS_ANGLAIS = 8     # en dessous : trop peu d'indices, français par défaut
RAPPORT_MIN = 1.5          # l'anglais doit dominer nettement le français

_MOT = re.compile(r"[a-zàâçéèêëîïôûùüÿœ']{1,20}")
# Mots-outils propres à chaque langue (« a », « on », « as », « an », « or », « en » écartés : valides dans les deux).
_ANGLAIS = frozenset(
    "the and of to in for with at by from is are was were that this these those have has had be been your my our "
    "their his her which who during including within also all will can using into over under between through "
    "new more per".split())
_FRANCAIS = frozenset(
    "le la les des du de et en un une pour avec sur par dans au aux est sont que qui ce cette ces ses son sa mes mon "
    "ma notre votre chez entre ainsi comme où dont plus très aussi ou".split())


def detecter_langue(texte: str) -> str:
    """« en » si le texte est nettement anglais, sinon « fr »."""
    mots = _MOT.findall((texte or "")[:LONGUEUR_ANALYSEE].lower())
    anglais = sum(m in _ANGLAIS for m in mots)
    francais = sum(m in _FRANCAIS for m in mots)
    return "en" if anglais >= SEUIL_MOTS_ANGLAIS and anglais >= RAPPORT_MIN * francais else "fr"
