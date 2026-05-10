import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// Import du Garde-Fou (Boîte Noire)
import ErrorBoundary from "./utils/ErrorBoundary";

// Components & Layouts
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import CandidatLayout from "./Pages/Candidat/CandidatLayout";
import AdminLayout from "./Pages/Admin/AdminLayout";

// Pages Publiques
import Home from "./Pages/Home";
import JobsList from "./Pages/JobsList";
import JobDetail from "./Pages/JobDetail";
import Login from "./Pages/Login";
import RegisterCandidat from "./Pages/RegisterCandidat";
import RegisterRecruteur from "./Pages/RegisterRecruteur";
import EntreprisePublic from "./Pages/EntreprisePublic";
import OffresParRegion from "./Pages/OffresParRegion";
import OffresParSecteur from "./Pages/OffresParSecteur";

// Pages Recruteur
import CreateEntreprise from "./Pages/CreateEntreprise";
import CreateJob from "./Pages/CreateJob";
import DashboardRecruteur from "./Pages/DashboardRecruteur";
import GestionOffre from "./Pages/GestionOffre";
import CVTheque from "./Pages/CVTheque";

// Pages Candidat
import ProfilCandidat from "./Pages/ProfilCandidat";
import MesCandidatures from "./Pages/MesCandidatures";
import BoiteReception from "./Pages/BoiteReception";
import ReviewCandidature from "./Pages/ReviewCandidature";
import Settings from "./Pages/Candidat/Settings";
import AlertesEmploi from "./Pages/Candidat/AlertesEmploi";
import OffresSauvegardees from "./Pages/Candidat/OffresSauvegardees";

// Pages Admin
import AdminCandidatures from "./Pages/Admin/AdminCandidatures";
import AdminEntreprises from "./Pages/Admin/AdminEntreprises";
import AdminOffres from "./Pages/Admin/AdminOffres";
import AdminStatistiques from "./Pages/Admin/AdminStatistiques";
import AdminUsers from "./Pages/Admin/AdminUsers";
import AdminBroadcast from "./Pages/admin/AdminBroadcast";

// 🛑 LE MUR DE SILENCE 🛑
// On neutralise la console uniquement si on est en production
if (import.meta.env.MODE === "production") {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.error = noop;
  console.debug = noop;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
          {/* Système de notifications global */}
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              duration: 3000,
              style: {
                fontWeight: "bold",
                borderRadius: "10px",
              },
            }}
          />

          <Navbar />

          <main className="flex-grow">
            <Routes>
              {/* ROUTES PUBLIQUES */}
              <Route path="/" element={<Home />} />
              <Route path="/offres" element={<JobsList />} />
              <Route path="/regions" element={<OffresParRegion />} />
              <Route path="/secteurs" element={<OffresParSecteur />} />
              <Route path="/register" element={<RegisterCandidat />} />
              <Route
                path="/register-entreprise"
                element={<RegisterRecruteur />}
              />
              <Route path="/login" element={<Login />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/entreprise/:id" element={<EntreprisePublic />} />

              {/* ROUTES RECRUTEUR */}
              <Route path="/creer-entreprise" element={<CreateEntreprise />} />
              <Route path="/creer-offre" element={<CreateJob />} />
              <Route path="/dashboard" element={<DashboardRecruteur />} />
              <Route path="/dashboard/offres/:id" element={<GestionOffre />} />
              <Route path="/cvtheque" element={<CVTheque />} />

              {/* ESPACE CANDIDAT (Layout partagé) */}
              <Route element={<CandidatLayout />}>
                <Route path="/profil" element={<ProfilCandidat />} />
                <Route path="/mes-candidatures" element={<MesCandidatures />} />
                <Route path="/inbox" element={<BoiteReception />} />
                <Route
                  path="/jobs/:id/postuler"
                  element={<ReviewCandidature />}
                />
                <Route path="/parametres" element={<Settings />} />
                <Route path="/alertes" element={<AlertesEmploi />} />
                <Route
                  path="/offres-sauvegardees"
                  element={<OffresSauvegardees />}
                />
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
              </Route>
            </Routes>
          </main>

          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
