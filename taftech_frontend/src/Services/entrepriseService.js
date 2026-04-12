import api from "../api/axiosConfig";

export const entrepriseService = {
  creerEntreprise: async (entrepriseData) => {
    // 1. On récupère le badge de sécurité
    const token = localStorage.getItem("accessToken");

    // 2. On l'envoie dans les headers avec la requête POST
    const response = await api.post("jobs/entreprise/creer/", entrepriseData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
