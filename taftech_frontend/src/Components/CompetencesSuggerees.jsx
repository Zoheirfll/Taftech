import React, { useState } from "react";
import { Plus } from "lucide-react";
import { tw } from "../theme";

/**
 * Compétences « souvent liées à votre métier » (profil et assistant d'import). Aucune n'est pré-cochée ni
 * ajoutée d'office : le candidat ajoute uniquement celles qu'il maîtrise, au niveau « Débutant » qu'il peut
 * ensuite corriger. Choisies dans le référentiel, elles servent directement au matching avec les offres.
 */
const CompetencesSuggerees = ({ suggestions, onAjouter }) => {
  const [enCours, setEnCours] = useState(null);
  if (!suggestions || suggestions.length === 0) return null;

  const ajouter = async (label) => {
    setEnCours(label);
    try {
      await onAjouter(label);
    } finally {
      setEnCours(null);
    }
  };

  return (
    <section aria-labelledby="competences-suggerees-titre" className={`${tw.card} rounded-2xl p-5`}>
      <h2 id="competences-suggerees-titre" className={`text-sm font-bold ${tw.textStrong}`}>
        Compétences souvent liées à votre métier
      </h2>
      <p className={`text-xs ${tw.textMuted} mt-1 mb-3`}>
        Ajoutez uniquement celles que vous maîtrisez : elles seront enregistrées au niveau Débutant (vous pourrez le
        modifier). Choisies dans cette liste, elles améliorent la précision de vos recommandations d'offres. Elles
        sont repérées « suggérée » sur votre profil, y compris pour les recruteurs.
      </p>
      <ul className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <li key={s.label}>
            <button
              type="button"
              onClick={() => ajouter(s.label)}
              disabled={enCours !== null}
              aria-label={`Ajouter ${s.label}`}
              className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full ${tw.surfaceSubtle} ${tw.textMuted700} ${tw.hoverSurfaceSubtleStrong} ${tw.focusRing} disabled:opacity-60`}
            >
              <Plus size={12} aria-hidden="true" /> {s.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default CompetencesSuggerees;
