// Bloc "Compétences requises" : liste structurée (obligatoire/souhaitée + niveau), autocomplétion et suggestions du métier.
import { X } from "lucide-react";
import { tw } from "../../../theme";
import { libelleUsage } from "../../../utils/suggestionStats";
import { inputClass, NIVEAU_LABELS } from "./formUi";

const BlocCompetences = ({ job }) => {
  const {
    competencesRequises, retirerCompetenceRequise, handleCompInputChange, ajouterCompetenceRequise,
    setShowCompSuggestions, showCompSuggestions, compSuggestions, compType, setCompType, compNiveau, setCompNiveau,
    suggestionsPourMetier,
  } = job;

  return (
    <div>
      <label className={`text-sm font-semibold ${tw.textMuted} mb-1.5 block`}>
        Compétences requises
      </label>
      <p className={`text-xs mb-2 ${tw.textMuted700}`}>
        Ajoutez vos compétences ci-dessous : le texte affiché sur l'annonce est généré automatiquement à partir de cette liste, pour qu'il corresponde toujours exactement à ce que l'IA utilise pour le matching.
      </p>
      <div className="flex flex-wrap gap-2 mb-2">
        {competencesRequises.map((c) => (
          <span
            key={c.label}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${c.type_exigence === "OBLIGATOIRE" ? tw.badgeError : tw.badgeNeutral}`}
          >
            {c.label}
            <span className="opacity-70 font-normal">
              · {c.type_exigence === "OBLIGATOIRE" ? "Obligatoire" : "Souhaitée"}
              {c.niveau_requis ? ` · ${NIVEAU_LABELS[c.niveau_requis]}` : ""}
            </span>
            {c.dans_referentiel === false && (
              <span
                className="text-[10px] font-semibold text-amber-700"
                title="Cette compétence ne figure pas dans la liste TAFTECH : elle ne sera comparée aux candidats que sur son texte exact. Choisissez de préférence une compétence proposée."
              >
                hors liste
              </span>
            )}
            <button type="button" onClick={() => retirerCompetenceRequise(c.label)} className="hover:opacity-70">
              <X size={11} />
            </button>
          </span>
        ))}
        {competencesRequises.length === 0 && (
          <p className={`text-xs ${tw.textMuted700}`}>Aucune compétence structurée ajoutée.</p>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            id="comp-offre-input"
            onChange={(e) => handleCompInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.target.value.trim()) {
                e.preventDefault();
                ajouterCompetenceRequise(e.target.value);
                e.target.value = "";
              }
            }}
            onBlur={() => setTimeout(() => setShowCompSuggestions(false), 200)}
            placeholder="Tapez une compétence puis Entrée..."
            className={inputClass}
          />
          {showCompSuggestions && compSuggestions.length > 0 && (
            <div className={`absolute top-full left-0 right-0 rounded-xl shadow-lg z-50 mt-1 overflow-hidden ${tw.autocompleteDropdown}`}>
              <div className="max-h-48 overflow-y-auto">
                {compSuggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={() => {
                      ajouterCompetenceRequise(c.label);
                      const el = document.getElementById("comp-offre-input");
                      if (el) el.value = "";
                    }}
                    className={`w-full text-left px-4 py-2.5 transition-colors text-sm font-medium ${tw.autocompleteItem} ${tw.autocompleteItemTitle}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <select value={compType} onChange={(e) => setCompType(e.target.value)} className={`${inputClass} sm:w-40`}>
          <option value="OBLIGATOIRE">Obligatoire</option>
          <option value="SOUHAITEE">Souhaitée</option>
        </select>
        <select value={compNiveau} onChange={(e) => setCompNiveau(e.target.value)} className={`${inputClass} sm:w-44`}>
          <option value="">Niveau (optionnel)</option>
          {Object.entries(NIVEAU_LABELS).map(([code, label]) => (
            <option key={code} value={code}>{label}</option>
          ))}
        </select>
      </div>
      {suggestionsPourMetier.competences.filter((s) => !competencesRequises.some((c) => c.label.toLowerCase() === s.label.toLowerCase())).length > 0 && (
        <div className="mt-3">
          <p className={`text-[11px] font-medium ${tw.textMuted700} mb-1.5`}>
            Suggéré pour ce métier — cliquez pour ajouter :
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestionsPourMetier.competences
              .filter((s) => !competencesRequises.some((c) => c.label.toLowerCase() === s.label.toLowerCase()))
              .map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => ajouterCompetenceRequise(s.label)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-dashed ${tw.borderBase} hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 text-slate-600`}
                >
                  + {s.label}
                  {libelleUsage(s) && <span className="text-[10px] font-semibold text-indigo-600">{libelleUsage(s)}</span>}
                </button>
              ))}
          </div>
        </div>
      )}
      {competencesRequises.length > 0 && (
        <div className={`mt-3 p-3 rounded-lg text-xs whitespace-pre-line ${tw.surfaceMuted} ${tw.textMuted700}`}>
          <p className={`font-semibold mb-1 ${tw.textMuted}`}>Aperçu du texte affiché sur l'annonce :</p>
          {competencesRequises
            .map((c) => `- ${c.label}${c.niveau_requis ? ` (niveau ${NIVEAU_LABELS[c.niveau_requis]} minimum)` : ""} — ${c.type_exigence === "OBLIGATOIRE" ? "Obligatoire" : "Souhaitée"}`)
            .join("\n")}
        </div>
      )}
    </div>
  );
};

export default BlocCompetences;
