import React from "react";
import { Link } from "react-router-dom";
import { authService } from "../Services/authService";

const Navbar = () => {
  const isLogged = authService.isAuthenticated();
  const role = authService.getUserRole();

  return (
    <nav className="bg-white border-b shadow-sm p-4 sticky top-0 z-50 px-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* LOGO */}
        <Link
          to="/"
          className="text-2xl font-black text-blue-600 tracking-tighter"
        >
          TAFTECH
        </Link>

        <div className="flex items-center gap-6 font-medium text-gray-700">
          <Link to="/" className="hover:text-blue-600 transition">
            Offres
          </Link>

          {!isLogged ? (
            <>
              <Link
                to="/register-entreprise"
                className="text-gray-900 font-bold border-r pr-6 border-gray-200"
              >
                Espace Recruteur
              </Link>
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
          ) : (
            <>
              {/* STATUS EN LIGNE */}
              <span className="text-green-600 text-sm font-bold bg-green-100 px-3 py-1 rounded-full">
                En ligne
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
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold transition"
                  >
                    + Publier une offre
                  </Link>
                </>
              )}

              {/* 🔥 MENU SUPER ADMIN (LA PORTE SECRÈTE) 🔥 */}
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
