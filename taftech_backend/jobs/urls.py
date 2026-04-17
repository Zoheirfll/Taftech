from django.urls import path
from .views import JobListAPIView
from .views import ProfilEntrepriseCreateAPIView
from .views import JobListAPIView, ProfilEntrepriseCreateAPIView, PostulerAPIView, JobCreateAPIView, DashboardRecruteurAPIView, UpdateCandidatureStatusAPIView, ProfilCandidatAPIView, JobDetailAPIView, CandidatRegisterAPIView, MesCandidaturesAPIView
from .views import AdminOffresListAPIView, AdminOffreModerateAPIView, AdminEntreprisesListAPIView, AdminEntrepriseModerateAPIView
from .views import AdminStatsAPIView, AdminUsersListAPIView, AdminUserModerateAPIView





urlpatterns = [
    path('', JobListAPIView.as_view(), name='job-list'),
    path('entreprise/creer/', ProfilEntrepriseCreateAPIView.as_view(), name='creer-entreprise'),
    # La nouvelle route avec l'ID de l'offre (ex: /api/jobs/1/postuler/)
    path('<int:offre_id>/postuler/', PostulerAPIView.as_view(), name='postuler-offre'),
    # La nouvelle route pour publier (Attention à l'ordre, elle doit être avant <int:offre_id> si on n'utilise pas de préfixe précis, mais ici c'est bon)
    path('creer/', JobCreateAPIView.as_view(), name='creer-offre'),
    # NOUVELLE ROUTE : Le tableau de bord
    path('dashboard/', DashboardRecruteurAPIView.as_view(), name='dashboard-recruteur'),
    
    path('<int:offre_id>/postuler/', PostulerAPIView.as_view(), name='postuler-offre'),
    # URL pour changer le statut d'une candidature
    path('candidatures/<int:candidature_id>/statut/', UpdateCandidatureStatusAPIView.as_view(), name='update-statut'),
    # URL pour le profil candidat
    path('profil/', ProfilCandidatAPIView.as_view(), name='profil-candidat'),
    # URL pour voir une seule offre en détail
    path('<int:offre_id>/', JobDetailAPIView.as_view(), name='job-detail'),
    path('candidat/register/', CandidatRegisterAPIView.as_view(), name='candidat-register'),
    path('mes-candidatures/', MesCandidaturesAPIView.as_view(), name='mes-candidatures'),
    path('admin/offres/', AdminOffresListAPIView.as_view(), name='admin-offres-list'),
    path('admin/offres/<int:offre_id>/moderer/', AdminOffreModerateAPIView.as_view(), name='admin-offre-moderate'),
    path('admin/entreprises/', AdminEntreprisesListAPIView.as_view(), name='admin-entreprises-list'),
    path('admin/entreprises/<int:entreprise_id>/moderer/', AdminEntrepriseModerateAPIView.as_view(), name='admin-entreprise-moderate'),
    path('admin/statistiques/', AdminStatsAPIView.as_view(), name='admin-stats'),
    path('admin/utilisateurs/', AdminUsersListAPIView.as_view(), name='admin-users-list'),
    path('admin/utilisateurs/<int:user_id>/moderer/', AdminUserModerateAPIView.as_view(), name='admin-user-moderate'),
]