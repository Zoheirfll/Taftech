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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map(({ to, label, icon: Icon }) => {
        const active = isActive(to);
        return (
          <Link
            key={to}
            to={to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
              active ? "text-teal-700" : "text-slate-500"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-xs ${active ? "font-bold" : "font-medium"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNavRecruteur;
