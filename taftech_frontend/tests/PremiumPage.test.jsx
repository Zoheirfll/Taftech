// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PremiumPage from "../src/Pages/Recruteur/Portal/PremiumPage";
import { jobsService } from "../src/Services/jobsService";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getDashboard: vi.fn(),
    demanderPremium: vi.fn(),
    envoyerRecuPremium: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const renderPage = () =>
  render(<MemoryRouter><PremiumPage /></MemoryRouter>);

describe("⭐ UI & Logique - Composant <PremiumPage />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
  });

  // ─── Non Premium ────────────────────────────────────────────────────────

  it("🟢 HP1 : Affiche le flow paiement si non premium", async () => {
    jobsService.getDashboard.mockResolvedValue({ est_premium: false });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Passer en Premium/i)).toBeInTheDocument();
      // Plusieurs "1 mois" et "6 mois" peuvent exister (cards + label)
      expect(screen.getAllByText(/1 mois/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/6 mois/i).length).toBeGreaterThan(0);
    });
  });

  it("🟢 HP2 : Calcul prix correct pour 6 mois (−8%)", async () => {
    jobsService.getDashboard.mockResolvedValue({ est_premium: false });
    renderPage();
    await waitFor(() => screen.getByText(/6 mois/i));
    fireEvent.click(screen.getByText(/6 mois/i).closest("button"));
    await waitFor(() => {
      // 2000 * 6 * 0.92 = 11040 — plusieurs occurrences possibles (card + récap)
      const items = screen.getAllByText(/11.040/);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it("🟢 HP3 : Calcul prix correct pour 12 mois (−17%)", async () => {
    jobsService.getDashboard.mockResolvedValue({ est_premium: false });
    renderPage();
    await waitFor(() => screen.getByText(/12 mois/i));
    fireEvent.click(screen.getByText(/12 mois/i).closest("button"));
    await waitFor(() => {
      // 2000 * 12 * 0.83 = 19920
      const items = screen.getAllByText(/19.920/);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  it("🟢 HP4 : Confirmation demande → étape reçu", async () => {
    jobsService.getDashboard.mockResolvedValue({ est_premium: false });
    jobsService.demanderPremium.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText(/J'ai effectué le virement/i));
    fireEvent.click(screen.getByText(/J'ai effectué le virement/i));
    await waitFor(() => {
      expect(jobsService.demanderPremium).toHaveBeenCalled();
      expect(screen.getByText(/Demande enregistrée/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP5 : Envoi reçu email → étape confirmé", async () => {
    jobsService.getDashboard.mockResolvedValue({ est_premium: false });
    jobsService.demanderPremium.mockResolvedValue({});
    jobsService.envoyerRecuPremium.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText(/J'ai effectué le virement/i));
    fireEvent.click(screen.getByText(/J'ai effectué le virement/i));
    await waitFor(() => screen.getByText(/Envoyer la confirmation/i));
    fireEvent.click(screen.getByText(/Envoyer la confirmation/i));
    await waitFor(() => {
      expect(jobsService.envoyerRecuPremium).toHaveBeenCalled();
      expect(screen.getByText(/Demande envoyée avec succès/i)).toBeInTheDocument();
    });
  });

  // ─── Premium actif ──────────────────────────────────────────────────────

  it("🟢 HP6 : Affiche l'écran statut si premium actif", async () => {
    jobsService.getDashboard.mockResolvedValue({
      est_premium: true,
      premium_expire_at: "12/07/2026",
      premium_active_since: "12/06/2026",
      premium_nb_mois: 1,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Abonnement Premium actif/i)).toBeInTheDocument();
      expect(screen.getByText("12/07/2026")).toBeInTheDocument();
      expect(screen.getByText("12/06/2026")).toBeInTheDocument();
    });
  });

  it("🟢 HP7 : Bouton Prolonger bascule vers le flow paiement", async () => {
    jobsService.getDashboard.mockResolvedValue({
      est_premium: true,
      premium_expire_at: "12/07/2026",
      premium_active_since: "12/06/2026",
      premium_nb_mois: 1,
    });
    renderPage();
    await waitFor(() => screen.getByText(/Prolonger l'abonnement/i));
    fireEvent.click(screen.getByText(/Prolonger l'abonnement/i));
    await waitFor(() => {
      expect(screen.getByText(/Prolongation/i)).toBeInTheDocument();
      expect(screen.getByText(/J'ai effectué le virement/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP8 : Section Envoyer reçu visible et fonctionnelle depuis statut", async () => {
    jobsService.getDashboard.mockResolvedValue({
      est_premium: true,
      premium_expire_at: "12/07/2026",
      premium_active_since: "12/06/2026",
      premium_nb_mois: 1,
    });
    jobsService.envoyerRecuPremium.mockResolvedValue({});
    renderPage();
    await waitFor(() => screen.getByText(/Envoyer un reçu de paiement/i));
    fireEvent.click(screen.getByText(/Envoyer un reçu de paiement/i));
    await waitFor(() => screen.getByText(/Envoyer le reçu par email/i));
    fireEvent.click(screen.getByText(/Envoyer le reçu par email/i));
    await waitFor(() => {
      expect(jobsService.envoyerRecuPremium).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────────────

  it("🔴 EC1 : Erreur API demanderPremium → toast.error", async () => {
    jobsService.getDashboard.mockResolvedValue({ est_premium: false });
    jobsService.demanderPremium.mockRejectedValue({ response: { data: { error: "Erreur test" } } });
    renderPage();
    await waitFor(() => screen.getByText(/J'ai effectué le virement/i));
    fireEvent.click(screen.getByText(/J'ai effectué le virement/i));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erreur test");
    });
  });

  it("🔴 EC2 : Affiche badge bientôt si ≤14 jours restants", async () => {
    const demain = new Date();
    demain.setDate(demain.getDate() + 5);
    const fmt = `${String(demain.getDate()).padStart(2,"0")}/${String(demain.getMonth()+1).padStart(2,"0")}/${demain.getFullYear()}`;
    jobsService.getDashboard.mockResolvedValue({
      est_premium: true,
      premium_expire_at: fmt,
      premium_active_since: "01/06/2026",
      premium_nb_mois: 1,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Renouveler mon abonnement/i)).toBeInTheDocument();
    });
  });
});
