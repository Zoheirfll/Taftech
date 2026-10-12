// Modale bio / LinkedIn / GitHub.
import { useSubmitLock } from "../../../utils/useSubmitLock";
import { tw } from "../../../theme";

export const ModalLiens = ({ inputClass, modalClass, modalInnerClass, btnPrimary, btnCancel, showLinksForm, setShowLinksForm, editLinks, setEditLinks, profil, handleUpdateLinks }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  return (
    <>
      {showLinksForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              Bio & Réseaux sociaux
            </h3>
            <form onSubmit={lockSubmit(handleUpdateLinks)} className="space-y-4">
              <div>
                <label className={tw.formLabel}>
                  Bio / Résumé de profil
                </label>
                <textarea
                  rows="3"
                  placeholder="Décrivez-vous en quelques phrases..."
                  className={inputClass + " resize-none"}
                  value={editLinks.bio}
                  onChange={(e) =>
                    setEditLinks({ ...editLinks, bio: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Lien LinkedIn
                </label>
                <input
                  type="url"
                  className={inputClass}
                  value={editLinks.linkedin}
                  onChange={(e) =>
                    setEditLinks({ ...editLinks, linkedin: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Lien GitHub
                </label>
                <input
                  type="url"
                  className={inputClass}
                  value={editLinks.github}
                  onChange={(e) =>
                    setEditLinks({ ...editLinks, github: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLinksForm(false)}
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
