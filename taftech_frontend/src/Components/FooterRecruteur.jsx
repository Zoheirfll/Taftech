import React from "react";
import { Link } from "react-router-dom";
import logoTafTech from "../assets/logo-taftech.png";

const FooterRecruteur = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="space-y-4">
            <Link to="/recruteurs" className="flex items-center gap-2">
              <img src={logoTafTech} alt="TafTech" className="h-9 w-auto object-contain brightness-200" />
              <span className="text-xs font-semibold text-teal-400 bg-teal-900 border border-teal-700 px-2 py-0.5 rounded-md">
                Recruteurs
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              La plateforme de recrutement algérienne avec matching par intelligence artificielle. Conforme loi 18-07 / ANPDP.
            </p>
          </div>

          {/* Plateforme */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 border-l-2 border-teal-500 pl-3">
              Plateforme
            </h4>
            <ul className="space-y-3">
              {[
                { name: "Fonctionnalités", href: "/recruteurs#fonctionnalites" },
                { name: "Comment ça marche", href: "/recruteurs#comment-ca-marche" },
                { name: "FAQ", href: "/recruteurs#faq" },
              ].map((link) => (
                <li key={link.name}>
                  <a href={link.href} className="text-slate-400 hover:text-teal-400 text-sm font-medium transition-colors">
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Espace recruteur */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 border-l-2 border-teal-500 pl-3">
              Espace recruteur
            </h4>
            <ul className="space-y-3">
              {[
                { name: "Tableau de bord", to: "/dashboard" },
                { name: "Publier une offre", to: "/creer-offre" },
                { name: "CVthèque IA", to: "/cvtheque" },
                { name: "Passer Premium ⭐", to: "/recruteurs/premium" },
                { name: "Espace candidats", to: "/" },
              ].map((link) => (
                <li key={link.name}>
                  <Link to={link.to} className="text-slate-400 hover:text-teal-400 text-sm font-medium transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold text-xs uppercase tracking-wider mb-4 border-l-2 border-teal-500 pl-3">
              Contact & Légal
            </h4>
            <div className="space-y-3 text-sm text-slate-400">
              <p>Oran, Algérie 🇩🇿</p>
              <a href="mailto:taftech963@gmail.com" className="hover:text-teal-400 transition-colors block">
                taftech963@gmail.com
              </a>
              <p>Conformité ANPDP</p>
              <p>Loi 18-07 — Protection des données</p>
            </div>
          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="border-t border-slate-800 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} TafTech — Tous droits réservés
          </p>
          <div className="flex gap-5">
            {["Confidentialité", "CGU", "Cookies"].map((item) => (
              <Link key={item} to="/" className="text-xs text-slate-500 hover:text-teal-400 transition-colors">
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterRecruteur;
