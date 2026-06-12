import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../Services/authService";
import { jobsService } from "../Services/jobsService";
import { reportError } from "../utils/errorReporter";
import logoTafTech from "../assets/logo-taftech.png";
import {
  LayoutDashboard, Search, Inbox, Briefcase,
  ClipboardList, Settings, LogOut, Menu, X, User, Users, Shield,
} from "lucide-react";

const NavbarRecruteur = () => {
  const isLogged = authService.isAuthenticated();
  const role = authService.getUserRole();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isLogged && role === "RECRUTEUR") {
      const load = async () => {
        try {
          const dash = await jobsService.getDashboard();
          if (dash.entreprise?.logo) {
            const logo = dash.entreprise.logo;
            setUserPhoto(logo.startsWith("http") ? logo : `http://localhost:8000${logo}`);
          }
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
    authService.logout();
    navigate("/recruteurs/connexion");
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center h-16">
        {/* LOGO */}
        <div className="flex items-center gap-8">
          <Link to="/recruteurs" className="flex items-center gap-2 shrink-0">
            <img src={logoTafTech} alt="TafTech" className="h-10 w-auto object-contain" />
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
              Recruteurs
            </span>
          </Link>

          {/* LIENS NAVIGATION (non connecté) */}
          {!isLogged && (
            <div className="hidden lg:flex items-center gap-6">
              <a href="/recruteurs#fonctionnalites" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                Fonctionnalités
              </a>
              <a href="/recruteurs#comment-ca-marche" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                Comment ça marche
              </a>
            </div>
          )}

          {/* LIENS NAVIGATION (connecté) */}
          {isLogged && role === "RECRUTEUR" && (
            <div className="hidden lg:flex items-center gap-6">
              <Link to="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5">
                <LayoutDashboard size={14} /> Tableau de bord
              </Link>
              <Link to="/creer-offre" className="text-sm font-medium text-teal-700 hover:text-teal-800 transition-colors flex items-center gap-1.5">
                <Briefcase size={14} /> Publier une offre
              </Link>
              <Link to="/cvtheque" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1.5">
                <Search size={14} /> CVthèque
              </Link>
            </div>
          )}
        </div>

        {/* DROITE */}
        <div className="flex items-center gap-3">
          {!isLogged && (
            <>
              <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors hidden md:block">
                Espace candidat
              </Link>
              <Link to="/recruteurs/connexion" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors hidden md:block">
                Connexion
              </Link>
              <Link to="/recruteurs/inscription" className="px-4 py-2 bg-teal-700 text-white text-sm font-bold rounded-lg hover:bg-teal-800 transition-colors shadow-sm">
                S'inscrire
              </Link>
            </>
          )}

          {isLogged && role === "RECRUTEUR" && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-slate-800 leading-tight">Mon espace</p>
                  <p className="text-xs text-slate-400 leading-tight">Recruteur</p>
                </div>
                <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center overflow-hidden">
                  {userPhoto ? (
                    <img src={userPhoto} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <User size={18} className="text-teal-600" />
                  )}
                </div>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                  {[
                    { to: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
                    { to: "/cvtheque", icon: Search, label: "CVthèque" },
                    { to: "/candidatures-spontanees", icon: Inbox, label: "Candidatures spontanées" },
                    { to: "/creer-offre", icon: Briefcase, label: "Publier une offre" },
                    { to: "/questionnaires", icon: ClipboardList, label: "Questionnaires" },
                    { to: "/parametres", icon: Settings, label: "Paramètres" },
                  ].map(({ to, icon: Icon, label, accent }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setIsDropdownOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                        accent
                          ? "text-teal-700 hover:bg-teal-50"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon size={15} className="shrink-0" />
                      {label}
                    </Link>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <Link
                      to="/"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <Users size={15} className="shrink-0" />
                      Espace candidat
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} className="shrink-0" />
                      Déconnexion
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {isLogged && role === "ADMIN" && (
            <Link to="/admin-taftech" className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
              <Shield size={16} /> Admin
            </Link>
          )}

          {/* MOBILE */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* MENU MOBILE */}
      {isMobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {!isLogged && (
            <>
              <Link to="/" onClick={() => setIsMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                Espace candidat
              </Link>
              <Link to="/recruteurs/connexion" onClick={() => setIsMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                Connexion
              </Link>
              <Link to="/recruteurs/inscription" onClick={() => setIsMobileOpen(false)} className="block px-4 py-2.5 text-sm font-bold text-teal-700 hover:bg-teal-50 rounded-lg transition-colors">
                Publier une offre
              </Link>
            </>
          )}
          {isLogged && role === "RECRUTEUR" && (
            <>
              {[
                { to: "/dashboard", label: "Tableau de bord" },
                { to: "/creer-offre", label: "Publier une offre" },
                { to: "/cvtheque", label: "CVthèque" },
                { to: "/candidatures-spontanees", label: "Candidatures spontanées" },
                { to: "/questionnaires", label: "Questionnaires" },
                { to: "/parametres", label: "Paramètres" },
              ].map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setIsMobileOpen(false)} className="block px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors">
                  {label}
                </Link>
              ))}
              <div className="border-t border-slate-100 pt-2 mt-2">
                <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  Déconnexion
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
