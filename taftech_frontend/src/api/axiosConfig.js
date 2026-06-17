import axios from "axios";
import { reportError } from "../utils/errorReporter";

// Si VITE_API_URL est défini dans .env → axios appelle directement ce serveur
// Si VITE_API_URL est vide → axios utilise une URL relative (/api/)
// et le proxy Vite (vite.config.js) redirige vers localhost:8000
// C'est le mode utilisé avec ngrok : un seul tunnel sur le port 5173 suffit
const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/`
  : "/api/";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => config);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. SIGNALEMENT : Panne réseau ou serveur éteint
    if (!error.response) {
      reportError("PANNE_RESEAU_OU_SERVEUR_OFFLINE", error);
      return Promise.reject(error);
    }

    // 2. SIGNALEMENT : Erreur critique serveur (500+)
    if (error.response.status >= 500) {
      reportError(
        `ERREUR_SERVEUR_${error.response.status}_URL_${originalRequest.url}`,
        error,
      );
    }

    // 3. LOGIQUE DE SÉCURITÉ : Gestion du 401 (Expired Token)
    if (error.response.status === 401 && !originalRequest._retry) {
      // 👇 LA CORRECTION EST ICI 👇
      // Si l'erreur 401 vient du login (mauvais mot de passe), on ne rafraîchit rien.
      // On laisse l'erreur remonter au composant React pour afficher le Toast.
      if (originalRequest.url.includes("accounts/login/")) {
        return Promise.reject(error);
      }
      // 👆 FIN DE LA CORRECTION 👆

      // Si c'est déjà le rafraîchissement qui échoue, on arrête tout
      const role = localStorage.getItem("userRole");
      const estMembre = localStorage.getItem("estMembreEquipe") === "true";
      const loginRedirect = (role === "RECRUTEUR" || estMembre) ? "/recruteurs/connexion" : "/login";

      if (originalRequest.url.includes("token/refresh/")) {
        localStorage.removeItem("userRole");
        localStorage.removeItem("estMembreEquipe");
        window.location.href = loginRedirect;
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        await axios.post(
          `${API_URL}token/refresh/`,
          {},
          { withCredentials: true },
        );
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("userRole");
        localStorage.removeItem("estMembreEquipe");
        window.location.href = loginRedirect;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
