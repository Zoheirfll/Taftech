import api from "../api/axiosConfig"; // Ton instance axios avec withCredentials: true
import { reportError } from "../utils/errorReporter"; // ✅ Injection de la télémétrie

export const authService = {
  // --------------------------------------------------------
  // 1. LOGIN : Plus de stockage de token ici !
  // --------------------------------------------------------
  login: async (email, password, portal = null) => {
    try {
      const payload = { username: email, password };
      if (portal) payload.portal = portal;
      const response = await api.post("accounts/login/", payload);

      if (response.data.role) {
        localStorage.setItem("userRole", response.data.role);
      }
      localStorage.setItem("estMembreEquipe", response.data.est_membre_equipe ? "true" : "false");
      return response.data;
    } catch (err) {
      reportError("ECHEC_LOGIN_API", err);
      throw err; // On relance pour que le composant UI puisse catcher l'erreur
    }
  },

  // --------------------------------------------------------
  // 2. LOGOUT : On nettoie le rôle et on redirige
  // --------------------------------------------------------
  logout: async (redirectTo = null) => {
    try {
      await api.post("accounts/logout/");
    } catch (err) {
      reportError("ECHEC_LOGOUT_API", err);
    } finally {
      const role = localStorage.getItem("userRole");
      const estMembre = localStorage.getItem("estMembreEquipe") === "true";
      localStorage.removeItem("userRole");
      localStorage.removeItem("estMembreEquipe");
      localStorage.removeItem("membreRole");
      const dest = redirectTo || (role === "RECRUTEUR" || estMembre ? "/recruteurs/connexion" : "/login");
      window.location.href = dest;
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

  getEstMembreEquipe: () => {
    return localStorage.getItem("estMembreEquipe") === "true";
  },

  isRecruteurOuMembre: () => {
    const role = localStorage.getItem("userRole");
    const estMembre = localStorage.getItem("estMembreEquipe") === "true";
    return role === "RECRUTEUR" || estMembre;
  },

  // Rôle dans l'équipe : PROPRIETAIRE | ADMIN | UTILISATEUR | INVITE
  getMembreRole: () => localStorage.getItem("membreRole") || null,
  setMembreRole: (role) => {
    if (role) localStorage.setItem("membreRole", role);
    else localStorage.removeItem("membreRole");
  },

  // Vérifie si le membre a au moins le niveau de rôle requis
  // Ordre de priorité : PROPRIETAIRE > ADMIN > UTILISATEUR > INVITE
  peutFaire: (actionRole) => {
    // RECRUTEUR (propriétaire) et ADMIN ont tous les droits
    if (localStorage.getItem("userRole") === "RECRUTEUR") return true;
    const monRole = localStorage.getItem("membreRole") || "INVITE";
    if (monRole === "ADMIN") return true;
    const ORDRE = ["INVITE", "UTILISATEUR", "ADMIN", "PROPRIETAIRE"];
    return ORDRE.indexOf(monRole) >= ORDRE.indexOf(actionRole);
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
  renvoyerCodeVerification: async (email) => {
    try {
      const response = await api.post("accounts/renvoyer-code/", { email });
      return response.data;
    } catch (err) {
      reportError("ECHEC_RENVOYER_CODE_VERIFICATION", err);
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

  googleLogin: async (credential, role = "CANDIDAT", mode = "register") => {
    try {
      const response = await api.post("accounts/social/google/", { credential, role, mode });
      if (response.data.role) {
        localStorage.setItem("userRole", response.data.role);
      }
      localStorage.setItem("estMembreEquipe", response.data.est_membre_equipe ? "true" : "false");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GOOGLE_LOGIN", err);
      throw err;
    }
  },

  accepterConsentement: async () => {
    try {
      const response = await api.patch("accounts/consentement/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_CONSENTEMENT", err);
      throw err;
    }
  },
};
