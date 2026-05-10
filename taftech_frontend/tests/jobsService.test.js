import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { jobsService } from "../src/Services/jobsService";
import api from "../src/api/axiosConfig";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS ---
vi.mock("../src/api/axiosConfig", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../src/utils/errorReporter", () => ({
  reportError: vi.fn(),
}));

describe("🔧 Logique Métier - Service <jobsService />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  describe("🟢 HP1 : Requêtes GET avec encodage de filtres (URLSearchParams)", () => {
    it("Encode correctement les paramètres pour getAllJobs", async () => {
      api.get.mockResolvedValue({ data: "jobs_data" });

      const filters = { search: "Dev", wilaya: "31" };
      await jobsService.getAllJobs(filters, 2);

      // On vérifie que la query string est bien construite
      const expectedUrl =
        "jobs/?search=Dev&wilaya=31&commune=&diplome=&specialite=&experience=&contrat=&page=2";
      expect(api.get).toHaveBeenCalledWith(expectedUrl);
    });

    it("Encode correctement les paramètres pour searchCVtheque", async () => {
      api.get.mockResolvedValue({ data: "cv_data" });

      await jobsService.searchCVtheque({ specialite: "IT" }, 1);

      const expectedUrl =
        "jobs/employeur/cvtheque/?search=&wilaya=&specialite=IT&diplome=&experience=&page=1";
      expect(api.get).toHaveBeenCalledWith(expectedUrl);
    });
  });

  describe("🟢 HP2 : Requêtes POST avec Headers Spécifiques (Multipart)", () => {
    it("Envoie formData avec le bon header pour postuler", async () => {
      api.post.mockResolvedValue({ data: "success" });
      const mockFormData = new FormData();

      await jobsService.postuler("99", mockFormData);

      expect(api.post).toHaveBeenCalledWith("jobs/99/postuler/", mockFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    });
  });

  describe("🟢 HP3 : Exports & Téléchargements (Blob)", () => {
    it("Demande bien un type blob pour les exports", async () => {
      api.get.mockResolvedValue({ data: new Blob() });

      await jobsService.exportCandidatures();
      expect(api.get).toHaveBeenCalledWith("/jobs/admin/export/candidatures/", {
        responseType: "blob",
      });

      await jobsService.telechargerBulletin("42");
      expect(api.get).toHaveBeenCalledWith("/jobs/candidatures/42/bulletin/", {
        responseType: "blob",
      });
    });
  });

  describe("🟢 HP4 : Standard CRUD (Mutation avec IDs)", () => {
    it("Gère correctement les appels dynamiques (Patch, Delete)", async () => {
      api.patch.mockResolvedValue({ data: "patched" });
      api.delete.mockResolvedValue({ data: "deleted" });

      await jobsService.moderateOffre("1", { status: "APPROUVE" });
      expect(api.patch).toHaveBeenCalledWith("jobs/admin/offres/1/moderer/", {
        status: "APPROUVE",
      });

      await jobsService.deleteCandidature("5");
      expect(api.delete).toHaveBeenCalledWith("jobs/candidatures/5/supprimer/");
    });
  });

  // --- 🔴 EDGE CASES ---

  describe("🔴 EC : Tolérance aux pannes et Télémétrie", () => {
    it("EC1 : Capture l'erreur standard et déclenche la télémétrie", async () => {
      const fakeError = new Error("Network Down");
      api.get.mockRejectedValue(fakeError);

      await expect(jobsService.getDashboard()).rejects.toThrow("Network Down");

      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_DASHBOARD_API",
        fakeError,
      );
    });

    it("EC2 : searchCVtheque relance spécifiquement error.response.data", async () => {
      const backendError = { response: { data: "Acces Refusé" } };
      api.get.mockRejectedValue(backendError);

      await expect(jobsService.searchCVtheque()).rejects.toEqual(
        "Acces Refusé",
      );

      // La sonde doit bien attraper l'erreur originelle
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_SEARCH_CVTHEQUE_API",
        backendError,
      );
    });
  });
});
