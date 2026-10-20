"""Jetons de masquage résiduels dans le résultat de l'IA (ex. « [NOM], maintenance… »).

Le CV est nettoyé avant l'appel IA ; si le détecteur de noms prend un mot courant pour un nom
(« Monitoring »), l'IA recopie le jeton dans une description. Le profil appartient au
candidat et reste chez TafTech : on restaure le texte d'origine depuis le CV brut, sinon on
retire le jeton. Rien de ce module ne repart vers l'IA."""
import re

from ..confidentialite_ia.modeles import JETONS

_JETON = re.compile("|".join(re.escape(j) for j in JETONS.values()))
_PUCE = re.compile(r"^[\s\-•·*]+")
_MOTS_JETON_MAX = 4  # un jeton masque au plus un nom composé de quelques mots


def _restaurer_ligne(ligne, brut):
    puce = _PUCE.match(ligne)
    prefixe = puce.group(0) if puce else ""
    corps = ligne[len(prefixe):]
    morceaux = [re.escape(m) for m in _JETON.split(corps)]
    for nb_mots in range(1, _MOTS_JETON_MAX + 1):
        mot_jeton = r"\S+(?: \S+){%d}" % (nb_mots - 1)
        trouve = re.search(r"(?<!\w)" + mot_jeton.join(morceaux), brut, re.IGNORECASE)
        if trouve:
            return prefixe + trouve.group(0)
    sans_jeton = re.sub(r"\s+", " ", _JETON.sub("", corps)).strip(" ,;:-")
    return prefixe + sans_jeton


def restaurer_jetons(texte, cv_brut):
    """Remplace chaque jeton de `texte` par le texte du `cv_brut` (ligne par ligne), sinon le retire."""
    if not isinstance(texte, str) or not _JETON.search(texte):
        return texte
    brut = re.sub(r"\s+", " ", cv_brut or "")
    lignes = [_restaurer_ligne(l, brut) if _JETON.search(l) else l for l in texte.split("\n")]
    return "\n".join(lignes)
