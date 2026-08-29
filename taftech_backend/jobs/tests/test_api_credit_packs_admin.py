from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import CreditPack

User = get_user_model()


class CreditPacksPublicAPITest(APITestCase):
    def test_liste_publique_ne_retourne_que_les_actifs(self):
        CreditPack.objects.create(nom="Actif", credits=10, prix_da=2500, actif=True, ordre=1)
        CreditPack.objects.create(nom="Inactif", credits=5, prix_da=1500, actif=False, ordre=2)
        response = self.client.get(reverse("credit-packs-public"))
        self.assertEqual(response.status_code, 200)
        noms = [p["nom"] for p in response.data]
        self.assertIn("Actif", noms)
        self.assertNotIn("Inactif", noms)


class CreditPacksAdminAPITest(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username="cpa_admin", email="cpa_admin@test.dz", password="pwd", role="ADMIN", is_staff=True)
        self.recruteur = User.objects.create_user(username="cpa_recr", email="cpa_recr@test.dz", password="pwd", role="RECRUTEUR")

    def test_non_admin_refuse(self):
        self.client.force_authenticate(user=self.recruteur)
        response = self.client.get(reverse("admin-credit-packs"))
        self.assertEqual(response.status_code, 403)

    def test_admin_crud_complet(self):
        self.client.force_authenticate(user=self.admin)
        r1 = self.client.post(reverse("admin-credit-packs"), {"nom": "Pack 100", "credits": 100, "prix_da": 18000, "ordre": 4, "actif": True})
        self.assertEqual(r1.status_code, 201)
        pack_id = r1.data["id"]

        r2 = self.client.put(reverse("admin-credit-pack-detail", args=[pack_id]), {"prix_da": 17500})
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r2.data["prix_da"], 17500)

        r3 = self.client.delete(reverse("admin-credit-pack-detail", args=[pack_id]))
        self.assertEqual(r3.status_code, 200)
        self.assertFalse(CreditPack.objects.filter(id=pack_id).exists())
