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
        Palier.objects.all().delete()  # vide le contenu seedé par la migration 0080

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
        Palier.objects.all().delete()  # vide le contenu seedé par la migration 0080
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


from django.urls import reverse
from rest_framework.test import APITestCase


def make_admin_paliers():
    return User.objects.create_user(
        username="admin_paliers", email="admin_paliers@test.dz", password="pwd",
        role="ADMIN", is_staff=True,
    )


class PalierAPITest(APITestCase):
    def setUp(self):
        cache.clear()
        Palier.objects.all().delete()  # vide le contenu seedé par la migration 0080
        self.admin = make_admin_paliers()
        self.palier_actif = Palier.objects.create(nom="STARTER", prix_mensuel_da=5900, actif=True)
        self.palier_inactif = Palier.objects.create(nom="PRO", prix_mensuel_da=12900, actif=False)

    def test_public_liste_seulement_actifs(self):
        response = self.client.get(reverse("paliers-public"))
        self.assertEqual(response.status_code, 200)
        noms = [p["nom"] for p in response.data]
        self.assertIn("STARTER", noms)
        self.assertNotIn("PRO", noms)

    def test_admin_liste_tout(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("admin-paliers"))
        self.assertEqual(len(response.data), 2)

    def test_non_admin_refuse(self):
        candidat = User.objects.create_user(
            username="cand_paliers", email="cand_paliers@test.dz", password="pwd", role="CANDIDAT",
        )
        self.client.force_authenticate(user=candidat)
        response = self.client.get(reverse("admin-paliers"))
        self.assertEqual(response.status_code, 403)

    def test_creation_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("admin-paliers"), {
            "nom": "BUSINESS", "prix_mensuel_da": 22900,
        })
        self.assertEqual(response.status_code, 201)

    def test_update_invalide_cache_public(self):
        self.client.get(reverse("paliers-public"))  # peuple le cache
        self.client.force_authenticate(user=self.admin)
        self.client.put(reverse("admin-palier-detail", args=[self.palier_actif.id]), {"prix_mensuel_da": 6900})
        response = self.client.get(reverse("paliers-public"))
        prix = next(p["prix_mensuel_da"] for p in response.data if p["id"] == self.palier_actif.id)
        self.assertEqual(prix, 6900)

    def test_delete_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse("admin-palier-detail", args=[self.palier_actif.id]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Palier.objects.filter(id=self.palier_actif.id).exists())
