import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

export const candidatService = {
  // Profil
  getProfilCandidat: async () => {
    try {
      const response = await api.get("jobs/profil/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_PROFIL_CANDIDAT_API", err);
      throw err;
    }
  },

  // Mes candidatures
  getMesCandidatures: async () => {
    try {
      const response = await api.get("jobs/mes-candidatures/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_MES_CANDIDATURES_API", err);
      throw err;
    }
  },

  // Offres sauvegardées
  getOffresSauvegardees: async () => {
    try {
      const response = await api.get("jobs/sauvegardes/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_SAUVEGARDES_API", err);
      throw err;
    }
  },

  ajouterSauvegarde: async (offreId) => {
    try {
      const response = await api.post("jobs/sauvegardes/", { offre: offreId });
      return response.data;
    } catch (err) {
      reportError("ECHEC_AJOUTER_SAUVEGARDE_API", err);
      throw err;
    }
  },

  supprimerSauvegarde: async (id) => {
    try {
      const response = await api.delete(`jobs/sauvegardes/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_SAUVEGARDE_API", err);
      throw err;
    }
  },

  // Alertes emploi
  getAlertes: async () => {
    try {
      const response = await api.get("jobs/alertes/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ALERTES_API", err);
      throw err;
    }
  },

  createAlerte: async (data) => {
    try {
      const response = await api.post("jobs/alertes/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_ALERTE_API", err);
      throw err;
    }
  },

  toggleAlerte: async (id, est_active) => {
    try {
      const response = await api.patch(`jobs/alertes/${id}/`, { est_active });
      return response.data;
    } catch (err) {
      reportError("ECHEC_TOGGLE_ALERTE_API", err);
      throw err;
    }
  },

  deleteAlerte: async (id) => {
    try {
      const response = await api.delete(`jobs/alertes/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_ALERTE_API", err);
      throw err;
    }
  },

  // Paramètres notifications
  getParametres: async () => {
    try {
      const response = await api.get("jobs/parametres/notifications/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_PARAMETRES_API", err);
      throw err;
    }
  },

  updateParametres: async (data) => {
    try {
      const response = await api.put("jobs/parametres/notifications/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_PARAMETRES_API", err);
      throw err;
    }
  },

  // Notifications inbox
  getNotifications: async () => {
    try {
      const response = await api.get("jobs/notifications/");
      return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
    } catch (err) {
      reportError("ECHEC_GET_NOTIFICATIONS_API", err);
      throw err;
    }
  },

  markNotificationAsRead: async (notifId) => {
    try {
      const response = await api.patch(`jobs/notifications/${notifId}/lire/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_MARK_NOTIF_READ_API", err);
      throw err;
    }
  },

  // Postuler
  postuler: async (offreId, candidatureData = {}) => {
    try {
      const response = await api.post(
        `jobs/${offreId}/postuler/`,
        candidatureData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_POSTULER_API", err);
      throw err;
    }
  },

  postulerRapide: async (offreId, candidatureData) => {
    try {
      const response = await api.post(
        `jobs/${offreId}/postuler-rapide/`,
        candidatureData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_POSTULER_RAPIDE_API", err);
      throw err;
    }
  },

  getOffresRecommandees: async () => {
    try {
      const response = await api.get("jobs/recommandations/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_RECOMMANDATIONS_API", err);
      throw err;
    }
  },
};
