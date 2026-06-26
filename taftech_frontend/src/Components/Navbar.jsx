import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authService } from "../Services/authService";
import { profilService } from "../Services/profilService";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import { mediaUrl } from "../utils/mediaUrl";
import logoTafTech from "../assets/logo-taftech.png";
import {
  User, Bookmark, Briefcase, Bell, Settings, LayoutDashboard,
  Search, Mail, LogOut, Inbox, ClipboardList, Shield, Menu, X,
  Sparkles, MapPin, Building2, LogIn, Home,
} from "lucide-react";

const DropdownLink = ({ to, icon: IconComp, onClick, children }) => (
  <Link
    onClick={onClick}
    to={to}
    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
  >
    {IconComp && <IconComp size={16} className="text-slate-400 shrink-0" />}
    {children}
  </Link>
);

const Navbar = () => {
  const isLogged = authService.isAuthenticated();
  const role = authService.getUserRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const isActive = (path) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const navLinkClass = (path) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 ${
      isActive(path)
        ? "text-indigo-600 bg-indigo-50 font-semibold"
        : "text-slate-900 hover:text-indigo-600 hover:bg-indigo-50"
    }`;

  const mobileLinkClass = (path) =>
    `flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      isActive(path)
        ? "text-indigo-600 bg-indigo-50 font-semibold"
        : "text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
    }`;

  useEffect(() => {
    if (isLogged) {
      const loadUserPhoto = async () => {
        try {
          if (role === "RECRUTEUR") {
            const dash = await jobsService.getDashboard();
            if (dash.entreprise?.logo) setUserPhoto(mediaUrl(dash.entreprise.logo));
          } else {
            const data = await profilService.getProfil();
            if (data.photo_profil) setUserPhoto(mediaUrl(data.photo_profil));
          }
        } catch (error) {
          reportError("ECHEC_CHARGEMENT_PHOTO_NAVBAR", error);
        }
      };
      loadUserPhoto();

      if (role === "CANDIDAT") {
        const loadNotifications = async () => {
          try {
            const notifs = await jobsService.getNotifications();
            setUnreadCount(notifs.filter((n) => !n.lue).length);
          } catch (error) {
            reportError("ECHEC_CHARGEMENT_NOTIFS_NAVBAR", error);
          }
        };
        loadNotifications();
      }
    }
  }, [isLogged, role]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setIsDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeDropdown = () => setIsDropdownOpen(false);
  const closeMobile = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    closeDropdown();
    closeMobile();
    authService.logout();
    setUserPhoto(null);
    setUnreadCount(0);
    navigate("/login");
  };

  const NAV_LINKS = [
    { to: "/", label: "Accueil", icon: Home },
    { to: "/offres", label: "Recherche avancée", icon: Search },
    { to: "/secteurs", label: "Par secteur", icon: Briefcase },
    { to: "/regions", label: "Par région", icon: MapPin },
    { to: "/entreprises", label: "Entreprises", icon: Building2 },
  ];

  return (
    <nav className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-15">

        {/* GAUCHE : LOGO + LIENS */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center shrink-0">
            <img src={logoTafTech} alt="TafTech" className="h-16 w-auto object-contain" />
          </Link>
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className={navLinkClass(to)}>
                <Icon size={14} className="shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* DROITE */}
        <div className="flex items-center gap-2">

          {/* NON CONNECTÉ */}
          {!isLogged && (
            <>
              <Link to="/recruteurs" className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-all duration-150">
                <Briefcase size={14} /> Espace recruteur
              </Link>
              <Link to="/login" className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-900 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-all duration-150">
                <LogIn size={14} /> Se connecter
              </Link>
              <Link to="/register" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 active:scale-95 transition-all duration-150 shadow-md shadow-indigo-200">
                S'inscrire
              </Link>
            </>
          )}

          {/* CONNECTÉ */}
          {isLogged && (
            <div className="flex items-center gap-2">
              {role === "CANDIDAT" && (
                <Link to="/inbox" className="relative p-2 text-slate-500 hover:text-indigo-600 transition-colors rounded-lg hover:bg-slate-50" title="Boîte de réception">
                  <Mail size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2.5 focus:outline-none group px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="hidden md:block text-right">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">Mon compte</p>
                    <p className="text-xs text-slate-400 capitalize leading-tight">{role?.toLowerCase()}</p>
                  </div>
                  <div className="relative">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden group-hover:border-indigo-400 transition-colors">
                      {userPhoto ? (
                        <img src={userPhoto} alt="Profil" className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-slate-400" />
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                  </div>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                    {role === "CANDIDAT" && (
                      <>
                        <DropdownLink to="/profil" icon={User} onClick={closeDropdown}>Mon profil</DropdownLink>
                        <DropdownLink to="/mes-candidatures" icon={Briefcase} onClick={closeDropdown}>Mes candidatures</DropdownLink>
                        <DropdownLink to="/offres-sauvegardees" icon={Bookmark} onClick={closeDropdown}>Offres sauvegardées</DropdownLink>
                        <DropdownLink to="/alertes" icon={Bell} onClick={closeDropdown}>Alertes d'emploi</DropdownLink>
                        <DropdownLink to="/suggestions-carriere" icon={Sparkles} onClick={closeDropdown}>Suggestions carrière</DropdownLink>
                        <DropdownLink to="/parametres/candidat" icon={Settings} onClick={closeDropdown}>Paramètres</DropdownLink>
                      </>
                    )}
                    {role === "RECRUTEUR" && (
                      <>
                        <DropdownLink to="/dashboard" icon={LayoutDashboard} onClick={closeDropdown}>Tableau de bord</DropdownLink>
                        <DropdownLink to="/cvtheque" icon={Search} onClick={closeDropdown}>CVthèque</DropdownLink>
                        <DropdownLink to="/candidatures-spontanees" icon={Inbox} onClick={closeDropdown}>Candidatures spontanées</DropdownLink>
                        <DropdownLink to="/creer-offre" icon={Briefcase} onClick={closeDropdown}>
                          <span className="text-indigo-600 font-semibold">Publier une offre</span>
                        </DropdownLink>
                        <DropdownLink to="/questionnaires" icon={ClipboardList} onClick={closeDropdown}>Questionnaires</DropdownLink>
                        <DropdownLink to="/parametres" icon={Settings} onClick={closeDropdown}>Paramètres</DropdownLink>
                      </>
                    )}
                    {role === "ADMIN" && (
                      <DropdownLink to="/admin-taftech" icon={Shield} onClick={closeDropdown}>Tour de contrôle</DropdownLink>
                    )}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
                        <LogOut size={16} className="shrink-0" /> Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MENU MOBILE */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={closeMobile} className={mobileLinkClass(to)}>
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          ))}

          {!isLogged && (
            <>
              <div className="border-t border-slate-100 pt-2 mt-2" />
              <Link to="/login" onClick={closeMobile} className={mobileLinkClass("/login")}>
                <LogIn size={16} className="shrink-0" /> Se connecter
              </Link>
              <Link to="/register" onClick={closeMobile} className={mobileLinkClass("/register")}>
                <User size={16} className="shrink-0" /> S'inscrire
              </Link>
              <Link to="/recruteurs" onClick={closeMobile} className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
                <Briefcase size={16} className="shrink-0" /> Espace recruteur
              </Link>
            </>
          )}

          {isLogged && (
            <>
              <div className="border-t border-slate-100 pt-2 mt-2" />
              {role === "CANDIDAT" && (
                <>
                  <Link to="/profil" onClick={closeMobile} className={mobileLinkClass("/profil")}><User size={16} className="shrink-0" /> Mon profil</Link>
                  <Link to="/mes-candidatures" onClick={closeMobile} className={mobileLinkClass("/mes-candidatures")}><Briefcase size={16} className="shrink-0" /> Mes candidatures</Link>
                  <Link to="/inbox" onClick={closeMobile} className={mobileLinkClass("/inbox")}><Mail size={16} className="shrink-0" /> Boîte de réception</Link>
                  <Link to="/offres-sauvegardees" onClick={closeMobile} className={mobileLinkClass("/offres-sauvegardees")}><Bookmark size={16} className="shrink-0" /> Offres sauvegardées</Link>
                  <Link to="/alertes" onClick={closeMobile} className={mobileLinkClass("/alertes")}><Bell size={16} className="shrink-0" /> Alertes d'emploi</Link>
                  <Link to="/suggestions-carriere" onClick={closeMobile} className={mobileLinkClass("/suggestions-carriere")}><Sparkles size={16} className="shrink-0" /> Suggestions carrière</Link>
                  <Link to="/parametres/candidat" onClick={closeMobile} className={mobileLinkClass("/parametres/candidat")}><Settings size={16} className="shrink-0" /> Paramètres</Link>
                </>
              )}
              {role === "RECRUTEUR" && (
                <>
                  <Link to="/dashboard" onClick={closeMobile} className={mobileLinkClass("/dashboard")}><LayoutDashboard size={16} className="shrink-0" /> Tableau de bord</Link>
                  <Link to="/cvtheque" onClick={closeMobile} className={mobileLinkClass("/cvtheque")}><Search size={16} className="shrink-0" /> CVthèque</Link>
                  <Link to="/candidatures-spontanees" onClick={closeMobile} className={mobileLinkClass("/candidatures-spontanees")}><Inbox size={16} className="shrink-0" /> Candidatures spontanées</Link>
                  <Link to="/creer-offre" onClick={closeMobile} className={mobileLinkClass("/creer-offre")}><Briefcase size={16} className="shrink-0" /> Publier une offre</Link>
                  <Link to="/questionnaires" onClick={closeMobile} className={mobileLinkClass("/questionnaires")}><ClipboardList size={16} className="shrink-0" /> Questionnaires</Link>
                  <Link to="/parametres" onClick={closeMobile} className={mobileLinkClass("/parametres")}><Settings size={16} className="shrink-0" /> Paramètres</Link>
                </>
              )}
              {role === "ADMIN" && (
                <Link to="/admin-taftech" onClick={closeMobile} className={mobileLinkClass("/admin-taftech")}><Shield size={16} className="shrink-0" /> Tour de contrôle</Link>
              )}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

export default Navbar;
