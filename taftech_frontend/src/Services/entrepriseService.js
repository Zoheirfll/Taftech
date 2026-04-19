import api from "../api/axiosConfig";

export const entrepriseService = {
  creerEntreprise: async (entrepriseData) => {
    // L'instance 'api' envoie automatiquement les cookies HttpOnly.
    // Plus besoin de chercher de token ni de configurer les headers !
    const response = await api.post("jobs/entreprise/creer/", entrepriseData);
    return response.data;
  },
};
