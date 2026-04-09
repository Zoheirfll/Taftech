import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Home from "./Pages/Home";
import RegisterCandidat from "./pages/RegisterCandidat";
import Login from "./Pages/Login";
import { authService } from "./Services/authService";
import CreateEntreprise from "./Pages/CreateEntreprise";
import CreateJob from "./Pages/CreateJob"; // ou "./pages/CreateJob" selon comment tu as nommé ton dossier
import DashboardRecruteur from "./Pages/DashboardRecruteur";
import ProfilCandidat from "./Pages/ProfilCandidat"; // ou "./pages/ProfilCandidat"

function App() {
  const isLogged = authService.isAuthenticated();

  const handleLogout = () => {
    authService.logout();
    window.location.reload(); // Rafraîchit la page pour vider l'affichage
  };

  return (
    <Router>
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* Navbar Dynamique */}
        <nav className="bg-white shadow-sm border-b p-4 flex justify-between items-center px-10">
          <Link
            to="/"
            className="text-2xl font-black text-blue-600 tracking-tighter hover:opacity-80"
          >
            TAFTECH
          </Link>

          <div className="space-x-6 font-medium text-gray-700 flex items-center">
            <Link to="/" className="hover:text-blue-600 transition">
              Offres
            </Link>

            {isLogged ? (
              // Menu si l'utilisateur EST connecté
              <>
                <span className="text-green-600 text-sm font-bold bg-green-100 px-3 py-1 rounded-full">
                  En ligne
                </span>

                {/* Le lien est maintenant SÉPARÉ du bouton de déconnexion */}
                <Link
                  to="/creer-entreprise"
                  className="text-blue-600 font-bold hover:underline"
                >
                  Devenir Recruteur
                </Link>

                {/* NOUVEAU : Lien vers le tableau de bord */}
                <Link
                  to="/dashboard"
                  className="text-gray-700 font-bold hover:text-blue-600 ml-4"
                >
                  Mon Tableau de Bord
                </Link>

                <Link
                  to="/creer-offre"
                  className="text-white bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-bold transition ml-4"
                >
                  + Publier une offre
                </Link>
                <Link
                  to="/profil"
                  className="text-gray-700 font-bold hover:text-blue-600 ml-4"
                >
                  Mon Profil
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-red-500 hover:text-red-700 font-bold transition ml-4"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              // Menu si l'utilisateur N'EST PAS connecté
              <>
                <Link to="/login" className="hover:text-blue-600 transition">
                  Connexion
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<RegisterCandidat />} />
          <Route path="/login" element={<Login />} />
          <Route path="/creer-entreprise" element={<CreateEntreprise />} />
          <Route path="/creer-offre" element={<CreateJob />} />
          <Route path="/dashboard" element={<DashboardRecruteur />} />
          <Route path="/profil" element={<ProfilCandidat />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
