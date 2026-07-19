import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Search, User, Briefcase, Mail } from "lucide-react";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";

const ITEMS = [
  { to: "/", label: "Accueil", icon: Home, exact: true },
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
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
              active ? "text-indigo-600" : "text-slate-500"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            {item.badge && unreadCount > 0 && (
              <span className="absolute top-1 right-[28%] w-4 h-4 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className={`text-xs ${active ? "font-bold" : "font-medium"}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNavCandidat;
