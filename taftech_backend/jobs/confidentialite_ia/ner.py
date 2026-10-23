"""Reconnaissance des noms de personnes et des lieux d'en-tête par spaCy. Le modèle est chargé
une seule fois. S'il manque, on lève ModeleNerIndisponible : jamais de repli silencieux (un CV
non nettoyé ne doit pas partir chez le fournisseur IA)."""
import logging
import re
import unicodedata
from collections import Counter

from .langue import detecter_langue
from .modeles import Detection
from .patterns import motif_wilayas

logger = logging.getLogger(__name__)

MODELE = "fr_core_news_md"
MODELE_ANGLAIS = "en_core_web_sm"
_MODELES = {"fr": MODELE, "en": MODELE_ANGLAIS}
ZONE_ENTETE = 600  # un lieu n'est masqué que dans l'en-tête (adresse), pas dans le corps

_nlp = {}  # un modèle par langue, chargé une seule fois


class ModeleNerIndisponible(RuntimeError):
    """Le modèle spaCy n'a pas pu être chargé."""


def _charger(langue="fr"):
    if langue not in _nlp:
        nom = _MODELES[langue]
        try:
            import spacy
            _nlp[langue] = spacy.load(nom, exclude=["lemmatizer"])
        except Exception as exc:
            logger.error("Modèle spaCy %s indisponible : %s", nom, type(exc).__name__)
            raise ModeleNerIndisponible(f"Modèle {nom} indisponible.") from exc
    return _nlp[langue]


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


# --- CV en anglais -----------------------------------------------------------------------------------
# Mesure du 23/10/2026 (60 CV, journal du jour) : le modèle français seul fait ≈ 5,6 faux positifs par CV
# anglais, le modèle anglais seul rate des noms algériens et déborde sur la ligne suivante. On réunit
# donc les personnes des DEUX modèles (la fusion complète « Mohamed Lamine » + « Cherif ») et on ne garde
# que ce qui a la forme d'un nom : deux mots capitalisés au moins, sur une seule ligne, sans mot de métier.
_MOTS_ORGANISATION.update({
    "university", "college", "school", "institute", "academy", "center", "company", "name", "city", "state",
    "bank", "hospital", "department", "group", "inc", "llc", "corp", "dr", "mr", "mrs", "ms", "miss", "prof",
})
# Mots d'un intitulé de poste ou d'un titre de rubrique : « Project Manager », « Work History » ne sont pas des noms.
_MOTS_A_ECARTER = {
    "manager", "director", "teacher", "engineer", "accountant", "assistant", "officer", "specialist", "consultant",
    "analyst", "technician", "supervisor", "administrator", "coordinator", "associate", "representative",
    "executive", "chef", "nurse", "designer", "developer", "advocate", "clerk", "driver", "sales", "finance",
    "senior", "junior", "sr", "jr", "head", "history", "summary", "skills", "education", "experience",
    "responsibilities", "highlights", "objective", "accomplishments", "certifications", "references", "reference",
    "professional", "company", "name", "city", "state", "services", "customer", "service", "business", "management",
    "cook", "president", "vice", "lead", "owner", "member", "leader", "operator", "worker", "agent", "intern",
}
# Mots du gabarit de CV (« Company Name, City, State ») : jamais un lieu réel.
_MOTS_DE_GABARIT = {"name", "city", "state", "company"}
_LIGNE_EN_MAJUSCULES = re.compile(r"[A-Z][A-Z' \-]{4,38}")


def _en_casse_de_titre(texte: str) -> str:
    """Les lignes de 2 à 4 mots entièrement en majuscules (« SARAH JOHNSON ») passent en casse de titre :
    les modèles ne reconnaissent pas un nom écrit ainsi. Même longueur : les positions restent valables."""
    lignes = []
    for ligne in texte.split("\n"):
        brut = ligne.strip()
        if 2 <= len(brut.split()) <= 4 and _LIGNE_EN_MAJUSCULES.fullmatch(brut):
            ligne = ligne.title()
        lignes.append(ligne)
    return "\n".join(lignes)


def _est_de_bordure(token) -> bool:
    """Ponctuation seule, mot d'organisation ou titre de politesse (avec ou sans point final)."""
    return not any(c.isalnum() for c in token.text) or _sans_accents(token.text).strip(".") in _MOTS_ORGANISATION


def _groupe_de_mots_capitalises(ent):
    """Premier groupe de mots capitalisés de l'entité, sur sa première ligne (un nom ne traverse pas un
    retour à la ligne), ou None s'il compte moins de deux mots ou contient un mot de métier/rubrique."""
    mots, groupe = [], []
    for t in ent:
        if t.is_space:
            if "\n" in t.text:
                break
            continue
        mots.append(t)
    for t in mots:
        if t.text[:1].isupper() and not any(c.isdigit() for c in t.text):
            groupe.append(t)
        elif groupe:
            break
    if len(groupe) < 2 or any(_sans_accents(t.text).strip(".") in _MOTS_A_ECARTER for t in groupe):
        return None
    return groupe


def _entites_anglais(texte: str) -> list[Detection]:
    texte_modele = _en_casse_de_titre(texte)
    doc_fr, doc_en = _charger("fr")(texte_modele), _charger("en")(texte_modele)
    personnes = [e for e in doc_fr.ents if e.label_ == "PER"] + [e for e in doc_en.ents if e.label_ == "PERSON"]
    detections = []
    for ent in personnes:
        groupe = _groupe_de_mots_capitalises(ent)
        if not groupe:
            continue
        # mots d'organisation et titres de politesse retirés en bordure (« Dr. », « University »)
        while groupe and _est_de_bordure(groupe[0]):
            groupe = groupe[1:]
        while groupe and _est_de_bordure(groupe[-1]):
            groupe = groupe[:-1]
        if groupe:
            detections.append(Detection(groupe[0].idx, groupe[-1].idx + len(groupe[-1].text), "NOM"))
    detections += [Detection(e.start_char, e.end_char, "LIEU") for e in doc_en.ents
                   if e.label_ in ("GPE", "LOC") and e.start_char < ZONE_ENTETE and "\n" not in e.text
                   and not {m.lower() for m in e.text.split()} & _MOTS_DE_GABARIT]
    return detections


def entites_ner(texte: str) -> list[Detection]:
    if detecter_langue(texte) == "en":
        return _entites_anglais(texte)
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
