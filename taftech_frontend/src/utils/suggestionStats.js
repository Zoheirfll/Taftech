// Texte d'usage affiché sur une suggestion de création d'offre (voir
// jobs/suggestions_stats.py : seuils minimaux côté serveur, les valeurs absentes = null).
export function libelleUsage(s) {
  const parts = [];
  if (s.pct_candidats != null) parts.push(`${s.pct_candidats} % des candidats`);
  if (s.nb_offres != null) parts.push(`${s.nb_offres} offre${s.nb_offres > 1 ? "s" : ""}`);
  return parts.join(" · ");
}
