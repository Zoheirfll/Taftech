"""Mes candidatures : pagination « Voir plus » (?page=) et liste complète sans paramètre."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from jobs.models import Candidature, OffreEmploi
from jobs.tests.test_api_paliers_gating import make_entreprise

User = get_user_model()
NB_CANDIDATURES = 12


class MesCandidaturesPaginationTest(APITestCase):
    def setUp(self):
        self.candidat = User.objects.create_user(
            username="pag_cand", email="pag_cand@test.dz", password="pwd", role="CANDIDAT",
        )
        self.autre = User.objects.create_user(
            username="pag_autre", email="pag_autre@test.dz", password="pwd", role="CANDIDAT",
        )
        _, entreprise = make_entreprise("pag_rec", palier_nom="BUSINESS")
        for i in range(NB_CANDIDATURES):
            offre = OffreEmploi.objects.create(
                entreprise=entreprise, titre=f"Offre {i}", wilaya="16 - Alger", description="d",
                statut_moderation="APPROUVEE",
            )
            Candidature.objects.create(offre=offre, candidat=self.candidat, statut="RECUE")
        Candidature.objects.create(offre=offre, candidat=self.autre, statut="RECUE")
        self.url = reverse("mes-candidatures")
        nom_cookie = settings.SIMPLE_JWT.get("AUTH_COOKIE", "accessToken")
        self.client.cookies[nom_cookie] = str(RefreshToken.for_user(self.candidat).access_token)

    def test_sans_page_liste_complete(self):
        reponse = self.client.get(self.url)
        self.assertEqual(reponse.status_code, 200)
        self.assertIsInstance(reponse.data, list)
        self.assertEqual(len(reponse.data), NB_CANDIDATURES)

    def test_page_1_renvoie_dix_elements_et_le_total(self):
        reponse = self.client.get(self.url, {"page": 1})
        self.assertEqual(reponse.data["count"], NB_CANDIDATURES)
        self.assertEqual(len(reponse.data["results"]), 10)

    def test_page_2_complete_la_liste_sans_doublon(self):
        p1 = {c["id"] for c in self.client.get(self.url, {"page": 1}).data["results"]}
        p2 = {c["id"] for c in self.client.get(self.url, {"page": 2}).data["results"]}
        self.assertEqual(len(p2), NB_CANDIDATURES - 10)
        self.assertFalse(p1 & p2)

    def test_les_candidatures_d_un_autre_compte_ne_sont_jamais_renvoyees(self):
        reponse = self.client.get(self.url, {"page": 1, "page_size": 50})
        self.assertEqual(reponse.data["count"], NB_CANDIDATURES)

    def test_anonyme_refuse(self):
        self.client.cookies.clear()
        self.assertEqual(self.client.get(self.url, {"page": 1}).status_code, 401)
