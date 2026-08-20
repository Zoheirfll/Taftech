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
import AdminPremium from "../src/Pages/Admin/AdminPremium";
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminPremiumPlans: vi.fn(),
    createPremiumPlan: vi.fn(),
    updatePremiumPlan: vi.fn(),
    deletePremiumPlan: vi.fn(),
    getAdminPremiumAvantages: vi.fn(),
    createPremiumAvantage: vi.fn(),
    updatePremiumAvantage: vi.fn(),
    deletePremiumAvantage: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockPlans = [
  { id: 1, nb_mois: 1, label: "Mensuel", prix_da: 2000, populaire: false, actif: true, ordre: 0 },
  { id: 2, nb_mois: 6, label: "Semestriel", prix_da: 11040, populaire: true, actif: true, ordre: 2 },
  { id: 3, nb_mois: 24, label: "24 mois (ancien)", prix_da: 40000, populaire: false, actif: false, ordre: 4 },
];

const mockAvantages = [
  { id: 1, icone: "Mail", titre: "Coordonnées candidats", description: "Email et téléphone visibles.", ordre: 0, actif: true },
  { id: 2, icone: "Sparkles", titre: "Analyses IA", description: "Score de matching détaillé.", ordre: 1, actif: false },
];

describe("💳 UI & Logique - Composant <AdminPremium />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminPremiumPlans.mockResolvedValue(mockPlans);
    jobsService.getAdminPremiumAvantages.mockResolvedValue(mockAvantages);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Chargement et affichage des paliers d'abonnement", async () => {
    render(
      <MemoryRouter>
        <AdminPremium />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Mensuel").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Semestriel").length).toBeGreaterThan(0);
      expect(screen.getByText("11 040 DA")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Badge Populaire affiché sur le bon palier", async () => {
    render(
      <MemoryRouter>
        <AdminPremium />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Populaire")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Statut actif/inactif des paliers", async () => {
    render(
      <MemoryRouter>
        <AdminPremium />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("Actif").length).toBe(2);
      expect(screen.getByText("Inactif")).toBeInTheDocument();
    });
  });

  it("🟢 HP4 : Bascule vers l'onglet Avantages", async () => {
    render(
      <MemoryRouter>
        <AdminPremium />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Mensuel"));
    fireEvent.click(screen.getByText("Avantages"));

    await waitFor(() => {
      expect(screen.getByText("Coordonnées candidats")).toBeInTheDocument();
      expect(screen.getByText("Analyses IA")).toBeInTheDocument();
    });
  });

  it("🟢 HP5 : Création d'un palier réussie", async () => {
    jobsService.createPremiumPlan.mockResolvedValue({ id: 4, nb_mois: 3, label: "3 mois", prix_da: 6000, populaire: false, actif: true, ordre: 1 });

    render(
      <MemoryRouter>
        <AdminPremium />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Ajouter un palier/i));
    fireEvent.click(screen.getByText(/Ajouter un palier/i));

    fireEvent.change(screen.getByPlaceholderText("Ex: 6 mois"), { target: { value: "3 mois" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: 11040"), { target: { value: "6000" } });

    const durInput = screen.getByText(/Durée \(mois\)/i).closest("div").querySelector("input");
    fireEvent.change(durInput, { target: { value: "3" } });

    const form = screen.getByPlaceholderText("Ex: 6 mois").closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(jobsService.createPremiumPlan).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Palier ajouté !");
    });
  });

  it("🟢 HP6 : Suppression d'un palier réussie", async () => {
    jobsService.deletePremiumPlan.mockResolvedValue({});

    render(
      <MemoryRouter>
        <AdminPremium />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Mensuel"));
    const allButtons = screen.getAllByRole("button");
    // 0 = Ajouter, 1-2 = onglets Abonnements/Avantages, 3 = pencil(Mensuel), 4 = trash(Mensuel)
    fireEvent.click(allButtons[4]);
    fireEvent.click(await screen.findByText("Confirmer"));

    await waitFor(() => {
      expect(jobsService.deletePremiumPlan).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Palier supprimé.");
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getAdminPremiumPlans.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <AdminPremium />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ADMIN_PREMIUM",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur de chargement.");
    });
  });

  it("🔴 EC2 : Prix à 0 bloque la création d'un palier", async () => {
    render(
      <MemoryRouter>
        <AdminPremium />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Ajouter un palier/i));
    fireEvent.click(screen.getByText(/Ajouter un palier/i));

    const durInput = screen.getByText(/Durée \(mois\)/i).closest("div").querySelector("input");
    fireEvent.change(durInput, { target: { value: "3" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: 6 mois"), { target: { value: "3 mois" } });

    const form = screen.getByPlaceholderText("Ex: 6 mois").closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Le prix doit être supérieur à 0.");
      expect(jobsService.createPremiumPlan).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Confirmation annulée ne supprime pas un avantage", async () => {
    render(
      <MemoryRouter>
        <AdminPremium />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Mensuel"));
    fireEvent.click(screen.getByText("Avantages"));
    await waitFor(() => screen.getByText("Coordonnées candidats"));

    const allButtons = screen.getAllByRole("button");
    // 0 = Ajouter, 1-2 = onglets, 3 = pencil(1er avantage), 4 = trash(1er avantage)
    fireEvent.click(allButtons[4]);
    fireEvent.click(await screen.findByText("Annuler"));

    await waitFor(() => {
      expect(jobsService.deletePremiumAvantage).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC4 : Aucun palier configuré", async () => {
    jobsService.getAdminPremiumPlans.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminPremium />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucun palier configuré/i)).toBeInTheDocument();
    });
  });
});
