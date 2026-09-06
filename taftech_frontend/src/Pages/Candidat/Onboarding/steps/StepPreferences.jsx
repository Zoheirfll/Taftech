import React from "react";
import { tw } from "../../../../theme";
import { SecteurDomaineSelect } from "../../../../Components/SecteurDomaineSelect";

export const StepPreferences = ({ prefsForm, setPrefsForm, savePrefsStep, skipStep, saving }) => {
  const set = (field) => (e) => {
    const value = e.target.value;
    setPrefsForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <h3 className={`${tw.pageTitlePetit} mb-5`}>Préférences de recrutement</h3>
      <div className="space-y-4">
        <div>
          <label className={`${tw.authLabel} mb-1.5`}>Secteur souhaité</label>
          <SecteurDomaineSelect
            value={prefsForm.secteur_souhaite || ""}
            onChange={(domaineCode) => setPrefsForm((prev) => ({ ...prev, secteur_souhaite: domaineCode }))}
          />
        </div>
        <div>
          <label htmlFor="onb-salaire" className={`${tw.authLabel} mb-1.5`}>Salaire mensuel attendu</label>
          <input
            id="onb-salaire"
            placeholder="Ex: 80 000 DA"
            className={tw.authInput}
            value={prefsForm.salaire_souhaite || ""}
            onChange={set("salaire_souhaite")}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-mobilite" className={`${tw.authLabel} mb-1.5`}>Mobilité</label>
            <select id="onb-mobilite" className={tw.authInput} value={prefsForm.mobilite || ""} onChange={set("mobilite")}>
              <option value="">Sélectionnez…</option>
              <option value="LOCALE">Locale</option>
              <option value="REGIONALE">Régionale</option>
              <option value="NATIONALE">Nationale</option>
              <option value="INTERNATIONALE">Internationale</option>
            </select>
          </div>
          <div>
            <label htmlFor="onb-situation" className={`${tw.authLabel} mb-1.5`}>Statut actuel</label>
            <select id="onb-situation" className={tw.authInput} value={prefsForm.situation_actuelle || ""} onChange={set("situation_actuelle")}>
              <option value="">Sélectionnez…</option>
              <option value="EN_RECHERCHE">En recherche active</option>
              <option value="A_L_ECOUTE">À l'écoute du marché</option>
              <option value="EN_POSTE">En poste</option>
              <option value="ETUDIANT">Étudiant</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-6">
        <button type="button" onClick={skipStep} disabled={saving} className={`${tw.linkPrimary} text-sm font-semibold disabled:opacity-50`}>
          Passer cette étape
        </button>
        <button type="button" onClick={savePrefsStep} disabled={saving} className={`${tw.buttonPrimary} px-6 py-2.5 disabled:opacity-60`}>
          {saving ? "Enregistrement..." : "Continuer"}
        </button>
      </div>
    </div>
  );
};
