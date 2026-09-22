from django.core.cache import cache

_CACHE_KEY = "jobs_parametres_matching"
_CACHE_TTL = 3600

_DEFAUTS = {
    "poids_region": 0.20,
    "poids_diplome": 0.20,
    "poids_specialite": 0.25,
    "poids_experience": 0.20,
    "poids_competences": 0.15,
    "formation_en_cours_admise": False,
    "tolerance_faute_min_lettres": 5,
    "algorithme_version": "matching-20-20-25-20-15-v2",
}

_BOOLEENS = {"formation_en_cours_admise", "expansion_semantique_active", "rejet_score_automatique"}
_ENTIERS = {"tolerance_faute_min_lettres"}
_TEXTES = {"algorithme_version", "normalisation_version"}


def _convertir(cle, valeur_brute):
    if cle in _BOOLEENS:
        return str(valeur_brute).strip() in ("1", "true", "True")
    if cle in _ENTIERS:
        try:
            return int(valeur_brute)
        except (TypeError, ValueError):
            return _DEFAUTS.get(cle)
    if cle in _TEXTES:
        return str(valeur_brute)
    try:
        return float(valeur_brute)
    except (TypeError, ValueError):
        return _DEFAUTS.get(cle)


def get_parametres_matching():
    """Poids et paramètres de matching (PARAM_MATCHING) — lus depuis `ParametreMatching`,
    repli sur les valeurs par défaut si la table est vide ou incomplète. Caché 1h, invalidé
    manuellement (cache.clear()) par l'admin qui modifierait ces lignes (pas d'UI d'édition
    prévue dans ce plan — modification uniquement via le réimport ou le shell Django)."""
    cached = cache.get(_CACHE_KEY)
    if cached is not None:
        return cached
    from .models import ParametreMatching
    params = dict(_DEFAUTS)
    for row in ParametreMatching.objects.all():
        if row.cle in params or row.cle in _BOOLEENS or row.cle in _ENTIERS or row.cle in _TEXTES:
            params[row.cle] = _convertir(row.cle, row.valeur)
    cache.set(_CACHE_KEY, params, _CACHE_TTL)
    return params
