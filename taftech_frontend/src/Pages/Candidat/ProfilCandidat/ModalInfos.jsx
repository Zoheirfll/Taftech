// Modale "Informations personnelles".
import { useSubmitLock } from "../../../utils/useSubmitLock";
import Select from "react-select";
import { selectStyles, tw } from "../../../theme";
import { grouperParFamille } from "../../../utils/familleFormation";
import { MetierAutocomplete } from "../../../Components/MetierAutocomplete";
import FieldError from "../../../Components/FieldError";
import { useErreursChamps } from "../../../utils/useErreursChamps";

export const ModalInfos = ({ inputClass, modalClass, modalInnerClass, btnPrimary, btnCancel, constants, typesDiplomes, showInfoForm, setShowInfoForm, editInfo, setEditInfo, handleUpdateGeneric, getCommunesOptions }) => {
  const [submitBusy, lockSubmit] = useSubmitLock();
  const { erreurs, exiger, effacer, attributs } = useErreursChamps();
  const communesOptions = getCommunesOptions(editInfo.wilaya);
  return (
    <>
      {showInfoForm && (
        <div className={modalClass}>
          <div className={modalInnerClass}>
            <h3 className={tw.modalHeading}>
              Informations personnelles
            </h3>
            <form
              noValidate
              onSubmit={lockSubmit((e) => {
                const manque = exiger(editInfo, {
                  first_name: "Le prénom est obligatoire.",
                  last_name: "Le nom est obligatoire.",
                  telephone: "Le numéro de téléphone est obligatoire.",
                });
                if (manque) {
                  e.preventDefault();
                  return;
                }
                return handleUpdateGeneric(e, editInfo, setShowInfoForm);
              })}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Prénom
                  </label>
                  <input
                    required
                    {...attributs("first_name")}
                    className={inputClass}
                    value={editInfo.first_name}
                    onChange={(e) => {
                      setEditInfo({ ...editInfo, first_name: e.target.value });
                      effacer("first_name");
                    }}
                  />
                  <FieldError id="err-first_name" message={erreurs.first_name} />
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Nom
                  </label>
                  <input
                    required
                    {...attributs("last_name")}
                    className={inputClass}
                    value={editInfo.last_name}
                    onChange={(e) => {
                      setEditInfo({ ...editInfo, last_name: e.target.value });
                      effacer("last_name");
                    }}
                  />
                  <FieldError id="err-last_name" message={erreurs.last_name} />
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Téléphone
                </label>
                <input
                  required
                  type="tel"
                  {...attributs("telephone")}
                  className={inputClass}
                  value={editInfo.telephone}
                  onChange={(e) => {
                    setEditInfo({ ...editInfo, telephone: e.target.value });
                    effacer("telephone");
                  }}
                />
                <FieldError id="err-telephone" message={erreurs.telephone} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Wilaya
                  </label>
                  <Select
                    options={constants.wilayas}
                    value={
                      constants.wilayas.find(
                        (w) => w.value === editInfo.wilaya,
                      ) || null
                    }
                    placeholder="Sélectionnez..."
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        wilaya: opt ? opt.value : "",
                        commune: "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Commune
                  </label>
                  <Select
                    options={communesOptions}
                    isDisabled={!editInfo.wilaya}
                    value={communesOptions.find((c) => c.value === editInfo.commune) || null}
                    placeholder={
                      editInfo.wilaya ? "Sélectionnez..." : "Wilaya d'abord"
                    }
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        commune: opt ? opt.value : "",
                      })
                    }
                    styles={selectStyles}
                  />
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Adresse
                </label>
                <input
                  className={inputClass}
                  value={editInfo.adresse || ""}
                  onChange={(e) =>
                    setEditInfo({ ...editInfo, adresse: e.target.value })
                  }
                />
              </div>
              {editInfo.nin && (
                <div>
                  <label className={tw.formLabel}>
                    NIN (Numéro d'Identification Nationale)
                  </label>
                  <p className={`w-full px-4 py-2.5 rounded-xl text-sm font-mono ${tw.ninDisplayBox}`}>
                    {editInfo.nin}
                  </p>
                </div>
              )}
              {!editInfo.nin && (
                <p className={`text-xs ${tw.textMuted}`}>
                  NIN : il vous sera demandé une seule fois, à votre première candidature (exigence de l'ANEM).
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={tw.formLabel}>
                    Diplôme le plus élevé
                  </label>
                  <Select
                    options={grouperParFamille(typesDiplomes, null, (d) => ({ value: d.id, label: d.libelle }))}
                    value={
                      (typesDiplomes || [])
                        .map((d) => ({ value: d.id, label: d.libelle }))
                        .find((o) => String(o.value) === String(editInfo.diplome_ref)) || null
                    }
                    placeholder="Sélectionnez..."
                    isClearable
                    onChange={(opt) =>
                      setEditInfo({
                        ...editInfo,
                        diplome_ref: opt ? opt.value : "",
                        diplome_ref_libelle: opt ? opt.label : "",
                      })
                    }
                    styles={selectStyles}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Utilisé pour le matching seulement si aucune formation détaillée n'est renseignée dans "Mes formations" — une formation détaillée reste toujours prioritaire.
                  </p>
                </div>
                <div>
                  <label className={tw.formLabel}>
                    Métier
                  </label>
                  <MetierAutocomplete
                    proposable
                    value={editInfo.metier_appellation_libelle || editInfo.metier_libelle || ""}
                    onSelect={(item) => setEditInfo({
                      ...editInfo,
                      metier: item.metier_id,
                      metier_libelle: item.metier_libelle,
                      metier_appellation: item.appellation_id || null,
                      metier_appellation_libelle: item.appellation_libelle,
                    })}
                  />
                </div>
              </div>
              <div>
                <label className={tw.formLabel}>
                  Situation militaire
                </label>
                <select
                  className={inputClass}
                  value={editInfo.service_militaire}
                  onChange={(e) =>
                    setEditInfo({
                      ...editInfo,
                      service_militaire: e.target.value,
                    })
                  }
                >
                  <option value="">Sélectionner...</option>
                  <option value="DEGAGE">Dégagé</option>
                  <option value="SURSITAIRE">Sursitaire</option>
                  <option value="INAPTE">Inapte</option>
                  <option value="INCORPORE">Incorporé</option>
                  <option value="NON_CONCERNE">Non concerné</option>
                </select>
              </div>
              <div className="flex gap-6 py-2">
                {[
                  { label: "Permis de conduire", field: "permis_conduire" },
                  { label: "Passeport valide", field: "passeport_valide" },
                ].map(({ label, field }) => (
                  <label
                    key={field}
                    className={`flex items-center gap-2 cursor-pointer text-sm font-medium ${tw.textMuted700}`}
                  >
                    <input
                      type="checkbox"
                      className={`w-4 h-4 ${tw.accentPrimary}`}
                      checked={editInfo[field]}
                      onChange={(e) =>
                        setEditInfo({ ...editInfo, [field]: e.target.checked })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInfoForm(false)}
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
