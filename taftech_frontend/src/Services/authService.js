import api from "../api/axiosConfig"; // Ton instance axios avec withCredentials: true

export const authService = {
  // --------------------------------------------------------
  // 1. LOGIN : Plus de stockage de token ici !
  // --------------------------------------------------------
  // src/Services/authService.js
  login: async (email, password) => {
    // L'URL exacte doit être accounts/login/ pour correspondre au backend
    const response = await api.post("accounts/login/", {
      username: email, // Le serializer attend 'username' (qui contient l'email)
      password: password,
    });

    if (response.data.role) {
      localStorage.setItem("userRole", response.data.role);
    }
    return response.data;
  },

  // --------------------------------------------------------
  // 2. LOGOUT : On nettoie le rôle et on redirige
  // --------------------------------------------------------
  logout: () => {
    localStorage.removeItem("userRole");
    // Optionnel : appeler une route backend api/accounts/logout/
    // pour supprimer les cookies côté serveur.
    window.location.href = "/login";
  },

  // --------------------------------------------------------
  // 3. VÉRIFICATION : On se base sur la présence du rôle ou un appel /me
  // --------------------------------------------------------
  isAuthenticated: () => {
    return !!localStorage.getItem("userRole");
  },

  getUserRole: () => {
    return localStorage.getItem("userRole");
  },

  // --------------------------------------------------------
  // 4. AUTRES SERVICES : Ils utilisent tous 'api' sans headers manuels
  // --------------------------------------------------------
  registerCandidat: async (candidatData) => {
    const response = await api.post("jobs/candidat/register/", candidatData);
    return response.data;
  },

  getProfilCandidat: async () => {
    const response = await api.get("jobs/profil/");
    return response.data;
  },

  updateProfilCandidat: async (formData) => {
    const response = await api.put("jobs/profil/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  registerRecruteur: async (recruteurData) => {
    const response = await api.post(
      "accounts/register/recruteur/",
      recruteurData,
    );
    return response.data;
  },
};
