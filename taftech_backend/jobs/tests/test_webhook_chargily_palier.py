"""Webhook Chargily « checkout.paid » pour un abonnement par palier : c'est lui, et lui seul, qui
active le palier après un paiement (aucune activation côté navigateur). Ces tests prouvent que,
une fois le webhook reçu et sa signature valide, l'activation fonctionne — donc qu'un palier qui
reste inactif après un paiement de test vient de la LIVRAISON du webhook (tunnel ngrok, URL
configurée chez Chargily), pas du traitement."""
import hashlib
import hmac
import json
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from jobs.models import AbonnementEntreprise, CreditPack, PaiementAbonnement, Palier, ProfilEntreprise

User = get_user_model()
SECRET = "test_secret"


def _entreprise_sans_abonnement(username):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR")
    return ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )


@override_settings(CHARGILY_SECRET_KEY=SECRET)
class WebhookPalierTests(APITestCase):
    def _envoyer(self, entreprise, palier_nom="PRO", periode="MENSUEL", signature=None):
        payload = {
            "type": "checkout.paid",
            "data": {"metadata": {"palier_nom": palier_nom, "periode": periode, "entreprise_id": str(entreprise.id)}},
        }
        corps = json.dumps(payload).encode("utf-8")
        signature = signature or hmac.new(SECRET.encode(), corps, hashlib.sha256).hexdigest()
        return self.client.post(
            reverse("chargily-webhook"), data=corps, content_type="application/json", HTTP_SIGNATURE=signature,
        )

    def test_paiement_valide_active_le_palier(self):
        entreprise = _entreprise_sans_abonnement("wh_palier_ok")
        reponse = self._envoyer(entreprise, "PRO")
        self.assertEqual(reponse.status_code, 200)
        abonnement = AbonnementEntreprise.objects.get(entreprise=entreprise)
        self.assertEqual(abonnement.palier.nom, "PRO")
        self.assertTrue(abonnement.est_actif)
        self.assertTrue(PaiementAbonnement.objects.filter(entreprise=entreprise, palier_nom="PRO").exists())

    def test_signature_invalide_n_active_rien(self):
        entreprise = _entreprise_sans_abonnement("wh_palier_bad")
        reponse = self._envoyer(entreprise, "PRO", signature="signature_invalide")
        self.assertEqual(reponse.status_code, 400)
        self.assertFalse(AbonnementEntreprise.objects.filter(entreprise=entreprise).exists())

    def test_paiement_annuel_donne_le_palier_choisi(self):
        entreprise = _entreprise_sans_abonnement("wh_palier_an")
        self._envoyer(entreprise, "BUSINESS", periode="ANNUEL")
        abonnement = AbonnementEntreprise.objects.get(entreprise=entreprise)
        self.assertEqual(abonnement.palier, Palier.objects.get(nom="BUSINESS"))
        self.assertTrue(abonnement.est_actif)

    def test_evenement_autre_que_paiement_confirme_est_ignore(self):
        entreprise = _entreprise_sans_abonnement("wh_palier_ignore")
        corps = json.dumps({"type": "checkout.failed", "data": {"metadata": {"palier_nom": "PRO", "entreprise_id": str(entreprise.id)}}}).encode()
        signature = hmac.new(SECRET.encode(), corps, hashlib.sha256).hexdigest()
        reponse = self.client.post(
            reverse("chargily-webhook"), data=corps, content_type="application/json", HTTP_SIGNATURE=signature,
        )
        self.assertEqual(reponse.status_code, 200)
        self.assertFalse(AbonnementEntreprise.objects.filter(entreprise=entreprise).exists())


URL_WEBHOOK_PUBLIC = "https://exemple.ngrok-free.dev/api/jobs/premium/chargily/webhook/"
URL_CHECKOUT_PALIER = "/api/jobs/paliers/chargily/checkout/"


def _reponse_chargily():
    reponse = Mock()
    reponse.status_code = 200
    reponse.json.return_value = {"checkout_url": "https://pay.chargily.net/test/checkouts/x"}
    return reponse


class CheckoutWebhookEndpointTests(APITestCase):
    """L'URL du webhook part avec CHAQUE création de paiement (réglage CHARGILY_WEBHOOK_URL) : le
    palier / le pack est activé même si le tableau de bord Chargily n'a pas la bonne URL.
    Vide = comportement historique (rien n'est envoyé, Chargily utilise son tableau de bord)."""

    def setUp(self):
        self.entreprise = _entreprise_sans_abonnement("co_webhook_url")
        self.client.force_authenticate(user=self.entreprise.user)
        Palier.objects.filter(nom="PRO").update(prix_mensuel_da=5000)
        self.pack = CreditPack.objects.create(nom="Pack 10", credits=10, prix_da=2500, ordre=1)

    def _checkout_palier(self):
        with patch("jobs.views.recruteur_paiements.http_requests.post", return_value=_reponse_chargily()) as post:
            reponse = self.client.post(URL_CHECKOUT_PALIER, {"palier_nom": "PRO", "periode": "MENSUEL"}, format="json")
        return reponse, post

    def _checkout_pack(self):
        with patch("jobs.views.credits.http_requests.post", return_value=_reponse_chargily()) as post:
            reponse = self.client.post(reverse("credit-pack-checkout"), {"pack_id": self.pack.id}, format="json")
        return reponse, post

    @override_settings(CHARGILY_API_KEY="k", CHARGILY_WEBHOOK_URL=URL_WEBHOOK_PUBLIC)
    def test_palier_envoie_l_url_du_webhook(self):
        reponse, post = self._checkout_palier()
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(post.call_args.kwargs["json"]["webhook_endpoint"], URL_WEBHOOK_PUBLIC)

    @override_settings(CHARGILY_API_KEY="k", CHARGILY_WEBHOOK_URL="")
    def test_palier_sans_reglage_n_envoie_pas_d_url(self):
        reponse, post = self._checkout_palier()
        self.assertEqual(reponse.status_code, 200)
        self.assertNotIn("webhook_endpoint", post.call_args.kwargs["json"])

    @override_settings(CHARGILY_API_KEY="k", CHARGILY_WEBHOOK_URL=URL_WEBHOOK_PUBLIC)
    def test_pack_credits_envoie_l_url_du_webhook(self):
        reponse, post = self._checkout_pack()
        self.assertEqual(reponse.status_code, 200)
        self.assertEqual(post.call_args.kwargs["json"]["webhook_endpoint"], URL_WEBHOOK_PUBLIC)

    @override_settings(CHARGILY_API_KEY="k", CHARGILY_WEBHOOK_URL="")
    def test_pack_credits_sans_reglage_n_envoie_pas_d_url(self):
        reponse, post = self._checkout_pack()
        self.assertEqual(reponse.status_code, 200)
        self.assertNotIn("webhook_endpoint", post.call_args.kwargs["json"])
