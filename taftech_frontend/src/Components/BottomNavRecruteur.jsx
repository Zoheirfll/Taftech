import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Briefcase, Search, Inbox, Settings } from "lucide-react";
import { authService } from "../Services/authService";

const ITEMS = [
  { to: "/dashboard", label: "Tableau", icon: LayoutDashboard, minRole: "INVITE" },
  { to: "/creer-offre", label: "Publier", icon: Briefcase, minRole: "UTILISATEUR" },
  { to: "/cvtheque", label: "CVthèque", icon: Search, minRole: "UTILISATEUR" },
  { to: "/candidatures-spontanees", label: "Spontanées", icon: Inbox, minRole: "INVITE" },
  { to: "/parametres", label: "Paramètres", icon: Settings, minRole: "INVITE" },
];

// Bottom nav mobile — recruteur/membre d'équipe connecté. Filtrée par rôle (INVITE
// n'a pas accès à Publier/CVthèque), même logique que le dropdown de NavbarRecruteur.
const BottomNavRecruteur = () => {
  const location = useLocation();
  const items = ITEMS.filter(({ minRole }) => authService.peutFaire(minRole));
  const isActive = (to) => location.pathname.startsWith(to);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md rounded-t-2xl shadow-[0_-6px_24px_-4px_rgba(15,23,42,0.12)] flex items-stretch px-1 pt-1.5"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.375rem)" }}
    >
      {items.map(({ to, label, icon: Icon }) => {
        const active = isActive(to);
        return (
          <Link key={to} to={to} className="flex-1 flex flex-col items-center justify-center gap-1 py-1 min-h-[54px]">
            <span
              className={`flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200 ${
                active ? "bg-teal-50" : ""
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                className={`transition-colors duration-200 ${active ? "text-teal-700" : "text-slate-400"}`}
              />
            </span>
            <span
              className={`text-[10.5px] leading-none transition-colors duration-200 ${
                active ? "font-bold text-teal-700" : "font-medium text-slate-500"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNavRecruteur;
