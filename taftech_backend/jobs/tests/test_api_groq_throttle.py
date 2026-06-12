"""
Tests du throttle Groq — vérification de la configuration.
"""
from django.test import TestCase
from rest_framework.throttling import UserRateThrottle
from jobs.views.ia import (
    GroqThrottle,
    AnalyseCarriereGroqAPIView,
    AnalyseGroqRecruteurAPIView,
    MetierReferentielAPIView,
)


class GroqThrottleConfigTest(TestCase):
    """Vérifie la configuration et l'application du throttle Groq."""

    def test_scope_est_groq(self):
        """GroqThrottle doit avoir le scope 'groq'."""
        self.assertEqual(GroqThrottle.scope, 'groq')

    def test_groq_throttle_herite_user_rate_throttle(self):
        """GroqThrottle hérite de UserRateThrottle (limite par utilisateur authentifié)."""
        self.assertTrue(issubclass(GroqThrottle, UserRateThrottle))

    def test_analyse_carriere_utilise_groq_throttle(self):
        """AnalyseCarriereGroqAPIView applique GroqThrottle."""
        self.assertIn(GroqThrottle, AnalyseCarriereGroqAPIView.throttle_classes)

    def test_analyse_recruteur_utilise_groq_throttle(self):
        """AnalyseGroqRecruteurAPIView applique GroqThrottle."""
        self.assertIn(GroqThrottle, AnalyseGroqRecruteurAPIView.throttle_classes)

    def test_scope_distinct_du_throttle_user(self):
        """Le scope 'groq' est différent du scope 'user' pour une limite indépendante."""
        self.assertNotEqual(GroqThrottle.scope, 'user')
        self.assertNotEqual(GroqThrottle.scope, 'anon')
