import React from "react";
import { Link } from "react-router-dom";
import logoTafTech from "../assets/logo-taftech.png";
import { tw } from "../theme";
import { Mail, MapPin, Phone } from "lucide-react";

const RESEAUX_SOCIAUX = [
  { name: "Facebook", href: "https://www.facebook.com/Taftechemploi" },
  { name: "Instagram", href: "https://www.instagram.com/taftechemploi" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/oranemploi/" },
  { name: "WhatsApp", href: "https://wa.me/213770123440" },
];

const LIENS_LEGAUX = [
  { name: "Confidentialité", to: "/confidentialite?portail=recruteur" },
  { name: "CGU", to: "/cgu?portail=recruteur" },
];

const CONTACTS = [
  { label: "E-mail", value: "taftech963@gmail.com", href: "mailto:taftech963@gmail.com", icon: Mail },
  { label: "Adresse", value: "Oran, Algérie", href: null, icon: MapPin },
  { label: "Téléphone", value: "0770 123 440", href: "tel:+213770123440", icon: Phone },
];

const FooterRecruteur = () => {
  return (
    <footer className={tw.footerShellTeal} style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Brand */}
          <div className="space-y-3">
            <Link to="/recruteurs" className="flex items-center gap-2">
              <span className="inline-block bg-white rounded-2xl p-2.5 w-fit shadow-lg ring-1 ring-white/10">
                <img src={logoTafTech} alt="TAFTECH" className="h-8 w-auto object-contain" />
              </span>
              <span className="text-xs font-semibold text-teal-400 bg-teal-900/60 border border-teal-700 px-2 py-0.5 rounded-md">
                Recruteurs
              </span>
            </Link>
            <p className={tw.footerBrandTextTeal}>
              La plateforme de recrutement algérienne avec matching par intelligence artificielle. Conforme loi 18-07 / ANPDP.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h4 className={tw.footerHeadingTeal}>
              Contact
            </h4>
            <div className="flex flex-col gap-2.5">
              {CONTACTS.map(({ label, value, href, icon: Icon }) => {
                const Tag = href ? "a" : "div";
                return (
                  <Tag key={label} {...(href ? { href } : {})} className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 text-white text-xs font-bold rounded-full w-fit shrink-0">
                      <Icon size={12} /> {label}
                    </span>
                    <span className="text-slate-300 text-sm">{value}</span>
                  </Tag>
                );
              })}
            </div>
          </div>

          {/* Réseaux sociaux */}
          <div>
            <h4 className={tw.footerHeadingTeal}>
              Réseaux sociaux
            </h4>
            <ul className="space-y-2">
              {RESEAUX_SOCIAUX.map((r) => (
                <li key={r.name}>
                  <a href={r.href} target="_blank" rel="noopener noreferrer" className={tw.footerLinkTeal}>
                    {r.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className={tw.footerHeadingTeal}>
              Légal
            </h4>
            <ul className="space-y-2">
              {LIENS_LEGAUX.map((l) => (
                <li key={l.name}>
                  <Link to={l.to} target="_blank" rel="noopener noreferrer" className={tw.footerLinkTeal}>
                    {l.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/contact?portail=recruteur" target="_blank" rel="noopener noreferrer" className={tw.footerLinkTeal}>
                  Nous contacter
                </Link>
              </li>
              <li>
                <Link to="/qui-sommes-nous?portail=recruteur" target="_blank" rel="noopener noreferrer" className={tw.footerLinkTeal}>
                  Qui sommes-nous ?
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* COPYRIGHT */}
      <div className="border-t border-slate-800 py-4">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className={tw.footerCopyrightTeal}>
            © {new Date().getFullYear()} TAFTECH — Made for a better recruitment
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterRecruteur;
