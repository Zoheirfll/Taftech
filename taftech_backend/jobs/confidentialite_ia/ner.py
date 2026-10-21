"""Reconnaissance des noms de personnes et des lieux d'en-tête par spaCy. Le modèle est chargé
une seule fois. S'il manque, on lève ModeleNerIndisponible : jamais de repli silencieux (un CV
non nettoyé ne doit pas partir chez le fournisseur IA)."""
import logging
import unicodedata

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


def _sans_mots_d_organisation(ent):
    """(début, fin) en caractères de l'entité privée de ses mots d'organisation de bordure, ou None
    s'il ne reste aucun mot."""
    mots = [t for t in ent if not t.is_space]
    while mots and _sans_accents(mots[0].text) in _MOTS_ORGANISATION:
        mots = mots[1:]
    while mots and _sans_accents(mots[-1].text) in _MOTS_ORGANISATION:
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
    for ent in _charger()(texte).ents:
        mots = [t for t in ent if not t.is_space]
        if len(mots) == 1 and _ouvre_une_ligne_de_texte(texte, ent.start_char, ent.end_char):
            continue
        if ent.label_ == "PER" and not any(c.isdigit() for c in ent.text):
            bornes = _sans_mots_d_organisation(ent)
            if bornes:
                detections.append(Detection(bornes[0], bornes[1], "NOM"))
        elif ent.label_ == "LOC" and ent.start_char < ZONE_ENTETE:
            detections.append(Detection(ent.start_char, ent.end_char, "LIEU"))
    return detections
