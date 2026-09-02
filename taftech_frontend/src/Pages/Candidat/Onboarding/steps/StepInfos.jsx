import React from "react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

const HAS_EXISTING_INFOS = (p) =>
  !!(p?.telephone || p?.wilaya || p?.commune || p?.diplome || p?.specialite || p?.sexe);

export const StepInfos = ({ infosForm, setInfosForm, infosMode, setInfosMode, saveInfosStep, skipStep, constants, profil }) => {
  const set = (field) => (e) => {
    const value = e.target.value;
    setInfosForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Informations personnelles</h3>
        {HAS_EXISTING_INFOS(profil) && <WizardCategoryToggle mode={infosMode} onChange={setInfosMode} />}
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-last-name" className={`${tw.authLabel} mb-1.5`}>Nom</label>
            <input id="onb-last-name" className={tw.authInput} value={infosForm.last_name || ""} onChange={set("last_name")} />
          </div>
          <div>
            <label htmlFor="onb-first-name" className={`${tw.authLabel} mb-1.5`}>Prénom</label>
            <input id="onb-first-name" className={tw.authInput} value={infosForm.first_name || ""} onChange={set("first_name")} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-date-naissance" className={`${tw.authLabel} mb-1.5`}>Date de naissance</label>
            <input id="onb-date-naissance" type="date" className={tw.authInput} value={infosForm.date_naissance || ""} onChange={set("date_naissance")} />
          </div>
          <div>
            <label htmlFor="onb-sexe" className={`${tw.authLabel} mb-1.5`}>Sexe</label>
            <select id="onb-sexe" className={tw.authInput} value={infosForm.sexe || ""} onChange={set("sexe")}>
              <option value="">Sélectionnez…</option>
              <option value="HOMME">Homme</option>
              <option value="FEMME">Femme</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-wilaya" className={`${tw.authLabel} mb-1.5`}>Wilaya</label>
            <select id="onb-wilaya" className={tw.authInput} value={infosForm.wilaya || ""} onChange={set("wilaya")}>
              <option value="">Sélectionnez…</option>
              {(constants.wilayas || []).map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="onb-telephone" className={`${tw.authLabel} mb-1.5`}>Téléphone</label>
            <input id="onb-telephone" type="tel" className={tw.authInput} value={infosForm.telephone || ""} onChange={set("telephone")} />
          </div>
        </div>
        <div>
          <label htmlFor="onb-diplome" className={`${tw.authLabel} mb-1.5`}>Diplôme</label>
          <select id="onb-diplome" className={tw.authInput} value={infosForm.diplome || ""} onChange={set("diplome")}>
            <option value="">Sélectionnez…</option>
            {(constants.diplomes || []).map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between mt-6">
        <button type="button" onClick={skipStep} className={`${tw.linkPrimary} text-sm font-semibold`}>
          Passer cette étape
        </button>
        <button type="button" onClick={saveInfosStep} className={`${tw.buttonPrimary} px-6 py-2.5`}>
          Continuer
        </button>
      </div>
    </div>
  );
};
