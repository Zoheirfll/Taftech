"""Reconnaissance des noms de personnes et des lieux d'en-tête par spaCy. Le modèle est chargé
une seule fois. S'il manque, on lève ModeleNerIndisponible : jamais de repli silencieux (un CV
non nettoyé ne doit pas partir chez le fournisseur IA)."""
import logging
import re
import unicodedata
from collections import Counter

from .modeles import Detection
from .patterns import motif_wilayas

logger = logging.getLogger(__name__)

MODELE = "fr_core_news_md"
ZONE_ENTETE = 600  # un lieu n'est masqué que dans l'en-tête (adresse), pas dans le corps

_nlp = None


class ModeleNerIndisponible(RuntimeError):
    """Le modèle spaCy n'a pas pu être chargé."""


def _charger():
    global _nlp
    if _nlp is None:
        try:
            import spacy
            _nlp = spacy.load(MODELE, exclude=["lemmatizer"])
        except Exception as exc:
            logger.error("Modèle spaCy %s indisponible : %s", MODELE, type(exc).__name__)
            raise ModeleNerIndisponible(f"Modèle {MODELE} indisponible.") from exc
    return _nlp


# Noms communs d'établissement que spaCy prend parfois pour une personne (« Hypermarché » dans
# « Hypermarché UNO ») : ce ne sont pas des données personnelles. Retirés en bordure d'une entité
# « personne » : « Université Karim Benali » masque toujours « Karim Benali ».
_MOTS_ORGANISATION = {
    "hypermarche", "supermarche", "marche", "universite", "faculte", "lycee", "college", "ecole", "institut",
    "centre", "direction", "ministere", "agence", "societe", "entreprise", "groupe", "banque", "clinique",
    "hopital", "cabinet", "mairie", "boutique", "magasin", "restaurant", "hotel",
}


def _sans_accents(mot: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", mot.lower()) if unicodedata.category(c) != "Mn")


def _a_retirer_en_bordure(token) -> bool:
    """Mot d'organisation ou ponctuation seule (« | », « - ») : jamais une partie du nom."""
    return not any(c.isalnum() for c in token.text) or _sans_accents(token.text) in _MOTS_ORGANISATION


# Commune suivie de sa wilaya (« Hassi Ameur - Oran », « Oued Tlélat, Oran ») : un lieu, pas une personne.
_SEPARATEUR_WILAYA = re.compile(r"[ \t]*[-–/,][ \t]*")


def _suivie_d_une_wilaya(texte: str, fin: int) -> bool:
    sep = _SEPARATEUR_WILAYA.match(texte, fin)
    return bool(sep) and motif_wilayas().match(texte, sep.end()) is not None


def _detecte_a_tort(texte: str, mot: str, nb_detections: int) -> bool:
    """Un mot que spaCy ne prend pour une personne que dans moins de la moitié de ses occurrences
    (« Stellantis » : 1 sur 3) est un nom d'entreprise, pas un nom de personne. Un nom cité une seule
    fois n'est jamais écarté."""
    total = len(re.findall(rf"(?<!\w){re.escape(mot)}(?!\w)", texte, re.I))
    return total >= 2 and nb_detections * 2 < total


def _sans_mots_d_organisation(ent):
    """(début, fin) en caractères de l'entité privée de ses mots d'organisation de bordure, ou None
    s'il ne reste aucun mot."""
    mots = [t for t in ent if not t.is_space]
    while mots and _a_retirer_en_bordure(mots[0]):
        mots = mots[1:]
    while mots and _a_retirer_en_bordure(mots[-1]):
        mots = mots[:-1]
    if not mots:
        return None
    return mots[0].idx, mots[-1].idx + len(mots[-1].text)


_PUCES = " \t-•*·–—►▪✓➢"


def _ouvre_une_ligne_de_texte(texte: str, debut: int, fin: int) -> bool:
    """Vrai si [debut, fin) est le premier mot d'une ligne ou d'une puce ET que la ligne continue
    (« Expertise confirmée en… », « - Reporting RH et… »). Un tel mot n'est capitalisé que parce
    qu'il ouvre la phrase : spaCy le prend à tort pour un lieu ou une personne. Un mot seul sur sa
    ligne (« Arzew ») n'est pas concerné."""
    debut_ligne = texte.rfind("\n", 0, debut) + 1
    if texte[debut_ligne:debut].strip(_PUCES):
        return False
    fin_ligne = texte.find("\n", fin)
    suite = texte[fin:fin_ligne if fin_ligne != -1 else len(texte)]
    return bool(suite.strip()) and suite[:1] in (" ", "\t")


def entites_ner(texte: str) -> list[Detection]:
    detections = []
    entites = list(_charger()(texte).ents)
    nb_par_mot = Counter(e.text.lower() for e in entites if e.label_ == "PER")
    for ent in entites:
        mots = [t for t in ent if not t.is_space]
        if len(mots) == 1 and _ouvre_une_ligne_de_texte(texte, ent.start_char, ent.end_char):
            continue
        if ent.label_ == "PER" and not any(c.isdigit() for c in ent.text):
            if ent.start_char >= ZONE_ENTETE and _suivie_d_une_wilaya(texte, ent.end_char):
                continue  # corps du CV : une commune, pas une personne (l'en-tête garde « Nom, Oran »)
            if len(mots) == 1 and _detecte_a_tort(texte, ent.text, nb_par_mot[ent.text.lower()]):
                continue
            bornes = _sans_mots_d_organisation(ent)
            if bornes:
                detections.append(Detection(bornes[0], bornes[1], "NOM"))
        elif ent.label_ == "LOC" and ent.start_char < ZONE_ENTETE:
            detections.append(Detection(ent.start_char, ent.end_char, "LIEU"))
    return detections
