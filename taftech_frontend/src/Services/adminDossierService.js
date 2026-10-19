import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

// Dossiers détaillés des fiches de la page Utilisateurs de l'admin. Lecture seule, réservés aux
// administrateurs, chargés à l'ouverture de la fiche (jamais pour toute la liste).
const lireDossier = (chemin, codeErreur) => async (userId) => {
  try {
    const response = await api.get(`jobs/admin/utilisateurs/${userId}/${chemin}/`);
    return response.data;
  } catch (err) {
    reportError(codeErreur, err);
    throw err;
  }
};

export const adminDossierService = {
  // Candidat : niveaux de compétences et de langues, candidatures, activité, usage de l'IA.
  getDossierCandidat: lireDossier("dossier", "ECHEC_GET_DOSSIER_CANDIDAT_ADMIN"),
  // Recruteur : entreprise, abonnement et crédits, offres, candidatures reçues, équipe, CVthèque, IA.
  getDossierRecruteur: lireDossier("dossier-recruteur", "ECHEC_GET_DOSSIER_RECRUTEUR_ADMIN"),
  // Administrateur : type de compte, connexion, actions tracées dans le journal d'audit.
  getDossierAdmin: lireDossier("dossier-admin", "ECHEC_GET_DOSSIER_ADMIN_ADMIN"),
};
