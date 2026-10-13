// Modale d'édition du CV (titre professionnel et fichier).
import { useSubmitLock } from "../../../utils/useSubmitLock";
import { tw } from "../../../theme";

export const ModalCV = ({ inputClass, modalClass, modalInnerClass, btnPrimary, btnCancel, showCVForm, setShowCVForm, editCV, setEditCV, titreSuggestions, showTitreSuggestions, setShowTitreSuggestions, handleUpdateCV, handleTitreProChange }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  return (
    <>
      {showCVForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              Mettre à jour mon CV
            </h3>
            <form onSubmit={lockSubmit(handleUpdateCV)} className="space-y-4">
              <div>
                <label className={tw.formLabel}>
                  Titre professionnel
                </label>
                <div className="relative">
                  <input
                    className={inputClass}
                    value={editCV.titre}
                    onChange={(e) => handleTitreProChange(e.target.value)}
                    onBlur={() =>
                      setTimeout(() => setShowTitreSuggestions(false), 200)
                    }
                  />
                  {showTitreSuggestions && titreSuggestions.length > 0 && (
                    <div className={`absolute top-full left-0 right-0 rounded-xl shadow-lg z-50 mt-1 overflow-hidden ${tw.autocompleteDropdown}`}>
                      <div className="max-h-48 overflow-y-auto">
                        {titreSuggestions.map((m) => (
                          <button
                            key={m.metier_id}
                            type="button"
                            onMouseDown={() => {
                              setEditCV({ ...editCV, titre: m.appellation_libelle });
                              setShowTitreSuggestions(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 transition-colors ${tw.autocompleteItem}`}
                          >
                            <p className={`text-sm font-medium ${tw.autocompleteItemTitle}`}>
                              {m.appellation_libelle}
                            </p>
                            <p className={`text-xs ${tw.autocompleteItemSubtitle}`}>
                              {m.metier_libelle}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={`p-8 text-center relative cursor-pointer transition-colors group ${tw.dropzoneNeutral}`}>
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf"
                  onChange={(e) =>
                    setEditCV({ ...editCV, file: e.target.files[0] })
                  }
                />
                <p className={`text-sm font-medium transition-colors ${tw.dropzoneNeutralText}`}>
                  {editCV.file
                    ? editCV.file.name
                    : "Cliquez ou glissez un PDF ici"}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCVForm(false)}
                  className={btnCancel}
                >
                  Annuler
                </button>
                <button type="submit" disabled={submitBusy} className={btnPrimary}>
                  Téléverser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
