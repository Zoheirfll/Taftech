from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    # On connecte le module accounts à l'URL de base /api/accounts/
    path('api/accounts/', include('accounts.urls')),
]