"""
Tests pour le système Premium US11/12 :
- DemandeActivationPremiumAPIView (POST /jobs/premium/demande/)
- EnvoyerRecuPremiumAPIView (POST /jobs/premium/envoyer-recu/)
- AdminDemandesPremiumAPIView (GET/PATCH /jobs/admin/demandes-premium/)
- DashboardRecruteurAPIView — champs premium
- ProfilEntreprise.est_premium_actif property
"""
import datetime
from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from jobs.models import ProfilEntreprise, DemandeActivationPremium

User = get_user_model()


# ─── Helpers ────────────────────────────────────────────────────────────────

def make_recruteur(username, email):
    user = User.objects.create_user(
        username=username, email=email, password="pwd", role="RECRUTEUR"
    )
    entreprise = ProfilEntreprise.objects.create(
        user=user,
        nom_entreprise=f"Entreprise {username}",
        registre_commerce=f"RC_{username}",
        est_approuvee=True,
    )
    return user, entreprise


def make_admin(username, email):
    return User.objects.create_user(
        username=username, email=email, password="pwd", role="ADMIN", is_staff=True
    )


# ─── Tests modèle : est_premium_actif ───────────────────────────────────────

class PremiumPropertyTest(TestCase):
    def setUp(self):
        self.user, self.entreprise = make_recruteur("prop_rh", "prop@test.dz")

    def test_non_premium_par_defaut(self):
        self.assertFalse(self.entreprise.est_premium_actif)

    def test_premium_sans_expiry(self):
        """Premium sans date d'expiration = actif indéfiniment."""
        self.entreprise.est_premium = True
        self.entreprise.save()
        self.assertTrue(self.entreprise.est_premium_actif)

    def test_premium_non_expire(self):
        self.entreprise.est_premium = True
        self.entreprise.premium_expire_at = timezone.now() + datetime.timedelta(days=10)
        self.entreprise.save()
        self.assertTrue(self.entreprise.est_premium_actif)

    def test_premium_expire(self):
        self.entreprise.est_premium = True
        self.entreprise.premium_expire_at = timezone.now() - datetime.timedelta(days=1)
        self.entreprise.save()
        self.assertFalse(self.entreprise.est_premium_actif)


# ─── Tests API : DemanderActivationPremium ───────────────────────────────────

class DemanderPremiumAPITest(APITestCase):
    def setUp(self):
        self.user, self.entreprise = make_recruteur("prem_rh", "prem@test.dz")
        self.url = reverse("demande-premium")

    def test_creer_demande_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"moyen_paiement": "CIB", "nb_mois": 3})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(DemandeActivationPremium.objects.filter(
            entreprise=self.entreprise, nb_mois=3
        ).exists())

    def test_nb_mois_default_1(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"moyen_paiement": "EDAHABIA"})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        demande = DemandeActivationPremium.objects.get(entreprise=self.entreprise)
        self.assertEqual(demande.nb_mois, 1)

    def test_non_recruteur_refuse(self):
        candidat = User.objects.create_user(
            username="cand_prem", email="cand_prem@test.dz",
            password="pwd", role="CANDIDAT"
        )
        self.client.force_authenticate(user=candidat)
        response = self.client.post(self.url, {"moyen_paiement": "CIB", "nb_mois": 1})
        self.assertIn(response.status_code, [403, 400])

    def test_non_authentifie_refuse(self):
        response = self.client.post(self.url, {"moyen_paiement": "CIB", "nb_mois": 1})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── Tests API : EnvoyerRecuPremium ─────────────────────────────────────────

class EnvoyerRecuPremiumAPITest(APITestCase):
    def setUp(self):
        self.user, self.entreprise = make_recruteur("recu_rh", "recu@test.dz")
        self.url = reverse("envoyer-recu-premium")

    @patch("jobs.views.recruteur.EmailMultiAlternatives")
    def test_envoi_email_success(self, mock_email_cls):
        mock_instance = mock_email_cls.return_value
        mock_instance.send.return_value = None
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            "moyen_paiement": "CIB",
            "nb_mois": 1,
            "message": "Virement effectué le 12/06/2026",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_authentifie_refuse(self):
        response = self.client.post(self.url, {"moyen_paiement": "CIB", "nb_mois": 1})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ─── Tests API : AdminDemandesPremium ────────────────────────────────────────

class AdminDemandesPremiumAPITest(APITestCase):
    def setUp(self):
        self.admin = make_admin("admin_prem", "admin_prem@test.dz")
        self.user_rh, self.entreprise = make_recruteur("act_rh", "act@test.dz")
        self.demande = DemandeActivationPremium.objects.create(
            entreprise=self.entreprise,
            moyen_paiement="CIB",
            nb_mois=3,
        )
        self.url_list = reverse("admin-demandes-premium")
        self.url_activer = reverse("admin-activer-premium", args=[self.demande.id])

    def test_liste_demandes_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.url_list)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["nb_mois"], 3)

    def test_activer_premium_calcule_expiry(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(self.url_activer, {"nb_mois": 3})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.entreprise.refresh_from_db()
        self.assertTrue(self.entreprise.est_premium)
        self.assertIsNotNone(self.entreprise.premium_expire_at)

    def test_activer_premium_renouvellement_etend_expiry(self):
        """Renouveler un premium actif étend depuis la date d'expiration actuelle."""
        self.entreprise.est_premium = True
        future = timezone.now() + datetime.timedelta(days=15)
        self.entreprise.premium_expire_at = future
        self.entreprise.save()

        self.client.force_authenticate(user=self.admin)
        self.client.patch(self.url_activer, {"nb_mois": 1})
        self.entreprise.refresh_from_db()
        # La nouvelle expiry doit être environ 30 jours après la future date
        expected_min = future + datetime.timedelta(days=29)
        self.assertGreater(self.entreprise.premium_expire_at, expected_min)

    def test_non_admin_refuse(self):
        self.client.force_authenticate(user=self.user_rh)
        response = self.client.get(self.url_list)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_demande_marquee_traitee(self):
        self.client.force_authenticate(user=self.admin)
        self.client.patch(self.url_activer, {"nb_mois": 1})
        self.demande.refresh_from_db()
        self.assertTrue(self.demande.est_traitee)
        self.assertIsNotNone(self.demande.date_traitement)


# ─── Tests API : Dashboard — champs premium ──────────────────────────────────

class DashboardPremiumChampsTest(APITestCase):
    def setUp(self):
        self.user, self.entreprise = make_recruteur("dash_prem", "dash_prem@test.dz")
        self.url = reverse("dashboard-recruteur")

    def test_dashboard_retourne_est_premium_false(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["est_premium"])
        self.assertIsNone(response.data["premium_expire_at"])

    def test_dashboard_retourne_est_premium_true(self):
        self.entreprise.est_premium = True
        self.entreprise.premium_expire_at = timezone.now() + datetime.timedelta(days=30)
        self.entreprise.save()
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["est_premium"])
        self.assertIsNotNone(response.data["premium_expire_at"])

    def test_dashboard_premium_active_since(self):
        """Le champ premium_active_since est présent dans la réponse dashboard."""
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertIn("premium_active_since", response.data)
