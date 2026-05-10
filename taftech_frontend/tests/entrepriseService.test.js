import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { entrepriseService } from "../src/Services/entrepriseService";
import api from "../src/api/axiosConfig";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS DES DÉPENDANCES ---
vi.mock("../src/api/axiosConfig", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("../src/utils/errorReporter", () => ({
  reportError: vi.fn(),
}));

describe("🔧 Logique Métier - Service <entrepriseService />", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // Nettoyage des espions avant chaque test
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- 🟢 HAPPY PATHS (1/1) ---

  it("🟢 HP1 : Création d'entreprise réussie (Transmission et Retour de données)", async () => {
    // 1. On prépare la fausse réponse de l'API
    const mockApiResponse = {
      data: { id: 42, nom_entreprise: "TafTech Corp", statut: "En attente" },
    };
    api.post.mockResolvedValue(mockApiResponse);

    // 2. On exécute la fonction du service
    const payload = { nom_entreprise: "TafTech Corp", secteur_activite: "IT" };
    const result = await entrepriseService.creerEntreprise(payload);

    // 3. On vérifie que la requête part sur la bonne URL avec le bon payload
    expect(api.post).toHaveBeenCalledWith("jobs/entreprise/creer/", payload);

    // 4. On s'assure qu'il retourne bien `response.data` (et pas l'objet axios entier)
    expect(result).toEqual(mockApiResponse.data);

    // Vérification qu'aucune erreur n'a été signalée
    expect(reporter.reportError).not.toHaveBeenCalled();
  });

  // --- 🔴 EDGE CASES (1/1) ---

  it("🔴 EC1 : Échec de la création - Propagation de l'erreur et Télémétrie", async () => {
    // 1. On simule un crash réseau ou une erreur HTTP 400
    const fakeError = new Error("400 Bad Request: Le registre existe déjà");
    api.post.mockRejectedValue(fakeError);

    // 2. Le payload pour la tentative
    const payload = { nom_entreprise: "Doublon Corp" };

    // 3. On vérifie que la promesse rejette bien l'erreur (pour déclencher le Toast dans l'UI)
    await expect(entrepriseService.creerEntreprise(payload)).rejects.toThrow(
      "400 Bad Request",
    );

    // 4. On vérifie que notre sonde a bien capturé et tagué l'événement
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_CREATION_ENTREPRISE_API",
      fakeError,
    );
  });
});
