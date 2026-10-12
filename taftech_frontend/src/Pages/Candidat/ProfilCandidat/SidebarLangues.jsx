// Colonne latérale : langues (avec niveau), ajout et suppression. Garde localement la saisie en cours.
import { useState } from "react";
import { X } from "lucide-react";
import { tw } from "../../../theme";
import { SIDEBAR_SECTION_CLASS, SIDEBAR_TITLE, INPUT_CLASS } from "./profilUi";

const SidebarLangues = ({ profil, handleRemoveTag, handleAddLanguage }) => {
  const [langName, setLangName] = useState("");
  const [langLevel, setLangLevel] = useState("Débutant");

  return (
          <div className={SIDEBAR_SECTION_CLASS}>
            <p className={`${SIDEBAR_TITLE} mb-3`}>Langues</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {profil.langues
                ?.split(",")
                .filter((l) => l)
                .map((l) => {
                  const [name, level] = l.split(":");
                  return (
                    <div
                      key={l}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${tw.langueChip}`}
                    >
                      <span className={`text-sm font-semibold ${tw.langueChipName}`}>
                        {name}
                      </span>
                      <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-semibold ${tw.langueChipLevel}`}>
                        {level}
                      </span>
                      <button
                        onClick={() => handleRemoveTag("langues", l)}
                        aria-label={`Retirer la langue ${name}`}
                        className={`transition-colors ${tw.langueChipRemove}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              {!profil.langues && (
                <p className={`text-xs ${tw.textMuted700}`}>Aucune langue renseignée.</p>
              )}
            </div>
            <div className="space-y-2">
              <input
                id="lang-input"
                placeholder="Langue"
                className={INPUT_CLASS}
                value={langName}
                onChange={(e) => setLangName(e.target.value)}
              />
              <select
                className={INPUT_CLASS}
                value={langLevel}
                onChange={(e) => setLangLevel(e.target.value)}
              >
                <option>Débutant</option>
                <option>Intermédiaire</option>
                <option>Avancé</option>
                <option>Bilingue / Maternelle</option>
              </select>
              <button
                onClick={() => {
                  if (langName.trim()) {
                    handleAddLanguage(langName.trim(), langLevel);
                    setLangName("");
                  }
                }}
                className={`w-full px-5 py-2.5 text-sm font-semibold rounded-lg ${tw.bgPrimarySolidHover} text-white`}
              >
                Ajouter
              </button>
            </div>
          </div>
  );
};

export default SidebarLangues;
