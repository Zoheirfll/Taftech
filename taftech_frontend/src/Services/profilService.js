import axios from "axios";

// Ajuste le port si ton backend tourne sur un autre port que 8000
const API_URL = "http://127.0.0.1:8000/api/";

export const profilService = {
  // 1. Récupérer le profil
  getProfil: async () => {
    // On récupère le badge (token) du candidat connecté
    const token = localStorage.getItem("accessToken");

    const response = await axios.get(`${API_URL}jobs/profil/`, {
      // On montre le badge à Django dans les headers
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  // 2. Mettre à jour le profil (avec le CV)
  updateProfil: async (formData) => {
    const token = localStorage.getItem("accessToken");

    const response = await axios.put(`${API_URL}jobs/profil/`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data", // OBLIGATOIRE pour envoyer le fichier PDF
      },
    });
    return response.data;
  },
};
