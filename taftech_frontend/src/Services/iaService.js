import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

export const iaService = {
  genererOffreIA: async (payload) => {
    try {
      const response = await api.post("jobs/ia/generer-offre/", payload, { timeout: 30000 });
      return response.data;
    } catch (err) {
      reportError("ECHEC_GENERER_OFFRE_IA", err);
      throw err;
    }
  },

  // Parser CV
  parserCV: async (cvFile) => {
    try {
      const formData = new FormData();
      formData.append("cv", cvFile);
      const response = await api.post("jobs/parser-cv/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_PARSER_CV_API", err);
      throw err;
    }
  },

  // Suggestions carrière
  getSuggestionsCarriere: async () => {
    try {
      const response = await api.get("jobs/suggestions-carriere/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_SUGGESTIONS_CARRIERE", err);
      throw err;
    }
  },

  // Analyse carrière Groq (candidat)
  getAnalyseCarriere: async () => {
    try {
      const response = await api.get("jobs/analyse-carriere/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ANALYSE_CARRIERE", err);
      throw err;
    }
  },

  // Analyse Groq recruteur
  getAnalyseGroqRecruteur: async (candidatureId) => {
    try {
      const response = await api.post(
        `jobs/candidatures/${candidatureId}/analyse-groq/`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_ANALYSE_GROQ_RECRUTEUR", err);
      throw err;
    }
  },

  // Offres recommandées (matching inverse)
  getOffresRecommandees: async () => {
    try {
      const response = await api.get("jobs/recommandations/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_RECOMMANDATIONS_API", err);
      throw err;
    }
  },

  // Métiers référentiel
  getMetiers: async (search = "", secteur = "") => {
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (secteur) params.append("secteur", secteur);
      const response = await api.get(`jobs/metiers/?${params.toString()}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_METIERS", err);
      throw err;
    }
  },
};
