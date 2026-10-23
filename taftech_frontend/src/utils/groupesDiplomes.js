// Niveaux de diplôme qui réunissent des natures différentes d'un MÊME diplôme : « Master » = académique,
// professionnel ou à nature non précisée. Sans cela, une offre « Master académique » ne retient pas un
// candidat qui a déclaré « Master à nature non précisée » (le score compare les diplômes par identifiant).
// Choisir un niveau enregistre ses types (le calcul ne change pas) ; l'affichage les regroupe en une entrée.
// Volontairement minimal et relu avec l'utilisateur : pas d'équivalence construite entre diplômes distincts.
// Seule exception, décidée explicitement (23/10/2026) : l'ingéniorat (diplôme d'ingénieur d'État, Bac +5) fait partie
// du niveau Master, comme sur les offres du marché (« Master 2, Ingéniorat, Bac +5 »). BTS, magister et licence
// « ancien système » (4 ans, donc pas « Bac +3 ») restent individuels.

export const GROUPES_DIPLOMES = [
  { code: "GRP-LICENCE", libelle: "Licence (Bac +3)", codes: ["D-LIC-A", "D-LIC-P", "D-LIC-NP"] },
  { code: "GRP-MASTER", libelle: "Master / Ingéniorat (Bac +5)", codes: ["D-MAS-A", "D-MAS-P", "D-MAS-NP", "D-ING"] },
  // Affichage seulement (jamais proposé à la sélection) : une offre enregistrée avec les 3 masters, sans l'ingéniorat
  // (créée avant l'ajout de l'ingéniorat au niveau Master), s'écrit « Master (Bac +5) » et non la liste des 3 natures.
  // Doit rester APRÈS « GRP-MASTER » : quand les 4 types sont choisis, le groupe complet l'emporte.
  { code: "GRP-MASTER-SEUL", libelle: "Master (Bac +5)", codes: ["D-MAS-A", "D-MAS-P", "D-MAS-NP"], selectionnable: false },
  { code: "GRP-DOCTORAT", libelle: "Doctorat", codes: ["D-DOC-LMD", "D-DOC-NP", "D-DOC-SCI"] },
];

export const LIBELLE_GROUPE_NIVEAUX = "Niveaux (toutes les natures)";

export const estGroupe = (valeur) => typeof valeur === "string" && GROUPES_DIPLOMES.some((g) => g.code === valeur);

/** Types de diplôme d'un groupe, dans l'ordre de la nomenclature. */
export const membresDuGroupe = (codeGroupe, typesDiplomes) => {
  const groupe = GROUPES_DIPLOMES.find((g) => g.code === codeGroupe);
  return groupe ? (typesDiplomes || []).filter((t) => groupe.codes.includes(t.code)) : [];
};

/** Groupe react-select « Niveaux » : seulement les groupes dont tous les types existent dans la nomenclature. */
export const optionsNiveaux = (typesDiplomes) => {
  const options = GROUPES_DIPLOMES
    .filter((g) => g.selectionnable !== false && membresDuGroupe(g.code, typesDiplomes).length === g.codes.length)
    .map((g) => ({ value: g.code, label: g.libelle }));
  return options.length ? [{ label: LIBELLE_GROUPE_NIVEAUX, options }] : [];
};

/**
 * Entrées affichables des diplômes choisis ({ id, code, libelle }) : un groupe entièrement choisi devient une
 * seule entrée { cle, libelle, ids }, à la place de son premier membre ; le reste est inchangé.
 */
export const MAX_NIVEAUX_COMPACTS = 2;

/**
 * Affichage compact (cartes de liste) : au plus `max` niveaux, puis « N autres » — « Master / Ingéniorat (Bac +5),
 * Licence (Bac +3) ou 2 autres ». La page d'une offre garde le détail complet (`regrouperDiplomes`).
 */
export const libellesDiplomesCompacts = (diplomes, max = MAX_NIVEAUX_COMPACTS) => {
  // « — nature non précisée » alourdit une pastille de carte sans rien apprendre au candidat : le détail reste sur la page de l'offre.
  const libelles = regrouperDiplomes(diplomes).map((e) => e.libelle.replace(/\s+—\s+nature non précisée/i, ""));
  if (libelles.length <= max) return libelles;
  const reste = libelles.length - max;
  return [...libelles.slice(0, max), `${reste} autre${reste > 1 ? "s" : ""}`];
};

export const regrouperDiplomes = (diplomes) => {
  const choisis = diplomes || [];
  const groupesComplets = GROUPES_DIPLOMES.filter((g) => g.codes.every((c) => choisis.some((d) => d.code === c)));
  const dejaPlaces = new Set();
  const entrees = [];
  choisis.forEach((d) => {
    const groupe = groupesComplets.find((g) => g.codes.includes(d.code));
    if (!groupe) {
      entrees.push({ cle: String(d.id), libelle: d.libelle, ids: [d.id] });
    } else if (!dejaPlaces.has(groupe.code)) {
      dejaPlaces.add(groupe.code);
      const ids = groupe.codes.map((c) => choisis.find((x) => x.code === c).id);
      entrees.push({ cle: groupe.code, libelle: groupe.libelle, ids });
    }
  });
  return entrees;
};
