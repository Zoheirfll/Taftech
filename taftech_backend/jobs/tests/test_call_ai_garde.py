from unittest.mock import MagicMock, patch

from django.core.cache import cache
from django.test import TestCase

from jobs.ai_engine import call_ai
from jobs.confidentialite_ia import FuiteDonneesPersonnelles
from jobs.models import AIConfig

MESSAGES = [{"role": "user", "content": "x"}]


class CallAIGardeTest(TestCase):
    def setUp(self):
        cache.clear()
        AIConfig.get_solo()

    @patch("jobs.ai_engine._get_groq_client")
    def test_refuse_un_texte_avec_email_sans_appeler_le_fournisseur(self, mock_client):
        with self.assertRaises(FuiteDonneesPersonnelles):
            call_ai(MESSAGES, donnees_candidat="contact : a@b.dz")
        mock_client.assert_not_called()

    @patch("jobs.ai_engine._get_groq_client")
    def test_accepte_un_texte_propre(self, mock_client):
        reponse = MagicMock()
        reponse.choices[0].message.content = "ok"
        mock_client.return_value.chat.completions.create.return_value = reponse
        self.assertEqual(call_ai(MESSAGES, donnees_candidat="Développeur [EMAIL]"), "ok")

    @patch("jobs.ai_engine._get_groq_client")
    def test_sans_parametre_comportement_inchange(self, mock_client):
        reponse = MagicMock()
        reponse.choices[0].message.content = "ok"
        mock_client.return_value.chat.completions.create.return_value = reponse
        self.assertEqual(call_ai(MESSAGES), "ok")
