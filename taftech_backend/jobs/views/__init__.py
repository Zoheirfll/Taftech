from .notifications import (
    NotificationListAPIView,
    MarkNotificationReadAPIView,
    MarkAllNotificationsReadAPIView,
    DeleteNotificationAPIView,
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
    NomenclatureFormationAPIView,
    SuggererDiplomeAPIView,
    MetierAutocompleteAPIView,
    MetierSuggestionsAPIView,
    RechercheUniverselleAPIView,
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
    MettreAJourReponseExigenceAPIView,
)
from .recruteur import (
    DashboardRecruteurAPIView,
    ActiviteRecenteAPIView,
    RecherchesSauvegardeesAPIView,
    RapportDashboardPDFAPIView,
    UpdateProfilEntrepriseAPIView,
    EntreprisePhotosAPIView,
    ParametresRecruteurAPIView,
    CVThequeView,
    CandidatsRecommandesAPIView,
    StatistiquesAvanceesAPIView,
    InviterCandidatCVThequeAPIView,
    ToggleFavoriCVAPIView,
    EnvoyerCandidatureSpontaneeAPIView,
    ListeCandidaturesSpontaneesAPIView,
    MarquerSpontaneeLueAPIView,
    SupprimerSpontaneeAPIView,
    QuestionnaireListCreateAPIView,
    QuestionnaireDetailAPIView,
    DemanderActivationPremiumAPIView,
    EnvoyerRecuPremiumAPIView,
    ChargilyCheckoutPalierAPIView,
    ChargilyWebhookAPIView,
    MonAbonnementAPIView,
    ExportCandidaturesOffreExcelAPIView,
    ExportCandidaturesExcelAPIView,
    ExportGraphiqueExcelAPIView,
)
from .admin import (
    AdminPagination,
    AdminOffresListAPIView,
    AdminOffreModerateAPIView,
    AdminEntreprisesListAPIView,
    AdminEntrepriseModerateAPIView,
    AdminStatsAPIView,
    AdminSeoStatsAPIView,
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
    AnalyseCarriereGroqAPIView,
    AnalyseGroqRecruteurAPIView,
    GenererOffreIAAPIView,
    QuotaIAAffichageAPIView,
)
from .bulletin import GenererBulletinPDFAPIView
from .equipe import (
    EquipeAPIView,
    InviterMembreAPIView,
    AccepterInvitationAPIView,
    EquipeAuditLogAPIView,
)
from .premium_admin import (
    FaqPublicAPIView,
    FaqAdminAPIView,
    CompetencesAutocompleteAPIView,
    CompetencesAdminAPIView,
)
from .paliers_admin import (
    PaliersPublicAPIView,
    PaliersAdminAPIView,
)
from .credits import (
    DeverrouillerCandidatAPIView,
    CreditPackCheckoutAPIView,
    CreditPackPublicAPIView,
    CreditPackAdminAPIView,
    CandidatDocumentsPartagesAPIView,
    CandidatDocumentPartageFichierAPIView,
)
from .facturation import (
    FacturesListAPIView,
    FacturePDFAPIView,
    MentionsLegalesAdminAPIView,
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
    PageStatiqueListePublicAPIView,
)
from .ai_config import AIConfigAdminAPIView, QuotaIAOverridesAPIView, QuotaIAUsageAPIView
from .candidat_dashboard import (
    ScoreProfilAPIView,
    MetiersAccessiblesAPIView,
    ConseilsPersonnalisesIAAPIView,
    CompetenceCandidatAPIView,
    TypeDocumentPublicAPIView,
    DocumentCandidatAPIView,
    DocumentEntreprisesEligiblesAPIView,
    DocumentPartagerAPIView,
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
from .referentiel_admin import (
    AdminReferentielMetiersAPIView,
    AdminReferentielSpecialitesAPIView,
    AdminReferentielDiplomesAPIView,
    AdminRelationsSimilaireAPIView,
    AdminRelationsSpecialiteAPIView,
    AdminFormationsAVerifierAPIView,
)