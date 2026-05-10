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
import { MemoryRouter } from "react-router-dom";
import AdminStatistiques from "../src/Pages/Admin/AdminStatistiques";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminStats: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
  },
}));

const mockStatsNoAlerts = {
  total_candidats: 150,
  total_recruteurs: 45,
  total_recrutements: 12,
  total_entreprises: 40,
  entreprises_attente: 0,
  total_offres: 300,
  offres_attente: 0,
};

const mockStatsWithAlerts = {
  total_candidats: 150,
  total_recruteurs: 45,
  total_recrutements: 12,
  total_entreprises: 40,
  entreprises_attente: 5,
  total_offres: 300,
  offres_attente: 12,
};

describe("📈 UI & Logique - Composant <AdminStatistiques />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Happy Path 1 : Rendu des KPI sans alertes", async () => {
    jobsService.getAdminStats.mockResolvedValue(mockStatsNoAlerts);

    render(
      <MemoryRouter>
        <AdminStatistiques />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("150")).toBeInTheDocument(); // Candidats
      expect(screen.getByText("300")).toBeInTheDocument(); // Offres publiées

      // Les alertes ne doivent pas s'afficher
      expect(
        screen.queryByText(/attendent votre validation/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/attendent votre modération/i),
      ).not.toBeInTheDocument();
    });
  });

  it("🟢 Happy Path 2 : Rendu des KPI avec les alertes cliquables", async () => {
    jobsService.getAdminStats.mockResolvedValue(mockStatsWithAlerts);

    render(
      <MemoryRouter>
        <AdminStatistiques />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Les alertes DOIVENT s'afficher
      expect(
        screen.getByText(/5 Entreprise\(s\) attendent votre validation/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/12 Offre\(s\) attendent votre modération/i),
      ).toBeInTheDocument();
    });
  });

  it("🟢 Happy Path 3 : Le bouton Rafraîchir recharge les données", async () => {
    jobsService.getAdminStats.mockResolvedValue(mockStatsNoAlerts);

    render(
      <MemoryRouter>
        <AdminStatistiques />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("150")); // On attend le 1er chargement

    // On clique sur le bouton refresh
    const refreshBtn = screen.getByTitle("Rafraîchir les statistiques");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      // getAdminStats a été appelé 2 fois (1 au montage, 1 au clic)
      expect(jobsService.getAdminStats).toHaveBeenCalledTimes(2);
    });
  });

  it("🔴 Edge Case : Crash de l'API déclenche reportError", async () => {
    jobsService.getAdminStats.mockRejectedValue(
      new Error("DB Connection Lost"),
    );

    render(
      <MemoryRouter>
        <AdminStatistiques />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // La télémétrie doit attraper l'erreur silencieusement
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_STATS_ADMIN",
        expect.anything(),
      );
      // L'admin voit un toast
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors du chargement des statistiques.",
      );
    });
  });
});
