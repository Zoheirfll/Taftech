import React, { useState } from "react";
import { Trash2, Pencil, Check } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

export const StepFormations = ({ pendingFormations, setPendingFormations, formationsMode, setFormationsMode, saveFormationsStep, skipStep, profil, saving }) => {
  const [editingIndex, setEditingIndex] = useState(null);

  const removeAt = (idx) => {
    setPendingFormations((list) => list.filter((_, i) => i !== idx));
    if (editingIndex === idx) setEditingIndex(null);
  };

  const updateField = (idx, field, value) => {
    setPendingFormations((list) => list.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
  };

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
        {pendingFormations.map((f, idx) =>
          editingIndex === idx ? (
            <div key={idx} className={`${tw.card} p-4 space-y-2.5`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  value={f.diplome || ""}
                  onChange={(e) => updateField(idx, "diplome", e.target.value)}
                  placeholder="Diplôme / formation"
                  className={tw.authInput}
                />
                <input
                  value={f.etablissement || ""}
                  onChange={(e) => updateField(idx, "etablissement", e.target.value)}
                  placeholder="Établissement"
                  className={tw.authInput}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="date"
                  value={f.date_debut || ""}
                  onChange={(e) => updateField(idx, "date_debut", e.target.value)}
                  className={tw.authInput}
                />
                <input
                  type="date"
                  value={f.date_fin || ""}
                  onChange={(e) => updateField(idx, "date_fin", e.target.value)}
                  className={tw.authInput}
                />
              </div>
              <textarea
                value={f.description || ""}
                onChange={(e) => updateField(idx, "description", e.target.value)}
                placeholder="Description ou mention"
                rows={3}
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
                <p className={`text-sm font-bold ${tw.textStrong}`}>{f.diplome}</p>
                <p className={`text-xs ${tw.textMuted}`}>{f.etablissement}</p>
                {(f.date_debut || f.date_fin) && (
                  <p className={`text-xs ${tw.textMuted} mt-0.5`}>{f.date_debut || "?"} — {f.date_fin || "présent"}</p>
                )}
                {f.description && <p className={`text-xs ${tw.textMuted} mt-1 whitespace-pre-line`}>{f.description}</p>}
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
      <p className={`text-xs ${tw.textMuted} mb-4`}>{pendingFormations.length} formation(s) prête(s) à être ajoutée(s)</p>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} disabled={saving} className={`${tw.linkPrimary} text-sm font-semibold disabled:opacity-50`}>Passer cette étape</button>
        <button type="button" onClick={saveFormationsStep} disabled={saving} className={`${tw.buttonPrimary} px-6 py-2.5 disabled:opacity-60`}>{saving ? "Enregistrement..." : "Continuer"}</button>
      </div>
    </div>
  );
};
