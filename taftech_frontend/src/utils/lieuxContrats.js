// Lieux de travail et types de contrat d'une offre : le PRINCIPAL (`wilaya` + `commune`, `type_contrat`) puis les
// SUPPLÉMENTAIRES (`lieux_supplementaires`, `types_contrat_supplementaires`) — « Oran | Mostaganem », « CDD ou Stage / PFE ».
// Une seule logique pour toutes les pages (détail, carte, liste de l'entreprise, JobPosting, formulaire) : jamais de
// copie locale. Miroir côté serveur : `jobs/offres_multiples.py`.

// Plafonds identiques au serveur (`jobs/offres_multiples.py`) : le formulaire ne propose jamais plus que ce qu'il accepte.
export const MAX_LIEUX_SUPPLEMENTAIRES = 5;
export const MAX_CONTRATS_SUPPLEMENTAIRES = 3;

// Mêmes libellés que `jobs/constants.py::TYPES_CONTRAT` (+ anciens codes encore présents en base).
export const CONTRAT_LABELS = {
  CDI: "CDI",
  CDD: "CDD",
  MISSION: "Mission",
  ANEM: "Contrat ANEM (CTA / DAIP)",
  STAGE: "Stage / PFE",
  FREELANCE: "Freelance",
  TEMPS_PARTIEL: "Temps partiel",
  INTERIM: "Intérim",
  ALTERNANCE: "Alternance",
};

export const nomWilaya = (wilaya) => (wilaya ? wilaya.split(" - ")[1] || wilaya : "");

const cle = (lieu) => `${(lieu.wilaya || "").trim().toLowerCase()}|${(lieu.commune || "").trim().toLowerCase()}`;

/** Lieux de l'offre, principal d'abord, sans doublon : [{ wilaya, commune }]. */
export const lieuxDeLOffre = (offre) => {
  const supplementaires = Array.isArray(offre?.lieux_supplementaires) ? offre.lieux_supplementaires : [];
  const vus = new Set();
  return [{ wilaya: offre?.wilaya, commune: offre?.commune }, ...supplementaires]
    .filter((lieu) => lieu && lieu.wilaya)
    .map((lieu) => ({ wilaya: lieu.wilaya, commune: lieu.commune || "" }))
    .filter((lieu) => {
      const k = cle(lieu);
      if (vus.has(k)) return false;
      vus.add(k);
      return true;
    });
};

/** « Oran, Es Sénia » (wilaya, puis commune si elle est connue). */
export const lieuTexte = (lieu) => `${nomWilaya(lieu.wilaya)}${lieu.commune ? `, ${lieu.commune}` : ""}`;

/** « Oran | Mostaganem » : tous les lieux de l'offre. */
export const lieuxTexte = (offre) => lieuxDeLOffre(offre).map(lieuTexte).join(" | ");

/** Types de contrat, principal d'abord, sans doublon ni valeur vide. */
export const typesContratDeLOffre = (offre) => {
  const supplementaires = Array.isArray(offre?.types_contrat_supplementaires) ? offre.types_contrat_supplementaires : [];
  return [...new Set([offre?.type_contrat, ...supplementaires].filter(Boolean))];
};

/** « CDD ou Stage / PFE » : tous les types de contrat de l'offre. */
export const contratsTexte = (offre) =>
  typesContratDeLOffre(offre).map((code) => CONTRAT_LABELS[code] || code).join(" ou ");
