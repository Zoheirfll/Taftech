import React from "react";
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
  // CANDIDAT sur portail recruteur → renvoyer au bon portail
  if (portal === "recruteur") {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/profil" replace />;
};

// Components & Layouts
import Navbar from "./Components/Navbar";
import NavbarRecruteur from "./Components/NavbarRecruteur";
import Footer from "./Components/Footer";
import CandidatLayout from "./Pages/Candidat/CandidatLayout";
import AdminLayout from "./Pages/Admin/AdminLayout";

// Pages Publiques
import Home from "./Pages/Public/Home";
import JobsList from "./Pages/Public/JobsList";
import Entreprises from "./Pages/Public/Entreprises";
import JobDetail from "./Pages/Public/JobDetail";
import Login from "./Pages/Auth/Login";
import RegisterCandidat from "./Pages/Auth/RegisterCandidat";
import RegisterRecruteur from "./Pages/Auth/RegisterRecruteur";
import EntreprisePublic from "./Pages/Recruteur/EntreprisePublic";
import OffresParRegion from "./Pages/Public/OffresParRegion";
import OffresParSecteur from "./Pages/Public/OffresParSecteur";
import ForgotPassword from "./Pages/Auth/ForgotPassword";
import ResetPassword from "./Pages/Auth/ResetPassword";

// Portail Recruteur
import LandingRecruteur from "./Pages/Recruteur/Portal/LandingRecruteur";
import LoginRecruteur from "./Pages/Recruteur/Portal/LoginRecruteur";
import PremiumPage from "./Pages/Recruteur/Portal/PremiumPage";
import PremiumSuccessPage from "./Pages/Recruteur/Portal/PremiumSuccessPage";
import AccepterInvitation from "./Pages/Recruteur/AccepterInvitation";

// Pages Recruteur (espace connecté)
import CreateJob from "./Pages/Recruteur/CreateJob";
import DashboardRecruteur from "./Pages/Recruteur/DashboardRecruteur";
import GestionOffre from "./Pages/Recruteur/GestionOffre/index";
import CVTheque from "./Pages/Recruteur/CVTheque";
import CandidaturesSpontanees from "./Pages/Recruteur/CandidaturesSpontanees";
import Questionnaires from "./Pages/Recruteur/Questionnaires";
import ParametresRecruteur from "./Pages/Recruteur/ParametresRecruteur";

// Pages Candidat
import ProfilCandidat from "./Pages/Candidat/ProfilCandidat/index";
import MesCandidatures from "./Pages/Candidat/MesCandidatures";
import BoiteReception from "./Pages/Candidat/BoiteReception";
import ReviewCandidature from "./Pages/Recruteur/ReviewCandidature";
import Settings from "./Pages/Candidat/Settings";
import AlertesEmploi from "./Pages/Candidat/AlertesEmploi";
import OffresSauvegardees from "./Pages/Candidat/OffresSauvegardees";
import SuggestionsCarriere from "./Pages/Candidat/SuggestionsCarriere";

// Pages Admin
import AdminCandidatures from "./Pages/Admin/AdminCandidatures";
import AdminEntreprises from "./Pages/Admin/AdminEntreprises";
import AdminOffres from "./Pages/Admin/AdminOffres";
import AdminStatistiques from "./Pages/Admin/AdminStatistiques";
import AdminUsers from "./Pages/Admin/AdminUsers";
import AdminBroadcast from "./Pages/admin/AdminBroadcast";
import AdminMetiers from "./Pages/Admin/AdminMetiers";
import AdminAuditLogs from "./Pages/Admin/AdminAuditLogs";
import AdminComptes from "./Pages/Admin/AdminComptes";

if (import.meta.env.MODE === "production") {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

// Routes recruteur — portail séparé (navbar teal)
// /parametres est exact uniquement pour éviter de capter /parametres/candidat
const RECRUTEUR_PREFIX_PATHS = [
  "/recruteurs",
  "/dashboard",
  "/creer-offre",
  "/cvtheque",
  "/candidatures-spontanees",
  "/questionnaires",
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
        <Routes>
          {/* ROUTES PUBLIQUES CANDIDAT */}
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
