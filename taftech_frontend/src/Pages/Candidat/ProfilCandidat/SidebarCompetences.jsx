// Colonne latérale : compétences avec niveau, ajout avec autocomplétion et suppression.
import { X } from "lucide-react";
import { tw } from "../../../theme";
import { SIDEBAR_SECTION_CLASS, SIDEBAR_TITLE, INPUT_CLASS, NIVEAUX_COMPETENCE } from "./profilUi";

const SidebarCompetences = ({ profil, competenceSuggestions, showCompetenceSuggestions, setShowCompetenceSuggestions, handleCompetenceInputChange, handleAjouterCompetence, handleSupprimerCompetence, handleChangerNiveauCompetence }) => (
          <div className={SIDEBAR_SECTION_CLASS}>
            <p className={`${SIDEBAR_TITLE} mb-3`}>Compétences</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {(profil.competences_detail || []).map((c) => (
                <span
                  key={c.id}
                  className={`flex items-center gap-1 px-3 py-1.5 border text-xs font-medium rounded-lg shadow-sm max-w-full ${tw.skillTag}`}
                  title={c.label}
                >
                  <span className="truncate max-w-35">{c.label}</span>
                  <span className={`shrink-0 ${tw.textMuted}`}>—</span>
                  <select
                    value={c.niveau}
                    onChange={(e) => handleChangerNiveauCompetence(c.id, e.target.value)}
                    className="bg-transparent text-[10px] font-semibold cursor-pointer focus:outline-none shrink-0"
                    title="Niveau"
                  >
                    {NIVEAUX_COMPETENCE.map((n) => (
                      <option key={n.value} value={n.value}>{n.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleSupprimerCompetence(c.id)}
                    aria-label={`Retirer la compétence ${c.label}`}
                    className={`transition-colors ml-0.5 shrink-0 ${tw.skillTagRemove}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              {(profil.competences_detail || []).length === 0 && (
                <p className={`text-xs ${tw.textMuted700}`}>Aucune compétence renseignée.</p>
              )}
            </div>
            <div className="relative">
              <input
                id="comp-input"
                onChange={(e) => handleCompetenceInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    handleAjouterCompetence(e.target.value);
                    e.target.value = "";
                    setShowCompetenceSuggestions(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowCompetenceSuggestions(false), 200)}
                placeholder="Tapez une compétence puis Entrée..."
                className={INPUT_CLASS}
              />
              {showCompetenceSuggestions && competenceSuggestions.length > 0 && (
                <div className={`absolute top-full left-0 right-0 rounded-xl shadow-lg z-50 mt-1 overflow-hidden ${tw.autocompleteDropdown}`}>
                  <div className="max-h-48 overflow-y-auto">
                    {competenceSuggestions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          handleAjouterCompetence(c.label);
                          const el = document.getElementById("comp-input");
                          if (el) el.value = "";
                          setShowCompetenceSuggestions(false);
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
          </div>
);

export default SidebarCompetences;
