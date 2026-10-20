"""Aucune réponse de l'API ne contient la clé Groq ni le texte brut d'une erreur du fournisseur.

Une exception du fournisseur peut citer la clé, l'organisation ou un extrait de la requête : si une
vue la renvoyait telle quelle, le navigateur la recevrait. Ces tests passent par un vrai cookie JWT
et simulent une erreur contenant la clé sur chaque route qui appelle l'IA."""
import os
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.models import Candidature, OffreEmploi, ProfilCandidat
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()
CLE = "gsk_CLE_DE_TEST_123"
ERREUR_FOURNISSEUR = f"401 invalid api key {CLE} Traceback (most recent call last)"


class CleGroqNonExposeeTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.candidat = User.objects.create_user(
            username="cle_cand", email="cle_cand@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        ProfilCandidat.objects.create(user=self.candidat, titre_professionnel="Développeur")
        self.recruteur, entreprise = make_entreprise("cle_rec", palier_nom="BUSINESS")
        offre = OffreEmploi.objects.create(
            entreprise=entreprise, titre="Offre", wilaya="16 - Alger",
            description="d", statut_moderation="APPROUVEE",
        )
        self.candidature = Candidature.objects.create(
            offre=offre, candidat=self.candidat, score_matching=70,
            profil_snapshot={"titre_professionnel": "Développeur", "experiences": [], "formations": []},
        )

    def _connecter(self, user):
        """Cookie JWT réel : traverse CustomJWTAuthentication comme en production."""
        nom_cookie = settings.SIMPLE_JWT.get("AUTH_COOKIE", "accessToken")
        self.client.cookies[nom_cookie] = str(RefreshToken.for_user(user).access_token)

    def _verifier_propre(self, reponse):
        corps = reponse.content.decode("utf-8", errors="replace")
        self.assertNotIn(CLE, corps)
        self.assertNotIn("Traceback", corps)
        self.assertNotIn("invalid api key", corps)

    @patch.dict(os.environ, {"GROQ_API_KEY": CLE})
    def test_analyse_carriere(self):
        self._connecter(self.candidat)
        with patch("jobs.views.ia._appel_groq", side_effect=Exception(ERREUR_FOURNISSEUR)):
            reponse = self.client.get(reverse("analyse-carriere"))
        self.assertEqual(reponse.status_code, 503)
        self._verifier_propre(reponse)

    @patch.dict(os.environ, {"GROQ_API_KEY": CLE})
    def test_conseils_personnalises(self):
        self._connecter(self.candidat)
        with patch("jobs.ai_engine.call_ai", side_effect=Exception(ERREUR_FOURNISSEUR)):
            reponse = self.client.get(reverse("conseils-personnalises"))
        self.assertEqual(reponse.status_code, 503)
        self._verifier_propre(reponse)

    @patch.dict(os.environ, {"GROQ_API_KEY": CLE})
    def test_analyse_recruteur(self):
        self._connecter(self.recruteur)
        url = reverse("analyse-groq", args=[self.candidature.id])
        with patch("jobs.views.ia._appel_groq", side_effect=Exception(ERREUR_FOURNISSEUR)):
            reponse = self.client.post(url)
        self.assertEqual(reponse.status_code, 503)
        self._verifier_propre(reponse)

    @patch.dict(os.environ, {"GROQ_API_KEY": CLE})
    def test_les_journaux_serveur_ne_contiennent_pas_la_cle(self):
        """Les erreurs du fournisseur sont journalisées par type et statut, jamais en texte brut."""
        self._connecter(self.candidat)
        with patch("jobs.views.ia._appel_groq", side_effect=Exception(ERREUR_FOURNISSEUR)):
            with self.assertLogs(level="ERROR") as journal:
                self.client.get(reverse("analyse-carriere"))
        self.assertNotIn(CLE, "\n".join(journal.output))

    @patch.dict(os.environ, {"GROQ_API_KEY": CLE})
    def test_parser_cv(self):
        self._connecter(self.candidat)
        fichier = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        with patch("jobs.views.ia.parse_cv", side_effect=Exception(ERREUR_FOURNISSEUR)):
            reponse = self.client.post(reverse("parser-cv"), {"cv": fichier}, format="multipart")
        self.assertEqual(reponse.status_code, 500)
        self.assertEqual(reponse.data.get("code"), "PARSING_ECHEC")
        self._verifier_propre(reponse)
