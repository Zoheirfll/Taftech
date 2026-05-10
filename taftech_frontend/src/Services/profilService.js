import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter"; // ✅ Injection de la télémétrie

export const profilService = {
  getProfil: async () => {
    try {
      const response = await api.get("jobs/profil/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_PROFIL_API", err);
      throw err;
    }
  },

  updateProfil: async (formData) => {
    try {
      const response = await api.put("jobs/profil/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_PROFIL_API", err);
      throw err;
    }
  },

  // --- NOUVELLES FONCTIONS POUR LES CARTES ---

  // EXPÉRIENCES
  addExperience: async (data) => {
    try {
      const response = await api.post("jobs/profil/experiences/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_ADD_EXPERIENCE_API", err);
      throw err;
    }
  },

  deleteExperience: async (id) => {
    try {
      await api.delete(`jobs/profil/experiences/${id}/`);
    } catch (err) {
      reportError("ECHEC_DELETE_EXPERIENCE_API", err);
      throw err;
    }
  },

  // FORMATIONS
  addFormation: async (data) => {
    try {
      const response = await api.post("jobs/profil/formations/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_ADD_FORMATION_API", err);
      throw err;
    }
  },

  deleteFormation: async (id) => {
    try {
      await api.delete(`jobs/profil/formations/${id}/`);
    } catch (err) {
      reportError("ECHEC_DELETE_FORMATION_API", err);
      throw err;
    }
  },
};
