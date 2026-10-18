import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import RouteTitle from "./Components/RouteTitle";
import Analytics from "./Components/Analytics";
import CookieBanner from "./Components/CookieBanner";
import { tw } from "./theme";
import OfflineBanner from "./Components/OfflineBanner";
import { ConfirmModalHost } from "./utils/confirmToast";
import SiteAnnonceBar from "./Components/SiteAnnonceBar";
import { ShieldOff } from "lucide-react";

import ErrorBoundary from "./utils/ErrorBoundary";
import { authService } from "./Services/authService";

const RoleGuard = ({ minRole, children }) => {
  if (!authService.peutFaire(minRole)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <ShieldOff size={40} className="text-slate-300" />
        <h2 className="text-xl font-bold text-slate-700">Accès restreint</h2>
        <p className="text-sm text-slate-700">
          Votre rôle dans cette équipe ne vous permet pas d'accéder à cette page.
        </p>
      </div>
    );
  }
  return children;
};

// Redirige hors des pages guest (login, register…) seulement si déjà connecté
// SUR CE MÊME portail — sinon on laisse la page de login s'afficher, pour
// permettre à un membre d'équipe connecté côté candidat de s'authentifier
// explicitement côté recruteur (et vice versa).
const GuestRoute = ({ children, portal = "candidat" }) => {
  const role = authService.getUserRole();
  const loginPortal = authService.getLoginPortal();
  if (!role) return children;
  if (role === "ADMIN") {
    return <Navigate to="/admin-taftech" replace />;
  }
  if (loginPortal === portal) {
    return <Navigate to={portal === "recruteur" ? "/dashboard" : "/dashboard-candidat"} replace />;
  }
  return children;
};

// Réserve l'espace candidat aux comptes connectés VIA le portail candidat.
// Un membre d'équipe (compte CANDIDAT) connecté via le portail recruteur n'y a pas accès :
// l'accès dépend du portail de connexion choisi, pas seulement du rôle.
// Important : si loginPortal est absent (session ouverte avant cette fonctionnalité,
// ou données corrompues), on renvoie vers /login pour forcer une reconnexion propre —
// jamais vers /dashboard, sous peine de boucle infinie avec RecruteurRoute.
const CandidatRoute = ({ children }) => {
  const role = authService.getUserRole();
  const portal = authService.getLoginPortal();
  if (!role) return <Navigate to="/login" replace />;
  if (role === "ADMIN") return <Navigate to="/admin-taftech" replace />;
  if (portal === "recruteur") return <Navigate to="/dashboard" replace />;
  if (portal !== "candidat") return <Navigate to="/login" replace />;
  return children;
};

// Réserve l'espace recruteur aux comptes connectés VIA le portail recruteur.
// Même précaution que CandidatRoute : portail absent → /recruteurs/connexion, jamais /profil.
const RecruteurRoute = ({ children }) => {
  const role = authService.getUserRole();
  const portal = authService.getLoginPortal();
  if (!role) return <Navigate to="/recruteurs/connexion" replace />;
  if (role === "ADMIN") return <Navigate to="/admin-taftech" replace />;
  if (portal === "candidat") return <Navigate to="/dashboard-candidat" replace />;
  if (portal !== "recruteur") return <Navigate to="/recruteurs/connexion" replace />;
  return children;
};

// Réserve la zone admin — n'existait pas du tout côté frontend jusqu'ici.
const AdminRoute = ({ children }) => {
  const role = authService.getUserRole();
  if (!role) return <Navigate to="/login" replace />;
  if (role !== "ADMIN") {
    const portal = authService.getLoginPortal();
    return <Navigate to={portal === "recruteur" ? "/dashboard" : "/dashboard-candidat"} replace />;
  }
  return children;
};

// Components & Layouts — chargés immédiatement (présents sur toutes les pages)
import Navbar from "./Components/Navbar";
import NavbarRecruteur from "./Components/NavbarRecruteur";
import Footer from "./Components/Footer";
import FooterRecruteur from "./Components/FooterRecruteur";
import BottomNavCandidat from "./Components/BottomNavCandidat";
import BottomNavGuest from "./Components/BottomNavGuest";
import BottomNavRecruteur from "./Components/BottomNavRecruteur";

// Layouts — chargés immédiatement (enveloppes de routes)
import CandidatLayout from "./Pages/Candidat/CandidatLayout";
import RecruteurLayout from "./Pages/Recruteur/RecruteurLayout";
import EntrepriseValideeGuard from "./Pages/Recruteur/EntrepriseValideeGuard";
import PalierRequisGuard from "./Pages/Recruteur/PalierRequisGuard";
const AdminLayout = lazy(() => import("./Pages/Admin/AdminLayout"));

// Pages Publiques — visibles sans connexion, on garde quelques-unes immédiates
import Home from "./Pages/Public/Home";
import JobsList from "./Pages/Public/JobsList";
import JobDetail from "./Pages/Public/JobDetail";
import Login from "./Pages/Auth/Login";
import LoginRecruteur from "./Pages/Recruteur/Portal/LoginRecruteur";

// Pages lazy — chargées à la demande
const Entreprises        = lazy(() => import("./Pages/Public/Entreprises"));
const ContactezNous = lazy(() => import("./Pages/Public/ContactezNous"));
const MentionsLegales = lazy(() => import("./Pages/Public/MentionsLegales"));
const PageStatiqueGenerique = lazy(() => import("./Pages/Public/PageStatiqueGenerique"));
const NotFound = lazy(() => import("./Pages/Public/NotFound"));
const QuiSommesNous = lazy(() => import("./Pages/Public/QuiSommesNous"));
const EntreprisePublic   = lazy(() => import("./Pages/Recruteur/EntreprisePublic"));
const OffresParRegion    = lazy(() => import("./Pages/Public/OffresParRegion"));
const OffresParSecteur   = lazy(() => import("./Pages/Public/OffresParSecteur"));
const SecteurDetail      = lazy(() => import("./Pages/Public/SecteurDetail"));
const RegionDetail       = lazy(() => import("./Pages/Public/RegionDetail"));
const RegisterCandidat   = lazy(() => import("./Pages/Auth/RegisterCandidat"));
const RegisterRecruteur  = lazy(() => import("./Pages/Auth/RegisterRecruteur"));
const ForgotPassword     = lazy(() => import("./Pages/Auth/ForgotPassword"));
const ResetPassword      = lazy(() => import("./Pages/Auth/ResetPassword"));

// Portail Recruteur
const LandingRecruteur          = lazy(() => import("./Pages/Recruteur/Portal/LandingRecruteur"));
const PremiumSuccessPage        = lazy(() => import("./Pages/Recruteur/Portal/PremiumSuccessPage"));
const ForgotPasswordRecruteur   = lazy(() => import("./Pages/Recruteur/Portal/ForgotPasswordRecruteur"));
const AccepterInvitation = lazy(() => import("./Pages/Recruteur/AccepterInvitation"));

// Espace Recruteur connecté
const CreateJob              = lazy(() => import("./Pages/Recruteur/CreateJob"));
const DashboardRecruteur     = lazy(() => import("./Pages/Recruteur/DashboardRecruteur"));
const GestionOffre           = lazy(() => import("./Pages/Recruteur/GestionOffre/index"));
const CVTheque               = lazy(() => import("./Pages/Recruteur/CVTheque"));
const CandidaturesSpontanees = lazy(() => import("./Pages/Recruteur/CandidaturesSpontanees"));
const NotificationsRecruteur = lazy(() => import("./Pages/Recruteur/NotificationsRecruteur"));
const Questionnaires         = lazy(() => import("./Pages/Recruteur/Questionnaires"));
const ParametresRecruteur    = lazy(() => import("./Pages/Recruteur/ParametresRecruteur"));
const ReviewCandidature      = lazy(() => import("./Pages/Recruteur/ReviewCandidature"));
const OnboardingWizard       = lazy(() => import("./Pages/Candidat/Onboarding/OnboardingWizard"));
const MonEquipe              = lazy(() => import("./Pages/Recruteur/MonEquipe"));
const AbonnementsPage        = lazy(() => import("./Pages/Recruteur/AbonnementsPage"));
const OffresListPage         = lazy(() => import("./Pages/Recruteur/OffresListPage"));
const CandidaturesListPage   = lazy(() => import("./Pages/Recruteur/CandidaturesListPage"));
const RecrutementsPage       = lazy(() => import("./Pages/Recruteur/RecrutementsPage"));
const CandidatsRecommandesPage = lazy(() => import("./Pages/Recruteur/CandidatsRecommandesPage"));
const StatistiquesPage       = lazy(() => import("./Pages/Recruteur/StatistiquesPage"));
const CommentFonctionneMatching = lazy(() => import("./Pages/Recruteur/CommentFonctionneMatching"));
const CommentFonctionnentCredits = lazy(() => import("./Pages/Recruteur/CommentFonctionnentCredits"));
const ComprendreMesScores = lazy(() => import("./Pages/Candidat/ComprendreMesScores"));
const ConfidentialiteRecruteurs = lazy(() => import("./Pages/Candidat/ConfidentialiteRecruteurs"));
const EvaluationsPage        = lazy(() => import("./Pages/Recruteur/EvaluationsPage"));
const ActiviteCompletePage   = lazy(() => import("./Pages/Recruteur/ActiviteCompletePage"));
const EntretiensPage         = lazy(() => import("./Pages/Recruteur/EntretiensPage"));
const FacturationPage        = lazy(() => import("./Pages/Recruteur/FacturationPage"));

// Espace Candidat
const CandidatDashboard = lazy(() => import("./Pages/Candidat/CandidatDashboard"));
const ProfilCandidat    = lazy(() => import("./Pages/Candidat/ProfilCandidat/index"));
const MesCandidatures   = lazy(() => import("./Pages/Candidat/MesCandidatures"));
const BoiteReception    = lazy(() => import("./Pages/Candidat/BoiteReception"));
const Settings          = lazy(() => import("./Pages/Candidat/Settings"));
const AlertesEmploi     = lazy(() => import("./Pages/Candidat/AlertesEmploi"));
const OffresSauvegardees = lazy(() => import("./Pages/Candidat/OffresSauvegardees"));
const SuggestionsCarriere = lazy(() => import("./Pages/Candidat/SuggestionsCarriere"));
const MesCompetences    = lazy(() => import("./Pages/Candidat/MesCompetences"));
const MesDocuments      = lazy(() => import("./Pages/Candidat/MesDocuments"));
const PrendreRendezVous = lazy(() => import("./Pages/Candidat/PrendreRendezVous"));

// Admin
const AdminEntreprises  = lazy(() => import("./Pages/Admin/AdminEntreprises"));
const AdminOffres       = lazy(() => import("./Pages/Admin/AdminOffres"));
const AdminStatistiques = lazy(() => import("./Pages/Admin/AdminStatistiques"));
const AdminStatsPeriode = lazy(() => import("./Pages/Admin/AdminStatsPeriode"));
const Merci = lazy(() => import("./Pages/Public/Merci"));
const AdminUsers        = lazy(() => import("./Pages/Admin/AdminUsers"));
const AdminBroadcast    = lazy(() => import("./Pages/admin/AdminBroadcast"));
const Blog              = lazy(() => import("./Pages/Public/Blog"));
const ArticleDetail     = lazy(() => import("./Pages/Public/ArticleDetail"));
const AdminReferentielV2 = lazy(() => import("./Pages/Admin/AdminReferentielV2"));
const AdminMentionsLegales = lazy(() => import("./Pages/Admin/AdminMentionsLegales"));
const AdminFaq          = lazy(() => import("./Pages/Admin/AdminFaq"));
const AdminCompetences  = lazy(() => import("./Pages/Admin/AdminCompetences"));
const AdminArticles     = lazy(() => import("./Pages/Admin/AdminArticles"));
const AdminBannieres    = lazy(() => import("./Pages/Admin/AdminBannieres"));
const AdminPages        = lazy(() => import("./Pages/Admin/AdminPages"));
const AdminSeo          = lazy(() => import("./Pages/Admin/AdminSeo"));
const AdminRendezVous   = lazy(() => import("./Pages/Admin/AdminRendezVous"));
const AdminAbonnementsIA = lazy(() => import("./Pages/Admin/AdminAbonnementsIA"));
const AdminQualiteIA = lazy(() => import("./Pages/Admin/AdminQualiteIA"));
const AdminTypesDocuments = lazy(() => import("./Pages/Admin/AdminTypesDocuments"));
const AdminAuditLogs    = lazy(() => import("./Pages/Admin/AdminAuditLogs"));
const AdminComptes      = lazy(() => import("./Pages/Admin/AdminComptes"));
const AdminCandidatures = lazy(() => import("./Pages/Admin/AdminCandidatures"));
const AdminSystemLogs   = lazy(() => import("./Pages/Admin/AdminSystemLogs"));
const AdminDemandesPremium = lazy(() => import("./Pages/Admin/AdminDemandesPremium"));

if (import.meta.env.MODE === "production") {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

// Fond de chargement global pendant le chargement différé d'une page : squelette de page (titre,
// texte, cartes) plutôt qu'un cercle seul, pour que l'écran ne « saute » pas à l'arrivée du contenu.
const PageLoader = () => (
  <div role="status" aria-label="Chargement de la page" className="max-w-6xl mx-auto px-4 md:px-6 py-8 min-h-[60vh] animate-pulse space-y-6">
    <div className={`h-8 w-1/3 ${tw.surfaceSubtle} rounded-lg`} />
    <div className={`h-4 w-2/3 ${tw.surfaceSubtle} rounded`} />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`h-40 ${tw.surfaceSubtle} rounded-2xl`} />
      ))}
    </div>
  </div>
);

// Routes recruteur — portail séparé (navbar teal)
const RECRUTEUR_PREFIX_PATHS = [
  "/recruteurs",
  "/dashboard",
  "/creer-offre",
  "/cvtheque",
  "/candidatures-spontanees",
  "/questionnaires",
  "/mon-equipe",
];
const RECRUTEUR_EXACT_PATHS = ["/parametres"];

const isRecruteurRoute = (pathname) =>
  RECRUTEUR_EXACT_PATHS.includes(pathname) ||
  RECRUTEUR_PREFIX_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

// Routes partagées (accessibles aux candidats ET recruteurs) : le navbar affiché
// dépend alors de qui consulte la page, pas du chemin seul (ex: /offres, /jobs/:id,
// /entreprise/:slug, /entreprises, /regions, /secteurs, /).
const isAdminRoute = (pathname) => pathname.startsWith("/admin-taftech");

function AppContent() {
  const location = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const role = authService.getUserRole();
  const portal = authService.getLoginPortal();
  // Un ADMIN n'est ni recruteur ni membre d'équipe — il ne doit basculer sur la navbar
  // recruteur (NavbarRecruteur, dont la plupart des liens sont gatés par isRecruteurOuMembre())
  // que sur les vraies routes recruteur (déjà couvert par isRecruteurRoute ci-dessous), jamais
  // par défaut sur les pages publiques partagées (blog, offres, entreprises...).
  const estRecruteurConnecte = !!role && portal === "recruteur";
  const forcePortalParam = new URLSearchParams(location.search).get("portail");
  const recruteurPortal =
    !isAdminRoute(location.pathname) &&
    (isRecruteurRoute(location.pathname) || estRecruteurConnecte || forcePortalParam === "recruteur");

  const isLogged = authService.isAuthenticated();
  const isAdminPath = isAdminRoute(location.pathname);
  const showBottomNavCandidat = role === "CANDIDAT" && !recruteurPortal && !isAdminPath;
  const showBottomNavGuest = !isLogged && !recruteurPortal && !isAdminPath;
  const showBottomNavRecruteur =
    recruteurPortal && !isAdminPath && isLogged && authService.isRecruteurOuMembre();
  const showAnyBottomNav = showBottomNavCandidat || showBottomNavGuest || showBottomNavRecruteur;

  React.useEffect(() => {
    document.documentElement.classList.toggle("portal-recruteur", recruteurPortal && !isAdminPath);
  }, [recruteurPortal, isAdminPath]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <RouteTitle />
      <Analytics />
      <CookieBanner />
      <OfflineBanner />
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: { fontWeight: "bold", borderRadius: "10px" },
        }}
      />
      <ConfirmModalHost />

      {!isAdminPath && <SiteAnnonceBar />}
      {/* Le panel admin a sa propre barre latérale (avec déconnexion) : ni barre ni pied de page publics. */}
      {!isAdminPath && (recruteurPortal ? <NavbarRecruteur /> : <Navbar />)}

      <main className={`grow ${showAnyBottomNav ? "pb-16 md:pb-0" : ""}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ROUTES PUBLIQUES */}
            <Route path="/" element={<Home />} />
            <Route path="/offres" element={<JobsList />} />
            <Route path="/entreprises" element={<Entreprises />} />
            <Route path="/confidentialite" element={<PageStatiqueGenerique slugFixe="confidentialite" />} />
            <Route path="/contact" element={<ContactezNous />} />
            <Route path="/merci" element={<Merci />} />
            <Route path="/cgu" element={<PageStatiqueGenerique slugFixe="cgu" />} />
            <Route path="/mentions-legales" element={<MentionsLegales />} />
            <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
            <Route path="/pages/:slug" element={<PageStatiqueGenerique />} />
            <Route path="/regions" element={<OffresParRegion />} />
            <Route path="/regions/:slug" element={<RegionDetail />} />
            <Route path="/secteurs" element={<OffresParSecteur />} />
            <Route path="/secteurs/:slug" element={<SecteurDetail />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<ArticleDetail />} />
            <Route path="/register" element={<GuestRoute><RegisterCandidat /></GuestRoute>} />
            <Route path="/register-entreprise" element={<GuestRoute><RegisterRecruteur /></GuestRoute>} />
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/jobs/:idSlug" element={<JobDetail />} />
            <Route path="/entreprises/:entrepriseSlug/offres-d-emploi/:secteurSlug/:titreCode" element={<JobDetail />} />
            <Route path="/entreprise/:slug" element={<EntreprisePublic />} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
            <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />

            {/* PORTAIL RECRUTEUR */}
            <Route path="/recruteurs" element={<LandingRecruteur />} />
            <Route path="/recruteurs/connexion" element={<GuestRoute portal="recruteur"><LoginRecruteur /></GuestRoute>} />
            <Route path="/recruteurs/mot-de-passe-oublie" element={<GuestRoute portal="recruteur"><ForgotPasswordRecruteur /></GuestRoute>} />
            {/* Ancienne page Premium — remplacée par /recruteurs/abonnements (4 paliers, paiement Chargily réel).
                Redirection conservée pour ne pas casser d'anciens liens/favoris. */}
            <Route path="/recruteurs/premium" element={<Navigate to="/recruteurs/abonnements" replace />} />
            <Route path="/recruteurs/premium/success" element={<RecruteurRoute><PremiumSuccessPage /></RecruteurRoute>} />
            <Route path="/invitation/equipe/:token" element={<AccepterInvitation />} />
            <Route path="/recruteurs/inscription" element={<GuestRoute portal="recruteur"><RegisterRecruteur /></GuestRoute>} />

            {/* ESPACE RECRUTEUR CONNECTÉ */}
            <Route element={<RecruteurRoute><EntrepriseValideeGuard><RecruteurLayout /></EntrepriseValideeGuard></RecruteurRoute>}>
              <Route path="/creer-offre" element={<RoleGuard minRole="UTILISATEUR"><PalierRequisGuard droit="peut_publier_offre" titre="Publier une offre" message="Vous avez atteint la limite d'offres actives de votre palier. Passez à un palier supérieur pour en publier davantage."><CreateJob /></PalierRequisGuard></RoleGuard>} />
              <Route path="/dashboard" element={<DashboardRecruteur />} />
              <Route path="/dashboard/offres/:id" element={<GestionOffre />} />
              <Route path="/cvtheque" element={<RoleGuard minRole="UTILISATEUR"><PalierRequisGuard droit="acces_cvtheque" titre="CVthèque" message="Cette fonctionnalité nécessite un abonnement actif."><CVTheque /></PalierRequisGuard></RoleGuard>} />
              <Route path="/candidatures-spontanees" element={<CandidaturesSpontanees />} />
              <Route path="/notifications" element={<NotificationsRecruteur />} />
              <Route path="/questionnaires" element={<RoleGuard minRole="UTILISATEUR"><Questionnaires /></RoleGuard>} />
              <Route path="/parametres" element={<ParametresRecruteur />} />
              <Route path="/mon-equipe" element={<PalierRequisGuard droit="acces_equipe" titre="Mon équipe" message="La gestion d'équipe nécessite le palier Business ou supérieur."><MonEquipe /></PalierRequisGuard>} />
              <Route path="/recruteurs/abonnements" element={<AbonnementsPage />} />
              <Route path="/offres-emploi" element={<OffresListPage />} />
              <Route path="/candidatures" element={<CandidaturesListPage />} />
              <Route path="/recrutements" element={<RecrutementsPage />} />
              <Route path="/candidats-recommandes" element={<CandidatsRecommandesPage />} />
              <Route path="/statistiques" element={<StatistiquesPage />} />
              <Route path="/comment-fonctionne-matching" element={<CommentFonctionneMatching />} />
              <Route path="/comment-fonctionnent-credits" element={<CommentFonctionnentCredits />} />
              <Route path="/evaluations" element={<EvaluationsPage />} />
              <Route path="/activite" element={<ActiviteCompletePage />} />
              <Route path="/entretiens" element={<EntretiensPage />} />
              <Route path="/facturation" element={<FacturationPage />} />
            </Route>

            {/* ESPACE CANDIDAT */}
            <Route element={<CandidatRoute><CandidatLayout /></CandidatRoute>}>
              <Route path="/dashboard-candidat" element={<CandidatDashboard />} />
              <Route path="/comprendre-mes-scores" element={<ComprendreMesScores />} />
              <Route path="/confidentialite-recruteurs" element={<ConfidentialiteRecruteurs />} />
              <Route path="/profil" element={<ProfilCandidat />} />
              <Route path="/mes-candidatures" element={<MesCandidatures />} />
              <Route path="/inbox" element={<BoiteReception />} />
              <Route path="/parametres/candidat" element={<Settings />} />
              <Route path="/suggestions-carriere" element={<SuggestionsCarriere />} />
              <Route path="/alertes" element={<AlertesEmploi />} />
              <Route path="/offres-sauvegardees" element={<OffresSauvegardees />} />
              <Route path="/mes-competences" element={<MesCompetences />} />
              <Route path="/mes-documents" element={<MesDocuments />} />
              <Route path="/rendez-vous" element={<PrendreRendezVous />} />
            </Route>
            <Route path="/jobs/:id/postuler" element={<CandidatRoute><ReviewCandidature /></CandidatRoute>} />
            <Route path="/onboarding" element={<CandidatRoute><OnboardingWizard mode="page" /></CandidatRoute>} />

            {/* ZONE ADMINISTRATION */}
            <Route path="/admin-taftech" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<Navigate to="/admin-taftech/dashboard" replace />} />
              <Route path="entreprises" element={<AdminEntreprises />} />
              <Route path="offres" element={<AdminOffres />} />
              <Route path="dashboard" element={<AdminStatistiques />} />
              <Route path="statistiques" element={<AdminStatsPeriode />} />
              <Route path="utilisateurs" element={<AdminUsers />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
              <Route path="candidatures" element={<AdminCandidatures />} />
              <Route path="demandes-premium" element={<AdminDemandesPremium />} />
              <Route path="/admin-taftech/referentiel-v2" element={<Navigate to="/admin-taftech/referentiel-metiers" replace />} />
              <Route path="/admin-taftech/referentiel-metiers" element={<AdminReferentielV2 key="metiers" groupe="metiers" />} />
              <Route path="/admin-taftech/referentiel-formations" element={<AdminReferentielV2 key="formations" groupe="formations" />} />
              <Route path="/admin-taftech/referentiel-specialites" element={<AdminReferentielV2 key="specialites" groupe="specialites" />} />
              <Route path="/admin-taftech/referentiel-similarites" element={<Navigate to="/admin-taftech/referentiel-metiers" replace />} />
              <Route path="/admin-taftech/abonnements-ia" element={<AdminAbonnementsIA />} />
              <Route path="/admin-taftech/qualite-ia" element={<AdminQualiteIA />} />
              {/* Anciennes URLs (3 pages séparées, fusionnées en onglets) — redirigées pour ne
                  jamais casser un lien déjà partagé/mis en favori. */}
              <Route path="/admin-taftech/paliers" element={<Navigate to="/admin-taftech/abonnements-ia?tab=paliers" replace />} />
              <Route path="/admin-taftech/credit-packs" element={<Navigate to="/admin-taftech/abonnements-ia?tab=credits" replace />} />
              <Route path="/admin-taftech/ia-config" element={<Navigate to="/admin-taftech/abonnements-ia?tab=ia" replace />} />
              <Route path="/admin-taftech/mentions-legales" element={<AdminMentionsLegales />} />
              <Route path="/admin-taftech/metiers-suggeres" element={<AdminReferentielV2 key="metiers-suggeres" groupe="metiers" ongletInitial="demandes-metiers" />} />
              <Route path="/admin-taftech/faq" element={<AdminFaq />} />
              <Route path="/admin-taftech/competences" element={<AdminCompetences />} />
              <Route path="/admin-taftech/articles" element={<AdminArticles />} />
              <Route path="/admin-taftech/bannieres" element={<AdminBannieres />} />
              <Route path="/admin-taftech/pages" element={<AdminPages />} />
              <Route path="/admin-taftech/seo" element={<AdminSeo />} />
              <Route path="/admin-taftech/rendez-vous" element={<AdminRendezVous />} />
              <Route path="/admin-taftech/types-documents" element={<AdminTypesDocuments />} />
              <Route path="audit" element={<AdminAuditLogs />} />
              <Route path="comptes-admins" element={<AdminComptes />} />
              <Route path="erreurs-systeme" element={<AdminSystemLogs />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {!isAdminPath && (recruteurPortal ? <FooterRecruteur /> : <Footer />)}
      {showBottomNavCandidat && <BottomNavCandidat />}
      {showBottomNavGuest && <BottomNavGuest />}
      {showBottomNavRecruteur && <BottomNavRecruteur />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}

export default App;
