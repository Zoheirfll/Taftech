// Expérience demandée par une offre, écrite comme une phrase (« Expérience confirmée (environ 3 ans) dans un poste
// similaire »). On n'écrit que ce que le score utilise : le niveau de l'offre, ses années (`experience_annees`, fournies
// par l'API depuis la table du score, `matcher.py`) — « environ », car ce n'est pas un seuil éliminatoire — et « dans un
// poste similaire » parce que seules les expériences pertinentes comptent. Jamais de fourchette ni de secteur inventés.

// `experience` : le libellé commence par « Expérience » et se complète de « dans un poste similaire ».
const NIVEAUX = {
  DEBUTANT: { libelle: "Débutant accepté" },
  STAGIAIRE: { libelle: "Stage ou étudiant" },
  JEUNE_DIPLOME: { libelle: "Jeune diplômé" },
  CONFIRME: { libelle: "Expérience confirmée", experience: true },
  MANAGER: { libelle: "Expérience de manager / responsable de département", experience: true },
  RESPONSABLE_EQUIPE: { libelle: "Expérience de responsable d'équipe", experience: true },
  CADRE_DIRIGEANT: { libelle: "Expérience de cadre dirigeant", experience: true },
};

export const phraseExperience = (niveau, annees) => {
  const entree = NIVEAUX[niveau];
  if (!entree) return "";
  if (!annees || annees <= 0) return entree.libelle;
  const duree = `environ ${annees} an${annees > 1 ? "s" : ""}`;
  return entree.experience
    ? `${entree.libelle} (${duree}) dans un poste similaire`
    : `${entree.libelle} (${duree} d'expérience)`;
};
