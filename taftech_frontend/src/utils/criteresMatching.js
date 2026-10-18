// Critères exclus du score d'une candidature (« Non demandé »).
// Les scores enregistrés avant l'ajout de `criteres_non_demandes` n'ont pas cette liste : on la
// déduit alors. Le serveur écrit une phrase explicative pour tout critère réellement évalué ;
// un critère à 0 sans explication a donc été exclu du calcul.
export const criteresNonDemandes = (details, cles) => {
  if (!details) return [];
  if (Array.isArray(details.criteres_non_demandes)) return details.criteres_non_demandes;
  const explications = details.explications || {};
  if (Object.keys(explications).length === 0) return [];
  const scores = details.scores || details;
  return cles.filter((cle) => !explications[cle] && !scores[cle]);
};
