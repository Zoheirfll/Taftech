// Constantes et petites fonctions pures de la CVthèque (options de filtres, statut d'activité).
import { tw } from "../../../theme";

export const OPTIONS_EXPERIENCE = [
  { value: "0.5", label: "6 mois et +" },
  { value: "1", label: "1 an et +" },
  { value: "2", label: "2 ans et +" },
  { value: "3", label: "3 ans et +" },
  { value: "5", label: "5 ans et +" },
  { value: "10", label: "10 ans et +" },
];

export const OPTIONS_TRI = [
  { value: "recents", label: "Plus récents" },
  { value: "nom_asc", label: "Nom (A-Z)" },
  { value: "experience_desc", label: "Plus expérimentés" },
];

// Vrai si l'inscription date de moins de 30 jours (badge "Nouveau").
export const isRecent = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const diff = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diff < 30;
};

// Libellé + couleurs du badge d'activité selon la dernière connexion.
export const getStatutActivite = (lastLogin) => {
  if (!lastLogin) return null;
  const date = new Date(lastLogin);
  const heures = (Date.now() - date.getTime()) / (1000 * 60 * 60);

  if (heures < 24) {
    return {
      label: "Actif aujourd'hui",
      color: `${tw.bgSuccessSoft} ${tw.textSuccess}`,
      dot: tw.dotEmerald500,
    };
  }
  if (heures < 24 * 7) {
    return {
      label: "Actif cette semaine",
      color: `${tw.bgBlueSoft} ${tw.textBlue}`,
      dot: tw.dotBlue500,
    };
  }
  if (heures < 24 * 30) {
    return {
      label: "Actif ce mois",
      color: `${tw.surfaceSubtle} ${tw.textMuted}`,
      dot: tw.dotSlate400,
    };
  }
  return null;
};
