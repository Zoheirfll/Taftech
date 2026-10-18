"""Règles communes des demandes d'ajout au référentiel (spécification du 16/10/2026) : limites,
validation du texte saisi et refus métier, identiques pour les quatre types."""
import re

LIBELLE_MIN = 3
LIBELLE_MAX = 120
CONTEXTE_MAX = 300
MOTIF_MIN = 5
MOTIF_MAX = 500
MAX_MOTS = 12  # au-delà, c'est une phrase, pas un libellé de référentiel

# Demandes explicites (un clic « Je ne trouve pas... ») : le nombre de demandes ouvertes par compte est limité.
MAX_EXPLICITES_OUVERTES = 5
# Demandes implicites (une compétence créée par simple saisie) : un CV peut en apporter beaucoup, mais
# jamais sans limite sur 24 heures. Au-delà, la saisie reste enregistrée sans créer de demande.
MAX_IMPLICITES_PAR_JOUR = 50

_EMAIL = re.compile(r"\S+@\S+\.\S+")
_URL = re.compile(r"(https?://|www\.)", re.IGNORECASE)
_TELEPHONE = re.compile(r"(?:\+?\d[\s.\-]?){9,}")


class DemandeRefusee(Exception):
    """Refus métier d'une demande, avec un `code` stable pour l'interface et un message lisible."""

    def __init__(self, message, code, **extra):
        super().__init__(message)
        self.message = message
        self.code = code
        self.extra = extra


def nettoyer(texte):
    """Espaces multiples et retours à la ligne ramenés à un seul espace."""
    return ' '.join(str(texte or '').split())


def texte_plausible(libelle):
    """Vrai si `libelle` ressemble à un libellé (au moins une lettre, ni e-mail, ni adresse web, ni
    numéro de téléphone, ni phrase de plus de MAX_MOTS mots)."""
    if not re.search(r'[^\W\d_]', libelle):
        return False
    if _EMAIL.search(libelle) or _URL.search(libelle) or _TELEPHONE.search(libelle):
        return False
    return len(libelle.split()) <= MAX_MOTS


def valider_libelle(libelle):
    if not (LIBELLE_MIN <= len(libelle) <= LIBELLE_MAX):
        raise DemandeRefusee(
            f"Le libellé doit contenir entre {LIBELLE_MIN} et {LIBELLE_MAX} caractères.", 'LIBELLE_INVALIDE',
        )
    if not texte_plausible(libelle):
        raise DemandeRefusee(
            "Le libellé doit être un intitulé court avec des lettres (ni phrase, ni coordonnées).", 'LIBELLE_INVALIDE',
        )


def valider_contexte(contexte):
    if len(contexte) > CONTEXTE_MAX:
        raise DemandeRefusee(f"La précision ne doit pas dépasser {CONTEXTE_MAX} caractères.", 'CONTEXTE_TROP_LONG')


def valider_motif(motif):
    """Motif d'un refus (visible du proposant). Lève ValueError, message prêt à afficher."""
    if len(motif) < MOTIF_MIN:
        raise ValueError(f"Indiquez un motif de refus (au moins {MOTIF_MIN} caractères).")
    if len(motif) > MOTIF_MAX:
        raise ValueError(f"Le motif ne doit pas dépasser {MOTIF_MAX} caractères.")
