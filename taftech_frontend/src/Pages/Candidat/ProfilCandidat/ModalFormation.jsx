// Modale d'ajout / modification d'une formation.
import { useSubmitLock } from "../../../utils/useSubmitLock";
import Select from "react-select";
import { selectStyles, tw } from "../../../theme";
import { FormationReferentielSelect } from "../../../Components/FormationReferentielSelect";
import DatePrecisionInput from "../../../Components/DatePrecisionInput";
import FieldError from "../../../Components/FieldError";
import { useErreursChamps } from "../../../utils/useErreursChamps";

const STATUT_FORMATION_OPTIONS = [
  { value: "OBTENU", label: "Obtenu" },
  { value: "EN_COURS", label: "En cours" },
  { value: "INTERROMPU", label: "Interrompu" },
];

export const ModalFormation = ({ inputClass, modalClass, modalInnerClass, btnPrimary, btnCancel, showFormForm, setShowFormForm, newForm, setNewForm, editingFormId, setEditingFormId, profil, handleAddFormation, handleUpdateFormation }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const { erreurs, exiger, effacer, attributs } = useErreursChamps();
  return (
    <>
      {showFormForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              {editingFormId
                ? "Modifier la formation"
                : "Ajouter une formation"}
            </h3>
            <form
              noValidate
              onSubmit={lockSubmit((e) => {
                const manque = exiger(
                  { diplome: newForm.diplome_ref || newForm.diplome, etablissement: newForm.etablissement },
                  {
                    diplome: "Choisissez votre diplôme dans la liste, ou précisez-le.",
                    etablissement: "L'établissement est obligatoire.",
                  },
                );
                if (manque) {
                  e.preventDefault();
                  return;
                }
                return (editingFormId ? handleUpdateFormation : handleAddFormation)(e);
              })}
              className="space-y-4"
            >
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 space-y-3">
                <p className="text-xs text-slate-600">
                  Choisissez votre diplôme et votre spécialité dans les listes pour obtenir un
                  score de correspondance fiable sur les offres.
                </p>
                <FormationReferentielSelect
                  diplomeId={newForm.diplome_ref}
                  specialiteId={newForm.specialite_ref}
                  onChangeDiplome={(id, label) => {
                    setNewForm((p) => {
                      // Un intitulé saisi (ou venu du CV) est conservé ; seul un intitulé qui n'était que le
                      // libellé du type précédent suit le nouveau choix.
                      const personnalise = !!p.diplome && p.diplome !== p.diplome_ref_libelle;
                      return {
                        ...p,
                        diplome_ref: id,
                        diplome_ref_libelle: label || "",
                        ...(id && label && !personnalise ? { diplome: label } : {}),
                      };
                    });
                    effacer("diplome");
                  }}
                  onChangeSpecialite={(id, label) =>
                    setNewForm((p) => ({ ...p, specialite_ref: id, ...(id && label ? { specialite_texte: "", specialite_autre: "" } : {}) }))
                  }
                  autreTexte={newForm.specialite_texte || ""}
                  onChangeAutreTexte={(texte) => setNewForm((p) => ({ ...p, specialite_texte: texte, specialite_autre: texte }))}
                  diplomeAutreTexte={newForm.diplome}
                  onChangeDiplomeAutreTexte={(texte) => {
                    setNewForm({ ...newForm, diplome: texte });
                    effacer("diplome");
                  }}
                  onConfirmerSuggestion={(diplomeRef, _diplomeLabel, specialiteRef) =>
                    setNewForm((p) => ({
                      ...p,
                      diplome_ref: diplomeRef || p.diplome_ref,
                      specialite_ref: specialiteRef || p.specialite_ref,
                    }))
                  }
                  required
                />
                <FieldError id="err-diplome" message={erreurs.diplome} />
                <div>
                  <label className={tw.formLabel}>Statut de la formation</label>
                  <Select
                    options={STATUT_FORMATION_OPTIONS}
                    value={STATUT_FORMATION_OPTIONS.find((o) => o.value === newForm.statut) || STATUT_FORMATION_OPTIONS[0]}
                    onChange={(opt) => setNewForm({ ...newForm, statut: opt?.value || "OBTENU" })}
                    styles={selectStyles}
                  />
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Établissement *
                </label>
                <input
                  required
                  placeholder="Université, École ou Institut"
                  {...attributs("etablissement")}
                  className={inputClass}
                  value={newForm.etablissement}
                  onChange={(e) => {
                    setNewForm({ ...newForm, etablissement: e.target.value });
                    effacer("etablissement");
                  }}
                />
                <FieldError id="err-etablissement" message={erreurs.etablissement} />
              </div>
              <div>
                <label htmlFor="formation-intitule" className={tw.formLabel}>
                  Intitulé de la formation
                </label>
                <input
                  id="formation-intitule"
                  className={inputClass}
                  value={newForm.diplome || ""}
                  onChange={(e) => {
                    setNewForm({ ...newForm, diplome: e.target.value });
                    effacer("diplome");
                  }}
                />
              </div>
              <div>
                <label htmlFor="formation-description" className={tw.formLabel}>
                  Description ou mention (optionnel)
                </label>
                <textarea
                  id="formation-description"
                  rows={3}
                  className={`${inputClass} resize-y`}
                  value={newForm.description || ""}
                  onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Début (optionnel)
                  </label>
                  <DatePrecisionInput
                    ariaLabel="Début de la formation"
                    className={inputClass}
                    value={newForm.date_debut}
                    precision={newForm.date_debut_precision || "JOUR"}
                    onChange={(v, p) => setNewForm({ ...newForm, date_debut: v, date_debut_precision: p })}
                  />
                </div>
                <div>
                  <label className={tw.formLabel}>
                    {newForm.statut === "EN_COURS" ? "Fin prévue" : "Fin (obtention)"}
                  </label>
                  {newForm.statut === "EN_COURS" ? (
                    <input
                      type="date"
                      className={inputClass}
                      value={newForm.date_fin_prevue || ""}
                      onChange={(e) => setNewForm({ ...newForm, date_fin_prevue: e.target.value })}
                    />
                  ) : (
                    <DatePrecisionInput
                      ariaLabel="Fin (obtention)"
                      className={inputClass}
                      value={newForm.date_fin || ""}
                      precision={newForm.date_fin_precision || "JOUR"}
                      onChange={(v, p) => setNewForm({ ...newForm, date_fin: v, date_fin_precision: p })}
                    />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>Pays de la formation</label>
                  <input
                    maxLength={2}
                    className={inputClass}
                    value={newForm.pays_formation ?? "DZ"}
                    onChange={(e) =>
                      setNewForm({ ...newForm, pays_formation: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div>
                  <label className={tw.formLabel}>Référence justificatif (optionnel)</label>
                  <input
                    className={inputClass}
                    value={newForm.document_reference ?? ""}
                    onChange={(e) =>
                      setNewForm({ ...newForm, document_reference: e.target.value })
                    }
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={!!newForm.est_principale}
                  onChange={(e) =>
                    setNewForm({ ...newForm, est_principale: e.target.checked })
                  }
                />
                Formation principale (mise en avant sur mon profil)
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormForm(false);
                    setEditingFormId(null);
                    setNewForm({
                      diplome: "",
                      etablissement: "",
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
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
