from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser

class CustomUserAdmin(UserAdmin):
    """
    Notre vitrine personnalisée pour le panneau d'administration.
    """
    # 1. On prend l'affichage par défaut et on ajoute une nouvelle section en bas
    fieldsets = UserAdmin.fieldsets + (
        ('Informations Spécifiques TafTech (Algérie)', {
            'fields': ('role', 'nin', 'telephone', 'consentement_loi_18_07'),
        }),
    )
    
    # 2. On indique quels champs afficher dans le tableau récapitulatif des utilisateurs
    list_display = ('username', 'email', 'role', 'nin', 'consentement_loi_18_07', 'is_staff')
    
    # 3. On ajoute des filtres sur le côté droit de l'écran
    list_filter = ('role', 'consentement_loi_18_07', 'is_staff', 'is_active')

# On connecte notre modèle à notre nouvelle vitrine
admin.site.register(CustomUser, CustomUserAdmin)