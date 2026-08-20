import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

// ─── Imports des sous-services ───────────────────────────────
import { candidatService } from "./candidatService";
import { recruteurService } from "./recruteurService";
import { adminService } from "./adminService";
import { iaService } from "./iaService";

let _nomenclatureCache = null;
let _premiumPlansCache = null;
let _premiumAvantagesCache = null;
const _faqCacheParCategorie = {};

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

  // Paliers d'abonnement Premium — éditables par l'admin, quasi-statiques comme la nomenclature.
  getPremiumPlans: async () => {
    if (!_premiumPlansCache) {
      _premiumPlansCache = api
        .get("jobs/premium/plans/")
        .then((response) => response.data)
        .catch((err) => {
          _premiumPlansCache = null;
          reportError("ECHEC_GET_PREMIUM_PLANS_API", err);
          throw err;
        });
    }
    return _premiumPlansCache;
  },

  getPremiumAvantages: async () => {
    if (!_premiumAvantagesCache) {
      _premiumAvantagesCache = api
        .get("jobs/premium/avantages/")
        .then((response) => response.data)
        .catch((err) => {
          _premiumAvantagesCache = null;
          reportError("ECHEC_GET_PREMIUM_AVANTAGES_API", err);
          throw err;
        });
    }
    return _premiumAvantagesCache;
  },

  // FAQ actives d'une catégorie ("GENERAL"/"RECRUTEUR"/"PREMIUM") — quasi-statique, cache par catégorie.
  getFaq: async (categorie) => {
    if (!_faqCacheParCategorie[categorie]) {
      _faqCacheParCategorie[categorie] = api
        .get(`jobs/faq/?categorie=${categorie}`)
        .then((response) => response.data)
        .catch((err) => {
          delete _faqCacheParCategorie[categorie];
          reportError("ECHEC_GET_FAQ_API", err);
          throw err;
        });
    }
    return _faqCacheParCategorie[categorie];
  },

  // Suggestions de compétences (autocomplete) — pas de cache, dépend de la recherche tapée.
  searchCompetences: async (search) => {
    try {
      const response = await api.get(`jobs/competences/?search=${encodeURIComponent(search)}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_SEARCH_COMPETENCES_API", err);
      return [];
    }
  },

  // Blog public
  getArticles: async (page = 1, categorie = "") => {
    try {
      const params = new URLSearchParams({ page });
      if (categorie) params.set("categorie", categorie);
      const response = await api.get(`jobs/articles/?${params.toString()}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ARTICLES_API", err);
      throw err;
    }
  },

  getArticleBySlug: async (slug) => {
    try {
      const response = await api.get(`jobs/articles/${slug}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ARTICLE_API", err);
      throw err;
    }
  },

  getArticleCategories: async () => {
    try {
      const response = await api.get("jobs/articles/categories/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ARTICLE_CATEGORIES_API", err);
      return [];
    }
  },

  // Bannières
  getSiteAnnonce: async () => {
    try {
      const response = await api.get("jobs/site-annonce/");
      return response.status === 204 ? null : response.data;
    } catch (err) {
      reportError("ECHEC_GET_SITE_ANNONCE_API", err);
      return null;
    }
  },

  getBannieresAccueil: async () => {
    try {
      const response = await api.get("jobs/bannieres-accueil/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_BANNIERES_ACCUEIL_API", err);
      return [];
    }
  },

  // Pages statiques
  getPageStatique: async (slug) => {
    try {
      const response = await api.get(`jobs/pages/${slug}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_PAGE_STATIQUE_API", err);
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
