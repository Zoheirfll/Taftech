import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Navbar from "./Components/Navbar";
import Home from "./Pages/Home";
import RegisterCandidat from "./Pages/RegisterCandidat";
import Login from "./Pages/Login";
import CreateEntreprise from "./Pages/CreateEntreprise";
import CreateJob from "./Pages/CreateJob";
import DashboardRecruteur from "./Pages/DashboardRecruteur";
import ProfilCandidat from "./Pages/ProfilCandidat";
import JobDetail from "./Pages/JobDetail";
import RegisterRecruteur from "./Pages/RegisterRecruteur";
import MesCandidatures from "./Pages/MesCandidatures";
import ReviewCandidature from "./Pages/ReviewCandidature";
import JobsList from "./Pages/JobsList";
import OffresParRegion from "./Pages/OffresParRegion";
import OffresParSecteur from "./Pages/OffresParSecteur";
import GestionOffre from "./Pages/GestionOffre";
import CandidatLayout from "./Pages/Candidat/CandidatLayout";
import Settings from "./Pages/Candidat/Settings";
import AlertesEmploi from "./Pages/Candidat/AlertesEmploi";
import OffresSauvegardees from "./Pages/Candidat/OffresSauvegardees";
import BoiteReception from "./Pages/BoiteReception";

// 👇 NOUVEL IMPORT POUR LA PAGE ENTREPRISE 👇
import EntreprisePublic from "./Pages/EntreprisePublic";

// L'ADMINISTRATION
import AdminLayout from "./Pages/Admin/AdminLayout";
import AdminEntreprises from "./Pages/Admin/AdminEntreprises";
import AdminOffres from "./Pages/Admin/AdminOffres";
import AdminStatistiques from "./Pages/Admin/AdminStatistiques";
import AdminUsers from "./Pages/Admin/AdminUsers";
import AdminBroadcast from "./Pages/admin/AdminBroadcast"; // Ajuste le chemin selon ton dossier

// TON FOOTER
import Footer from "./Components/Footer";

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
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

            {/* 👇 NOUVELLE ROUTE POUR LA PAGE ENTREPRISE 👇 */}
            <Route path="/entreprise/:id" element={<EntreprisePublic />} />

            {/* ROUTES RECRUTEUR */}
            <Route path="/creer-entreprise" element={<CreateEntreprise />} />
            <Route path="/creer-offre" element={<CreateJob />} />
            <Route path="/dashboard" element={<DashboardRecruteur />} />
            <Route path="/dashboard/offres/:id" element={<GestionOffre />} />

            {/* ESPACE CANDIDAT */}
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
            </Route>
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
