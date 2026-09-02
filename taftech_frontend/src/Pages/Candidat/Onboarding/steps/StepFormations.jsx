import React from "react";
import { Trash2 } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

export const StepFormations = ({ pendingFormations, setPendingFormations, formationsMode, setFormationsMode, saveFormationsStep, skipStep, profil }) => {
  const removeAt = (idx) => setPendingFormations((list) => list.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Formations</h3>
        {(profil?.formations_detail?.length > 0) && <WizardCategoryToggle mode={formationsMode} onChange={setFormationsMode} />}
      </div>
      <div className="space-y-3 mb-4">
        {pendingFormations.length === 0 && (
          <p className={`text-sm ${tw.textMuted} text-center py-6`}>Aucune formation détectée — vous pourrez en ajouter plus tard depuis votre profil.</p>
        )}
        {pendingFormations.map((f, idx) => (
          <div key={idx} className={`${tw.card} p-4 flex items-start justify-between gap-3`}>
            <div>
              <p className={`text-sm font-bold ${tw.textStrong}`}>{f.diplome}</p>
              <p className={`text-xs ${tw.textMuted}`}>{f.etablissement}</p>
            </div>
            <button type="button" onClick={() => removeAt(idx)} aria-label="Supprimer" className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <p className={`text-xs ${tw.textMuted} mb-4`}>{pendingFormations.length} formation(s) prête(s) à être ajoutée(s)</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} className={`${tw.linkPrimary} text-sm font-semibold`}>Passer cette étape</button>
        <button type="button" onClick={saveFormationsStep} className={`${tw.buttonPrimary} px-6 py-2.5`}>Continuer</button>
      </div>
    </div>
  );
};
