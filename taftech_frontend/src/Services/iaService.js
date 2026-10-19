import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

export const iaService = {
  genererOffreIA: async (payload) => {
    try {
      // 60s : le backend retente une fois en cas d'échec Groq (JSON invalide), le délai doit
      // couvrir 2 appels séquentiels au modèle IA, pas un seul.
      const response = await api.post("jobs/ia/generer-offre/", payload, { timeout: 60000 });
      return response.data;
    } catch (err) {
      reportError("ECHEC_GENERER_OFFRE_IA", err);
      throw err;
    }
  },

  // Parser CV — sans fichier (cvFile omis/null), le backend réutilise le CV déjà
  // stocké sur le profil du candidat.
  parserCV: async (cvFile) => {
    try {
      const formData = new FormData();
      if (cvFile) formData.append("cv", cvFile);
      const response = await api.post("jobs/parser-cv/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 90000,
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_PARSER_CV_API", err);
      throw err;
    }
  },

  // Aperçu exact du texte qui sera transmis à l'IA (ne consomme aucun quota, n'appelle pas l'IA).
  // `fichier` : CV choisi mais pas encore analysé ; omis, le backend lit le CV du profil.
  getApercuDonneesIA: async (fonction, fichier = null) => {
    try {
      const formData = new FormData();
      formData.append("fonction", fonction);
      if (fichier) formData.append("cv", fichier);
      const response = await api.post("jobs/ia/apercu-donnees/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_APERCU_DONNEES_IA", err);
      throw err;
    }
  },

  // Corrections faites par le candidat sur les champs pré-remplis (améliore le parser, voir
  // jobs/views/qualite_ia.py). Best-effort : ne doit jamais bloquer l'enregistrement du profil.
  envoyerCorrectionsParsing: async (parsingId, corrections) => {
    try {
      await api.post(`jobs/parsing/${parsingId}/corrections/`, { corrections });
    } catch (err) {
      reportError("ECHEC_ENVOI_CORRECTIONS_PARSING", err);
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

  // Quota IA courant pour une fonctionnalité (jour/mois restants) — lecture seule, ne
  // consomme rien, sert à afficher "il vous reste X/Y" avant le premier clic.
  getQuotaIA: async (fonction) => {
    try {
      const response = await api.get(`jobs/ia/quota/${fonction}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_QUOTA_IA", err);
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

};
