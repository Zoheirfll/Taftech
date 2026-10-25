import React from "react";

/**
 * Repère une compétence ajoutée depuis les suggestions du métier (`origine === "SUGGESTION"`) plutôt que saisie ou
 * issue du CV. Information seulement : jamais lue par le score. Le candidat voit ce que le recruteur voit.
 */
const BadgeCompetenceSuggeree = ({ pourRecruteur = false }) => (
  <span
    className="opacity-70 text-[10px]"
    title={pourRecruteur ? "Ajoutée depuis les suggestions du métier (non issue du CV)" : "Choisie parmi les suggestions de votre métier"}
  >
    · suggérée
  </span>
);

export default BadgeCompetenceSuggeree;
