import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { profilService } from "../src/Services/profilService";
import api from "../src/api/axiosConfig";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS DES DÉPENDANCES ---
vi.mock("../src/api/axiosConfig", () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../src/utils/errorReporter", () => ({
  reportError: vi.fn(),
}));

describe("🔧 Logique Métier - Service <profilService />", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Nettoyage total des espions entre chaque test
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Récupération du profil", async () => {
    const mockData = { id: 1, first_name: "Meriem", last_name: "Belamri" };
    api.get.mockResolvedValue({ data: mockData });

    const result = await profilService.getProfil();

    expect(api.get).toHaveBeenCalledWith("jobs/profil/");
    expect(result).toEqual(mockData);
  });

  it("🟢 HP2 : Mise à jour du profil (Headers Multipart)", async () => {
    api.put.mockResolvedValue({ data: { success: true } });

    const fakeFormData = new FormData();
    fakeFormData.append("cv", "file.pdf");

    const result = await profilService.updateProfil(fakeFormData);

    expect(api.put).toHaveBeenCalledWith("jobs/profil/", fakeFormData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    expect(result).toEqual({ success: true });
  });

  it("🟢 HP3 : Ajout et Suppression d'une Expérience", async () => {
    const mockExp = { titre_poste: "Développeur", entreprise: "Taziri" };
    api.post.mockResolvedValue({ data: { id: 42, ...mockExp } });
    api.delete.mockResolvedValue({});

    // Test POST
    const postResult = await profilService.addExperience(mockExp);
    expect(api.post).toHaveBeenCalledWith("jobs/profil/experiences/", mockExp);
    expect(postResult).toHaveProperty("id", 42);

    // Test DELETE
    await profilService.deleteExperience(42);
    expect(api.delete).toHaveBeenCalledWith("jobs/profil/experiences/42/");
  });

  it("🟢 HP4 : Ajout et Suppression d'une Formation", async () => {
    const mockForm = {
      diplome: "Master 2",
      etablissement: "Université d'Oran",
    };
    api.post.mockResolvedValue({ data: { id: 99, ...mockForm } });
    api.delete.mockResolvedValue({});

    // Test POST
    const postResult = await profilService.addFormation(mockForm);
    expect(api.post).toHaveBeenCalledWith("jobs/profil/formations/", mockForm);
    expect(postResult).toHaveProperty("id", 99);

    // Test DELETE
    await profilService.deleteFormation(99);
    expect(api.delete).toHaveBeenCalledWith("jobs/profil/formations/99/");
  });

  // --- 🔴 EDGE CASES (2/2) ---

  it("🔴 EC1 : Tolérance aux pannes sur le Profil (Télémétrie Globale)", async () => {
    const fakeError = new Error("500 Server Error");
    api.get.mockRejectedValue(fakeError);
    api.put.mockRejectedValue(fakeError);

    // Crash GET
    await expect(profilService.getProfil()).rejects.toThrow("500 Server Error");
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_GET_PROFIL_API",
      fakeError,
    );

    // Crash PUT
    await expect(profilService.updateProfil(new FormData())).rejects.toThrow(
      "500 Server Error",
    );
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_UPDATE_PROFIL_API",
      fakeError,
    );
  });

  it("🔴 EC2 : Tolérance aux pannes sur les Sous-cartes (Télémétrie CRUD)", async () => {
    const fakeError = new Error("404 Not Found");
    api.post.mockRejectedValue(fakeError);
    api.delete.mockRejectedValue(fakeError);

    // Crash Add/Delete Expérience
    await expect(profilService.addExperience({})).rejects.toThrow("404");
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_ADD_EXPERIENCE_API",
      fakeError,
    );

    await expect(profilService.deleteExperience(1)).rejects.toThrow("404");
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_DELETE_EXPERIENCE_API",
      fakeError,
    );

    // Crash Add/Delete Formation
    await expect(profilService.addFormation({})).rejects.toThrow("404");
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_ADD_FORMATION_API",
      fakeError,
    );

    await expect(profilService.deleteFormation(1)).rejects.toThrow("404");
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_DELETE_FORMATION_API",
      fakeError,
    );
  });
});
