"""Vues SEO servies à la racine du domaine (sitemap.xml, robots.txt) — pas sous /api/,
montées directement dans taftech_backend/urls.py. Le proxy Vite (vite.config.js) relaie
ces deux chemins vers Django en dev ; en prod, nginx doit faire de même (voir CLAUDE.md)."""
from pathlib import Path

from django.db.models import Q
from django.http import HttpResponse
from django.conf import settings
from django.utils import timezone
from django.utils.text import slugify
from django.views import View
from .models import OffreEmploi, ProfilEntreprise, GroupeMetier, Metier, Article
from .constants import WILAYAS_CHOICES

STATIC_PATHS = [
    ("/", "1.0", "daily"),
    ("/offres", "0.9", "hourly"),
    ("/secteurs", "0.6", "monthly"),
    ("/regions", "0.6", "monthly"),
    ("/qui-sommes-nous", "0.5", "monthly"),
    ("/contact", "0.4", "monthly"),
    ("/recruteurs", "0.6", "monthly"),
    ("/blog", "0.6", "weekly"),
    ("/entreprises", "0.6", "weekly"),
    ("/mentions-legales", "0.3", "yearly"),
    ("/cgu", "0.3", "yearly"),
    ("/confidentialite", "0.3", "yearly"),
]

# Pages réservées aux comptes connectés ou aux écrans d'authentification : inutiles dans un
# moteur de recherche. Chaque préfixe correspond à une route protégée de App.jsx (RecruteurRoute,
# CandidatRoute, GuestRoute). `/offres`, `/recruteurs` (landing) et `/jobs/<offre>` (ancienne URL
# d'offre, qui doit rester explorable pour que son canonical soit pris en compte) restent ouverts.
PREFIXES_INTERDITS = [
    "/dashboard", "/parametres", "/profil", "/mes-candidatures", "/boite-reception",
    "/admin-taftech", "/cvtheque", "/candidatures-spontanees", "/questionnaires", "/creer-offre",
    "/recruteurs/connexion", "/recruteurs/inscription", "/recruteurs/mot-de-passe-oublie",
    "/recruteurs/abonnements", "/recruteurs/premium",
    "/login", "/register", "/forgot-password", "/reset-password", "/onboarding", "/invitation",
    "/inbox", "/alertes", "/notifications", "/mes-competences", "/mes-documents",
    "/offres-sauvegardees", "/suggestions-carriere", "/rendez-vous", "/comprendre-mes-scores",
    "/mon-equipe", "/offres-emploi", "/candidatures", "/recrutements", "/candidats-recommandes",
    "/statistiques", "/comment-fonctionne-matching", "/comment-fonctionnent-credits",
    "/evaluations", "/activite", "/entretiens", "/facturation",
    "/jobs/*/postuler", "/merci",
]


def offres_indexables():
    """Offres que Google peut indexer : actives, approuvées, non clôturées et non expirées. Même
    règle que le noindex de la page d'offre (`seo_pages._offre_indexable`) : le sitemap ne doit
    jamais annoncer une page qui demande à ne pas être indexée."""
    aujourdhui = timezone.localdate()
    return OffreEmploi.objects.filter(
        est_active=True, statut_moderation='APPROUVEE', est_cloturee=False,
    ).filter(Q(date_expiration__isnull=True) | Q(date_expiration__gte=aujourdhui))


def stats_job_posting():
    """Couverture des données structurées JobPosting (Google Emploi) pour la page admin SEO."""
    aujourdhui = timezone.localdate()
    approuvees = OffreEmploi.objects.filter(statut_moderation='APPROUVEE')
    eligibles = offres_indexables()
    return {
        "eligibles": eligibles.count(),
        "sans_date_fin": eligibles.filter(date_expiration__isnull=True).count(),
        "exclues_cloturees": approuvees.filter(est_cloturee=True).count(),
        "exclues_expirees": approuvees.filter(est_cloturee=False, date_expiration__lt=aujourdhui).count(),
        "exclues_inactives": approuvees.filter(est_cloturee=False, est_active=False).exclude(
            date_expiration__lt=aujourdhui).count(),
    }


def alertes_configuration():
    """Réglages qui rendraient le SEO faux en production (sitemap, canonical et JobPosting
    fabriqués depuis `SITE_URL`)."""
    base = settings.SITE_URL.rstrip('/')
    if any(hote in base for hote in ('localhost', '127.0.0.1', '0.0.0.0')):
        return [{
            "code": "SITE_URL_LOCAL",
            "message": "SITE_URL pointe vers une adresse locale : le sitemap, les canonicals et les "
                       "données JobPosting publieraient de fausses adresses. Définissez SITE_URL avec le "
                       "vrai domaine (https://…) avant la mise en ligne.",
        }]
    if not base.startswith('https://'):
        return [{
            "code": "SITE_URL_HTTP",
            "message": "SITE_URL n'est pas en https : Google préfère les adresses sécurisées.",
        }]
    return []


def rendu_serveur_pret():
    """Le rendu serveur des balises (aperçus de partage, vrais 404) lit `index.html` du build."""
    return Path(settings.FRONTEND_INDEX_PATH).is_file()


class SitemapXMLView(View):
    def get(self, request):
        base = settings.SITE_URL.rstrip('/')
        urls = []
        for path, priority, freq in STATIC_PATHS:
            urls.append(f"<url><loc>{base}{path}</loc><changefreq>{freq}</changefreq><priority>{priority}</priority></url>")

        # Précharge le libellé du secteur (groupe racine) par Metier pour éviter une requête
        # par offre — la hiérarchie GroupeMetier est secteur_source (racine) > domaine_source
        # (Metier.groupe_principal) > Metier.
        secteur_libelle_par_metier = {}
        for m in Metier.objects.select_related('groupe_principal', 'groupe_principal__parent').only(
            'id', 'groupe_principal__libelle', 'groupe_principal__parent__libelle'
        ):
            groupe = m.groupe_principal
            racine = groupe.parent if groupe and groupe.parent else groupe
            secteur_libelle_par_metier[m.id] = racine.libelle if racine else None

        offres = offres_indexables().select_related('entreprise').only(
            'id', 'titre', 'metier_id', 'code_public', 'date_publication', 'entreprise__slug'
        )
        for o in offres:
            lastmod = f"<lastmod>{o.date_publication.date().isoformat()}</lastmod>" if o.date_publication else ""
            entreprise_slug = o.entreprise.slug
            secteur_libelle = secteur_libelle_par_metier.get(o.metier_id) or "offres-d-emploi"
            secteur_slug = slugify(secteur_libelle)
            titre_slug = slugify(o.titre)
            chemin = f"{titre_slug}-{o.code_public}" if titre_slug else o.code_public
            urls.append(
                f"<url><loc>{base}/entreprises/{entreprise_slug}/offres-d-emploi/{secteur_slug}/{chemin}/</loc>{lastmod}"
                f"<changefreq>weekly</changefreq><priority>0.8</priority></url>"
            )

        entreprises = ProfilEntreprise.objects.filter(est_approuvee=True).only('slug')
        for e in entreprises:
            urls.append(
                f"<url><loc>{base}/entreprise/{e.slug}/</loc>"
                f"<changefreq>weekly</changefreq><priority>0.6</priority></url>"
            )

        # Route /secteurs/:slug parse l'id GroupeMetier en préfixe (pas le code — vide ou
        # composé de plusieurs tirets pour les secteurs ajoutés par TAFTECH, voir secteurUrl).
        for s in GroupeMetier.objects.filter(type_groupe='secteur_source').only('id', 'libelle'):
            chemin = f"{s.id}-{slugify(s.libelle)}"
            urls.append(
                f"<url><loc>{base}/secteurs/{chemin}/</loc>"
                f"<changefreq>weekly</changefreq><priority>0.5</priority></url>"
            )

        for value, _label in WILAYAS_CHOICES:
            code, _sep, nom = value.partition(' - ')
            chemin = f"{code}-{slugify(nom)}"
            urls.append(
                f"<url><loc>{base}/regions/{chemin}/</loc>"
                f"<changefreq>weekly</changefreq><priority>0.5</priority></url>"
            )

        articles = Article.objects.filter(statut='PUBLIE').only('slug', 'date_modification')
        for a in articles:
            lastmod = f"<lastmod>{a.date_modification.date().isoformat()}</lastmod>" if a.date_modification else ""
            urls.append(
                f"<url><loc>{base}/blog/{a.slug}/</loc>{lastmod}"
                f"<changefreq>monthly</changefreq><priority>0.5</priority></url>"
            )

        xml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
            + "".join(urls) +
            '</urlset>'
        )
        return HttpResponse(xml, content_type="application/xml")


class RobotsTxtView(View):
    def get(self, request):
        base = settings.SITE_URL.rstrip('/')
        lines = ["User-agent: *", "Allow: /"]
        lines += [f"Disallow: {prefixe}" for prefixe in PREFIXES_INTERDITS]
        lines += ["", f"Sitemap: {base}/sitemap.xml"]
        return HttpResponse("\n".join(lines), content_type="text/plain")
