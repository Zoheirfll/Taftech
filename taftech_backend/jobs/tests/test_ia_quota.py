"""Tests du système de quotas IA (session 27/09/2026, demande client) — résolution du quota
effectif (override > palier/config > illimité), plafond global, anti-appels simultanés, et
gating API-level sur les 5 fonctions. Voir jobs/ia_quota.py et CLAUDE.md."""
from django.core.cache import cache
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

from jobs.models import (
    AIConfig, Palier, AbonnementEntreprise, ProfilEntreprise, QuotaIAOverride, UtilisationIA,
)
from jobs.ia_quota import (
    verifier_quota_ia, consommer_quota_ia, acquerir_verrou_ia, liberer_verrou_ia,
)

User = get_user_model()


def make_candidat(username="quota_cand"):
    return User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="CANDIDAT")


def make_admin(username="quota_admin"):
    return User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="ADMIN", is_staff=True)


def make_entreprise(username, palier_nom=None):
    user = User.objects.create_user(username=username, email=f"{username}@test.dz", password="pwd", role="RECRUTEUR")
    entreprise = ProfilEntreprise.objects.create(
        user=user, nom_entreprise=f"Co-{username}", secteur_activite="IT",
        wilaya_siege="16 - Alger", registre_commerce=f"RC-{username}", est_approuvee=True,
    )
    if palier_nom:
        palier = Palier.objects.get(nom=palier_nom)
        AbonnementEntreprise.objects.create(entreprise=entreprise, palier=palier)
    return user, entreprise


class QuotaIABase(TestCase):
    def setUp(self):
        cache.clear()
        AIConfig.get_solo()  # crée le singleton avec les défauts (3/10, 10/50, 10/50)


class VerifierQuotaCandidatTest(QuotaIABase):
    def test_sous_quota_autorise(self):
        user = make_candidat("vq1")
        ok, info = verifier_quota_ia(user, 'PARSER_CV')
        self.assertTrue(ok)
        self.assertEqual(info['quota_restant_jour'], 3)

    def test_quota_jour_atteint_bloque(self):
        user = make_candidat("vq2")
        for _ in range(3):
            consommer_quota_ia(user, 'PARSER_CV')
        ok, info = verifier_quota_ia(user, 'PARSER_CV')
        self.assertFalse(ok)
        self.assertEqual(info['code'], 'QUOTA_IA_JOUR_ATTEINT')
        self.assertIn('renouvellement_le', info)

    def test_quota_mois_atteint_bloque_meme_si_jour_ok(self):
        user = make_candidat("vq3")
        config = AIConfig.get_solo()
        config.parser_cv_limite_jour = None  # illimité/jour, seul le mois compte
        config.parser_cv_limite_mois = 2
        config.save()
        for _ in range(2):
            consommer_quota_ia(user, 'PARSER_CV')
        ok, info = verifier_quota_ia(user, 'PARSER_CV')
        self.assertFalse(ok)
        self.assertEqual(info['code'], 'QUOTA_IA_MOIS_ATTEINT')

    def test_quota_illimite_si_champs_null(self):
        user = make_candidat("vq4")
        config = AIConfig.get_solo()
        config.parser_cv_limite_jour = None
        config.parser_cv_limite_mois = None
        config.save()
        for _ in range(50):
            consommer_quota_ia(user, 'PARSER_CV')
        ok, info = verifier_quota_ia(user, 'PARSER_CV')
        self.assertTrue(ok)
        self.assertIsNone(info['quota_restant_jour'])


class VerifierQuotaRecruteurTest(QuotaIABase):
    def test_sans_palier_actif_bloque(self):
        user, _ = make_entreprise("vqr1")
        ok, info = verifier_quota_ia(user, 'GENERATION_OFFRE')
        self.assertFalse(ok)
        self.assertEqual(info['code'], 'PALIER_INSUFFISANT')

    def test_avec_palier_quota_configure(self):
        user, entreprise = make_entreprise("vqr2", palier_nom="STARTER")
        palier = entreprise.abonnement.palier
        palier.quota_generation_offre_jour = 5
        palier.quota_generation_offre_mois = 20
        palier.save()
        ok, info = verifier_quota_ia(user, 'GENERATION_OFFRE')
        self.assertTrue(ok)
        self.assertEqual(info['quota_restant_jour'], 5)

    def test_palier_sans_limite_configuree_illimite(self):
        user, _ = make_entreprise("vqr3", palier_nom="PRO")
        ok, info = verifier_quota_ia(user, 'GENERATION_OFFRE')
        self.assertTrue(ok)
        self.assertIsNone(info['quota_restant_jour'])


class OverrideCompteTest(QuotaIABase):
    def test_override_remplace_le_defaut(self):
        user = make_candidat("ov1")
        QuotaIAOverride.objects.create(user=user, fonction='PARSER_CV', limite_jour=1, limite_mois=1)
        consommer_quota_ia(user, 'PARSER_CV')
        ok, info = verifier_quota_ia(user, 'PARSER_CV')
        self.assertFalse(ok)  # le défaut (3/jour) aurait laissé passer, l'override (1/jour) bloque

    def test_override_illimite_pour_ce_compte(self):
        user = make_candidat("ov2")
        QuotaIAOverride.objects.create(user=user, fonction='PARSER_CV', limite_jour=None, limite_mois=None)
        for _ in range(20):
            consommer_quota_ia(user, 'PARSER_CV')
        ok, info = verifier_quota_ia(user, 'PARSER_CV')
        self.assertTrue(ok)

    def test_autre_compte_non_affecte(self):
        user1 = make_candidat("ov3")
        user2 = make_candidat("ov4")
        QuotaIAOverride.objects.create(user=user1, fonction='PARSER_CV', limite_jour=1)
        ok, _ = verifier_quota_ia(user2, 'PARSER_CV')
        self.assertTrue(ok)


class BudgetGlobalTest(QuotaIABase):
    def test_budget_atteint_bloque_tout_le_monde(self):
        config = AIConfig.get_solo()
        config.budget_ia_appels_mois_max = 2
        config.save()
        u1, u2 = make_candidat("bg1"), make_candidat("bg2")
        consommer_quota_ia(u1, 'PARSER_CV')
        consommer_quota_ia(u2, 'SUGGESTIONS_METIER')
        ok, info = verifier_quota_ia(u1, 'PARSER_CV')
        self.assertFalse(ok)
        self.assertEqual(info['code'], 'BUDGET_IA_EPUISE')


class VerrouSimultaneTest(QuotaIABase):
    def test_deuxieme_acquisition_echoue_tant_que_le_premier_verrou_tient(self):
        user = make_candidat("lock1")
        self.assertTrue(acquerir_verrou_ia(user, 'PARSER_CV'))
        self.assertFalse(acquerir_verrou_ia(user, 'PARSER_CV'))
        liberer_verrou_ia(user, 'PARSER_CV')
        self.assertTrue(acquerir_verrou_ia(user, 'PARSER_CV'))

    def test_verrou_independant_par_fonction(self):
        user = make_candidat("lock2")
        self.assertTrue(acquerir_verrou_ia(user, 'PARSER_CV'))
        self.assertTrue(acquerir_verrou_ia(user, 'SUGGESTIONS_METIER'))


class GenererOffreIAQuotaAPITest(APITestCase):
    """Vérifie le gating API-level bout en bout sur un endpoint (génération offre) — les 4
    autres endpoints suivent exactement le même pattern (verifier_quota_ia -> 403), pas
    reproduit test par test pour ne pas dupliquer la même assertion 5 fois."""
    def setUp(self):
        cache.clear()

    def test_sans_abonnement_403_palier_insuffisant(self):
        user, _ = make_entreprise("api_go1")
        self.client.force_authenticate(user=user)
        r = self.client.post(reverse('generer-offre-ia'), {'titre': 'Développeur'})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data.get('code'), 'PALIER_INSUFFISANT')

    def test_quota_jour_atteint_403(self):
        user, entreprise = make_entreprise("api_go2", palier_nom="STARTER")
        palier = entreprise.abonnement.palier
        palier.quota_generation_offre_jour = 1
        palier.save()
        UtilisationIA.objects.create(user=user, fonction='GENERATION_OFFRE')
        self.client.force_authenticate(user=user)
        r = self.client.post(reverse('generer-offre-ia'), {'titre': 'Développeur'})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data.get('code'), 'QUOTA_IA_JOUR_ATTEINT')


class QuotaIAOverrideAdminAPITest(APITestCase):
    def setUp(self):
        cache.clear()
        QuotaIAOverride.objects.all().delete()

    def test_creation_override_par_admin(self):
        admin = make_admin("admin_ov1")
        candidat = make_candidat("cible_ov1")
        self.client.force_authenticate(user=admin)
        r = self.client.post(reverse('admin-quota-ia-overrides'), {
            'user': candidat.id, 'fonction': 'PARSER_CV', 'limite_jour': 1, 'limite_mois': 5,
        })
        self.assertEqual(r.status_code, 201)
        self.assertEqual(QuotaIAOverride.objects.count(), 1)

    def test_refuse_non_admin(self):
        candidat = make_candidat("cible_ov2")
        self.client.force_authenticate(user=candidat)
        r = self.client.get(reverse('admin-quota-ia-overrides'))
        self.assertEqual(r.status_code, 403)

    def test_suppression_override(self):
        admin = make_admin("admin_ov2")
        candidat = make_candidat("cible_ov3")
        override = QuotaIAOverride.objects.create(user=candidat, fonction='PARSER_CV', limite_jour=1)
        self.client.force_authenticate(user=admin)
        r = self.client.delete(reverse('admin-quota-ia-override-detail', args=[override.id]))
        self.assertEqual(r.status_code, 204)
        self.assertEqual(QuotaIAOverride.objects.count(), 0)

    def test_usage_par_email(self):
        admin = make_admin("admin_ov3")
        candidat = make_candidat("cible_ov4")
        consommer_quota_ia(candidat, 'PARSER_CV')
        self.client.force_authenticate(user=admin)
        r = self.client.get(reverse('admin-quota-ia-usage'), {'email': candidat.email})
        self.assertEqual(r.status_code, 200)
        parser_cv = next(u for u in r.data['usage'] if u['fonction'] == 'PARSER_CV')
        self.assertEqual(parser_cv['utilise_jour'], 1)
