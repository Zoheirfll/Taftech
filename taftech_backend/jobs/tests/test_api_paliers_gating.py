"""Tests du gating par palier (Phase 2b, session 22/08/2026) — limite d'offres à la publication,
accès CVthèque + coordonnées, génération offre IA. Voir
docs/superpowers/specs/2026-08-22-portail-recruteur-sidebar-premium-design.md."""
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from jobs.models import ProfilEntreprise, Palier, AbonnementEntreprise, OffreEmploi
from jobs.paliers_utils import get_palier_actif, limite_offres_actives

User = get_user_model()


def make_entreprise(username, est_premium=False, palier_nom=None, expire_dans_jours=None):
    user = User.objects.create_user(
        username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR",
    )
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}",
        est_approuvee=True, est_premium=est_premium,
        premium_expire_at=timezone.now() + timezone.timedelta(days=30) if est_premium else None,
    )
    if palier_nom:
        palier = Palier.objects.get(nom=palier_nom)
        date_expiration = None
        if expire_dans_jours is not None:
            date_expiration = timezone.now() + timezone.timedelta(days=expire_dans_jours)
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier, date_expiration=date_expiration)
    return user, entreprise


class GetPalierActifTest(TestCase):
    def test_aucun_abonnement_retourne_none(self):
        _, entreprise = make_entreprise("gp_gratuit")
        self.assertIsNone(get_palier_actif(entreprise))

    def test_abonnement_actif_retourne_le_palier(self):
        _, entreprise = make_entreprise("gp_starter", palier_nom="STARTER")
        self.assertEqual(get_palier_actif(entreprise).nom, "STARTER")

    def test_abonnement_expire_retourne_none(self):
        _, entreprise = make_entreprise("gp_expire", palier_nom="STARTER", expire_dans_jours=-1)
        self.assertIsNone(get_palier_actif(entreprise))

    def test_repli_legacy_est_premium_actif_vers_business(self):
        """Un compte activé via l'ancien flux (est_premium=True, pas d'AbonnementEntreprise)
        retombe sur BUSINESS — sans ce repli, un paiement réel via Chargily/admin laisserait
        le compte bloqué partout."""
        _, entreprise = make_entreprise("gp_legacy", est_premium=True)
        self.assertEqual(get_palier_actif(entreprise).nom, "BUSINESS")

    def test_limite_offres_gratuit_egale_1(self):
        _, entreprise = make_entreprise("gp_limite_gratuit")
        self.assertEqual(limite_offres_actives(entreprise), 1)

    def test_limite_offres_starter_egale_5(self):
        _, entreprise = make_entreprise("gp_limite_starter", palier_nom="STARTER")
        self.assertEqual(limite_offres_actives(entreprise), 5)

    def test_limite_offres_business_illimitee(self):
        _, entreprise = make_entreprise("gp_limite_business", palier_nom="BUSINESS")
        self.assertIsNone(limite_offres_actives(entreprise))


class LimiteOffresPublicationAPITest(APITestCase):
    def _offre_payload(self):
        return {
            "titre": "Dev Test", "wilaya": "16 - Alger", "specialite": "IT",
            "diplome": "MASTER", "experience_requise": "1", "type_contrat": "CDI",
            "description": "desc", "missions": "m", "profil_recherche": "p",
        }

    def test_gratuit_bloque_apres_1_offre(self):
        user, entreprise = make_entreprise("lim_api_gratuit")
        self.client.force_authenticate(user=user)
        r1 = self.client.post(reverse("creer-offre"), self._offre_payload())
        self.assertEqual(r1.status_code, 201)
        OffreEmploi.objects.filter(entreprise=entreprise).update(statut_moderation="APPROUVEE")
        r2 = self.client.post(reverse("creer-offre"), self._offre_payload())
        self.assertEqual(r2.status_code, 403)
        self.assertEqual(r2.data.get("code"), "LIMITE_OFFRES_ATTEINTE")

    def test_business_illimite(self):
        user, entreprise = make_entreprise("lim_api_business", palier_nom="BUSINESS")
        self.client.force_authenticate(user=user)
        for _ in range(3):
            r = self.client.post(reverse("creer-offre"), self._offre_payload())
            self.assertEqual(r.status_code, 201)
            OffreEmploi.objects.filter(entreprise=entreprise).update(statut_moderation="APPROUVEE")


class CVThequeGatingAPITest(APITestCase):
    def setUp(self):
        self.cand = User.objects.create_user(
            username="cvg_cand", email="cvg_cand@test.dz", password="pwd", role="CANDIDAT",
        )
        from jobs.models import ProfilCandidat
        ProfilCandidat.objects.create(user=self.cand, wilaya="16 - Alger", titre_professionnel="Dev")

    def test_gratuit_bloque_entierement(self):
        user, _ = make_entreprise("cvg_gratuit")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertEqual(response.status_code, 403)

    def test_starter_acces_mais_coordonnees_masquees(self):
        user, _ = make_entreprise("cvg_starter", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_premium"])
        candidat_row = response.data["results"][0]
        self.assertIsNone(candidat_row.get("email"))

    def test_pro_acces_et_coordonnees_visibles(self):
        user, _ = make_entreprise("cvg_pro", palier_nom="PRO")
        self.client.force_authenticate(user=user)
        response = self.client.get(reverse("cvtheque"))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_premium"])
        candidat_row = response.data["results"][0]
        self.assertEqual(candidat_row.get("email"), self.cand.email)


class GenererOffreIAGatingAPITest(APITestCase):
    def test_gratuit_refuse(self):
        user, _ = make_entreprise("ia_gratuit")
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("generer-offre-ia"), {"titre": "Dev"})
        self.assertEqual(response.status_code, 403)

    def test_starter_autorise_a_depasser_le_gate(self):
        """On ne teste pas l'appel Groq réel ici (hors scope) — seulement que le gate palier
        laisse passer un compte Starter (ne renvoie plus le 403 'réservé aux comptes avec un
        abonnement actif')."""
        user, _ = make_entreprise("ia_starter", palier_nom="STARTER")
        self.client.force_authenticate(user=user)
        response = self.client.post(reverse("generer-offre-ia"), {"titre": "Dev"})
        self.assertNotEqual(response.data.get("error"), "Fonctionnalité réservée aux comptes avec un abonnement actif.")
