from django.contrib import admin
from .models import ProfilEntreprise, OffreEmploi

@admin.register(ProfilEntreprise)
class ProfilEntrepriseAdmin(admin.ModelAdmin):
    list_display = ('nom_entreprise', 'wilaya_siege', 'registre_commerce')
    search_fields = ('nom_entreprise', 'registre_commerce')
    list_filter = ('wilaya_siege',)

@admin.register(OffreEmploi)
class OffreEmploiAdmin(admin.ModelAdmin):
    list_display = ('titre', 'entreprise', 'type_contrat', 'wilaya', 'date_publication', 'est_active')
    search_fields = ('titre', 'entreprise__nom_entreprise')
    list_filter = ('est_active', 'type_contrat', 'experience_requise', 'wilaya')
    
    # ON AJOUTE LES NOUVELLES CASES ICI 👇
    fieldsets = (
        ('Informations Principales', {
            'fields': ('entreprise', 'titre', 'wilaya', 'commune', 'est_active') # Ajout de commune
        }),
        ('Ciblage du Profil (Nouveau)', {
            'fields': ('diplome', 'specialite') # Ajout de diplome et specialite
        }),
        ('Détails du Poste', {
            'fields': ('missions', 'profil_recherche')
        }),
        ('Contrat & Rémunération', {
            'fields': ('type_contrat', 'experience_requise', 'salaire_propose')
        }),
    )
    