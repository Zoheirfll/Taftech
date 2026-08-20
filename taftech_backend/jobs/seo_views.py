"""Vues SEO servies à la racine du domaine (sitemap.xml, robots.txt) — pas sous /api/,
montées directement dans taftech_backend/urls.py. Le proxy Vite (vite.config.js) relaie
ces deux chemins vers Django en dev ; en prod, nginx doit faire de même (voir CLAUDE.md)."""
from django.http import HttpResponse
from django.conf import settings
from django.utils.text import slugify
from django.views import View
from .models import OffreEmploi, ProfilEntreprise, Secteur, Domaine, Article
from .constants import WILAYAS_CHOICES

STATIC_PATHS = [
    ("/", "1.0", "daily"),
    ("/offres", "0.9", "hourly"),
    ("/secteurs", "0.6", "monthly"),
    ("/metiers", "0.6", "monthly"),
    ("/regions", "0.6", "monthly"),
    ("/qui-sommes-nous", "0.5", "monthly"),
    ("/contact", "0.4", "monthly"),
    ("/recruteurs", "0.6", "monthly"),
    ("/blog", "0.6", "weekly"),
]


class SitemapXMLView(View):
    def get(self, request):
        base = settings.SITE_URL.rstrip('/')
        urls = []
        for path, priority, freq in STATIC_PATHS:
            urls.append(f"<url><loc>{base}{path}</loc><changefreq>{freq}</changefreq><priority>{priority}</priority></url>")

        # Précharge le libellé Secteur par code Domaine pour éviter une requête par offre.
        secteur_libelle_par_domaine = {
            d.code: d.secteur.libelle for d in Domaine.objects.select_related('secteur').only('code', 'secteur__libelle')
        }

        offres = OffreEmploi.objects.select_related('entreprise').filter(
            est_active=True, statut_moderation='APPROUVEE', est_cloturee=False
        ).only('id', 'titre', 'specialite', 'code_public', 'date_publication', 'entreprise__slug')
        for o in offres:
            lastmod = f"<lastmod>{o.date_publication.date().isoformat()}</lastmod>" if o.date_publication else ""
            entreprise_slug = o.entreprise.slug
            secteur_libelle = secteur_libelle_par_domaine.get(o.specialite) or "offres-d-emploi"
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

        for s in Secteur.objects.only('code', 'libelle'):
            chemin = f"{s.code.lower()}-{slugify(s.libelle)}"
            urls.append(
                f"<url><loc>{base}/secteurs/{chemin}/</loc>"
                f"<changefreq>weekly</changefreq><priority>0.5</priority></url>"
            )

        for d in Domaine.objects.only('code', 'libelle'):
            chemin = f"{d.code.lower()}-{slugify(d.libelle)}"
            urls.append(
                f"<url><loc>{base}/metiers/{chemin}/</loc>"
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
        lines = [
            "User-agent: *",
            "Allow: /",
            "Disallow: /dashboard",
            "Disallow: /parametres",
            "Disallow: /profil",
            "Disallow: /mes-candidatures",
            "Disallow: /boite-reception",
            "Disallow: /admin-taftech",
            "Disallow: /cvtheque",
            "Disallow: /candidatures-spontanees",
            "Disallow: /questionnaires",
            "Disallow: /creer-offre",
            "Disallow: /recruteurs/connexion",
            "Disallow: /recruteurs/inscription",
            "",
            f"Sitemap: {base}/sitemap.xml",
        ]
        return HttpResponse("\n".join(lines), content_type="text/plain")
