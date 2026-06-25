from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class ChangerMotDePasseTests(APITestCase):
    """Tests pour POST /api/accounts/changer-mot-de-passe/"""

    def setUp(self):
        self.url = reverse('changer-mot-de-passe')
        self.user = User.objects.create_user(
            username="ali_mdp",
            email="ali_mdp@test.dz",
            password="AncienMdp123!",
            role="CANDIDAT",
        )

    # ── Authentification requise ─────────────────────────────────────────────

    def test_non_authentifie_retourne_401(self):
        response = self.client.post(self.url, {"nouveau_mdp": "NouveauMdp123!"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ── Compte email classique ───────────────────────────────────────────────

    def test_mdp_change_avec_bon_ancien_mdp(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            "ancien_mdp": "AncienMdp123!",
            "nouveau_mdp": "NouveauMdp456!",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NouveauMdp456!"))

    def test_mauvais_ancien_mdp_retourne_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            "ancien_mdp": "MauvaisAncien!",
            "nouveau_mdp": "NouveauMdp456!",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_nouveau_mdp_trop_court_retourne_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {
            "ancien_mdp": "AncienMdp123!",
            "nouveau_mdp": "court",
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_nouveau_mdp_absent_retourne_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"ancien_mdp": "AncienMdp123!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Compte Google (sans ancien mot de passe) ─────────────────────────────

    def test_compte_google_definit_mdp_sans_ancien(self):
        """Compte Google peut définir un MDP sans fournir l'ancien."""
        google_user = User.objects.create_user(
            username="google_user",
            email="google@test.dz",
            password="",
            role="RECRUTEUR",
        )
        google_user.est_compte_google = True
        google_user.save(update_fields=["est_compte_google"])
        self.client.force_authenticate(user=google_user)

        response = self.client.post(self.url, {"nouveau_mdp": "PremierMdp123!"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("message", response.data)
        google_user.refresh_from_db()
        self.assertTrue(google_user.check_password("PremierMdp123!"))

    def test_compte_google_mdp_trop_court_retourne_400(self):
        google_user = User.objects.create_user(
            username="google_user2",
            email="google2@test.dz",
            password="",
            role="RECRUTEUR",
        )
        google_user.est_compte_google = True
        google_user.save(update_fields=["est_compte_google"])
        self.client.force_authenticate(user=google_user)

        response = self.client.post(self.url, {"nouveau_mdp": "court"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # ── Recruteur peut aussi changer son MDP ─────────────────────────────────

    def test_recruteur_classique_change_mdp(self):
        recruteur = User.objects.create_user(
            username="rh_mdp",
            email="rh_mdp@test.dz",
            password="AncienRH123!",
            role="RECRUTEUR",
        )
        self.client.force_authenticate(user=recruteur)
        response = self.client.post(self.url, {
            "ancien_mdp": "AncienRH123!",
            "nouveau_mdp": "NouveauRH456!",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        recruteur.refresh_from_db()
        self.assertTrue(recruteur.check_password("NouveauRH456!"))
