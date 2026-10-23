// Compétences demandées par une offre, écrites comme des phrases lues par le candidat :
// « Compétences indispensables : Conception d'API (confirmé) et Gestion de versions Git (intermédiaire). »
// On n'écrit que ce que le score utilise : obligatoire (poids double) / souhaitée, et le niveau requis (un niveau
// inférieur donne un crédit partiel, jamais un rejet). Aucun plafond : une compétence indispensable n'est jamais
// cachée au candidat.
import { joindre } from "./listeFrancaise";

const NIVEAUX = { DEBUTANT: "débutant", INTERMEDIAIRE: "intermédiaire", AVANCE: "avancé", CONFIRME: "confirmé" };

const avecNiveau = (c) => (NIVEAUX[c.niveau_requis] ? `${c.label} (${NIVEAUX[c.niveau_requis]})` : c.label);

/** Phrases (0 à 2) : indispensables, puis souhaitées. */
export const phrasesCompetences = (competences = []) => {
  const liste = competences || [];
  const parType = (type) => liste.filter((c) => c.type_exigence === type).map(avecNiveau);
  const indispensables = parType("OBLIGATOIRE");
  const souhaitees = parType("SOUHAITEE");
  return [
    indispensables.length ? `Compétences indispensables : ${joindre(indispensables, "et")}.` : "",
    souhaitees.length ? `Compétences souhaitées : ${joindre(souhaitees, "et")}.` : "",
  ].filter(Boolean);
};
