"""Le parser ne transmet que le texte nettoyé et remplit les coordonnées en local (R2, R4, R17)."""
from unittest.mock import patch

from django.core.cache import cache
from django.test import TestCase, override_settings

from jobs.cv_parser.normalisation import _normaliser_telephone
from jobs.cv_parser.parser import parse_cv, parse_with_groq
from jobs.models import AIConfig

CV = (
    "Karim BENALI\nkarim.benali@mail.dz\n0555 12 34 56\nOran\nNé le 12/03/1990\n"
    "https://www.linkedin.com/in/karim-benali\n\n"
    "Développeur Python\nExpérience : 2019 - 2023 développement d'applications web pour des clients."
)
REPONSE_IA = ('{"titre_professionnel": "Développeur", "experiences": [], "formations": [],'
              ' "nom_complet": "[NOM]", "email": "[EMAIL]", "telephone": "[TÉLÉPHONE]",'
              ' "linkedin": "[URL]"}')


class ParserConfidentialiteTest(TestCase):
    def setUp(self):
        cache.clear()
        AIConfig.get_solo()

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    @patch("jobs.cv_parser.parser._call_groq", return_value=REPONSE_IA)
    def test_prompt_sans_donnees_personnelles(self, mock_ia):
        parse_with_groq(CV, noms_connus=("Karim", "Benali"))
        prompt = mock_ia.call_args[0][0]
        for interdit in ("karim.benali@mail.dz", "0555 12 34 56", "Karim", "BENALI", "karim-benali"):
            self.assertNotIn(interdit, prompt)
        # La date d'exemple du modèle de prompt (« Né(e) le 12/03/1990 ») n'est pas celle du CV :
        # on contrôle la date sur le texte du CV nettoyé, celui qui part vraiment.
        cv_envoye = mock_ia.call_args.kwargs["donnees_candidat"]
        self.assertNotIn("12/03/1990", cv_envoye)
        self.assertIn("[DATE_NAISSANCE]", cv_envoye)
        self.assertIn("Développeur Python", prompt)
        self.assertIn("[EMAIL]", prompt)
        self.assertIn("jetons entre crochets", prompt)
        self.assertIn("donnees_candidat", mock_ia.call_args.kwargs)

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    @patch("jobs.cv_parser.parser._call_groq", return_value=REPONSE_IA)
    @patch("jobs.cv_parser.parser.extract_text", return_value=CV)
    def test_coordonnees_remplies_localement(self, _extract, _ia):
        result = parse_cv("cv.txt", "cv.txt", noms_connus=("Karim", "Benali"))
        self.assertTrue(result["success"])
        self.assertEqual(result["email"], "karim.benali@mail.dz")
        self.assertEqual(result["telephone"], "0555123456")
        self.assertIn("linkedin.com/in/karim-benali", result["linkedin"])
        self.assertNotIn("[", str(result["nom_complet"] or ""))

    @patch("jobs.cv_parser.parser._call_groq")
    def test_modele_absent_aucun_appel_ia(self, mock_ia):
        from jobs.confidentialite_ia import ModeleNerIndisponible
        with patch("jobs.confidentialite_ia.ner._charger", side_effect=ModeleNerIndisponible("x")):
            self.assertIsNone(parse_with_groq(CV))
        mock_ia.assert_not_called()


class TelephoneTest(TestCase):
    def test_normalisation(self):
        self.assertEqual(_normaliser_telephone("0555 12 34 56"), "0555123456")
        self.assertEqual(_normaliser_telephone("+213 555 12 34 56"), "0555123456")
        self.assertEqual(_normaliser_telephone("00213555123456"), "0555123456")
