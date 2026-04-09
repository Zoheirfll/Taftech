from django.urls import path
from .views import JobListAPIView
from .views import ProfilEntrepriseCreateAPIView
from .views import JobListAPIView, ProfilEntrepriseCreateAPIView, PostulerAPIView, JobCreateAPIView, DashboardRecruteurAPIView, UpdateCandidatureStatusAPIView, ProfilCandidatAPIView



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
]