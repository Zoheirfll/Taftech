// Modale "Préférences de recrutement".
import { useSubmitLock } from "../../../utils/useSubmitLock";
import { tw } from "../../../theme";
import { MetierAutocomplete } from "../../../Components/MetierAutocomplete";
import FieldError from "../../../Components/FieldError";
import { useErreursChamps } from "../../../utils/useErreursChamps";

export const ModalPreferences = ({ inputClass, modalClass, modalInnerClass, btnPrimary, btnCancel, showPrefForm, setShowPrefForm, editPref, setEditPref, handleUpdateGeneric }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const { erreurs, definir, effacer, attributs } = useErreursChamps();
  return (
    <>
      {showPrefForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              Préférences de recrutement
            </h3>
            <form
              noValidate
              onSubmit={lockSubmit((e) => {
                const salaire = String(editPref.salaire_souhaite ?? "").trim();
                if (salaire && !/\d/.test(salaire)) {
                  e.preventDefault();
                  definir({ salaire_souhaite: "Indiquez un montant en chiffres." });
                  return;
                }
                definir({});
                return handleUpdateGeneric(e, editPref, setShowPrefForm);
              })}
              className="space-y-4"
            >
              <div>
                <label className={tw.formLabel}>
                  Métier souhaité
                </label>
                <MetierAutocomplete
                  proposable
                  value={editPref.metier_souhaite_appellation_libelle || editPref.metier_souhaite_libelle || ""}
                  onSelect={(item) => setEditPref({
                    ...editPref,
                    metier_souhaite: item.metier_id,
                    metier_souhaite_libelle: item.metier_libelle,
                    metier_souhaite_appellation: item.appellation_id || null,
                    metier_souhaite_appellation_libelle: item.appellation_libelle,
                  })}
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Salaire mensuel attendu
                </label>
                <input
                  className={inputClass}
                  {...attributs("salaire_souhaite")}
                  value={editPref.salaire_souhaite}
                  onChange={(e) => {
                    setEditPref({
                      ...editPref,
                      salaire_souhaite: e.target.value,
                    });
                    effacer("salaire_souhaite");
                  }}
                />
                <FieldError id="err-salaire_souhaite" message={erreurs.salaire_souhaite} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Mobilité
                  </label>
                  <select
                    className={inputClass}
                    value={editPref.mobilite}
                    onChange={(e) =>
                      setEditPref({ ...editPref, mobilite: e.target.value })
                    }
                  >
                    <option value="">Sélectionnez...</option>
                    <option value="LOCALE">Locale</option>
                    <option value="REGIONALE">Régionale</option>
                    <option value="NATIONALE">Nationale</option>
                    <option value="INTERNATIONALE">Internationale</option>
                  </select>
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Statut actuel
                  </label>
                  <select
                    className={inputClass}
                    value={editPref.situation_actuelle}
                    onChange={(e) =>
                      setEditPref({
                        ...editPref,
                        situation_actuelle: e.target.value,
                      })
                    }
                  >
                    <option value="">Sélectionnez...</option>
                    <option value="EN_RECHERCHE">En recherche active</option>
                    <option value="A_L_ECOUTE">À l'écoute du marché</option>
                    <option value="EN_POSTE">En poste</option>
                    <option value="ETUDIANT">Étudiant</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrefForm(false)}
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
