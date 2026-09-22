from unittest.mock import Mock
from django.test import TestCase
from jobs.matcher import _score_region


class ScoreRegionBinaireTest(TestCase):
    def test_meme_wilaya_score_1(self):
        profil = Mock(wilaya="31 - Oran", commune="Oran", mobilite="AUCUNE")
        offre = Mock(wilaya="31 - Oran")
        contrib = _score_region(profil, offre)
        self.assertEqual(contrib["score"], 1.0)
        self.assertTrue(contrib["connu"])

    def test_mobilite_nationale_score_1_meme_si_wilaya_differente(self):
        profil = Mock(wilaya="31 - Oran", commune="Oran", mobilite="NATIONALE")
        offre = Mock(wilaya="16 - Alger")
        contrib = _score_region(profil, offre)
        self.assertEqual(contrib["score"], 1.0)

    def test_incompatibilite_declaree_score_0_et_connu(self):
        profil = Mock(wilaya="31 - Oran", commune="Oran", mobilite="AUCUNE")
        offre = Mock(wilaya="16 - Alger")
        contrib = _score_region(profil, offre)
        self.assertEqual(contrib["score"], 0.0)
        self.assertTrue(contrib["connu"])

    def test_wilaya_candidat_absente_est_donnee_manquante(self):
        profil = Mock(wilaya="", commune="", mobilite="AUCUNE")
        offre = Mock(wilaya="16 - Alger")
        contrib = _score_region(profil, offre)
        self.assertEqual(contrib["score"], 0.0)
        self.assertFalse(contrib["connu"])
