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

// L'ESPACE CANDIDAT
import CandidatLayout from "./Pages/Candidat/CandidatLayout"; // <-- NOUVEL IMPORT

// L'ADMINISTRATION
import AdminLayout from "./Pages/Admin/AdminLayout";
import AdminEntreprises from "./Pages/Admin/AdminEntreprises";
import AdminOffres from "./Pages/Admin/AdminOffres";
import AdminStatistiques from "./Pages/Admin/AdminStatistiques";
import AdminUsers from "./Pages/Admin/AdminUsers";
import Settings from "./Pages/Candidat/Settings";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
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

        <Routes>
          {/* ROUTES PUBLIQUES */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<RegisterCandidat />} />
          <Route path="/register-entreprise" element={<RegisterRecruteur />} />
          <Route path="/login" element={<Login />} />
          <Route path="/jobs/:id" element={<JobDetail />} />

          {/* ROUTES RECRUTEUR (À protéger plus tard) */}
          <Route path="/creer-entreprise" element={<CreateEntreprise />} />
          <Route path="/creer-offre" element={<CreateJob />} />
          <Route path="/dashboard" element={<DashboardRecruteur />} />

          {/* --- NOUVEAU : ESPACE CANDIDAT (Avec Sidebar Emploitic) --- */}
          <Route element={<CandidatLayout />}>
            <Route path="/profil" element={<ProfilCandidat />} />
            <Route path="/mes-candidatures" element={<MesCandidatures />} />
            <Route path="/jobs/:id/postuler" element={<ReviewCandidature />} />
            <Route path="/parametres" element={<Settings />} />{" "}
            {/*
            {/* Tu pourras ajouter ici :
                <Route path="/alertes" element={<AlertesCandidat />} />
                <Route path="/parametres" element={<SettingsCandidat />} /> 
            */}
          </Route>

          {/* --- ZONE ADMINISTRATION --- */}
          <Route path="/admin-taftech" element={<AdminLayout />}>
            <Route index element={<AdminEntreprises />} />
            <Route path="entreprises" element={<AdminEntreprises />} />
            <Route path="offres" element={<AdminOffres />} />
            <Route path="dashboard" element={<AdminStatistiques />} />
            <Route path="utilisateurs" element={<AdminUsers />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
