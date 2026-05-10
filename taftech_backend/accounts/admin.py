from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, SystemErrorLog


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

@admin.register(SystemErrorLog)
class SystemErrorLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'message', 'user', 'short_url')
    list_filter = ('timestamp', 'user')
    search_fields = ('message', 'details', 'url') # 👈 Pour chercher facilement
    readonly_fields = ('timestamp', 'user', 'message', 'details', 'url', 'user_agent', 'stack_trace')

    def short_url(self, obj):
        return obj.url[:50] + "..." if len(obj.url) > 50 else obj.url
    short_url.short_description = "URL"

    def has_add_permission(self, request): 
        return False # Pas d'ajout manuel
        
    def has_change_permission(self, request, obj=None): 
        return False # 👈 Pas de modification possible (verrouillage Pro)