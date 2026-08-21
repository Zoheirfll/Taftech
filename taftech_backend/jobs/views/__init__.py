from .notifications import (
    NotificationListAPIView,
    MarkNotificationReadAPIView,
    PublicStatsAPIView,
    StatsGeoAPIView,
    EntrepriseListAPIView,
    EntrepriseDetailAPIView,
)
from .offres import (
    JobListAPIView,
    JobDetailAPIView,
    JobCreateAPIView,
    UpdateOffreRecruteurAPIView,
    CloturerOffreAPIView,
    SupprimerOffreAPIView,
    ConstantsAPIView,
    NomenclatureAPIView,
)
from .profils import (
    ProfilCandidatAPIView,
    ExperienceAPIView,
    ExperienceDetailAPIView,
    FormationAPIView,
    FormationDetailAPIView,
    OffreSauvegardeeListCreateAPIView,
    OffreSauvegardeeDeleteAPIView,
    AlerteEmploiListCreateAPIView,
    AlerteEmploiDetailAPIView,
    ParametresNotificationsAPIView,
    CandidatFichierPriveAPIView,
)
from .candidatures import (
    PostulerAPIView,
    PostulerRapideAPIView,
    MesCandidaturesAPIView,
    UpdateCandidatureStatusAPIView,
    DeleteCandidatureAPIView,
    EvaluerCandidatureAPIView,
    Top5CandidatsAPIView,
    CandidatureMarquerConsulteeAPIView,
)
from .recruteur import (
    DashboardRecruteurAPIView,
    UpdateProfilEntrepriseAPIView,
    EntreprisePhotosAPIView,
    ParametresRecruteurAPIView,
    CVThequeView,
    ToggleFavoriCVAPIView,
    EnvoyerCandidatureSpontaneeAPIView,
    ListeCandidaturesSpontaneesAPIView,
    MarquerSpontaneeLueAPIView,
    SupprimerSpontaneeAPIView,
    QuestionnaireListCreateAPIView,
    QuestionnaireDetailAPIView,
    DemanderActivationPremiumAPIView,
    EnvoyerRecuPremiumAPIView,
    ChargilyCheckoutAPIView,
    ChargilyWebhookAPIView,
    ExportCandidaturesOffreExcelAPIView,
    ExportCandidaturesExcelAPIView,
)
from .admin import (
    AdminPagination,
    AdminOffresListAPIView,
    AdminOffreModerateAPIView,
    AdminEntreprisesListAPIView,
    AdminEntrepriseModerateAPIView,
    AdminStatsAPIView,
    AdminUsersListAPIView,
    AdminUserModerateAPIView,
    AdminBroadcastEmailAPIView,
    AdminCandidaturesListAPIView,
    ExportCandidaturesCSVAPIView,
    ExportEntreprisesCSVAPIView,
    ExportOffresCSVAPIView,
    ExportUtilisateursCSVAPIView,
    AdminMarcheAPIView,
    AdminAuditLogAPIView,
    AdminDemandesPremiumAPIView,
    AdminCompteAdminsAPIView,
)
from .ia import (
    OffresRecommandeesAPIView,
    ParserCVAPIView,
    MetierReferentielAPIView,
    MetierReferentielAdminAPIView,
    SuggestionsCarriereAPIView,
    AnalyseCarriereGroqAPIView,
    AnalyseGroqRecruteurAPIView,
    GenererOffreIAAPIView,
)
from .bulletin import GenererBulletinPDFAPIView
from .equipe import (
    EquipeAPIView,
    InviterMembreAPIView,
    AccepterInvitationAPIView,
    EquipeAuditLogAPIView,
)
from .premium_admin import (
    PremiumPlansPublicAPIView,
    PremiumAvantagesPublicAPIView,
    PremiumPlansAdminAPIView,
    PremiumAvantagesAdminAPIView,
    FaqPublicAPIView,
    FaqAdminAPIView,
    CompetencesAutocompleteAPIView,
    CompetencesAdminAPIView,
)
from .articles import (
    ArticleListPublicAPIView,
    ArticleDetailPublicAPIView,
    ArticleCategoriesPublicAPIView,
    ArticleAdminAPIView,
    ArticleAdminDetailAPIView,
    ArticleCategoriesAdminAPIView,
)
from .banners import (
    SiteAnnoncePublicAPIView,
    BanniereAccueilPublicAPIView,
    SiteAnnonceAdminAPIView,
    BanniereAccueilAdminAPIView,
)
from .pages import (
    PageStatiquePublicAPIView,
    PageStatiqueAdminAPIView,
)
from .ai_config import AIConfigAdminAPIView
from .candidat_dashboard import (
    ScoreProfilAPIView,
    ConseilsPersonnalisesIAAPIView,
    CompetenceCandidatAPIView,
    TypeDocumentPublicAPIView,
    DocumentCandidatAPIView,
    DisponibilitesAPIView,
    RendezVousAPIView,
    RendezVousAnnulerAPIView,
    ActiviteProfilAPIView,
    ConfigRendezVousAdminAPIView,
    DisponibiliteRecurrenteAdminAPIView,
    JourBloqueAdminAPIView,
    RendezVousAdminListAPIView,
    TypeDocumentAdminAPIView,
)
from .profils import AlerteMarquerVueAPIView