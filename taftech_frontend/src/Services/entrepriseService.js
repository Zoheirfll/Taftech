import api from "../api/axiosConfig";

export const entrepriseService = {
  // Envoie les données du formulaire au backend Django sans try/catch inutile
  creerProfil: async (entrepriseData) => {
    const response = await api.post("jobs/entreprise/creer/", entrepriseData);
    return response.data;
  },
};
