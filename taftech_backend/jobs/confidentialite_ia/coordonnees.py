"""Extraction locale des coordonnées d'un candidat à partir du CV brut : ces valeurs remplissent
le profil sans jamais être montrées à l'IA (qui ne voit que le texte nettoyé)."""
import re

from ..constants import WILAYAS_MAPPING
from .ner_arabe import normaliser_chiffres
from .patterns import MOTIFS, SUITE_URL
from .pseudonymisation import LONGUEUR_MAX_ANALYSE, _ner_actif

ZONE_ENTETE = 600
ZONE_NOM = 400
_FIN_URL = r"[^\s<>\"')\]]+"
_LINKEDIN = re.compile(rf"(?:https?://)?(?:[\w-]+\.)?linkedin\.com/{_FIN_URL}{SUITE_URL}", re.I)
_GITHUB = re.compile(rf"(?:https?://)?(?:[\w-]+\.)?github\.com/{_FIN_URL}{SUITE_URL}", re.I)


def _premier(categorie: str, texte: str):
    for cat, motif in MOTIFS:
        if cat == categorie:
            m = motif.search(texte)
            if m:
                return m
    return None


def deviner_wilaya(entete: str):
    """Code de wilaya trouvé dans l'en-tête du CV (même table que le parser), ou None."""
    bas = entete.lower()
    for texte_wilaya, code in WILAYAS_MAPPING.items():
        if re.search(r"\b" + re.escape(texte_wilaya) + r"\b", bas):
            return code
    return None


def _nom_entete(texte: str):
    from .ner import entites_ner
    for d in entites_ner(texte[:ZONE_NOM]):
        if d.categorie == "NOM":
            return texte[d.debut:d.fin].strip()
    return None


def extraire_coordonnees(texte, *, avec_ner=None) -> dict:
    texte = (texte or "")[:LONGUEUR_MAX_ANALYSE]  # même borne que le nettoyage (texte d'un fichier téléversé)
    if avec_ner is None:
        avec_ner = _ner_actif()
    normalise = normaliser_chiffres(texte)  # même longueur : chiffres arabes lus comme ASCII
    email, tel = _premier("EMAIL", normalise), _premier("TELEPHONE", normalise)
    naissance = _premier("DATE_NAISSANCE", normalise)
    linkedin, github = _LINKEDIN.search(normalise), _GITHUB.search(normalise)
    return {
        "email": email.group(0) if email else None,
        "telephone": tel.group(0).strip() if tel else None,
        "linkedin": linkedin.group(0).replace("\n", "") if linkedin else None,  # lien coupé en fin de ligne : recollé
        "github": github.group(0).replace("\n", "") if github else None,
        "date_naissance_raw": naissance.group("valeur") if naissance else None,
        "wilaya": deviner_wilaya(texte[:ZONE_ENTETE]),
        "nom_complet": _nom_entete(texte) if avec_ner else None,
    }
