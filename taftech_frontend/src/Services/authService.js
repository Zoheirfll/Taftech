import api from "../api/axiosConfig"; // Ton instance axios avec withCredentials: true
import { reportError } from "../utils/errorReporter"; // ✅ Injection de la télémétrie

export const authService = {
  // --------------------------------------------------------
  // 1. LOGIN : Plus de stockage de token ici !
  // --------------------------------------------------------
  login: async (email, password) => {
    try {
      // L'URL exacte doit être accounts/login/ pour correspondre au backend
      const response = await api.post("accounts/login/", {
        username: email, // Le serializer attend 'username' (qui contient l'email)
        password: password,
      });

      if (response.data.role) {
        localStorage.setItem("userRole", response.data.role);
      }
      return response.data;
    } catch (err) {
      reportError("ECHEC_LOGIN_API", err);
      throw err; // On relance pour que le composant UI puisse catcher l'erreur
    }
  },

  // --------------------------------------------------------
  // 2. LOGOUT : On nettoie le rôle et on redirige
  // --------------------------------------------------------
  logout: async () => {
    try {
      await api.post("accounts/logout/");
    } catch (err) {
      // On ignore l'erreur réseau — on nettoie quand même côté client
    } finally {
      localStorage.removeItem("userRole");
      window.location.href = "/login";
    }
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
    try {
      const response = await api.post(
        "accounts/register/candidat/",
        candidatData,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_REGISTER_CANDIDAT_API", err);
      throw err;
    }
  },

  getProfilCandidat: async () => {
    try {
      const response = await api.get("jobs/profil/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_PROFIL_API", err);
      throw err;
    }
  },

  updateProfilCandidat: async (formData) => {
    try {
      const response = await api.put("jobs/profil/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_PROFIL_API", err);
      throw err;
    }
  },

  registerRecruteur: async (recruteurData) => {
    try {
      const response = await api.post(
        "accounts/register/recruteur/",
        recruteurData,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_REGISTER_RECRUTEUR_API", err);
      throw err;
    }
  },

  verifyEmail: async (email, code) => {
    try {
      const response = await api.post("accounts/verifier-email/", {
        email,
        code,
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_VERIFY_EMAIL_API", err);
      throw err;
    }
  },
  forgotPassword: async (email) => {
    try {
      const response = await api.post("accounts/forgot-password/", { email });
      return response.data;
    } catch (err) {
      reportError("ECHEC_FORGOT_PASSWORD", err);
      throw err;
    }
  },

  resetPassword: async (email, code, nouveau_mdp) => {
    try {
      const response = await api.post("accounts/reset-password/", {
        email,
        code,
        nouveau_mdp,
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_RESET_PASSWORD", err);
      throw err;
    }
  },
};
