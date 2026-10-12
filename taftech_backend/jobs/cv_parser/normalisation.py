"""Normalisation des valeurs extraites : date de naissance, sexe, situation, mobilité."""
import re
import datetime



MOIS_FR = {
    "janvier": 1, "février": 2, "fevrier": 2, "mars": 3, "avril": 4, "mai": 5,
    "juin": 6, "juillet": 7, "août": 8, "aout": 8, "septembre": 9,
    "octobre": 10, "novembre": 11, "décembre": 12, "decembre": 12,
}


def _date_presente_dans_texte(jour, mois, annee, texte_norm):
    """Vérifie que la date (jour/mois/année) apparaît littéralement dans le
    texte brut du CV — filet anti-hallucination : Groq peut renvoyer un
    `date_naissance_raw` plausible mais absent du document source (observé en
    pratique sur un CV réel sans aucune date de naissance).

    Tolérant sur la forme : séparateurs / - . ou espaces, zéro initial
    facultatif, "1er", noms de mois avec ou sans accent, abrégés (sept., déc.)."""
    texte_norm = texte_norm.replace(' ', ' ')
    motif_num = r'(?<!\d)0?{}\s*[/\-.]\s*0?{}\s*[/\-.]\s*{}(?!\d)'.format(jour, mois, annee)
    if re.search(motif_num, texte_norm):
        return True
    noms = [nom for nom, num in MOIS_FR.items() if num == mois]
    for nom in noms:
        # Abréviation acceptée dès 3 lettres (« sept », « déc. »).
        prefixe = re.escape(nom[:3]) + r'[a-zà-ÿ]*\.?'
        motif = r'(?<!\d)0?{}(?:er)?\s+{}\s+{}(?!\d)'.format(jour, prefixe, annee)
        if re.search(motif, texte_norm):
            return True
    return False


def _date_iso_valide(annee, mois, jour):
    """ISO YYYY-MM-DD si la date existe réellement (refuse 31/02, 00/05…)."""
    try:
        datetime.date(annee, mois, jour)
    except ValueError:
        return None
    return f"{annee:04d}-{mois:02d}-{jour:02d}"


def _mois_depuis_nom(nom):
    nom = nom.strip('.')
    if nom in MOIS_FR:
        return MOIS_FR[nom]
    if len(nom) >= 3:
        for cle, num in MOIS_FR.items():
            if cle.startswith(nom[:3]):
                return num
    return None


def _normaliser_date_naissance(raw, texte_source=""):
    """Convertit une date de naissance brute extraite du CV ("12/03/1990",
    "12-03-1990", "12 mars 1990", "1er mars 1990") en ISO YYYY-MM-DD, ou None
    si non reconnue, inexistante OU absente de `texte_source` (anti-
    hallucination — voir `_date_presente_dans_texte`). Seul format accepté
    par un <input type="date"> côté frontend."""
    if not raw:
        return None
    raw = str(raw).replace(' ', ' ').strip().lower()
    texte_norm = (texte_source or "").lower()
    m = re.search(r'(?<!\d)(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})(?!\d)', raw)
    if m:
        jour, mois, annee = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if _date_presente_dans_texte(jour, mois, annee, texte_norm):
            return _date_iso_valide(annee, mois, jour)
        return None
    m = re.search(r'(?<!\d)(\d{1,2})(?:er)?\s+([a-zà-ÿ]+\.?)\s+(\d{4})', raw)
    if m:
        jour = int(m.group(1))
        mois = _mois_depuis_nom(m.group(2))
        annee = int(m.group(3))
        if mois and _date_presente_dans_texte(jour, mois, annee, texte_norm):
            return _date_iso_valide(annee, mois, jour)
    return None


def _normaliser_sexe(valeur):
    """Ramène la valeur libre renvoyée par Groq (Homme/homme/Femme/F/...) vers
    exactement 'HOMME'/'FEMME' (choices de ProfilCandidat.sexe), ou None si
    ambigu — jamais de valeur invalide envoyée au frontend/à la base."""
    if not valeur:
        return None
    v = str(valeur).strip().lower()
    if v in ("homme", "h", "m", "masculin"):
        return "HOMME"
    if v in ("femme", "f", "féminin", "feminin"):
        return "FEMME"
    return None


def _normaliser_situation_actuelle(valeur):
    if not valeur:
        return None
    v = str(valeur).strip().lower()
    if "poste" in v:
        return "EN_POSTE"
    if "recherche" in v:
        return "EN_RECHERCHE"
    if "écoute" in v or "ecoute" in v:
        return "A_L_ECOUTE"
    if "étudiant" in v or "etudiant" in v:
        return "ETUDIANT"
    return None


def _normaliser_mobilite(valeur):
    if not valeur:
        return None
    v = str(valeur).strip().lower()
    if "local" in v:
        return "LOCALE"
    if "région" in v or "region" in v:
        return "REGIONALE"
    if "national" in v:
        return "NATIONALE"
    if "international" in v:
        return "INTERNATIONALE"
    return None
