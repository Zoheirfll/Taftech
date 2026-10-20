"""Reconnaissance des noms de personnes et des lieux d'en-tête par spaCy. Le modèle est chargé
une seule fois. S'il manque, on lève ModeleNerIndisponible : jamais de repli silencieux (un CV
non nettoyé ne doit pas partir chez le fournisseur IA)."""
import logging

from .modeles import Detection

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


def entites_ner(texte: str) -> list[Detection]:
    detections = []
    for ent in _charger()(texte).ents:
        if ent.label_ == "PER" and not any(c.isdigit() for c in ent.text):
            detections.append(Detection(ent.start_char, ent.end_char, "NOM"))
        elif ent.label_ == "LOC" and ent.start_char < ZONE_ENTETE:
            detections.append(Detection(ent.start_char, ent.end_char, "LIEU"))
    return detections
