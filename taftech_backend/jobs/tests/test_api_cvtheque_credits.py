from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, ProfilCandidat
from jobs.credits_utils import deverrouiller_candidat

User = get_user_model()


def make_entreprise(username, palier_nom=None):
    user = User.objects.create_user(
        username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR",
        consentement_cvtheque=True,
    )
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    if palier_nom:
        palier = Palier.objects.get(nom=palier_nom)
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return user, entreprise


class CVThequeCreditsMaskingAPITest(APITestCase):
    def setUp(self):
        self.cand = User.objects.create_user(username="cvc_cand", email="cvc_cand@test.dz", password="pwd", role="CANDIDAT")
        ProfilCandidat.objects.create(user=self.cand, wilaya="16 - Alger", titre_professionnel="Dev")

    def test_candidat_non_debloque_coordonnees_masquees(self):
        user, entreprise = make_entreprise("cvc_starter", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertEqual(response.status_code, 200)
        row = response.data["results"][0]
        self.assertFalse(row["est_debloque"])
        self.assertIsNone(row.get("email"))

    def test_candidat_debloque_coordonnees_visibles(self):
        user, entreprise = make_entreprise("cvc_pro", palier_nom="PRO")
        deverrouiller_candidat(entreprise, self.cand)
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        row = response.data["results"][0]
        self.assertTrue(row["est_debloque"])
        self.assertEqual(row["email"], self.cand.email)

    def test_reponse_inclut_credits_disponibles(self):
        user, entreprise = make_entreprise("cvc_credits", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertIn("credits_disponibles", response.data)
        self.assertEqual(response.data["credits_disponibles"]["mensuel_restant"], 10)
