import React from "react";
import { Link } from "react-router-dom";
import logoTafTech from "../assets/logo-taftech.png";

const Footer = () => {
  return (
    <footer className="bg-indigo-950 border-t border-indigo-900">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/">
              <img
                src={logoTafTech}
                alt="TafTech"
                className="h-9 w-auto object-contain brightness-200"
              />
            </Link>
            <p className="text-indigo-300 text-sm leading-relaxed">
              La plateforme de recrutement intelligente en Algérie. L'IA au
              service de votre carrière.
            </p>
          </div>

          {/* Talents */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 border-l-2 border-amber-400 pl-3">
              Talents
            </h4>
            <ul className="space-y-3">
              {[
                { name: "Toutes les offres", to: "/offres" },
                { name: "Par wilaya", to: "/regions" },
                { name: "Par secteur", to: "/secteurs" },
                { name: "Mon profil", to: "/profil" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="text-indigo-300 hover:text-amber-400 text-sm font-medium transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Entreprises */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 border-l-2 border-amber-400 pl-3">
              Entreprises
            </h4>
            <ul className="space-y-3">
              {[
                { name: "Publier une annonce", to: "/creer-offre" },
                { name: "Espace recruteur", to: "/dashboard" },
                { name: "CVthèque IA", to: "/dashboard" },
                { name: "Support client", to: "/" },
              ].map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.to}
                    className="text-indigo-300 hover:text-amber-400 text-sm font-medium transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 border-l-2 border-amber-400 pl-3">
              Contact
            </h4>
            <div className="space-y-3 text-sm text-indigo-300">
              <p>Oran, Algérie</p>
              <p>taftech963@gmail.com</p>
              <p>+213 (0) XXX XX XX XX</p>
            </div>
          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="border-t border-indigo-900 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-indigo-400">
            © {new Date().getFullYear()} TafTech — Made for a better recruitment
          </p>
          <div className="flex gap-5">
            {["Confidentialité", "CGU", "Cookies"].map((item) => (
              <Link
                key={item}
                to="/"
                className="text-xs text-indigo-400 hover:text-amber-400 transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
