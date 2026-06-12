import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

export const recruteurService = {
  // Dashboard
  getDashboard: async () => {
    try {
      const response = await api.get("jobs/dashboard/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_DASHBOARD_API", err);
      throw err;
    }
  },

  // Offres
  creerOffre: async (data) => {
    try {
      const response = await api.post("jobs/creer/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_OFFRE_API", err);
      throw err;
    }
  },

  modifierOffre: async (offreId, data) => {
    try {
      const response = await api.patch(
        `jobs/dashboard/offres/${offreId}/modifier/`,
        data,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODIFIER_OFFRE_API", err);
      throw err;
    }
  },

  cloturerOffre: async (offreId) => {
    try {
      const response = await api.patch(
        `jobs/dashboard/offres/${offreId}/cloturer/`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_cloturer-offre_API", err);
      throw err;
    }
  },

  // Candidatures
  updateStatutCandidature: async (candidatureId, payload) => {
    try {
      const response = await api.patch(
        `jobs/candidatures/${candidatureId}/statut/`,
        payload,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_STATUT_CANDIDATURE_API", err);
      throw err;
    }
  },

  deleteCandidature: async (candidatureId) => {
    try {
      const response = await api.delete(
        `jobs/candidatures/${candidatureId}/supprimer/`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_CANDIDATURE_API", err);
      throw err;
    }
  },

  evaluerCandidature: async (candidatureId, data) => {
    try {
      const response = await api.patch(
        `/jobs/candidatures/${candidatureId}/evaluer/`,
        data,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_EVALUER_CANDIDATURE_API", err);
      throw err;
    }
  },

  telechargerBulletin: async (candidatureId) => {
    try {
      const response = await api.get(
        `/jobs/candidatures/${candidatureId}/bulletin/`,
        { responseType: "blob" },
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_TELECHARGER_BULLETIN_API", err);
      throw err;
    }
  },

  // Profil entreprise
  updateProfilEntreprise: async (data) => {
    try {
      const hasFile = data.logo instanceof File;
      let payload = data;
      let config = {};
      if (hasFile) {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
          if (data[key] !== null && data[key] !== undefined)
            formData.append(key, data[key]);
        });
        payload = formData;
        config = { headers: { "Content-Type": "multipart/form-data" } };
      }
      const response = await api.put(
        "jobs/entreprise/update/",
        payload,
        config,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_PROFIL_ENTREPRISE_API", err);
      throw err;
    }
  },

  getEntreprisePublic: async (id) => {
    try {
      const response = await api.get(`jobs/entreprises/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ENTREPRISE_PUBLIC_API", err);
      throw err;
    }
  },

  // Paramètres recruteur
  getParametresRecruteur: async () => {
    try {
      const response = await api.get("jobs/parametres/recruteur/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_PARAMETRES_RECRUTEUR", err);
      throw err;
    }
  },

  updateParametresRecruteur: async (data) => {
    try {
      const response = await api.put("jobs/parametres/recruteur/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_PARAMETRES_RECRUTEUR", err);
      throw err;
    }
  },

  // CVthèque
  searchCVtheque: async (filters = {}, page = 1) => {
    const queryParams = new URLSearchParams({
      search: filters.search || "",
      wilaya: filters.wilaya || "",
      specialite: filters.specialite || "",
      diplome: filters.diplome || "",
      experience: filters.experience || "",
      avec_photo: filters.avec_photo ? "true" : "",
      avec_cv: filters.avec_cv ? "true" : "",
      inscrit_recent: filters.inscrit_recent ? "true" : "",
      favoris: filters.favoris ? "true" : "",
      tri: filters.tri || "recents",
      page: page,
    }).toString();
    try {
      const response = await api.get(`jobs/employeur/cvtheque/?${queryParams}`);
      return response.data;
    } catch (error) {
      reportError("ECHEC_SEARCH_CVTHEQUE_API", error);
      throw error.response?.data || error;
    }
  },

  toggleFavoriCV: async (candidatId) => {
    try {
      const response = await api.post(`jobs/cvtheque/favoris/${candidatId}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_TOGGLE_FAVORI_CV_API", err);
      throw err;
    }
  },

  // Candidatures spontanées
  getCandidaturesSpontanees: async () => {
    try {
      const response = await api.get("jobs/dashboard/candidatures-spontanees/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_CANDIDATURES_SPONTANEES", err);
      throw err;
    }
  },

  marquerSpontaneeCommentLue: async (id) => {
    try {
      const response = await api.patch(
        `jobs/dashboard/candidatures-spontanees/${id}/lire/`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MARK_SPONTANEE_LUE", err);
      throw err;
    }
  },

  supprimerCandidatureSpontanee: async (id) => {
    try {
      const response = await api.delete(
        `jobs/dashboard/candidatures-spontanees/${id}/supprimer/`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_SPONTANEE", err);
      throw err;
    }
  },

  envoyerCandidatureSpontanee: async (entrepriseId, formData) => {
    try {
      const response = await api.post(
        `jobs/entreprises/${entrepriseId}/candidature-spontanee/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_CANDIDATURE_SPONTANEE", err);
      throw err;
    }
  },

  // Questionnaires
  getQuestionnaires: async () => {
    try {
      const response = await api.get("jobs/questionnaires/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_QUESTIONNAIRES", err);
      throw err;
    }
  },

  createQuestionnaire: async (data) => {
    try {
      const response = await api.post("jobs/questionnaires/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_QUESTIONNAIRE", err);
      throw err;
    }
  },

  updateQuestionnaire: async (id, data) => {
    try {
      const response = await api.put(`jobs/questionnaires/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_QUESTIONNAIRE", err);
      throw err;
    }
  },

  deleteQuestionnaire: async (id) => {
    try {
      const response = await api.delete(`jobs/questionnaires/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_QUESTIONNAIRE", err);
      throw err;
    }
  },

  demanderPremium: async (moyen_paiement, nb_mois = 1) => {
    try {
      const response = await api.post("jobs/premium/demande/", { moyen_paiement, nb_mois });
      return response.data;
    } catch (err) {
      reportError("ECHEC_DEMANDE_PREMIUM", err);
      throw err;
    }
  },

  envoyerRecuPremium: async (moyen_paiement, nb_mois, message) => {
    try {
      const response = await api.post("jobs/premium/envoyer-recu/", { moyen_paiement, nb_mois, message });
      return response.data;
    } catch (err) {
      reportError("ECHEC_ENVOI_RECU_PREMIUM", err);
      throw err;
    }
  },

};
