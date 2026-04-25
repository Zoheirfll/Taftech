import React from "react";
import { Link } from "react-router-dom";
import { authService } from "../Services/authService";
// 👇 ON IMPORTE TON NOUVEAU LOGO ICI 👇
import logoTafTech from "../assets/logo-taftech.png";

const Navbar = () => {
  const isLogged = authService.isAuthenticated();
  const role = authService.getUserRole();

  return (
    <nav className="bg-white border-b shadow-sm p-3 sticky top-0 z-50 px-6 md:px-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* LOGO AVEC IMAGE - CORRECTION ZOOM */}
        <Link to="/" className="flex items-center group ml-[-10px]">
          {/* On crée un conteneur rigide plus grand et on masque ce qui dépasse */}
          <div className="overflow-hidden h-20 w-56 flex items-center justify-start">
            <img
              src={logoTafTech}
              alt="TafTech Logo"
              className="h-40 w-auto object-contain transform scale-100 translate-y-[-10px] origin-left transition-transform group-hover:scale-105"
            />
          </div>
        </Link>

        <div className="flex items-center gap-6 font-medium text-gray-700">
          <Link to="/" className="hover:text-blue-600 transition">
            Offres
          </Link>

          {!isLogged ? (
            <>
              <Link
                to="/register-entreprise"
                className="hidden md:block text-gray-900 font-bold border-r pr-6 border-gray-200"
              >
                Espace Recruteur
              </Link>
              <Link to="/login" className="hover:text-blue-600 transition">
                Connexion
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition font-bold"
              >
                Inscription
              </Link>
            </>
          ) : (
            <>
              {/* STATUS EN LIGNE */}
              <span className="hidden sm:flex items-center gap-1.5 text-green-600 text-xs font-black bg-green-50 px-3 py-1 rounded-full border border-green-100">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                EN LIGNE
              </span>

              {/* MENU CANDIDAT */}
              {role === "CANDIDAT" && (
                <>
                  <Link
                    to="/mes-candidatures"
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Mes Candidatures
                  </Link>
                  <Link
                    to="/profil"
                    className="text-gray-700 font-bold hover:text-blue-600"
                  >
                    Mon Profil CV
                  </Link>
                </>
              )}

              {/* MENU RECRUTEUR */}
              {role === "RECRUTEUR" && (
                <>
                  <Link
                    to="/dashboard"
                    className="text-gray-700 font-bold hover:text-blue-600"
                  >
                    Tableau de Bord
                  </Link>
                  <Link
                    to="/creer-offre"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition"
                  >
                    + Publier une offre
                  </Link>
                </>
              )}

              {/* MENU SUPER ADMIN */}
              {role === "ADMIN" && (
                <Link
                  to="/admin-taftech"
                  className="bg-gray-900 text-white font-bold py-2 px-4 rounded-xl hover:bg-gray-800 transition shadow-md flex items-center gap-2"
                >
                  <span>⚙️</span> Tour de Contrôle
                </Link>
              )}

              {/* BOUTON DÉCONNEXION */}
              <button
                onClick={() => authService.logout()}
                className="text-red-500 hover:text-red-700 font-bold transition ml-4"
              >
                Déconnexion
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
