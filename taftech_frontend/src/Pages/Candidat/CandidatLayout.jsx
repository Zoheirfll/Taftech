import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { authService } from "../../Services/authService";

const CandidatLayout = () => {
  const location = useLocation();

  const menuItems = [
    { name: "Mon profil", path: "/profil", icon: "👤" },
    { name: "Mes candidatures", path: "/mes-candidatures", icon: "💼" },
    { name: "Offres sauvegardées", path: "/sauvegardes", icon: "🔖" },
    { name: "Alertes d'emploi", path: "/alertes", icon: "🔔" },
    { name: "Paramètres", path: "/parametres", icon: "⚙️" },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 p-4 md:p-10 min-h-screen bg-gray-50">
      {/* SIDEBAR GAUCHE (Le menu Emploitic) */}
      <aside className="w-full md:w-64 space-y-2">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-4 sticky top-10">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-100"
                      : "text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm">{item.name}</span>
                </Link>
              );
            })}
            <button
              onClick={() => authService.logout()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all mt-4 border-t border-gray-50 pt-6"
            >
              <span className="text-xl">🚪</span>
              <span className="text-sm">Déconnexion</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* CONTENU À DROITE (Outlet injecte la page correspondante) */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default CandidatLayout;
