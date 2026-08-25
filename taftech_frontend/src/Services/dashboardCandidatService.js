import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

// Nouveau tableau de bord candidat (session specs/important-features) — score de profil,
// compétences structurées, documents privés, rendez-vous, activité, alertes.
export const dashboardCandidatService = {
  getScoreProfil: async () => {
    try {
      const response = await api.get("jobs/score-profil/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_SCORE_PROFIL", err);
      throw err;
    }
  },

  getMetiersAccessibles: async (limit) => {
    try {
      const response = await api.get("jobs/metiers-accessibles/", { params: limit ? { limit } : {} });
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_METIERS_ACCESSIBLES", err);
      throw err;
    }
  },

  getConseilsPersonnalises: async () => {
    try {
      const response = await api.get("jobs/conseils-personnalises/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_CONSEILS_PERSONNALISES", err);
      throw err;
    }
  },

  getMesCompetencesDetail: async () => {
    try {
      const response = await api.get("jobs/mes-competences/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_MES_COMPETENCES", err);
      throw err;
    }
  },

  ajouterCompetence: async (label, niveau) => {
    try {
      const response = await api.post("jobs/mes-competences/", { label, niveau });
      return response.data;
    } catch (err) {
      reportError("ECHEC_AJOUTER_COMPETENCE", err);
      throw err;
    }
  },

  supprimerCompetence: async (id) => {
    try {
      const response = await api.delete("jobs/mes-competences/", { data: { id } });
      return response.data;
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_COMPETENCE", err);
      throw err;
    }
  },

  getTypesDocuments: async () => {
    try {
      const response = await api.get("jobs/types-documents/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_TYPES_DOCUMENTS", err);
      throw err;
    }
  },

  getMesDocuments: async () => {
    try {
      const response = await api.get("jobs/mes-documents/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_MES_DOCUMENTS", err);
      throw err;
    }
  },

  uploaderDocument: async (fichier, typeDocumentId, nomPersonnalise) => {
    try {
      const formData = new FormData();
      formData.append("fichier", fichier);
      if (typeDocumentId) formData.append("type_document", typeDocumentId);
      if (nomPersonnalise) formData.append("nom_personnalise", nomPersonnalise);
      const response = await api.post("jobs/mes-documents/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPLOAD_DOCUMENT", err);
      throw err;
    }
  },

  supprimerDocument: async (id) => {
    try {
      const response = await api.delete("jobs/mes-documents/", { data: { id } });
      return response.data;
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_DOCUMENT", err);
      throw err;
    }
  },

  getDisponibilitesRdv: async () => {
    try {
      const response = await api.get("jobs/rendez-vous/disponibilites/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_DISPONIBILITES_RDV", err);
      throw err;
    }
  },

  getMesRendezVous: async () => {
    try {
      const response = await api.get("jobs/rendez-vous/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_MES_RENDEZ_VOUS", err);
      throw err;
    }
  },

  reserverRendezVous: async (dateHeure, motif) => {
    try {
      const response = await api.post("jobs/rendez-vous/", { date_heure: dateHeure, motif });
      return response.data;
    } catch (err) {
      reportError("ECHEC_RESERVER_RENDEZ_VOUS", err);
      throw err;
    }
  },

  annulerRendezVous: async (id) => {
    try {
      const response = await api.post(`jobs/rendez-vous/${id}/annuler/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_ANNULER_RENDEZ_VOUS", err);
      throw err;
    }
  },

  getActiviteProfil: async () => {
    try {
      const response = await api.get("jobs/activite-profil/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ACTIVITE_PROFIL", err);
      throw err;
    }
  },

  marquerAlerteVue: async (id) => {
    try {
      const response = await api.post(`jobs/alertes/${id}/marquer-vue/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_MARQUER_ALERTE_VUE", err);
      throw err;
    }
  },

  // Admin — Rendez-vous
  getAdminConfigRdv: async () => {
    try {
      const response = await api.get("jobs/admin/rendez-vous/config/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_CONFIG_RDV", err);
      throw err;
    }
  },
  updateAdminConfigRdv: async (data) => {
    try {
      const response = await api.put("jobs/admin/rendez-vous/config/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_ADMIN_CONFIG_RDV", err);
      throw err;
    }
  },
  getAdminDisponibilites: async () => {
    try {
      const response = await api.get("jobs/admin/rendez-vous/disponibilites/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_DISPONIBILITES", err);
      throw err;
    }
  },
  creerAdminDisponibilite: async (data) => {
    try {
      const response = await api.post("jobs/admin/rendez-vous/disponibilites/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_ADMIN_DISPONIBILITE", err);
      throw err;
    }
  },
  modifierAdminDisponibilite: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/rendez-vous/disponibilites/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODIFIER_ADMIN_DISPONIBILITE", err);
      throw err;
    }
  },
  supprimerAdminDisponibilite: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/rendez-vous/disponibilites/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_ADMIN_DISPONIBILITE", err);
      throw err;
    }
  },
  getAdminJoursBloques: async () => {
    try {
      const response = await api.get("jobs/admin/rendez-vous/jours-bloques/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_JOURS_BLOQUES", err);
      throw err;
    }
  },
  creerAdminJourBloque: async (data) => {
    try {
      const response = await api.post("jobs/admin/rendez-vous/jours-bloques/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_ADMIN_JOUR_BLOQUE", err);
      throw err;
    }
  },
  supprimerAdminJourBloque: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/rendez-vous/jours-bloques/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_ADMIN_JOUR_BLOQUE", err);
      throw err;
    }
  },
  getAdminRendezVous: async (statut) => {
    try {
      const params = statut ? `?statut=${statut}` : "";
      const response = await api.get(`jobs/admin/rendez-vous/${params}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_RENDEZ_VOUS", err);
      throw err;
    }
  },
  modifierAdminRendezVous: async (id, data) => {
    try {
      const response = await api.patch(`jobs/admin/rendez-vous/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODIFIER_ADMIN_RENDEZ_VOUS", err);
      throw err;
    }
  },

  // Admin — Types de documents
  getAdminTypesDocuments: async () => {
    try {
      const response = await api.get("jobs/admin/types-documents/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_TYPES_DOCUMENTS", err);
      throw err;
    }
  },
  creerAdminTypeDocument: async (data) => {
    try {
      const response = await api.post("jobs/admin/types-documents/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_ADMIN_TYPE_DOCUMENT", err);
      throw err;
    }
  },
  modifierAdminTypeDocument: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/types-documents/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODIFIER_ADMIN_TYPE_DOCUMENT", err);
      throw err;
    }
  },
  supprimerAdminTypeDocument: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/types-documents/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_ADMIN_TYPE_DOCUMENT", err);
      throw err;
    }
  },

  // Recruteur — marquer candidature consultée
  marquerCandidatureConsultee: async (candidatureId) => {
    try {
      const response = await api.post(`jobs/candidatures/${candidatureId}/marquer-consultee/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_MARQUER_CANDIDATURE_CONSULTEE", err);
      // Non bloquant — ne jamais casser l'ouverture d'une candidature pour ça.
      return null;
    }
  },
};
