"""Motifs de détection des données personnelles (Algérie) — source unique pour le nettoyage
(pseudonymisation.py), l'extraction locale (coordonnees.py) et le filet de sécurité (filet.py).
Un groupe nommé `valeur` restreint le masquage à cette partie du match (ex. le numéro d'un
passeport, pas le mot « passeport » qui renseigne un champ du profil).

Tous les quantificateurs sont BORNÉS : ces motifs s'exécutent sur le texte d'un fichier téléversé
par n'importe quel candidat, et un quantificateur non borné (`+`, `*`) suivi d'un élément qui
échoue donne un temps quadratique (revue de sécurité du 19/10/2026 : 40 000 caractères « a » =
5 s sur l'ancien motif d'e-mail). Ne jamais réintroduire de `+` ou `*` sans borne."""
import json
import re
from pathlib import Path

_MOIS =r"(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)"
_DATE = rf"(?:\d{{1,2}}[/.\-]\d{{1,2}}[/.\-]\d{{2,4}}|\d{{1,2}}(?:er)?\s{{1,3}}{_MOIS}\s{{1,3}}\d{{4}})"
_FIN_URL = r"[^\s<>\"')\]]{1,200}"
# Un PDF coupe parfois un lien après un tiret (« …/in/rafik-mohammed-⏎boumaza-a3257762 ») : la suite
# n'est prise que si la ligne finit par un tiret, jamais sur une ligne ordinaire.
SUITE_URL = r"(?:(?<=-)\n[^\s<>\"')\]]{1,100})?"  # public : réutilisé par coordonnees.py
_SEP = r"[\s.\-]"

MOTIFS = (
    ("EMAIL", re.compile(r"[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,255}\.[A-Za-z]{2,24}")),
    ("URL", re.compile(
        rf"(?:https?://|www\.){_FIN_URL}|\b(?:linkedin|github)\.com/{_FIN_URL}{SUITE_URL}", re.I)),
    # Lien personnel sans « http » : plateforme ou site (facebook.com/…, t.me/…, mon-site.dz/…).
    ("URL", re.compile(
        r"\b[\w-]{1,63}(?:\.[\w-]{1,63}){0,4}\.(?:com|net|org|dz|io|me|co|fr|app|dev|info)/"
        + _FIN_URL, re.I)),
    ("NIN", re.compile(r"(?<!\d)\d{18}(?!\d)")),
    # NIN écrit avec des séparateurs (« 1234 5678 9012 3456 78 »).
    ("NIN", re.compile(r"(?<!\d)(?:\d[\s.\-]?){17}\d(?!\d)")),
    ("DOCUMENT", re.compile(
        r"\b(?:cni|carte\s{1,3}nationale(?:\s{1,3}d['’]identit[ée])?|carte\s{1,3}d['’]identit[ée]|passeport)\b"
        r"[^\n\d]{0,25}?(?P<valeur>(?=[A-Z0-9]{0,19}\d)[A-Z0-9]{6,20})", re.I)),
    ("DATE_NAISSANCE", re.compile(
        rf"(?:n[ée](?:\(e\)|e)?\s{{1,3}}(?:à\s{{1,3}}[^\n,]{{1,40}},?\s{{1,3}})?le|date\s{{1,3}}de\s{{1,3}}naissance"
        rf"|naissance)\s{{0,5}}:?\s{{0,5}}(?P<valeur>{_DATE})", re.I)),
    ("ADRESSE", re.compile(r"adresse\s{0,5}:?[^\n]{3,100}", re.I)),
    ("ADRESSE", re.compile(
        r"\b\d{1,4}\s{0,5},?\s{0,5}(?:bis\s{1,3})?(?:rue|avenue|boulevard|bd|cit[ée]|lotissement|lot|hai|chemin"
        r"|route|r[ée]sidence)\b[^\n]{3,80}", re.I)),
    ("ADRESSE", re.compile(r"العنوان\s{0,5}:?[^\n]{3,100}")),
    ("DATE_NAISSANCE", re.compile(
        rf"(?:تاريخ\s{{1,3}}الميلاد|المولود(?:ة)?\s{{1,3}}في|ولد(?:ت)?\s{{1,3}}في)\s{{0,5}}:?\s{{0,5}}(?P<valeur>{_DATE})")),
    # Téléphone algérien : 05/06/07 + 8 chiffres (mobile) ou 0X + 7 chiffres (fixe), indicatif +213/00213.
    ("TELEPHONE", re.compile(
        r"(?<!\d)(?:(?:\+|00)213[\s.\-]?|0)"
        r"(?:[5-7](?:[\s.\-]?\d{2}){4}|[2-4]\d(?:[\s.\-]?\d{2}){3})(?!\d)")),
    # Autres écritures courantes : 0550 123 456 · (0550) 12 34 56 · +213 (0)550 12 34 56 ·
    # 0550/12/34/56 · numéro étranger (+33 6 12 34 56 78). Aucune ne peut être une suite de dates.
    ("TELEPHONE", re.compile(rf"(?<!\d)0[5-7]\d{{2}}{_SEP}\d{{3}}{_SEP}\d{{3}}(?!\d)")),
    ("TELEPHONE", re.compile(rf"(?<!\d)\(0[2-7]\d{{1,2}}\){_SEP}?\d{{2}}(?:{_SEP}?\d{{2}}){{2,3}}(?!\d)")),
    ("TELEPHONE", re.compile(rf"(?<!\d)(?:\+|00)213{_SEP}?\(0\){_SEP}?[5-7](?:{_SEP}?\d{{2}}){{4}}(?!\d)")),
    ("TELEPHONE", re.compile(r"(?<!\d)0[5-7]\d{2}/\d{2}/\d{2}/\d{2}(?!\d)")),
    ("TELEPHONE", re.compile(rf"(?<![\d+])\+(?!213)\d{{1,3}}{_SEP}?\d(?:{_SEP}?\d{{2}}){{4}}(?!\d)")),
    # Numéros étrangers de la diaspora (indicatif « + » ou « 00 », groupes de 2 à 4 chiffres : +216 20 123 456,
    # +44 7700 900123, 0033612345678), 8 à 15 chiffres au total.
    ("TELEPHONE", re.compile(
        rf"(?<![\d+])(?:\+|00)(?!213)(?=(?:[\s.\-()]?\d){{8,15}}(?!\d))\d{{1,3}}(?:{_SEP}?\(?\d{{2,4}}\)?){{2,4}}(?!\d)")),
    # Format nord-américain : (304) 558-2686, (304)558.2686, 304.558.2686 (trois groupes séparés : jamais des dates).
    ("TELEPHONE", re.compile(rf"(?<![\d(])\(\d{{3}}\)\s?\d{{3}}{_SEP}\d{{4}}(?!\d)")),
    ("TELEPHONE", re.compile(rf"(?<![\d+])\d{{3}}{_SEP}\d{{3}}{_SEP}\d{{4}}(?!\d)")),
    # Britannique national : 07700 900123.
    ("TELEPHONE", re.compile(r"(?<!\d)07\d{3}\s\d{6}(?!\d)")),
)

TITRE_REFERENCES = re.compile(
    r"^\s{0,20}(?:personnes?\s{1,3}de\s{1,3})?(?:r[ée]f[ée]rences?|المراجع|مراجع)\s{0,10}:?\s{0,10}$", re.I)
TITRE_SECTION = re.compile(
    r"^\s*(?:exp[ée]riences?|formations?|comp[ée]tences?|langues?|loisirs?"
    r"|centres?\s+d['’]int[ée]r[êe]ts?|projets?|certifications?|dipl[ôo]mes?"
    r"|الخبرات|الخبرة|التكوين|المهارات|اللغات|الهوايات|المشاريع|الشهادات)\b", re.I)
MAX_LIGNES_REFERENCES = 8

_MOTIF_WILAYAS = None
_COMMUNES = None
_FICHIER_COMMUNES = Path(__file__).resolve().parent.parent / "data" / "communes_algerie.json"
_SANS_ACCENT = str.maketrans("àâäéèêëîïôöùûüç", "aaaeeeeiioouuuc")
_MOT_DE_LIEU = re.compile(r"\w{1,60}")
_LIAISON_DE_LIEU = re.compile(r"[\s\-'’]{1,3}")  # espace, tiret ou apostrophe : « El Kerma », « EL-KERMA », « R'mel »


def _cle_de_lieu(texte: str) -> str:
    """Forme comparable d'un nom de lieu : minuscules, sans accent, mots séparés par un seul espace."""
    return " ".join(re.findall(r"\w+", texte.lower().translate(_SANS_ACCENT)))


def _charger_communes():
    global _COMMUNES
    if _COMMUNES is None:
        donnees = json.loads(_FICHIER_COMMUNES.read_text(encoding="utf-8"))
        cles = frozenset(_cle_de_lieu(n) for n in (*donnees["latin"], *donnees["arabe"]))
        _COMMUNES = (cles, max(len(c.split()) for c in cles))
    return _COMMUNES


def trouver_communes(texte: str) -> list[tuple[int, int]]:
    """Positions (début, fin) des communes et wilayas d'Algérie citées dans `texte`, d'après le fichier
    `jobs/data/communes_algerie.json` (noms latins et arabes ; accents et casse ignorés ; mots séparés par un
    espace, un tiret ou une apostrophe). Sert au masquage des lieux dans TOUT le CV (décision du 23/10/2026 :
    les villes des expériences et des formations sont masquées comme l'adresse).

    Recherche dans un ensemble de noms, et non par une grande expression régulière : le temps reste
    linéaire sur un contenu hostile (le motif à 3 000 branches coûtait jusqu'à 6 s pour 40 000 caractères)."""
    cles, max_mots = _charger_communes()
    mots = [(m.start(), m.end(), m.group().lower().translate(_SANS_ACCENT)) for m in _MOT_DE_LIEU.finditer(texte)]
    positions, i = [], 0
    while i < len(mots):
        trouve = 0
        for n in range(min(max_mots, len(mots) - i), 0, -1):
            contigus = all(
                _LIAISON_DE_LIEU.fullmatch(texte[mots[i + k][1]:mots[i + k + 1][0]]) for k in range(n - 1)
            )
            if contigus and " ".join(m[2] for m in mots[i:i + n]) in cles:
                trouve = n
                break
        if trouve:
            positions.append((mots[i][0], mots[i + trouve - 1][1]))
            i += trouve
        else:
            i += 1
    return positions


def motif_wilayas():
    """Motif des noms de wilaya (liste du projet), construit une seule fois. Partagé par le masquage
    des lieux d'en-tête (pseudonymisation.py) et la règle « commune suivie de sa wilaya » (ner.py)."""
    global _MOTIF_WILAYAS
    if _MOTIF_WILAYAS is None:
        from ..constants import WILAYAS_MAPPING
        noms = sorted(WILAYAS_MAPPING, key=len, reverse=True)
        _MOTIF_WILAYAS = re.compile(r"(?<!\w)(?:" + "|".join(re.escape(n) for n in noms) + r")(?!\w)", re.IGNORECASE)
    return _MOTIF_WILAYAS
