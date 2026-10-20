"""Entreprise d'une expérience relue dans le CV brut quand l'IA la laisse vide.

Le nettoyage avant IA masque parfois la ligne de l'employeur (« Somiz- Bethioua, Oran » devient
« [LIEU] Bethioua, [LIEU] ») : l'IA peut alors renvoyer une entreprise vide, et l'enregistrement de
l'expérience échoue (l'entreprise est obligatoire). On reprend la première ligne utile sous le titre, en
sautant les dates seules, et on retire une date collée en fin de ligne. Une entreprise déjà renseignée
n'est jamais modifiée."""
import re

from .dates_fin import _DATE_SEULE, _MOIS, _normaliser

LONGUEUR_MAX_ENTREPRISE = 100
LIGNES_EXAMINEES = 4  # sous le titre : date(s) éventuelle(s) puis l'employeur
_DATE_FIN_DE_LIGNE = re.compile(rf"\s+(?:{_MOIS}\.?\s+\d{{4}}|\d{{4}})$", re.IGNORECASE)


def _entreprise_sous_le_titre(lignes, titre):
    for i, ligne in enumerate(lignes):
        if not ligne.lower().startswith(titre):
            continue
        for suivante in lignes[i + 1:i + 1 + LIGNES_EXAMINEES]:
            if not suivante or _DATE_SEULE.match(suivante):
                continue
            candidate = _DATE_FIN_DE_LIGNE.sub("", suivante).strip()
            return candidate if 0 < len(candidate) <= LONGUEUR_MAX_ENTREPRISE else None
        return None
    return None


def completer_entreprise(experiences, cv_brut):
    """Renseigne `entreprise` (en place) quand elle est vide et lisible sous le titre dans le CV brut."""
    lignes = [_normaliser(ligne) for ligne in (cv_brut or "").split("\n")]
    for experience in experiences or []:
        if not isinstance(experience, dict) or _normaliser(experience.get("entreprise")):
            continue
        titre = _normaliser(experience.get("titre_poste")).lower()
        if not titre:
            continue
        entreprise = _entreprise_sous_le_titre(lignes, titre)
        if entreprise:
            experience["entreprise"] = entreprise
