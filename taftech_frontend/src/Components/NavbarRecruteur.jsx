import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../Services/authService";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import { mediaUrl } from "../utils/mediaUrl";
import logoTafTech from "../assets/logo-taftech.png";
import { tw } from "../theme";
import {
  LayoutDashboard, Search, Inbox, Briefcase,
  ClipboardList, Settings, LogOut, Menu, X, User, Shield, Star,
  LogIn, Zap, HelpCircle, MessageCircle,
} from "lucide-react";

const NavbarRecruteur = () => {
  const isLogged = authService.isAuthenticated();
  const role = authService.getUserRole();
  const estRecruteurOuMembre = authService.isRecruteurOuMembre();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumExpire, setPremiumExpire] = useState(null);
  const dropdownRef = useRef(null);

  const isActive = (path) =>
    path === "/recruteurs" ? location.pathname === "/recruteurs" : location.pathname.startsWith(path);

  const navLinkClass = (path) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 ${
      isActive(path) ? tw.navLinkDesktopActiveTeal : tw.navLinkDesktopInactiveTeal
    }`;

  const mobileLinkClass = (path) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      isActive(path) ? tw.navLinkMobileActiveTeal : tw.navLinkMobileInactiveTeal
    }`;

  useEffect(() => {
    if (isLogged && estRecruteurOuMembre) {
      const load = async () => {
        try {
          const dash = await jobsService.getDashboard();
          if (dash.entreprise?.logo) setUserPhoto(mediaUrl(dash.entreprise.logo));
          if (dash.est_premium) setIsPremium(true);
          if (dash.premium_expire_at) setPremiumExpire(dash.premium_expire_at);
          if (dash.membre_role) authService.setMembreRole(dash.membre_role);
        } catch (err) {
          reportError("ECHEC_PHOTO_NAVBAR_RECRUTEUR", err);
        }
      };
      load();
    }
  }, [isLogged, role]);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    setIsMobileOpen(false);
    authService.logout();
    setUserPhoto(null);
    setIsPremium(false);
    setPremiumExpire(null);
    navigate("/recruteurs/connexion");
  };

  return (
    <nav className={tw.navbarShell}>
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-16">

        {/* LOGO */}
        <div className="flex items-center gap-8">
          <Link to="/recruteurs" className="flex items-center gap-2 shrink-0">
            <img src={logoTafTech} alt="TAFTECH" className="h-12 w-auto object-contain" />
            <span className={`text-xs font-semibold ${tw.textTeal} ${tw.bgTealSoft} border border-teal-200 px-2 py-0.5 rounded-md`}>
              Recruteurs
            </span>
          </Link>

          {/* LIENS NON CONNECTÉ */}
          {!isLogged && (
            <div className="hidden lg:flex items-center gap-1">
              <a href="/recruteurs#fonctionnalites" className={tw.navLinkTeal}>
                <Zap size={14} /> Fonctionnalités
              </a>
              <a href="/recruteurs#comment-ca-marche" className={tw.navLinkTeal}>
                <HelpCircle size={14} /> Comment ça marche
              </a>
              <a href="/recruteurs#faq" className={tw.navLinkTeal}>
                <MessageCircle size={14} /> FAQ
              </a>
            </div>
          )}

          {/* LIENS CONNECTÉ */}
          {isLogged && estRecruteurOuMembre && (
            <div className="hidden lg:flex items-center gap-1">
              <Link to="/dashboard" className={navLinkClass("/dashboard")}>
                <LayoutDashboard size={14} /> Tableau de bord
              </Link>
              {authService.peutFaire("UTILISATEUR") && (
                <Link to="/creer-offre" className={navLinkClass("/creer-offre")}>
                  <Briefcase size={14} /> Publier une offre
                </Link>
              )}
              {authService.peutFaire("UTILISATEUR") && (
                <Link to="/cvtheque" className={navLinkClass("/cvtheque")}>
                  <Search size={14} /> CVthèque
                </Link>
              )}
            </div>
          )}
        </div>

        {/* DROITE */}
        <div className="flex items-center gap-3">
          {!isLogged && (
            <>
              <Link to="/" className={tw.navLinkIndigoActive}>
                <User size={14} /> Espace candidat
              </Link>
              <Link to="/recruteurs/connexion" className={tw.navLinkTealActive}>
                <LogIn size={14} /> Connexion
              </Link>
              <Link to="/recruteurs/inscription" className={`${tw.bgTeal} px-4 py-1.5 text-white text-sm font-semibold rounded-lg hover:bg-teal-800 active:scale-95 transition-all duration-150 shadow-md shadow-teal-200`}>
                S'inscrire
              </Link>
            </>
          )}

          {isLogged && estRecruteurOuMembre && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">Mon espace</p>
                  <p className="text-xs leading-tight">
                    {isPremium ? (
                      <span className="text-amber-600 font-semibold">
                        ⭐ Premium
                        {premiumExpire && <span className="text-amber-500 font-normal"> · {premiumExpire}</span>}
                      </span>
                    ) : (
                      <span className={tw.textMuted}>Recruteur</span>
                    )}
                  </p>
                </div>
                <div className={`w-9 h-9 rounded-full ${tw.bgTealSoft} border border-teal-200 flex items-center justify-center overflow-hidden`}>
                  {userPhoto ? (
                    <img src={userPhoto} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-teal-600" />
                  )}
                </div>
              </button>

              {isDropdownOpen && (
                <div className={`${tw.dropdownPanel.replace("shadow-lg","shadow-xl")}`}>
                  {[
                    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord", minRole: "INVITE" },
                    { to: "/cvtheque", icon: Search, label: "CVthèque", minRole: "UTILISATEUR" },
                    { to: "/candidatures-spontanees", icon: Inbox, label: "Candidatures spontanées", minRole: "INVITE" },
                    { to: "/creer-offre", icon: Briefcase, label: "Publier une offre", minRole: "UTILISATEUR" },
                    { to: "/questionnaires", icon: ClipboardList, label: "Questionnaires", minRole: "UTILISATEUR" },
                    { to: "/parametres", icon: Settings, label: "Paramètres", minRole: "INVITE" },
                    ...(authService.peutFaire("PROPRIETAIRE")
                      ? [{ to: "/recruteurs/premium", icon: Star, label: isPremium ? "Mon Premium ⭐" : "Passer Premium 🔒", accent: true, minRole: "PROPRIETAIRE" }]
                      : []),
                  ]
                    .filter(({ minRole }) => authService.peutFaire(minRole))
                    .map(({ to, icon, label, accent }) => {
                      const ItemIcon = icon;
                      return (
                        <Link
                          key={to}
                          to={to}
                          onClick={() => setIsDropdownOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                            accent ? tw.dropdownItemTeal : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <ItemIcon size={15} className="shrink-0" />
                          {label}
                        </Link>
                      );
                    })}
                  <div className={`${tw.borderSubtle} border-t mt-1 pt-1`}>
                    <button
                      onClick={handleLogout}
                      className={tw.dropdownItemDanger}
                    >
                      <LogOut size={15} className="shrink-0" /> Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLogged && role === "ADMIN" && (
            <Link to="/admin-taftech" className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium ${tw.textMuted} hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors`}>
              <Shield size={16} /> Admin
            </Link>
          )}

          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className={`lg:hidden p-2 ${tw.textMuted700} hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors`}
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MENU MOBILE */}
      {isMobileOpen && (
        <div className={`lg:hidden ${tw.borderSubtle} border-t bg-white px-4 py-3 space-y-1`}>
          {!isLogged && (
            <>
              <a href="/recruteurs#fonctionnalites" onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${tw.navLinkMobileInactive}`}>
                <Zap size={16} className="shrink-0" /> Fonctionnalités
              </a>
              <a href="/recruteurs#comment-ca-marche" onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${tw.navLinkMobileInactive}`}>
                <HelpCircle size={16} className="shrink-0" /> Comment ça marche
              </a>
              <a href="/recruteurs#faq" onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${tw.navLinkMobileInactive}`}>
                <MessageCircle size={16} className="shrink-0" /> FAQ
              </a>
              <div className={`${tw.borderSubtle} border-t pt-2 mt-1`}>
                <Link to="/" onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${tw.navLinkMobileInactive}`}>
                  <User size={16} className="shrink-0" /> Espace candidat
                </Link>
                <Link to="/recruteurs/connexion" onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium ${tw.navLinkMobileInactive}`}>
                  <LogIn size={16} className="shrink-0" /> Connexion
                </Link>
                <Link to="/recruteurs/inscription" onClick={() => setIsMobileOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold ${tw.textTeal} hover:bg-teal-50 rounded-lg transition-colors`}>
                  <User size={16} className="shrink-0" /> S'inscrire
                </Link>
              </div>
            </>
          )}

          {isLogged && estRecruteurOuMembre && (
            <>
              {[
                { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, minRole: "INVITE" },
                { to: "/creer-offre", label: "Publier une offre", icon: Briefcase, minRole: "UTILISATEUR" },
                { to: "/cvtheque", label: "CVthèque", icon: Search, minRole: "UTILISATEUR" },
                { to: "/candidatures-spontanees", label: "Candidatures spontanées", icon: Inbox, minRole: "INVITE" },
                { to: "/questionnaires", label: "Questionnaires", icon: ClipboardList, minRole: "UTILISATEUR" },
                { to: "/parametres", label: "Paramètres", icon: Settings, minRole: "INVITE" },
              ]
                .filter(({ minRole }) => authService.peutFaire(minRole))
                .map(({ to, label, icon }) => {
                  const ItemIcon = icon;
                  return (
                    <Link key={to} to={to} onClick={() => setIsMobileOpen(false)} className={mobileLinkClass(to)}>
                      <ItemIcon size={16} className="shrink-0" /> {label}
                    </Link>
                  );
                })}
              <div className={`${tw.borderSubtle} border-t pt-2 mt-2`}>
                <button onClick={handleLogout} className={tw.dropdownItemDanger}>
                  <LogOut size={16} className="shrink-0" /> Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default NavbarRecruteur;
