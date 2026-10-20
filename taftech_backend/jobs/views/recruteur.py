"""Module de compatibilité : réexporte les vues recruteur, désormais réparties dans les modules recruteur_*.py."""
from .recruteur_dashboard import (
    ActiviteRecenteAPIView,
    DashboardRecruteurAPIView,
    RecherchesSauvegardeesAPIView,
    _calculer_kpis_periode,
    _offres_sans_candidats_si_non_validee,
    _phrase_activite,
)
from .recruteur_exports import (
    ExportCandidaturesExcelAPIView,
    ExportCandidaturesOffreExcelAPIView,
    ExportGraphiqueExcelAPIView,
    RapportDashboardPDFAPIView,
    _colonnes_et_lignes_candidatures,
)
from .recruteur_entreprise import (
    EntreprisePhotosAPIView,
    ParametresRecruteurAPIView,
    UpdateProfilEntrepriseAPIView,
)
from .recruteur_cvtheque import (
    CVThequeView,
    CVthequePagination,
    CandidatsRecommandesAPIView,
    InviterCandidatCVThequeAPIView,
    StatistiquesAvanceesAPIView,
    ToggleFavoriCVAPIView,
    _score_ou_zero,
)
from .recruteur_spontanees import (
    EnvoyerCandidatureSpontaneeAPIView,
    ListeCandidaturesSpontaneesAPIView,
    MarquerSpontaneeLueAPIView,
    SupprimerSpontaneeAPIView,
)
from .recruteur_questionnaires import (
    QuestionnaireDetailAPIView,
    QuestionnaireListCreateAPIView,
)
from .recruteur_paiements import (
    ChargilyCheckoutPalierAPIView,
    ChargilyWebhookAPIView,
    DemanderActivationPremiumAPIView,
    EnvoyerRecuPremiumAPIView,
    MonAbonnementAPIView,
)
