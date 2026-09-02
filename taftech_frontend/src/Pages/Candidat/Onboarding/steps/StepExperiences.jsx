import React from "react";
import { Trash2 } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

export const StepExperiences = ({ pendingExperiences, setPendingExperiences, experiencesMode, setExperiencesMode, saveExperiencesStep, skipStep, profil }) => {
  const removeAt = (idx) => setPendingExperiences((list) => list.filter((_, i) => i !== idx));

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
        {pendingExperiences.map((exp, idx) => (
          <div key={idx} className={`${tw.card} p-4 flex items-start justify-between gap-3`}>
            <div>
              <p className={`text-sm font-bold ${tw.textStrong}`}>{exp.titre_poste}</p>
              <p className={`text-xs ${tw.textMuted}`}>{exp.entreprise}</p>
              {exp.description && <p className={`text-xs ${tw.textMuted} mt-1 line-clamp-2`}>{exp.description}</p>}
            </div>
            <button type="button" onClick={() => removeAt(idx)} aria-label="Supprimer" className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <p className={`text-xs ${tw.textMuted} mb-4`}>{pendingExperiences.length} expérience(s) prête(s) à être ajoutée(s)</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} className={`${tw.linkPrimary} text-sm font-semibold`}>Passer cette étape</button>
        <button type="button" onClick={saveExperiencesStep} className={`${tw.buttonPrimary} px-6 py-2.5`}>Continuer</button>
      </div>
    </div>
  );
};
