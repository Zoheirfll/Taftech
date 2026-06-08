import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

// ─── Imports des sous-services ───────────────────────────────
import { candidatService } from "./candidatService";
import { recruteurService } from "./recruteurService";
import { adminService } from "./adminService";
import { iaService } from "./iaService";

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
