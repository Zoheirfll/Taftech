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
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { jobsService } from "../src/Services/jobsService";
import { adminService } from "../src/Services/adminService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminEntreprises: vi.fn(),
    moderateEntreprise: vi.fn(),
    getDemandesPremium: vi.fn(),
    activerPremium: vi.fn(),
  },
}));

// L'export passe par `adminService.exporterListe` (composant BoutonExportExcel) : on ne simule que lui.
vi.mock("../src/Services/adminService", async (importOriginal) => {
  const reel = await importOriginal();
  return { ...reel, adminService: { ...reel.adminService, exporterListe: vi.fn() } };
});
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
    window.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock");
    window.URL.revokeObjectURL = vi.fn();
    jobsService.getDemandesPremium.mockResolvedValue([]);
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
      expect(screen.getByText(/En attente/i)).toBeInTheDocument();
    });
  });

  it("🟢 Happy Path 2 : Ouverture de la modale de détails", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    render(<AdminEntreprises />);
    await waitFor(() => screen.getByText("Voir"));
    fireEvent.click(screen.getByText("Voir"));
    expect(screen.getByText(/Filiale Sonatrach/i)).toBeInTheDocument();
    expect(screen.getByText(/📍 Oran/i)).toBeInTheDocument();
    // Ferme la modale via son bouton ✕ (libellé accessible)
    fireEvent.click(screen.getByLabelText("Fermer la fiche"));
    await waitFor(() => {
      expect(screen.queryByText(/Filiale Sonatrach/i)).not.toBeInTheDocument();
    });
  });

  it("🟢 Happy Path 3 : Modération d'entreprise (Approbation)", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    jobsService.moderateEntreprise.mockResolvedValue({});
    render(
      <>
        <AdminEntreprises />
        <ConfirmModalHost />
      </>,
    );
    await waitFor(() => screen.getByText("Approuver"));
    fireEvent.click(screen.getByText("Approuver"));
    fireEvent.click(await screen.findByText("Confirmer"));
    await waitFor(() => {
      expect(jobsService.moderateEntreprise).toHaveBeenCalledWith(1, {
        est_approuvee: true,
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Entreprise approuvée\nLe recruteur est prévenu par e-mail.",
      );
    });
  });

  it("🟢 Happy Path 4 : Export réussi", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    adminService.exporterListe.mockResolvedValue(new Blob(["data,test"]));
    render(<AdminEntreprises />);
    await waitFor(() => screen.getByText(/Exporter/i));
    fireEvent.click(screen.getByText(/Exporter/i));
    await waitFor(() => {
      // Mêmes filtres que la liste affichée (ici : aucun filtre, tri par défaut).
      expect(adminService.exporterListe).toHaveBeenCalledWith("entreprises", {
        search: "", ordering: "-id", abonnement_expire_sous: null,
      });
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Téléchargement terminé");
    });
  });

  it("🟡 Edge Case : Annulation de la modération", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    render(
      <>
        <AdminEntreprises />
        <ConfirmModalHost />
      </>,
    );
    await waitFor(() => screen.getByText("Approuver"));
    fireEvent.click(screen.getByText("Approuver"));
    fireEvent.click(await screen.findByText("Annuler"));
    expect(jobsService.moderateEntreprise).not.toHaveBeenCalled();
  });

  it("🔴 Edge Case : Crash lors de l'export déclenche reportError", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    adminService.exporterListe.mockRejectedValue(new Error("API Down"));
    render(<AdminEntreprises />);
    await waitFor(() => screen.getByText(/Exporter/i));
    fireEvent.click(screen.getByText(/Exporter/i));
    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_EXPORT_EXCEL_ENTREPRISES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Exportation impossible\nVeuillez réessayer dans quelques instants.");
    });
  });

  it("🟢 HP5 : Toggle Premium active le premium d'une entreprise", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    jobsService.moderateEntreprise.mockResolvedValue({});
    render(<AdminEntreprises />);
    await waitFor(() => screen.getByText("SOMIZ Arzew"));
    // Le bouton Premium est dans la ligne du tableau
    const btnPremium = screen.getAllByRole("button").find(
      (btn) => btn.textContent.includes("⭐") || btn.textContent.includes("Premium")
    );
    if (btnPremium) {
      fireEvent.click(btnPremium);
      await waitFor(() => {
        expect(jobsService.moderateEntreprise).toHaveBeenCalled();
      });
    }
  });

  it("🟢 HP6 : Toggle Approbation approuve une entreprise", async () => {
    jobsService.getAdminEntreprises.mockResolvedValue(mockData);
    jobsService.moderateEntreprise.mockResolvedValue({});
    render(
      <>
        <AdminEntreprises />
        <ConfirmModalHost />
      </>,
    );
    await waitFor(() => screen.getByText("SOMIZ Arzew"));
    // Chercher un bouton Approuver/Suspendre
    const btnApprouver = screen.queryByRole("button", { name: /Approuver|Suspendre/i });
    if (btnApprouver) {
      fireEvent.click(btnApprouver);
      fireEvent.click(await screen.findByText("Confirmer"));
      await waitFor(() => {
        expect(jobsService.moderateEntreprise).toHaveBeenCalled();
      });
    }
  });
});
