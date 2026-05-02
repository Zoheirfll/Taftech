import React from "react";
import { Link } from "react-router-dom";
import logoTafTech from "../assets/logo-taftech.png";

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 font-sans">
      {/* === SECTION 1 : NEWSLETTER (L'accroche) === */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left text-white">
            <h3 className="text-xl font-black mb-1">
              Ne ratez plus aucune opportunité
            </h3>
            <p className="text-blue-100 text-sm font-medium">
              Recevez les meilleures offres de votre secteur chaque semaine.
            </p>
          </div>
          <div className="flex w-full max-w-md gap-2">
            <input
              type="email"
              placeholder="Votre email..."
              className="flex-1 px-4 py-3 rounded-xl outline-none font-bold text-gray-800 text-sm"
            />
            <button className="bg-gray-900 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg active:scale-95">
              S'INSCRIRE
            </button>
          </div>
        </div>
      </div>

      {/* === SECTION 2 : LIENS PRINCIPAUX === */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand & Socials */}
          <div className="space-y-6">
            <Link
              to="/"
              className="inline-block transition-transform hover:scale-105"
            >
              <img
                src={logoTafTech}
                alt="TafTech"
                className="h-10 w-auto object-contain transform scale-150 origin-left"
              />
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed font-medium">
              La plateforme de recrutement nouvelle génération en Algérie. L'IA
              au service de votre carrière.
            </p>
            <div className="flex gap-4">
              {["facebook-f", "linkedin-in", "instagram"].map((icon) => (
                <a
                  key={icon}
                  href="#"
                  className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all duration-300"
                >
                  <i className={`fab fa-${icon}`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Candidats */}
          <div>
            <h4 className="text-gray-900 font-black text-xs uppercase tracking-[0.2em] mb-6 border-l-4 border-blue-600 pl-3">
              Talents
            </h4>
            <ul className="space-y-4">
              {[
                { name: "Toutes les offres", to: "/offres" },
                { name: "Offres par Wilaya", to: "/regions" },
                { name: "Offres par Secteur", to: "/secteurs" },
                { name: "Postulation Rapide", to: "/offres" },
                { name: "Mon Profil", to: "/profil" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="text-gray-500 hover:text-blue-600 font-bold text-sm transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Recruteurs */}
          <div>
            <h4 className="text-gray-900 font-black text-xs uppercase tracking-[0.2em] mb-6 border-l-4 border-blue-600 pl-3">
              Entreprises
            </h4>
            <ul className="space-y-4">
              {[
                { name: "Publier une annonce", to: "/creer-offre" },
                { name: "Espace Recruteur", to: "/dashboard" },
                { name: "Tarifs & Solutions", to: "/" },
                { name: "CV-thèque IA", to: "/dashboard" },
                { name: "Support Client", to: "/" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="text-gray-500 hover:text-blue-600 font-bold text-sm transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Info */}
          <div>
            <h4 className="text-gray-900 font-black text-xs uppercase tracking-[0.2em] mb-6 border-l-4 border-blue-600 pl-3">
              Siège Social
            </h4>
            <div className="space-y-4 text-sm font-bold text-gray-600">
              <p className="flex items-center gap-3">
                <span className="text-blue-600">📍</span> 16, Rue des Talents,
                Alger
              </p>
              <p className="flex items-center gap-3">
                <span className="text-blue-600">✉️</span> contact@taftech.dz
              </p>
              <p className="flex items-center gap-3">
                <span className="text-blue-600">📞</span> +213 (0) 555 12 34 56
              </p>
              <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase mb-1">
                  Status du serveur
                </p>
                <p className="text-[10px] text-green-600 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>{" "}
                  Opérationnel
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === SECTION 3 : COPYRIGHT === */}
      <div className="bg-gray-50 border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
            © {new Date().getFullYear()} TAFTECH — Made for a better recruitment
          </p>

          <div className="flex gap-6">
            {["Confidentialité", "CGU", "Cookies"].map((item) => (
              <Link
                key={item}
                to="/"
                className="text-[11px] font-black text-gray-400 uppercase hover:text-blue-600 transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>

          <p className="text-[10px] font-bold text-gray-300 italic">
            Proudly built with React & Django
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
