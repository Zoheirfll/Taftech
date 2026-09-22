from unittest.mock import Mock
from django.test import TestCase
from jobs.matcher import _score_competences


class ScoreCompetencesS10Test(TestCase):
    def test_offre_sans_competence_structuree_critere_desactive(self):
        offre = Mock(competences_requises=Mock(all=lambda: []))
        profil = Mock(competences="Python, Django")
        self.assertIsNone(_score_competences(profil, offre))

    def test_offre_avec_competences_mais_candidat_muet_est_donnee_manquante(self):
        comp = Mock(type_exigence="OBLIGATOIRE", label="Python", niveau_requis=None)
        offre = Mock(competences_requises=Mock(all=lambda: [comp]))
        profil = Mock(competences="", competences_detail=Mock(exists=lambda: False, all=lambda: []))
        contrib = _score_competences(profil, offre)
        self.assertEqual(contrib["score"], 0.0)
        self.assertFalse(contrib["connu"])
