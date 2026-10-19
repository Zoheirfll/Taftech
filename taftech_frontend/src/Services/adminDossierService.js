import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

export const adminDossierService = {
  // Dossier complet d'un candidat pour la fiche admin : niveaux de compétences et de langues,
  // candidatures, activité, usage de l'IA. Lecture seule, réservé aux administrateurs.
  getDossierCandidat: async (userId) => {
    try {
      const response = await api.get(`jobs/admin/utilisateurs/${userId}/dossier/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_DOSSIER_CANDIDAT_ADMIN", err);
      throw err;
    }
  },
};
