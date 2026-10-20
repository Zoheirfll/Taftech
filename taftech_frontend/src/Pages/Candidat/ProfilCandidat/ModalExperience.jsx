// Modale d'ajout / modification d'une expérience.
import { useSubmitLock } from "../../../utils/useSubmitLock";
import { tw } from "../../../theme";
import { MetierAutocomplete } from "../../../Components/MetierAutocomplete";
import DatePrecisionInput from "../../../Components/DatePrecisionInput";
import FieldError from "../../../Components/FieldError";
import { useErreursChamps } from "../../../utils/useErreursChamps";

export const ModalExperience = ({ inputClass, modalClass, modalInnerClass, btnPrimary, btnCancel, showExpForm, setShowExpForm, newExp, setNewExp, editingExpId, setEditingExpId, expTitreSuggestions, showExpTitreSuggestions, setShowExpTitreSuggestions, handleExpTitreChange, handleAddExperience, handleUpdateExperience }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const { erreurs, exiger, effacer, attributs } = useErreursChamps();
  return (
    <>
      {showExpForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              {editingExpId
                ? "Modifier l'expérience"
                : "Ajouter une expérience"}
            </h3>
            <form
              noValidate
              onSubmit={lockSubmit((e) => {
                const manque = exiger(newExp, {
                  titre_poste: "Le titre du poste est obligatoire.",
                  entreprise: "Le nom de l'entreprise est obligatoire.",
                  date_debut: "La date de début est obligatoire.",
                });
                if (manque) {
                  e.preventDefault();
                  return;
                }
                return (editingExpId ? handleUpdateExperience : handleAddExperience)(e);
              })}
              className="space-y-4"
            >
              <div>
                <label className={tw.formLabel}>
                  Titre du poste *
                </label>
                <div className="relative">
                  <input
                    required
                    {...attributs("titre_poste")}
                    className={inputClass}
                    value={newExp.titre_poste}
                    onChange={(e) => { handleExpTitreChange(e.target.value); effacer("titre_poste"); }}
                    onBlur={() => setTimeout(() => setShowExpTitreSuggestions(false), 150)}
                    autoComplete="off"
                  />
                  {showExpTitreSuggestions && expTitreSuggestions.length > 0 && (
                    <ul className={`absolute z-50 w-full rounded-lg shadow-lg max-h-52 overflow-y-auto mt-1 ${tw.autocompleteDropdown}`}>
                      {expTitreSuggestions.map((m) => (
                        <li
                          key={m.metier_id}
                          className={`px-4 py-2 text-sm cursor-pointer ${tw.textMuted700} ${tw.bgPrimaryHover}`}
                          onMouseDown={() => {
                            setNewExp((prev) => ({ ...prev, titre_poste: m.appellation_libelle }));
                            setShowExpTitreSuggestions(false);
                          }}
                        >
                          {m.appellation_libelle}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <FieldError id="err-titre_poste" message={erreurs.titre_poste} />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Entreprise *
                </label>
                <input
                  required
                  placeholder="Nom de l'entreprise"
                  {...attributs("entreprise")}
                  className={inputClass}
                  value={newExp.entreprise}
                  onChange={(e) => {
                    setNewExp({ ...newExp, entreprise: e.target.value });
                    effacer("entreprise");
                  }}
                />
                <FieldError id="err-entreprise" message={erreurs.entreprise} />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Métier
                </label>
                <MetierAutocomplete
                  proposable
                  value={newExp.appellation_libelle || newExp.metier_libelle || ""}
                  onSelect={(item) => setNewExp({
                    ...newExp,
                    metier: item.metier_id,
                    metier_libelle: item.metier_libelle,
                    appellation: item.appellation_id || null,
                    appellation_libelle: item.appellation_libelle,
                  })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Date de début *
                  </label>
                  <DatePrecisionInput
                    required
                    ariaLabel="Date de début"
                    className={inputClass}
                    value={newExp.date_debut}
                    precision={newExp.date_debut_precision || "JOUR"}
                    onChange={(v, p) => { setNewExp({ ...newExp, date_debut: v, date_debut_precision: p }); effacer("date_debut"); }}
                  />
                  <FieldError id="err-date_debut" message={erreurs.date_debut} />
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Date de fin (optionnel)
                  </label>
                  <DatePrecisionInput
                    ariaLabel="Date de fin"
                    className={inputClass}
                    value={newExp.date_fin}
                    precision={newExp.date_fin_precision || "JOUR"}
                    onChange={(v, p) => setNewExp({ ...newExp, date_fin: v, date_fin_precision: p })}
                  />
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Description
                </label>
                <textarea
                  rows="3"
                  placeholder="Missions, résultats..."
                  className={inputClass + " resize-none"}
                  value={newExp.description}
                  onChange={(e) =>
                    setNewExp({ ...newExp, description: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowExpForm(false);
                    setEditingExpId(null);
                    setShowExpTitreSuggestions(false);
                    setNewExp({
                      titre_poste: "",
                      entreprise: "",
                      secteur: "",
                      date_debut: "",
                      date_fin: "",
                      description: "",
                    });
                  }}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" disabled={submitBusy} className={btnPrimary}>
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
