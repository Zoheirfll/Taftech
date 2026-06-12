import React from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import ErrorBoundary from "./utils/ErrorBoundary";

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
          <Route path="/register" element={<RegisterCandidat />} />
          <Route path="/register-entreprise" element={<RegisterRecruteur />} />
          <Route path="/login" element={<Login />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/entreprise/:id" element={<EntreprisePublic />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* PORTAIL RECRUTEUR */}
          <Route path="/recruteurs" element={<LandingRecruteur />} />
          <Route path="/recruteurs/connexion" element={<LoginRecruteur />} />
          <Route path="/recruteurs/inscription" element={<RegisterRecruteur />} />

          {/* ESPACE RECRUTEUR CONNECTÉ */}
          <Route path="/creer-offre" element={<CreateJob />} />
          <Route path="/dashboard" element={<DashboardRecruteur />} />
          <Route path="/dashboard/offres/:id" element={<GestionOffre />} />
          <Route path="/cvtheque" element={<CVTheque />} />
          <Route path="/candidatures-spontanees" element={<CandidaturesSpontanees />} />
          <Route path="/questionnaires" element={<Questionnaires />} />
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
