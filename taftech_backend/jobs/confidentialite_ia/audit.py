"""Décompte des entités masquées pour le journal d'audit des appels IA (spec §9).

Le compteur vit dans une ContextVar : `consommer_quota_ia` y place un dict vide au début d'un appel
IA, `nettoyer_texte` y additionne les catégories masquées, et `liberer_verrou_ia` l'enregistre sur la
ligne UtilisationIA de l'appel. Hors contexte d'appel (aperçu au candidat par exemple), `noter` ne
fait rien. Seuls des décomptes par catégorie sont conservés, jamais le contenu."""
from contextvars import ContextVar

COMPTEUR_ENTITES: ContextVar = ContextVar("compteur_entites", default=None)


def noter(categories: dict) -> None:
    compteur = COMPTEUR_ENTITES.get()
    if compteur is None:
        return
    for categorie, nombre in categories.items():
        compteur[categorie] = compteur.get(categorie, 0) + nombre
