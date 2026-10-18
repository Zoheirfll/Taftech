"""Sécurité : tant que son entreprise n'est pas validée par TafTech, un recruteur n'accède à
AUCUNE route de l'espace recruteur (pas seulement aux données de candidats).

Ces tests passent par un vrai jeton dans le cookie (et non `force_authenticate`, qui
contournerait la classe d'authentification où le garde est appliqué). Seules restent
accessibles : `/api/accounts/` (connexion, profil, déconnexion) et les routes publiques."""
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()

ROUTES_ESPACE_RECRUTEUR = [
    ("get", "/api/jobs/dashboard/"),
    ("get", "/api/jobs/employeur/cvtheque/"),
    ("get", "/api/jobs/dashboard/candidats-recommandes/"),
    ("get", "/api/jobs/dashboard/candidatures-spontanees/"),
    ("get", "/api/jobs/dashboard/export-excel/"),
    ("post", "/api/jobs/creer/"),
]


class RecruteurEnAttenteAccesTotalTests(APITestCase):
    def setUp(self):
        self.user, self.entreprise = make_entreprise("att_business", palier_nom="BUSINESS")
        self.entreprise.est_approuvee = False
        self.entreprise.save(update_fields=["est_approuvee"])

    def _connecter(self, user):
        """Cookie JWT réel : traverse CustomJWTAuthentication comme en production."""
        nom_cookie = settings.SIMPLE_JWT.get("AUTH_COOKIE", "accessToken")
        self.client.cookies[nom_cookie] = str(RefreshToken.for_user(user).access_token)

    def _appeler(self, methode, url):
        return getattr(self.client, methode)(url)

    def test_toutes_les_routes_de_l_espace_recruteur_sont_refusees(self):
        self._connecter(self.user)
        for methode, url in ROUTES_ESPACE_RECRUTEUR:
            with self.subTest(route=f"{methode.upper()} {url}"):
                reponse = self._appeler(methode, url)
                self.assertEqual(reponse.status_code, 403)
                self.assertEqual(reponse.data.get("code"), "ENTREPRISE_NON_VALIDEE")

    def test_profil_expose_le_statut_de_l_entreprise(self):
        self._connecter(self.user)
        reponse = self.client.get("/api/accounts/me/")
        self.assertEqual(reponse.status_code, 200)
        self.assertIs(reponse.data["entreprise_approuvee"], False)
        self.assertEqual(reponse.data["nom_entreprise"], self.entreprise.nom_entreprise)

    def test_deconnexion_reste_possible(self):
        self._connecter(self.user)
        self.assertNotEqual(self.client.post("/api/accounts/logout/").status_code, 403)

    def test_routes_publiques_restent_accessibles(self):
        self._connecter(self.user)
        self.assertEqual(self.client.get("/api/jobs/constants/").status_code, 200)

    def test_acces_retabli_des_la_validation(self):
        self.entreprise.est_approuvee = True
        self.entreprise.save(update_fields=["est_approuvee"])
        self._connecter(self.user)
        self.assertEqual(self.client.get("/api/jobs/dashboard/").status_code, 200)
        self.assertIs(self.client.get("/api/accounts/me/").data["entreprise_approuvee"], True)

    def test_candidat_non_concerne(self):
        candidat = User.objects.create_user(
            username="att_candidat", email="att_candidat@test.dz", password="pwd", role="CANDIDAT",
        )
        self._connecter(candidat)
        reponse = self.client.get("/api/accounts/me/")
        self.assertEqual(reponse.status_code, 200)
        self.assertIsNone(reponse.data["entreprise_approuvee"])
