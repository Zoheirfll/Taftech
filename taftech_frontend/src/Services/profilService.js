import api from "../api/axiosConfig";

export const profilService = {
  // Récupère les infos du candidat connecté
  getProfil: async () => {
    const response = await api.get("jobs/profil/");
    return response.data;
  },

  // Met à jour le profil (Attention : formData est un objet spécial pour les fichiers)
  updateProfil: async (formData) => {
    // AJOUT : On force le Content-Type pour que Django comprenne qu'il y a un fichier
    const response = await api.put("jobs/profil/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
