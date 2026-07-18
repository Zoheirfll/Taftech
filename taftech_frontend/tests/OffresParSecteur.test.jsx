// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OffresParSecteur from "../src/Pages/Public/OffresParSecteur";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS ---
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
    getStatsGeo: vi.fn(),
  },
}));

const mockConstants = {
  secteurs: [
    { value: "A", label: "Agriculture et pêche" },
    { value: "B", label: "Énergie, extraction et hydrocarbure" },
    { value: "Z", label: "Secteur inconnu" }, // Non listé dans le iconsMap
  ],
};

describe("🚀 UI & Logique - Composant <OffresParSecteur />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getStatsGeo = vi.fn().mockResolvedValue({ wilayas: {}, secteurs: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS (3/3) ---

  it("🟢 HP1 : Chargement et affichage des secteurs avec la bonne icône", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);

    const { container } = render(
      <MemoryRouter>
        <OffresParSecteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Les labels s'affichent correctement
      expect(screen.getByText("Agriculture et pêche")).toBeInTheDocument();
      expect(screen.getByText("Énergie, extraction et hydrocarbure")).toBeInTheDocument();

      // Les icônes lucide-react associées s'affichent (A -> Sprout, B -> Flame)
      expect(container.querySelector(".lucide-sprout")).toBeInTheDocument();
      expect(container.querySelector(".lucide-flame")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Affichage de l'icône de fallback pour un secteur inconnu", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);

    const { container } = render(
      <MemoryRouter>
        <OffresParSecteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Secteur inconnu")).toBeInTheDocument();
      // Le secteur "Z" n'est pas dans le dictionnaire, on s'attend au fallback Briefcase
      expect(container.querySelector(".lucide-briefcase")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Les liens pointent vers la bonne URL avec le paramètre encodé", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <OffresParSecteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // On cherche le lien englobant le texte "Énergie, extraction et hydrocarbure"
      const linkEnergie = screen
        .getByText("Énergie, extraction et hydrocarbure")
        .closest("a");
      expect(linkEnergie).toHaveAttribute("href", "/offres?specialite=B");
    });
  });

  // --- 🔴 EDGE CASES (1/1) ---

  it("🔴 EC1 : Gestion robuste du crash API (Télémétrie)", async () => {
    jobsService.getConstants.mockRejectedValue(new Error("500 API Down"));

    render(
      <MemoryRouter>
        <OffresParSecteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Le composant ne crashe pas, le header est là
      expect(
        screen.getByText(/Offres par/i),
      ).toBeInTheDocument();

      // La télémétrie capte l'erreur
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_SECTEURS",
        expect.anything(),
      );
    });
  });
});
