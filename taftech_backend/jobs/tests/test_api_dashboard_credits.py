from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise

User = get_user_model()


class DashboardCreditsAPITest(APITestCase):
    def test_dashboard_expose_credits(self):
        user = User.objects.create_user(username="dc_dash", email="dc_dash@test.dz", password="pwd", role="RECRUTEUR")
        entreprise = ProfilEntreprise.objects.create(
            user=user, nom_entreprise="Co Dash", secteur_activite="IT",
            wilaya_siege="16 - Alger", registre_commerce="RC-DASH", est_approuvee=True,
        )
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=Palier.objects.get(nom="STARTER"))
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("dashboard-recruteur"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["credits_mensuel_restant"], 10)
        self.assertEqual(response.data["credits_achetes_restant"], 0)
