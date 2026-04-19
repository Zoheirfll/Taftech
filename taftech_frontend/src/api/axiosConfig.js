import axios from "axios";

const API_URL = "http://localhost:8000/api/";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // 👈 INDISPENSABLE : Envoie les cookies avec chaque requête
  headers: {
    "Content-Type": "application/json",
  },
});

// L'intercepteur de requête devient très simple (plus besoin d'injecter le Bearer)
api.interceptors.request.use((config) => {
  return config;
});

// L'intercepteur de réponse pour le refresh automatique
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si 401, on tente de rafraîchir via le cookie de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Si ton baseURL est déjà "http://127.0.0.1:8000/api/",
        // alors ici on ne met QUE "token/refresh/"
        await axios.post(
          `${API_URL}token/refresh/`, // Vérifie que API_URL finit par /api/
          {},
          { withCredentials: true },
        );
        return api(originalRequest);
      } catch (refreshError) {
        // Si même le refresh échoue, on déconnecte
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
