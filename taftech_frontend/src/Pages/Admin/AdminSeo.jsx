import React from "react";
import { CheckCircle2, TrendingUp } from "lucide-react";
import { tw } from "../../theme";

const EXEMPLES_URL = [
  { type: "Offre d'emploi", url: "taftech.dz/jobs/16-responsable-rh-et-paie" },
  { type: "Entreprise", url: "taftech.dz/entreprise/taftech" },
  { type: "Métier", url: "taftech.dz/metiers/responsable-rh" },
  { type: "Secteur", url: "taftech.dz/secteurs/ressources-humaines" },
  { type: "Wilaya", url: "taftech.dz/regions/alger" },
  { type: "Blog / Article", url: "taftech.dz/blog/comment-reussir-son-entretien" },
];

const AdminSeo = () => (
  <div className="space-y-5 max-w-3xl">
    <div>
      <h1 className={tw.pageTitle}>SEO</h1>
      <p className={`${tw.pageSubtitle} mt-0.5`}>
        Aperçu des URLs générées automatiquement pour chaque type de page publique.
      </p>
    </div>

    <div className={`${tw.card} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-slate-200">
              <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Type de page</th>
              <th className={`text-left px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Exemple d'URL</th>
              <th className={`text-right px-5 py-3 text-xs font-bold uppercase tracking-wider ${tw.textMuted}`}>Statut</th>
            </tr>
          </thead>
          <tbody>
            {EXEMPLES_URL.map(({ type, url }) => (
              <tr key={type} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-3 text-sm font-semibold text-slate-900">{type}</td>
                <td className="px-5 py-3 text-sm text-indigo-600 font-mono">{url}</td>
                <td className="px-5 py-3 text-right">
                  <CheckCircle2 size={18} className="text-emerald-600 inline-block" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-4 flex items-center gap-4">
      <TrendingUp size={22} className="text-emerald-600 shrink-0" />
      <p className="text-sm text-emerald-800">
        Toutes les pages importantes ont une URL propre, pour un meilleur référencement sur Google.
      </p>
    </div>
  </div>
);

export default AdminSeo;
