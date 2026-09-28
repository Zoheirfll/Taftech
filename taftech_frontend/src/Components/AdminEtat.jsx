import React from "react";
import { AlertTriangle, RefreshCw, Inbox } from "lucide-react";
import { tw } from "../theme";

// États partagés du panel admin : chargement échoué (avec bouton Réessayer, jamais une page
// blanche) et liste vide (message + action facultative).
export const AdminErreurChargement = ({ message = "Impossible de charger les données.", onRetry }) => (
  <div className="border border-red-200 bg-red-50 rounded-xl p-6 flex flex-col items-center text-center gap-3">
    <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
      <AlertTriangle size={20} />
    </div>
    <p className="text-sm font-semibold text-red-800">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-red-200 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors ${tw.focusRing}`}
      >
        <RefreshCw size={14} /> Réessayer
      </button>
    )}
  </div>
);

export const AdminVide = ({ icon: Icon = Inbox, titre, texte, action }) => (
  <div className="flex flex-col items-center text-center gap-2 py-12 px-6">
    <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-1">
      <Icon size={22} />
    </div>
    <p className={`text-sm font-semibold ${tw.textStrong}`}>{titre}</p>
    {texte && <p className={`text-xs ${tw.textMuted700} max-w-sm`}>{texte}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);
