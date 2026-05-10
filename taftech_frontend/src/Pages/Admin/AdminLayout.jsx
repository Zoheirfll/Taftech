import React from "react";
import { NavLink, Outlet, Link } from "react-router-dom";

const AdminLayout = () => {
  // Petite fonction pour gérer la couleur du bouton actif automatiquement
  const navLinkClass = ({ isActive }) =>
    `w-full text-left px-4 py-3 rounded-xl font-bold transition flex items-center gap-3 ${
      isActive
        ? "bg-blue-600 text-white shadow-md"
        : "text-gray-400 hover:bg-gray-800 hover:text-white"
    }`;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* MENU LATÉRAL FIXE */}
      <div className="w-64 bg-gray-900 text-white flex flex-col shadow-2xl z-10">
        <div className="p-6 text-center border-b border-gray-800">
          <h1 className="text-2xl font-black tracking-widest text-blue-500">
            TAFTECH
          </h1>
          <p className="text-xs text-gray-400 font-bold mt-1">SUPER ADMIN</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          {/* NavLink gère tout seul le fait d'être "actif" ou non grâce à l'URL */}
          <NavLink to="/admin-taftech/dashboard" className={navLinkClass}>
            <span>📊</span> Vue d'ensemble
          </NavLink>

          <NavLink to="/admin-taftech/entreprises" className={navLinkClass}>
            <span>🏢</span> Entreprises
          </NavLink>

          <NavLink to="/admin-taftech/offres" className={navLinkClass}>
            <span>💼</span> Offres d'emploi
          </NavLink>

          {/* 👇 NOUVEL ONGLET POUR TOUTES LES CANDIDATURES 👇 */}
          <NavLink to="/admin-taftech/candidatures" className={navLinkClass}>
            <span>📑</span> Candidatures
          </NavLink>

          <NavLink to="/admin-taftech/utilisateurs" className={navLinkClass}>
            <span>👥</span> Utilisateurs
          </NavLink>

          <NavLink to="/admin-taftech/broadcast" className={navLinkClass}>
            <span>📢</span> Diffusion
          </NavLink>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <Link
            to="/"
            className="text-gray-400 text-sm font-bold hover:text-white flex justify-center items-center gap-2 transition"
          >
            ← Quitter l'Admin
          </Link>
        </div>
      </div>

      {/* CONTENU DYNAMIQUE (La "fenêtre" où les pages s'affichent) */}
      <div className="flex-1 overflow-y-auto p-10">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
