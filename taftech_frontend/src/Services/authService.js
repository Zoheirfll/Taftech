import api from "../api/axiosConfig";

export const authService = {
  // Fonction pour se connecter et récupérer le token
  login: async (username, password) => {
    try {
      const response = await api.post("token/", { username, password });

      // Si le serveur dit "OK", il nous donne deux clés qu'on stocke dans le navigateur
      localStorage.setItem("access_token", response.data.access);
      localStorage.setItem("refresh_token", response.data.refresh);

      return response.data;
    } catch (error) {
      console.error("Erreur d'authentification", error);
      throw error;
    }
  },

  // Fonction pour se déconnecter (on jette les clés)
  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  // Fonction rapide pour savoir si l'utilisateur est connecté
  isAuthenticated: () => {
    return !!localStorage.getItem("access_token"); // Renvoie True si le token existe
  },
};
