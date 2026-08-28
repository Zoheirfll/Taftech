import React, { useState, useEffect, useMemo } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import {
  LayoutDashboard,
  User,
  Briefcase,
  Mail,
  Bookmark,
  Bell,
  Settings,
  LogOut,
  Sparkles,
  Star,
  FolderLock,
  CalendarClock,
} from "lucide-react";

const CandidatLayout = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notifs = await jobsService.getNotifications();
        setUnreadCount(notifs.filter((n) => !n.lue).length);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_NOTIFS_LAYOUT", error);
      }
    };
    fetchNotifications();
  }, []);

  const menuGroups = useMemo(() => [
    {
      label: "Principal",
      items: [{ name: "Tableau de bord", path: "/dashboard-candidat", icon: LayoutDashboard }],
    },
    {
      label: "Candidature",
      items: [
        { name: "Mon profil", path: "/profil", icon: User },
        { name: "Mes candidatures", path: "/mes-candidatures", icon: Briefcase },
        { name: "Mes compétences", path: "/mes-competences", icon: Star },
        { name: "Offres sauvegardées", path: "/offres-sauvegardees", icon: Bookmark },
        {
          name: "Boîte de réception",
          path: "/inbox",
          icon: Mail,
          badge: unreadCount > 0 ? unreadCount : null,
        },
        { name: "Alertes d'emploi", path: "/alertes", icon: Bell },
      ],
    },
    {
      label: "Carrière",
      items: [
        { name: "Suggestions carrière", path: "/suggestions-carriere", icon: Sparkles },
        { name: "Prendre rendez-vous", path: "/rendez-vous", icon: CalendarClock },
      ],
    },
    {
      label: "Compte",
      items: [
        { name: "Mes documents", path: "/mes-documents", icon: FolderLock },
        { name: "Paramètres", path: "/parametres/candidat", icon: Settings },
      ],
    },
  ], [unreadCount]);

  return (
    <div className={`max-w-7xl mx-auto flex flex-col md:flex-row gap-4 md:gap-5 px-4 md:px-6 py-5 md:py-6 min-h-screen ${tw.surfaceSubtle}`}>
      {/* Sur mobile, ce menu est déjà couvert par le hamburger de la Navbar (mêmes liens) —
          l'afficher aussi ici doublerait la navigation en haut de chaque page candidat. */}
      <aside className="hidden md:block md:w-56 shrink-0">
        <div
          className={`${tw.sidebarShell} rounded-xl sticky top-20 max-h-[calc(100vh-5.5rem)] flex flex-col overflow-hidden`}
        >
          <nav className="p-2 overflow-y-auto flex-1">
            {menuGroups.map((group) => (
              <div key={group.label} className="mb-2 last:mb-0">
                <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors mb-0.5 ${
                        isActive ? tw.sidebarLinkActive : tw.sidebarLinkInactive
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon
                          size={16}
                          className={isActive ? tw.sidebarLinkIconActive : tw.sidebarLinkIconInactive}
                        />
                        <span className="text-sm font-semibold">{item.name}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            isActive ? tw.sidebarBadgeActive : tw.sidebarBadgeInactive
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className={`${tw.sidebarDivider} p-2 pt-2 shrink-0`}>
            <button
              onClick={() => authService.logout()}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tw.sidebarLogoutButton}`}
            >
              <LogOut size={16} />
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default CandidatLayout;
