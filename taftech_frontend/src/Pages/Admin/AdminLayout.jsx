import React, { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
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
  Layers,
  Receipt,
  HelpCircle,
  Tags,
  Lightbulb,
  Newspaper,
  GalleryHorizontal,
  FileEdit,
  CalendarClock,
  FolderLock,
  TrendingUp,
  GraduationCap,
  Gauge,
  Menu,
  X,
} from "lucide-react";
import { tw } from "../../theme";
import { adminService } from "../../Services/adminService";

const NavBadge = ({ count }) =>
  count > 0 ? (
    <span className="ml-auto min-w-4.5 h-4.5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

// Chaque groupe a sa couleur (pastille devant le libellé de section + icône du lien actif) —
// la même couleur est reprise par l'en-tête de chaque page (AdminPageHeader `color`), pour qu'on
// sache toujours dans quelle section du panel on se trouve.
const NAV_GROUPS = [
  {
    label: "Principal",
    dot: "bg-indigo-500",
    items: [{ to: "/admin-taftech/dashboard", icon: LayoutDashboard, label: "Vue d'ensemble" }],
  },
  {
    // Valider/refuser du contenu créé par les comptes (entreprises, offres) + suivi.
    label: "Modération",
    dot: "bg-amber-500",
    items: [
      { to: "/admin-taftech/entreprises", icon: Building2, label: "Entreprises", badgeKey: "entreprises_attente" },
      { to: "/admin-taftech/offres", icon: Briefcase, label: "Offres d'emploi", badgeKey: "offres_attente" },
      { to: "/admin-taftech/candidatures", icon: FileText, label: "Candidatures" },
      { to: "/admin-taftech/demandes-premium", icon: Star, label: "Demandes d'abonnement", badgeKey: "demandes_premium_attente" },
    ],
  },
  {
    // Identité et rôle des comptes plateforme.
    label: "Comptes",
    dot: "bg-blue-500",
    items: [
      { to: "/admin-taftech/utilisateurs", icon: Users, label: "Utilisateurs" },
      { to: "/admin-taftech/comptes-admins", icon: UserCog, label: "Comptes admins" },
    ],
  },
  {
    // Contenu éditorial du site public + communication vers les utilisateurs.
    label: "Contenu du site",
    dot: "bg-teal-500",
    items: [
      { to: "/admin-taftech/broadcast", icon: Megaphone, label: "Diffusion" },
      { to: "/admin-taftech/articles", icon: Newspaper, label: "Blog / Articles" },
      { to: "/admin-taftech/bannieres", icon: GalleryHorizontal, label: "Bannières" },
      { to: "/admin-taftech/pages", icon: FileEdit, label: "Pages du site" },
      { to: "/admin-taftech/faq", icon: HelpCircle, label: "FAQ" },
      { to: "/admin-taftech/seo", icon: TrendingUp, label: "SEO" },
    ],
  },
  {
    // Données de référence consommées par le matching et les formulaires.
    label: "Référentiels",
    dot: "bg-violet-500",
    items: [
      { to: "/admin-taftech/referentiel-v2", icon: GraduationCap, label: "Métiers & diplômes", badgeKey: "formations_a_verifier" },
      { to: "/admin-taftech/competences", icon: Tags, label: "Compétences", badgeKey: "competences_a_valider" },
      { to: "/admin-taftech/metiers-suggeres", icon: Lightbulb, label: "Métiers suggérés", badgeKey: "metiers_a_valider" },
    ],
  },
  {
    // Services proposés aux candidats depuis leur tableau de bord.
    label: "Espace candidat",
    dot: "bg-rose-500",
    items: [
      { to: "/admin-taftech/rendez-vous", icon: CalendarClock, label: "Rendez-vous" },
      { to: "/admin-taftech/types-documents", icon: FolderLock, label: "Types de documents" },
    ],
  },
  {
    // Ce que paie/consomme un compte recruteur.
    label: "Facturation",
    dot: "bg-emerald-500",
    items: [
      { to: "/admin-taftech/abonnements-ia", icon: Layers, label: "Abonnements & IA" },
      { to: "/admin-taftech/mentions-legales", icon: Receipt, label: "Mentions légales" },
    ],
  },
  {
    label: "Système",
    dot: "bg-slate-500",
    items: [
      { to: "/admin-taftech/qualite-ia", icon: Gauge, label: "Qualité IA" },
      { to: "/admin-taftech/audit", icon: ShieldCheck, label: "Journal d'audit" },
      { to: "/admin-taftech/erreurs-systeme", icon: AlertTriangle, label: "Erreurs système" },
    ],
  },
];

const AdminLayout = () => {
  const [stats, setStats] = useState(null);
  const [menuOuvert, setMenuOuvert] = useState(false);
  const location = useLocation();

  // Recharge les compteurs de la sidebar à chaque changement de page — sinon un badge
  // "3 offres en attente" restait figé après les avoir modérées, jusqu'au F5.
  useEffect(() => {
    adminService
      .getAdminStats()
      .then(setStats)
      .catch(() => {});
    setMenuOuvert(false);
  }, [location.pathname]);

  // Bloque le scroll de la page derrière le menu mobile ouvert.
  useEffect(() => {
    document.body.style.overflow = menuOuvert ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOuvert]);

  const navLinkClass = ({ isActive }) =>
    `relative w-full text-left pl-4 pr-3 py-2.5 rounded-lg font-medium text-sm transition flex items-center gap-3 ${tw.focusRing} ${
      isActive ? tw.adminNavLinkActive : tw.adminNavLinkInactive
    }`;

  const totalAlertes =
    (stats?.entreprises_attente || 0) + (stats?.offres_attente || 0) + (stats?.demandes_premium_attente || 0);

  const sidebar = (
    <>
      <div className={`px-5 py-5 border-b ${tw.borderSubtle} flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-sm shrink-0">
          TT
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-base font-bold tracking-widest ${tw.textPrimary}`}>TAFTECH</p>
          <p className={`text-[11px] ${tw.textMuted} font-medium`}>Super Admin</p>
        </div>
        <button
          type="button"
          onClick={() => setMenuOuvert(false)}
          className={`lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 ${tw.focusRing}`}
          aria-label="Fermer le menu"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Navigation administration">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className={`px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider ${tw.textMuted} flex items-center gap-1.5`}>
              <span className={`w-1.5 h-1.5 rounded-full ${group.dot}`} />
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ to, icon: Icon, label, badgeKey }) => (
                <NavLink key={to} to={to} className={navLinkClass}>
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-indigo-600" />}
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
    </>
  );

  return (
    <div className={`flex h-screen ${tw.surfaceMuted}`}>
      {/* Sidebar desktop */}
      <aside className={`hidden lg:flex w-64 ${tw.surface} border-r ${tw.borderSubtle} flex-col shadow-sm z-10 shrink-0`}>
        {sidebar}
      </aside>

      {/* Sidebar mobile (tiroir) */}
      {menuOuvert && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenuOuvert(false)} aria-hidden="true" />
          <aside className={`relative w-72 max-w-[85vw] ${tw.surface} flex flex-col shadow-xl`}>{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barre supérieure mobile */}
        <div className={`lg:hidden flex items-center gap-3 px-4 h-14 ${tw.surface} border-b ${tw.borderSubtle} shrink-0`}>
          <button
            type="button"
            onClick={() => setMenuOuvert(true)}
            className={`relative p-2 -ml-2 rounded-lg text-slate-700 hover:bg-slate-100 ${tw.focusRing}`}
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
            {totalAlertes > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />}
          </button>
          <p className={`text-sm font-bold tracking-widest ${tw.textPrimary}`}>TAFTECH ADMIN</p>
        </div>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
