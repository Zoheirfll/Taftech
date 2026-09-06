import React, { useMemo } from "react";
import { Check } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

const HAS_EXISTING_INFOS = (p) =>
  !!(p?.telephone || p?.wilaya || p?.commune || p?.diplome || p?.specialite || p?.sexe || p?.bio || p?.linkedin || p?.github);

const SERVICE_MILITAIRE_OPTIONS = [
  { value: "NON_CONCERNE", label: "Non concerné (Femme)" },
  { value: "DEGAGE", label: "Dégagé" },
  { value: "SURSITAIRE", label: "Sursitaire" },
  { value: "INAPTE", label: "Inapte" },
  { value: "INCORPORE", label: "Incorporé" },
];

export const StepInfos = ({ infosForm, setInfosForm, infosMode, setInfosMode, saveInfosStep, skipStep, constants, profil, saving, pendingPhoto }) => {
  const set = (field) => (e) => {
    const value = e.target.value;
    setInfosForm((prev) => ({ ...prev, [field]: value }));
  };
  const toggle = (field) => (e) => {
    const checked = e.target.checked;
    setInfosForm((prev) => ({ ...prev, [field]: checked }));
  };

  const photoPreviewUrl = useMemo(() => (pendingPhoto ? URL.createObjectURL(pendingPhoto) : null), [pendingPhoto]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Informations personnelles</h3>
        {HAS_EXISTING_INFOS(profil) && <WizardCategoryToggle mode={infosMode} onChange={setInfosMode} />}
      </div>

      {photoPreviewUrl && (
        <div className={`flex items-center gap-3 p-3 rounded-xl border mb-4 ${tw.bgSuccessSoft} border-emerald-200`}>
          <img src={photoPreviewUrl} alt="Photo détectée" className="w-12 h-12 rounded-lg object-cover" />
          <p className={`text-xs font-medium ${tw.textSuccess}`}>Photo détectée dans le CV — sera ajoutée à votre profil</p>
        </div>
      )}

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
        <div>
          <label htmlFor="onb-titre" className={`${tw.authLabel} mb-1.5`}>Titre professionnel</label>
          <input id="onb-titre" placeholder="Ex: Développeur Full-Stack" className={tw.authInput} value={infosForm.titre_professionnel || ""} onChange={set("titre_professionnel")} />
        </div>
        <div>
          <label htmlFor="onb-bio" className={`${tw.authLabel} mb-1.5`}>Bio</label>
          <textarea id="onb-bio" rows={3} placeholder="Résumé de votre profil" className={`${tw.authInput} resize-y`} value={infosForm.bio || ""} onChange={set("bio")} />
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
        <div>
          <label htmlFor="onb-service-militaire" className={`${tw.authLabel} mb-1.5`}>Service militaire</label>
          <select id="onb-service-militaire" className={tw.authInput} value={infosForm.service_militaire || ""} onChange={set("service_militaire")}>
            <option value="">Sélectionnez…</option>
            {SERVICE_MILITAIRE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-linkedin" className={`${tw.authLabel} mb-1.5`}>LinkedIn</label>
            <input id="onb-linkedin" placeholder="linkedin.com/in/…" className={tw.authInput} value={infosForm.linkedin || ""} onChange={set("linkedin")} />
          </div>
          <div>
            <label htmlFor="onb-github" className={`${tw.authLabel} mb-1.5`}>GitHub</label>
            <input id="onb-github" placeholder="github.com/…" className={tw.authInput} value={infosForm.github || ""} onChange={set("github")} />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 pt-1">
          {[
            { field: "permis_conduire", label: "Permis de conduire" },
            { field: "passeport_valide", label: "Passeport valide" },
            { field: "vehicule_personnel", label: "Véhiculé" },
          ].map(({ field, label }) => (
            <label key={field} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!infosForm[field]} onChange={toggle(field)} className="sr-only peer" />
              <span className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${infosForm[field] ? `${tw.bgPrimarySolid} border-transparent` : "border-slate-300 bg-white"}`}>
                {infosForm[field] && <Check size={12} className="text-white" />}
              </span>
              <span className={`text-sm ${tw.textStrong}`}>{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mt-6">
        <button type="button" onClick={skipStep} disabled={saving} className={`${tw.linkPrimary} text-sm font-semibold disabled:opacity-50`}>
          Passer cette étape
        </button>
        <button type="button" onClick={saveInfosStep} disabled={saving} className={`${tw.buttonPrimary} px-6 py-2.5 disabled:opacity-60`}>
          {saving ? "Enregistrement..." : "Continuer"}
        </button>
      </div>
    </div>
  );
};
