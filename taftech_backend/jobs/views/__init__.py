from .notifications import (
    NotificationListAPIView,
    MarkNotificationReadAPIView,
    PublicStatsAPIView,
    EntrepriseListAPIView,
    EntrepriseDetailAPIView,
)
from .offres import (
    JobListAPIView,
    JobDetailAPIView,
    JobCreateAPIView,
    UpdateOffreRecruteurAPIView,
    CloturerOffreAPIView,
    ConstantsAPIView,
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
)
from .candidatures import (
    PostulerAPIView,
    PostulerRapideAPIView,
    MesCandidaturesAPIView,
    UpdateCandidatureStatusAPIView,
    DeleteCandidatureAPIView,
    EvaluerCandidatureAPIView,
    Top5CandidatsAPIView,
)
from .recruteur import (
    DashboardRecruteurAPIView,
    UpdateProfilEntrepriseAPIView,
    ParametresRecruteurAPIView,
    CVThequeView,
    ToggleFavoriCVAPIView,
    EnvoyerCandidatureSpontaneeAPIView,
    ListeCandidaturesSpontaneesAPIView,
    MarquerSpontaneeLueAPIView,
    SupprimerSpontaneeAPIView,
    QuestionnaireListCreateAPIView,
    QuestionnaireDetailAPIView,
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
)
from .ia import (
    OffresRecommandeesAPIView,
    ParserCVAPIView,
    MetierReferentielAPIView,
    MetierReferentielAdminAPIView,
    SuggestionsCarriereAPIView,
    AnalyseCarriereGroqAPIView,
    AnalyseGroqRecruteurAPIView,
)
from .bulletin import GenererBulletinPDFAPIView