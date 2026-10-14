// Bloc "Exigences impératives" : permis, habilitations, certifications (jamais notés dans le score de matching).
import { ShieldCheck, Paperclip, X } from "lucide-react";
import { tw } from "../../../theme";
import { inputClass } from "./formUi";
import { CATEGORIES_EXIGENCE } from "../../../utils/exigencesCategories";

const BlocExigences = ({ job }) => {
  const {
    draftExigenceLabel, setDraftExigenceLabel, draftExigenceDescription, setDraftExigenceDescription,
    draftExigenceJustificatif, setDraftExigenceJustificatif, draftExigenceCategorie, setDraftExigenceCategorie,
    ajouterExigence, retirerExigence, exigencesImperatives,
  } = job;

  return (
    <div className="mt-5 border border-slate-200 rounded-xl p-5 bg-slate-50/60">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={14} className={`${tw.textTeal} shrink-0`} />
        <p className={`text-sm font-bold ${tw.textStrong}`}>
          Exigences impératives <span className="font-normal text-slate-500">(optionnel)</span>
        </p>
      </div>
      <p className="text-xs text-slate-600 mb-4">
        Permis, habilitation, droit d'exercice, certification... — distinct du diplôme, jamais utilisé pour calculer le score de matching. Le candidat déclare s'il y répond au moment de postuler, vous vérifiez ensuite.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={tw.formLabel}>Exigence</label>
          <input
            type="text"
            value={draftExigenceLabel}
            onChange={(e) => setDraftExigenceLabel(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={tw.formLabel}>Précision (optionnel)</label>
          <input
            type="text"
            value={draftExigenceDescription}
            onChange={(e) => setDraftExigenceDescription(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={tw.formLabel}>Catégorie</label>
          <select
            value={draftExigenceCategorie}
            onChange={(e) => setDraftExigenceCategorie(e.target.value)}
            className={inputClass}
          >
            {CATEGORIES_EXIGENCE.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <p className="text-[11px] text-slate-500 mt-1">
            Permis, véhicule, passeport et situation militaire ne peuvent servir de filtre dans la CVthèque que si votre offre les déclare ici comme exigence.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer hover:border-slate-300 transition-colors">
          <input
            type="checkbox"
            checked={draftExigenceJustificatif}
            onChange={(e) => setDraftExigenceJustificatif(e.target.checked)}
            className={`${tw.accentPrimary} w-3.5 h-3.5`}
          />
          <Paperclip size={12} className="text-slate-400" />
          Justificatif requis
        </label>
        <button
          type="button"
          onClick={ajouterExigence}
          disabled={!draftExigenceLabel.trim()}
          className={`${tw.buttonSecondary} px-4 py-2.5 disabled:opacity-50`}
        >
          Ajouter
        </button>
      </div>
      {exigencesImperatives.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {exigencesImperatives.map((e) => (
            <span key={e.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${tw.badgeNeutral}`}>
              {e.label}
              {e.categorie && e.categorie !== "AUTRE" && (
                <span className="opacity-70">· {CATEGORIES_EXIGENCE.find((c) => c.value === e.categorie)?.label}</span>
              )}
              {e.justificatif_requis && <Paperclip size={11} className="opacity-70" />}
              <button type="button" onClick={() => retirerExigence(e.label)} className="hover:text-red-600">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlocExigences;
