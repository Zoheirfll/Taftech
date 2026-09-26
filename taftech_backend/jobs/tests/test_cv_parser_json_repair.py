from django.test import TestCase

from jobs.cv_parser import _extract_json_object


class ExtractJsonObjectTest(TestCase):
    """Une réponse Groq coupée par max_tokens en plein milieu du tableau "formations"
    (typiquement sur un CV avec plusieurs expériences ET formations, formations toujours
    générées après les expériences dans le prompt) ne doit jamais faire perdre les
    entrées déjà complètes — seule la dernière entrée incomplète doit être ignorée."""

    def test_json_bien_forme_inchange(self):
        content = '{"titre_professionnel": "Dev", "experiences": [], "formations": []}'
        result = _extract_json_object(content)
        self.assertEqual(result["titre_professionnel"], "Dev")

    def test_recupere_les_formations_completes_avant_troncature(self):
        content = (
            '{"titre_professionnel": "Ingenieur", '
            '"experiences": ['
            '{"titre_poste": "Dev", "entreprise": "A", "date_debut_raw": "2020", '
            '"date_fin_raw": "2022", "description": "- x"}'
            '], '
            '"formations": ['
            '{"diplome": "Master", "etablissement": "USTO", "date_debut_raw": "2015", '
            '"date_fin_raw": "2017", "description": ""}, '
            '{"diplome": "Licence", "etablissement": "USTO", "date_debut_raw": "2012", '
            '"date_fin_raw": "2015", "description": "- z"}, '
            '{"diplome": "Bac", "etablissement": "Lycee X'
        )
        result = _extract_json_object(content)
        self.assertIsNotNone(result)
        self.assertEqual(len(result["experiences"]), 1)
        self.assertEqual(len(result["formations"]), 2)
        self.assertEqual([f["diplome"] for f in result["formations"]], ["Master", "Licence"])

    def test_troncature_sans_aucun_element_complet_retourne_none(self):
        content = '{"titre_professionnel": "Dev", "experiences": [{"titre_poste": "X", "entreprise": "tronque'
        result = _extract_json_object(content)
        self.assertIsNone(result)

    def test_reponse_vide_retourne_none(self):
        self.assertIsNone(_extract_json_object(""))
        self.assertIsNone(_extract_json_object(None))

    def test_apostrophe_echappee_invalide_geree(self):
        content = '{"bio": "Ing\\\'enieur passionn\\\'e"}'
        result = _extract_json_object(content)
        self.assertIsNotNone(result)
        self.assertIn("Ing'enieur", result["bio"])
