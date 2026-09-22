from django.test import TestCase
from jobs.matcher import _composer_score


class ComposerScoreTest(TestCase):
    def test_tous_criteres_actifs_et_parfaits(self):
        contributions = {
            "region": {"poids": 0.20, "score": 1.0, "connu": True},
            "diplome": {"poids": 0.20, "score": 1.0, "connu": True},
            "specialite": {"poids": 0.25, "score": 1.0, "connu": True},
            "experience": {"poids": 0.20, "score": 1.0, "connu": True},
            "competences": {"poids": 0.15, "score": 1.0, "connu": True},
        }
        result = _composer_score(contributions)
        self.assertAlmostEqual(result["total"], 100.0)
        self.assertAlmostEqual(result["completude"], 1.0)
        self.assertEqual(result["criteres_manquants"], [])

    def test_critere_non_demande_exclu_du_denominateur(self):
        contributions = {
            "region": {"poids": 0.20, "score": 1.0, "connu": True},
            "diplome": None,
            "specialite": {"poids": 0.25, "score": 1.0, "connu": True},
            "experience": {"poids": 0.20, "score": 1.0, "connu": True},
            "competences": {"poids": 0.15, "score": 1.0, "connu": True},
        }
        result = _composer_score(contributions)
        self.assertAlmostEqual(result["total"], 100.0)
        self.assertEqual(result["criteres_non_demandes"], ["diplome"])

    def test_donnee_manquante_compte_dans_la_couverture_pas_dans_incompatible(self):
        contributions = {
            "region": {"poids": 0.20, "score": 0.0, "connu": True},
            "diplome": {"poids": 0.20, "score": 0.0, "connu": False},
            "specialite": {"poids": 0.25, "score": 1.0, "connu": True},
            "experience": {"poids": 0.20, "score": 1.0, "connu": True},
            "competences": {"poids": 0.15, "score": 1.0, "connu": True},
        }
        result = _composer_score(contributions)
        self.assertAlmostEqual(result["completude"], 0.80)
        self.assertEqual(result["criteres_manquants"], ["diplome"])

    def test_aucun_critere_actif_retourne_score_none(self):
        contributions = {k: None for k in ["region", "diplome", "specialite", "experience", "competences"]}
        result = _composer_score(contributions)
        self.assertIsNone(result["total"])
