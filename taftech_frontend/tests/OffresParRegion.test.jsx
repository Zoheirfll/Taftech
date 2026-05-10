// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OffresParRegion from "../src/Pages/OffresParRegion";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS ---
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
  },
}));

const mockConstants = {
  wilayas: [
    { value: "16 - Alger", label: "16 - Alger" },
    { value: "31 - Oran", label: "31 - Oran" },
  ],
};

describe("🌍 UI & Logique - Composant <OffresParRegion />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS (2/2) ---

  it("🟢 HP1 : Chargement et affichage des Wilayas", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <OffresParRegion />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Les wilayas s'affichent correctement
      expect(screen.getByText("16 - Alger")).toBeInTheDocument();
      expect(screen.getByText("31 - Oran")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Les liens pointent vers la bonne URL avec paramètre encodé", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <OffresParRegion />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const lienOran = screen.getByRole("link", { name: /31 - Oran/i });

      // L'attribut href doit contenir la valeur encodée (ex: les espaces deviennent %20)
      expect(lienOran).toHaveAttribute("href", "/offres?wilaya=31%20-%20Oran");
    });
  });

  // --- 🔴 EDGE CASES (1/1) ---

  it("🔴 EC1 : Gestion robuste du crash API (Télémétrie)", async () => {
    jobsService.getConstants.mockRejectedValue(new Error("500 Internal Error"));

    render(
      <MemoryRouter>
        <OffresParRegion />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Le composant ne crashe pas, la grille est juste vide
      expect(
        screen.getByText(/Offres d'emploi en Algérie par/i),
      ).toBeInTheDocument();

      // La télémétrie capte l'erreur
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_WILAYAS",
        expect.anything(),
      );
    });
  });
});
