import axios from "axios";

const API_URL = "http://localhost:8000/api/";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // 👈 INDISPENSABLE : Envoie les cookies avec chaque requête
  headers: {
    "Content-Type": "application/json",
  },
});

// L'intercepteur de requête devient très simple
api.interceptors.request.use((config) => {
  return config;
});

// L'intercepteur de réponse pour le refresh automatique
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si on n'a pas de réponse du serveur (erreur réseau)
    if (!error.response) return Promise.reject(error);

    // CAS 1 : Si la requête de refresh échoue (cookie mort)
    if (
      error.response.status === 401 &&
      originalRequest.url.includes("token/refresh/")
    ) {
      localStorage.removeItem("userRole"); // 👈 ON VIDE LE STORAGE
      window.location.href = "/login"; // ET ENSUITE ON REDIRIGE
      return Promise.reject(error);
    }

    // CAS 2 : Si 401 sur une requête normale, on tente de rafraîchir
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(
          `${API_URL}token/refresh/`,
          {},
          { withCredentials: true },
        );
        return api(originalRequest);
      } catch (refreshError) {
        // Si le refresh échoue ici aussi, on déconnecte PROPREMENT
        localStorage.removeItem("userRole"); // 👈 ON VIDE LE STORAGE
        window.location.href = "/login"; // ET ENSUITE ON REDIRIGE
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
