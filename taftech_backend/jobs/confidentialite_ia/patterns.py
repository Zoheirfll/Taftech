"""Motifs de détection des données personnelles (Algérie) — source unique pour le nettoyage
(pseudonymisation.py), l'extraction locale (coordonnees.py) et le filet de sécurité (filet.py).
Un groupe nommé `valeur` restreint le masquage à cette partie du match (ex. le numéro d'un
passeport, pas le mot « passeport » qui renseigne un champ du profil)."""
import re

_MOIS = r"(?:janvier|f[ée]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[ée]cembre)"
_DATE = rf"(?:\d{{1,2}}[/.\-]\d{{1,2}}[/.\-]\d{{2,4}}|\d{{1,2}}(?:er)?\s+{_MOIS}\s+\d{{4}})"
_FIN_URL = r"[^\s<>\"')\]]+"

MOTIFS = (
    ("EMAIL", re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")),
    ("URL", re.compile(
        rf"(?:https?://|www\.){_FIN_URL}|\b(?:linkedin|github)\.com/{_FIN_URL}", re.I)),
    ("NIN", re.compile(r"(?<!\d)\d{18}(?!\d)")),
    ("DOCUMENT", re.compile(
        r"\b(?:cni|carte\s+nationale(?:\s+d['’]identit[ée])?|carte\s+d['’]identit[ée]|passeport)\b"
        r"[^\n\d]{0,25}?(?P<valeur>(?=[A-Z0-9]*\d)[A-Z0-9]{6,20})", re.I)),
    ("DATE_NAISSANCE", re.compile(
        rf"(?:n[ée](?:\(e\)|e)?\s+le|date\s+de\s+naissance|naissance)\s*:?\s*(?P<valeur>{_DATE})", re.I)),
    ("ADRESSE", re.compile(r"adresse\s*:?[^\n]{3,100}", re.I)),
    ("ADRESSE", re.compile(
        r"\b\d{1,4}\s*,?\s*(?:bis\s+)?(?:rue|avenue|boulevard|bd|cit[ée]|lotissement|lot|hai|chemin"
        r"|route|r[ée]sidence)\b[^\n]{3,80}", re.I)),
    ("ADRESSE", re.compile(r"العنوان\s*:?[^\n]{3,100}")),
    ("DATE_NAISSANCE", re.compile(
        rf"(?:تاريخ\s+الميلاد|المولود(?:ة)?\s+في|ولد(?:ت)?\s+في)\s*:?\s*(?P<valeur>{_DATE})")),
    ("TELEPHONE", re.compile(
        r"(?<!\d)(?:(?:\+|00)213[\s.\-]?|0)"
        r"(?:[5-7](?:[\s.\-]?\d{2}){4}|[2-4]\d(?:[\s.\-]?\d{2}){3})(?!\d)")),
)

TITRE_REFERENCES = re.compile(
    r"^\s*(?:personnes?\s+de\s+)?(?:r[ée]f[ée]rences?|المراجع|مراجع)\s*:?\s*$", re.I)
TITRE_SECTION = re.compile(
    r"^\s*(?:exp[ée]riences?|formations?|comp[ée]tences?|langues?|loisirs?"
    r"|centres?\s+d['’]int[ée]r[êe]ts?|projets?|certifications?|dipl[ôo]mes?"
    r"|الخبرات|الخبرة|التكوين|المهارات|اللغات|الهوايات|المشاريع|الشهادات)\b", re.I)
MAX_LIGNES_REFERENCES = 8
