"""Utilitaires partagés autour de la nomenclature ANEM (MetierReferentiel).

Centralise la résolution "texte libre → code Domaine ANEM", utilisée à la fois par
le parsing de CV (cv_parser.extract_specialite) et par la vue de devinette de secteur
d'une expérience (jobs/views/ia.py) — auparavant deux implémentations séparées
(dictionnaire de mots-clés côté cv_parser, recherche MetierReferentiel côté ia.py).
"""
import re
from collections import Counter
from django.db.models import Q
from .models import MetierReferentiel


def resoudre_domaine_depuis_texte(*textes):
    """Devine le code Domaine ANEM le plus probable à partir d'un ou plusieurs textes
    (titre de poste, description...). Cherche les appellations MetierReferentiel dont
    le titre contient un des mots (4+ lettres) du texte fourni, retourne le domaine le
    plus fréquent parmi les correspondances. Retourne None si rien n'est trouvé."""
    texte = " ".join(t for t in textes if t)
    mots = [m for m in re.findall(r"\w+", texte.lower()) if len(m) >= 4]
    if not mots:
        return None
    q = Q()
    for mot in mots:
        q |= Q(titre__icontains=mot)
    domaines = list(
        MetierReferentiel.objects.filter(q, est_actif=True).values_list('domaine__code', flat=True)[:50]
    )
    if not domaines:
        return None
    return Counter(domaines).most_common(1)[0][0]


def domaines_list_pour_prompt():
    """Liste "code — libellé" des domaines ANEM, injectée dans les prompts Groq pour que
    l'IA choisisse un domaine réel au lieu de deviner via mots-clés."""
    from django.core.cache import cache
    from .models import Domaine
    cached = cache.get('jobs_domaines_prompt_list')
    if cached:
        return cached
    lignes = [f"{code} — {libelle}" for code, libelle in Domaine.objects.values_list('code', 'libelle')]
    texte = "\n".join(lignes)
    cache.set('jobs_domaines_prompt_list', texte, timeout=3600)
    return texte
