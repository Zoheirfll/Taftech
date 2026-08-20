// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminBannieres from "../src/Pages/Admin/AdminBannieres";
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminSiteAnnonces: vi.fn(),
    createSiteAnnonce: vi.fn(),
    updateSiteAnnonce: vi.fn(),
    deleteSiteAnnonce: vi.fn(),
    getAdminBannieresAccueil: vi.fn(),
    createBanniereAccueil: vi.fn(),
    updateBanniereAccueil: vi.fn(),
    deleteBanniereAccueil: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockAnnonces = [
  { id: 1, texte: "Promo Premium -20%", lien_url: "", lien_label: "", type_annonce: "INFO", actif: true },
  { id: 2, texte: "Ancienne annonce", lien_url: "", lien_label: "", type_annonce: "WARNING", actif: false },
];

const mockBannieres = [
  { id: 1, image: "bannieres_accueil/promo1.jpg", titre: "Promo été", lien_url: "", ordre: 0, actif: true },
];

describe("🖼️ UI & Logique - Composant <AdminBannieres />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminSiteAnnonces.mockResolvedValue(mockAnnonces);
    jobsService.getAdminBannieresAccueil.mockResolvedValue(mockBannieres);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Chargement et affichage des annonces (onglet par défaut)", async () => {
    render(
      <MemoryRouter>
        <AdminBannieres />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Promo Premium -20%")).toBeInTheDocument();
      expect(screen.getByText("Ancienne annonce")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Statut Active/Inactive affiché", async () => {
    render(
      <MemoryRouter>
        <AdminBannieres />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Bascule vers l'onglet Carrousel accueil", async () => {
    render(
      <MemoryRouter>
        <AdminBannieres />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Promo Premium -20%"));
    fireEvent.click(screen.getByText("Carrousel accueil"));

    await waitFor(() => {
      expect(screen.getByText("Promo été")).toBeInTheDocument();
    });
  });

  it("🟢 HP4 : Création d'une annonce réussie", async () => {
    jobsService.createSiteAnnonce.mockResolvedValue({ id: 3, texte: "Nouvelle annonce", actif: false });

    render(
      <MemoryRouter>
        <AdminBannieres />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouvelle annonce/i));
    fireEvent.click(screen.getByText(/Nouvelle annonce/i));

    const texteInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(texteInput, { target: { value: "Nouvelle annonce" } });

    const form = texteInput.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(jobsService.createSiteAnnonce).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Annonce créée !");
    });
  });

  it("🟢 HP5 : Suppression d'une annonce réussie", async () => {
    jobsService.deleteSiteAnnonce.mockResolvedValue({});

    render(
      <MemoryRouter>
        <AdminBannieres />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Promo Premium -20%"));
    const allButtons = screen.getAllByRole("button");
    // 0 = Nouvelle annonce, 1-2 = onglets, 3 = pencil(annonce1), 4 = trash(annonce1)
    fireEvent.click(allButtons[4]);
    fireEvent.click(await screen.findByText("Confirmer"));

    await waitFor(() => {
      expect(jobsService.deleteSiteAnnonce).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Annonce supprimée.");
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getAdminSiteAnnonces.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <AdminBannieres />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ADMIN_BANNIERES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur de chargement.");
    });
  });

  it("🔴 EC2 : Texte vide bloque la création d'annonce", async () => {
    render(
      <MemoryRouter>
        <AdminBannieres />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouvelle annonce/i));
    fireEvent.click(screen.getByText(/Nouvelle annonce/i));

    const texteInput = screen.getAllByRole("textbox")[0];
    const form = texteInput.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Le texte est obligatoire.");
      expect(jobsService.createSiteAnnonce).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Aucune bannière configurée dans le carrousel", async () => {
    jobsService.getAdminBannieresAccueil.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminBannieres />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Promo Premium -20%"));
    fireEvent.click(screen.getByText("Carrousel accueil"));

    await waitFor(() => {
      expect(screen.getByText(/Aucune bannière configurée/i)).toBeInTheDocument();
    });
  });
});
