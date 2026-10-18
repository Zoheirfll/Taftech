"""Demandes d'ajout au référentiel (spécification du 16/10/2026) : une personne ne trouve pas un type de
diplôme ou une spécialité (puis, aux étapes suivantes, un métier ou une compétence), l'admin décide de
l'accepter, de la rattacher à une entrée existante ou de la refuser.

Point d'entrée unique : `from jobs.demandes_ajout import creer_demande, accepter_demande, ...`."""
from .adaptateurs import ADAPTATEURS, adaptateur_pour
from .formations import synchroniser_depuis_formation
from .regles import DemandeRefusee
from .service import (
    accepter_demande, creer_demande, demander_competence_saisie, notifier_decision, rattacher_demande, refuser_demande,
)

__all__ = [
    'ADAPTATEURS', 'DemandeRefusee', 'accepter_demande', 'adaptateur_pour', 'creer_demande', 'demander_competence_saisie',
    'notifier_decision', 'rattacher_demande', 'refuser_demande', 'synchroniser_depuis_formation',
]
