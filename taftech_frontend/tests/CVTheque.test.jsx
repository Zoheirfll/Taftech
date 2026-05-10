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
import CVTheque from "../src/Pages/CVTheque";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import selectEvent from "react-select-event";

// --- MOCKS ---
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
    searchCVtheque: vi.fn(),
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
    // ✅ SOLUTION MIRACLE : Permet à waitFor de fonctionner même avec des fake timers
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
    render(<CVTheque />);

    await waitFor(() => {
      expect(jobsService.getConstants).toHaveBeenCalled();
      expect(
        screen.getByText(/Prêt à trouver votre perle rare/i),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Recherche par texte avec debounce", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockResolvedValue(mockResults);
    render(<CVTheque />);

    const input = screen.getByPlaceholderText(/Rechercher un poste/i);
    fireEvent.change(input, { target: { value: "React" } });

    // On avance le temps manuellement pour le debounce
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(jobsService.searchCVtheque).toHaveBeenCalled();
      expect(screen.getByText(/BELAMRI Meriem/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Utilisation des filtres Select", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockResolvedValue(mockResults);
    render(<CVTheque />);

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
    render(<CVTheque />);

    fireEvent.change(screen.getByPlaceholderText(/Rechercher un poste/i), {
      target: { value: "A" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const btn = await screen.findByText(/Voir Profil Complet/i);
    fireEvent.click(btn);

    expect(
      screen.getByText(/Expériences Professionnelles/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/@ SOMIZ/i)).toBeInTheDocument();
  });

  // --- 🔴 EDGE CASES (4/4) ---

  it("🔴 EC1 : Échec du chargement des filtres", async () => {
    jobsService.getConstants.mockRejectedValue(new Error("500"));
    render(<CVTheque />);

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
    render(<CVTheque />);

    fireEvent.change(screen.getByPlaceholderText(/Rechercher un poste/i), {
      target: { value: "Unknown" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText(/Aucun talent trouvé/i)).toBeInTheDocument();
    });
  });

  it("🔴 EC3 : Échec de la recherche API (Télémétrie)", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.searchCVtheque.mockRejectedValue(new Error("Fail"));
    render(<CVTheque />);

    fireEvent.change(screen.getByPlaceholderText(/Rechercher un poste/i), {
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
    render(<CVTheque />);

    fireEvent.change(screen.getByPlaceholderText(/Rechercher un poste/i), {
      target: { value: "Ali" },
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(screen.getByText("BA")).toBeInTheDocument();
    });
  });
});
