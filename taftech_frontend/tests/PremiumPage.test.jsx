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
import PremiumPage from "../src/Pages/Recruteur/Portal/PremiumPage";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getDashboard: vi.fn(),
    getPremiumPlans: vi.fn(),
    getPremiumAvantages: vi.fn(),
    getFaq: vi.fn(),
    chargilyCheckout: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockPlans = [
  { id: 1, nb_mois: 1, label: "1 mois", prix_da: 2000, populaire: false, actif: true, ordre: 0 },
  { id: 2, nb_mois: 6, label: "6 mois", prix_da: 11040, populaire: true, actif: true, ordre: 2 },
];

const mockAvantages = [
  { id: 1, icone: "Mail", titre: "Coordonnées candidats", description: "Email et téléphone visibles.", ordre: 0, actif: true },
];

describe("⭐ UI & Logique - Composant <PremiumPage />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getDashboard.mockResolvedValue({ est_premium: false });
    jobsService.getPremiumPlans.mockResolvedValue(mockPlans);
    jobsService.getPremiumAvantages.mockResolvedValue(mockAvantages);
    jobsService.getFaq.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Affiche les paliers récupérés depuis l'API (pas de valeurs en dur)", async () => {
    render(
      <MemoryRouter>
        <PremiumPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("1 mois")).toBeInTheDocument();
      expect(screen.getByText("6 mois")).toBeInTheDocument();
      expect(screen.getByText("Populaire")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("🟢 HP2 : Sélectionne par défaut le palier marqué populaire", async () => {
    render(
      <MemoryRouter>
        <PremiumPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/6 mois × 1 840 DA\/mois/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("🟢 HP3 : Affiche les avantages récupérés depuis l'API", async () => {
    render(
      <MemoryRouter>
        <PremiumPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Coordonnées candidats")).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it("🟢 HP4 : Changer de durée met à jour le total à payer", async () => {
    render(
      <MemoryRouter>
        <PremiumPage />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("1 mois"), { timeout: 3000 });
    fireEvent.click(screen.getByText("1 mois"));

    await waitFor(() => {
      expect(screen.getAllByText("2 000 DA").length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it("🟢 HP5 : Paiement déclenche chargilyCheckout avec le nb_mois sélectionné", async () => {
    jobsService.chargilyCheckout.mockResolvedValue({ checkout_url: "https://pay.chargily.net/x" });

    render(
      <MemoryRouter>
        <PremiumPage />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole("button", { name: /Payer.*Chargily/i }), { timeout: 3000 });
    fireEvent.click(screen.getByRole("button", { name: /Payer.*Chargily/i }));

    await waitFor(() => {
      expect(jobsService.chargilyCheckout).toHaveBeenCalledWith(6);
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur de chargement du contenu Premium déclenche reportError", async () => {
    jobsService.getPremiumPlans.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <PremiumPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_PREMIUM_CONTENU",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 : Aucun palier disponible n'affiche pas le flow de paiement", async () => {
    jobsService.getPremiumPlans.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <PremiumPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByText(/Payer/i)).not.toBeInTheDocument();
    });
  });
});
