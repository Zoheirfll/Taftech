"""Paragraphe de présentation d'un CV (le court texte sous l'en-tête, avant la première section).

Repli LOCAL de la bio : l'IA rédige la bio, mais elle la rend parfois nulle (constaté le 23/10/2026 sur un même
CV : vide à 4 analyses sur 6, voir `ParsingCV.champs_vides`). Quand elle ne rend rien, on reprend le texte que le
candidat a lui-même écrit. Aucun appel IA, aucune donnée inventée."""
import re

from ..confidentialite_ia.patterns import TITRE_SECTION
from ..confidentialite_ia.pseudonymisation import detecter_motifs

LIGNES_ENTETE_MAX = 25   # la présentation est toujours dans le haut du CV
MOTS_MIN_PAR_LIGNE = 5   # une ligne de phrase, par opposition au nom, au titre ou aux contacts
MOTS_MIN_DERNIERE_LIGNE = 2
MOTS_MIN_TOTAL = 12
LONGUEUR_MAX = 600       # bio du profil : un résumé, pas le CV entier


def _est_ligne_de_phrase(ligne: str, mots_min: int = MOTS_MIN_PAR_LIGNE) -> bool:
    return len(ligne.split()) >= mots_min and not detecter_motifs(ligne)


def _couper_proprement(texte: str) -> str:
    if len(texte) <= LONGUEUR_MAX:
        return texte
    coupe = texte[:LONGUEUR_MAX]
    fin_de_phrase = coupe.rfind(".")
    return coupe[:fin_de_phrase + 1] if fin_de_phrase > LONGUEUR_MAX // 2 else coupe.rstrip() + "…"


def bio_de_presentation(texte: str):
    """Paragraphe de présentation du CV, ou None s'il n'y en a pas de net (pas de phrase, ou coordonnées dedans)."""
    lignes = [ligne.strip() for ligne in (texte or "").splitlines()][:LIGNES_ENTETE_MAX * 4]
    fin = next((i for i, ligne in enumerate(lignes) if TITRE_SECTION.match(ligne)), None)
    if fin is None or fin > LIGNES_ENTETE_MAX:
        return None
    # Dernière série de lignes de phrase juste avant la première section.
    paragraphe = []
    for rang, ligne in enumerate(reversed(lignes[:fin])):
        # La dernière ligne d'un paragraphe est souvent courte (« l'atteinte de vos objectifs. »).
        mots_min = MOTS_MIN_DERNIERE_LIGNE if rang == 0 else MOTS_MIN_PAR_LIGNE
        if not ligne or not _est_ligne_de_phrase(ligne, mots_min):
            break
        paragraphe.insert(0, ligne)
    contenu = re.sub(r"\s+", " ", " ".join(paragraphe)).strip()
    if len(contenu.split()) < MOTS_MIN_TOTAL:
        return None
    return _couper_proprement(contenu)
