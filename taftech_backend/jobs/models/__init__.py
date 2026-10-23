"""Package des modèles de l'app jobs : réexporte tous les modèles pour que `from jobs.models import X` continue de fonctionner."""
from .entreprise import (ProfilEntreprise, EntreprisePhoto)
from .referentiel import (Scolarite, Source, TypeDiplome, DomaineFormation, FiliereFormation, SpecialiteFormation, DiplomeSpecialite, AliasDiplome, AliasSpecialite, GroupeMetier, Metier, Appellation, ProfilSuggestion, MetierCompetence, MetierFormation, RelationMetier, RelationSpecialite, ParametreMatching, CompetenceReferentiel)
from .offres import (OffreEmploi, ExigenceImperative, CompetenceOffre, OffreSauvegardee, AlerteEmploi)
from .candidatures import (Candidature, ReponseExigence, CandidatureSpontanee, Questionnaire, QuestionQuestionnaire, ReponseChoix, ReponseCandidat)
from .profils import (ProfilCandidat, ExperienceCandidat, FormationCandidat, ProfilCandidatFavori, CompetenceCandidat, TypeDocument, DocumentCandidat, PartageDocument)
from .notifications import (Notification, ActiviteProfil)
from .equipe import (AuditLog, MembreEquipe, InvitationEquipe, EquipeActionLog)
from .abonnements import (DemandeActivationPremium, Palier, AbonnementEntreprise, MentionsLegalesEntreprise, PaiementAbonnement, TelechargementCV, CreditPack, AccesCandidatDebloque, PaiementCreditPack, ICONES_CHOICES)
from .ia import (AIConfig, UtilisationIA, ParsingCV, CorrectionParsing, QuotaIAOverride)
from .cms import (PageStatique, SiteAnnonce, BanniereAccueil, ArticleCategorie, Article, FaqItem)
from .proposition_metier import PropositionMetier
from .demande_ajout import ArriveeDemandeur, DemandeAjout
from .rendezvous import (ConfigRendezVous, DisponibiliteRecurrente, JourBloque, RendezVous)
from .cvtheque import (InvitationCVTheque, RechercheSauvegardee)
