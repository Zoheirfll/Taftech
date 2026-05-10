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
import AdminOffres from "../src/Pages/Admin/AdminOffres";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminOffres: vi.fn(),
    moderateOffre: vi.fn(),
    exportOffres: vi.fn(),
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

const mockData = {
  count: 6,
  results: [
    {
      id: 1,
      titre: "Développeur React",
      entreprise: { nom_entreprise: "TechCorp" },
      date_publication: "2026-05-01",
      statut_moderation: "EN_ATTENTE",
      est_cloturee: false,
      description: "Description de l'offre React",
    },
  ],
};

describe("💼 UI & Logique - Composant <AdminOffres />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockImplementation(() => true);
    window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Happy Path 1 : Affichage des offres et badges", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);

    render(<AdminOffres />);

    await waitFor(() => {
      expect(screen.getByText("Développeur React")).toBeInTheDocument();
      expect(screen.getByText(/EN ATTENTE/i)).toBeInTheDocument();
    });
  });

  it("🟢 Happy Path 2 : Approbation d'une offre", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    jobsService.moderateOffre.mockResolvedValue({});

    render(<AdminOffres />);

    await waitFor(() => screen.getByTitle("Approuver"));
    fireEvent.click(screen.getByTitle("Approuver"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(jobsService.moderateOffre).toHaveBeenCalledWith(1, {
        statut_moderation: "APPROUVEE",
        motif_rejet: "",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Offre approuvée et en ligne !",
      );
    });
  });

  it("🟢 Happy Path 3 : Rejet d'une offre avec motif", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    jobsService.moderateOffre.mockResolvedValue({});

    render(<AdminOffres />);

    // Ouverture de la modale de rejet
    await waitFor(() => screen.getByTitle("Refuser"));
    fireEvent.click(screen.getByTitle("Refuser"));

    // Saisie du motif
    fireEvent.change(
      screen.getByPlaceholderText(/Ex: Le titre n'est pas clair/i),
      {
        target: { value: "Salaire manquant" },
      },
    );
    fireEvent.click(screen.getByText("Confirmer le rejet"));

    await waitFor(() => {
      expect(jobsService.moderateOffre).toHaveBeenCalledWith(1, {
        statut_moderation: "REJETEE",
        motif_rejet: "Salaire manquant",
      });
      expect(toast.success).toHaveBeenCalledWith("L'offre a été rejetée.");
    });
  });

  it("🟢 Happy Path 4 : Correction d'une offre", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    jobsService.moderateOffre.mockResolvedValue({});

    render(<AdminOffres />);

    await waitFor(() => screen.getByTitle("Corriger"));
    fireEvent.click(screen.getByTitle("Corriger"));

    // Modification du titre dans la modale
    const inputTitre = screen.getByDisplayValue("Développeur React");
    fireEvent.change(inputTitre, {
      target: { value: "Développeur React Senior" },
    });

    fireEvent.click(screen.getByText("Sauvegarder"));

    await waitFor(() => {
      expect(jobsService.moderateOffre).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          titre: "Développeur React Senior",
        }),
      );
      expect(toast.success).toHaveBeenCalledWith(
        "Offre corrigée avec succès !",
      );
    });
  });

  it("🟢 Happy Path 5 : Exportation Excel réussie", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    jobsService.exportOffres.mockResolvedValue(new Blob(["data"]));

    render(<AdminOffres />);

    await waitFor(() => screen.getByText(/EXPORTER EXCEL/i));
    fireEvent.click(screen.getByText(/EXPORTER EXCEL/i));

    await waitFor(() => {
      expect(jobsService.exportOffres).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Téléchargement réussi !");
    });
  });

  it("🟡 Edge Case : Empêcher le rejet sans motif", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);

    render(<AdminOffres />);

    await waitFor(() => screen.getByTitle("Refuser"));
    fireEvent.click(screen.getByTitle("Refuser"));

    // Clic direct sur confirmer sans rien écrire
    fireEvent.click(screen.getByText("Confirmer le rejet"));

    expect(jobsService.moderateOffre).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Veuillez saisir un motif.");
  });

  it("🔴 Edge Case : Erreur serveur déclenche reportError", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    jobsService.moderateOffre.mockRejectedValue(new Error("Database crash"));

    render(<AdminOffres />);

    await waitFor(() => screen.getByTitle("Approuver"));
    fireEvent.click(screen.getByTitle("Approuver"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_APPROBATION_OFFRE",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'approbation.");
    });
  });
});
