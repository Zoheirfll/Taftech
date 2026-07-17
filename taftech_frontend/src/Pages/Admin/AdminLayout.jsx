import React, { useState, useEffect } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  FileText,
  Users,
  Megaphone,
  ArrowLeft,
  ShieldCheck,
  UserCog,
  AlertTriangle,
  Star,
} from "lucide-react";
import { tw } from "../../theme";
import { adminService } from "../../Services/adminService";

const NavBadge = ({ count }) =>
  count > 0 ? (
    <span className="ml-auto min-w-4.5 h-4.5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

const NAV_GROUPS = [
  {
    label: "Principal",
    items: [
      { to: "/admin-taftech/dashboard", icon: LayoutDashboard, label: "Vue d'ensemble" },
    ],
  },
  {
    label: "Modération",
    items: [
      { to: "/admin-taftech/entreprises", icon: Building2, label: "Entreprises", badgeKey: "entreprises_attente" },
      { to: "/admin-taftech/offres", icon: Briefcase, label: "Offres d'emploi", badgeKey: "offres_attente" },
      { to: "/admin-taftech/candidatures", icon: FileText, label: "Candidatures" },
      { to: "/admin-taftech/demandes-premium", icon: Star, label: "Demandes Premium", badgeKey: "demandes_premium_attente" },
    ],
  },
  {
    label: "Communauté",
    items: [
      { to: "/admin-taftech/utilisateurs", icon: Users, label: "Utilisateurs" },
      { to: "/admin-taftech/metiers", icon: Briefcase, label: "Référentiel métiers" },
      { to: "/admin-taftech/broadcast", icon: Megaphone, label: "Diffusion" },
    ],
  },
  {
    label: "Système",
    items: [
      { to: "/admin-taftech/audit", icon: ShieldCheck, label: "Journal d'audit" },
      { to: "/admin-taftech/erreurs-systeme", icon: AlertTriangle, label: "Erreurs système" },
      { to: "/admin-taftech/comptes-admins", icon: UserCog, label: "Comptes admins" },
    ],
  },
];

const AdminLayout = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    adminService
      .getAdminStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  const navLinkClass = ({ isActive }) =>
    `relative w-full text-left pl-4 pr-3 py-2.5 rounded-lg font-medium text-sm transition flex items-center gap-3 ${
      isActive ? tw.adminNavLinkActive : tw.adminNavLinkInactive
    }`;

  return (
    <div className={`flex h-screen ${tw.surfaceMuted}`}>
      <div className={`w-64 ${tw.surface} border-r ${tw.borderSubtle} flex flex-col shadow-sm z-10 shrink-0`}>
        <div className={`px-5 py-6 border-b ${tw.borderSubtle} flex items-center gap-3`}>
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
            TT
          </div>
          <div>
            <h1 className={`text-base font-bold tracking-widest ${tw.textPrimary}`}>
              TAFTECH
            </h1>
            <p className={`text-[11px] ${tw.textMuted} font-medium`}>
              Super Admin
            </p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className={`px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider ${tw.textMuted}`}>
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label, badgeKey }) => (
                  <NavLink key={to} to={to} className={navLinkClass}>
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-indigo-600" />
                        )}
                        <Icon size={16} className="shrink-0" />
                        <span className="truncate">{label}</span>
                        {badgeKey && <NavBadge count={stats?.[badgeKey]} />}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className={`p-4 border-t ${tw.borderSubtle}`}>
          <Link
            to="/"
            className={`flex items-center gap-2 ${tw.textMuted} text-sm font-medium hover:text-slate-900 transition-colors`}
          >
            <ArrowLeft size={14} /> Quitter l'admin
          </Link>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
