"""Rendu serveur des balises <head> pour les robots (Google, aperçus Facebook/WhatsApp).

Le site est une SPA : sans JavaScript, `index.html` porte les mêmes balises pour toutes les pages,
et une URL inconnue répond 200. Ces vues servent le `index.html` construit (le frontend prend
ensuite le relais, comme d'habitude) en y injectant, pour les pages à fort enjeu SEO :
  - offre d'emploi : titre, description, aperçu de partage, canonical, données JobPosting ;
  - entreprise et article de blog : titre, description, aperçu, canonical ;
et renvoient un vrai 404 (avec noindex) quand l'objet n'existe pas ou n'est pas public, et un 301
vers l'URL canonique quand l'URL demandée n'est pas la bonne (ancienne route `/jobs/<id>`, slug
obsolète, slash final manquant).

Ces routes ne s'activent en production que si nginx les relaie vers Django (voir
docs/exploitation/deploiement.md) ; en développement Vite sert `index.html` lui-même et ce module
n'intervient pas. Tout ce qui vient de la base est échappé (attributs HTML et JSON-LD).
"""
import html
import json
import re
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse, HttpResponsePermanentRedirect
from django.utils import timezone
from django.utils.text import slugify
from django.views import View

from .models import Article, OffreEmploi, ProfilEntreprise
from .serializers.offres import _secteur_libelle_pour_offre

SITE_NAME = "TafTech"
DESCRIPTION_MAX = 300
ID_JSONLD = "seo-jsonld"  # même id que le composant Seo.jsx : le client remplace, jamais ne duplique

# Valeurs autorisées par Google pour `employmentType`.
TYPES_EMPLOI = {
    'CDI': 'FULL_TIME', 'CDD': 'TEMPORARY', 'INTERIM': 'TEMPORARY',
    'FREELANCE': 'CONTRACTOR', 'STAGE': 'INTERN', 'ALTERNANCE': 'INTERN',
}


def _base():
    return settings.SITE_URL.rstrip('/')


def _texte(brut, limite=DESCRIPTION_MAX):
    """Texte brut sur une ligne (balises retirées), tronqué proprement."""
    sans_balises = re.sub(r'<[^>]+>', ' ', brut or '')
    propre = re.sub(r'\s+', ' ', html.unescape(sans_balises)).strip()
    if len(propre) <= limite:
        return propre
    return propre[:limite - 1].rsplit(' ', 1)[0].rstrip(' ,;:.') + '…'


def _absolue(url):
    if not url:
        return None
    return url if url.startswith('http') else f"{_base()}{url}"


def chemin_canonique_offre(offre):
    """Même chemin que le sitemap et que `jobUrl` du frontend (slash final compris)."""
    secteur = slugify(_secteur_libelle_pour_offre(offre) or "") or "offres-d-emploi"
    titre = slugify(offre.titre)
    dernier = f"{titre}-{offre.code_public}" if titre else offre.code_public
    return f"/entreprises/{offre.entreprise.slug}/offres-d-emploi/{secteur}/{dernier}/"


def _paragraphes_html(*textes):
    blocs = [f"<p>{html.escape(t).replace(chr(10), '<br>')}</p>" for t in textes if t and t.strip()]
    return ''.join(blocs)


def construire_job_posting(offre):
    """Données structurées JobPosting (https://developers.google.com/search/docs/appearance/structured-data/job-posting).

    Volontairement absent : `baseSalary` (le salaire est un texte libre dont on ne peut pas déduire
    l'unité sans risquer d'afficher un montant faux).
    """
    entreprise = offre.entreprise
    region = (offre.wilaya or '').partition(' - ')[2] or (offre.wilaya or '')
    adresse = {'@type': 'PostalAddress', 'addressCountry': 'DZ'}
    if offre.commune:
        adresse['addressLocality'] = offre.commune
    elif region:
        adresse['addressLocality'] = region
    if region:
        adresse['addressRegion'] = region
    donnees = {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        'title': offre.titre,
        'description': _paragraphes_html(offre.description, offre.missions, offre.profil_recherche)
        or _paragraphes_html(offre.titre),
        'datePosted': offre.date_publication.date().isoformat(),
        'identifier': {'@type': 'PropertyValue', 'name': SITE_NAME, 'value': offre.code_public},
        'url': f"{_base()}{chemin_canonique_offre(offre)}",
        'directApply': True,
        'totalJobOpenings': offre.nombre_postes,
        'hiringOrganization': {
            '@type': 'Organization',
            'name': entreprise.nom_entreprise,
            'sameAs': f"{_base()}/entreprise/{entreprise.slug}/",
        },
        'jobLocation': {'@type': 'Place', 'address': adresse},
    }
    logo = _absolue(entreprise.logo.url) if entreprise.logo else None
    if logo:
        donnees['hiringOrganization']['logo'] = logo
    if offre.date_expiration:
        donnees['validThrough'] = offre.date_expiration.isoformat()
    if offre.type_contrat in TYPES_EMPLOI:
        donnees['employmentType'] = TYPES_EMPLOI[offre.type_contrat]
    return donnees


# --- Injection dans index.html ---------------------------------------------------------------

def _lire_index():
    try:
        return Path(settings.FRONTEND_INDEX_PATH).read_text(encoding='utf-8')
    except OSError:
        return None


def _meta(attr, cle, contenu):
    return f'<meta {attr}="{cle}" content="{html.escape(contenu, quote=True)}" />'


def _remplacer_ou_ajouter(page, motif, balise):
    if re.search(motif, page, flags=re.IGNORECASE):
        return re.sub(motif, lambda _m: balise, page, count=1, flags=re.IGNORECASE)
    return page.replace('</head>', f"{balise}\n</head>", 1)


def _json_sur_une_balise(donnees):
    # `<` en < : impossible de refermer la balise <script> depuis une valeur de la base.
    return json.dumps(donnees, ensure_ascii=False).replace('<', '\\u003c')


def injecter_meta(page, titre, description, url=None, image=None, noindex=False, json_ld=None):
    complet = f"{titre} | {SITE_NAME}"
    page = re.sub(r'<title>.*?</title>', lambda _m: f"<title>{html.escape(complet)}</title>",
                  page, count=1, flags=re.DOTALL | re.IGNORECASE)
    champs = [
        ('name', 'description', description), ('property', 'og:title', complet),
        ('property', 'og:description', description), ('name', 'twitter:title', complet),
        ('name', 'twitter:description', description),
    ]
    if image:
        champs.append(('property', 'og:image', image))
    if url:
        champs.append(('property', 'og:url', url))
    for attr, cle, contenu in champs:
        page = _remplacer_ou_ajouter(page, rf'<meta\s+(?:name|property)="{re.escape(cle)}"[^>]*>', _meta(attr, cle, contenu))
    if noindex:
        page = _remplacer_ou_ajouter(page, r'<meta\s+name="robots"[^>]*>', _meta('name', 'robots', 'noindex, nofollow'))
    elif url:
        lien = f'<link rel="canonical" href="{html.escape(url, quote=True)}" />'
        page = _remplacer_ou_ajouter(page, r'<link\s+rel="canonical"[^>]*>', lien)
    if json_ld:
        script = f'<script type="application/ld+json" id="{ID_JSONLD}">{_json_sur_une_balise(json_ld)}</script>'
        page = _remplacer_ou_ajouter(page, rf'<script[^>]*id="{ID_JSONLD}"[^>]*>.*?</script>', script)
    return page


def _repondre(titre, description, statut=200, **options):
    page = _lire_index()
    if page is None:
        return HttpResponse("Application frontend non construite (FRONTEND_INDEX_PATH).",
                            status=503, content_type='text/plain; charset=utf-8')
    corps = injecter_meta(page, titre, description, **options)
    return HttpResponse(corps, status=statut, content_type='text/html; charset=utf-8')


def _introuvable():
    return _repondre("Page introuvable", "Cette page n'existe pas ou n'est plus disponible.",
                     statut=404, noindex=True)


def _offre_ou_none(**filtre):
    try:
        offre = OffreEmploi.objects.select_related(
            'entreprise', 'metier__groupe_principal__parent'
        ).get(statut_moderation='APPROUVEE', **filtre)
    except (OffreEmploi.DoesNotExist, ValueError):
        return None
    return offre


def _offre_indexable(offre):
    expiree = offre.date_expiration and offre.date_expiration < timezone.localdate()
    return offre.est_active and not offre.est_cloturee and not expiree


class PageOffreView(View):
    def get(self, request, entreprise_slug, secteur_slug, titre_code):
        offre = _offre_ou_none(code_public=titre_code.rsplit('-', 1)[-1])
        if offre is None:
            return _introuvable()
        chemin = chemin_canonique_offre(offre)
        if request.path != chemin:
            return HttpResponsePermanentRedirect(chemin)
        nom = offre.entreprise.nom_entreprise
        indexable = _offre_indexable(offre)
        return _repondre(
            f"{offre.titre} — {nom}",
            _texte(offre.description) or f"Offre d'emploi {offre.titre} chez {nom}.",
            url=f"{_base()}{chemin}",
            image=_absolue(offre.entreprise.logo.url) if offre.entreprise.logo else None,
            noindex=not indexable,
            json_ld=construire_job_posting(offre) if indexable else None,
        )


class PageOffreAncienneUrlView(View):
    """Ancienne URL `/jobs/<id>-<slug>` : redirige en 301 vers l'URL canonique."""
    def get(self, request, id_slug):
        prefixe = id_slug.split('-')[0]
        offre = _offre_ou_none(pk=int(prefixe)) if prefixe.isdigit() else None
        if offre is None:
            return _introuvable()
        return HttpResponsePermanentRedirect(chemin_canonique_offre(offre))


class PageEntrepriseView(View):
    def get(self, request, slug):
        try:
            entreprise = ProfilEntreprise.objects.get(slug=slug, est_approuvee=True)
        except ProfilEntreprise.DoesNotExist:
            return _introuvable()
        chemin = f"/entreprise/{entreprise.slug}/"
        if request.path != chemin:
            return HttpResponsePermanentRedirect(chemin)
        return _repondre(
            entreprise.nom_entreprise,
            _texte(entreprise.description) or f"{entreprise.nom_entreprise} recrute sur {SITE_NAME} : découvrez ses offres d'emploi.",
            url=f"{_base()}{chemin}",
            image=_absolue(entreprise.logo.url) if entreprise.logo else None,
        )


class PageArticleView(View):
    def get(self, request, slug):
        try:
            article = Article.objects.get(slug=slug, statut='PUBLIE')
        except Article.DoesNotExist:
            return _introuvable()
        chemin = f"/blog/{article.slug}/"
        if request.path != chemin:
            return HttpResponsePermanentRedirect(chemin)
        return _repondre(
            article.titre,
            _texte(article.extrait) or _texte(article.contenu_html),
            url=f"{_base()}{chemin}",
            image=_absolue(article.image_couverture.url) if article.image_couverture else None,
        )
