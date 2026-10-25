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

    def test_debloque_expose_auteur_et_date(self):
        user, entreprise = make_entreprise("cvc_trace", palier_nom="PRO")
        deverrouiller_candidat(entreprise, self.cand, par=user)
        self.client.force_authenticate(user=user)
        row = self.client.get(reverse("cvtheque")).data["results"][0]
        self.assertTrue(row["est_debloque"])
        self.assertIsNotNone(row["debloque_le"])
        self.assertEqual(row["debloque_par_nom"], user.email)

    def test_non_debloque_sans_auteur_ni_date(self):
        user, _ = make_entreprise("cvc_sans_trace", palier_nom="PRO")
        self.client.force_authenticate(user=user)
        row = self.client.get(reverse("cvtheque")).data["results"][0]
        self.assertIsNone(row["debloque_le"])
        self.assertIsNone(row["debloque_par_nom"])

    def test_filtre_debloque_oui_non(self):
        autre = User.objects.create_user(username="cvc_cand2", email="cvc_cand2@test.dz", password="pwd", role="CANDIDAT")
        ProfilCandidat.objects.create(user=autre, wilaya="16 - Alger", titre_professionnel="Ops")
        user, entreprise = make_entreprise("cvc_filtre", palier_nom="PRO")
        deverrouiller_candidat(entreprise, self.cand, par=user)
        self.client.force_authenticate(user=user)
        oui = {r["user_id"] for r in self.client.get(reverse("cvtheque"), {"debloque": "oui"}).data["results"]}
        non = {r["user_id"] for r in self.client.get(reverse("cvtheque"), {"debloque": "non"}).data["results"]}
        self.assertEqual(oui, {self.cand.id})
        self.assertEqual(non, {autre.id})

    def test_filtre_debloque_ignore_les_deblocages_dune_autre_entreprise(self):
        _, autre_entreprise = make_entreprise("cvc_autre_co", palier_nom="PRO")
        deverrouiller_candidat(autre_entreprise, self.cand)
        user, _ = make_entreprise("cvc_moi", palier_nom="PRO")
        self.client.force_authenticate(user=user)
        rows = self.client.get(reverse("cvtheque"), {"debloque": "oui"}).data["results"]
        self.assertEqual(rows, [])

    def test_reponse_inclut_credits_disponibles(self):
        user, entreprise = make_entreprise("cvc_credits", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertIn("credits_disponibles", response.data)
        self.assertEqual(response.data["credits_disponibles"]["mensuel_restant"], 10)
