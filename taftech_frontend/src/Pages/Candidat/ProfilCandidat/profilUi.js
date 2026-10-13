// Constantes d'interface de la page Profil candidat : classes Tailwind partagées, niveaux de compétence
// et catégories de la checklist de complétion.
import { tw } from "../../../theme";

export const INPUT_CLASS = `w-full px-4 py-3 rounded-xl text-base ${tw.inputColorsMuted}`;
export const MODAL_CLASS = `${tw.modalOverlay} p-4`;
export const MODAL_INNER_CLASS = `${tw.surface} rounded-2xl p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh]`;
export const BTN_PRIMARY = `flex-1 py-3 ${tw.textOnDark} ${tw.bgPrimarySolidHover} text-base font-bold rounded-xl transition-colors`;
export const BTN_CANCEL = `flex-1 py-3 text-base font-semibold rounded-xl transition-colors ${tw.buttonCancelSoft}`;
export const SECTION_CLASS = `${tw.card} rounded-2xl p-6`;
export const SIDEBAR_SECTION_CLASS = `${tw.card} rounded-2xl p-5`;
export const SECTION_TITLE = `text-lg font-bold ${tw.textStrong}`;
export const SIDEBAR_TITLE = `text-sm font-bold uppercase tracking-wide ${tw.textStrong}`;
export const EDIT_BTN = `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${tw.editButtonOutline}`;
export const ICON_ACTION_BTN = `p-2 rounded-lg transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center`;

export const NIVEAUX_COMPETENCE = [
  { value: "DEBUTANT", label: "Débutant" },
  { value: "INTERMEDIAIRE", label: "Intermédiaire" },
  { value: "AVANCE", label: "Avancé" },
  { value: "CONFIRME", label: "Confirmé" },
];

// Catégories cliquables de la checklist de complétion — chaque ligne indique
// son propre % et propose une action directe ("Ajouter..." si vide,
// "Compléter" si partiellement rempli), au lieu d'un simple % global figé.
export const PROFILE_CATEGORIES = [
  {
    key: "infos",
    label: "Informations personnelles",
    action: "info",
    test: (p) => [!!p.telephone, !!p.photo_profil, !!p.titre_professionnel, !!(p.wilaya && p.commune), !!(p.diplome_ref_libelle || p.niveau_scolaire_ref_libelle || p.diplome), !!p.metier],
    actionLabelZero: "Compléter",
  },
  {
    key: "cv",
    label: "CV",
    action: "cv-form",
    test: (p) => [!!p.cv_pdf],
    actionLabelZero: "Importer mon CV",
  },
  {
    key: "experience",
    label: "Expériences",
    action: "experiences",
    test: (p) => [p.experiences_detail?.length > 0],
    actionLabelZero: "Ajouter une expérience",
  },
  {
    key: "formation",
    label: "Formations",
    action: "formations",
    test: (p) => [p.formations_detail?.length > 0],
    actionLabelZero: "Ajouter une formation",
  },
  {
    key: "competences",
    label: "Compétences",
    action: "competences",
    test: (p) => [(p.competences_detail?.length > 0) || (p.competences?.split(",").filter((t) => t.trim()).length > 0)],
    actionLabelZero: "Ajouter une compétence",
  },
  {
    key: "langues",
    label: "Langues",
    action: "langues",
    test: (p) => [p.langues?.split(",").filter((t) => t.trim()).length > 0],
    actionLabelZero: "Ajouter une langue",
  },
];
