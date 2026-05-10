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
import AdminCandidatures from "../src/Pages/Admin/AdminCandidatures";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminCandidatures: vi.fn(),
    exportCandidatures: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    loading: vi.fn(() => "toast-id"),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}));

// Données fictives pour simuler l'API
const mockData = {
  count: 15,
  results: [
    {
      id: 101,
      date_postulation: "2026-05-01T10:00:00Z",
      candidat: { last_name: "Doe", first_name: "John" },
      est_rapide: false,
      offre_titre: "Développeur Fullstack",
      entreprise_nom: "TafTech",
      score_matching: 95,
      note_globale: 18,
      statut: "ENTRETIEN",
    },
  ],
};

describe("📊 UI & Logique - Composant <AdminCandidatures />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});

    // ✅ CORRECTION : On utilise 'window' au lieu de 'global'
    window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-url");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Happy Path 1 : Chargement et affichage des données", async () => {
    jobsService.getAdminCandidatures.mockResolvedValue(mockData);

    render(<AdminCandidatures />);

    await waitFor(() => {
      expect(screen.getByText(/Doe John/i)).toBeInTheDocument();
      expect(screen.getByText(/Développeur Fullstack/i)).toBeInTheDocument();
      expect(screen.getByText(/Page 1 sur 2/i)).toBeInTheDocument();
    });
  });

  it("🟢 Happy Path 2 : Recherche de candidature", async () => {
    jobsService.getAdminCandidatures.mockResolvedValue(mockData);
    render(<AdminCandidatures />);

    const searchInput = screen.getByPlaceholderText(/Rechercher un candidat/i);
    const searchButton = screen.getByText(/Chercher/i);

    fireEvent.change(searchInput, { target: { value: "TafTech" } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(jobsService.getAdminCandidatures).toHaveBeenCalledWith(
        1,
        "TafTech",
      );
    });
  });

  it("🟢 Happy Path 3 : Exportation Excel réussie", async () => {
    jobsService.getAdminCandidatures.mockResolvedValue({
      count: 0,
      results: [],
    });
    jobsService.exportCandidatures.mockResolvedValue(new Blob(["test data"]));

    render(<AdminCandidatures />);

    const exportBtn = screen.getByText(/EXPORTER EN EXCEL/i);
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(jobsService.exportCandidatures).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Téléchargement réussi !");
      // ✅ CORRECTION : On vérifie l'appel sur 'window'
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it("🔴 Edge Case : Crash chargement API déclenche reportError", async () => {
    jobsService.getAdminCandidatures.mockRejectedValue(
      new Error("Database crash"),
    );

    render(<AdminCandidatures />);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_CANDIDATURES_ADMIN",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors du chargement des candidatures.",
      );
      expect(
        screen.getByText(/Aucune candidature trouvée/i),
      ).toBeInTheDocument();
    });
  });
});
