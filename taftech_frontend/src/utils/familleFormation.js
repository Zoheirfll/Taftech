// Point 8 (corrections finales client) : les domaines universitaires, les branches de formation
// professionnelle et les thèmes généraux TafTech ne doivent jamais être mélangés dans une même
// liste. L'API de nomenclature fournit une `famille` sur chaque type de diplôme, domaine et
// spécialité ; ces utilitaires en tirent des listes groupées pour react-select.

const ORDRE_FAMILLES = ["superieur", "formation_professionnelle", "scolaire", "certification", "theme", "autre"];

const LIBELLES_PAR_DEFAUT = {
  superieur: "Enseignement supérieur",
  formation_professionnelle: "Formation professionnelle",
  scolaire: "Enseignement moyen et secondaire",
  certification: "Certifications et attestations",
  theme: "Thèmes généraux TafTech",
  autre: "Autres diplômes",
};

// Seules ces deux familles ont des domaines propres : choisir un type de l'une d'elles restreint
// la liste des domaines (un BTS ne se classe pas dans « Droit et sciences politiques »).
const FAMILLES_AVEC_DOMAINES = ["superieur", "formation_professionnelle"];

const libelleFamille = (code, familles) =>
  (familles || []).find((f) => f.code === code)?.libelle || LIBELLES_PAR_DEFAUT[code] || code;

/**
 * Regroupe des éléments ({ famille, ... }) en groupes react-select ordonnés
 * [{ label, options }]. `versOption` convertit un élément en option { value, label, ... }.
 * Les familles vides sont omises.
 */
export const grouperParFamille = (elements, familles, versOption) =>
  ORDRE_FAMILLES.map((code) => ({
    label: libelleFamille(code, familles),
    options: (elements || []).filter((e) => (e.famille || "autre") === code).map(versOption),
  })).filter((groupe) => groupe.options.length > 0);

/** Options à plat d'une liste de groupes (pour retrouver la valeur sélectionnée). */
export const aplatirGroupes = (groupes) => groupes.flatMap((g) => g.options);

/**
 * Famille d'un type de diplôme (supérieur / formation professionnelle) — sert à ne proposer,
 * une fois le type choisi, que les domaines de la même famille. Retourne "" si inconnue.
 */
export const familleDuDiplome = (typesDiplomes, diplomeId) => {
  if (!diplomeId) return "";
  const type = (typesDiplomes || []).find((t) => String(t.id) === String(diplomeId));
  return type && FAMILLES_AVEC_DOMAINES.includes(type.famille) ? type.famille : "";
};

/** Types de diplôme proposés pour un niveau d'études (étape 1 de la cascade). Sans niveau : tous. */
export const typesPourNiveau = (typesDiplomes, niveau) =>
  niveau ? (typesDiplomes || []).filter((t) => (niveau.familles || []).includes(t.famille)) : typesDiplomes || [];

/**
 * Niveau d'études correspondant à un type de diplôme déjà choisi (édition d'une formation) :
 * BEM/BEF -> « moyen », Baccalauréat -> « secondaire », formation professionnelle et
 * certifications -> « formation professionnelle », le reste -> « études supérieures ».
 */
export const niveauPourType = (niveaux, typesDiplomes, diplomeId) => {
  const type = (typesDiplomes || []).find((t) => String(t.id) === String(diplomeId));
  if (!type) return null;
  let code = "SC-SUP";
  if (type.famille === "scolaire") code = ["D-BEM", "D-BEF"].includes(type.code) ? "SC-MOY" : "SC-SEC";
  else if (type.famille === "formation_professionnelle" || type.famille === "certification") code = "SC-FP";
  return (niveaux || []).find((n) => n.code === code) || null;
};
