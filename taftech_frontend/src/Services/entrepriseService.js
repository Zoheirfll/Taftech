import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter"; // ✅ Injection de la télémétrie

export const entrepriseService = {
  creerEntreprise: async (entrepriseData) => {
    try {
      // L'instance 'api' envoie automatiquement les cookies HttpOnly.
      // Plus besoin de chercher de token ni de configurer les headers !
      const response = await api.post("jobs/entreprise/creer/", entrepriseData);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATION_ENTREPRISE_API", err); // ✅ Télémétrie
      throw err; // On relance l'erreur pour le composant
    }
  },
};
