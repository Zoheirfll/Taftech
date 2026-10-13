// Constantes partagées par les composants du détail d'une candidature (critères du radar, libellés et styles de statut).
import { tw } from "../../../../theme";

export const CRITERES_RADAR = [
  { key: "specialite", label: "Spécialité", max: 25 },
  { key: "diplome", label: "Diplôme", max: 20 },
  { key: "experience", label: "Expérience", max: 20 },
  { key: "competences", label: "Compétences", max: 15 },
  { key: "region", label: "Localisation & mobilité", max: 20 },
];

export const STATUTS_LABELS = {
  RECUE: "Candidature reçue",
  EN_COURS: "En cours d'étude",
  PRESELECTION: "Présélectionné",
  ENTRETIEN: "Entretien programmé",
  RETENU: "Candidat retenu",
  REFUSE: "Candidat refusé",
};

export const STATUTS_STYLES = tw.candidatureStatutStyles;
