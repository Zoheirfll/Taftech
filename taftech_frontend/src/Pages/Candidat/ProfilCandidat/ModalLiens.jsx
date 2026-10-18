// Modale bio / LinkedIn / GitHub.
import { useSubmitLock } from "../../../utils/useSubmitLock";
import { tw } from "../../../theme";
import FieldError from "../../../Components/FieldError";
import { useErreursChamps } from "../../../utils/useErreursChamps";
import { erreurLien } from "../../../utils/validations";

export const ModalLiens = ({ inputClass, modalClass, modalInnerClass, btnPrimary, btnCancel, showLinksForm, setShowLinksForm, editLinks, setEditLinks, profil, handleUpdateLinks }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const { erreurs, definir, effacer, attributs } = useErreursChamps();
  return (
    <>
      {showLinksForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              Bio & Réseaux sociaux
            </h3>
            <form
              noValidate
              onSubmit={lockSubmit((e) => {
                const trouvees = {};
                const linkedin = erreurLien(editLinks.linkedin);
                const github = erreurLien(editLinks.github);
                if (linkedin) trouvees.linkedin = linkedin;
                if (github) trouvees.github = github;
                if (Object.keys(trouvees).length) {
                  e.preventDefault();
                  definir(trouvees);
                  return;
                }
                definir({});
                return handleUpdateLinks(e);
              })}
              className="space-y-4"
            >
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
                  {...attributs("linkedin")}
                  value={editLinks.linkedin}
                  onChange={(e) => {
                    setEditLinks({ ...editLinks, linkedin: e.target.value });
                    effacer("linkedin");
                  }}
                />
                <FieldError id="err-linkedin" message={erreurs.linkedin} />
              </div>
              <div>
                <label className={tw.formLabel}>
                  Lien GitHub
                </label>
                <input
                  type="url"
                  className={inputClass}
                  {...attributs("github")}
                  value={editLinks.github}
                  onChange={(e) => {
                    setEditLinks({ ...editLinks, github: e.target.value });
                    effacer("github");
                  }}
                />
                <FieldError id="err-github" message={erreurs.github} />
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
