// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OffresParSecteur from "../src/Pages/OffresParSecteur";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS ---
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
  },
}));

const mockConstants = {
  secteurs: [
    { value: "IT", label: "Informatique" },
    { value: "FINANCE", label: "Finance & Comptabilité" },
    { value: "AEROSPATIAL", label: "Aérospatial" }, // Secteur non listé dans le iconsMap
  ],
};

describe("🚀 UI & Logique - Composant <OffresParSecteur />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS (3/3) ---

  it("🟢 HP1 : Chargement et affichage des secteurs avec la bonne icône", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <OffresParSecteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Les labels s'affichent correctement
      expect(screen.getByText("Informatique")).toBeInTheDocument();
      expect(screen.getByText("Finance & Comptabilité")).toBeInTheDocument();

      // Les icônes associées s'affichent (Informatique -> 💻, Finance -> 💰)
      expect(screen.getByText("💻")).toBeInTheDocument();
      expect(screen.getByText("💰")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Affichage de l'icône de fallback pour un secteur inconnu", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <OffresParSecteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Aérospatial")).toBeInTheDocument();
      // Le secteur Aérospatial n'est pas dans le dictionnaire, on s'attend au fallback 💼
      expect(screen.getByText("💼")).toBeInTheDocument();
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
      // On cherche le lien englobant le texte "Finance & Comptabilité"
      const linkFinance = screen
        .getByText("Finance & Comptabilité")
        .closest("a");
      expect(linkFinance).toHaveAttribute("href", "/offres?specialite=FINANCE");
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
        screen.getByText(/Offres d'emploi en Algérie par/i),
      ).toBeInTheDocument();

      // La télémétrie capte l'erreur
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_SECTEURS",
        expect.anything(),
      );
    });
  });
});
