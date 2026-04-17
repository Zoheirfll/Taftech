import api from "../api/axiosConfig";

// Note : On utilise 'api' partout car ton axiosConfig gère déjà l'URL de base
export const jobsService = {
  // 1. Récupérer toutes les offres (Candidat/Visiteur) - MISE À JOUR POUR US 2.1
  getAllJobs: async (filters = {}, page = 1) => {
    // On emballe proprement tous les filtres pour Django
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

  // 2. Récupérer une offre par son ID
  getJobById: async (id) => {
    const response = await api.get(`jobs/${id}/`);
    return response.data;
  },

  // 3. Postuler (Candidat)
  postuler: async (offreId, candidatureData = {}) => {
    const token = localStorage.getItem("accessToken");
    const response = await api.post(
      `jobs/${offreId}/postuler/`,
      candidatureData, // On envoie les données ici au lieu de {}
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },

  // 4. Publier une offre (Recruteur)
  creerOffre: async (offreData) => {
    const token = localStorage.getItem("accessToken");
    const response = await api.post("jobs/creer/", offreData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // 5. Dashboard (Recruteur)
  getDashboard: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await api.get("jobs/dashboard/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // 6. Mettre à jour le statut (Recruteur)
  updateStatutCandidature: async (candidatureId, nouveauStatut) => {
    const token = localStorage.getItem("accessToken");
    const response = await api.patch(
      `jobs/candidatures/${candidatureId}/statut/`,
      { statut: nouveauStatut },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },

  // 7. Consulter ses propres candidatures (Candidat)
  getMesCandidatures: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await api.get("jobs/mes-candidatures/", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
  getProfilCandidat: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await api.get("jobs/profil/", {
      // Assure-toi que c'est la bonne URL de ton API
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  // --- PARTIE ADMINISTRATEUR ---

  // ... tes autres fonctions au-dessus (getJobById, postuler, etc.) ...

  // 9. Récupérer toutes les offres pour l'Admin
  getAdminOffres: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await api.get("jobs/admin/offres/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }, // <-- VIRGULE TRÈS IMPORTANTE ICI

  // 10. Modérer une offre
  moderateOffre: async (offreId, dataModifiee) => {
    const token = localStorage.getItem("accessToken");
    const response = await api.patch(
      `jobs/admin/offres/${offreId}/moderer/`,
      dataModifiee,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  }, // <-- VIRGULE TRÈS IMPORTANTE ICI

  // 11. Récupérer toutes les entreprises (Admin)
  getAdminEntreprises: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await api.get("jobs/admin/entreprises/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }, // <-- VIRGULE TRÈS IMPORTANTE ICI

  // 12. Approuver ou suspendre une entreprise (Admin)
  moderateEntreprise: async (entrepriseId, dataModifiee) => {
    const token = localStorage.getItem("accessToken");
    const response = await api.patch(
      `jobs/admin/entreprises/${entrepriseId}/moderer/`,
      dataModifiee,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  }, // <-- Pas besoin de virgule sur le tout dernier
  // 13. Récupérer les statistiques
  getAdminStats: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await api.get("jobs/admin/statistiques/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // 14. Récupérer les utilisateurs
  getAdminUsers: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await api.get("jobs/admin/utilisateurs/", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  // 15. Bloquer/Débloquer un utilisateur
  moderateUser: async (userId) => {
    const token = localStorage.getItem("accessToken");
    const response = await api.patch(
      `jobs/admin/utilisateurs/${userId}/moderer/`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
  },
};
