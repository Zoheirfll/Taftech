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
        <p className="text-sm text-slate-500">
          Votre rôle dans cette équipe ne vous permet pas d'accéder à cette page.
        </p>
      </div>
    );
  }
  return children;
};

// Redirige les utilisateurs déjà connectés hors des pages guest (login, register…)
const GuestRoute = ({ children, portal = "candidat" }) => {
  const role = authService.getUserRole();
  const estMembre = authService.getEstMembreEquipe();
  if (!role) return children;
  if (role === "ADMIN") {
    return <Navigate to="/admin-taftech" replace />;
  }
  if (role === "RECRUTEUR" || estMembre) {
    return <Navigate to="/dashboard" replace />;
  }
  if (portal === "recruteur") {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/profil" replace />;
};

// Components & Layouts — chargés immédiatement (présents sur toutes les pages)
import Navbar from "./Components/Navbar";
import NavbarRecruteur from "./Components/NavbarRecruteur";
import Footer from "./Components/Footer";

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
const EntreprisePublic   = lazy(() => import("./Pages/Recruteur/EntreprisePublic"));
const OffresParRegion    = lazy(() => import("./Pages/Public/OffresParRegion"));
const OffresParSecteur   = lazy(() => import("./Pages/Public/OffresParSecteur"));
const RegisterCandidat   = lazy(() => import("./Pages/Auth/RegisterCandidat"));
const RegisterRecruteur  = lazy(() => import("./Pages/Auth/RegisterRecruteur"));
const ForgotPassword     = lazy(() => import("./Pages/Auth/ForgotPassword"));
const ResetPassword      = lazy(() => import("./Pages/Auth/ResetPassword"));

// Portail Recruteur
const LandingRecruteur   = lazy(() => import("./Pages/Recruteur/Portal/LandingRecruteur"));
const PremiumPage        = lazy(() => import("./Pages/Recruteur/Portal/PremiumPage"));
const PremiumSuccessPage = lazy(() => import("./Pages/Recruteur/Portal/PremiumSuccessPage"));
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

function AppContent() {
  const location = useLocation();
  const recruteurPortal = isRecruteurRoute(location.pathname);

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

      <main className="grow">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ROUTES PUBLIQUES */}
            <Route path="/" element={<Home />} />
            <Route path="/offres" element={<JobsList />} />
            <Route path="/entreprises" element={<Entreprises />} />
            <Route path="/regions" element={<OffresParRegion />} />
            <Route path="/secteurs" element={<OffresParSecteur />} />
            <Route path="/register" element={<GuestRoute><RegisterCandidat /></GuestRoute>} />
            <Route path="/register-entreprise" element={<GuestRoute><RegisterRecruteur /></GuestRoute>} />
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/entreprise/:id" element={<EntreprisePublic />} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
            <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />

            {/* PORTAIL RECRUTEUR */}
            <Route path="/recruteurs" element={<LandingRecruteur />} />
            <Route path="/recruteurs/connexion" element={<GuestRoute portal="recruteur"><LoginRecruteur /></GuestRoute>} />
            <Route path="/recruteurs/premium" element={<PremiumPage />} />
            <Route path="/recruteurs/premium/success" element={<PremiumSuccessPage />} />
            <Route path="/invitation/equipe/:token" element={<AccepterInvitation />} />
            <Route path="/recruteurs/inscription" element={<GuestRoute portal="recruteur"><RegisterRecruteur /></GuestRoute>} />

            {/* ESPACE RECRUTEUR CONNECTÉ */}
            <Route path="/creer-offre" element={<RoleGuard minRole="UTILISATEUR"><CreateJob /></RoleGuard>} />
            <Route path="/dashboard" element={<DashboardRecruteur />} />
            <Route path="/dashboard/offres/:id" element={<GestionOffre />} />
            <Route path="/cvtheque" element={<RoleGuard minRole="UTILISATEUR"><CVTheque /></RoleGuard>} />
            <Route path="/candidatures-spontanees" element={<CandidaturesSpontanees />} />
            <Route path="/questionnaires" element={<RoleGuard minRole="UTILISATEUR"><Questionnaires /></RoleGuard>} />
            <Route path="/parametres" element={<ParametresRecruteur />} />
            <Route path="/mon-equipe" element={<MonEquipe />} />

            {/* ESPACE CANDIDAT */}
            <Route element={<CandidatLayout />}>
              <Route path="/profil" element={<ProfilCandidat />} />
              <Route path="/mes-candidatures" element={<MesCandidatures />} />
              <Route path="/inbox" element={<BoiteReception />} />
              <Route path="/jobs/:id/postuler" element={<ReviewCandidature />} />
              <Route path="/parametres/candidat" element={<Settings />} />
              <Route path="/suggestions-carriere" element={<SuggestionsCarriere />} />
              <Route path="/alertes" element={<AlertesEmploi />} />
              <Route path="/offres-sauvegardees" element={<OffresSauvegardees />} />
            </Route>

            {/* ZONE ADMINISTRATION */}
            <Route path="/admin-taftech" element={<AdminLayout />}>
              <Route index element={<AdminEntreprises />} />
              <Route path="entreprises" element={<AdminEntreprises />} />
              <Route path="offres" element={<AdminOffres />} />
              <Route path="dashboard" element={<AdminStatistiques />} />
              <Route path="utilisateurs" element={<AdminUsers />} />
              <Route path="broadcast" element={<AdminBroadcast />} />
              <Route path="candidatures" element={<AdminCandidatures />} />
              <Route path="/admin-taftech/metiers" element={<AdminMetiers />} />
              <Route path="audit" element={<AdminAuditLogs />} />
              <Route path="comptes-admins" element={<AdminComptes />} />
            </Route>
          </Routes>
        </Suspense>
      </main>

      <Footer />
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
