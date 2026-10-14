// Règle des questions disqualifiantes (correction client n°20) : une question qui élimine
// automatiquement un candidat doit viser une exigence professionnelle objective et être justifiée.
// Le serveur applique la même règle et refuse en plus les critères protégés (âge, sexe...).
export const JUSTIFICATION_MIN = 15;
export const JUSTIFICATION_MAX = 500;

export const justificationManquante = (question) =>
  !!question.disqualifiant && (question.justification_disqualifiant || "").trim().length < JUSTIFICATION_MIN;
