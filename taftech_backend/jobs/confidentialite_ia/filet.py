"""Dernier garde-fou : refuse d'envoyer à l'IA un texte qui contient encore une donnée
directement identifiante détectable par motif. Le message ne contient jamais la donnée."""
from .ner_arabe import normaliser_chiffres
from .patterns import MOTIFS

CATEGORIES_FILET = ("EMAIL", "TELEPHONE", "URL", "NIN")


class FuiteDonneesPersonnelles(Exception):
    def __init__(self, categories):
        self.categories = tuple(categories)
        super().__init__("Données personnelles détectées avant envoi à l'IA : " + ", ".join(self.categories))


def verifier_absence_pii(texte) -> None:
    normalise = normaliser_chiffres(texte or "")  # un téléphone en chiffres arabes ne doit pas passer
    trouvees = sorted({
        categorie for categorie, motif in MOTIFS
        if categorie in CATEGORIES_FILET and motif.search(normalise)
    })
    if trouvees:
        raise FuiteDonneesPersonnelles(trouvees)
