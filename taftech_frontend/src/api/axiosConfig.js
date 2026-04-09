import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: {
    "Content-Type": "application/json",
  },
});

// L'INTERCEPTEUR : On intercepte la requête juste avant qu'elle parte
api.interceptors.request.use(
  (config) => {
    // On cherche le token dans le navigateur
    const token = localStorage.getItem("access_token");
    if (token) {
      // Si on le trouve, on l'accroche dans l'en-tête (Header) de la requête
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

export default api;
