import React, { useState } from "react";
import { HelpCircle, ChevronUp } from "lucide-react";
import { tw } from "../theme";

// En-tête commun à toutes les pages du panel admin : pastille d'icône colorée (couleur =
// section de la sidebar), titre, sous-titre, zone d'actions à droite, et un panneau "Aide"
// repliable. Contrairement à InfoBanner (fermé définitivement), l'aide s'ouvre/se referme à
// tout moment via le bouton "Aide" — l'état est mémorisé par page (localStorage, try/catch :
// le panel doit fonctionner même si le stockage est bloqué).
const COULEURS = {
  indigo: "bg-indigo-600",
  teal: "bg-teal-600",
  amber: "bg-amber-500",
  violet: "bg-violet-600",
  rose: "bg-rose-500",
  slate: "bg-slate-700",
  blue: "bg-blue-600",
  emerald: "bg-emerald-600",
  red: "bg-red-500",
};

// Aide repliée par défaut (la page reste lisible) ; ouverte, elle le reste pour cette page.
const lireEtat = (cle) => {
  try {
    return localStorage.getItem(`admin_aide_${cle}`) === "ouvert";
  } catch {
    return false;
  }
};

const ecrireEtat = (cle, ouvert) => {
  try {
    localStorage.setItem(`admin_aide_${cle}`, ouvert ? "ouvert" : "ferme");
  } catch {
    // stockage indisponible : l'aide reste simplement ouverte au prochain chargement
  }
};

const AdminPageHeader = ({ icon: Icon, color = "indigo", title, subtitle, actions, aide, aideKey, compact = false }) => {
  const cle = aideKey || title;
  const [aideOuverte, setAideOuverte] = useState(() => lireEtat(cle));

  const basculerAide = () => {
    setAideOuverte((v) => {
      ecrireEtat(cle, !v);
      return !v;
    });
  };

  const TitreTag = compact ? "h2" : "h1";

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div
              className={`${compact ? "w-9 h-9" : "w-11 h-11"} rounded-xl ${COULEURS[color] || COULEURS.indigo} text-white flex items-center justify-center shrink-0 shadow-sm`}
            >
              <Icon size={compact ? 17 : 20} />
            </div>
          )}
          <div className="min-w-0">
            <TitreTag className={compact ? `text-lg font-bold ${tw.textStrong}` : tw.pageTitle}>{title}</TitreTag>
            {subtitle && <p className={`text-sm ${tw.textMuted700} mt-0.5`}>{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {actions}
          {aide && (
            <button
              type="button"
              onClick={basculerAide}
              aria-expanded={aideOuverte}
              aria-label={aideOuverte ? "Masquer l'aide" : "Afficher l'aide"}
              title={aideOuverte ? "Masquer l'aide" : "Afficher l'aide"}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${tw.focusRing} ${
                aideOuverte
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
              }`}
            >
              {aideOuverte ? <ChevronUp size={14} /> : <HelpCircle size={14} />}
              Aide
            </button>
          )}
        </div>
      </div>

      {aide && aideOuverte && (
        <div className="border border-indigo-100 bg-indigo-50/60 rounded-xl px-4 py-3 flex items-start gap-3">
          <HelpCircle size={16} className="text-indigo-500 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed text-indigo-950 min-w-0">
            {Array.isArray(aide) ? (
              <ul className="space-y-1 list-disc pl-4">
                {aide.map((ligne, i) => (
                  <li key={i}>{ligne}</li>
                ))}
              </ul>
            ) : (
              aide
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPageHeader;
