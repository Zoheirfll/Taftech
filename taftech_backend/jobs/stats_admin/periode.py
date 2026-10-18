"""Période des statistiques admin : lecture des paramètres, période précédente, variation.

Logique pure (aucune dépendance HTTP), partagée par la vue JSON et l'export Excel.
"""
import datetime

from django.utils import timezone

JOURS_PAR_DEFAUT = 365
DUREE_MAX_JOURS = 366 * 5


class PeriodeInvalide(ValueError):
    """Paramètres de période invalides (format, ordre, durée)."""


def periode_par_defaut():
    fin = timezone.localdate()
    return fin - datetime.timedelta(days=JOURS_PAR_DEFAUT), fin


def _lire_date(valeur, nom):
    try:
        return datetime.date.fromisoformat(valeur)
    except (TypeError, ValueError):
        raise PeriodeInvalide(f"Le paramètre « {nom} » doit être une date AAAA-MM-JJ.")


def lire_periode(params):
    """(debut, fin) depuis `date_debut` / `date_fin` ; défaut = 365 derniers jours."""
    brut_debut, brut_fin = params.get('date_debut'), params.get('date_fin')
    if not brut_debut and not brut_fin:
        return periode_par_defaut()
    if not brut_debut or not brut_fin:
        raise PeriodeInvalide("Les paramètres « date_debut » et « date_fin » vont ensemble.")
    debut, fin = _lire_date(brut_debut, 'date_debut'), _lire_date(brut_fin, 'date_fin')
    if debut > fin:
        raise PeriodeInvalide("La date de début doit précéder la date de fin.")
    if (fin - debut).days > DUREE_MAX_JOURS:
        raise PeriodeInvalide("La période ne peut pas dépasser 5 ans.")
    return debut, fin


def lire_entreprise_id(params):
    """`entreprise_id` optionnel (entier > 0) ; None = toutes les entreprises."""
    brut = params.get('entreprise_id')
    if brut in (None, ''):
        return None
    try:
        valeur = int(brut)
    except (TypeError, ValueError):
        raise PeriodeInvalide("Le paramètre « entreprise_id » doit être un entier.")
    if valeur <= 0:
        raise PeriodeInvalide("Le paramètre « entreprise_id » doit être positif.")
    return valeur


def restreindre(queryset, champ, entreprise_id):
    """Limite le queryset à une entreprise (`champ` = chemin vers son identifiant) si demandé."""
    return queryset.filter(**{champ: entreprise_id}) if entreprise_id else queryset


def periode_precedente(debut, fin):
    """Période de même durée, juste avant `debut` (base des variations)."""
    duree = (fin - debut).days + 1
    return debut - datetime.timedelta(days=duree), debut - datetime.timedelta(days=1)


def variation_pct(valeur, valeur_precedente):
    """Variation en % ; None si la période précédente est à 0 (rien à comparer)."""
    if not valeur_precedente:
        return None
    return round((valeur - valeur_precedente) / valeur_precedente * 100, 1)


def mois_de_la_periode(debut, fin):
    """Premier jour de chaque mois touché par la période (mois vides inclus)."""
    mois = []
    courant = debut.replace(day=1)
    while courant <= fin:
        mois.append(courant)
        courant = (courant.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
    return mois
