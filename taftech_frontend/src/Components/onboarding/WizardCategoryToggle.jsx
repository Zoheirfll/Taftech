import React from "react";
import { tw } from "../../theme";

// Switch Remplacer/Ajouter reutilise par chaque etape du wizard (Infos,
// Experiences, Formations, Langues, Competences) — le parent decide seul
// s'il faut l'afficher (seulement si la categorie a deja des donnees en base,
// voir le design "cache si rien a remplacer").
export const WizardCategoryToggle = ({ mode, onChange }) => {
  const options = [
    { value: "ajouter", label: "Ajouter" },
    { value: "remplacer", label: "Remplacer" },
  ];
  return (
    <div className={`inline-flex rounded-lg border ${tw.borderBase} p-0.5 gap-0.5`}>
      {options.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              active ? `${tw.bgPrimarySolid} ${tw.textOnDark}` : `${tw.textMuted} hover:${tw.surfaceMuted}`
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
