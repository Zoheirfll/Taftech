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
import AlertesEmploi from "../src/Pages/candidat/AlertesEmploi";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAlertes: vi.fn(),
    getConstants: vi.fn(),
    createAlerte: vi.fn(),
    toggleAlerte: vi.fn(),
    deleteAlerte: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAlertes = [
  {
    id: 1,
    mots_cles: "Développeur React",
    wilaya: "Oran",
    frequence: "QUOTIDIENNE",
    est_active: true,
  },
];

const mockConstants = {
  wilayas: [
    { value: "31", label: "Oran" },
    { value: "16", label: "Alger" },
  ],
};

describe("🔔 UI & Logique - Composant <AlertesEmploi />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Chargement initial et liste vide", async () => {
    jobsService.getAlertes.mockResolvedValue([]);
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(<AlertesEmploi />);

    await waitFor(() => {
      expect(
        screen.getByText(/Aucune alerte enregistrée/i),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Création d'une nouvelle alerte", async () => {
    jobsService.getAlertes.mockResolvedValue(mockAlertes);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.createAlerte.mockResolvedValue({
      id: 2,
      mots_cles: "Designer",
      wilaya: "",
      frequence: "HEBDOMADAIRE",
      est_active: true,
    });

    render(<AlertesEmploi />);
    await waitFor(() => screen.getByText("Développeur React"));

    fireEvent.click(screen.getByText(/Créer une alerte/i));

    const input = screen.getByPlaceholderText(/Ex: Développeur React/i);
    fireEvent.change(input, { target: { value: "Designer" } });

    fireEvent.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(jobsService.createAlerte).toHaveBeenCalledWith({
        mots_cles: "Designer",
        frequence: "QUOTIDIENNE",
      });
      expect(toast.success).toHaveBeenCalledWith("Alerte créée avec succès !");
      expect(screen.getByText("Designer")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Toggle Activer/Désactiver", async () => {
    jobsService.getAlertes.mockResolvedValue(mockAlertes);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.toggleAlerte.mockResolvedValue({});

    render(<AlertesEmploi />);
    await waitFor(() => screen.getByText("Développeur React"));

    const toggleInput = screen.getByRole("checkbox");
    expect(toggleInput).toBeChecked();

    fireEvent.click(toggleInput);

    await waitFor(() => {
      expect(jobsService.toggleAlerte).toHaveBeenCalledWith(1, false);
      expect(toast.success).toHaveBeenCalledWith("Alerte désactivée");
    });
  });

  it("🟢 HP4 : Suppression d'une alerte", async () => {
    jobsService.getAlertes.mockResolvedValue(mockAlertes);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.deleteAlerte.mockResolvedValue({});

    render(<AlertesEmploi />);
    await waitFor(() => screen.getByText("Développeur React"));

    const deleteBtn = screen.getByTitle("Supprimer");
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(jobsService.deleteAlerte).toHaveBeenCalledWith(1);
      expect(screen.queryByText("Développeur React")).not.toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Crash du chargement (500) -> reportError", async () => {
    jobsService.getAlertes.mockRejectedValue(new Error("API Down"));
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(<AlertesEmploi />);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_ALERTES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors du chargement des données.",
      );
    });
  });

  it("🔴 EC2 : Saisie fantôme (bloquée en front)", async () => {
    jobsService.getAlertes.mockResolvedValue(mockAlertes);
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(<AlertesEmploi />);
    await waitFor(() => screen.getByText("Créer une alerte"));

    fireEvent.click(screen.getByText("Créer une alerte"));
    fireEvent.change(screen.getByPlaceholderText(/Ex: Développeur React/i), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("Enregistrer"));

    expect(jobsService.createAlerte).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Les mots-clés sont obligatoires.",
    );
  });

  it("🔴 EC3 : Crash création -> modale reste ouverte, reportError", async () => {
    jobsService.getAlertes.mockResolvedValue(mockAlertes);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.createAlerte.mockRejectedValue(new Error("Server Error"));

    render(<AlertesEmploi />);
    await waitFor(() => screen.getByText("Créer une alerte"));

    fireEvent.click(screen.getByText("Créer une alerte"));
    fireEvent.change(screen.getByPlaceholderText(/Ex: Développeur React/i), {
      target: { value: "Admin" },
    });
    fireEvent.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CREATION_ALERTE",
        expect.anything(),
      );
      expect(
        screen.getByPlaceholderText(/Ex: Développeur React/i),
      ).toBeInTheDocument();
    });
  });

  it("🔴 EC4 : Rollback du toggle en cas d'erreur API", async () => {
    jobsService.getAlertes.mockResolvedValue(mockAlertes);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.toggleAlerte.mockRejectedValue(new Error("DB locked"));

    render(<AlertesEmploi />);
    await waitFor(() => screen.getByText("Développeur React"));

    const toggleInput = screen.getByRole("checkbox");
    fireEvent.click(toggleInput);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_TOGGLE_ALERTE",
        expect.anything(),
      );
      expect(toggleInput).toBeChecked();
    });
  });

  it("🔴 EC5 : Hésitation sur la suppression -> API bloquée", async () => {
    jobsService.getAlertes.mockResolvedValue(mockAlertes);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    window.confirm.mockImplementationOnce(() => false);

    render(<AlertesEmploi />);
    await waitFor(() => screen.getByText("Développeur React"));

    fireEvent.click(screen.getByTitle("Supprimer"));

    expect(jobsService.deleteAlerte).not.toHaveBeenCalled();
    expect(screen.getByText("Développeur React")).toBeInTheDocument();
  });

  it("🔴 EC6 : Crash de suppression -> reportError", async () => {
    jobsService.getAlertes.mockResolvedValue(mockAlertes);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.deleteAlerte.mockRejectedValue(new Error("Cannot delete"));

    render(<AlertesEmploi />);
    await waitFor(() => screen.getByText("Développeur React"));

    fireEvent.click(screen.getByTitle("Supprimer"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_SUPPRESSION_ALERTE",
        expect.anything(),
      );
      expect(screen.getByText("Développeur React")).toBeInTheDocument();
    });
  });
});
