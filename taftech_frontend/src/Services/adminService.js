import api from "../api/axiosConfig";
import { reportError } from "../utils/errorReporter";

// Taille de page des tableaux admin paginés (offres/entreprises/utilisateurs/candidatures) —
// 5 lignes par défaut côté API était trop peu pour de la modération. Les composants
// calculent leur nombre de pages avec cette même constante.
export const ADMIN_PAGE_SIZE = 20;

// Toute saisie libre passée en query string doit être encodée (un "&" ou "#" tapé dans une
// recherche cassait sinon la requête).
const q = (v) => encodeURIComponent(v ?? "");

export const adminService = {
  // Offres
  getAdminOffres: async (page = 1, search = "", statut = "", ordering = "") => {
    try {
      const response = await api.get(
        `jobs/admin/offres/?page=${page}&page_size=${ADMIN_PAGE_SIZE}&search=${q(search)}&statut=${q(statut)}&ordering=${q(ordering)}`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_OFFRES_API", err);
      throw err;
    }
  },

  moderateOffre: async (offreId, data) => {
    try {
      const response = await api.patch(
        `jobs/admin/offres/${offreId}/moderer/`,
        data,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODERATE_OFFRE_API", err);
      throw err;
    }
  },

  // Entreprises
  getAdminEntreprises: async (page = 1, search = "", ordering = "") => {
    try {
      const response = await api.get(
        `jobs/admin/entreprises/?page=${page}&page_size=${ADMIN_PAGE_SIZE}&search=${q(search)}&ordering=${q(ordering)}`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_ENTREPRISES_API", err);
      throw err;
    }
  },

  moderateEntreprise: async (entrepriseId, data) => {
    try {
      const response = await api.patch(
        `jobs/admin/entreprises/${entrepriseId}/moderer/`,
        data,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODERATE_ENTREPRISE_API", err);
      throw err;
    }
  },

  // Statistiques
  getAdminStats: async () => {
    try {
      const response = await api.get("jobs/admin/statistiques/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_STATS_API", err);
      throw err;
    }
  },

  getAdminSeoStats: async () => {
    try {
      const response = await api.get("jobs/admin/seo/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_SEO_STATS_API", err);
      throw err;
    }
  },

  // Utilisateurs
  getAdminUsers: async (page = 1, search = "", role = "", ordering = "") => {
    try {
      const response = await api.get(
        `jobs/admin/utilisateurs/?page=${page}&page_size=${ADMIN_PAGE_SIZE}&search=${q(search)}&role=${q(role)}&ordering=${q(ordering)}`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_USERS_API", err);
      throw err;
    }
  },

  moderateUser: async (userId) => {
    try {
      const response = await api.patch(
        `jobs/admin/utilisateurs/${userId}/moderer/`,
        {},
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_MODERATE_USER_API", err);
      throw err;
    }
  },

  // Candidatures
  getAdminCandidatures: async (page = 1, search = "", statut = "", ordering = "") => {
    try {
      const response = await api.get(
        `/jobs/admin/candidatures/?page=${page}&page_size=${ADMIN_PAGE_SIZE}&search=${q(search)}&statut=${q(statut)}&ordering=${q(ordering)}`,
      );
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_CANDIDATURES_API", err);
      throw err;
    }
  },

  // Exports
  exportCandidatures: async () => {
    try {
      const response = await api.get("/jobs/admin/export/candidatures/", {
        responseType: "blob",
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_EXPORT_CANDIDATURES_API", err);
      throw err;
    }
  },

  exportEntreprises: async () => {
    try {
      const response = await api.get("/jobs/admin/export/entreprises/", {
        responseType: "blob",
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_EXPORT_ENTREPRISES_API", err);
      throw err;
    }
  },

  exportOffres: async () => {
    try {
      const response = await api.get("/jobs/admin/export/offres/", {
        responseType: "blob",
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_EXPORT_OFFRES_API", err);
      throw err;
    }
  },

  exportUtilisateurs: async () => {
    try {
      const response = await api.get("/jobs/admin/export/utilisateurs/", {
        responseType: "blob",
      });
      return response.data;
    } catch (err) {
      reportError("ECHEC_EXPORT_UTILISATEURS_API", err);
      throw err;
    }
  },

  // Broadcast
  broadcastEmail: async (data) => {
    try {
      const response = await api.post("jobs/admin/broadcast-email/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_BROADCAST_EMAIL_API", err);
      throw err;
    }
  },

  // Marché
  getAdminMarche: async () => {
    try {
      const response = await api.get("jobs/admin/marche/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_MARCHE", err);
      throw err;
    }
  },


  // Référentiel v2 (métiers/spécialités/diplômes importés) — pas de create/delete,
  // uniquement libellé + selectionnable/actif (voir jobs/views/referentiel_admin.py).
  getAdminReferentielMetiers: async (search = "", page = 1) => {
    try {
      const response = await api.get(`jobs/admin/referentiel-v2/metiers/?search=${q(search)}&page=${page}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_REFERENTIEL_METIERS", err);
      throw err;
    }
  },
  updateAdminReferentielMetier: async (id, data) => {
    try {
      const response = await api.patch(`jobs/admin/referentiel-v2/metiers/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_ADMIN_REFERENTIEL_METIER", err);
      throw err;
    }
  },
  getAdminReferentielSpecialites: async (search = "", page = 1) => {
    try {
      const response = await api.get(`jobs/admin/referentiel-v2/specialites/?search=${q(search)}&page=${page}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_REFERENTIEL_SPECIALITES", err);
      throw err;
    }
  },
  updateAdminReferentielSpecialite: async (id, data) => {
    try {
      const response = await api.patch(`jobs/admin/referentiel-v2/specialites/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_ADMIN_REFERENTIEL_SPECIALITE", err);
      throw err;
    }
  },
  getAdminReferentielDiplomes: async (search = "", page = 1) => {
    try {
      const response = await api.get(`jobs/admin/referentiel-v2/diplomes/?search=${q(search)}&page=${page}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_REFERENTIEL_DIPLOMES", err);
      throw err;
    }
  },
  updateAdminReferentielDiplome: async (id, data) => {
    try {
      const response = await api.patch(`jobs/admin/referentiel-v2/diplomes/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_ADMIN_REFERENTIEL_DIPLOME", err);
      throw err;
    }
  },
  getAdminRelationsSimilaires: async (search = "", page = 1) => {
    try {
      const response = await api.get(`jobs/admin/referentiel-v2/relations-similaires/?search=${q(search)}&page=${page}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_RELATIONS_SIMILAIRES", err);
      throw err;
    }
  },
  creerRelationSimilaire: async (data) => {
    try {
      const response = await api.post(`jobs/admin/referentiel-v2/relations-similaires/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_RELATION_SIMILAIRE", err);
      throw err;
    }
  },
  supprimerRelationSimilaire: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/referentiel-v2/relations-similaires/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_RELATION_SIMILAIRE", err);
      throw err;
    }
  },
  getAdminRelationsSpecialites: async (search = "", page = 1) => {
    try {
      const response = await api.get(`jobs/admin/referentiel-v2/relations-specialites/?search=${q(search)}&page=${page}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_RELATIONS_SPECIALITES", err);
      throw err;
    }
  },
  creerRelationSpecialite: async (data) => {
    try {
      const response = await api.post(`jobs/admin/referentiel-v2/relations-specialites/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_RELATION_SPECIALITE", err);
      throw err;
    }
  },
  supprimerRelationSpecialite: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/referentiel-v2/relations-specialites/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_RELATION_SPECIALITE", err);
      throw err;
    }
  },

  getAdminFormationsAVerifier: async (search = "", page = 1) => {
    try {
      const response = await api.get(`jobs/admin/referentiel-v2/formations-a-verifier/?search=${q(search)}&page=${page}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_FORMATIONS_A_VERIFIER", err);
      throw err;
    }
  },
  validerFormationAVerifier: async (id, data) => {
    try {
      const response = await api.patch(`jobs/admin/referentiel-v2/formations-a-verifier/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_VALIDER_FORMATION_A_VERIFIER", err);
      throw err;
    }
  },
  refuserFormationAVerifier: async (id, motif = "") => {
    try {
      const response = await api.delete(`jobs/admin/referentiel-v2/formations-a-verifier/${id}/`, { data: { motif } });
      return response.data;
    } catch (err) {
      reportError("ECHEC_REFUSER_FORMATION_A_VERIFIER", err);
      throw err;
    }
  },

  getDemandesPremium: async () => {
    try {
      const response = await api.get("jobs/admin/demandes-premium/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_DEMANDES_PREMIUM", err);
      throw err;
    }
  },

  activerPremium: async (demandeId, nb_mois = 1, palier = "BUSINESS") => {
    try {
      const response = await api.patch(`jobs/admin/demandes-premium/${demandeId}/activer/`, { nb_mois, palier });
      return response.data;
    } catch (err) {
      reportError("ECHEC_ACTIVER_PREMIUM", err);
      throw err;
    }
  },

  // Comptes admins
  getAdmins: async () => {
    try {
      const response = await api.get("jobs/admin/comptes-admins/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMINS", err);
      throw err;
    }
  },

  createAdmin: async (data) => {
    try {
      const response = await api.post("jobs/admin/comptes-admins/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_ADMIN", err);
      throw err;
    }
  },

  updateAdmin: async (id, data) => {
    try {
      const response = await api.patch(`jobs/admin/comptes-admins/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_ADMIN", err);
      throw err;
    }
  },

  deleteAdmin: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/comptes-admins/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_ADMIN", err);
      throw err;
    }
  },

  // Qualité IA : journal de parsing CV, corrections des candidats, suivi du matching
  getQualiteIAParser: async (jours = 30) => {
    try {
      const response = await api.get("jobs/admin/qualite-ia/parser/", { params: { jours } });
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_QUALITE_IA_PARSER", err);
      throw err;
    }
  },
  getQualiteIACorrections: async (type = "") => {
    try {
      const response = await api.get("jobs/admin/qualite-ia/corrections/", { params: type ? { type } : {} });
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_QUALITE_IA_CORRECTIONS", err);
      throw err;
    }
  },
  creerAppellationDepuisCorrection: async (texteSource, metierId) => {
    try {
      const response = await api.post("jobs/admin/qualite-ia/appellation/", { texte_source: texteSource, metier_id: metierId });
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_APPELLATION_CORRECTION", err);
      throw err;
    }
  },
  getQualiteIAMatching: async () => {
    try {
      const response = await api.get("jobs/admin/qualite-ia/matching/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_QUALITE_IA_MATCHING", err);
      throw err;
    }
  },

  // Paliers d'abonnement recruteur (Starter/Pro/Business/Enterprise)
  getAdminPaliers: async () => {
    try {
      const response = await api.get("jobs/admin/paliers/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_PALIERS", err);
      throw err;
    }
  },

  updatePalier: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/paliers/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_PALIER", err);
      throw err;
    }
  },

  // FAQ
  getAdminFaq: async () => {
    try {
      const response = await api.get("jobs/admin/faq/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_FAQ", err);
      throw err;
    }
  },

  createFaqItem: async (data) => {
    try {
      const response = await api.post("jobs/admin/faq/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_FAQ_ITEM", err);
      throw err;
    }
  },

  updateFaqItem: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/faq/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_FAQ_ITEM", err);
      throw err;
    }
  },

  deleteFaqItem: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/faq/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_FAQ_ITEM", err);
      throw err;
    }
  },

  // Packs de crédits CVthèque (admin)
  getAdminCreditPacks: async () => {
    try {
      const response = await api.get("jobs/admin/credit-packs/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_CREDIT_PACKS", err);
      throw err;
    }
  },

  createCreditPack: async (data) => {
    try {
      const response = await api.post("jobs/admin/credit-packs/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_CREDIT_PACK", err);
      throw err;
    }
  },

  updateCreditPack: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/credit-packs/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_CREDIT_PACK", err);
      throw err;
    }
  },

  deleteCreditPack: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/credit-packs/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_CREDIT_PACK", err);
      throw err;
    }
  },

  // Compétences (référentiel admin)
  getAdminCompetences: async (search = "", page = 1, statut = "") => {
    try {
      const response = await api.get(`jobs/admin/competences/?search=${q(search)}&page=${page}&statut=${q(statut)}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_COMPETENCES", err);
      throw err;
    }
  },

  // Métiers proposés par les utilisateurs : liste par statut, validation (rattacher / créer), rejet.
  getPropositionsMetier: async (statut = "", avecGroupes = false) => {
    try {
      const response = await api.get(`jobs/admin/propositions-metiers/?statut=${q(statut)}${avecGroupes ? "&groupes=1" : ""}`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_PROPOSITIONS_METIER", err);
      throw err;
    }
  },

  validerPropositionMetier: async (id, corps) => {
    try {
      const response = await api.post(`jobs/admin/propositions-metiers/${id}/valider/`, corps);
      return response.data;
    } catch (err) {
      reportError("ECHEC_VALIDER_PROPOSITION_METIER", err);
      throw err;
    }
  },

  rejeterPropositionMetier: async (id, motif) => {
    try {
      const response = await api.post(`jobs/admin/propositions-metiers/${id}/rejeter/`, { motif });
      return response.data;
    } catch (err) {
      reportError("ECHEC_REJETER_PROPOSITION_METIER", err);
      throw err;
    }
  },

  // Cycle de vie (Suggérée -> Validée -> Rejetée/Désactivée) : seul chemin de changement de statut.
  changerStatutCompetence: async (id, statut) => {
    try {
      const response = await api.patch(`jobs/admin/competences/${id}/statut/`, { statut });
      return response.data;
    } catch (err) {
      reportError("ECHEC_STATUT_COMPETENCE", err);
      throw err;
    }
  },

  // Détecte les compétences saisies hors référentiel par plusieurs utilisateurs et les enregistre
  // comme SUGGÉRÉES (jamais officielles) — `simuler: true` pour un aperçu sans écriture.
  proposerCompetences: async (options = {}) => {
    try {
      const response = await api.post("jobs/admin/competences/proposer/", options);
      return response.data;
    } catch (err) {
      reportError("ECHEC_PROPOSER_COMPETENCES", err);
      throw err;
    }
  },

  createCompetence: async (data) => {
    try {
      const response = await api.post("jobs/admin/competences/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_COMPETENCE", err);
      throw err;
    }
  },

  updateCompetence: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/competences/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_COMPETENCE", err);
      throw err;
    }
  },

  deleteCompetence: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/competences/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_COMPETENCE", err);
      throw err;
    }
  },

  // Articles / Blog (admin)
  getAdminArticles: async () => {
    try {
      const response = await api.get("jobs/admin/articles/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_ARTICLES", err);
      throw err;
    }
  },

  getAdminArticle: async (id) => {
    try {
      const response = await api.get(`jobs/admin/articles/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_ARTICLE", err);
      throw err;
    }
  },

  createArticle: async (data) => {
    try {
      const hasFile = data.image_couverture instanceof File;
      let payload = data;
      let config = {};
      if (hasFile) {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
          if (data[key] !== null && data[key] !== undefined) formData.append(key, data[key]);
        });
        payload = formData;
        config = { headers: { "Content-Type": "multipart/form-data" } };
      }
      const response = await api.post("jobs/admin/articles/", payload, config);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_ARTICLE", err);
      throw err;
    }
  },

  updateArticle: async (id, data) => {
    try {
      const hasFile = data.image_couverture instanceof File;
      let payload = data;
      let config = {};
      if (hasFile) {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
          if (data[key] !== null && data[key] !== undefined) formData.append(key, data[key]);
        });
        payload = formData;
        config = { headers: { "Content-Type": "multipart/form-data" } };
      }
      const response = await api.put(`jobs/admin/articles/${id}/`, payload, config);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_ARTICLE", err);
      throw err;
    }
  },

  deleteArticle: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/articles/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_ARTICLE", err);
      throw err;
    }
  },

  getAdminArticleCategories: async () => {
    try {
      const response = await api.get("jobs/admin/articles-categories/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_ARTICLE_CATEGORIES", err);
      throw err;
    }
  },

  createArticleCategory: async (data) => {
    try {
      const response = await api.post("jobs/admin/articles-categories/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_ARTICLE_CATEGORY", err);
      throw err;
    }
  },

  deleteArticleCategory: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/articles-categories/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_ARTICLE_CATEGORY", err);
      throw err;
    }
  },

  // Bannières — annonce globale
  getAdminSiteAnnonces: async () => {
    try {
      const response = await api.get("jobs/admin/site-annonce/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_SITE_ANNONCES", err);
      throw err;
    }
  },

  createSiteAnnonce: async (data) => {
    try {
      const response = await api.post("jobs/admin/site-annonce/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_SITE_ANNONCE", err);
      throw err;
    }
  },

  updateSiteAnnonce: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/site-annonce/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_SITE_ANNONCE", err);
      throw err;
    }
  },

  deleteSiteAnnonce: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/site-annonce/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_SITE_ANNONCE", err);
      throw err;
    }
  },

  // Bannières — carrousel accueil
  getAdminBannieresAccueil: async () => {
    try {
      const response = await api.get("jobs/admin/bannieres-accueil/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_BANNIERES", err);
      throw err;
    }
  },

  createBanniereAccueil: async (data) => {
    try {
      const formData = new FormData();
      Object.keys(data).forEach((key) => {
        if (data[key] !== null && data[key] !== undefined) formData.append(key, data[key]);
      });
      const response = await api.post("jobs/admin/bannieres-accueil/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_BANNIERE", err);
      throw err;
    }
  },

  updateBanniereAccueil: async (id, data) => {
    try {
      const hasFile = data.image instanceof File;
      let payload = data;
      let config = {};
      if (hasFile) {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
          if (data[key] !== null && data[key] !== undefined) formData.append(key, data[key]);
        });
        payload = formData;
        config = { headers: { "Content-Type": "multipart/form-data" } };
      }
      const response = await api.put(`jobs/admin/bannieres-accueil/${id}/`, payload, config);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_BANNIERE", err);
      throw err;
    }
  },

  deleteBanniereAccueil: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/bannieres-accueil/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_BANNIERE", err);
      throw err;
    }
  },

  // Pages statiques (CGU, Confidentialité, Qui sommes-nous, pages libres)
  getAdminPages: async () => {
    try {
      const response = await api.get("jobs/admin/pages/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_ADMIN_PAGES", err);
      throw err;
    }
  },

  createPageStatique: async (data) => {
    try {
      const response = await api.post("jobs/admin/pages/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREATE_PAGE_STATIQUE", err);
      throw err;
    }
  },

  updatePageStatique: async (id, data) => {
    try {
      const response = await api.put(`jobs/admin/pages/${id}/`, data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_PAGE_STATIQUE", err);
      throw err;
    }
  },

  deletePageStatique: async (id) => {
    try {
      const response = await api.delete(`jobs/admin/pages/${id}/`);
      return response.data;
    } catch (err) {
      reportError("ECHEC_DELETE_PAGE_STATIQUE", err);
      throw err;
    }
  },

  // Configuration IA
  getAIConfig: async () => {
    try {
      const response = await api.get("jobs/admin/ai-config/");
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_AI_CONFIG", err);
      throw err;
    }
  },

  updateAIConfig: async (data) => {
    try {
      const response = await api.put("jobs/admin/ai-config/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_UPDATE_AI_CONFIG", err);
      throw err;
    }
  },

  // Quotas IA — overrides par compte + usage
  getQuotaIAOverrides: async (search = "") => {
    try {
      const response = await api.get("jobs/admin/quota-ia/overrides/", { params: search ? { search } : {} });
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_QUOTA_IA_OVERRIDES", err);
      throw err;
    }
  },

  creerQuotaIAOverride: async (data) => {
    try {
      const response = await api.post("jobs/admin/quota-ia/overrides/", data);
      return response.data;
    } catch (err) {
      reportError("ECHEC_CREER_QUOTA_IA_OVERRIDE", err);
      throw err;
    }
  },

  supprimerQuotaIAOverride: async (id) => {
    try {
      await api.delete(`jobs/admin/quota-ia/overrides/${id}/`);
    } catch (err) {
      reportError("ECHEC_SUPPRIMER_QUOTA_IA_OVERRIDE", err);
      throw err;
    }
  },

  getQuotaIAUsage: async (email) => {
    try {
      const response = await api.get("jobs/admin/quota-ia/usage/", { params: { email } });
      return response.data;
    } catch (err) {
      reportError("ECHEC_GET_QUOTA_IA_USAGE", err);
      throw err;
    }
  },
};
