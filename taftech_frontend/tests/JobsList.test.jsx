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
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import JobsList from "../src/Pages/JobsList";
import { jobsService } from "../src/Services/jobsService";
import api from "../src/api/axiosConfig";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// --- MOCKS ---
const mockSetSearchParams = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
    getAllJobs: vi.fn(),
    getOffresRecommandees: vi.fn(),
  },
}));

vi.mock("../src/api/axiosConfig", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockConstants = {
  wilayas: [
    { value: "16 - Alger", label: "16 - Alger" },
    { value: "31 - Oran", label: "31 - Oran" },
  ],
  secteurs: [{ value: "IT", label: "Informatique" }],
  diplomes: [{ value: "BAC", label: "Baccalauréat" }],
  experiences: [{ value: "DEBUTANT", label: "Débutant" }],
  contrats: [{ value: "CDI", label: "CDI" }],
};

const mockJobs = [
  {
    id: 1,
    titre: "Développeur Fullstack React/Node",
    entreprise: { id: 10, nom_entreprise: "TafTech Corp" },
    wilaya: "16 - Alger",
    commune: "Bab Ezzouar",
    experience_requise: "2 à 5 ans",
    type_contrat: "CDI",
  },
];

const mockRecommandations = [
  {
    id: 2,
    titre: "Tech Lead Frontend",
    entreprise: null,
    wilaya: "31 - Oran",
    experience_requise: "5 ans +",
    matching_score: 95,
  },
];

describe("🔎 UI & Logique - Composant <JobsList />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(
      (key) => {
        if (key === "userRole") return "CANDIDAT";
        return null;
      },
    );
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Chargement complet (Offres, Favoris et Recommandations IA)", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    api.get.mockResolvedValue({ data: [{ id: 99, offre: 1 }] }); // Job ID 1 est en favori
    jobsService.getOffresRecommandees.mockResolvedValue(mockRecommandations);
    jobsService.getAllJobs.mockResolvedValue({ results: mockJobs });

    render(
      <MemoryRouter>
        <JobsList />
      </MemoryRouter>,
    );

    // On avance pour laisser passer le debounce du useEffect (500ms)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      // Recommandations IA (Carrousel)
      expect(screen.getByText("🔥 Recommandées pour vous")).toBeInTheDocument();
      expect(screen.getByText("Tech Lead Frontend")).toBeInTheDocument();
      expect(screen.getByText("⭐ Top Match")).toBeInTheDocument();

      // Liste des offres
      expect(
        screen.getByText("1 Offres d'emploi trouvées"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Développeur Fullstack React/Node"),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Fonctionnement de la recherche et du Debounce (500ms)", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    api.get.mockResolvedValue({ data: [] });
    jobsService.getOffresRecommandees.mockResolvedValue([]);
    jobsService.getAllJobs.mockResolvedValue({ results: mockJobs });

    render(
      <MemoryRouter>
        <JobsList />
      </MemoryRouter>,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // On efface le mock d'appel initial pour tracer le nouveau
    jobsService.getAllJobs.mockClear();

    // On tape dans la barre de recherche
    const inputRecherche = screen.getByPlaceholderText("Ex: Développeur...");
    fireEvent.change(inputRecherche, { target: { value: "React" } });

    // Immédiatement après la frappe, l'API ne doit PAS avoir été appelée
    expect(jobsService.getAllJobs).not.toHaveBeenCalled();

    // On avance le temps de 500ms
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      // L'API est appelée avec le nouveau filtre
      expect(jobsService.getAllJobs).toHaveBeenCalledWith(
        expect.objectContaining({ search: "React" }),
        1,
      );
      // Les URLSearchParams sont mis à jour
      expect(mockSetSearchParams).toHaveBeenCalled();
    });
  });

  it("🟢 HP3 : Ajout d'une offre aux Favoris (Candidat Connecté)", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    api.get.mockResolvedValue({ data: [] }); // Aucun favori au départ
    jobsService.getOffresRecommandees.mockResolvedValue([]);
    jobsService.getAllJobs.mockResolvedValue({ results: mockJobs });

    // Simuler la réussite du POST
    api.post.mockResolvedValue({ data: { id: 100, offre: 1 } });

    render(
      <MemoryRouter>
        <JobsList />
      </MemoryRouter>,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const btnFavori = await screen.findByTitle("Sauvegarder l'offre");
    fireEvent.click(btnFavori);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("jobs/sauvegardes/", { offre: 1 });
      expect(toast.success).toHaveBeenCalledWith("Offre sauvegardée !");
    });
  });

  it("🟢 HP4 : Retrait d'une offre des Favoris", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    api.get.mockResolvedValue({ data: [{ id: 99, offre: 1 }] }); // Job ID 1 EST en favori
    jobsService.getOffresRecommandees.mockResolvedValue([]);
    jobsService.getAllJobs.mockResolvedValue({ results: mockJobs });

    api.delete.mockResolvedValue({});

    render(
      <MemoryRouter>
        <JobsList />
      </MemoryRouter>,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // Le bouton doit indiquer "Retirer des favoris"
    const btnFavori = await screen.findByTitle("Retirer des favoris");
    fireEvent.click(btnFavori);

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("jobs/sauvegardes/99/");
      expect(toast.success).toHaveBeenCalledWith("Offre retirée des favoris.");
    });
  });

  // --- 🔴 EDGE CASES (4/4) ---

  it("🔴 EC1 : Ajout Favori bloqué si visiteur non-connecté", async () => {
    // On simule un visiteur non connecté
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(null);

    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.getAllJobs.mockResolvedValue({ results: mockJobs });

    render(
      <MemoryRouter>
        <JobsList />
      </MemoryRouter>,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const btnFavori = await screen.findByTitle("Sauvegarder l'offre");
    fireEvent.click(btnFavori);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Veuillez vous connecter pour sauvegarder une offre.",
      );
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC2 : Gestion robuste du crash API au chargement (Télémétrie)", async () => {
    jobsService.getConstants.mockRejectedValue(new Error("Network Error"));
    jobsService.getAllJobs.mockResolvedValue({ results: mockJobs });

    render(
      <MemoryRouter>
        <JobsList />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_INITIALISATION_JOBS_LIST",
        expect.anything(),
      );
      // L'application ne doit pas crasher, les offres s'affichent quand même
      expect(
        screen.getByText("Développeur Fullstack React/Node"),
      ).toBeInTheDocument();
    });
  });

  it("🔴 EC3 : Affichage du Empty State si la recherche ne donne rien", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    api.get.mockResolvedValue({ data: [] });
    jobsService.getOffresRecommandees.mockResolvedValue([]);

    // On simule une recherche vide
    jobsService.getAllJobs.mockResolvedValue({ results: [] });

    render(
      <MemoryRouter>
        <JobsList />
      </MemoryRouter>,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("Aucune offre trouvée 😕")).toBeInTheDocument();
    });

    // Clic sur "Effacer les filtres"
    fireEvent.click(screen.getByText("Effacer les filtres"));
    expect(mockSetSearchParams).toHaveBeenCalledWith({});
  });

  it("🔴 EC4 : Annulation optimiste si l'API Favori crash (Télémétrie)", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    api.get.mockResolvedValue({ data: [{ id: 99, offre: 1 }] });
    jobsService.getOffresRecommandees.mockResolvedValue([]);
    jobsService.getAllJobs.mockResolvedValue({ results: mockJobs });

    // L'API Delete échoue
    api.delete.mockRejectedValue(new Error("500 API Crash"));

    render(
      <MemoryRouter>
        <JobsList />
      </MemoryRouter>,
    );

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const btnFavori = await screen.findByTitle("Retirer des favoris");
    fireEvent.click(btnFavori);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la suppression.",
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_SUPPRESSION_FAVORI",
        expect.anything(),
      );
    });
  });
});
