// Compétences « souvent liées à votre métier » proposées au candidat (24/10/2026). Mêmes données que la
// publication d'offre (`MetierSuggestionsAPIView`, lien `MetierCompetence`) : rien n'est jamais attribué
// automatiquement, le candidat choisit lui-même (consigne client). Un libellé choisi dans la liste porte le
// lien du référentiel dès l'enregistrement, donc le matching avec une offre devient exact.
export const MAX_METIERS_SUGGESTIONS = 3; // métiers interrogés : le souhaité, l'actuel, la dernière expérience…
export const MAX_SUGGESTIONS = 12;

const cle = (texte) =>
  (texte || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/** Identifiants de métier distincts (entiers positifs), dans l'ordre reçu, `MAX_METIERS_SUGGESTIONS` au plus. */
export const idsMetiers = (...sources) => {
  const ids = [];
  for (const valeur of sources.flat(Infinity)) {
    const id = Number(valeur);
    if (Number.isInteger(id) && id > 0 && !ids.includes(id)) ids.push(id);
  }
  return ids.slice(0, MAX_METIERS_SUGGESTIONS);
};

/**
 * Fusionne les réponses de `getMetierSuggestions` (une par métier) en une liste unique :
 * `[{ id, label, nbMetiers }]`, sans ce que le candidat possède déjà (`possedees` : libellés ou objets
 * `{ label }`), triée par nombre de métiers concernés puis par ordre d'arrivée, `MAX_SUGGESTIONS` au plus.
 */
export const fusionnerSuggestions = (reponses, possedees) => {
  const dejaLa = new Set((possedees || []).map((c) => cle(typeof c === "string" ? c : c?.label)));
  const parCle = new Map();
  for (const reponse of reponses || []) {
    for (const competence of reponse?.competences || []) {
      const libelle = (competence?.label || "").trim();
      const clef = cle(libelle);
      if (!clef || dejaLa.has(clef)) continue;
      const existante = parCle.get(clef);
      if (existante) existante.nbMetiers += 1;
      else parCle.set(clef, { id: competence.id, label: libelle, nbMetiers: 1 });
    }
  }
  // Array.prototype.sort est stable : à nombre de métiers égal, l'ordre d'arrivée est conservé.
  return [...parCle.values()].sort((a, b) => b.nbMetiers - a.nbMetiers).slice(0, MAX_SUGGESTIONS);
};
