"""Commande d'ajout de la section « Analyse par IA » à la page Confidentialité."""
from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from jobs.management.commands.ajouter_paragraphe_ia_confidentialite import MARQUEUR, SECTION
from jobs.models import AuditLog, PageStatique

PAGE = (
    "<p>Introduction.</p>\n<h2>5. Durée de conservation des données</h2>\n<p>5 ans.</p>\n"
    "<h2>6. Vos droits</h2>\n<p>Droit d'accès.</p>"
)


def lancer(*args):
    sortie = StringIO()
    call_command("ajouter_paragraphe_ia_confidentialite", *args, stdout=sortie)
    return sortie.getvalue()


class ParagrapheIAConfidentialiteTest(TestCase):
    def setUp(self):
        PageStatique.objects.filter(slug="confidentialite").delete()
        self.page = PageStatique.objects.create(slug="confidentialite", titre="Politique", contenu_html=PAGE)

    def test_section_inseree_avant_vos_droits_et_renumerotee(self):
        lancer()
        self.page.refresh_from_db()
        html = self.page.contenu_html
        self.assertIn("6. Analyse par intelligence artificielle", html)
        self.assertIn("7. Vos droits", html)
        self.assertNotIn("6. Vos droits", html)
        self.assertLess(html.index("6. Analyse par intelligence artificielle"), html.index("7. Vos droits"))
        self.assertIn("5 ans.", html)  # le reste de la page est intact

    def test_idempotent(self):
        lancer()
        apres_premiere = PageStatique.objects.get(slug="confidentialite").contenu_html
        sortie = lancer()
        self.assertIn("déjà présente et à jour", sortie)
        self.assertEqual(PageStatique.objects.get(slug="confidentialite").contenu_html, apres_premiere)
        self.assertEqual(apres_premiere.count(MARQUEUR), 1)

    def test_ancienne_version_de_la_section_est_remplacee_sans_toucher_au_reste(self):
        ancienne = (
            "<h2>6. Analyse par intelligence artificielle (facultative)</h2>\n<p>Ancien texte.</p>\n"
        )
        PageStatique.objects.filter(pk=self.page.pk).update(
            contenu_html=PAGE.replace("<h2>6. Vos droits</h2>", ancienne + "<h2>7. Vos droits</h2>")
        )
        lancer()
        self.page.refresh_from_db()
        html = self.page.contenu_html
        self.assertNotIn("Ancien texte.", html)
        self.assertIn("recruteur auquel vous candidatez", html)
        self.assertEqual(html.count("Analyse par intelligence artificielle"), 1)
        self.assertEqual(html.count("7. Vos droits"), 1)
        self.assertIn("5 ans.", html)

    def test_texte_mentionne_l_analyse_lancee_par_un_recruteur(self):
        self.assertIn("recruteur", SECTION)
        self.assertIn("votre nom n'est alors jamais transmis", SECTION)

    def test_dry_run_ne_modifie_rien(self):
        sortie = lancer("--dry-run")
        self.assertIn("Dry-run", sortie)
        self.page.refresh_from_db()
        self.assertEqual(self.page.contenu_html, PAGE)

    def test_titre_modifie_a_la_main_section_ajoutee_en_fin_de_page(self):
        PageStatique.objects.filter(pk=self.page.pk).update(contenu_html="<p>Texte libre.</p>")
        lancer()
        self.page.refresh_from_db()
        self.assertTrue(self.page.contenu_html.startswith("<p>Texte libre.</p>"))
        self.assertIn(MARQUEUR, self.page.contenu_html)

    def test_page_absente_erreur_claire(self):
        self.page.delete()
        with self.assertRaises(CommandError):
            lancer()

    def test_trace_d_audit_creee(self):
        lancer()
        self.assertTrue(AuditLog.objects.filter(detail__contains="Analyse par intelligence artificielle").exists())

    def test_texte_sans_promesse_excessive(self):
        """Pas de « anonyme » (pseudonymisation ≠ anonymisation) ni d'autorisation ANPDP affirmée."""
        minuscule = SECTION.lower()
        self.assertNotIn("anonym", minuscule)
        self.assertNotIn("anpdp", minuscule)
        self.assertNotIn("autoris", minuscule)

    def test_la_section_survit_a_la_sanitization_html_de_la_page(self):
        lancer()
        self.page.refresh_from_db()
        self.assertIn("<h2>6. Analyse par intelligence artificielle (facultative)</h2>", self.page.contenu_html)
        self.assertIn("Groq", self.page.contenu_html)
