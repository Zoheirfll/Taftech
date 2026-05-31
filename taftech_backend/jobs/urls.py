from django.urls import path
from .views import JobListAPIView, PostulerAPIView, JobCreateAPIView, DashboardRecruteurAPIView, UpdateCandidatureStatusAPIView, ProfilCandidatAPIView, JobDetailAPIView, MesCandidaturesAPIView
from .views import AdminOffresListAPIView, AdminOffreModerateAPIView, AdminEntreprisesListAPIView, AdminEntrepriseModerateAPIView, UpdateProfilEntrepriseAPIView
from .views import AdminStatsAPIView, AdminUsersListAPIView, AdminUserModerateAPIView, ConstantsAPIView, DeleteCandidatureAPIView, CloturerOffreAPIView
from .views import ExperienceAPIView, ExperienceDetailAPIView, FormationAPIView, FormationDetailAPIView
from .views import PublicStatsAPIView
# 👇 IMPORT DES 5 NOUVELLES VUES 👇
from .views import OffreSauvegardeeListCreateAPIView, OffreSauvegardeeDeleteAPIView, AlerteEmploiListCreateAPIView, AlerteEmploiDetailAPIView, ParametresNotificationsAPIView, EntrepriseDetailAPIView
from .views import PostulerRapideAPIView, NotificationListAPIView, MarkNotificationReadAPIView, Top5CandidatsAPIView
from .views import OffresRecommandeesAPIView # <-- Ajoute ça dans tes imports
from .views import AdminBroadcastEmailAPIView, CVThequeView, EvaluerCandidatureAPIView, AdminCandidaturesListAPIView, ExportCandidaturesCSVAPIView
from .views import ExportEntreprisesCSVAPIView, ExportOffresCSVAPIView, ExportUtilisateursCSVAPIView, GenererBulletinPDFAPIView
from .views import ParserCVAPIView
from .views import ToggleFavoriCVAPIView
from .views import UpdateOffreRecruteurAPIView
from .views import ParametresRecruteurAPIView
from .views import EnvoyerCandidatureSpontaneeAPIView, ListeCandidaturesSpontaneesAPIView, MarquerSpontaneeLueAPIView, SupprimerSpontaneeAPIView, QuestionnaireListCreateAPIView, QuestionnaireDetailAPIView, AdminMarcheAPIView, MetierReferentielAPIView, MetierReferentielAdminAPIView











urlpatterns = [
    path('', JobListAPIView.as_view(), name='job-list'),
    
    # La nouvelle route avec l'ID de l'offre (ex: /api/jobs/1/postuler/)
    path('<int:offre_id>/postuler/', PostulerAPIView.as_view(), name='postuler-offre'),
    
    # La nouvelle route pour publier 
    path('creer/', JobCreateAPIView.as_view(), name='creer-offre'),
    
    # Le tableau de bord
    path('dashboard/', DashboardRecruteurAPIView.as_view(), name='dashboard-recruteur'),
    
    # URL pour changer le statut d'une candidature
    path('candidatures/<int:candidature_id>/statut/', UpdateCandidatureStatusAPIView.as_view(), name='update-statut'),
    
    # URL pour le profil candidat
    path('profil/', ProfilCandidatAPIView.as_view(), name='profil-candidat'),
    
    # URL pour voir une seule offre en détail
    path('<int:offre_id>/', JobDetailAPIView.as_view(), name='job-detail'),
    path('mes-candidatures/', MesCandidaturesAPIView.as_view(), name='mes-candidatures'),
    path('<int:offre_id>/postuler-rapide/', PostulerRapideAPIView.as_view(), name='postuler-rapide'),
    # --- ROUTES ADMIN ---
    path('admin/offres/', AdminOffresListAPIView.as_view(), name='admin-offres-list'),
    path('admin/offres/<int:offre_id>/moderer/', AdminOffreModerateAPIView.as_view(), name='admin-offre-moderate'),
    path('admin/entreprises/', AdminEntreprisesListAPIView.as_view(), name='admin-entreprises-list'),
    path('admin/entreprises/<int:entreprise_id>/moderer/', AdminEntrepriseModerateAPIView.as_view(), name='admin-entreprise-moderate'),
    path('admin/statistiques/', AdminStatsAPIView.as_view(), name='admin-stats'),
    path('admin/utilisateurs/', AdminUsersListAPIView.as_view(), name='admin-users-list'),
    path('admin/utilisateurs/<int:user_id>/moderer/', AdminUserModerateAPIView.as_view(), name='admin-user-moderate'),
    path('admin/broadcast-email/', AdminBroadcastEmailAPIView.as_view(), name='admin-broadcast-email'),
    path('admin/candidatures/', AdminCandidaturesListAPIView.as_view(), name='admin-candidatures-list'),
    path('admin/marche/', AdminMarcheAPIView.as_view()),
    # URL pour la page publique d'une entreprise
    path('entreprises/<int:entreprise_id>/', EntrepriseDetailAPIView.as_view(), name='entreprise-detail-public'),
    
    path('constants/', ConstantsAPIView.as_view(), name='api-constants'),
    path('stats/public/', PublicStatsAPIView.as_view(), name='public-stats'),
    
    # --- ROUTES POUR LE CV (Expériences / Formations) ---
    path('profil/experiences/', ExperienceAPIView.as_view(), name='profil-experiences'),
    path('profil/experiences/<int:pk>/', ExperienceDetailAPIView.as_view(), name='profil-experience-detail'),
    path('profil/formations/', FormationAPIView.as_view(), name='profil-formations'),
    path('profil/formations/<int:pk>/', FormationDetailAPIView.as_view(), name='profil-formation-detail'),
    
    # --- ROUTES DE GESTION RECRUTEUR ---
    path('entreprise/update/', UpdateProfilEntrepriseAPIView.as_view(), name='update-entreprise'),
    path('dashboard/offres/<int:offre_id>/cloturer/', CloturerOffreAPIView.as_view(), name='cloturer_offre'),
    path('candidatures/<int:candidature_id>/supprimer/', DeleteCandidatureAPIView.as_view(), name='supprimer_candidature'),

    # ======================================================
    # 👇 NOUVELLES ROUTES : FONCTIONNALITÉS AVANCÉES CANDIDAT 👇
    # ======================================================
    
    # 1. Offres Sauvegardées (Favoris)
    path('sauvegardes/', OffreSauvegardeeListCreateAPIView.as_view(), name='liste-ajout-sauvegardes'),
    path('sauvegardes/<int:pk>/', OffreSauvegardeeDeleteAPIView.as_view(), name='supprimer-sauvegarde'),
    
    # 2. Alertes d'emploi
    path('alertes/', AlerteEmploiListCreateAPIView.as_view(), name='liste-ajout-alertes'),
    path('alertes/<int:pk>/', AlerteEmploiDetailAPIView.as_view(), name='modifier-supprimer-alerte'),
    
    # 3. Paramètres de notifications
    path('parametres/notifications/', ParametresNotificationsAPIView.as_view(), name='parametres-notifications'),
    path('recommandations/', OffresRecommandeesAPIView.as_view(), name='offres-recommandees'),
    path('notifications/', NotificationListAPIView.as_view(), name='notifications-list'),
    path('notifications/<int:notif_id>/lire/', MarkNotificationReadAPIView.as_view(), name='notification-read'),

    path('employeur/cvtheque/', CVThequeView.as_view(), name='cvtheque-search'),
    path('candidatures/<int:candidature_id>/evaluer/', EvaluerCandidatureAPIView.as_view(), name='evaluer-candidature'),
    path('admin/export/candidatures/', ExportCandidaturesCSVAPIView.as_view(), name='admin-export-candidatures'),
    path('admin/export/entreprises/', ExportEntreprisesCSVAPIView.as_view(), name='admin-export-entreprises'),
    path('admin/export/offres/', ExportOffresCSVAPIView.as_view(), name='admin-export-offres'),
    path('admin/export/utilisateurs/', ExportUtilisateursCSVAPIView.as_view(), name='admin-export-utilisateurs'),
    path('candidatures/<int:candidature_id>/bulletin/', GenererBulletinPDFAPIView.as_view(), name='generer-bulletin'),
    path('jobs/<int:offre_id>/top5/', Top5CandidatsAPIView.as_view(), name='offre-top5'),
    path('parser-cv/', ParserCVAPIView.as_view(), name='parser-cv'),
    path('cvtheque/favoris/<int:candidat_id>/', ToggleFavoriCVAPIView.as_view(), name='cvtheque-toggle-favori'),
    path('dashboard/offres/<int:offre_id>/modifier/', UpdateOffreRecruteurAPIView.as_view(), name='modifier-offre-recruteur'),
    path('parametres/recruteur/', ParametresRecruteurAPIView.as_view(), name='parametres-recruteur'),
    path('entreprises/<int:entreprise_id>/candidature-spontanee/', EnvoyerCandidatureSpontaneeAPIView.as_view()),
path('dashboard/candidatures-spontanees/', ListeCandidaturesSpontaneesAPIView.as_view()),
path('dashboard/candidatures-spontanees/<int:pk>/lire/', MarquerSpontaneeLueAPIView.as_view()),
path('dashboard/candidatures-spontanees/<int:pk>/supprimer/', SupprimerSpontaneeAPIView.as_view()),
path('questionnaires/', QuestionnaireListCreateAPIView.as_view()),
path('questionnaires/<int:pk>/', QuestionnaireDetailAPIView.as_view()),
path('metiers/', MetierReferentielAPIView.as_view()),
path('admin/metiers/', MetierReferentielAdminAPIView.as_view()),
path('admin/metiers/<int:pk>/', MetierReferentielAdminAPIView.as_view()),
]