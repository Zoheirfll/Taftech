import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
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
    return <Navigate to={portal === "recruteur" ? "/dashboard" : "/profil"} replace />;
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
  if (portal === "candidat") return <Navigate to="/profil" replace />;
  if (portal !== "recruteur") return <Navigate to="/recruteurs/connexion" replace />;
  return children;
};

// Réserve la zone admin — n'existait pas du tout côté frontend jusqu'ici.
const AdminRoute = ({ children }) => {
  const role = authService.getUserRole();
  if (!role) return <Navigate to="/login" replace />;
  if (role !== "ADMIN") {
    const portal = authService.getLoginPortal();
    return <Navigate to={portal === "recruteur" ? "/dashboard" : "/profil"} replace />;
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
const AdminLayout = lazy(() => import("./Pages/Admin/AdminLayout"));

// Pages Publiques — visibles sans connexion, on garde quelques-unes immédiates
import Home from "./Pages/Public/Home";
import JobsList from "./Pages/Public/JobsList";
import JobDetail from "./Pages/Public/JobDetail";
import Login from "./Pages/Auth/Login";
import LoginRecruteur from "./Pages/Recruteur/Portal/LoginRecruteur";

// Pages lazy — chargées à la demande
const Entreprises        = lazy(() => import("./Pages/Public/Entreprises"));
const PolitiqueConfidentialite = lazy(() => import("./Pages/Public/PolitiqueConfidentialite"));
const ContactezNous = lazy(() => import("./Pages/Public/ContactezNous"));
const CGU = lazy(() => import("./Pages/Public/CGU"));
const QuiSommesNous = lazy(() => import("./Pages/Public/QuiSommesNous"));
const EntreprisePublic   = lazy(() => import("./Pages/Recruteur/EntreprisePublic"));
const OffresParRegion    = lazy(() => import("./Pages/Public/OffresParRegion"));
const OffresParSecteur   = lazy(() => import("./Pages/Public/OffresParSecteur"));
const RegisterCandidat   = lazy(() => import("./Pages/Auth/RegisterCandidat"));
const RegisterRecruteur  = lazy(() => import("./Pages/Auth/RegisterRecruteur"));
const ForgotPassword     = lazy(() => import("./Pages/Auth/ForgotPassword"));
const ResetPassword      = lazy(() => import("./Pages/Auth/ResetPassword"));

// Portail Recruteur
const LandingRecruteur          = lazy(() => import("./Pages/Recruteur/Portal/LandingRecruteur"));
const PremiumPage               = lazy(() => import("./Pages/Recruteur/Portal/PremiumPage"));
const PremiumSuccessPage        = lazy(() => import("./Pages/Recruteur/Portal/PremiumSuccessPage"));
const ForgotPasswordRecruteur   = lazy(() => import("./Pages/Recruteur/Portal/ForgotPasswordRecruteur"));
const AccepterInvitation = lazy(() => import("./Pages/Recruteur/AccepterInvitation"));

// Espace Recruteur connecté
const CreateJob              = lazy(() => import("./Pages/Recruteur/CreateJob"));
const DashboardRecruteur     = lazy(() => import("./Pages/Recruteur/DashboardRecruteur"));
const GestionOffre           = lazy(() => import("./Pages/Recruteur/GestionOffre/index"));
const CVTheque               = lazy(() => import("./Pages/Recruteur/CVTheque"));
const CandidaturesSpontanees = lazy(() => import("./Pages/Recruteur/CandidaturesSpontanees"));
const Questionnaires         = lazy(() => import("./Pages/Recruteur/Questionnaires"));
const ParametresRecruteur    = lazy(() => import("./Pages/Recruteur/ParametresRecruteur"));
const ReviewCandidature      = lazy(() => import("./Pages/Recruteur/ReviewCandidature"));
const MonEquipe              = lazy(() => import("./Pages/Recruteur/MonEquipe"));

// Espace Candidat
const ProfilCandidat    = lazy(() => import("./Pages/Candidat/ProfilCandidat/index"));
const MesCandidatures   = lazy(() => import("./Pages/Candidat/MesCandidatures"));
const BoiteReception    = lazy(() => import("./Pages/Candidat/BoiteReception"));
const Settings          = lazy(() => import("./Pages/Candidat/Settings"));
const AlertesEmploi     = lazy(() => import("./Pages/Candidat/AlertesEmploi"));
const OffresSauvegardees = lazy(() => import("./Pages/Candidat/OffresSauvegardees"));
const SuggestionsCarriere = lazy(() => import("./Pages/Candidat/SuggestionsCarriere"));

// Admin
const AdminEntreprises  = lazy(() => import("./Pages/Admin/AdminEntreprises"));
const AdminOffres       = lazy(() => import("./Pages/Admin/AdminOffres"));
const AdminStatistiques = lazy(() => import("./Pages/Admin/AdminStatistiques"));
const AdminUsers        = lazy(() => import("./Pages/Admin/AdminUsers"));
const AdminBroadcast    = lazy(() => import("./Pages/admin/AdminBroadcast"));
const AdminMetiers      = lazy(() => import("./Pages/Admin/AdminMetiers"));
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

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
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
  const estRecruteurConnecte = role === "ADMIN" || (!!role && portal === "recruteur");
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: { fontWeight: "bold", borderRadius: "10px" },
        }}
      />

      {recruteurPortal ? <NavbarRecruteur /> : <Navbar />}

      <main className={`grow ${showAnyBottomNav ? "pb-16 md:pb-0" : ""}`}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ROUTES PUBLIQUES */}
            <Route path="/" element={<Home />} />
            <Route path="/offres" element={<JobsList />} />
            <Route path="/entreprises" element={<Entreprises />} />
            <Route path="/confidentialite" element={<PolitiqueConfidentialite />} />
            <Route path="/contact" element={<ContactezNous />} />
            <Route path="/cgu" element={<CGU />} />
            <Route path="/qui-sommes-nous" element={<QuiSommesNous />} />
            <Route path="/regions" element={<OffresParRegion />} />
            <Route path="/secteurs" element={<OffresParSecteur />} />
            <Route path="/register" element={<GuestRoute><RegisterCandidat /></GuestRoute>} />
            <Route path="/register-entreprise" element={<GuestRoute><RegisterRecruteur /></GuestRoute>} />
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/entreprise/:slug" element={<EntreprisePublic />} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
            <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />

            {/* PORTAIL RECRUTEUR */}
            <Route path="/recruteurs" element={<LandingRecruteur />} />
            <Route path="/recruteurs/connexion" element={<GuestRoute portal="recruteur"><LoginRecruteur /></GuestRoute>} />
            <Route path="/recruteurs/mot-de-passe-oublie" element={<GuestRoute portal="recruteur"><ForgotPasswordRecruteur /></GuestRoute>} />
            <Route path="/recruteurs/premium" element={<RecruteurRoute><PremiumPage /></RecruteurRoute>} />
            <Route path="/recruteurs/premium/success" element={<RecruteurRoute><PremiumSuccessPage /></RecruteurRoute>} />
            <Route path="/invitation/equipe/:token" element={<AccepterInvitation />} />
            <Route path="/recruteurs/inscription" element={<GuestRoute portal="recruteur"><RegisterRecruteur /></GuestRoute>} />

            {/* ESPACE RECRUTEUR CONNECTÉ */}
            <Route path="/creer-offre" element={<RecruteurRoute><RoleGuard minRole="UTILISATEUR"><CreateJob /></RoleGuard></RecruteurRoute>} />
            <Route path="/dashboard" element={<RecruteurRoute><DashboardRecruteur /></RecruteurRoute>} />
            <Route path="/dashboard/offres/:id" element={<RecruteurRoute><GestionOffre /></RecruteurRoute>} />
            <Route path="/cvtheque" element={<RecruteurRoute><RoleGuard minRole="UTILISATEUR"><CVTheque /></RoleGuard></RecruteurRoute>} />
            <Route path="/candidatures-spontanees" element={<RecruteurRoute><CandidaturesSpontanees /></RecruteurRoute>} />
            <Route path="/questionnaires" element={<RecruteurRoute><RoleGuard minRole="UTILISATEUR"><Questionnaires /></RoleGuard></RecruteurRoute>} />
            <Route path="/parametres" element={<RecruteurRoute><ParametresRecruteur /></RecruteurRoute>} />
            <Route path="/mon-equipe" element={<RecruteurRoute><MonEquipe /></RecruteurRoute>} />

            {/* ESPACE CANDIDAT */}
            <Route element={<CandidatRoute><CandidatLayout /></CandidatRoute>}>
              <Route path="/profil" element={<ProfilCandidat />} />
              <Route path="/mes-candidatures" element={<MesCandidatures />} />
              <Route path="/inbox" element={<BoiteReception />} />
              <Route path="/parametres/candidat" element={<Settings />} />
              <Route path="/suggestions-carriere" element={<SuggestionsCarriere />} />
              <Route path="/alertes" element={<AlertesEmploi />} />
              <Route path="/offres-sauvegardees" element={<OffresSauvegardees />} />
            </Route>
            <Route path="/jobs/:id/postuler" element={<CandidatRoute><ReviewCandidature /></CandidatRoute>} />

            {/* ZONE ADMINISTRATION */}
            <Route path="/admin-taftech" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminEntreprises />} />
              <Route path="entreprises" element={<AdminEntreprises />} />
              <Route path="offres" element={<AdminOffres />} />
              <Route path="dashboard" element={<AdminStatistiques />} />
              <Route path="utilisateurs" element={<AdminUsers />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
              <Route path="candidatures" element={<AdminCandidatures />} />
              <Route path="demandes-premium" element={<AdminDemandesPremium />} />
              <Route path="/admin-taftech/metiers" element={<AdminMetiers />} />
              <Route path="audit" element={<AdminAuditLogs />} />
              <Route path="comptes-admins" element={<AdminComptes />} />
              <Route path="erreurs-systeme" element={<AdminSystemLogs />} />
            </Route>
          </Routes>
        </Suspense>
      </main>

      {recruteurPortal ? <FooterRecruteur /> : <Footer />}
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
