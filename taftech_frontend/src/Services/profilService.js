// Importe ton instance Axios configurée (qui contient withCredentials: true et l'URL localhost)
// Assure-toi que le chemin "../api/axiosConfig" correspond bien à ton dossier !
import api from "../api/axiosConfig";

export const profilService = {
  // 1. Récupérer le profil
  getProfil: async () => {
    // La magie des cookies : plus besoin de gérer le token manuellement.
    // L'instance 'api' envoie le cookie automatiquement au serveur !
    const response = await api.get("jobs/profil/");
    return response.data;
  },

  // 2. Mettre à jour le profil (avec le CV)
  updateProfil: async (formData) => {
    const response = await api.put("jobs/profil/", formData, {
      headers: {
        "Content-Type": "multipart/form-data", // Toujours OBLIGATOIRE pour envoyer le fichier PDF ou l'image
      },
    });
    return response.data;
  },
};
