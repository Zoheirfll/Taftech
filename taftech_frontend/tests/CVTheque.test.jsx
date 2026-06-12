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
import CVTheque from "../src/Pages/Recruteur/CVTheque";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import selectEvent from "react-select-event";

// --- MOCKS ---
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
    searchCVtheque: vi.fn(),
    getDashboard: vi.fn(),
  },
}));

const mockConstants = {
  wilayas: [{ value: "31 - Oran", label: "31 - Oran" }],
  secteurs: [{ value: "IT", label: "Informatique" }],
  diplomes: [{ value: "MASTER", label: "Master" }],
};

const mockResults = {
  count: 1,
  results: [
    {
      first_name: "Meriem",
      last_name: "BELAMRI",
      email: "meriem@test.dz",
      titre_professionnel: "Développeur",
      wilaya: "Oran",
      diplome: "MASTER",
      experiences_detail: [{ id: 1, titre_poste: "Dev", entreprise: "SOMIZ" }],
    },
  ],
};

describe("🔍 UI & Logique - Composant <CVTheque />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getDashboard.mockResolvedValue({ est_premium: true });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Chargement des filtres et état initial", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    render(<MemoryRouter><CVTheque /></MemoryRouter>);

    await waitFor(() => {
      expect(jobsService.getConstants).toHaveBeenCalled();
      // The component shows "Explorez le vivier de CV" as the heading
      expect(
        screen.getByText(/Explorez le vivier de CV/i),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Recherche par texte avec debounce", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockResolvedValue(mockResults);
    render(<MemoryRouter><CVTheque /></MemoryRouter>);

    const input = screen.getByPlaceholderText(/Mots clés, métier, poste/i);
    fireEvent.change(input, { target: { value: "React" } });

    // On avance le temps manuellement pour le debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(jobsService.searchCVtheque).toHaveBeenCalled();
      expect(screen.getAllByText(/BELAMRI Meriem/i)[0]).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Utilisation des filtres Select", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockResolvedValue(mockResults);
    render(<MemoryRouter><CVTheque /></MemoryRouter>);

    const select = await screen.findByText("Wilaya");
    await selectEvent.select(select, "31 - Oran");

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(jobsService.searchCVtheque).toHaveBeenCalled();
    });
  });

  it("🟢 HP4 : Ouverture de la Modal de profil complet", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockResolvedValue(mockResults);
    render(<MemoryRouter><CVTheque /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText(/Mots clés, métier, poste/i), {
      target: { value: "A" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    // The component auto-selects first result, details show in the right panel
    await waitFor(() => {
      expect(
        screen.getByText(/Expériences professionnelles/i),
      ).toBeInTheDocument();
      expect(screen.getByText("SOMIZ")).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES (4/4) ---

  it("🔴 EC1 : Échec du chargement des filtres", async () => {
    jobsService.getConstants.mockRejectedValue(new Error("500"));
    render(<MemoryRouter><CVTheque /></MemoryRouter>);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_FILTRES_CVTHEQUE",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 : Aucun résultat trouvé", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockResolvedValue({ count: 0, results: [] });
    render(<MemoryRouter><CVTheque /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText(/Mots clés, métier, poste/i), {
      target: { value: "Unknown" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText(/Aucun profil trouvé/i)).toBeInTheDocument();
    });
  });

  it("🔴 EC3 : Échec de la recherche API (Télémétrie)", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockRejectedValue(new Error("Fail"));
    render(<MemoryRouter><CVTheque /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText(/Mots clés, métier, poste/i), {
      target: { value: "Bug" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_RECHERCHE_CVTHEQUE",
        expect.anything(),
      );
    });
  });

  it("🔴 EC4 : Affichage robuste sans photo (Initiales)", async () => {
    const incomplete = {
      count: 1,
      results: [{ first_name: "Ali", last_name: "B", email: "a@b.dz" }],
    };
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockResolvedValue(incomplete);
    render(<MemoryRouter><CVTheque /></MemoryRouter>);

    fireEvent.change(screen.getByPlaceholderText(/Mots clés, métier, poste/i), {
      target: { value: "Ali" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/B Ali/i)[0]).toBeInTheDocument();
    });
  });
});
