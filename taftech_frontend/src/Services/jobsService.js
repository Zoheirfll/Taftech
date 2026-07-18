import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

// ─── Imports des sous-services ───────────────────────────────
import { candidatService } from "./candidatService";
import { recruteurService } from "./recruteurService";
import { adminService } from "./adminService";
import { iaService } from "./iaService";

let _nomenclatureCache = null;

// ─── Offres publiques (reste ici car utilisé partout) ────────
const offresPubliquesService = {
  getAllJobs: async (filters = {}, page = 1) => {
    try {
      const queryParams = new URLSearchParams({
        search: filters.search || "",
        wilaya: filters.wilaya || "",
        commune: filters.commune || "",
        diplome: filters.diplome || "",
        specialite: filters.specialite || "",
        experience: filters.experience || "",
        contrat: filters.contrat || "",
        page: page,
      }).toString();
      const response = await api.get(`jobs/?${queryParams}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ALL_JOBS_API", err);
      throw err;
    }
  },

  getJobById: async (id) => {
    try {
      const response = await api.get(`jobs/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_JOB_BY_ID_API", err);
      throw err;
    }
  },

  getConstants: async () => {
    try {
      const response = await api.get("jobs/constants/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_CONSTANTS_API", err);
      throw err;
    }
  },

  // Arbre Secteur > Domaine > Sous-domaine (nomenclature ANEM), quasi-statique —
  // gardé en mémoire pour toute la session, filtré côté client en cascade.
  getNomenclature: async () => {
    if (!_nomenclatureCache) {
      _nomenclatureCache = api
        .get("jobs/nomenclature/")
        .then((response) => response.data)
        .catch((err) => {
          _nomenclatureCache = null;
          reportError("ECHEC_GET_NOMENCLATURE_API", err);
          throw err;
        });
    }
    return _nomenclatureCache;
  },

  getStatsGeo: async () => {
    try {
      const response = await api.get("jobs/stats/geo/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_STATS_GEO", err);
      return { wilayas: {}, secteurs: {} };
    }
  },
};

// ─── FAÇADE — zéro changement dans les pages ─────────────────
export const jobsService = {
  // Offres publiques
  ...offresPubliquesService,

  // Candidat
  ...candidatService,

  // Recruteur
  ...recruteurService,

  // Admin
  ...adminService,

  // IA
  ...iaService,
};
