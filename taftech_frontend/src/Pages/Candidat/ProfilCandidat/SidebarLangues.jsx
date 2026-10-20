// Colonne latérale : langues (avec niveau), ajout, modification et suppression. Garde localement la saisie en cours.
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import { tw } from "../../../theme";
import { SIDEBAR_SECTION_CLASS, SIDEBAR_TITLE, INPUT_CLASS } from "./profilUi";

const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé", "Bilingue / Maternelle"];

// « , » et « : » séparent les langues et les niveaux dans le champ enregistré (« Arabe:Maternelle,Anglais:Avancé »).
const sansSeparateurs = (texte) => texte.replace(/[,:]/g, "");

const SidebarLangues = ({ profil, handleRemoveTag, handleAddLanguage, handleUpdateLanguage }) => {
  const [langName, setLangName] = useState("");
  const [langLevel, setLangLevel] = useState("Débutant");
  const [enEdition, setEnEdition] = useState(null); // entrée « Nom:Niveau » en cours de modification
  const [editNom, setEditNom] = useState("");
  const [editNiveau, setEditNiveau] = useState(NIVEAUX[0]);

  const ouvrirEdition = (entree, nom, niveau) => {
    setEnEdition(entree);
    setEditNom(nom);
    setEditNiveau(niveau || NIVEAUX[0]);
  };

  const enregistrer = () => {
    const nom = sansSeparateurs(editNom).trim();
    if (!nom) return;
    handleUpdateLanguage(enEdition, nom, editNiveau);
    setEnEdition(null);
  };

  return (
          <div className={SIDEBAR_SECTION_CLASS}>
            <p className={`${SIDEBAR_TITLE} mb-3`}>Langues</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {profil.langues
                ?.split(",")
                .filter((l) => l)
                .map((l) => {
                  const [name, level] = l.split(":");
                  if (enEdition === l) {
                    return (
                      <div key={l} className="w-full space-y-2">
                        <input
                          aria-label="Nom de la langue"
                          className={INPUT_CLASS}
                          value={editNom}
                          onChange={(e) => setEditNom(sansSeparateurs(e.target.value))}
                        />
                        <select
                          aria-label="Niveau de la langue"
                          className={INPUT_CLASS}
                          value={editNiveau}
                          onChange={(e) => setEditNiveau(e.target.value)}
                        >
                          {/* Un niveau issu du CV absent de la liste (« Maternelle ») reste affiché tel quel. */}
                          {(NIVEAUX.includes(editNiveau) ? NIVEAUX : [editNiveau, ...NIVEAUX]).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={enregistrer}
                            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg ${tw.bgPrimarySolidHover} text-white`}
                          >
                            Enregistrer
                          </button>
                          <button
                            type="button"
                            onClick={() => setEnEdition(null)}
                            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg ${tw.linkPrimary}`}
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    );
                  }
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
                        onClick={() => ouvrirEdition(l, name, level)}
                        aria-label={`Modifier la langue ${name}`}
                        className={`transition-colors ${tw.langueChipRemove}`}
                      >
                        <Pencil size={11} />
                      </button>
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
                {NIVEAUX.map((n) => <option key={n}>{n}</option>)}
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
