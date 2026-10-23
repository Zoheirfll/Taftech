"""Lieux de travail et types de contrat MULTIPLES d'une offre (« Oran, Mostaganem », « CDD ou Mission »).

Le lieu et le contrat actuels (`wilaya` + `commune`, `type_contrat`) restent le PRINCIPAL : tout ce qui existait
(score, filtres, alertes, URL SEO, exports) continue de les lire. Les listes `lieux_supplementaires`
([{"wilaya", "commune"}]) et `types_contrat_supplementaires` (codes) s'y ajoutent ; elles servent à l'affichage,
à la recherche « l'un ou l'autre » et au score (le meilleur lieu compte). Elles sont validées ici contre les listes
officielles (wilayas, types de contrat) : jamais de valeur libre, jamais de doublon, plafonnées."""
from .constants import TYPES_CONTRAT, WILAYAS_CHOICES

MAX_LIEUX_SUPPLEMENTAIRES = 5
MAX_CONTRATS_SUPPLEMENTAIRES = 3

_WILAYAS = {valeur for valeur, _ in WILAYAS_CHOICES}
_CONTRATS = {code for code, _ in TYPES_CONTRAT}


def _cle(wilaya, commune):
    return ((wilaya or "").strip().lower(), (commune or "").strip().lower())


def lieux_de_l_offre(offre):
    """Principal d'abord, puis les supplémentaires, sans doublon : [{"wilaya", "commune"}]."""
    lieux = [{"wilaya": offre.wilaya, "commune": offre.commune or ""}]
    vus = {_cle(offre.wilaya, offre.commune)}
    supplementaires = getattr(offre, "lieux_supplementaires", None)
    for lieu in supplementaires if isinstance(supplementaires, list) else []:
        cle = _cle(lieu.get("wilaya"), lieu.get("commune"))
        if cle not in vus:
            vus.add(cle)
            lieux.append({"wilaya": lieu.get("wilaya"), "commune": lieu.get("commune") or ""})
    return lieux


def types_contrat_de_l_offre(offre):
    """Principal d'abord, puis les supplémentaires, sans doublon : ["CDD", "STAGE"]."""
    types = [offre.type_contrat]
    supplementaires = getattr(offre, "types_contrat_supplementaires", None)
    for code in supplementaires if isinstance(supplementaires, list) else []:
        if code not in types:
            types.append(code)
    return types


def valider_lieux_supplementaires(valeur, wilaya_principale, commune_principale):
    """Liste nettoyée [{"wilaya", "commune"}] ou ValueError. Wilaya de la liste officielle, commune ≤ 100 caractères,
    aucun doublon (le lieu principal compte aussi), 5 lieux supplémentaires au plus."""
    if valeur in (None, ""):
        return []
    if not isinstance(valeur, list):
        raise ValueError("Format de lieux invalide.")
    if len(valeur) > MAX_LIEUX_SUPPLEMENTAIRES:
        raise ValueError(f"Au plus {MAX_LIEUX_SUPPLEMENTAIRES} lieux supplémentaires.")
    propres, vus = [], {_cle(wilaya_principale, commune_principale)}
    for lieu in valeur:
        if not isinstance(lieu, dict):
            raise ValueError("Format de lieu invalide.")
        wilaya = lieu.get("wilaya")
        if not isinstance(wilaya, str) or wilaya not in _WILAYAS:
            raise ValueError(f"Wilaya inconnue : {wilaya!r}.")
        commune = lieu.get("commune") or ""
        if not isinstance(commune, str) or len(commune.strip()) > 100:
            raise ValueError("Commune invalide.")
        commune = commune.strip()
        cle = _cle(wilaya, commune)
        if cle in vus:
            raise ValueError("Un lieu est répété (le lieu principal compte aussi).")
        vus.add(cle)
        propres.append({"wilaya": wilaya, "commune": commune})
    return propres


def valider_types_contrat_supplementaires(valeur, type_principal):
    """Liste de codes ou ValueError. Codes de la liste officielle, sans doublon, différents du contrat principal,
    3 contrats supplémentaires au plus."""
    if valeur in (None, ""):
        return []
    if not isinstance(valeur, list):
        raise ValueError("Format de contrats invalide.")
    if len(valeur) > MAX_CONTRATS_SUPPLEMENTAIRES:
        raise ValueError(f"Au plus {MAX_CONTRATS_SUPPLEMENTAIRES} contrats supplémentaires.")
    propres, vus = [], {type_principal}
    for code in valeur:
        if not isinstance(code, str) or code not in _CONTRATS:
            raise ValueError(f"Type de contrat inconnu : {code!r}.")
        if code in vus:
            raise ValueError("Un type de contrat est répété (le contrat principal compte aussi).")
        vus.add(code)
        propres.append(code)
    return propres
