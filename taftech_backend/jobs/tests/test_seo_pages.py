# test_seo_pages.py — rendu serveur des balises SEO, JobPosting, 404/301, sitemap et robots.txt
import datetime
import json
import re
import shutil
import tempfile
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from jobs.models import Article, OffreEmploi, ProfilEntreprise
from jobs.seo_pages import chemin_canonique_offre, construire_job_posting

User = get_user_model()

INDEX_HTML = """<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content="Description par défaut." />
    <meta property="og:title" content="TafTech — défaut" />
    <meta property="og:description" content="Description par défaut." />
    <meta property="og:image" content="/taftech-logo.png" />
    <title>TAFTECH — Recrutement en ligne en Algérie</title>
  </head>
  <body><div id="root"></div></body>
</html>
"""


@override_settings(SITE_URL='https://taftech.test')
class PagesSeoTests(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._dossier = tempfile.mkdtemp()
        cls._index = Path(cls._dossier) / 'index.html'
        cls._index.write_text(INDEX_HTML, encoding='utf-8')
        cls._reglage = override_settings(FRONTEND_INDEX_PATH=str(cls._index))
        cls._reglage.enable()

    @classmethod
    def tearDownClass(cls):
        cls._reglage.disable()
        shutil.rmtree(cls._dossier, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.user = User.objects.create_user(
            username='rec', email='rec@test.dz', password='Pass1234!', role='RECRUTEUR')
        self.entreprise = ProfilEntreprise.objects.create(
            user=self.user, nom_entreprise='TechCorp', secteur_activite='IT',
            registre_commerce='RC1', wilaya_siege='31 - Oran', est_approuvee=True,
            description='<p>Nous construisons des logiciels.</p>')
        self.offre = self._offre('Développeur Python')

    def _offre(self, titre, **champs):
        valeurs = dict(
            entreprise=self.entreprise, titre=titre, wilaya='31 - Oran', commune='Es Senia',
            type_contrat='CDI', experience_requise='DEBUTANT', statut_moderation='APPROUVEE',
            description="Rejoignez l'équipe.\nStack Django.", missions='Développer des API.',
            profil_recherche='Bac+5.', nombre_postes=2)
        valeurs.update(champs)
        return OffreEmploi.objects.create(**valeurs)

    def _json_ld(self, page):
        brut = re.search(r'<script type="application/ld\+json" id="seo-jsonld">(.*?)</script>', page, re.S)
        self.assertIsNotNone(brut, "JSON-LD absent")
        return json.loads(brut.group(1))

    # --- Offre ---
    def test_offre_200_avec_balises_canonical_et_jobposting(self):
        chemin = chemin_canonique_offre(self.offre)
        rep = self.client.get(chemin)
        self.assertEqual(rep.status_code, 200)
        page = rep.content.decode()
        self.assertIn('<title>Développeur Python — TechCorp | TafTech</title>', page)
        self.assertIn(f'<link rel="canonical" href="https://taftech.test{chemin}" />', page)
        self.assertIn(f'<meta property="og:url" content="https://taftech.test{chemin}" />', page)
        self.assertIn('<div id="root">', page)
        self.assertNotIn('Description par défaut', page)
        donnees = self._json_ld(page)
        self.assertEqual(donnees['@type'], 'JobPosting')
        self.assertEqual(donnees['title'], 'Développeur Python')
        self.assertEqual(donnees['datePosted'], self.offre.date_publication.date().isoformat())
        self.assertEqual(donnees['employmentType'], 'FULL_TIME')
        self.assertEqual(donnees['hiringOrganization']['name'], 'TechCorp')
        self.assertEqual(donnees['jobLocation']['address']['addressCountry'], 'DZ')
        self.assertEqual(donnees['jobLocation']['address']['addressLocality'], 'Es Senia')
        self.assertEqual(donnees['jobLocation']['address']['addressRegion'], 'Oran')
        self.assertEqual(donnees['totalJobOpenings'], 2)
        self.assertIn('Développer des API.', donnees['description'])
        self.assertNotIn('baseSalary', donnees)

    def test_valid_through_present_si_date_d_expiration(self):
        dans_10_jours = timezone.localdate() + datetime.timedelta(days=10)
        offre = self._offre('Avec date', date_expiration=dans_10_jours)
        self.assertEqual(construire_job_posting(offre)['validThrough'], dans_10_jours.isoformat())
        self.assertNotIn('validThrough', construire_job_posting(self.offre))

    def test_types_de_contrat_traduits_pour_google(self):
        attendu = {'CDD': 'TEMPORARY', 'FREELANCE': 'CONTRACTOR', 'STAGE': 'INTERN', 'INTERIM': 'TEMPORARY'}
        for contrat, valeur in attendu.items():
            offre = self._offre(f'Poste {contrat}', type_contrat=contrat)
            self.assertEqual(construire_job_posting(offre)['employmentType'], valeur)

    def test_url_canonique_identique_au_sitemap(self):
        sitemap = self.client.get('/sitemap.xml').content.decode()
        self.assertIn(f'https://taftech.test{chemin_canonique_offre(self.offre)}', sitemap)

    def test_url_non_canonique_redirige_en_301(self):
        chemin = chemin_canonique_offre(self.offre)
        variantes = {
            'sans slash final': chemin.rstrip('/'),
            'ancien slug entreprise': chemin.replace('/techcorp/', '/ancien-slug/'),
            'autre secteur': re.sub(r'/offres-d-emploi/[^/]+/', '/offres-d-emploi/autre-secteur/', chemin),
        }
        for nom, url in variantes.items():
            with self.subTest(variante=nom):
                rep = self.client.get(url)
                self.assertEqual(rep.status_code, 301)
                self.assertEqual(rep['Location'], chemin)

    def test_offre_inconnue_ou_non_approuvee_renvoie_404_noindex(self):
        en_attente = self._offre('Pas validée', statut_moderation='EN_ATTENTE')
        urls = [
            '/entreprises/techcorp/offres-d-emploi/x/inexistant-zzzzzz/',
            f'/entreprises/techcorp/offres-d-emploi/x/pas-validee-{en_attente.code_public}/',
        ]
        for url in urls:
            with self.subTest(url=url):
                rep = self.client.get(url)
                self.assertEqual(rep.status_code, 404)
                page = rep.content.decode()
                self.assertIn('noindex, nofollow', page)
                self.assertIn('Page introuvable', page)
                self.assertNotIn('application/ld+json', page)

    def test_offre_cloturee_ou_expiree_200_noindex_sans_jobposting(self):
        cloturee = self._offre('Clôturée', est_cloturee=True)
        expiree = self._offre('Expirée', date_expiration=timezone.localdate() - datetime.timedelta(days=3))
        for offre in (cloturee, expiree):
            with self.subTest(titre=offre.titre):
                rep = self.client.get(chemin_canonique_offre(offre))
                self.assertEqual(rep.status_code, 200)
                page = rep.content.decode()
                self.assertIn('noindex, nofollow', page)
                self.assertNotIn('application/ld+json', page)
                self.assertNotIn('rel="canonical"', page)

    def test_contenu_hostile_est_echappe_partout(self):
        entreprise = ProfilEntreprise.objects.create(
            user=User.objects.create_user(username='r2', email='r2@test.dz', password='Pass1234!', role='RECRUTEUR'),
            nom_entreprise='Evil" onload="alert(1)', secteur_activite='IT', registre_commerce='RC2',
            wilaya_siege='16 - Alger', est_approuvee=True)
        offre = self._offre('</script><script>alert(1)</script>', entreprise=entreprise,
                            description='"><img src=x onerror=alert(1)>', missions='</script><b>x</b>')
        page = self.client.get(chemin_canonique_offre(offre)).content.decode()
        for danger in ('</script><script>alert(1)', '"><img src=x', 'onload="alert(1)'):
            self.assertNotIn(danger, page)
        self.assertEqual(page.count('<script'), 1)
        self.assertEqual(self._json_ld(page)['title'], '</script><script>alert(1)</script>')

    # --- Ancienne URL ---
    def test_ancienne_url_jobs_redirige_vers_l_url_canonique(self):
        rep = self.client.get(f'/jobs/{self.offre.pk}-developpeur-python')
        self.assertEqual(rep.status_code, 301)
        self.assertEqual(rep['Location'], chemin_canonique_offre(self.offre))
        self.assertEqual(self.client.get('/jobs/999999-nimporte').status_code, 404)
        self.assertEqual(self.client.get('/jobs/abc').status_code, 404)

    # --- Entreprise et article ---
    def test_entreprise_200_404_et_redirection(self):
        rep = self.client.get('/entreprise/techcorp/')
        self.assertEqual(rep.status_code, 200)
        page = rep.content.decode()
        self.assertIn('<title>TechCorp | TafTech</title>', page)
        self.assertIn('Nous construisons des logiciels.', page)
        self.assertIn('<link rel="canonical" href="https://taftech.test/entreprise/techcorp/" />', page)
        self.assertEqual(self.client.get('/entreprise/techcorp').status_code, 301)
        self.assertEqual(self.client.get('/entreprise/inconnue/').status_code, 404)
        ProfilEntreprise.objects.filter(pk=self.entreprise.pk).update(est_approuvee=False)
        self.assertEqual(self.client.get('/entreprise/techcorp/').status_code, 404)

    def test_article_publie_200_brouillon_404(self):
        publie = Article.objects.create(titre='Conseils CV', extrait='Mieux rédiger son CV.',
                                        contenu_html='<p>Contenu</p>', statut='PUBLIE')
        brouillon = Article.objects.create(titre='Brouillon', extrait='x', contenu_html='<p>x</p>', statut='BROUILLON')
        rep = self.client.get(f'/blog/{publie.slug}/')
        self.assertEqual(rep.status_code, 200)
        self.assertIn('Mieux rédiger son CV.', rep.content.decode())
        self.assertEqual(self.client.get(f'/blog/{brouillon.slug}/').status_code, 404)
        self.assertEqual(self.client.get('/blog/inconnu/').status_code, 404)

    def test_index_html_absent_renvoie_503(self):
        with override_settings(FRONTEND_INDEX_PATH=str(Path(self._dossier) / 'absent.html')):
            self.assertEqual(self.client.get('/entreprise/techcorp/').status_code, 503)


class RobotsEtSitemapTests(TestCase):
    def test_robots_bloque_les_espaces_prives_mais_pas_le_public(self):
        lignes = self.client.get('/robots.txt').content.decode().splitlines()
        interdits = {ligne.split(': ', 1)[1] for ligne in lignes if ligne.startswith('Disallow: ')}
        for prive in ('/login', '/register', '/forgot-password', '/mes-documents', '/notifications',
                      '/facturation', '/offres-emploi', '/statistiques', '/jobs/*/postuler', '/admin-taftech',
                      '/merci'):
            self.assertIn(prive, interdits)
        for public in ('/', '/offres', '/recruteurs', '/jobs', '/entreprises', '/blog', '/contact'):
            self.assertNotIn(public, interdits)
        self.assertTrue(any(ligne.startswith('Sitemap: ') for ligne in lignes))

    def test_sitemap_contient_la_liste_des_entreprises_et_les_pages_legales(self):
        xml = self.client.get('/sitemap.xml').content.decode()
        for chemin in ('/entreprises</loc>', '/mentions-legales</loc>', '/cgu</loc>', '/confidentialite</loc>'):
            self.assertIn(chemin, xml)


@override_settings(SITE_URL='https://taftech.test')
class SitemapOffresExpireesEtStatsSeoTests(TestCase):
    """Le sitemap n'annonce que des offres indexables ; la page admin SEO compte comme lui."""
    URL_STATS = '/api/jobs/admin/seo/'

    def setUp(self):
        self.api = APIClient()
        self.admin = User.objects.create_user(
            username='adm', email='adm@test.dz', password='Pass1234!', role='ADMIN', is_staff=True)
        self.entreprise = ProfilEntreprise.objects.create(
            user=User.objects.create_user(username='rec', email='rec@test.dz', password='Pass1234!', role='RECRUTEUR'),
            nom_entreprise='TechCorp', secteur_activite='IT', registre_commerce='RC1',
            wilaya_siege='31 - Oran', est_approuvee=True)
        hier = timezone.localdate() - datetime.timedelta(days=1)
        demain = timezone.localdate() + datetime.timedelta(days=1)
        self.sans_date = self._offre('Sans date')
        self.valide = self._offre('Valide', date_expiration=demain)
        self.expiree = self._offre('Expirée', date_expiration=hier)
        self.cloturee = self._offre('Clôturée', est_cloturee=True)
        self.inactive = self._offre('Inactive', est_active=False)
        self._offre('En attente', statut_moderation='EN_ATTENTE')

    def _offre(self, titre, **champs):
        valeurs = dict(entreprise=self.entreprise, titre=titre, wilaya='31 - Oran', type_contrat='CDI',
                       experience_requise='DEBUTANT', statut_moderation='APPROUVEE')
        valeurs.update(champs)
        return OffreEmploi.objects.create(**valeurs)

    def _stats(self):
        self.api.force_authenticate(user=self.admin)
        return self.api.get(self.URL_STATS).data

    def test_sitemap_exclut_expirees_cloturees_inactives_et_en_attente(self):
        xml = self.client.get('/sitemap.xml').content.decode()
        for offre in (self.sans_date, self.valide):
            self.assertIn(chemin_canonique_offre(offre), xml)
        for offre in (self.expiree, self.cloturee, self.inactive):
            self.assertNotIn(chemin_canonique_offre(offre), xml)

    def test_total_de_la_page_seo_egal_au_nombre_d_urls_du_sitemap(self):
        nb_urls = len(re.findall(r'<loc>', self.client.get('/sitemap.xml').content.decode()))
        stats = self._stats()
        self.assertEqual(stats['total_urls_sitemap'], nb_urls)
        offre = next(p for p in stats['pages'] if p['type'] == "Offre d'emploi")
        self.assertEqual(offre['nb_pages_indexables'], 2)
        self.assertGreater(stats['pages_statiques'], 8)

    def test_couverture_job_posting(self):
        job = self._stats()['job_posting']
        self.assertEqual(job, {'eligibles': 2, 'sans_date_fin': 1, 'exclues_cloturees': 1,
                               'exclues_expirees': 1, 'exclues_inactives': 1})

    def test_alertes_de_configuration_site_url(self):
        self.assertEqual(self._stats()['alertes'], [])
        with override_settings(SITE_URL='http://localhost:5173'):
            self.assertEqual([a['code'] for a in self._stats()['alertes']], ['SITE_URL_LOCAL'])
        with override_settings(SITE_URL='http://taftech.dz'):
            self.assertEqual([a['code'] for a in self._stats()['alertes']], ['SITE_URL_HTTP'])

    def test_etat_du_rendu_serveur(self):
        dossier = tempfile.mkdtemp()
        try:
            index = Path(dossier) / 'index.html'
            index.write_text('<html></html>', encoding='utf-8')
            with override_settings(FRONTEND_INDEX_PATH=str(index)):
                self.assertTrue(self._stats()['rendu_serveur_pret'])
            with override_settings(FRONTEND_INDEX_PATH=str(Path(dossier) / 'absent.html')):
                self.assertFalse(self._stats()['rendu_serveur_pret'])
        finally:
            shutil.rmtree(dossier, ignore_errors=True)

    def test_reserve_aux_admins(self):
        candidat = User.objects.create_user(username='c', email='c@test.dz', password='Pass1234!', role='CANDIDAT')
        self.api.force_authenticate(user=candidat)
        self.assertEqual(self.api.get(self.URL_STATS).status_code, 403)
