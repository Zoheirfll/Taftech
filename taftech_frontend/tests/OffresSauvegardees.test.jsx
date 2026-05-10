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
import OffresSauvegardees from "../src/Pages/candidat/OffresSauvegardees";
import api from "../src/api/axiosConfig";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/api/axiosConfig", () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockFavoris = [
  {
    id: 1,
    date_sauvegarde: "2026-05-01",
    offre_detail: {
      id: 10,
      titre: "Ingénieur React",
      wilaya: "Alger",
      entreprise: { nom_entreprise: "TafTech" },
    },
  },
];

describe("🔖 UI & Logique - Composant <OffresSauvegardees />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Affichage de la liste des favoris", async () => {
    api.get.mockResolvedValue({ data: mockFavoris });

    render(
      <MemoryRouter>
        <OffresSauvegardees />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Ingénieur React")).toBeInTheDocument();
      expect(screen.getByText("TafTech")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Affichage de l'état vide", async () => {
    api.get.mockResolvedValue({ data: [] });

    render(
      <MemoryRouter>
        <OffresSauvegardees />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucune offre enregistrée/i)).toBeInTheDocument();
      expect(screen.getByText(/Explorer les offres/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Suppression d'un favori (Optimistic UI)", async () => {
    api.get.mockResolvedValue({ data: mockFavoris });
    api.delete.mockResolvedValue({});

    render(
      <MemoryRouter>
        <OffresSauvegardees />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Ingénieur React"));

    fireEvent.click(screen.getByTitle("Retirer des favoris"));

    // Vérifie la mise à jour immédiate (Optimistic)
    expect(screen.queryByText("Ingénieur React")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith("jobs/sauvegardes/1/");
      expect(toast.success).toHaveBeenCalledWith("Offre retirée des favoris.");
    });
  });

  it("🔴 EC1 : Erreur de chargement déclenche reportError", async () => {
    api.get.mockRejectedValue(new Error("Server Down"));

    render(
      <MemoryRouter>
        <OffresSauvegardees />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_FAVORIS",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors du chargement de vos offres sauvegardées.",
      );
    });
  });

  it("🔴 EC2 : Erreur de suppression effectue un Rollback", async () => {
    api.get.mockResolvedValue({ data: mockFavoris });
    api.delete.mockRejectedValue(new Error("Delete failed"));

    render(
      <MemoryRouter>
        <OffresSauvegardees />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Ingénieur React"));

    fireEvent.click(screen.getByTitle("Retirer des favoris"));

    // UI disparaît d'abord
    expect(screen.queryByText("Ingénieur React")).not.toBeInTheDocument();

    await waitFor(() => {
      // Puis réapparaît suite au catch/rollback
      expect(screen.getByText("Ingénieur React")).toBeInTheDocument();
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_SUPPRESSION_FAVORI",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la suppression.",
      );
    });
  });
});
