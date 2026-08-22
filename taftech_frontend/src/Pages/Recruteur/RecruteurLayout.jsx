import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { authService } from "../../Services/authService";
import { jobsService } from "../../Services/jobsService";
import { reportError } from "../../utils/errorReporter";
import { tw } from "../../theme";
import {
  LayoutDashboard,
  Search,
  Star,
  Inbox,
  Briefcase,
  ClipboardList,
  Users,
  Settings,
  LogOut,
  CreditCard,
  FileText,
  UserCheck,
  Award,
  Trophy,
  BarChart3,
} from "lucide-react";

const RecruteurLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [messagesNonLus, setMessagesNonLus] = useState(0);
  const [searchValue, setSearchValue] = useState("");
  const searchInputRef = useRef(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const spontanees = await jobsService.getCandidaturesSpontanees();
        setMessagesNonLus(spontanees.filter((c) => !c.lue).length);
      } catch (error) {
        reportError("ECHEC_CHARGEMENT_MESSAGES_LAYOUT_RECRUTEUR", error);
      }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearchSubmit = (e) => {
    if (e.key === "Enter" && searchValue.trim()) {
      navigate(`/cvtheque?search=${encodeURIComponent(searchValue.trim())}`);
    }
  };

  const menuItems = useMemo(
    () => [
      { name: "Tableau de bord", path: "/dashboard", icon: LayoutDashboard, minRole: "INVITE" },
      { name: "Offres d'emploi", path: "/offres-emploi", icon: FileText, minRole: "INVITE" },
      { name: "Candidatures", path: "/candidatures", icon: UserCheck, minRole: "INVITE" },
      {
        name: "CVthèque",
        path: "/cvtheque",
        icon: Search,
        minRole: "UTILISATEUR",
        isActive: () => location.pathname === "/cvtheque" && !location.search.includes("favoris=true"),
      },
      {
        name: "Favoris",
        path: "/cvtheque?favoris=true",
        icon: Star,
        minRole: "UTILISATEUR",
        isActive: () => location.pathname === "/cvtheque" && location.search.includes("favoris=true"),
      },
      {
        name: "Messages",
        path: "/candidatures-spontanees",
        icon: Inbox,
        minRole: "INVITE",
        badge: messagesNonLus > 0 ? messagesNonLus : null,
      },
      { name: "Candidats recommandés", path: "/candidats-recommandes", icon: Award, minRole: "INVITE" },
      { name: "Recrutements", path: "/recrutements", icon: Trophy, minRole: "INVITE" },
      { name: "Statistiques", path: "/statistiques", icon: BarChart3, minRole: "INVITE" },
      { name: "Publier une offre", path: "/creer-offre", icon: Briefcase, minRole: "UTILISATEUR" },
      { name: "Questionnaires", path: "/questionnaires", icon: ClipboardList, minRole: "UTILISATEUR" },
      { name: "Mon équipe", path: "/mon-equipe", icon: Users, minRole: "PROPRIETAIRE" },
      { name: "Abonnements & tarifs", path: "/recruteurs/abonnements", icon: CreditCard, minRole: "PROPRIETAIRE" },
      { name: "Paramètres entreprise", path: "/parametres", icon: Settings, minRole: "INVITE" },
    ],
    [messagesNonLus, location.pathname, location.search],
  );

  const visibleItems = menuItems.filter((item) => authService.peutFaire(item.minRole));

  return (
    <div className={`max-w-7xl mx-auto flex flex-col gap-4 md:gap-5 px-4 md:px-6 py-5 md:py-6 min-h-screen ${tw.surfaceSubtle}`}>
      <div className="relative w-full max-w-xl">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleSearchSubmit}
          placeholder="Rechercher un candidat, un CV, une compétence... (Ctrl+K)"
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-5">
        <aside className="hidden md:block md:w-56 shrink-0">
          <div className={`${tw.sidebarShellTeal} rounded-xl overflow-hidden sticky top-20`}>
            <nav className="p-2">
              {visibleItems.map((item) => {
                const isActive = item.isActive ? item.isActive() : location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg font-medium transition-colors mb-0.5 ${
                      isActive ? tw.sidebarLinkActiveTeal : tw.sidebarLinkInactiveTeal
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon
                        size={16}
                        className={isActive ? tw.sidebarLinkIconActiveTeal : tw.sidebarLinkIconInactiveTeal}
                      />
                      <span className="text-sm font-semibold">{item.name}</span>
                    </div>
                    {item.badge != null && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? tw.sidebarBadgeActiveTeal : tw.sidebarBadgeInactiveTeal
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              <div className={`${tw.sidebarDivider} mt-2 pt-2`}>
                <button
                  onClick={() => authService.logout()}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${tw.sidebarLogoutButton}`}
                >
                  <LogOut size={16} />
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
    </div>
  );
};

export default RecruteurLayout;
