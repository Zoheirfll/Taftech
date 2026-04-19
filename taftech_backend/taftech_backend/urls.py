from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

# On importe les vues personnalisées qui gèrent les COOKIES
from accounts.views import CookieTokenRefreshView 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')), 
    path('api/jobs/', include('jobs.urls')),
    
    # --- LA PIÈCE MANQUANTE ---
    # Cette route va maintenant lire le cookie 'refreshToken' au lieu du JSON
    path('api/token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)