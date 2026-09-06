import React, { useState } from "react";
import { Trash2, Pencil, Check } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";
import { SecteurDomaineSelect } from "../../../../Components/SecteurDomaineSelect";
import DomaineLabel from "../../../../Components/DomaineLabel";

export const StepExperiences = ({ pendingExperiences, setPendingExperiences, experiencesMode, setExperiencesMode, saveExperiencesStep, skipStep, profil, saving }) => {
  const [editingIndex, setEditingIndex] = useState(null);

  const removeAt = (idx) => {
    setPendingExperiences((list) => list.filter((_, i) => i !== idx));
    if (editingIndex === idx) setEditingIndex(null);
  };

  const updateField = (idx, field, value) => {
    setPendingExperiences((list) => list.map((exp, i) => (i === idx ? { ...exp, [field]: value } : exp)));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Expériences</h3>
        {(profil?.experiences_detail?.length > 0) && <WizardCategoryToggle mode={experiencesMode} onChange={setExperiencesMode} />}
      </div>
      <div className="space-y-3 mb-4">
        {pendingExperiences.length === 0 && (
          <p className={`text-sm ${tw.textMuted} text-center py-6`}>Aucune expérience détectée — vous pourrez en ajouter plus tard depuis votre profil.</p>
        )}
        {pendingExperiences.map((exp, idx) =>
          editingIndex === idx ? (
            <div key={idx} className={`${tw.card} p-4 space-y-2.5`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  value={exp.titre_poste || ""}
                  onChange={(e) => updateField(idx, "titre_poste", e.target.value)}
                  placeholder="Titre du poste"
                  className={tw.authInput}
                />
                <input
                  value={exp.entreprise || ""}
                  onChange={(e) => updateField(idx, "entreprise", e.target.value)}
                  placeholder="Entreprise"
                  className={tw.authInput}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="date"
                  value={exp.date_debut || ""}
                  onChange={(e) => updateField(idx, "date_debut", e.target.value)}
                  className={tw.authInput}
                />
                <input
                  type="date"
                  value={exp.date_fin || ""}
                  onChange={(e) => updateField(idx, "date_fin", e.target.value)}
                  placeholder="Vide si toujours en poste"
                  className={tw.authInput}
                />
              </div>
              <SecteurDomaineSelect value={exp.secteur || ""} onChange={(code) => updateField(idx, "secteur", code)} />
              <textarea
                value={exp.description || ""}
                onChange={(e) => updateField(idx, "description", e.target.value)}
                placeholder="Missions et réalisations"
                rows={4}
                className={`${tw.authInput} resize-y`}
              />
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => removeAt(idx)} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700">
                  <Trash2 size={12} /> Supprimer
                </button>
                <button type="button" onClick={() => setEditingIndex(null)} className={`${tw.buttonPrimary} px-4 py-1.5 flex items-center gap-1.5 text-sm`}>
                  <Check size={14} /> Terminé
                </button>
              </div>
            </div>
          ) : (
            <div key={idx} className={`${tw.card} p-4 flex items-start justify-between gap-3`}>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold ${tw.textStrong}`}>{exp.titre_poste}</p>
                <p className={`text-xs ${tw.textMuted}`}>{exp.entreprise}</p>
                {(exp.date_debut || exp.date_fin || exp.secteur) && (
                  <p className={`text-xs ${tw.textMuted} mt-0.5`}>
                    {exp.date_debut || "?"} — {exp.date_fin || "présent"}
                    {exp.secteur && <DomaineLabel code={exp.secteur} prefix=" · " />}
                  </p>
                )}
                {exp.description && <p className={`text-xs ${tw.textMuted} mt-1 whitespace-pre-line`}>{exp.description}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => setEditingIndex(idx)} aria-label="Modifier" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => removeAt(idx)} aria-label="Supprimer" className="p-1.5 rounded-lg hover:bg-red-100 text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ),
        )}
      </div>
      <p className={`text-xs ${tw.textMuted} mb-4`}>{pendingExperiences.length} expérience(s) prête(s) à être ajoutée(s)</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} disabled={saving} className={`${tw.linkPrimary} text-sm font-semibold disabled:opacity-50`}>Passer cette étape</button>
        <button type="button" onClick={saveExperiencesStep} disabled={saving} className={`${tw.buttonPrimary} px-6 py-2.5 disabled:opacity-60`}>{saving ? "Enregistrement..." : "Continuer"}</button>
      </div>
    </div>
  );
};
