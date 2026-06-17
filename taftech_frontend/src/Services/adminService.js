import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

export const adminService = {
  // Offres
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

  moderateOffre: async (offreId, data) => {
    try {
      const response = await api.patch(
        `jobs/admin/offres/${offreId}/moderer/`,
        data,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODERATE_OFFRE_API", err);
      throw err;
    }
  },

  // Entreprises
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

  moderateEntreprise: async (entrepriseId, data) => {
    try {
      const response = await api.patch(
        `jobs/admin/entreprises/${entrepriseId}/moderer/`,
        data,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODERATE_ENTREPRISE_API", err);
      throw err;
    }
  },

  // Statistiques
  getAdminStats: async () => {
    try {
      const response = await api.get("jobs/admin/statistiques/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_STATS_API", err);
      throw err;
    }
  },

  // Utilisateurs
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

  // Candidatures
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

  // Exports
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

  // Broadcast
  broadcastEmail: async (data) => {
    try {
      const response = await api.post("jobs/admin/broadcast-email/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_BROADCAST_EMAIL_API", err);
      throw err;
    }
  },

  // Marché
  getAdminMarche: async () => {
    try {
      const response = await api.get("jobs/admin/marche/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_MARCHE", err);
      throw err;
    }
  },

  // Métiers
  getAdminMetiers: async (search = "", page = 1) => {
    try {
      const response = await api.get(
        `jobs/admin/metiers/?search=${search}&page=${page}`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_METIERS", err);
      throw err;
    }
  },

  createMetier: async (data) => {
    try {
      const response = await api.post("jobs/admin/metiers/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_METIER", err);
      throw err;
    }
  },

  updateMetier: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/metiers/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_METIER", err);
      throw err;
    }
  },

  deleteMetier: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/metiers/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_METIER", err);
      throw err;
    }
  },

  getDemandesPremium: async () => {
    try {
      const response = await api.get("jobs/admin/demandes-premium/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_DEMANDES_PREMIUM", err);
      throw err;
    }
  },

  activerPremium: async (demandeId, nb_mois = 1) => {
    try {
      const response = await api.patch(`jobs/admin/demandes-premium/${demandeId}/activer/`, { nb_mois });
      return response.data;
    } catch (err) {
      reportError("ECHEC_ACTIVER_PREMIUM", err);
      throw err;
    }
  },

  // Comptes admins
  getAdmins: async () => {
    try {
      const response = await api.get("jobs/admin/comptes-admins/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMINS", err);
      throw err;
    }
  },

  createAdmin: async (data) => {
    try {
      const response = await api.post("jobs/admin/comptes-admins/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_ADMIN", err);
      throw err;
    }
  },

  updateAdmin: async (id, data) => {
    try {
      const response = await api.patch(`jobs/admin/comptes-admins/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_ADMIN", err);
      throw err;
    }
  },

  deleteAdmin: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/comptes-admins/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_ADMIN", err);
      throw err;
    }
  },
};
