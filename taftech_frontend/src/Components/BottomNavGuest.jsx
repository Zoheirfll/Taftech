import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, Briefcase, Building2, LogIn } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
  { to: "/offres", label: "Offres", icon: Search },
  { to: "/secteurs", label: "Secteurs", icon: Briefcase },
  { to: "/entreprises", label: "Entreprises", icon: Building2 },
  { to: "/login", label: "Connexion", icon: LogIn },
];

// Bottom nav mobile — visiteur non connecté côté candidat (mêmes 5 destinations que
// les liens principaux de la Navbar desktop), en complément du hamburger.
const BottomNavGuest = () => {
  const location = useLocation();
  const isActive = (item) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
              active ? "text-indigo-600" : "text-slate-500"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-xs ${active ? "font-bold" : "font-medium"}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNavGuest;
