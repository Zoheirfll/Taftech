"""Aperçu exact des données transmises à l'IA : jamais d'appel IA, aucun quota consommé."""
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.confidentialite_ia.construction import texte_carriere
from jobs.models import ProfilCandidat, UtilisationIA
from jobs.tests.test_api_paliers_gating import make_entreprise
from jobs.views.ia_apercu import ApercuIAThrottle

User = get_user_model()
CV = "Karim BENALI\nkarim.benali@mail.dz\n0555 12 34 56\n\nDéveloppeur Python. " + "x " * 60


class ApercuDonneesIATest(APITestCase):
    def setUp(self):
        self.url = reverse("ia-apercu-donnees")
        self.user = User.objects.create_user(
            username="apercu_c", email="apercu_c@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        self.profil = ProfilCandidat.objects.create(user=self.user, titre_professionnel="Développeur")

    def test_non_authentifie_refuse(self):
        r = self.client.post(self.url, {"fonction": "ANALYSE_CARRIERE"})
        self.assertIn(r.status_code, (401, 403))

    def test_recruteur_refuse(self):
        recruteur, _ = make_entreprise("apercu_r", palier_nom="BUSINESS")
        self.client.force_authenticate(user=recruteur)
        self.assertEqual(self.client.post(self.url, {"fonction": "ANALYSE_CARRIERE"}).status_code, 403)

    def test_fonction_inconnue(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.post(self.url, {"fonction": "AUTRE"}).status_code, 400)

    @patch("jobs.ai_engine.call_ai")
    def test_carriere_montre_exactement_le_texte_envoye(self, mock_ia):
        self.client.force_authenticate(user=self.user)
        r = self.client.post(self.url, {"fonction": "ANALYSE_CARRIERE"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["texte"], texte_carriere(self.profil))
        mock_ia.assert_not_called()
        self.assertEqual(UtilisationIA.objects.count(), 0)  # aucun quota consommé

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    @patch("jobs.ai_engine.call_ai")
    @patch("jobs.views.ia_apercu.extract_text", return_value=CV)
    def test_cv_televerse_masque_et_compte(self, _extract, mock_ia):
        self.client.force_authenticate(user=self.user)
        fichier = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        r = self.client.post(self.url, {"fonction": "PARSER_CV", "cv": fichier}, format="multipart")
        self.assertEqual(r.status_code, 200)
        for interdit in ("karim.benali@mail.dz", "0555 12 34 56", "Karim", "BENALI"):
            self.assertNotIn(interdit, r.data["texte"])
        self.assertEqual(r.data["categories"]["EMAIL"], 1)
        self.assertIn("EMAIL", r.data["libelles"])
        mock_ia.assert_not_called()

    def test_parser_sans_cv_400(self):
        self.client.force_authenticate(user=self.user)
        self.assertEqual(self.client.post(self.url, {"fonction": "PARSER_CV"}).status_code, 400)

    def test_extension_refusee(self):
        self.client.force_authenticate(user=self.user)
        fichier = SimpleUploadedFile("cv.exe", b"x")
        r = self.client.post(self.url, {"fonction": "PARSER_CV", "cv": fichier}, format="multipart")
        self.assertEqual(r.status_code, 400)

    def test_throttle_dedie(self):
        self.assertEqual(ApercuIAThrottle.scope, "apercu_ia")
