"""
Tests pour le chantier CMS (session 20/08/2026) :
- PremiumPlan / PremiumAvantage (jobs/views/premium_admin.py)
- FaqItem
- CompetenceReferentiel
- Article / ArticleCategorie (jobs/views/articles.py)
- SiteAnnonce / BanniereAccueil (jobs/views/banners.py)
- PageStatique (jobs/views/pages.py)
- AIConfig (jobs/views/ai_config.py)
"""
from django.test import TestCase
from django.urls import reverse
from django.core.cache import cache
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from jobs.models import (
    PremiumPlan, PremiumAvantage, FaqItem, CompetenceReferentiel,
    Article, ArticleCategorie, SiteAnnonce, BanniereAccueil, PageStatique, AIConfig,
)

User = get_user_model()


def make_admin(username="admin_cms", email="admin_cms@test.dz"):
    return User.objects.create_user(
        username=username, email=email, password="pwd", role="ADMIN", is_staff=True
    )


def make_candidat(username="cand_cms", email="cand_cms@test.dz"):
    return User.objects.create_user(
        username=username, email=email, password="pwd", role="CANDIDAT"
    )


class CMSTestBase(APITestCase):
    """Vide le cache avant chaque test — les endpoints publics du CMS mettent en cache leurs
    réponses (LocMemCache, persiste tout le process de test sans ça), une clé partagée entre deux
    tests (ex: 'jobs_faq_GENERAL') ferait fuiter l'état d'un test vers le suivant.

    Plusieurs modèles CMS (PremiumPlan, PremiumAvantage, FaqItem, CompetenceReferentiel, ...) sont
    peuplés par des migrations de données (backfill du contenu qui existait en dur avant ce
    chantier) — la base de test les contient donc déjà. Les sous-classes qui comptent des lignes
    doivent vider la table concernée en premier pour ne tester que leurs propres fixtures."""
    def setUp(self):
        cache.clear()


# ─── PremiumPlan / PremiumAvantage ───────────────────────────────────────────

class PremiumPlanAPITest(CMSTestBase):
    def setUp(self):
        super().setUp()
        PremiumPlan.objects.all().delete()  # vide le contenu seedé par la migration 0062
        self.admin = make_admin()
        self.plan_actif = PremiumPlan.objects.create(nb_mois=1, label="1 mois", prix_da=2000, actif=True)
        self.plan_inactif = PremiumPlan.objects.create(nb_mois=6, label="6 mois", prix_da=11040, actif=False)

    def test_public_liste_seulement_actifs(self):
        response = self.client.get(reverse("premium-plans-public"))
        self.assertEqual(response.status_code, 200)
        ids = [p["id"] for p in response.data]
        self.assertIn(self.plan_actif.id, ids)
        self.assertNotIn(self.plan_inactif.id, ids)

    def test_admin_liste_tout(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("admin-premium-plans"))
        self.assertEqual(len(response.data), 2)

    def test_non_admin_refuse(self):
        candidat = make_candidat()
        self.client.force_authenticate(user=candidat)
        response = self.client.get(reverse("admin-premium-plans"))
        self.assertEqual(response.status_code, 403)

    def test_non_authentifie_refuse(self):
        response = self.client.get(reverse("admin-premium-plans"))
        self.assertIn(response.status_code, (401, 403))

    def test_creation_prix_zero_rejetee(self):
        """Un palier à 0 DA serait un abonnement Premium gratuit — bloqué par le validateur."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("admin-premium-plans"), {
            "nb_mois": 3, "label": "3 mois", "prix_da": 0,
        })
        self.assertEqual(response.status_code, 400)

    def test_creation_nb_mois_duplique_rejetee(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("admin-premium-plans"), {
            "nb_mois": 1, "label": "Doublon", "prix_da": 5000,
        })
        self.assertEqual(response.status_code, 400)

    def test_update_invalide_cache_public(self):
        self.client.get(reverse("premium-plans-public"))  # peuple le cache
        self.client.force_authenticate(user=self.admin)
        self.client.put(reverse("admin-premium-plan-detail", args=[self.plan_actif.id]), {"prix_da": 9999})
        response = self.client.get(reverse("premium-plans-public"))
        prix = next(p["prix_da"] for p in response.data if p["id"] == self.plan_actif.id)
        self.assertEqual(prix, 9999)

    def test_delete_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(reverse("admin-premium-plan-detail", args=[self.plan_actif.id]))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(PremiumPlan.objects.filter(id=self.plan_actif.id).exists())


class PremiumAvantageAPITest(CMSTestBase):
    def setUp(self):
        super().setUp()
        PremiumAvantage.objects.all().delete()  # vide le contenu seedé par la migration 0062
        self.admin = make_admin()
        PremiumAvantage.objects.create(icone="Mail", titre="Coordonnées", description="Email/tel visibles.", actif=True)
        PremiumAvantage.objects.create(icone="Star", titre="Masqué", description="Pas visible.", actif=False)

    def test_public_liste_seulement_actifs(self):
        response = self.client.get(reverse("premium-avantages-public"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["titre"], "Coordonnées")

    def test_icone_hors_whitelist_rejetee(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("admin-premium-avantages"), {
            "icone": "<script>alert(1)</script>", "titre": "X", "description": "Y",
        })
        self.assertEqual(response.status_code, 400)


# ─── FAQ ──────────────────────────────────────────────────────────────────────

class FaqAPITest(CMSTestBase):
    def setUp(self):
        super().setUp()
        FaqItem.objects.all().delete()  # vide le contenu seedé par la migration 0064
        self.admin = make_admin()
        FaqItem.objects.create(categorie="GENERAL", question="Q1 ?", reponse="R1", actif=True)
        FaqItem.objects.create(categorie="PREMIUM", question="Q2 ?", reponse="R2", actif=True)
        FaqItem.objects.create(categorie="GENERAL", question="Q3 masquée ?", reponse="R3", actif=False)

    def test_public_filtre_par_categorie(self):
        response = self.client.get(reverse("faq-public"), {"categorie": "GENERAL"})
        questions = [f["question"] for f in response.data]
        self.assertIn("Q1 ?", questions)
        self.assertNotIn("Q2 ?", questions)
        self.assertNotIn("Q3 masquée ?", questions)

    def test_public_categorie_inconnue_liste_vide(self):
        response = self.client.get(reverse("faq-public"), {"categorie": "INEXISTANTE"})
        self.assertEqual(response.data, [])

    def test_admin_voit_toutes_categories(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("admin-faq"))
        self.assertEqual(len(response.data), 3)

    def test_categorie_invalide_rejetee(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("admin-faq"), {
            "categorie": "PAS_UNE_CATEGORIE", "question": "Q ?", "reponse": "R",
        })
        self.assertEqual(response.status_code, 400)


# ─── Compétences ──────────────────────────────────────────────────────────────

class CompetenceAPITest(CMSTestBase):
    def setUp(self):
        super().setUp()
        CompetenceReferentiel.objects.all().delete()  # vide le contenu seedé par la migration 0066
        self.admin = make_admin()
        CompetenceReferentiel.objects.create(label="Gestion de projet", actif=True)
        CompetenceReferentiel.objects.create(label="Python", actif=True)
        CompetenceReferentiel.objects.create(label="Ancienne compétence", actif=False)

    def test_autocomplete_filtre_par_recherche(self):
        response = self.client.get(reverse("competences-autocomplete"), {"search": "pyth"})
        labels = [c["label"] for c in response.data]
        self.assertEqual(labels, ["Python"])

    def test_autocomplete_exclut_inactives(self):
        response = self.client.get(reverse("competences-autocomplete"), {"search": "ancienne"})
        self.assertEqual(response.data, [])

    def test_autocomplete_limite_15_resultats(self):
        for i in range(20):
            CompetenceReferentiel.objects.create(label=f"Compétence test {i}", actif=True)
        response = self.client.get(reverse("competences-autocomplete"), {"search": "compétence test"})
        self.assertLessEqual(len(response.data), 15)

    def test_label_duplique_rejete(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("admin-competences"), {"label": "Python"})
        self.assertEqual(response.status_code, 400)


# ─── Articles / Blog ────────────────────────────────────────────────────────

class ArticleAPITest(CMSTestBase):
    def setUp(self):
        super().setUp()
        self.admin = make_admin()
        self.categorie = ArticleCategorie.objects.create(label="Conseils carrière")
        self.article_publie = Article.objects.create(
            titre="Comment réussir son entretien", extrait="Extrait.",
            contenu_html="<p>Contenu.</p>", statut="PUBLIE", categorie=self.categorie,
        )
        self.article_brouillon = Article.objects.create(
            titre="Brouillon en cours", extrait="Extrait.",
            contenu_html="<p>Contenu.</p>", statut="BROUILLON",
        )

    def test_slug_auto_genere(self):
        self.assertEqual(self.article_publie.slug, "comment-reussir-son-entretien")

    def test_slug_collision_suffixe(self):
        doublon = Article.objects.create(
            titre="Comment réussir son entretien", extrait="Extrait 2.", contenu_html="<p>X</p>",
        )
        self.assertEqual(doublon.slug, "comment-reussir-son-entretien-1")

    def test_date_publication_auto_au_premier_passage_publie(self):
        self.assertIsNotNone(self.article_publie.date_publication)
        self.assertIsNone(self.article_brouillon.date_publication)

    def test_html_sanitize_script_retire(self):
        article = Article.objects.create(
            titre="Article malveillant", extrait="X",
            contenu_html="<p>Texte</p><script>alert(1)</script>",
        )
        self.assertNotIn("<script>", article.contenu_html)
        self.assertIn("Texte", article.contenu_html)

    def test_public_liste_exclut_brouillons(self):
        response = self.client.get(reverse("articles-public"))
        titres = [a["titre"] for a in response.data["results"]]
        self.assertIn("Comment réussir son entretien", titres)
        self.assertNotIn("Brouillon en cours", titres)

    def test_public_detail_brouillon_404(self):
        response = self.client.get(reverse("article-detail-public", args=[self.article_brouillon.slug]))
        self.assertEqual(response.status_code, 404)

    def test_public_detail_publie_ok(self):
        response = self.client.get(reverse("article-detail-public", args=[self.article_publie.slug]))
        self.assertEqual(response.status_code, 200)
        self.assertIn("contenu_html", response.data)

    def test_public_filtre_categorie(self):
        response = self.client.get(reverse("articles-public"), {"categorie": self.categorie.id})
        self.assertEqual(response.data["count"], 1)

    def test_categories_publiques_exclut_categorie_sans_article_publie(self):
        ArticleCategorie.objects.create(label="Jamais utilisée")
        response = self.client.get(reverse("articles-categories-public"))
        labels = [c["label"] for c in response.data]
        self.assertIn("Conseils carrière", labels)
        self.assertNotIn("Jamais utilisée", labels)

    def test_admin_liste_inclut_brouillons(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("admin-articles"))
        self.assertEqual(len(response.data), 2)

    def test_admin_creation_sanitize(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(reverse("admin-articles"), {
            "titre": "Nouveau", "extrait": "X",
            "contenu_html": "<p>OK</p><img src=x onerror=alert(1)>",
        })
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("onerror", response.data["contenu_html"])


# ─── Bannières ──────────────────────────────────────────────────────────────

class SiteAnnonceAPITest(CMSTestBase):
    def setUp(self):
        super().setUp()
        self.admin = make_admin()

    def test_une_seule_annonce_active_a_la_fois(self):
        a1 = SiteAnnonce.objects.create(texte="Annonce 1", actif=True)
        a2 = SiteAnnonce.objects.create(texte="Annonce 2", actif=True)
        a1.refresh_from_db()
        self.assertFalse(a1.actif)
        self.assertTrue(a2.actif)

    def test_public_aucune_active_204(self):
        response = self.client.get(reverse("site-annonce-public"))
        self.assertEqual(response.status_code, 204)

    def test_public_retourne_annonce_active(self):
        SiteAnnonce.objects.create(texte="Promo Premium", actif=True)
        response = self.client.get(reverse("site-annonce-public"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["texte"], "Promo Premium")


class BanniereAccueilAPITest(CMSTestBase):
    def setUp(self):
        super().setUp()
        self.admin = make_admin()
        BanniereAccueil.objects.create(image="bannieres_accueil/test.jpg", titre="Active", actif=True)
        BanniereAccueil.objects.create(image="bannieres_accueil/test2.jpg", titre="Inactive", actif=False)

    def test_public_liste_seulement_actives(self):
        response = self.client.get(reverse("bannieres-accueil-public"))
        titres = [b["titre"] for b in response.data]
        self.assertEqual(titres, ["Active"])

    def test_admin_liste_tout(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("admin-bannieres-accueil"))
        self.assertEqual(len(response.data), 2)


# ─── Pages statiques ──────────────────────────────────────────────────────────

class PageStatiqueAPITest(CMSTestBase):
    def setUp(self):
        super().setUp()
        PageStatique.objects.all().delete()  # vide le contenu seedé par la migration 0070 (cgu/confidentialite/qui-sommes-nous)
        self.admin = make_admin()
        self.page = PageStatique.objects.create(slug="cgu", titre="CGU", contenu_html="<p>Texte.</p>")

    def test_public_recupere_par_slug(self):
        response = self.client.get(reverse("page-statique-public", args=["cgu"]))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["titre"], "CGU")

    def test_public_slug_inconnu_404(self):
        response = self.client.get(reverse("page-statique-public", args=["inexistante"]))
        self.assertEqual(response.status_code, 404)

    def test_html_sanitize(self):
        page = PageStatique.objects.create(
            slug="test-page", titre="Test", contenu_html="<p>OK</p><script>alert(1)</script>",
        )
        self.assertNotIn("<script>", page.contenu_html)

    def test_admin_update_change_slug_invalide_les_deux_caches(self):
        self.client.get(reverse("page-statique-public", args=["cgu"]))  # peuple le cache
        self.client.force_authenticate(user=self.admin)
        self.client.put(reverse("admin-page-detail", args=[self.page.id]), {"slug": "cgu-v2"})
        response = self.client.get(reverse("page-statique-public", args=["cgu-v2"]))
        self.assertEqual(response.status_code, 200)

    def test_non_admin_refuse_ecriture(self):
        candidat = make_candidat()
        self.client.force_authenticate(user=candidat)
        response = self.client.post(reverse("admin-pages"), {
            "slug": "nouvelle", "titre": "X", "contenu_html": "<p>Y</p>",
        })
        self.assertEqual(response.status_code, 403)


# ─── Configuration IA ──────────────────────────────────────────────────────────

class AIConfigAPITest(CMSTestBase):
    def setUp(self):
        super().setUp()
        self.admin = make_admin()

    def test_get_solo_cree_singleton(self):
        self.assertEqual(AIConfig.objects.count(), 0)
        config = AIConfig.get_solo()
        self.assertEqual(config.pk, 1)
        self.assertEqual(AIConfig.objects.count(), 1)

    def test_get_solo_idempotent(self):
        c1 = AIConfig.get_solo()
        c2 = AIConfig.get_solo()
        self.assertEqual(c1.pk, c2.pk)
        self.assertEqual(AIConfig.objects.count(), 1)

    def test_save_force_pk_1(self):
        """Toute instance sauvegardée écrase la ligne 1 — garantit qu'il n'existe jamais 2 lignes."""
        config = AIConfig(groq_model="autre-modele")
        config.save()
        self.assertEqual(config.pk, 1)
        self.assertEqual(AIConfig.objects.count(), 1)

    def test_admin_get(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("admin-ai-config"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("groq_model", response.data)

    def test_admin_get_ne_fuite_pas_la_cle_api(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("admin-ai-config"))
        self.assertNotIn("GROQ_API_KEY", str(response.data))
        self.assertNotIn("api_key", response.data)

    def test_admin_put_modifie_config(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(reverse("admin-ai-config"), {"parser_cv_actif": False})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(AIConfig.get_solo().parser_cv_actif)

    def test_temperature_hors_bornes_rejetee(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(reverse("admin-ai-config"), {"temperature": 5.0})
        self.assertEqual(response.status_code, 400)

    def test_max_tokens_trop_bas_rejete(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(reverse("admin-ai-config"), {"parser_cv_max_tokens": 10})
        self.assertEqual(response.status_code, 400)

    def test_non_admin_refuse(self):
        candidat = make_candidat()
        self.client.force_authenticate(user=candidat)
        response = self.client.get(reverse("admin-ai-config"))
        self.assertEqual(response.status_code, 403)

    def test_reasoning_effort_invalide_rejete(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.put(reverse("admin-ai-config"), {"reasoning_effort": "extreme"})
        self.assertEqual(response.status_code, 400)


# ─── Kill-switch : fonctionnalités IA désactivées ────────────────────────────

class AIKillSwitchTest(APITestCase):
    """Vérifie que couper un toggle AIConfig bloque bien l'endpoint correspondant (503), sans
    dépendre d'un vrai appel Groq — le kill-switch doit agir avant tout appel réseau."""
    def setUp(self):
        cache.clear()
        AIConfig.get_solo()  # crée la ligne singleton

    def test_analyse_carriere_desactivee(self):
        config = AIConfig.get_solo()
        config.analyse_carriere_actif = False
        config.save()

        candidat = make_candidat("cand_kill", "cand_kill@test.dz")
        from jobs.models import ProfilCandidat
        ProfilCandidat.objects.create(user=candidat)
        self.client.force_authenticate(user=candidat)
        response = self.client.get(reverse("analyse-carriere"))
        self.assertEqual(response.status_code, 503)

    def test_parser_cv_desactive(self):
        config = AIConfig.get_solo()
        config.parser_cv_actif = False
        config.save()

        candidat = make_candidat("cand_kill2", "cand_kill2@test.dz")
        self.client.force_authenticate(user=candidat)
        response = self.client.post(reverse("parser-cv"), {})
        self.assertEqual(response.status_code, 503)
