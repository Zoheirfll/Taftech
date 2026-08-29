import hmac
import hashlib
import json
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, CreditPack, PaiementCreditPack

User = get_user_model()


def make_entreprise(username, palier_nom="STARTER"):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    palier = Palier.objects.get(nom=palier_nom)
    AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return user, entreprise


@override_settings(CHARGILY_API_KEY="test_api_key", CHARGILY_SECRET_KEY="test_secret")
class CreditPackCheckoutAPITest(APITestCase):
    def test_checkout_pack_inexistant_404(self):
        user, _ = make_entreprise("ckt_404")
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("credit-pack-checkout"), {"pack_id": 99999})
        self.assertEqual(response.status_code, 404)


@override_settings(CHARGILY_SECRET_KEY="test_secret")
class ChargilyWebhookPackAPITest(APITestCase):
    def test_webhook_pack_credite_le_pool_achete(self):
        user, entreprise = make_entreprise("wh_pack")
        pack = CreditPack.objects.create(nom="Pack 10", credits=10, prix_da=2500, ordre=1)
        payload = {
            "type": "checkout.paid",
            "data": {"metadata": {"pack_id": str(pack.id), "entreprise_id": str(entreprise.id)}},
        }
        body = json.dumps(payload).encode("utf-8")
        signature = hmac.new(b"test_secret", body, hashlib.sha256).hexdigest()
        response = self.client.post(
            reverse("chargily-webhook"), data=body, content_type="application/json",
            HTTP_SIGNATURE=signature,
        )
        self.assertEqual(response.status_code, 200)
        entreprise.abonnement.refresh_from_db()
        self.assertEqual(entreprise.abonnement.credits_achetes_restants, 10)
        self.assertTrue(PaiementCreditPack.objects.filter(entreprise=entreprise, pack_nom="Pack 10").exists())

    def test_webhook_pack_signature_invalide_rejetee(self):
        _, entreprise = make_entreprise("wh_pack_bad")
        pack = CreditPack.objects.create(nom="Pack 25", credits=25, prix_da=5500, ordre=2)
        payload = {"type": "checkout.paid", "data": {"metadata": {"pack_id": str(pack.id), "entreprise_id": str(entreprise.id)}}}
        response = self.client.post(
            reverse("chargily-webhook"), data=json.dumps(payload).encode("utf-8"),
            content_type="application/json", HTTP_SIGNATURE="signature_invalide",
        )
        self.assertEqual(response.status_code, 400)
