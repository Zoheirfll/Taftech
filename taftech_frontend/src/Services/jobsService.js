import api from "../api/axiosConfig";

// Note : On utilise 'api' partout car ton axiosConfig gère déjà l'URL de base
export const jobsService = {
  // 1. Récupérer toutes les offres (Candidat/Visiteur)
  getAllJobs: async (search = "", wilaya = "", page = 1) => {
    const response = await api.get(
      `jobs/?search=${search}&wilaya=${wilaya}&page=${page}`,
    );
    return response.data;
  },

  // 2. Récupérer une offre par son ID
  getJobById: async (id) => {
    const response = await api.get(`jobs/${id}/`);
    return response.data;
  },

  // 3. Postuler (Candidat)
  postuler: async (offreId) => {
    const token = localStorage.getItem("accessToken");
    const response = await api.post(
      `jobs/${offreId}/postuler/`,
      {},
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
    // On utilise 'api' qui normalement injecte déjà le token si ton axiosConfig est bien fait
    // Sinon, on peut forcer le header ici
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
}; // UNE SEULE ACCOLADE ICI POUR FERMER L'OBJET
