"""Correction client n°19 : le score de compatibilité ne dépend que de critères professionnels
(région, diplôme, spécialité, expérience, compétences). Statut militaire, véhicule, passeport,
permis, sexe et âge ne doivent jamais le modifier."""
import datetime
from unittest.mock import Mock, PropertyMock

from django.test import TestCase

from jobs.matcher import calculer_score_matching

ATTRIBUTS_PROFIL = (
    'sexe', 'date_naissance', 'service_militaire', 'permis_conduire',
    'vehicule_personnel', 'passeport_valide',
)


class ScoreIndependantDesDonneesPersonnellesTest(TestCase):
    def setUp(self):
        self.offre = Mock()
        self.offre.wilaya = "31 - Oran"
        self.offre.commune = "Bir El Djir"
        self.offre.experience_requise = "CONFIRME"
        self.offre.titre = "Développeur"
        self.offre.profil_recherche = "python"

        self.candidat = Mock()
        self.profil = Mock()
        self.candidat.profil_candidat = self.profil
        self.profil.wilaya = "31 - Oran"
        self.profil.commune = "Bir El Djir"
        self.profil.mobilite = "AUCUNE"
        exp = Mock()
        exp.titre_poste, exp.entreprise, exp.description, exp.metier = "Développeur", "X", "web", None
        exp.date_debut = datetime.date.today() - datetime.timedelta(days=365 * 4)
        exp.date_fin = datetime.date.today()
        self.profil.experiences_detail.all.return_value = [exp]

    def _espionner(self, valeurs):
        """Pose des propriétés espions : toute lecture par le matcher est enregistrée."""
        espions = {}
        for nom in ATTRIBUTS_PROFIL:
            espion = PropertyMock(return_value=valeurs[nom])
            setattr(type(self.profil), nom, espion)
            espions[nom] = espion
        espion_age = PropertyMock(return_value=valeurs['date_naissance'])
        type(self.candidat).date_naissance = espion_age
        espions['user.date_naissance'] = espion_age
        return espions

    def test_le_score_ne_lit_aucune_donnee_personnelle(self):
        espions = self._espionner({
            'sexe': 'F', 'date_naissance': datetime.date(1960, 1, 1), 'service_militaire': 'INAPTE',
            'permis_conduire': False, 'vehicule_personnel': False, 'passeport_valide': False,
        })
        calculer_score_matching(self.candidat, self.offre)
        for nom, espion in espions.items():
            with self.subTest(attribut=nom):
                espion.assert_not_called()

    def test_le_score_est_identique_quelles_que_soient_ces_donnees(self):
        profils = (
            {'sexe': 'F', 'date_naissance': datetime.date(1960, 1, 1), 'service_militaire': 'NON_CONCERNE',
             'permis_conduire': False, 'vehicule_personnel': False, 'passeport_valide': False},
            {'sexe': 'H', 'date_naissance': datetime.date(2003, 6, 1), 'service_militaire': 'DEGAGE',
             'permis_conduire': True, 'vehicule_personnel': True, 'passeport_valide': True},
        )
        totaux = []
        for valeurs in profils:
            self._espionner(valeurs)
            totaux.append(calculer_score_matching(self.candidat, self.offre)['total'])
        self.assertEqual(totaux[0], totaux[1])
