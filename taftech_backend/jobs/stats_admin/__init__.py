"""Statistiques de la page admin « Statistiques » (période, variations, évolution, entonnoir…).

Logique pure, sans dépendance HTTP : partagée par la vue JSON et l'export Excel
(`jobs/views/admin_statistiques.py`). Inspiré de la méthode du module de statistiques SOMIZ
(période + variation vs période précédente + évolution mensuelle). Filtre optionnel par
entreprise (`entreprise_id`) : les inscriptions, non rattachables à une entreprise, sont alors
omises plutôt que faussées.
"""
from ..models import ProfilEntreprise
from .abonnements import calculer_abonnements
from .evolution import calculer_evolution
from .indicateurs import calculer_indicateurs
from .periode import (
    PeriodeInvalide, lire_entreprise_id, lire_periode, periode_precedente, variation_pct,
)
from .recrutement import calculer_entonnoir, calculer_matching, calculer_offres

__all__ = [
    'PeriodeInvalide', 'lire_periode', 'lire_entreprise_id', 'periode_precedente',
    'variation_pct', 'construire_statistiques',
]


def lister_entreprises():
    """Identifiant + nom seulement (alimente le sélecteur de l'écran, réservé aux admins)."""
    return [
        {'id': ligne['id'], 'nom': ligne['nom_entreprise']}
        for ligne in ProfilEntreprise.objects.order_by('nom_entreprise').values('id', 'nom_entreprise')
    ]


def construire_statistiques(debut, fin, entreprise_id=None):
    entreprise = None
    if entreprise_id:
        nom = ProfilEntreprise.objects.filter(pk=entreprise_id).values_list('nom_entreprise', flat=True).first()
        entreprise = {'id': entreprise_id, 'nom': nom}
    return {
        'periode': {'debut': debut.isoformat(), 'fin': fin.isoformat()},
        'entreprise': entreprise,
        'entreprises': lister_entreprises(),
        'indicateurs': calculer_indicateurs(debut, fin, entreprise_id),
        'evolution': calculer_evolution(debut, fin, entreprise_id),
        'entonnoir': calculer_entonnoir(debut, fin, entreprise_id),
        'offres': calculer_offres(debut, fin, entreprise_id),
        'matching': calculer_matching(debut, fin, entreprise_id),
        'abonnements': calculer_abonnements(debut, fin, entreprise_id),
    }
