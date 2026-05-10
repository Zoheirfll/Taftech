import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter"; // ✅ Injection de la télémétrie

export const jobsService = {
  // 1. Récupérer toutes les offres
  getAllJobs: async (filters = {}, page = 1) => {
    try {
      const queryParams = new URLSearchParams({
        search: filters.search || "",
        wilaya: filters.wilaya || "",
        commune: filters.commune || "",
        diplome: filters.diplome || "",
        specialite: filters.specialite || "",
        experience: filters.experience || "",
        contrat: filters.contrat || "",
        page: page,
      }).toString();

      const response = await api.get(`jobs/?${queryParams}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ALL_JOBS_API", err);
      throw err;
    }
  },

  // 1.1 Récupérer les listes déroulantes
  getConstants: async () => {
    try {
      const response = await api.get("jobs/constants/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_CONSTANTS_API", err);
      throw err;
    }
  },

  // 2. Récupérer une offre
  getJobById: async (id) => {
    try {
      const response = await api.get(`jobs/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_JOB_BY_ID_API", err);
      throw err;
    }
  },

  // Récupérer le profil public d'une entreprise
  getEntreprisePublic: async (id) => {
    try {
      const response = await api.get(`jobs/entreprises/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ENTREPRISE_PUBLIC_API", err);
      throw err;
    }
  },

  // 3. Postuler
  postuler: async (offreId, candidatureData = {}) => {
    try {
      const response = await api.post(
        `jobs/${offreId}/postuler/`,
        candidatureData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_POSTULER_API", err);
      throw err;
    }
  },

  // Postulation Rapide
  postulerRapide: async (offreId, candidatureData) => {
    try {
      const response = await api.post(
        `jobs/${offreId}/postuler-rapide/`,
        candidatureData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_POSTULER_RAPIDE_API", err);
      throw err;
    }
  },

  // 4. Publier une offre
  creerOffre: async (offreData) => {
    try {
      const response = await api.post("jobs/creer/", offreData);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_OFFRE_API", err);
      throw err;
    }
  },

  updateProfilEntreprise: async (dataModifiee) => {
    try {
      const response = await api.put("jobs/entreprise/update/", dataModifiee);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_PROFIL_ENTREPRISE_API", err);
      throw err;
    }
  },

  // 5. Dashboard (Recruteur)
  getDashboard: async () => {
    try {
      const response = await api.get("jobs/dashboard/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_DASHBOARD_API", err);
      throw err;
    }
  },

  // 6. Mettre à jour le statut
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

  // Supprimer définitivement une candidature
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

  // Clôturer une offre
  cloturerOffre: async (offreId) => {
    try {
      const response = await api.patch(
        `jobs/dashboard/offres/${offreId}/cloturer/`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_CLOTURER_OFFRE_API", err);
      throw err;
    }
  },

  // 7. Consulter ses propres candidatures
  getMesCandidatures: async () => {
    try {
      const response = await api.get("jobs/mes-candidatures/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_MES_CANDIDATURES_API", err);
      throw err;
    }
  },

  // 8. Profil candidat
  getProfilCandidat: async () => {
    try {
      const response = await api.get("jobs/profil/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_PROFIL_CANDIDAT_API", err);
      throw err;
    }
  },

  // --- PARTIE ADMINISTRATEUR ---

  // 9. Récupérer toutes les offres pour l'Admin
  getAdminOffres: async (page = 1, search = "") => {
    try {
      const response = await api.get(
        `jobs/admin/offres/?page=${page}&search=${search}`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_OFFRES_API", err);
      throw err;
    }
  },

  // 10. Modérer une offre
  moderateOffre: async (offreId, dataModifiee) => {
    try {
      const response = await api.patch(
        `jobs/admin/offres/${offreId}/moderer/`,
        dataModifiee,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODERATE_OFFRE_API", err);
      throw err;
    }
  },

  // 11. Récupérer toutes les entreprises (Admin)
  getAdminEntreprises: async (page = 1, search = "") => {
    try {
      const response = await api.get(
        `jobs/admin/entreprises/?page=${page}&search=${search}`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_ENTREPRISES_API", err);
      throw err;
    }
  },

  // 12. Approuver ou suspendre une entreprise
  moderateEntreprise: async (entrepriseId, dataModifiee) => {
    try {
      const response = await api.patch(
        `jobs/admin/entreprises/${entrepriseId}/moderer/`,
        dataModifiee,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODERATE_ENTREPRISE_API", err);
      throw err;
    }
  },

  // 13. Récupérer les statistiques
  getAdminStats: async () => {
    try {
      const response = await api.get("jobs/admin/statistiques/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_STATS_API", err);
      throw err;
    }
  },

  // 14. Récupérer les utilisateurs
  getAdminUsers: async (page = 1, search = "") => {
    try {
      const response = await api.get(
        `jobs/admin/utilisateurs/?page=${page}&search=${search}`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_USERS_API", err);
      throw err;
    }
  },

  // 15. Bloquer/Débloquer un utilisateur
  moderateUser: async (userId) => {
    try {
      const response = await api.patch(
        `jobs/admin/utilisateurs/${userId}/moderer/`,
        {},
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODERATE_USER_API", err);
      throw err;
    }
  },

  // 8.5 Matching Inverse
  getOffresRecommandees: async () => {
    try {
      const response = await api.get("jobs/recommandations/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_RECOMMANDATIONS_API", err);
      throw err;
    }
  },

  // --- NOTIFICATIONS (INBOX) ---
  getNotifications: async () => {
    try {
      const response = await api.get("jobs/notifications/");
      return response.data;
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

  // --- ALERTES D'EMPLOI ---
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

  searchCVtheque: async (filters = {}, page = 1) => {
    const queryParams = new URLSearchParams({
      search: filters.search || "",
      wilaya: filters.wilaya || "",
      specialite: filters.specialite || "",
      diplome: filters.diplome || "",
      experience: filters.experience || "",
      page: page,
    }).toString();

    try {
      const response = await api.get(`jobs/employeur/cvtheque/?${queryParams}`);
      return response.data;
    } catch (error) {
      reportError("ECHEC_SEARCH_CVTHEQUE_API", error); // ✅ Télémétrie ajoutée
      throw error.response?.data || error;
    }
  },

  // Évaluer un candidat
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

  // Admin : Candidatures
  getAdminCandidatures: async (page = 1, search = "") => {
    try {
      const response = await api.get(
        `/jobs/admin/candidatures/?page=${page}&search=${search}`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_CANDIDATURES_API", err);
      throw err;
    }
  },

  // EXPORTS
  exportCandidatures: async () => {
    try {
      const response = await api.get("/jobs/admin/export/candidatures/", {
        responseType: "blob",
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_EXPORT_CANDIDATURES_API", err);
      throw err;
    }
  },

  exportEntreprises: async () => {
    try {
      const response = await api.get("/jobs/admin/export/entreprises/", {
        responseType: "blob",
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_EXPORT_ENTREPRISES_API", err);
      throw err;
    }
  },

  exportOffres: async () => {
    try {
      const response = await api.get("/jobs/admin/export/offres/", {
        responseType: "blob",
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_EXPORT_OFFRES_API", err);
      throw err;
    }
  },

  exportUtilisateurs: async () => {
    try {
      const response = await api.get("/jobs/admin/export/utilisateurs/", {
        responseType: "blob",
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_EXPORT_UTILISATEURS_API", err);
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
};
