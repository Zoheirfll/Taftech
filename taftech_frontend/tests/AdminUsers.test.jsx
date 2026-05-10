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
import AdminUsers from "../src/Pages/Admin/AdminUsers";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminUsers: vi.fn(),
    moderateUser: vi.fn(),
    exportUtilisateurs: vi.fn(),
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

const mockDataNormal = {
  count: 1,
  results: [
    {
      id: 1,
      first_name: "Bruce",
      last_name: "Wayne",
      email: "batman@gotham.com",
      username: "bwayne",
      role: "CANDIDAT",
      is_active: true,
      date_joined: "2026-01-01",
      profil_candidat: {
        photo_profil: "/media/batman.jpg",
        titre_professionnel: "Détective",
        competences: "Arts martiaux, Furtivité",
        cv_pdf: "/media/cv.pdf",
      },
    },
  ],
};

const mockDataEmptyProfile = {
  count: 1,
  results: [
    {
      id: 2,
      first_name: "Clark",
      last_name: "Kent",
      email: "clark@dailyplanet.com",
      role: "RECRUTEUR",
      is_active: false,
      date_joined: "2026-01-02",
      profil_candidat: null,
    },
  ],
};

describe("👥 UI & Logique - Composant <AdminUsers />", () => {
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

  it("🟢 HP1 : Chargement et affichage des utilisateurs", async () => {
    jobsService.getAdminUsers.mockResolvedValue(mockDataNormal);
    render(<AdminUsers />);
    await waitFor(() => {
      expect(screen.getByText("Wayne Bruce")).toBeInTheDocument();
      expect(screen.getByText("CANDIDAT")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Modale d'inspection avec tags générés", async () => {
    jobsService.getAdminUsers.mockResolvedValue(mockDataNormal);
    render(<AdminUsers />);

    await waitFor(() => screen.getByText("INSPECTER"));
    fireEvent.click(screen.getByText("INSPECTER"));

    expect(screen.getByText(/Détective/i)).toBeInTheDocument();
    expect(screen.getByText("Furtivité")).toBeInTheDocument();
    expect(screen.getByText(/TÉLÉCHARGER LE CV PDF/i)).toBeInTheDocument();
  });

  it("🟢 HP3 : Blocage d'un utilisateur", async () => {
    jobsService.getAdminUsers.mockResolvedValue(mockDataNormal);
    jobsService.moderateUser.mockResolvedValue({});

    render(<AdminUsers />);
    await waitFor(() => screen.getByText("BLOQUER"));

    fireEvent.click(screen.getByText("BLOQUER"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(jobsService.moderateUser).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Utilisateur bloqué.");
    });
  });

  it("🟢 HP4 : Exportation CSV réussie", async () => {
    jobsService.getAdminUsers.mockResolvedValue(mockDataNormal);
    jobsService.exportUtilisateurs.mockResolvedValue(new Blob(["data"]));

    render(<AdminUsers />);
    await waitFor(() => screen.getByText(/EXPORTER EXCEL/i));

    fireEvent.click(screen.getByText(/EXPORTER EXCEL/i));

    await waitFor(() => {
      expect(jobsService.exportUtilisateurs).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Téléchargement réussi !");
    });
  });

  it("🔴 EC1 : Recherche vide -> Affiche 'Aucun utilisateur'", async () => {
    jobsService.getAdminUsers.mockResolvedValue({ count: 0, results: [] });
    render(<AdminUsers />);
    await waitFor(() => {
      expect(screen.getByText(/Aucun utilisateur trouvé/i)).toBeInTheDocument();
    });
  });

  it("🔴 EC2 : Crash API chargement -> reportError consigné", async () => {
    jobsService.getAdminUsers.mockRejectedValue(new Error("API Down"));
    render(<AdminUsers />);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_USERS_ADMIN",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur de chargement des utilisateurs.",
      );
    });
  });

  it("🔴 EC3 : Annulation Modération -> API préservée", async () => {
    jobsService.getAdminUsers.mockResolvedValue(mockDataNormal);
    window.confirm.mockImplementationOnce(() => false);

    render(<AdminUsers />);
    await waitFor(() => screen.getByText("BLOQUER"));
    fireEvent.click(screen.getByText("BLOQUER"));

    expect(window.confirm).toHaveBeenCalled();
    expect(jobsService.moderateUser).not.toHaveBeenCalled();
  });

  it("🔴 EC4 : Crash Modération -> reportError consigné", async () => {
    jobsService.getAdminUsers.mockResolvedValue(mockDataNormal);
    jobsService.moderateUser.mockRejectedValue(new Error("Server Error"));

    render(<AdminUsers />);
    await waitFor(() => screen.getByText("BLOQUER"));
    fireEvent.click(screen.getByText("BLOQUER"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_MODERATION_USER",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la modification du statut.",
      );
    });
  });

  it("🔴 EC5 : Crash Exportation -> Toast dismiss et reportError", async () => {
    jobsService.getAdminUsers.mockResolvedValue(mockDataNormal);
    jobsService.exportUtilisateurs.mockRejectedValue(new Error("File Error"));

    render(<AdminUsers />);
    await waitFor(() => screen.getByText(/EXPORTER EXCEL/i));
    fireEvent.click(screen.getByText(/EXPORTER EXCEL/i));

    await waitFor(() => {
      expect(toast.dismiss).toHaveBeenCalled();
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_EXPORT_EXCEL_USERS",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'exportation.");
    });
  });

  it("🔴 EC6 : Inspecter un profil vide (sans crash renderTags)", async () => {
    jobsService.getAdminUsers.mockResolvedValue(mockDataEmptyProfile);
    render(<AdminUsers />);

    await waitFor(() => screen.getByText("INSPECTER"));
    fireEvent.click(screen.getByText("INSPECTER"));

    expect(
      screen.queryByText(/TÉLÉCHARGER LE CV PDF/i),
    ).not.toBeInTheDocument();
  });
});
