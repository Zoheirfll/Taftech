import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/";

export const authService = {
  // --------------------------------------------------------
  // 1. LOGIN : ON AJOUTE LE STOCKAGE DU RÔLE
  // --------------------------------------------------------
  login: async (email, password) => {
    // On envoie l'email dans le champ 'username' car c'est ce que Django attend
    const response = await axios.post(`${API_URL}token/`, {
      username: email,
      password: password,
    });

    if (response.data.access) {
      localStorage.setItem("accessToken", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);

      // On vérifie bien que le rôle arrive du backend
      if (response.data.role) {
        localStorage.setItem("userRole", response.data.role);
        console.log("Rôle stocké :", response.data.role); // Petit check dans la console
      }
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    // On redirige vers la home pour reset l'état de l'app
    window.location.href = "/";
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("accessToken");
  },

  // NOUVEAU : La fonction que ton App.js va appeler pour trier le menu
  getUserRole: () => {
    return localStorage.getItem("userRole");
  },

  // --------------------------------------------------------
  // 2. INSCRIPTION CANDIDAT
  // --------------------------------------------------------
  registerCandidat: async (candidatData) => {
    const response = await axios.post(
      `${API_URL}jobs/candidat/register/`,
      candidatData,
    );
    return response.data;
  },

  // --------------------------------------------------------
  // 3. GESTION DU PROFIL CANDIDAT
  // --------------------------------------------------------
  getProfilCandidat: async () => {
    const token = localStorage.getItem("accessToken");
    const response = await axios.get(`${API_URL}jobs/profil/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  updateProfilCandidat: async (formData) => {
    const token = localStorage.getItem("accessToken");
    const response = await axios.put(`${API_URL}jobs/profil/`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  // --------------------------------------------------------
  // 4. INSCRIPTION RECRUTEUR
  // --------------------------------------------------------
  registerRecruteur: async (recruteurData) => {
    const response = await axios.post(
      `${API_URL}accounts/register/recruteur/`,
      recruteurData,
    );
    return response.data;
  },
};
