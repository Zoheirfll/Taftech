from django.urls import path
from .views import (
    # Offres
    JobListAPIView, JobDetailAPIView, JobCreateAPIView,
    ConstantsAPIView, NomenclatureAPIView, CloturerOffreAPIView, UpdateOffreRecruteurAPIView, SupprimerOffreAPIView,
    ExportCandidaturesOffreExcelAPIView, ExportCandidaturesExcelAPIView,

    # Candidatures
    PostulerAPIView, PostulerRapideAPIView, MesCandidaturesAPIView,
    UpdateCandidatureStatusAPIView, DeleteCandidatureAPIView,
    EvaluerCandidatureAPIView, Top5CandidatsAPIView, CandidatureMarquerConsulteeAPIView,

    # Profil candidat
    ProfilCandidatAPIView, ExperienceAPIView, ExperienceDetailAPIView,
    FormationAPIView, FormationDetailAPIView,
    OffreSauvegardeeListCreateAPIView, OffreSauvegardeeDeleteAPIView,
    AlerteEmploiListCreateAPIView, AlerteEmploiDetailAPIView,
    ParametresNotificationsAPIView,
    CandidatFichierPriveAPIView,

    # Recruteur
    DashboardRecruteurAPIView, UpdateProfilEntrepriseAPIView, EntreprisePhotosAPIView,
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

    # Premium (plans/avantages)
    PremiumPlansPublicAPIView, PremiumAvantagesPublicAPIView,
    PremiumPlansAdminAPIView, PremiumAvantagesAdminAPIView,
    PaliersPublicAPIView, PaliersAdminAPIView,

    # FAQ
    FaqPublicAPIView, FaqAdminAPIView,

    # Compétences
    CompetencesAutocompleteAPIView, CompetencesAdminAPIView,

    # Articles / Blog
    ArticleListPublicAPIView, ArticleDetailPublicAPIView, ArticleCategoriesPublicAPIView,
    ArticleAdminAPIView, ArticleAdminDetailAPIView, ArticleCategoriesAdminAPIView,

    # Bannières
    SiteAnnoncePublicAPIView, BanniereAccueilPublicAPIView,
    SiteAnnonceAdminAPIView, BanniereAccueilAdminAPIView,

    # Pages statiques
    PageStatiquePublicAPIView, PageStatiqueAdminAPIView,

    # Config IA
    AIConfigAdminAPIView,

    # Nouveau tableau de bord candidat (specs/important-features)
    ScoreProfilAPIView, ConseilsPersonnalisesIAAPIView, CompetenceCandidatAPIView,
    TypeDocumentPublicAPIView, DocumentCandidatAPIView,
    DisponibilitesAPIView, RendezVousAPIView, RendezVousAnnulerAPIView,
    ActiviteProfilAPIView, AlerteMarquerVueAPIView,
    ConfigRendezVousAdminAPIView, DisponibiliteRecurrenteAdminAPIView,
    JourBloqueAdminAPIView, RendezVousAdminListAPIView, TypeDocumentAdminAPIView,
)

urlpatterns = [
    # Offres
    path('', JobListAPIView.as_view(), name='job-list'),
    path('creer/', JobCreateAPIView.as_view(), name='creer-offre'),
    path('constants/', ConstantsAPIView.as_view(), name='api-constants'),
    path('nomenclature/', NomenclatureAPIView.as_view(), name='api-nomenclature'),
    path('dashboard/offres/<int:offre_id>/cloturer/', CloturerOffreAPIView.as_view(), name='cloturer-offre'),
    path('dashboard/offres/<int:offre_id>/modifier/', UpdateOffreRecruteurAPIView.as_view(), name='modifier-offre'),
    path('dashboard/offres/<int:offre_id>/supprimer/', SupprimerOffreAPIView.as_view(), name='supprimer-offre'),
    path('dashboard/offres/<int:offre_id>/export-excel/', ExportCandidaturesOffreExcelAPIView.as_view(), name='export-candidatures-offre-excel'),
    path('dashboard/export-excel/', ExportCandidaturesExcelAPIView.as_view(), name='export-candidatures-excel'),

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
    path('candidatures/<int:candidature_id>/marquer-consultee/', CandidatureMarquerConsulteeAPIView.as_view(), name='candidature-marquer-consultee'),

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
    path('alertes/<int:pk>/marquer-vue/', AlerteMarquerVueAPIView.as_view(), name='alerte-marquer-vue'),
    path('parametres/notifications/', ParametresNotificationsAPIView.as_view(), name='parametres-notifications'),
    path('media-prive/candidat/<int:candidat_id>/<str:type_fichier>/', CandidatFichierPriveAPIView.as_view(), name='candidat-fichier-prive'),

    # Recruteur
    path('dashboard/', DashboardRecruteurAPIView.as_view(), name='dashboard-recruteur'),
    path('entreprise/update/', UpdateProfilEntrepriseAPIView.as_view(), name='update-entreprise'),
    path('entreprise/photos/', EntreprisePhotosAPIView.as_view(), name='entreprise-photos'),
    path('entreprise/photos/<int:photo_id>/', EntreprisePhotosAPIView.as_view(), name='entreprise-photo-delete'),
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
    path('admin/premium/plans/', PremiumPlansAdminAPIView.as_view(), name='admin-premium-plans'),
    path('admin/premium/plans/<int:pk>/', PremiumPlansAdminAPIView.as_view(), name='admin-premium-plan-detail'),
    path('admin/premium/avantages/', PremiumAvantagesAdminAPIView.as_view(), name='admin-premium-avantages'),
    path('admin/premium/avantages/<int:pk>/', PremiumAvantagesAdminAPIView.as_view(), name='admin-premium-avantage-detail'),
    path('premium/plans/', PremiumPlansPublicAPIView.as_view(), name='premium-plans-public'),
    path('premium/avantages/', PremiumAvantagesPublicAPIView.as_view(), name='premium-avantages-public'),
    path('admin/paliers/', PaliersAdminAPIView.as_view(), name='admin-paliers'),
    path('admin/paliers/<int:pk>/', PaliersAdminAPIView.as_view(), name='admin-palier-detail'),
    path('paliers/', PaliersPublicAPIView.as_view(), name='paliers-public'),
    path('admin/faq/', FaqAdminAPIView.as_view(), name='admin-faq'),
    path('admin/faq/<int:pk>/', FaqAdminAPIView.as_view(), name='admin-faq-detail'),
    path('faq/', FaqPublicAPIView.as_view(), name='faq-public'),
    path('admin/competences/', CompetencesAdminAPIView.as_view(), name='admin-competences'),
    path('admin/competences/<int:pk>/', CompetencesAdminAPIView.as_view(), name='admin-competence-detail'),
    path('competences/', CompetencesAutocompleteAPIView.as_view(), name='competences-autocomplete'),
    path('admin/articles/', ArticleAdminAPIView.as_view(), name='admin-articles'),
    path('admin/articles/<int:pk>/', ArticleAdminDetailAPIView.as_view(), name='admin-article-detail'),
    path('admin/articles-categories/', ArticleCategoriesAdminAPIView.as_view(), name='admin-articles-categories'),
    path('admin/articles-categories/<int:pk>/', ArticleCategoriesAdminAPIView.as_view(), name='admin-articles-category-detail'),
    path('articles/', ArticleListPublicAPIView.as_view(), name='articles-public'),
    path('articles/categories/', ArticleCategoriesPublicAPIView.as_view(), name='articles-categories-public'),
    path('articles/<slug:slug>/', ArticleDetailPublicAPIView.as_view(), name='article-detail-public'),
    path('admin/site-annonce/', SiteAnnonceAdminAPIView.as_view(), name='admin-site-annonce'),
    path('admin/site-annonce/<int:pk>/', SiteAnnonceAdminAPIView.as_view(), name='admin-site-annonce-detail'),
    path('admin/bannieres-accueil/', BanniereAccueilAdminAPIView.as_view(), name='admin-bannieres-accueil'),
    path('admin/bannieres-accueil/<int:pk>/', BanniereAccueilAdminAPIView.as_view(), name='admin-banniere-accueil-detail'),
    path('site-annonce/', SiteAnnoncePublicAPIView.as_view(), name='site-annonce-public'),
    path('bannieres-accueil/', BanniereAccueilPublicAPIView.as_view(), name='bannieres-accueil-public'),
    path('admin/pages/', PageStatiqueAdminAPIView.as_view(), name='admin-pages'),
    path('admin/pages/<int:pk>/', PageStatiqueAdminAPIView.as_view(), name='admin-page-detail'),
    path('pages/<slug:slug>/', PageStatiquePublicAPIView.as_view(), name='page-statique-public'),
    path('admin/ai-config/', AIConfigAdminAPIView.as_view(), name='admin-ai-config'),

    # Nouveau tableau de bord candidat
    path('score-profil/', ScoreProfilAPIView.as_view(), name='score-profil'),
    path('conseils-personnalises/', ConseilsPersonnalisesIAAPIView.as_view(), name='conseils-personnalises'),
    path('mes-competences/', CompetenceCandidatAPIView.as_view(), name='mes-competences'),
    path('types-documents/', TypeDocumentPublicAPIView.as_view(), name='types-documents-public'),
    path('mes-documents/', DocumentCandidatAPIView.as_view(), name='mes-documents'),
    path('rendez-vous/disponibilites/', DisponibilitesAPIView.as_view(), name='rdv-disponibilites'),
    path('rendez-vous/', RendezVousAPIView.as_view(), name='rendez-vous'),
    path('rendez-vous/<int:pk>/annuler/', RendezVousAnnulerAPIView.as_view(), name='rdv-annuler'),
    path('activite-profil/', ActiviteProfilAPIView.as_view(), name='activite-profil'),
    path('admin/rendez-vous/config/', ConfigRendezVousAdminAPIView.as_view(), name='admin-rdv-config'),
    path('admin/rendez-vous/disponibilites/', DisponibiliteRecurrenteAdminAPIView.as_view(), name='admin-rdv-disponibilites'),
    path('admin/rendez-vous/disponibilites/<int:pk>/', DisponibiliteRecurrenteAdminAPIView.as_view(), name='admin-rdv-disponibilite-detail'),
    path('admin/rendez-vous/jours-bloques/', JourBloqueAdminAPIView.as_view(), name='admin-rdv-jours-bloques'),
    path('admin/rendez-vous/jours-bloques/<int:pk>/', JourBloqueAdminAPIView.as_view(), name='admin-rdv-jour-bloque-detail'),
    path('admin/rendez-vous/', RendezVousAdminListAPIView.as_view(), name='admin-rendez-vous'),
    path('admin/rendez-vous/<int:pk>/', RendezVousAdminListAPIView.as_view(), name='admin-rendez-vous-detail'),
    path('admin/types-documents/', TypeDocumentAdminAPIView.as_view(), name='admin-types-documents'),
    path('admin/types-documents/<int:pk>/', TypeDocumentAdminAPIView.as_view(), name='admin-type-document-detail'),

    # IA
    path('recommandations/', OffresRecommandeesAPIView.as_view(), name='recommandations'),
    path('parser-cv/', ParserCVAPIView.as_view(), name='parser-cv'),
    path('metiers/', MetierReferentielAPIView.as_view(), name='metiers'),
    path('suggestions-carriere/', SuggestionsCarriereAPIView.as_view(), name='suggestions-carriere'),
    path('analyse-carriere/', AnalyseCarriereGroqAPIView.as_view(), name='analyse-carriere'),

    # ⚠️ Doit rester en DERNIER : capture tout segment unique restant (id numérique ou
    # code_public SEO). Placé avant, il intercepterait à tort les routes littérales
    # ci-dessus (constants/, entreprises/, metiers/, etc.) puisque <str:...> matche
    # n'importe quel segment non-slash, contrairement à l'ancien <int:...>.
    path('<str:offre_id>/', JobDetailAPIView.as_view(), name='job-detail'),
]