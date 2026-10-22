import React, { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { tw } from "../../../../theme";
import { WizardCategoryToggle } from "../../../../Components/onboarding/WizardCategoryToggle";

// Mêmes libellés que le score du profil (`profile_score.POINTS_NIVEAU_LANGUE`) et la barre latérale : un autre
// libellé n'est pas reconnu et ne rapporte aucun point.
const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé", "Bilingue / Maternelle"];

// « , » et « : » séparent les langues et les niveaux dans le champ enregistré (« Arabe:Maternelle,Anglais:Avancé »).
const sansSeparateurs = (texte) => texte.replace(/[,:]/g, "");

export const StepLangues = ({ pendingLangues, setPendingLangues, languesMode, setLanguesMode, saveLanguesStep, skipStep, profil, saving }) => {
  const [nouvelleLangue, setNouvelleLangue] = useState("");
  const [nouveauNiveau, setNouveauNiveau] = useState(NIVEAUX[1]);

  const ajouter = () => {
    const langue = sansSeparateurs(nouvelleLangue).trim();
    if (!langue) return;
    setPendingLangues((list) => [...list.filter((l) => l.langue.toLowerCase() !== langue.toLowerCase()), { langue, niveau: nouveauNiveau }]);
    setNouvelleLangue("");
  };

  const removeAt = (idx) => setPendingLangues((list) => list.filter((_, i) => i !== idx));
  const updateAt = (idx, patch) => setPendingLangues((list) => list.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h3 className={tw.pageTitlePetit}>Langues</h3>
        {!!profil?.langues && <WizardCategoryToggle mode={languesMode} onChange={setLanguesMode} />}
      </div>
      <div className="space-y-2 mb-4">
        {pendingLangues.map((l, idx) => (
          <div key={idx} className={`${tw.card} p-3 flex items-center gap-2`}>
            <input
              aria-label="Langue"
              value={l.langue}
              onChange={(e) => updateAt(idx, { langue: sansSeparateurs(e.target.value) })}
              className={`${tw.authInput} flex-1`}
            />
            <div className="w-40 shrink-0">
              <select aria-label="Niveau" value={l.niveau} onChange={(e) => updateAt(idx, { niveau: e.target.value })} className={tw.authInput}>
                {/* Un niveau issu du CV absent de la liste (« Maternelle ») reste affiché tel quel. */}
                {(NIVEAUX.includes(l.niveau) ? NIVEAUX : [l.niveau, ...NIVEAUX]).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
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
          className={`${tw.authInput} flex-1`}
        />
        <div className="w-40 shrink-0">
          <select value={nouveauNiveau} onChange={(e) => setNouveauNiveau(e.target.value)} className={tw.authInput}>
            {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button type="button" onClick={ajouter} className={`${tw.buttonSecondary} px-3`} aria-label="Ajouter une langue">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={skipStep} disabled={saving} className={`${tw.linkPrimary} text-sm font-semibold disabled:opacity-50`}>Passer cette étape</button>
        <button type="button" onClick={saveLanguesStep} disabled={saving} className={`${tw.buttonPrimary} px-6 py-2.5 disabled:opacity-60`}>{saving ? "Enregistrement..." : "Continuer"}</button>
      </div>
    </div>
  );
};
