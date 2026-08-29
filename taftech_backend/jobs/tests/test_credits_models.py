from django.test import TestCase
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, CreditPack, AccesCandidatDebloque

User = get_user_model()


class CreditPackModelTest(TestCase):
    def test_creation_pack(self):
        pack = CreditPack.objects.create(nom="Pack 10", credits=10, prix_da=2500, ordre=1)
        self.assertTrue(pack.actif)
        self.assertEqual(str(pack), "Pack 10")


class AccesCandidatDebloqueModelTest(TestCase):
    def setUp(self):
        self.recruteur = User.objects.create_user(
            username="acd_recr", email="acd_recr@test.dz", password="pwd", role="RECRUTEUR",
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.recruteur, nom_entreprise="Co ACD", secteur_activite="IT",
            wilaya_siege="16 - Alger", registre_commerce="RC-ACD", est_approuvee=True,
        )
        self.candidat = User.objects.create_user(
            username="acd_cand", email="acd_cand@test.dz", password="pwd", role="CANDIDAT",
        )

    def test_unique_together_entreprise_candidat(self):
        AccesCandidatDebloque.objects.create(entreprise=self.entreprise, candidat=self.candidat, source='MENSUEL')
        with self.assertRaises(IntegrityError):
            AccesCandidatDebloque.objects.create(entreprise=self.entreprise, candidat=self.candidat, source='ACHETE')

    def test_credits_achetes_restants_default_zero(self):
        palier = Palier.objects.get(nom='STARTER')
        abonnement = AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=palier)
        self.assertEqual(abonnement.credits_achetes_restants, 0)
