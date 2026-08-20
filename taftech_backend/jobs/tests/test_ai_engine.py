"""
Tests pour jobs/ai_engine.py — abstraction du moteur IA (Groq aujourd'hui, Ollama post-déploiement).
Le but de ce module est de garantir que basculer AIConfig.provider a un effet réel : ces tests
vérifient le dispatch, pas la qualité des réponses IA (mockées).
"""
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.core.cache import cache
from jobs.models import AIConfig
from jobs.ai_engine import call_ai


class CallAIDispatchTest(TestCase):
    def setUp(self):
        # AIConfig.get_solo() met en cache l'instance (LocMemCache, process-wide — pas affecté
        # par le rollback de transaction entre tests) : sans ce clear, un test antérieur qui a
        # changé `provider` fait fuiter cette valeur ici via le cache, indépendamment de l'état DB.
        cache.clear()
        AIConfig.get_solo()

    @patch("jobs.ai_engine._get_groq_client")
    def test_provider_groq_appelle_groq(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "réponse groq"
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        config = AIConfig.get_solo()
        config.provider = "GROQ"
        config.groq_model = "modele-test"
        config.save()

        result = call_ai([{"role": "user", "content": "test"}], max_tokens=100)

        self.assertEqual(result, "réponse groq")
        _, kwargs = mock_client.chat.completions.create.call_args
        self.assertEqual(kwargs["model"], "modele-test")
        self.assertEqual(kwargs["max_tokens"], 100)

    @patch("jobs.ai_engine._get_groq_client")
    def test_temperature_par_defaut_lue_depuis_config(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "x"
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        config = AIConfig.get_solo()
        config.temperature = 0.3
        config.save()

        call_ai([{"role": "user", "content": "test"}])

        _, kwargs = mock_client.chat.completions.create.call_args
        self.assertEqual(kwargs["temperature"], 0.3)

    @patch("jobs.ai_engine._get_groq_client")
    def test_temperature_explicite_prevaut_sur_config(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "x"
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        config = AIConfig.get_solo()
        config.temperature = 0.3
        config.save()

        call_ai([{"role": "user", "content": "test"}], temperature=0.9)

        _, kwargs = mock_client.chat.completions.create.call_args
        self.assertEqual(kwargs["temperature"], 0.9)

    @patch("jobs.ai_engine._get_groq_client")
    def test_response_format_transmis(self, mock_get_client):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices[0].message.content = '{"a": 1}'
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client

        call_ai([{"role": "user", "content": "test"}], response_format={"type": "json_object"})

        _, kwargs = mock_client.chat.completions.create.call_args
        self.assertEqual(kwargs["response_format"], {"type": "json_object"})

    @patch("jobs.ai_engine._get_groq_client")
    def test_groq_sans_cle_api_leve_exception(self, mock_get_client):
        mock_get_client.return_value = None
        with self.assertRaises(Exception):
            call_ai([{"role": "user", "content": "test"}])

    @patch("jobs.ai_engine.ollama")
    def test_provider_ollama_appelle_ollama_pas_groq(self, mock_ollama):
        mock_ollama.chat.return_value = {"message": {"content": "réponse ollama"}}

        config = AIConfig.get_solo()
        config.provider = "OLLAMA"
        config.ollama_model = "mistral"
        config.save()

        with patch("jobs.ai_engine._get_groq_client") as mock_groq_client:
            result = call_ai([{"role": "user", "content": "test"}], max_tokens=200)
            mock_groq_client.assert_not_called()

        self.assertEqual(result, "réponse ollama")
        _, kwargs = mock_ollama.chat.call_args
        self.assertEqual(kwargs["model"], "mistral")
