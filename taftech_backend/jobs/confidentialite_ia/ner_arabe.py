"""Prise en charge des CV en arabe : normalisation des chiffres, mesure du script, noms et lieux
par Stanza (chargé une seule fois). Même règle que ner.py : si le modèle manque, on lève
ModeleNerIndisponible, jamais de repli silencieux."""
import logging
import re

from .modeles import Detection
from .ner import ModeleNerIndisponible

logger = logging.getLogger(__name__)

SEUIL_ARABE = 0.05
ZONE_ENTETE = 600
_TABLE_CHIFFRES = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
_LETTRE_ARABE = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")

_pipeline = None


def normaliser_chiffres(texte: str) -> str:
    return texte.translate(_TABLE_CHIFFRES)


def proportion_arabe(texte: str) -> float:
    lettres = [c for c in texte if c.isalpha()]
    if not lettres:
        return 0.0
    return sum(1 for c in lettres if _LETTRE_ARABE.match(c)) / len(lettres)


def _charger_arabe():
    global _pipeline
    if _pipeline is None:
        try:
            import stanza
            _pipeline = stanza.Pipeline("ar", processors="tokenize,ner", download_method=None, verbose=False)
        except Exception as exc:
            logger.error("Modèle Stanza arabe indisponible : %s", type(exc).__name__)
            raise ModeleNerIndisponible("Modèle arabe indisponible.") from exc
    return _pipeline


def entites_ner_arabe(texte: str) -> list[Detection]:
    detections = []
    for ent in _charger_arabe()(texte).ents:
        if ent.type == "PER":
            detections.append(Detection(ent.start_char, ent.end_char, "NOM"))
        elif ent.type == "LOC" and ent.start_char < ZONE_ENTETE:
            detections.append(Detection(ent.start_char, ent.end_char, "LIEU"))
    return detections
