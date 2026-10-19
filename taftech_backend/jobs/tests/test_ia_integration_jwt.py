"""Routes IA sensibles testées avec un vrai cookie JWT (règle du projet : jamais seulement
`force_authenticate`, qui court-circuite CustomJWTAuthentication)."""
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.models import ProfilCandidat
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()
CV = (
    "Karim BENALI\nkarim.benali@mail.dz\n0555 12 34 56\nOran\n\n"
    "Développeur Python\nExpérience : 2019 - 2023 développement d'applications web pour des clients."
)
REPONSE_IA = '{"titre_professionnel": "Développeur", "experiences": [], "formations": []}'


class IAIntegrationJWTTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.candidat = User.objects.create_user(
            username="jwt_cand", email="jwt_cand@test.dz", password="pwd", role="CANDIDAT",
            first_name="Karim", last_name="Benali",
        )
        ProfilCandidat.objects.create(user=self.candidat, titre_professionnel="Développeur")
        self.recruteur, _ = make_entreprise("jwt_rec", palier_nom="BUSINESS")

    def _connecter(self, user):
        nom_cookie = settings.SIMPLE_JWT.get("AUTH_COOKIE", "accessToken")
        self.client.cookies[nom_cookie] = str(RefreshToken.for_user(user).access_token)

    def test_fichier_invalide_ne_consomme_aucun_quota_et_ne_laisse_aucun_contexte(self):
        """Les validations du fichier passent avant le décompte : une extension refusée ne coûte rien
        et ne laisse aucun contexte de demande dans le thread (revue du 19/10/2026)."""
        from jobs.ia_quota import _utilisation_courante
        from jobs.models import UtilisationIA
        self._connecter(self.candidat)
        fichier = SimpleUploadedFile("cv.exe", b"MZ", content_type="application/octet-stream")
        reponse = self.client.post(reverse("parser-cv"), {"cv": fichier}, format="multipart")
        self.assertEqual(reponse.status_code, 400)
        self.assertEqual(UtilisationIA.objects.count(), 0)
        self.assertIsNone(_utilisation_courante.get())

    def test_le_middleware_vide_le_contexte_ia_d_une_requete_precedente(self):
        from jobs.confidentialite_ia.audit import COMPTEUR_ENTITES
        from jobs.ia_quota import _utilisation_courante
        _utilisation_courante.set(987654)  # contexte « oublié » par une requête précédente
        COMPTEUR_ENTITES.set({"EMAIL": 1})
        self.client.get(reverse("api-constants"))
        self.assertIsNone(_utilisation_courante.get())
        self.assertIsNone(COMPTEUR_ENTITES.get())

    def test_apercu_sans_cookie_refuse(self):
        reponse = self.client.post(reverse("ia-apercu-donnees"), {"fonction": "ANALYSE_CARRIERE"})
        self.assertIn(reponse.status_code, (401, 403))

    def test_apercu_candidat_autorise(self):
        self._connecter(self.candidat)
        reponse = self.client.post(reverse("ia-apercu-donnees"), {"fonction": "ANALYSE_CARRIERE"})
        self.assertEqual(reponse.status_code, 200)
        self.assertNotIn("Karim", reponse.data["texte"])

    def test_apercu_recruteur_refuse(self):
        self._connecter(self.recruteur)
        reponse = self.client.post(reverse("ia-apercu-donnees"), {"fonction": "ANALYSE_CARRIERE"})
        self.assertEqual(reponse.status_code, 403)

    @override_settings(CONFIDENTIALITE_IA_NER_ACTIF=False)
    def test_parser_le_nettoyage_ne_peut_pas_etre_contourne(self):
        """Aucun paramètre du corps de la requête ne désactive le masquage."""
        self._connecter(self.candidat)
        fichier = SimpleUploadedFile("cv.pdf", b"%PDF-1.4 test", content_type="application/pdf")
        with patch("jobs.cv_parser.parser.extract_text", return_value=CV), \
                patch("jobs.cv_parser.parser.extract_photo_from_pdf", return_value=None), \
                patch("jobs.domaine_agent.classifier_metiers_experiences", return_value={}), \
                patch("jobs.cv_parser.parser._call_groq", return_value=REPONSE_IA) as mock_ia:
            reponse = self.client.post(
                reverse("parser-cv"),
                {"cv": fichier, "masquer": "false", "nettoyer": "0", "anonymiser": "non", "raw": "1"},
                format="multipart",
            )
        self.assertEqual(reponse.status_code, 200)
        prompt = mock_ia.call_args[0][0]
        for interdit in ("karim.benali@mail.dz", "0555 12 34 56", "Karim", "BENALI"):
            self.assertNotIn(interdit, prompt)
        self.assertIn("donnees_candidat", mock_ia.call_args.kwargs)
        # Les coordonnées reviennent quand même au candidat, extraites en local du CV brut.
        self.assertEqual(reponse.data["email"], "karim.benali@mail.dz")
