import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { authService } from "../src/Services/authService";
import api from "../src/api/axiosConfig";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS DES DÉPENDANCES ---
vi.mock("../src/api/axiosConfig", () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("../src/utils/errorReporter", () => ({
  reportError: vi.fn(),
}));

// --- SIMULATION DU NAVIGATEUR (POUR NODE.JS) ---
// On crée un faux localStorage qui se comporte comme le vrai
let mockStore = {};
vi.stubGlobal("localStorage", {
  getItem: vi.fn((key) => mockStore[key] || null),
  setItem: vi.fn((key, value) => {
    mockStore[key] = value.toString();
  }),
  removeItem: vi.fn((key) => {
    delete mockStore[key];
  }),
  clear: vi.fn(() => {
    mockStore = {};
  }),
});

// On crée un faux objet window
vi.stubGlobal("window", { location: { href: "" } });

describe("🔧 Logique Métier - Service <authService />", () => {
  beforeEach(() => {
    mockStore = {}; // On vide le faux storage avant chaque test
    window.location.href = ""; // On réinitialise l'URL
    vi.clearAllMocks(); // On nettoie les espions
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Login réussit, map de l'email et sauvegarde du rôle", async () => {
    api.post.mockResolvedValue({
      data: { role: "CANDIDAT", message: "Connecté" },
    });

    const result = await authService.login("meriem@test.dz", "password123");

    // L'API doit être appelée avec 'username' et non 'email'
    expect(api.post).toHaveBeenCalledWith("accounts/login/", {
      username: "meriem@test.dz",
      password: "password123",
    });

    // Le faux localStorage doit avoir enregistré le rôle
    expect(localStorage.setItem).toHaveBeenCalledWith("userRole", "CANDIDAT");
    expect(mockStore["userRole"]).toBe("CANDIDAT");
    expect(result).toEqual({ role: "CANDIDAT", message: "Connecté" });
  });

  it("🟢 HP2 : Déconnexion (Nettoyage et Redirection)", () => {
    mockStore["userRole"] = "RECRUTEUR"; // On simule un utilisateur connecté

    authService.logout();

    // On vérifie le nettoyage et la redirection
    expect(localStorage.removeItem).toHaveBeenCalledWith("userRole");
    expect(mockStore["userRole"]).toBeUndefined();
    expect(window.location.href).toBe("/login");
  });

  it("🟢 HP3 : Mise à jour du profil attache les bons headers (Multipart)", async () => {
    api.put.mockResolvedValue({ data: { success: true } });
    const fakeFormData = new FormData();
    fakeFormData.append("cv", "fakeFile");

    await authService.updateProfilCandidat(fakeFormData);

    expect(api.put).toHaveBeenCalledWith("jobs/profil/", fakeFormData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  });

  it("🟢 HP4 : Utilitaires d'état d'authentification réagissent correctement", () => {
    // Par défaut, pas connecté
    expect(authService.isAuthenticated()).toBe(false);
    expect(authService.getUserRole()).toBeNull();

    // On simule une connexion
    mockStore["userRole"] = "ADMIN";

    // Vérification
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.getUserRole()).toBe("ADMIN");
  });

  // --- 🔴 EDGE CASES (3/3) ---

  it("🔴 EC1 : Échec du Login - Propagation de l'erreur et Télémétrie", async () => {
    const fakeError = new Error("401 Unauthorized");
    api.post.mockRejectedValue(fakeError);

    // On vérifie que la promesse rejette bien l'erreur (pour que les Toasts de l'UI s'affichent)
    await expect(authService.login("bad@email", "badpass")).rejects.toThrow(
      "401 Unauthorized",
    );

    // On vérifie la télémétrie
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_LOGIN_API",
      fakeError,
    );
    // On s'assure que rien n'a été stocké par accident
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it("🔴 EC2 : Login réussit mais sans rôle fourni par l'API", async () => {
    // Cas où le backend répond 200 OK, mais omet le champ "role"
    api.post.mockResolvedValue({
      data: { message: "Compte incomplet ou bloqué" },
    });

    await authService.login("test@test.dz", "pwd");

    // Le localStorage ne doit pas avoir été appelé
    expect(localStorage.setItem).not.toHaveBeenCalled();
  });

  it("🔴 EC3 : Échec de la récupération du profil (Télémétrie API GET)", async () => {
    const fakeError = new Error("Network Error");
    api.get.mockRejectedValue(fakeError);

    await expect(authService.getProfilCandidat()).rejects.toThrow(
      "Network Error",
    );

    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_GET_PROFIL_API",
      fakeError,
    );
  });
});
