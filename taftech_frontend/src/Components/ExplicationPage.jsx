import React from "react";
import { tw } from "../theme";

// Gabarit partagé des pages explicatives (matching, crédits, scores, confidentialité).
export const ExplicationPage = ({ titre, intro, children }) => (
  <div className="space-y-6 max-w-4xl">
    <div>
      <h1 className={tw.pageTitleGrand}>{titre}</h1>
      {intro && <p className={`mt-2 text-base ${tw.textMuted700}`}>{intro}</p>}
    </div>
    {children}
  </div>
);

export const Bloc = ({ icon: Icon, titre, badge, children }) => (
  <section className={`${tw.card} p-6`}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
        {Icon && <Icon size={18} className={tw.textTeal} />} {titre}
      </h2>
      {badge && <span className="text-xs font-bold px-2 py-1 rounded-md bg-teal-50 text-teal-700 shrink-0">{badge}</span>}
    </div>
    <div className={`mt-2 space-y-2 text-sm ${tw.textMuted700}`}>{children}</div>
  </section>
);
