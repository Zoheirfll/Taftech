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

  // 2. Récupérer une offre
  getJobById: async (id) => {
    const response = await api.get(`jobs/${id}/`);
    return response.data;
  },

  // 3. Postuler
  postuler: async (offreId, candidatureData = {}) => {
    // Plus besoin d'ajouter le header, api.js s'en occupe !
    const response = await api.post(
      `jobs/${offreId}/postuler/`,
      candidatureData,
    );
    return response.data;
  },

  // 4. Publier une offre
  creerOffre: async (offreData) => {
    const response = await api.post("jobs/creer/", offreData);
    return response.data;
  },

  // 5. Dashboard (Recruteur)
  getDashboard: async () => {
    const response = await api.get("jobs/dashboard/");
    return response.data;
  },

  // 6. Mettre à jour le statut
  updateStatutCandidature: async (candidatureId, nouveauStatut) => {
    const response = await api.patch(
      `jobs/candidatures/${candidatureId}/statut/`,
      { statut: nouveauStatut },
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
  getAdminOffres: async (page = 1) => {
    const response = await api.get(`jobs/admin/offres/?page=${page}`);
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
  getAdminEntreprises: async () => {
    const response = await api.get("jobs/admin/entreprises/");
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
  getAdminUsers: async () => {
    const response = await api.get("jobs/admin/utilisateurs/");
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
};
