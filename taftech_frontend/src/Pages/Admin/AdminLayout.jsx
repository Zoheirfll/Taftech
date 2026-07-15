import React from "react";
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
} from "lucide-react";
import { tw } from "../../theme";

const AdminLayout = () => {
  const navLinkClass = ({ isActive }) =>
    `w-full text-left px-3 py-2.5 rounded-lg font-medium text-sm transition flex items-center gap-3 ${
      isActive ? tw.adminNavLinkActive : tw.adminNavLinkInactive
    }`;

  return (
    <div className={`flex h-screen ${tw.surfaceMuted}`}>
      <div className={`w-60 ${tw.surfaceDark} ${tw.textOnDark} flex flex-col shadow-2xl z-10 shrink-0`}>
        <div className={`px-5 py-6 border-b ${tw.borderNeutral800}`}>
          <h1 className={`text-lg font-bold tracking-widest ${tw.textPrimaryLight}`}>
            TAFTECH
          </h1>
          <p className={`text-xs ${tw.textMuted700} font-medium mt-0.5`}>
            Super Admin
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 mt-2">
          <NavLink to="/admin-taftech/dashboard" className={navLinkClass}>
            <LayoutDashboard size={16} className="shrink-0" /> Vue
            d'ensemble
          </NavLink>
          <NavLink to="/admin-taftech/metiers" className={navLinkClass}>
            <Briefcase size={16} className="shrink-0" /> Référentiel
            métiers
          </NavLink>
          <NavLink to="/admin-taftech/entreprises" className={navLinkClass}>
            <Building2 size={16} className="shrink-0" /> Entreprises
          </NavLink>
          <NavLink to="/admin-taftech/offres" className={navLinkClass}>
            <Briefcase size={16} className="shrink-0" /> Offres d'emploi
          </NavLink>
          <NavLink to="/admin-taftech/candidatures" className={navLinkClass}>
            <FileText size={16} className="shrink-0" /> Candidatures
          </NavLink>
          <NavLink to="/admin-taftech/utilisateurs" className={navLinkClass}>
            <Users size={16} className="shrink-0" /> Utilisateurs
          </NavLink>
          <NavLink to="/admin-taftech/broadcast" className={navLinkClass}>
            <Megaphone size={16} className="shrink-0" /> Diffusion
          </NavLink>
          <NavLink to="/admin-taftech/audit" className={navLinkClass}>
            <ShieldCheck size={16} className="shrink-0" /> Journal d'audit
          </NavLink>
          <NavLink to="/admin-taftech/erreurs-systeme" className={navLinkClass}>
            <AlertTriangle size={16} className="shrink-0" /> Erreurs système
          </NavLink>
          <NavLink to="/admin-taftech/comptes-admins" className={navLinkClass}>
            <UserCog size={16} className="shrink-0" /> Comptes admins
          </NavLink>
        </nav>
        <div className={`p-4 border-t ${tw.borderNeutral800}`}>
          <Link
            to="/"
            className={`flex items-center gap-2 ${tw.textMuted} text-sm font-medium hover:text-white transition-colors`}
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
