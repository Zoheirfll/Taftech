import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé", "Langue maternelle"];

export const StepLangues = ({ pendingLangues, setPendingLangues, languesMode, setLanguesMode, saveLanguesStep, skipStep, profil }) => {
  const [nouvelleLangue, setNouvelleLangue] = useState("");
  const [nouveauNiveau, setNouveauNiveau] = useState(NIVEAUX[1]);

  const ajouter = () => {
    const langue = nouvelleLangue.trim();
    if (!langue) return;
    setPendingLangues((list) => [...list.filter((l) => l.langue.toLowerCase() !== langue.toLowerCase()), { langue, niveau: nouveauNiveau }]);
    setNouvelleLangue("");
  };

  const removeAt = (idx) => setPendingLangues((list) => list.filter((_, i) => i !== idx));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Langues</h3>
        {!!profil?.langues && <WizardCategoryToggle mode={languesMode} onChange={setLanguesMode} />}
      </div>
      <div className="space-y-2 mb-4">
        {pendingLangues.map((l, idx) => (
          <div key={idx} className={`${tw.card} p-3 flex items-center justify-between`}>
            <div>
              <span className={`text-sm font-semibold ${tw.textStrong}`}>{l.langue}</span>
              <span className={`text-xs ${tw.textMuted} ml-2`}>{l.niveau}</span>
            </div>
            <button type="button" onClick={() => removeAt(idx)} aria-label="Supprimer" className="p-1.5 rounded-lg hover:bg-red-100 text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-6">
        <input
          value={nouvelleLangue}
          onChange={(e) => setNouvelleLangue(e.target.value)}
          placeholder="Ex: Anglais"
          className={`${tw.authInput} flex-1`}
        />
        <select value={nouveauNiveau} onChange={(e) => setNouveauNiveau(e.target.value)} className={tw.authInput}>
          {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="button" onClick={ajouter} className={`${tw.buttonSecondary} px-3`} aria-label="Ajouter une langue">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} className={`${tw.linkPrimary} text-sm font-semibold`}>Passer cette étape</button>
        <button type="button" onClick={saveLanguesStep} className={`${tw.buttonPrimary} px-6 py-2.5`}>Continuer</button>
      </div>
    </div>
  );
};
