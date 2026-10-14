// Point 10 (corrections finales client) : une compétence d'offre et une compétence de candidat
// doivent pointer vers le MÊME référentiel pour que le score soit comparable. Ce rapprochement
// côté interface reprend la règle du serveur : libellé ou synonyme exact (accents et casse
// ignorés), jamais approximatif. Le serveur refait toujours la normalisation à l'enregistrement.
import { jobsService } from "../Services/jobsService";

const cle = (texte) =>
  (texte || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Libellé canonique du référentiel correspondant à `texte` (libellé ou synonyme exact), ou null
 * si la compétence n'existe pas dans le référentiel.
 */
export const rapprocherDuReferentiel = async (texte) => {
  const recherche = cle(texte);
  if (!recherche) return null;
  try {
    const propositions = await jobsService.searchCompetences((texte || "").trim());
    for (const p of propositions || []) {
      if (cle(p.label) === recherche) return p.label;
      if ((p.synonymes || "").split(/[,;|]/).some((s) => cle(s) === recherche)) return p.label;
    }
  } catch {
    // Référentiel indisponible : la compétence reste saisie telle quelle, le serveur normalisera.
  }
  return null;
};
