from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class SupprimerCompteTests(APITestCase):
    """Tests pour POST /api/accounts/supprimer-mon-compte/"""

    def setUp(self):
        self.url = reverse('supprimer-mon-compte')
        self.user = User.objects.create_user(
            username="ali_del",
            email="ali_del@test.dz",
            password="MonMdp123!",
            role="CANDIDAT",
        )

    def test_non_authentifie_retourne_401(self):
        response = self.client.post(self.url, {"confirmation": "SUPPRIMER", "mot_de_passe": "MonMdp123!"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_confirmation_manquante_retourne_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"mot_de_passe": "MonMdp123!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_confirmation_incorrecte_retourne_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"confirmation": "supprime", "mot_de_passe": "MonMdp123!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_mauvais_mot_de_passe_retourne_400(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"confirmation": "SUPPRIMER", "mot_de_passe": "Mauvais!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_suppression_reussie_desactive_le_compte(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"confirmation": "SUPPRIMER", "mot_de_passe": "MonMdp123!"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)

    def test_confirmation_insensible_a_la_casse(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"confirmation": "  supprimer  ", "mot_de_passe": "MonMdp123!"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_compte_google_sans_mot_de_passe(self):
        google_user = User.objects.create_user(
            username="google_del",
            email="google_del@test.dz",
            password="",
            role="CANDIDAT",
        )
        google_user.est_compte_google = True
        google_user.save(update_fields=["est_compte_google"])
        self.client.force_authenticate(user=google_user)

        response = self.client.post(self.url, {"confirmation": "SUPPRIMER"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        google_user.refresh_from_db()
        self.assertFalse(google_user.is_active)
