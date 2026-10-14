"""Une entreprise en attente de validation ne peut ni demander l'activation d'une formule
ni lancer un paiement de formule : refus 403 côté serveur, avec le message
« Votre entreprise est en cours de validation. Vous pourrez activer votre formule après
validation de votre compte. » (la page Abonnements affiche le même texte)."""
from unittest.mock import patch

from rest_framework.test import APITestCase

from jobs.models import DemandeActivationPremium
from jobs.tests.test_api_paliers_gating import make_entreprise

MESSAGE = "Votre entreprise est en cours de validation. Vous pourrez activer votre formule après validation de votre compte."


class SouscriptionEntrepriseNonValideeTests(APITestCase):
    def setUp(self):
        self.user, self.entreprise = make_entreprise("souscr_nv", palier_nom="STARTER")
        self.entreprise.est_approuvee = False
        self.entreprise.save(update_fields=["est_approuvee"])
        self.client.force_authenticate(user=self.user)

    def _refuse(self, reponse):
        self.assertEqual(reponse.status_code, 403)
        self.assertEqual(reponse.data.get("code"), "ENTREPRISE_NON_VALIDEE")
        self.assertEqual(reponse.data.get("error"), MESSAGE)

    def test_demande_activation_refusee_et_aucune_demande_creee(self):
        reponse = self.client.post("/api/jobs/premium/demande/", {"moyen_paiement": "CIB", "nb_mois": 1}, format="json")
        self._refuse(reponse)
        self.assertFalse(DemandeActivationPremium.objects.filter(entreprise=self.entreprise).exists())

    def test_checkout_palier_refuse_sans_appel_au_prestataire(self):
        with patch("requests.post") as appel_externe:
            reponse = self.client.post(
                "/api/jobs/paliers/chargily/checkout/", {"palier_nom": "PRO", "periode": "MENSUEL"}, format="json",
            )
        self._refuse(reponse)
        appel_externe.assert_not_called()

    def test_demande_activation_acceptee_apres_validation(self):
        self.entreprise.est_approuvee = True
        self.entreprise.save(update_fields=["est_approuvee"])
        reponse = self.client.post("/api/jobs/premium/demande/", {"moyen_paiement": "CIB", "nb_mois": 1}, format="json")
        self.assertEqual(reponse.status_code, 201)
