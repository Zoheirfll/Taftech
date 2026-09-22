from django.test import TestCase
from django.core.cache import cache
from jobs.models import ParametreMatching
from jobs.matching_params import get_parametres_matching


class ParametresMatchingTest(TestCase):
    def setUp(self):
        cache.clear()
        ParametreMatching.objects.all().delete()

    def test_valeurs_par_defaut_si_table_vide(self):
        params = get_parametres_matching()
        self.assertAlmostEqual(params["poids_region"], 0.20)
        self.assertAlmostEqual(params["poids_diplome"], 0.20)
        self.assertAlmostEqual(params["poids_specialite"], 0.25)
        self.assertAlmostEqual(params["poids_experience"], 0.20)
        self.assertAlmostEqual(params["poids_competences"], 0.15)
        self.assertFalse(params["formation_en_cours_admise"])
        self.assertEqual(params["algorithme_version"], "matching-20-20-25-20-15-v2")

    def test_valeurs_lues_depuis_la_table(self):
        ParametreMatching.objects.create(cle="poids_region", valeur="0.30", type_valeur="fraction")
        ParametreMatching.objects.create(cle="formation_en_cours_admise", valeur="1", type_valeur="booleen")
        params = get_parametres_matching()
        self.assertAlmostEqual(params["poids_region"], 0.30)
        self.assertTrue(params["formation_en_cours_admise"])
        self.assertAlmostEqual(params["poids_diplome"], 0.20)

    def test_cache_invalide_apres_ecriture(self):
        get_parametres_matching()
        ParametreMatching.objects.create(cle="poids_region", valeur="0.99", type_valeur="fraction")
        cache.clear()
        params = get_parametres_matching()
        self.assertAlmostEqual(params["poids_region"], 0.99)
