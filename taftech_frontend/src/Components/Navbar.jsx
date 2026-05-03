import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../Services/authService";
import { profilService } from "../Services/profilService";
import { jobsService } from "../Services/jobsService";
import logoTafTech from "../assets/logo-taftech.png";

const Navbar = () => {
  const isLogged = authService.isAuthenticated();
  const role = authService.getUserRole();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userPhoto, setUserPhoto] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isLogged) {
      const loadUserPhoto = async () => {
        try {
          const data = await profilService.getProfil();
          if (data.photo_profil) {
            const fullUrl = data.photo_profil.startsWith("http")
              ? data.photo_profil
              : `http://127.0.0.1:8000${data.photo_profil}`;
            setUserPhoto(fullUrl);
          }
        } catch (error) {
          console.error("Erreur chargement photo navbar", error);
        }
      };
      loadUserPhoto();

      if (role === "CANDIDAT") {
        const loadNotifications = async () => {
          try {
            const notifs = await jobsService.getNotifications();
            const unread = notifs.filter((n) => !n.lue).length;
            setUnreadCount(unread);
          } catch (error) {
            console.error("Erreur chargement notifications navbar", error);
          }
        };
        loadNotifications();
      }
    }
  }, [isLogged, role]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeDropdown = () => setIsDropdownOpen(false);

  const handleLogout = () => {
    closeDropdown();
    authService.logout();
    setUserPhoto(null);
    setUnreadCount(0);
    navigate("/login");
  };

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm py-2 sticky top-0 z-50 px-6 md:px-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center h-16">
        {/* === GAUCHE : LOGO ET LIENS === */}
        <div className="flex items-center gap-8 lg:gap-10">
          <Link to="/" className="flex items-center group">
            <img
              src={logoTafTech}
              alt="TafTech Logo"
              className="h-12 w-auto object-contain transform scale-125 origin-left transition-transform group-hover:scale-[1.35]"
            />
          </Link>

          <div className="hidden lg:flex items-center gap-5 font-bold text-gray-700 text-sm">
            <Link to="/" className="hover:text-blue-600 transition-colors">
              Offres d'emploi
            </Link>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
            <Link
              to="/offres"
              className="hover:text-blue-600 transition-colors"
            >
              Recherche avancée
            </Link>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
            <Link
              to="/secteurs"
              className="hover:text-blue-600 transition-colors"
            >
              Par secteur
            </Link>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
            <Link
              to="/regions"
              className="hover:text-blue-600 transition-colors"
            >
              Par région
            </Link>
          </div>
        </div>

        {/* === DROITE : ACTIONS ET AVATAR === */}
        <div className="flex items-center gap-4 md:gap-6 font-medium text-gray-700 text-base">
          {!isLogged ? (
            <>
              <Link
                to="/register-entreprise"
                className="hidden md:block text-blue-600 font-bold hover:underline"
              >
                Espace Recruteur
              </Link>
              <Link to="/login" className="font-bold hover:text-blue-600">
                Se connecter
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl shadow-md font-bold transition-all hover:bg-blue-700"
              >
                S'inscrire
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-5">
              {role === "CANDIDAT" && (
                <Link
                  to="/inbox"
                  className="relative text-gray-500 hover:text-blue-600 transition-colors mt-1 group"
                  title="Boîte de réception"
                >
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    ></path>
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-500 rounded-full shadow-sm animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-3 focus:outline-none group"
                >
                  <div className="hidden md:block text-right">
                    <p className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Mon Compte
                    </p>
                    <p className="text-sm text-gray-500 font-medium capitalize">
                      {role.toLowerCase()}
                    </p>
                  </div>

                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden group-hover:border-blue-500 transition-all shadow-sm">
                      {userPhoto ? (
                        <img
                          src={userPhoto}
                          alt="Profil"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-6 h-6 text-gray-400 mt-2"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
                  </div>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-4 w-64 bg-white rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] border border-gray-100 py-2 z-50 transform origin-top-right transition-all">
                    {/* --- MENU CANDIDAT --- */}
                    {role === "CANDIDAT" && (
                      <div className="flex flex-col">
                        <Link
                          onClick={closeDropdown}
                          to="/profil"
                          className="flex items-center gap-3 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            ></path>
                          </svg>
                          Mon profil
                        </Link>
                        <Link
                          onClick={closeDropdown}
                          to="/offres-sauvegardees"
                          className="flex items-center gap-3 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                            ></path>
                          </svg>
                          Offres sauvegardées
                        </Link>
                        <Link
                          onClick={closeDropdown}
                          to="/mes-candidatures"
                          className="flex items-center gap-3 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            ></path>
                          </svg>
                          Mes candidatures
                        </Link>
                        <Link
                          onClick={closeDropdown}
                          to="/alertes"
                          className="flex items-center gap-3 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            ></path>
                          </svg>
                          Alertes d'emploi
                        </Link>
                        <Link
                          onClick={closeDropdown}
                          to="/parametres"
                          className="flex items-center gap-3 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            ></path>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            ></path>
                          </svg>
                          Paramètres
                        </Link>
                      </div>
                    )}

                    {/* --- MENU RECRUTEUR --- */}
                    {role === "RECRUTEUR" && (
                      <div className="flex flex-col">
                        <Link
                          onClick={closeDropdown}
                          to="/dashboard"
                          className="flex items-center gap-3 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                            ></path>
                          </svg>
                          Tableau de bord
                        </Link>

                        {/* 👇 LE NOUVEAU LIEN CVTHÈQUE 👇 */}
                        <Link
                          onClick={closeDropdown}
                          to="/cvtheque"
                          className="flex items-center gap-3 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                            ></path>
                          </svg>
                          CVthèque
                        </Link>

                        <Link
                          onClick={closeDropdown}
                          to="/creer-offre"
                          className="flex items-center gap-3 px-5 py-3 text-base font-bold text-green-600 hover:bg-green-50 transition-colors border-l-4 border-green-500 bg-green-50/50"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M12 4v16m8-8H4"
                            ></path>
                          </svg>
                          Publier une offre
                        </Link>
                      </div>
                    )}

                    {/* --- MENU ADMIN --- */}
                    {role === "ADMIN" && (
                      <div className="flex flex-col">
                        <Link
                          onClick={closeDropdown}
                          to="/admin-taftech"
                          className="flex items-center gap-3 px-5 py-3 text-base font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            ></path>
                          </svg>
                          Tour de contrôle
                        </Link>
                      </div>
                    )}

                    {/* --- BOUTON DÉCONNEXION --- */}
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-5 py-3 text-base font-bold text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          ></path>
                        </svg>
                        Déconnexion
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
