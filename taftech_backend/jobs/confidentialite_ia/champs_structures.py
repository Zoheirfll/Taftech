"""Champs structurés envoyés à l'IA par les fonctions qui partent de la base (analyse carrière,
conseils, analyse recruteur) : liste blanche, employeurs pseudonymisés, établissements retirés."""
import re
import secrets
from collections import Counter

from .pseudonymisation import nettoyer_texte

_MARQUEURS_ETABLISSEMENT = re.compile(
    r"\b(?:universit[ée]s?|univ\.?|[ée]cole|institut|facult[ée]|lyc[ée]e|centre\s{1,3}de\s{1,3}formation"
    r"|cfpa|insfp|esi|ens|enp|usthb|usto|ista)(?![\w])", re.I)
_SEPARATEURS = re.compile(r"\s*[-–—|,;/@]\s*|\s+(?:à|au)\s+", re.I)
LIBELLE_EMPLOYEUR_INCONNU = "Entreprise non précisée"


def jeton_candidat() -> str:
    """Identifiant technique temporaire (aléatoire, jamais l'identifiant en base, non stocké)."""
    return f"CANDIDAT_{secrets.token_hex(3).upper()}"


def nettoyer_champ(texte) -> str:
    """Texte libre du profil : retire e-mails, téléphones, liens, adresses, pièces d'identité."""
    return nettoyer_texte(texte or "", avec_ner=False).texte


def nettoyer_intitule_formation(texte) -> str:
    """Intitulé de formation sans le nom de l'établissement (vide s'il ne reste rien)."""
    if not texte:
        return ""
    nettoye = nettoyer_texte(texte, avec_ner=False).texte
    segments = [s.strip() for s in _SEPARATEURS.split(nettoye) if s and s.strip()]
    return " – ".join(s for s in segments if not _MARQUEURS_ETABLISSEMENT.search(s))


class PseudonymeurEmployeurs:
    """Associe chaque employeur à « Entreprise A », « Entreprise B »… de façon stable au sein
    d'un même appel (pas d'un appel à l'autre)."""

    def __init__(self):
        self._table: dict[str, str] = {}

    def libelle(self, nom) -> str:
        cle = (nom or "").strip().lower()
        if not cle:
            return LIBELLE_EMPLOYEUR_INCONNU
        if cle not in self._table:
            rang = len(self._table)
            self._table[cle] = f"Entreprise {chr(65 + rang) if rang < 26 else rang + 1}"
        return self._table[cle]


def _sans_employeur(titre: str, nom, libelle: str) -> str:
    titre = nettoyer_champ(titre)
    nom = (nom or "").strip()
    return re.sub(re.escape(nom), libelle, titre, flags=re.I) if len(nom) >= 3 else titre


def lignes_experiences(experiences, pseudonymeur=None) -> list[str]:
    pseudo = pseudonymeur or PseudonymeurEmployeurs()
    lignes = []
    for e in experiences:
        libelle = pseudo.libelle(e.get("entreprise"))
        titre = _sans_employeur(e.get("titre_poste") or "", e.get("entreprise"), libelle)
        domaine = f" — domaine : {e['domaine']}" if e.get("domaine") else ""
        lignes.append(f"{titre} chez {libelle}{domaine} ({e.get('debut') or ''} - {e.get('fin') or 'présent'})")
    return lignes


def lignes_formations(formations) -> list[str]:
    lignes = []
    for f in formations:
        diplome = nettoyer_intitule_formation(f.get("diplome"))
        if not diplome:
            continue
        specialite = f.get("specialite")
        lignes.append(f"{diplome} ({specialite})" if specialite else diplome)
    return lignes


def effectifs_par_statut(statuts) -> str:
    compte = Counter(statuts)
    return ", ".join(f"{n} {s}" for s, n in sorted(compte.items())) or "aucune candidature"
