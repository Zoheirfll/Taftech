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
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { jobsService } from "../src/Services/jobsService";
import { adminService } from "../src/Services/adminService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminOffres: vi.fn(),
    moderateOffre: vi.fn(),
    corrigerOffre: vi.fn(),
    getConstants: vi.fn(),
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
      const badges = screen.getAllByText(/En attente/i);
      expect(badges.some((el) => el.tagName === "SPAN")).toBe(true);
    });
  });

  it("🟢 Happy Path 2 : Approbation d'une offre", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    jobsService.moderateOffre.mockResolvedValue({});

    render(
      <>
        <AdminOffres />
        <ConfirmModalHost />
      </>,
    );

    await waitFor(() => screen.getByTitle("Approuver"));
    fireEvent.click(screen.getByTitle("Approuver"));
    fireEvent.click(await screen.findByText("Confirmer"));

    await waitFor(() => {
      expect(jobsService.moderateOffre).toHaveBeenCalledWith(1, {
        statut_moderation: "APPROUVEE",
        motif_rejet: "",
      });
      expect(toast.success).toHaveBeenCalledWith("Offre approuvée");
    });
  });

  it("🟢 Happy Path 3 : Rejet d'une offre avec motif", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    jobsService.moderateOffre.mockResolvedValue({});

    render(<AdminOffres />);

    // Ouverture de la modale de rejet
    await waitFor(() => screen.getByTitle("Rejeter"));
    fireEvent.click(screen.getByTitle("Rejeter"));

    // Saisie du motif
    fireEvent.change(
      document.querySelector('textarea'),
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
      expect(toast.success).toHaveBeenCalledWith(
        "Offre rejetée\nLe recruteur voit le motif dans son tableau de bord.",
      );
    });
  });

  it("🟢 Happy Path 4 : Correction d'une offre", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    jobsService.corrigerOffre.mockResolvedValue({});
    jobsService.getConstants.mockResolvedValue({ wilayas: [], experiences: [], contrats: [] });

    render(<AdminOffres />);

    await waitFor(() => screen.getByTitle("Corriger"));
    fireEvent.click(screen.getByTitle("Corriger"));

    // Modification du titre dans la modale
    const inputTitre = screen.getByDisplayValue("Développeur React");
    fireEvent.change(inputTitre, {
      target: { value: "Développeur React Senior" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Enregistrer \(1 changement\)/ }));

    await waitFor(() => {
      // Seuls les champs modifiés partent, jamais le statut de modération.
      expect(jobsService.corrigerOffre).toHaveBeenCalledWith(1, { titre: "Développeur React Senior" });
      expect(toast.success).toHaveBeenCalledWith("Offre corrigée\nLe recruteur a été prévenu par e-mail.");
    });
  });

  it("🔒 Le bouton Corriger n'existe que pour une offre en attente", async () => {
    jobsService.getAdminOffres.mockResolvedValue({
      results: [{ ...mockData.results[0], statut_moderation: "APPROUVEE" }],
      count: 1, total_pages: 1,
    });
    render(<AdminOffres />);
    await waitFor(() => screen.getByText("Développeur React"));
    expect(screen.queryByTitle("Corriger")).toBeNull();
  });

  it("🟢 Happy Path 5 : Exportation Excel réussie", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    adminService.exporterListe.mockResolvedValue(new Blob(["data"]));

    render(<AdminOffres />);

    await waitFor(() => screen.getByText(/Exporter/i));
    fireEvent.click(screen.getByText(/Exporter/i));

    await waitFor(() => {
      // Mêmes filtres que la liste affichée (ici : aucun filtre, tri par défaut).
      expect(adminService.exporterListe).toHaveBeenCalledWith("offres", {
        search: "", statut: "", ordering: "-date_publication",
      });
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Téléchargement terminé");
    });
  });

  it("🟡 Edge Case : Empêcher le rejet sans motif", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);

    render(<AdminOffres />);

    await waitFor(() => screen.getByTitle("Rejeter"));
    fireEvent.click(screen.getByTitle("Rejeter"));

    // Clic direct sur confirmer sans rien écrire
    fireEvent.click(screen.getByText("Confirmer le rejet"));

    expect(jobsService.moderateOffre).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Motif manquant\nSaisissez un motif de rejet.");
  });

  it("🔴 Edge Case : Erreur serveur déclenche reportError", async () => {
    jobsService.getAdminOffres.mockResolvedValue(mockData);
    jobsService.moderateOffre.mockRejectedValue(new Error("Database crash"));

    render(
      <>
        <AdminOffres />
        <ConfirmModalHost />
      </>,
    );

    await waitFor(() => screen.getByTitle("Approuver"));
    fireEvent.click(screen.getByTitle("Approuver"));
    fireEvent.click(await screen.findByText("Confirmer"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_APPROBATION_OFFRE",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Approbation impossible\nVeuillez réessayer dans quelques instants.");
    });
  });

  describe("🎓 Fiche d'une offre : formation requise", () => {
    const masters = [
      { id: 1, code: "D-MAS-A", libelle: "Master académique" },
      { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
      { id: 3, code: "D-MAS-NP", libelle: "Master à nature non précisée" },
      { id: 8, code: "D-ING", libelle: "Diplôme d'ingénieur d'État" },
    ];
    const specialites = [
      { id: 10, libelle: "Réseaux", domaine_id: 5, domaine_libelle: "Informatique", domaine_total: 20, domaine_non_retenues: [] },
      { id: 11, libelle: "Génie logiciel", domaine_id: 5, domaine_libelle: "Informatique", domaine_total: 20, domaine_non_retenues: [] },
    ];

    const ouvrirFiche = async (offre) => {
      jobsService.getAdminOffres.mockResolvedValue({ count: 1, results: [{ ...mockData.results[0], ...offre }] });
      render(<AdminOffres />);
      await waitFor(() => screen.getByTitle("Voir"));
      fireEvent.click(screen.getByTitle("Voir"));
    };

    it("🟢 Montre la phrase lue par le candidat, avec les trois masters regroupés", async () => {
      await ouvrirFiche({ diplomes_requis_detail: masters, specialites_requises_detail: specialites });
      expect(await screen.findByText("Master / Ingéniorat (Bac +5) en Réseaux et Génie logiciel")).toBeInTheDocument();
      expect(screen.getByText("Master / Ingéniorat (Bac +5)")).toBeInTheDocument();
      expect(screen.queryByText("Master académique")).toBeNull();
    });

    it("🟢 Les compétences sont aussi écrites en phrases dans « Ce que le candidat lit »", async () => {
      await ouvrirFiche({
        diplomes_requis_detail: masters,
        specialites_requises_detail: specialites,
        competences_requises: [{ id: 1, label: "Docker", type_exigence: "SOUHAITEE", niveau_requis: "" }],
      });
      expect(await screen.findByText("Compétences souhaitées : Docker.")).toBeInTheDocument();
    });

    it("🟢 L'admin garde le détail des spécialités pour modérer", async () => {
      await ouvrirFiche({ diplomes_requis_detail: masters, specialites_requises_detail: specialites });
      await screen.findByText(/Ce que le candidat lit/);
      expect(screen.getByText("Réseaux")).toBeInTheDocument();
      expect(screen.getByText("Génie logiciel")).toBeInTheDocument();
    });
  });
});
