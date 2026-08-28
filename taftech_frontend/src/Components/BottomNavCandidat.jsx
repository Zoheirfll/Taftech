import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Search, User, Briefcase, Mail } from "lucide-react";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";

const ITEMS = [
  { to: "/dashboard-candidat", label: "Tableau", icon: LayoutDashboard, exact: true },
  { to: "/offres", label: "Offres", icon: Search },
  { to: "/profil", label: "Profil", icon: User },
  { to: "/mes-candidatures", label: "Candidatures", icon: Briefcase },
  { to: "/inbox", label: "Messages", icon: Mail, badge: true },
];

// Bottom nav mobile — accès direct aux 5 destinations les plus fréquentes de l'espace
// candidat, en complément (pas remplacement) du hamburger qui garde les liens secondaires
// (alertes, suggestions, paramètres, déconnexion). Visible uniquement <md, uniquement
// CANDIDAT connecté (décidé avec l'utilisateur — recruteur/admin/visiteur hors scope).
const BottomNavCandidat = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifs = await jobsService.getNotifications();
        setUnreadCount(notifs.filter((n) => !n.lue).length);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_NOTIFS_BOTTOMNAV", error);
      }
    };
    loadNotifications();
  }, []);

  const isActive = (item) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md rounded-t-2xl shadow-[0_-6px_24px_-4px_rgba(15,23,42,0.12)] flex items-stretch px-1 pt-1.5"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.375rem)" }}
    >
      {ITEMS.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            className="relative flex-1 flex flex-col items-center justify-center gap-1 py-1 min-h-[54px]"
          >
            <span
              className={`relative flex items-center justify-center w-10 h-8 rounded-full transition-all duration-200 ${
                active ? "bg-indigo-50" : ""
              }`}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                className={`transition-colors duration-200 ${active ? "text-indigo-600" : "text-slate-400"}`}
              />
              {item.badge && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full ring-2 ring-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </span>
            <span
              className={`text-[10.5px] leading-none transition-colors duration-200 ${
                active ? "font-bold text-indigo-600" : "font-medium text-slate-500"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNavCandidat;
