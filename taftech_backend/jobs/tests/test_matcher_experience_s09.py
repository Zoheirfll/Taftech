import datetime
from unittest.mock import Mock
from django.test import TestCase
from jobs.matcher import _score_experience


class ScoreExperienceS09Test(TestCase):
    def test_minimum_zero_critere_desactive(self):
        profil = Mock(experiences_detail=Mock(all=lambda: []), niveau_experience=None)
        offre = Mock(experience_requise="DEBUTANT")
        self.assertIsNone(_score_experience(profil, offre))

    def test_experience_a_moitie_du_minimum_score_0_5_EX05(self):
        exp = Mock(
            titre_poste="Développeur", description="",
            date_debut=datetime.date.today() - datetime.timedelta(days=int(365.25 * 1.5)),
            date_fin=datetime.date.today(),
        )
        profil = Mock(experiences_detail=Mock(all=lambda: [exp]), niveau_experience=None)
        offre = Mock(experience_requise="CONFIRME", titre="Développeur")
        contrib = _score_experience(profil, offre)
        self.assertAlmostEqual(contrib["score"], 0.5, places=1)

    def test_experience_atteinte_score_1_capped(self):
        exp = Mock(
            titre_poste="Développeur", description="",
            date_debut=datetime.date.today() - datetime.timedelta(days=int(365.25 * 6)),
            date_fin=datetime.date.today(),
        )
        profil = Mock(experiences_detail=Mock(all=lambda: [exp]), niveau_experience=None)
        offre = Mock(experience_requise="CONFIRME", titre="Développeur")
        contrib = _score_experience(profil, offre)
        self.assertEqual(contrib["score"], 1.0)

    def test_aucune_experience_est_donnee_manquante(self):
        profil = Mock(experiences_detail=Mock(all=lambda: []), niveau_experience=None)
        offre = Mock(experience_requise="CONFIRME", titre="Développeur")
        contrib = _score_experience(profil, offre)
        self.assertEqual(contrib["score"], 0.0)
        self.assertFalse(contrib["connu"])
