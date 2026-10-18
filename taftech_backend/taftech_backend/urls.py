from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.conf.urls.static import static

from accounts.views import CookieTokenRefreshView
from jobs.seo_views import SitemapXMLView, RobotsTxtView
from jobs.seo_pages import (
    PageOffreView, PageOffreAncienneUrlView, PageEntrepriseView, PageArticleView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('sitemap.xml', SitemapXMLView.as_view(), name='sitemap'),
    path('robots.txt', RobotsTxtView.as_view(), name='robots'),
    # Pages publiques à fort enjeu SEO, rendues avec leurs balises (nginx les relaie ici en
    # production, voir docs/exploitation/deploiement.md). Slash final facultatif : sinon 301.
    re_path(r'^entreprises/(?P<entreprise_slug>[\w-]+)/offres-d-emploi/(?P<secteur_slug>[\w-]+)/(?P<titre_code>[\w-]+)/?$',
            PageOffreView.as_view(), name='page-offre'),
    re_path(r'^jobs/(?P<id_slug>[\w-]+)/?$', PageOffreAncienneUrlView.as_view(), name='page-offre-ancienne-url'),
    re_path(r'^entreprise/(?P<slug>[\w-]+)/?$', PageEntrepriseView.as_view(), name='page-entreprise'),
    re_path(r'^blog/(?P<slug>[\w-]+)/?$', PageArticleView.as_view(), name='page-article'),
]

# Swagger UI — disponible uniquement en DEBUG
if settings.DEBUG:
    try:
        from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
        urlpatterns += [
            path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
            path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
            path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
        ]
    except ImportError:
        pass  # drf-spectacular pas encore installé

    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)