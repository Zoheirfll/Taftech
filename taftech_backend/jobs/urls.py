from django.urls import path
from .views import (
    # Offres
    JobListAPIView, JobDetailAPIView, JobCreateAPIView,
    ConstantsAPIView, NomenclatureAPIView, CloturerOffreAPIView, UpdateOffreRecruteurAPIView, SupprimerOffreAPIView,

    # Candidatures
    PostulerAPIView, PostulerRapideAPIView, MesCandidaturesAPIView,
    UpdateCandidatureStatusAPIView, DeleteCandidatureAPIView,
    EvaluerCandidatureAPIView, Top5CandidatsAPIView,

    # Profil candidat
    ProfilCandidatAPIView, ExperienceAPIView, ExperienceDetailAPIView,
    FormationAPIView, FormationDetailAPIView,
    OffreSauvegardeeListCreateAPIView, OffreSauvegardeeDeleteAPIView,
    AlerteEmploiListCreateAPIView, AlerteEmploiDetailAPIView,
    ParametresNotificationsAPIView,
    CandidatFichierPriveAPIView,

    # Recruteur
    DashboardRecruteurAPIView, UpdateProfilEntrepriseAPIView,
    ParametresRecruteurAPIView, CVThequeView, ToggleFavoriCVAPIView,
    EnvoyerCandidatureSpontaneeAPIView, ListeCandidaturesSpontaneesAPIView,
    MarquerSpontaneeLueAPIView, SupprimerSpontaneeAPIView,
    QuestionnaireListCreateAPIView, QuestionnaireDetailAPIView,
    DemanderActivationPremiumAPIView, EnvoyerRecuPremiumAPIView,
    ChargilyCheckoutAPIView, ChargilyWebhookAPIView,
    EquipeAPIView, InviterMembreAPIView, AccepterInvitationAPIView, EquipeAuditLogAPIView,

    # Notifications
    NotificationListAPIView, MarkNotificationReadAPIView,
    PublicStatsAPIView, StatsGeoAPIView, EntrepriseDetailAPIView, EntrepriseListAPIView,

    # Admin
    AdminOffresListAPIView, AdminOffreModerateAPIView,
    AdminEntreprisesListAPIView, AdminEntrepriseModerateAPIView,
    AdminStatsAPIView, AdminUsersListAPIView, AdminUserModerateAPIView,
    AdminBroadcastEmailAPIView, AdminCandidaturesListAPIView,
    ExportCandidaturesCSVAPIView, ExportEntreprisesCSVAPIView,
    ExportOffresCSVAPIView, ExportUtilisateursCSVAPIView,
    AdminMarcheAPIView, AdminAuditLogAPIView, AdminDemandesPremiumAPIView,
    AdminCompteAdminsAPIView,

    # IA
    OffresRecommandeesAPIView, ParserCVAPIView,
    MetierReferentielAPIView, MetierReferentielAdminAPIView,
    SuggestionsCarriereAPIView, AnalyseCarriereGroqAPIView,
    AnalyseGroqRecruteurAPIView, GenererOffreIAAPIView,

    # Bulletin PDF
    GenererBulletinPDFAPIView,
)

urlpatterns = [
    # Offres
    path('', JobListAPIView.as_view(), name='job-list'),
    path('<int:offre_id>/', JobDetailAPIView.as_view(), name='job-detail'),
    path('creer/', JobCreateAPIView.as_view(), name='creer-offre'),
    path('constants/', ConstantsAPIView.as_view(), name='api-constants'),
    path('nomenclature/', NomenclatureAPIView.as_view(), name='api-nomenclature'),
    path('dashboard/offres/<int:offre_id>/cloturer/', CloturerOffreAPIView.as_view(), name='cloturer-offre'),
    path('dashboard/offres/<int:offre_id>/modifier/', UpdateOffreRecruteurAPIView.as_view(), name='modifier-offre'),
    path('dashboard/offres/<int:offre_id>/supprimer/', SupprimerOffreAPIView.as_view(), name='supprimer-offre'),

    # Candidatures
    path('<int:offre_id>/postuler/', PostulerAPIView.as_view(), name='postuler-offre'),
    path('<int:offre_id>/postuler-rapide/', PostulerRapideAPIView.as_view(), name='postuler-rapide'),
    path('mes-candidatures/', MesCandidaturesAPIView.as_view(), name='mes-candidatures'),
    path('candidatures/<int:candidature_id>/statut/', UpdateCandidatureStatusAPIView.as_view(), name='update-statut'),
    path('candidatures/<int:candidature_id>/supprimer/', DeleteCandidatureAPIView.as_view(), name='supprimer-candidature'),
    path('candidatures/<int:candidature_id>/evaluer/', EvaluerCandidatureAPIView.as_view(), name='evaluer-candidature'),
    path('candidatures/<int:candidature_id>/bulletin/', GenererBulletinPDFAPIView.as_view(), name='generer-bulletin'),
    path('candidatures/<int:candidature_id>/analyse-groq/', AnalyseGroqRecruteurAPIView.as_view(), name='analyse-groq'),
    path('ia/generer-offre/', GenererOffreIAAPIView.as_view(), name='generer-offre-ia'),
    path('jobs/<int:offre_id>/top5/', Top5CandidatsAPIView.as_view(), name='offre-top5'),

    # Profil candidat
    path('profil/', ProfilCandidatAPIView.as_view(), name='profil-candidat'),
    path('profil/experiences/', ExperienceAPIView.as_view(), name='profil-experiences'),
    path('profil/experiences/<int:pk>/', ExperienceDetailAPIView.as_view(), name='profil-experience-detail'),
    path('profil/formations/', FormationAPIView.as_view(), name='profil-formations'),
    path('profil/formations/<int:pk>/', FormationDetailAPIView.as_view(), name='profil-formation-detail'),
    path('sauvegardes/', OffreSauvegardeeListCreateAPIView.as_view(), name='liste-sauvegardes'),
    path('sauvegardes/<int:pk>/', OffreSauvegardeeDeleteAPIView.as_view(), name='supprimer-sauvegarde'),
    path('alertes/', AlerteEmploiListCreateAPIView.as_view(), name='liste-alertes'),
    path('alertes/<int:pk>/', AlerteEmploiDetailAPIView.as_view(), name='detail-alerte'),
    path('parametres/notifications/', ParametresNotificationsAPIView.as_view(), name='parametres-notifications'),
    path('media-prive/candidat/<int:candidat_id>/<str:type_fichier>/', CandidatFichierPriveAPIView.as_view(), name='candidat-fichier-prive'),

    # Recruteur
    path('dashboard/', DashboardRecruteurAPIView.as_view(), name='dashboard-recruteur'),
    path('entreprise/update/', UpdateProfilEntrepriseAPIView.as_view(), name='update-entreprise'),
    path('parametres/recruteur/', ParametresRecruteurAPIView.as_view(), name='parametres-recruteur'),
    path('employeur/cvtheque/', CVThequeView.as_view(), name='cvtheque'),
    path('cvtheque/favoris/<int:candidat_id>/', ToggleFavoriCVAPIView.as_view(), name='cvtheque-favori'),
    path('entreprises/<slug:slug>/candidature-spontanee/', EnvoyerCandidatureSpontaneeAPIView.as_view(), name='candidature-spontanee'),
    path('dashboard/candidatures-spontanees/', ListeCandidaturesSpontaneesAPIView.as_view(), name='liste-spontanees'),
    path('dashboard/candidatures-spontanees/<int:pk>/lire/', MarquerSpontaneeLueAPIView.as_view(), name='spontanee-lire'),
    path('dashboard/candidatures-spontanees/<int:pk>/supprimer/', SupprimerSpontaneeAPIView.as_view(), name='spontanee-supprimer'),
    path('questionnaires/', QuestionnaireListCreateAPIView.as_view(), name='questionnaires'),
    path('questionnaires/<int:pk>/', QuestionnaireDetailAPIView.as_view(), name='questionnaire-detail'),

    # Notifications
    path('notifications/', NotificationListAPIView.as_view(), name='notifications'),
    path('notifications/<int:notif_id>/lire/', MarkNotificationReadAPIView.as_view(), name='notification-lire'),
    path('stats/public/', PublicStatsAPIView.as_view(), name='stats-public'),
    path('stats/geo/', StatsGeoAPIView.as_view(), name='stats-geo'),
    path('entreprises/', EntrepriseListAPIView.as_view(), name='entreprises-list'),
    path('entreprises/<slug:slug>/', EntrepriseDetailAPIView.as_view(), name='entreprise-public'),

    # Admin
    path('admin/offres/', AdminOffresListAPIView.as_view(), name='admin-offres'),
    path('admin/offres/<int:offre_id>/moderer/', AdminOffreModerateAPIView.as_view(), name='admin-offre-moderer'),
    path('admin/entreprises/', AdminEntreprisesListAPIView.as_view(), name='admin-entreprises'),
    path('admin/entreprises/<int:entreprise_id>/moderer/', AdminEntrepriseModerateAPIView.as_view(), name='admin-entreprise-moderer'),
    path('admin/statistiques/', AdminStatsAPIView.as_view(), name='admin-stats'),
    path('admin/utilisateurs/', AdminUsersListAPIView.as_view(), name='admin-users'),
    path('admin/utilisateurs/<int:user_id>/moderer/', AdminUserModerateAPIView.as_view(), name='admin-user-moderer'),
    path('admin/broadcast-email/', AdminBroadcastEmailAPIView.as_view(), name='admin-broadcast'),
    path('admin/candidatures/', AdminCandidaturesListAPIView.as_view(), name='admin-candidatures'),
    path('admin/marche/', AdminMarcheAPIView.as_view(), name='admin-marche'),
    path('admin/audit-logs/', AdminAuditLogAPIView.as_view(), name='admin-audit-logs'),
    path('admin/demandes-premium/', AdminDemandesPremiumAPIView.as_view(), name='admin-demandes-premium'),
    path('admin/demandes-premium/<int:demande_id>/activer/', AdminDemandesPremiumAPIView.as_view(), name='admin-activer-premium'),
    path('premium/demande/', DemanderActivationPremiumAPIView.as_view(), name='demande-premium'),
    path('premium/envoyer-recu/', EnvoyerRecuPremiumAPIView.as_view(), name='envoyer-recu-premium'),
    # Chargily Pay — paiement en ligne
    path('premium/chargily/checkout/', ChargilyCheckoutAPIView.as_view(), name='chargily-checkout'),
    path('premium/chargily/webhook/', ChargilyWebhookAPIView.as_view(), name='chargily-webhook'),
    # Équipe
    path('equipe/', EquipeAPIView.as_view(), name='equipe-list'),
    path('equipe/inviter/', InviterMembreAPIView.as_view(), name='equipe-inviter'),
    path('equipe/invitations/<int:invitation_id>/', InviterMembreAPIView.as_view(), name='equipe-invitation-supprimer'),
    path('equipe/<int:membre_id>/', EquipeAPIView.as_view(), name='equipe-membre'),
    path('equipe/invitation/<str:token>/', AccepterInvitationAPIView.as_view(), name='equipe-accepter'),
    path('equipe/audit/', EquipeAuditLogAPIView.as_view(), name='equipe-audit'),
    path('admin/export/candidatures/', ExportCandidaturesCSVAPIView.as_view(), name='export-candidatures'),
    path('admin/export/entreprises/', ExportEntreprisesCSVAPIView.as_view(), name='export-entreprises'),
    path('admin/export/offres/', ExportOffresCSVAPIView.as_view(), name='export-offres'),
    path('admin/export/utilisateurs/', ExportUtilisateursCSVAPIView.as_view(), name='export-utilisateurs'),
    path('admin/metiers/', MetierReferentielAdminAPIView.as_view(), name='admin-metiers'),
    path('admin/metiers/<int:pk>/', MetierReferentielAdminAPIView.as_view(), name='admin-metier-detail'),
    path('admin/comptes-admins/', AdminCompteAdminsAPIView.as_view(), name='admin-comptes-admins'),
    path('admin/comptes-admins/<int:admin_id>/', AdminCompteAdminsAPIView.as_view(), name='admin-compte-admin-detail'),

    # IA
    path('recommandations/', OffresRecommandeesAPIView.as_view(), name='recommandations'),
    path('parser-cv/', ParserCVAPIView.as_view(), name='parser-cv'),
    path('metiers/', MetierReferentielAPIView.as_view(), name='metiers'),
    path('suggestions-carriere/', SuggestionsCarriereAPIView.as_view(), name='suggestions-carriere'),
    path('analyse-carriere/', AnalyseCarriereGroqAPIView.as_view(), name='analyse-carriere'),
]