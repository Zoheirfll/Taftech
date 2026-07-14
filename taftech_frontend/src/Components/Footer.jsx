import React from "react";
import { Link } from "react-router-dom";
import logoTafTech from "../assets/logo-taftech.png";

const Footer = () => {
  return (
    <footer className="bg-indigo-950 border-t border-indigo-900">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/">
              <img src={logoTafTech} alt="TAFTECH" className="h-9 w-auto object-contain brightness-200" />
            </Link>
            <p className="text-indigo-300 text-sm leading-relaxed">
              La plateforme de recrutement intelligente en Algérie. L'IA au service de votre carrière.
            </p>
            <Link to="/recruteurs" className="inline-block text-xs text-indigo-400 hover:text-amber-400 transition-colors border border-indigo-800 rounded-lg px-3 py-1.5 mt-1">
              Vous recrutez ? Espace recruteur →
            </Link>
          </div>

          {/* Candidats */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 border-l-2 border-amber-400 pl-3">
              Espace candidat
            </h4>
            <ul className="space-y-3">
              {[
                { name: "Toutes les offres", to: "/offres" },
                { name: "Par wilaya", to: "/regions" },
                { name: "Par secteur", to: "/secteurs" },
                { name: "Entreprises", to: "/entreprises" },
                { name: "Mon profil", to: "/profil" },
                { name: "Mes candidatures", to: "/mes-candidatures" },
                { name: "Alertes emploi", to: "/alertes" },
              ].map((link) => (
                <li key={link.name}>
                  <Link to={link.to} className="text-indigo-300 hover:text-amber-400 text-sm font-medium transition-colors">
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
              <p>Oran, Algérie 🇩🇿</p>
              <a href="mailto:taftech963@gmail.com" className="hover:text-amber-400 transition-colors block">
                taftech963@gmail.com
              </a>
              <a href="tel:+213770123440" className="hover:text-amber-400 transition-colors block">
                0770 123 440
              </a>
              <p>Conformité ANPDP</p>
              <p>Loi 18-07 — Protection des données</p>
            </div>
          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="border-t border-indigo-900 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-indigo-400">
            © {new Date().getFullYear()} TAFTECH — Made for a better recruitment
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
