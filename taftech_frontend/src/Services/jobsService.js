import api from "../api/axiosConfig";

export const jobsService = {
  // 1. Récupérer toutes les offres
  getAllJobs: async (filters = {}, page = 1) => {
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
  },

  // 1.1 Récupérer les listes déroulantes (Wilayas, Secteurs, etc.)
  getConstants: async () => {
    const response = await api.get("jobs/constants/");
    return response.data;
  },

  // 2. Récupérer une offre
  getJobById: async (id) => {
    const response = await api.get(`jobs/${id}/`);
    return response.data;
  },

  // 👇 NOUVEAU : Récupérer le profil public d'une entreprise 👇
  getEntreprisePublic: async (id) => {
    const response = await api.get(`jobs/entreprises/${id}/`);
    return response.data;
  },

  // 3. Postuler
  postuler: async (offreId, candidatureData = {}) => {
    const response = await api.post(
      `jobs/${offreId}/postuler/`,
      candidatureData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
  // Postulation Rapide (Sans compte)
  postulerRapide: async (offreId, candidatureData) => {
    const response = await api.post(
      `jobs/${offreId}/postuler-rapide/`,
      candidatureData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return response.data;
  },
  // 4. Publier une offre
  creerOffre: async (offreData) => {
    const response = await api.post("jobs/creer/", offreData);
    return response.data;
  },

  updateProfilEntreprise: async (dataModifiee) => {
    const response = await api.put("jobs/entreprise/update/", dataModifiee);
    return response.data;
  },

  // 5. Dashboard (Recruteur)
  getDashboard: async () => {
    const response = await api.get("jobs/dashboard/");
    return response.data;
  },

  // 6. Mettre à jour le statut
  // Met à jour la fonction existante !
  updateStatutCandidature: async (candidatureId, payload) => {
    const response = await api.patch(
      `jobs/candidatures/${candidatureId}/statut/`,
      payload, // On envoie l'objet entier (statut, date_entretien, message)
    );
    return response.data;
  },

  // Supprimer définitivement une candidature (Nettoyage)
  deleteCandidature: async (candidatureId) => {
    const response = await api.delete(
      `jobs/candidatures/${candidatureId}/supprimer/`,
    );
    return response.data;
  },

  // Clôturer une offre
  cloturerOffre: async (offreId) => {
    const response = await api.patch(
      `jobs/dashboard/offres/${offreId}/cloturer/`,
    );
    return response.data;
  },

  // 7. Consulter ses propres candidatures
  getMesCandidatures: async () => {
    const response = await api.get("jobs/mes-candidatures/");
    return response.data;
  },

  // 8. Profil candidat
  getProfilCandidat: async () => {
    const response = await api.get("jobs/profil/");
    return response.data;
  },

  // --- PARTIE ADMINISTRATEUR ---

  // 9. Récupérer toutes les offres pour l'Admin (AVEC PAGINATION)
  getAdminOffres: async (page = 1, search = "") => {
    const response = await api.get(
      `jobs/admin/offres/?page=${page}&search=${search}`,
    );
    return response.data;
  },

  // 10. Modérer une offre
  moderateOffre: async (offreId, dataModifiee) => {
    const response = await api.patch(
      `jobs/admin/offres/${offreId}/moderer/`,
      dataModifiee,
    );
    return response.data;
  },

  // 11. Récupérer toutes les entreprises (Admin)
  getAdminEntreprises: async (page = 1, search = "") => {
    const response = await api.get(
      `jobs/admin/entreprises/?page=${page}&search=${search}`,
    );
    return response.data;
  },

  // 12. Approuver ou suspendre une entreprise
  moderateEntreprise: async (entrepriseId, dataModifiee) => {
    const response = await api.patch(
      `jobs/admin/entreprises/${entrepriseId}/moderer/`,
      dataModifiee,
    );
    return response.data;
  },

  // 13. Récupérer les statistiques
  getAdminStats: async () => {
    const response = await api.get("jobs/admin/statistiques/");
    return response.data;
  },

  // 14. Récupérer les utilisateurs
  getAdminUsers: async (page = 1, search = "") => {
    const response = await api.get(
      `jobs/admin/utilisateurs/?page=${page}&search=${search}`,
    );
    return response.data;
  },

  // 15. Bloquer/Débloquer un utilisateur
  moderateUser: async (userId) => {
    const response = await api.patch(
      `jobs/admin/utilisateurs/${userId}/moderer/`,
      {},
    );
    return response.data;
  },
  // 8.5 Matching Inverse : Récupérer les recommandations pour le candidat
  getOffresRecommandees: async () => {
    const response = await api.get("jobs/recommandations/");
    return response.data;
  },
  // --- NOTIFICATIONS (INBOX) ---
  getNotifications: async () => {
    const response = await api.get("jobs/notifications/");
    return response.data;
  },

  markNotificationAsRead: async (notifId) => {
    const response = await api.patch(`jobs/notifications/${notifId}/lire/`);
    return response.data;
  },
  // --- ALERTES D'EMPLOI ---
  getAlertes: async () => {
    const response = await api.get("jobs/alertes/");
    return response.data;
  },
  createAlerte: async (data) => {
    const response = await api.post("jobs/alertes/", data);
    return response.data;
  },
  toggleAlerte: async (id, est_active) => {
    // Permet d'activer/désactiver une alerte avec le bouton on/off
    const response = await api.patch(`jobs/alertes/${id}/`, { est_active });
    return response.data;
  },
  deleteAlerte: async (id) => {
    const response = await api.delete(`jobs/alertes/${id}/`);
    return response.data;
  },
  getParametres: async () => {
    const response = await api.get("jobs/parametres/notifications/");
    return response.data;
  },

  updateParametres: async (data) => {
    const response = await api.put("jobs/parametres/notifications/", data);
    return response.data;
  },
  searchCVtheque: async (filters = {}, page = 1) => {
    // On prépare les paramètres de recherche pour l'URL
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
      // On renvoie l'erreur spécifique du backend (ex: "Accès refusé")
      throw error.response?.data || error;
    }
  },
};
