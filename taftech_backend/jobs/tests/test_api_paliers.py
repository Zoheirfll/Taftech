"""Tests pour le modèle Palier (session 22/08/2026, Phase 2a — voir
docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md)."""
from django.test import TestCase
from django.core.cache import cache
from jobs.models import Palier, AbonnementEntreprise, ProfilEntreprise
from django.contrib.auth import get_user_model

User = get_user_model()


class PalierModelTest(TestCase):
    def setUp(self):
        cache.clear()

    def test_creation_palier_minimal(self):
        p = Palier.objects.create(nom="STARTER", limite_offres=5)
        self.assertEqual(str(p), p.get_nom_display())
        self.assertTrue(p.actif)

    def test_nom_unique(self):
        Palier.objects.create(nom="STARTER")
        with self.assertRaises(Exception):
            Palier.objects.create(nom="STARTER")

    def test_prix_zero_rejete(self):
        p = Palier(nom="PRO", prix_mensuel_da=0)
        with self.assertRaises(Exception):
            p.full_clean()

    def test_prix_null_autorise_pour_enterprise(self):
        p = Palier(nom="ENTERPRISE", prix_mensuel_da=None, prix_annuel_da=None)
        p.full_clean()  # ne doit pas lever


class AbonnementEntrepriseModelTest(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="rec_paliers", email="rec_paliers@test.dz", password="pwd", role="RECRUTEUR",
        )
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.user, nom_entreprise="TestCo", secteur_activite="IT",
            wilaya_siege="16 - Alger", registre_commerce="RC-PALIERS-1",
        )
        self.palier = Palier.objects.create(nom="BUSINESS")

    def test_creation_abonnement(self):
        ab = AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=self.palier)
        self.assertTrue(ab.est_actif)  # date_expiration=None → illimité

    def test_est_actif_false_si_expire(self):
        from django.utils import timezone
        import datetime
        ab = AbonnementEntreprise.objects.create(
            entreprise=self.entreprise, palier=self.palier,
            date_expiration=timezone.now() - datetime.timedelta(days=1),
        )
        self.assertFalse(ab.est_actif)

    def test_une_seule_entreprise_un_seul_abonnement(self):
        AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=self.palier)
        with self.assertRaises(Exception):
            AbonnementEntreprise.objects.create(entreprise=self.entreprise, palier=self.palier)
