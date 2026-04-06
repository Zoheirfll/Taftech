from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # On connecte le module accounts à l'URL de base /api/accounts/
    path('api/accounts/', include('accounts.urls')),
    path('api/jobs/', include('jobs.urls')),
    
# --- ROUTES DE CONNEXION ---
    # Pour se connecter et recevoir le Token
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # Pour renouveler le badge quand il expire
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]