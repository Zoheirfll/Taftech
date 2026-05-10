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
import AdminEntreprises from "../src/Pages/Admin/AdminEntreprises";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminEntreprises: vi.fn(),
    moderateEntreprise: vi.fn(),
    exportEntreprises: vi.fn(),
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
  count: 6, // Plus de 5 pour forcer la pagination
  results: [
    {
      id: 1,
      nom_entreprise: "SOMIZ Arzew",
      secteur_activite: "Pétrochimie",
      registre_commerce: "RC12345",
      last_name: "Belamri",
      first_name: "Meriem",
      email: "rh@somiz.dz",
      telephone: "0555000000",
      est_approuvee: false,
      wilaya_siege: "Oran",
      commune_siege: "Arzew",
      description: "Filiale Sonatrach.",
    },
  ],
};

describe("🏢 UI & Logique - Composant <AdminEntreprises />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    vi.spyOn(window, "confirm").mockImplementation(() => true); // Accepte les popups
    window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Happy Path 1 : Chargement et affichage des données", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);

    render(<AdminEntreprises />);

    await waitFor(() => {
      expect(screen.getByText("SOMIZ Arzew")).toBeInTheDocument();
      expect(screen.getByText(/EN ATTENTE/i)).toBeInTheDocument();
    });
  });

  it("🟢 Happy Path 2 : Ouverture de la modale de détails", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    render(<AdminEntreprises />);

    await waitFor(() => screen.getByText("VOIR"));

    // Ouvre la modale
    fireEvent.click(screen.getByText("VOIR"));

    expect(screen.getByText(/Filiale Sonatrach/i)).toBeInTheDocument();
    expect(screen.getByText(/📍 Siège : Oran/i)).toBeInTheDocument();

    // Ferme la modale
    fireEvent.click(screen.getByText("✕"));
    expect(screen.queryByText(/Filiale Sonatrach/i)).not.toBeInTheDocument();
  });

  it("🟢 Happy Path 3 : Modération d'entreprise (Approbation)", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    jobsService.moderateEntreprise.mockResolvedValue({});

    render(<AdminEntreprises />);

    await waitFor(() => screen.getByText("APPROUVER"));

    fireEvent.click(screen.getByText("APPROUVER"));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(jobsService.moderateEntreprise).toHaveBeenCalledWith(1, {
        est_approuvee: true,
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Statut mis à jour avec succès !",
      );
    });
  });
  it("🟢 Happy Path 4 : Export Excel réussi", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    jobsService.exportEntreprises.mockResolvedValue(new Blob(["data,test"]));

    render(<AdminEntreprises />);

    // ✅ CORRECTION : On utilise / /i pour ignorer l'émoji 📊
    await waitFor(() => screen.getByText(/EXPORTER EXCEL/i));

    // ✅ CORRECTION
    fireEvent.click(screen.getByText(/EXPORTER EXCEL/i));

    await waitFor(() => {
      expect(jobsService.exportEntreprises).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Téléchargement réussi !");
    });
  });
  it("🟡 Edge Case : Annulation de la modération", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    window.confirm.mockImplementationOnce(() => false); // L'admin annule

    render(<AdminEntreprises />);

    await waitFor(() => screen.getByText("APPROUVER"));
    fireEvent.click(screen.getByText("APPROUVER"));

    expect(window.confirm).toHaveBeenCalled();
    expect(jobsService.moderateEntreprise).not.toHaveBeenCalled();
  });

  it("🔴 Edge Case : Crash lors de l'export Excel déclenche reportError", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    jobsService.exportEntreprises.mockRejectedValue(new Error("API Down"));

    render(<AdminEntreprises />);

    const exportBtn = screen.getByText(/EXPORTER EXCEL/i);
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_EXPORT_EXCEL_ENTREPRISES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'exportation.");
    });
  });
});
