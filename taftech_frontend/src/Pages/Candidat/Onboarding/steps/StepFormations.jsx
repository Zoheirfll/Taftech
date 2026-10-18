import React, { useState } from "react";
import { Trash2, Pencil, Check } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";
import { FormationReferentielSelect } from "../../../../Components/FormationReferentielSelect";
import { formatDatePrecise } from "../../../../utils/cvDates";
import DatePrecisionInput from "../../../../Components/DatePrecisionInput";

export const StepFormations = ({ pendingFormations, setPendingFormations, formationsMode, setFormationsMode, saveFormationsStep, skipStep, profil, saving }) => {
  const [editingIndex, setEditingIndex] = useState(null);

  const removeAt = (idx) => {
    setPendingFormations((list) => list.filter((_, i) => i !== idx));
    if (editingIndex === idx) setEditingIndex(null);
  };

  const updateField = (idx, field, value) => {
    setPendingFormations((list) => list.map((f, i) => (i === idx ? { ...f, [field]: value, ...(field === "date_debut" || field === "date_fin" ? { [`${field}_precision`]: "JOUR" } : {}) } : f)));
  };

  const updateFields = (idx, patch) => {
    setPendingFormations((list) => list.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
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
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/60 space-y-3">
                <p className="text-xs text-slate-600">
                  Choisissez votre diplôme et votre spécialité dans les listes pour obtenir un
                  score de correspondance fiable sur les offres.
                </p>
                <FormationReferentielSelect
                  diplomeId={f.diplome_ref}
                  specialiteId={f.specialite_ref}
                  onChangeDiplome={(id, label) => {
                    updateFields(idx, {
                      diplome_ref: id,
                      diplome_ref_libelle: label || "",
                      ...(id && label ? { diplome: label } : {}),
                    });
                  }}
                  onChangeSpecialite={(id, label) => {
                    updateFields(idx, {
                      specialite_ref: id,
                      specialite_ref_libelle: label || "",
                      ...(id && label ? { description: label, specialite_autre: "" } : {}),
                    });
                  }}
                  autreTexte={f.description}
                  onChangeAutreTexte={(texte) => updateFields(idx, { description: texte, specialite_autre: texte })}
                  diplomeAutreTexte={f.diplome}
                  onChangeDiplomeAutreTexte={(texte) => updateField(idx, "diplome", texte)}
                  onConfirmerSuggestion={(diplomeRef, diplomeLabel, specialiteRef, specialiteLabel) =>
                    updateFields(idx, {
                      diplome_ref: diplomeRef || f.diplome_ref,
                      diplome_ref_libelle: diplomeRef ? (diplomeLabel || "") : f.diplome_ref_libelle,
                      specialite_ref: specialiteRef || f.specialite_ref,
                      specialite_ref_libelle: specialiteRef ? (specialiteLabel || "") : f.specialite_ref_libelle,
                    })
                  }
                />
              </div>
              <input
                value={f.etablissement || ""}
                onChange={(e) => updateField(idx, "etablissement", e.target.value)}
                placeholder="Établissement"
                className={tw.authInput}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <DatePrecisionInput
                  ariaLabel="Début de la formation"
                  value={f.date_debut || ""}
                  precision={f.date_debut_precision || "JOUR"}
                  onChange={(v, p) => updateFields(idx, { date_debut: v, date_debut_precision: p })}
                  className={tw.authInput}
                />
                <DatePrecisionInput
                  ariaLabel="Fin de la formation"
                  value={f.date_fin || ""}
                  precision={f.date_fin_precision || "JOUR"}
                  onChange={(v, p) => updateFields(idx, { date_fin: v, date_fin_precision: p })}
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
                {(f.diplome_ref_libelle || f.specialite_ref_libelle) && (
                  <p className="text-xs font-semibold text-teal-700 mt-0.5">
                    {f.diplome_ref_libelle}
                    {f.diplome_ref_libelle && f.specialite_ref_libelle && " · "}
                    {f.specialite_ref_libelle}
                  </p>
                )}
                {(f.date_debut || f.date_fin) && (
                  <p className={`text-xs ${tw.textMuted} mt-0.5`}>{f.date_debut ? `${formatDatePrecise(f.date_debut, f.date_debut_precision)} — ` : ""}{f.date_fin ? formatDatePrecise(f.date_fin, f.date_fin_precision) : "présent"}</p>
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
