from django.contrib import admin
from .models import ProfilEntreprise, OffreEmploi
from .models import Candidature
from .models import (
    ProfilCandidat, ExperienceCandidat, FormationCandidat, 
    Notification, AlerteEmploi, OffreSauvegardee
)

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
@admin.register(Candidature)
class CandidatureAdmin(admin.ModelAdmin):
    # Les colonnes qui vont s'afficher dans le tableau de l'admin
    list_display = ('id', 'get_candidat_nom', 'offre', 'statut', 'score_matching', 'date_postulation')
    
    # Les filtres sur le côté droit
    list_filter = ('statut', 'est_rapide', 'date_postulation')
    
    # La barre de recherche en haut
    search_fields = ('candidat__email', 'candidat__last_name', 'nom_rapide', 'email_rapide', 'offre__titre')

    # Une petite fonction pour afficher le nom proprement, que ce soit un compte ou une candidature rapide
    def get_candidat_nom(self, obj):
        if obj.est_rapide:
            return f"{obj.nom_rapide} {obj.prenom_rapide} (Rapide)"
        if obj.candidat:
            return f"{obj.candidat.last_name} {obj.candidat.first_name}"
        return "Inconnu"
    
    get_candidat_nom.short_description = 'Candidat' # Le

# ==========================================
# GESTION DES PROFILS CANDIDATS
# ==========================================
@admin.register(ProfilCandidat)
class ProfilCandidatAdmin(admin.ModelAdmin):
    list_display = ('user', 'titre_professionnel', 'wilaya', 'specialite')
    search_fields = ('user__email', 'user__last_name', 'user__first_name', 'titre_professionnel')
    list_filter = ('wilaya', 'mobilite')

@admin.register(ExperienceCandidat)
class ExperienceCandidatAdmin(admin.ModelAdmin):
    list_display = ('profil', 'titre_poste', 'entreprise', 'date_debut', 'date_fin')
    search_fields = ('titre_poste', 'entreprise', 'profil__user__email')

@admin.register(FormationCandidat)
class FormationCandidatAdmin(admin.ModelAdmin):
    list_display = ('profil', 'diplome', 'etablissement', 'date_debut')
    search_fields = ('diplome', 'etablissement', 'profil__user__email')

# ==========================================
# GESTION DES NOTIFICATIONS ET ALERTES
# ==========================================
@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('destinataire', 'type_notif', 'titre', 'lue', 'date_creation')
    list_filter = ('type_notif', 'lue', 'date_creation')
    search_fields = ('destinataire__email', 'titre')

@admin.register(AlerteEmploi)
class AlerteEmploiAdmin(admin.ModelAdmin):
    list_display = ('candidat', 'mots_cles', 'wilaya', 'est_active')
    list_filter = ('est_active', 'frequence')
    search_fields = ('candidat__email', 'mot_cle')

@admin.register(OffreSauvegardee)
class OffreSauvegardeeAdmin(admin.ModelAdmin):
    list_display = ('candidat', 'offre', 'date_sauvegarde')
    search_fields = ('candidat__email', 'offre__titre')