from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

# NOUVEAU : On importe ta vue personnalisée depuis 'accounts'
from accounts.views import EmailTokenObtainView 

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/accounts/', include('accounts.urls')),
    path('api/jobs/', include('jobs.urls')),
    
    # --- ROUTES DE CONNEXION MODIFIÉES ---
    # On utilise maintenant EmailTokenObtainView au lieu de TokenObtainPairView
    path('api/token/', EmailTokenObtainView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)