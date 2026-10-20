"""Nettoyage déterministe d'un texte avant envoi à l'IA : même entrée, même sortie (l'aperçu
montré au candidat doit être identique à ce qui part)."""
import re
from collections import Counter

from django.conf import settings

from .audit import noter
from .modeles import JETONS, Detection, ResultatNettoyage
from .patterns import MAX_LIGNES_REFERENCES, MOTIFS, TITRE_REFERENCES, TITRE_SECTION

JETON_REFERENCES = "[RÉFÉRENCES SUPPRIMÉES]"
LONGUEUR_MIN_NOM = 3
# Texte analysé au plus : 4 fois la longueur envoyée à l'IA (7000), bien au-delà d'un CV réel.
LONGUEUR_MAX_ANALYSE = 30000


def _ner_actif() -> bool:
    return getattr(settings, "CONFIDENTIALITE_IA_NER_ACTIF", True)


def retirer_section_references(texte: str) -> tuple[str, int]:
    """Remplace chaque bloc « Références » (titre + 8 lignes au plus, jusqu'à la section
    suivante) par un jeton. Retourne le texte et le nombre de blocs retirés."""
    lignes = texte.split("\n")
    sortie, i, retires = [], 0, 0
    while i < len(lignes):
        if not TITRE_REFERENCES.match(lignes[i]):
            sortie.append(lignes[i])
            i += 1
            continue
        retires += 1
        sortie.append(JETON_REFERENCES)
        i += 1
        consommees = 0
        while i < len(lignes) and consommees < MAX_LIGNES_REFERENCES and not TITRE_SECTION.match(lignes[i]):
            i += 1
            consommees += 1
    return "\n".join(sortie), retires


def detecter_motifs(texte: str) -> list[Detection]:
    detections = []
    for categorie, motif in MOTIFS:
        restreint = "valeur" in motif.groupindex
        for m in motif.finditer(texte):
            debut, fin = (m.start("valeur"), m.end("valeur")) if restreint else m.span()
            detections.append(Detection(debut, fin, categorie))
    return detections


def detecter_noms_connus(texte: str, noms) -> list[Detection]:
    """Masque les noms que TafTech connaît déjà (compte du candidat) : filet déterministe
    indépendant de la reconnaissance automatique."""
    a_masquer = set()
    for nom in noms or ():
        nom = (nom or "").strip()
        if len(nom) >= 2:
            a_masquer.add(nom)
        a_masquer.update(p for p in re.split(r"[\s\-]+", nom) if len(p) >= LONGUEUR_MIN_NOM)
    detections = []
    for nom in a_masquer:
        for m in re.finditer(rf"(?<!\w){re.escape(nom)}(?!\w)", texte, re.I):
            detections.append(Detection(m.start(), m.end(), "NOM"))
    return detections


def fusionner(detections: list[Detection]) -> list[Detection]:
    """Écarte les détections qui en chevauchent une autre (la plus longue, à début égal, gagne)."""
    retenues: list[Detection] = []
    for d in sorted(detections, key=lambda x: (x.debut, -(x.fin - x.debut))):
        if retenues and d.debut < retenues[-1].fin:
            # Chevauchement : on étend la détection retenue jusqu'à la fin de la nouvelle, sinon la
            # fin d'un numéro ou d'un e-mail débordant resterait en clair.
            derniere = retenues[-1]
            if d.fin > derniere.fin:
                retenues[-1] = Detection(derniere.debut, d.fin, derniere.categorie)
            continue
        retenues.append(d)
    return retenues


def appliquer(texte: str, detections: list[Detection]) -> str:
    morceaux, curseur = [], 0
    for d in detections:
        morceaux.append(texte[curseur:d.debut])
        morceaux.append(JETONS[d.categorie])
        curseur = d.fin
    morceaux.append(texte[curseur:])
    return "".join(morceaux)


def nettoyer_texte(texte, *, avec_ner=None, noms_connus=()) -> ResultatNettoyage:
    """Retire les données personnelles d'un texte libre. `avec_ner=None` suit le réglage
    CONFIDENTIALITE_IA_NER_ACTIF ; le NER lève ModeleNerIndisponible si le modèle manque."""
    texte = texte or ""
    if avec_ner is None:
        avec_ner = _ner_actif()
    from .ner_arabe import contient_arabe, normaliser_chiffres
    # Borne le travail : ce texte vient d'un fichier téléversé. Seuls les premiers caractères comptent
    # (la sortie est de toute façon coupée à 7000 caractères par le parser) et les motifs restent
    # rapides même sur un contenu hostile.
    texte = texte[:LONGUEUR_MAX_ANALYSE]
    texte, nb_references = retirer_section_references(texte)
    # Chiffres arabo-indiens → ASCII, même longueur : les positions détectées valent aussi
    # pour le texte d'origine, sur lequel le remplacement s'applique.
    normalise = normaliser_chiffres(texte)
    detections = detecter_motifs(normalise) + detecter_noms_connus(texte, noms_connus)
    if avec_ner:
        from .ner import entites_ner
        detections += entites_ner(texte)
        if contient_arabe(texte):
            from .ner_arabe import entites_ner_arabe
            detections += entites_ner_arabe(texte)
    retenues = fusionner(detections)
    categories = dict(Counter(d.categorie for d in retenues))
    if nb_references:
        categories["REFERENCES"] = nb_references
    noter(categories)  # journal d'audit : décomptes seulement, jamais de contenu
    return ResultatNettoyage(texte=appliquer(texte, retenues), categories=categories)
