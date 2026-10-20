"""Types et libellés partagés par le package de confidentialité IA."""
from dataclasses import dataclass, field

JETONS = {
    "EMAIL": "[EMAIL]",
    "TELEPHONE": "[TÉLÉPHONE]",
    "URL": "[URL]",
    "NIN": "[NIN]",
    "DOCUMENT": "[DOCUMENT_IDENTITE]",
    "DATE_NAISSANCE": "[DATE_NAISSANCE]",
    "ADRESSE": "[ADRESSE]",
    "NOM": "[NOM]",
    "LIEU": "[LIEU]",
}

LIBELLES_CATEGORIES = {
    "EMAIL": "adresse e-mail",
    "TELEPHONE": "numéro de téléphone",
    "URL": "lien personnel (LinkedIn, GitHub, site)",
    "NIN": "numéro d'identification nationale",
    "DOCUMENT": "numéro de pièce d'identité",
    "DATE_NAISSANCE": "date de naissance",
    "ADRESSE": "adresse postale",
    "NOM": "nom ou prénom",
    "LIEU": "lieu",
    "REFERENCES": "bloc de références (coordonnées de tiers)",
}


@dataclass(frozen=True)
class Detection:
    debut: int
    fin: int
    categorie: str


@dataclass(frozen=True)
class ResultatNettoyage:
    texte: str
    categories: dict = field(default_factory=dict)
