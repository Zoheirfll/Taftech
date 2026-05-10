// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../src/Pages/Home";
import { jobsService } from "../src/Services/jobsService";
import api from "../src/api/axiosConfig";
import * as reporter from "../src/utils/errorReporter";
import selectEvent from "react-select-event";

// --- MOCKS ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
    getAllJobs: vi.fn(),
  },
}));

vi.mock("../src/api/axiosConfig", () => ({
  default: {
    get: vi.fn(),
  },
}));

const mockConstants = {
  wilayas: [
    { value: "16 - Alger", label: "16 - Alger" },
    { value: "31 - Oran", label: "31 - Oran" },
  ],
};

const mockStats = {
  data: {
    total_offres: 120,
    total_entreprises: 45,
    total_candidats: 1500,
    total_recrutements: 32,
  },
};

const mockJobs = {
  results: [
    {
      id: 1,
      titre: "Développeur Fullstack React/Node",
      entreprise: { nom_entreprise: "TafTech Corp" },
      wilaya: "16 - Alger",
      experience_requise: "2 à 5 ans",
    },
    {
      id: 2,
      titre: "Data Scientist",
      entreprise: null, // Test d'entreprise anonyme
      wilaya: "31 - Oran",
      experience_requise: "Débutant",
    },
  ],
};

describe("🏠 UI & Logique - Composant <Home />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS (2/2) ---

  it("🟢 HP1 : Chargement complet et affichage des données", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    api.get.mockResolvedValue(mockStats);
    jobsService.getAllJobs.mockResolvedValue(mockJobs);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Vérification des statistiques
      expect(screen.getByText("1500")).toBeInTheDocument(); // Candidats
      expect(screen.getByText("120")).toBeInTheDocument(); // Offres
      expect(screen.getByText("32")).toBeInTheDocument(); // Recrutements

      // Vérification des offres récentes
      expect(
        screen.getByText("Développeur Fullstack React/Node"),
      ).toBeInTheDocument();
      expect(screen.getByText("Data Scientist")).toBeInTheDocument();

      // Vérification de l'entreprise anonyme (Fallback)
      expect(screen.getByText(/Entreprise Anonyme/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Recherche Multicritères fonctionnelle", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    api.get.mockResolvedValue(mockStats);
    jobsService.getAllJobs.mockResolvedValue(mockJobs);

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    // Attendre la fin du chargement
    await waitFor(() => screen.getByText("1500"));

    // Remplir le texte
    const textInput = screen.getByPlaceholderText(
      /Métier, mot-clé, entreprise/i,
    );
    fireEvent.change(textInput, { target: { value: "React" } });

    // Remplir le Select de Wilaya
    const wilayaSelect = await screen.findByText(/Wilaya \(ex: Alger\.\.\.\)/i);
    await selectEvent.select(wilayaSelect, "31 - Oran");

    // Soumettre
    const btnSubmit = screen.getByRole("button", { name: /Rechercher/i });
    fireEvent.click(btnSubmit);

    // Vérifier la navigation avec les bons query params
    expect(mockNavigate).toHaveBeenCalledWith(
      "/offres?search=React&wilaya=31+-+Oran",
    );
  });

  // --- 🔴 EDGE CASES (2/2) ---

  it("🔴 EC1 : Gestion robuste du crash API global (Télémétrie)", async () => {
    // On simule un crash sur le Promise.all
    jobsService.getConstants.mockRejectedValue(new Error("500 Internal Error"));
    api.get.mockRejectedValue(new Error("500"));
    jobsService.getAllJobs.mockRejectedValue(new Error("500"));

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Le composant ne doit pas exploser. Il affiche les stats à 0.
      // 💡 On utilise getAllByText car les 4 blocs de statistiques affichent "0"
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThan(0);

      // Télémétrie bien appelée
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_ACCUEIL",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 : Gestion gracieuse des données incomplètes", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    // On renvoie un objet sans 'results' pour les offres
    jobsService.getAllJobs.mockResolvedValue({ count: 0 });
    // On renvoie des stats sans recrutements
    api.get.mockResolvedValue({
      data: { total_offres: 10, total_candidats: 20 },
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Le fallback de total_recrutements (|| 0) doit fonctionner
      // 💡 Là encore, on utilise getAllByText pour éviter les confusions
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThan(0);

      // Pas de plantage sur .slice() car conditionné par if (jobsData.results)
      expect(screen.getByText(/Dernières Offres/i)).toBeInTheDocument();
    });
  });
});
