import api from "../api/axiosConfig";

export const jobsService = {
  getAllJobs: async (search = "", wilaya = "") => {
    // On construit l'URL avec les paramètres
    const response = await api.get(`jobs/?search=${search}&wilaya=${wilaya}`);
    return response.data;
  },

  postuler: async (offreId) => {
    const response = await api.post(`jobs/${offreId}/postuler/`, {});
    return response.data;
  },

  // NOUVEAU : Fonction pour publier une offre
  creerOffre: async (offreData) => {
    const response = await api.post("jobs/creer/", offreData);
    return response.data;
  },

  getDashboard: async () => {
    const response = await api.get("jobs/dashboard/");
    return response.data;
  },
  // NOUVEAU : Mettre à jour le statut d'une candidature (sans try/catch inutile !)
  updateStatutCandidature: async (candidatureId, statut) => {
    const response = await api.patch(
      `jobs/candidatures/${candidatureId}/statut/`,
      { statut },
    );
    return response.data;
  },
};
