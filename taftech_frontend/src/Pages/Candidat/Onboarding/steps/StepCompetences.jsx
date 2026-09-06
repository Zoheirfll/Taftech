import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

const NIVEAUX = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
  { value: "CONFIRME", label: "Confirmé" },
];

export const StepCompetences = ({ pendingCompetences, setPendingCompetences, competencesMode, setCompetencesMode, saveCompetencesStep, skipStep, profil, saving }) => {
  const [nouvelleCompetence, setNouvelleCompetence] = useState("");
  const [nouveauNiveau, setNouveauNiveau] = useState("DEBUTANT");

  const ajouter = () => {
    const label = nouvelleCompetence.trim();
    if (!label) return;
    setPendingCompetences((list) => [...list.filter((c) => c.label.toLowerCase() !== label.toLowerCase()), { label, niveau: nouveauNiveau }]);
    setNouvelleCompetence("");
  };

  const removeAt = (idx) => setPendingCompetences((list) => list.filter((_, i) => i !== idx));
  const updateNiveau = (idx, niveau) => setPendingCompetences((list) => list.map((c, i) => (i === idx ? { ...c, niveau } : c)));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Compétences</h3>
        {(profil?.competences_detail?.length > 0) && <WizardCategoryToggle mode={competencesMode} onChange={setCompetencesMode} />}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {pendingCompetences.map((c, idx) => (
          <span key={idx} className={`inline-flex items-center gap-1.5 ${tw.badgeNeutral} px-3 py-1.5`}>
            {c.label}
            <select
              value={c.niveau}
              onChange={(e) => updateNiveau(idx, e.target.value)}
              aria-label={`Niveau de ${c.label}`}
              className="bg-transparent text-[10px] font-semibold border-l pl-1.5 ml-0.5 cursor-pointer focus:outline-none"
            >
              {NIVEAUX.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
            <button type="button" onClick={() => removeAt(idx)} aria-label={`Supprimer ${c.label}`}>
              <Trash2 size={12} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 mb-6">
        <input
          value={nouvelleCompetence}
          onChange={(e) => setNouvelleCompetence(e.target.value)}
          placeholder="Ex: React"
          className={`${tw.authInput} flex-1`}
        />
        <div className="w-40 shrink-0">
          <select value={nouveauNiveau} onChange={(e) => setNouveauNiveau(e.target.value)} className={tw.authInput}>
            {NIVEAUX.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
        <button type="button" onClick={ajouter} className={`${tw.buttonSecondary} px-3`} aria-label="Ajouter une compétence">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} disabled={saving} className={`${tw.linkPrimary} text-sm font-semibold disabled:opacity-50`}>Passer cette étape</button>
        <button type="button" onClick={saveCompetencesStep} disabled={saving} className={`${tw.buttonPrimary} px-6 py-2.5 disabled:opacity-60`}>{saving ? "Enregistrement..." : "Continuer"}</button>
      </div>
    </div>
  );
};
