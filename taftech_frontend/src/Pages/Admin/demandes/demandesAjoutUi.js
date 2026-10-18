// Vocabulaire unique des demandes d'ajout au référentiel (spécification du 16/10/2026) : mêmes statuts,
// mêmes libellés et mêmes motifs rapides pour les types de diplôme et les spécialités (puis les métiers
// et les compétences aux étapes suivantes).
import { tw } from "../../../theme";

export const STATUTS_DEMANDE = {
  A_EXAMINER: { libelle: "À examiner", classe: "bg-amber-50 text-amber-700" },
  ACCEPTEE: { libelle: "Acceptée", classe: `${tw.bgSuccessSoft} ${tw.textSuccess}` },
  RATTACHEE: { libelle: "Rattachée", classe: `${tw.bgSuccessSoft} ${tw.textSuccess}` },
  REFUSEE: { libelle: "Refusée", classe: tw.badgeErrorLight },
};

export const PASTILLES_DEMANDE = [
  { code: "", libelle: "Toutes", compteur: "TOUTES" },
  { code: "A_EXAMINER", libelle: "À examiner", compteur: "A_EXAMINER" },
  { code: "ACCEPTEE", libelle: "Acceptées", compteur: "ACCEPTEE" },
  { code: "RATTACHEE", libelle: "Rattachées", compteur: "RATTACHEE" },
  { code: "REFUSEE", libelle: "Refusées", compteur: "REFUSEE" },
];

export const ORIGINES_DEMANDE = { RECRUTEUR: "Recruteur", CANDIDAT: "Candidat" };

export const MOTIFS_RAPIDES = ["Existe déjà sous un autre nom", "Trop vague", "Hors périmètre"];

export const TYPES_DEMANDE = {
  DIPLOME: {
    singulier: "type de diplôme",
    vide: "Aucune demande de type de diplôme.",
    parentLabel: "Système du nouveau diplôme",
    cible: "type de diplôme existant",
  },
  COMPETENCE: {
    singulier: "compétence",
    vide: "Aucune demande de compétence.",
    parentLabel: "",
    cible: "compétence existante",
  },
  METIER: {
    singulier: "métier",
    vide: "Aucune demande de métier.",
    parentLabel: "Groupe du nouveau métier",
    cible: "métier existant",
  },
  SPECIALITE: {
    singulier: "spécialité",
    vide: "Aucune demande de spécialité.",
    parentLabel: "Domaine de la nouvelle spécialité",
    cible: "spécialité existante",
  },
};

export const MOTIF_MIN = 5;
export const MOTIF_MAX = 500;

export const formatDateDemande = (iso) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");
