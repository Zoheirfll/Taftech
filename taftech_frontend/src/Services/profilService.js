import api from "../api/axiosConfig";

export const profilService = {
  getProfil: async () => {
    const response = await api.get("jobs/profil/");
    return response.data;
  },

  updateProfil: async (formData) => {
    const response = await api.put("jobs/profil/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // --- NOUVELLES FONCTIONS POUR LES CARTES ---

  // EXPÉRIENCES
  addExperience: async (data) => {
    const response = await api.post("jobs/profil/experiences/", data);
    return response.data;
  },
  deleteExperience: async (id) => {
    await api.delete(`jobs/profil/experiences/${id}/`);
  },

  // FORMATIONS
  addFormation: async (data) => {
    const response = await api.post("jobs/profil/formations/", data);
    return response.data;
  },
  deleteFormation: async (id) => {
    await api.delete(`jobs/profil/formations/${id}/`);
  },
};
