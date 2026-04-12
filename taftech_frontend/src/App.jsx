import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./Components/Navbar"; // Assure-toi que le chemin est correct
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

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* LA BARRE DE NAVIGATION EST MAINTENANT DANS SON COMPOSANT DÉDIÉ */}
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<RegisterCandidat />} />
          <Route path="/login" element={<Login />} />
          <Route path="/creer-entreprise" element={<CreateEntreprise />} />
          <Route path="/creer-offre" element={<CreateJob />} />
          <Route path="/dashboard" element={<DashboardRecruteur />} />
          <Route path="/profil" element={<ProfilCandidat />} />
          <Route path="/offre/:id" element={<JobDetail />} />
          <Route path="/register-entreprise" element={<RegisterRecruteur />} />
          <Route path="/mes-candidatures" element={<MesCandidatures />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
