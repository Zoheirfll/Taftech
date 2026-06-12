import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import {
  User,
  Briefcase,
  Mail,
  Bookmark,
  Bell,
  Settings,
  LogOut,
  Sparkles,
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
  }, [location.pathname]);

  const menuItems = [
    { name: "Mon profil", path: "/profil", icon: User },
    { name: "Mes candidatures", path: "/mes-candidatures", icon: Briefcase },
    {
      name: "Boîte de réception",
      path: "/inbox",
      icon: Mail,
      badge: unreadCount > 0 ? unreadCount : null,
    },
    {
      name: "Offres sauvegardées",
      path: "/offres-sauvegardees",
      icon: Bookmark,
    },
    { name: "Alertes d'emploi", path: "/alertes", icon: Bell },
    {
      name: "Suggestions carrière",
      path: "/suggestions-carriere",
      icon: Sparkles,
    },
    { name: "Paramètres", path: "/parametres/candidat", icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6 px-6 py-8 min-h-screen bg-slate-100">
      <aside className="w-full md:w-60 shrink-0">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden sticky top-20">
          <nav className="p-2">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3 py-3 rounded-xl font-medium transition-colors mb-0.5 ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon
                      size={17}
                      className={isActive ? "text-white" : "text-slate-400"}
                    />
                    <span className="text-sm font-semibold">{item.name}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? "bg-white text-indigo-600"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <div className="border-t border-slate-100 mt-2 pt-2">
              <button
                onClick={() => authService.logout()}
                className="w-full flex items-center gap-2.5 px-3 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={17} />
                Déconnexion
              </button>
            </div>
          </nav>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
};

export default CandidatLayout;
