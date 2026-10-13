// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
afterEach(() => cleanup());

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getDashboard: vi.fn(),
    getStatistiquesAvancees: vi.fn(),
  },
}));
vi.mock("../src/utils/errorReporter", () => ({ reportError: vi.fn() }));
// jsdom n'a pas de layout : ResponsiveContainer de recharts n'y rend rien d'utile.
vi.mock("../src/Components/StatCharts", () => ({
  StatAreaChart: () => <div data-testid="area" />,
  StatDonutChart: () => <div data-testid="donut" />,
  StatHistogram: () => <div data-testid="histo" />,
  StatSparkline: () => null,
}));

import StatistiquesPage from "../src/Pages/Recruteur/StatistiquesPage";
import { jobsService } from "../src/Services/jobsService";

const il_y_a = (j) => new Date(Date.now() - j * 86400000).toISOString();

const dash = {
  offres: [
    {
      id: 1, titre: "Data analyst", est_active: true, est_cloturee: false, wilaya: "Oran", type_contrat: "CDI",
      candidatures: [
        { id: 1, date_postulation: il_y_a(3), statut: "RETENU", score_matching: 90, source: "SITE", date_entretien: il_y_a(1) },
        { id: 2, date_postulation: il_y_a(5), statut: "RECUE", score_matching: 50, source: "CVTHEQUE" },
        { id: 3, date_postulation: il_y_a(200), statut: "REFUSE", score_matching: 10, source: "SITE" },
      ],
    },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <StatistiquesPage />
    </MemoryRouter>
  );

describe("StatistiquesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobsService.getDashboard.mockResolvedValue(dash);
    jobsService.getStatistiquesAvancees.mockResolvedValue({});
  });

  it("filtre les KPI sur la période (exclut la candidature de 200 jours)", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText("Candidatures")[0]).toBeInTheDocument());
    // 6 mois par défaut : 2 candidatures, 1 recrutement → 50 %
    expect(screen.getAllByText("50%")[0]).toBeInTheDocument();
    expect(screen.getByText("1 recrutement / 2 candidatures")).toBeInTheDocument();
  });

  it("« Tout » réintègre les candidatures anciennes", async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByText("Candidatures")[0]).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Tout" }));
    expect(screen.getByText("1 recrutement / 3 candidatures")).toBeInTheDocument();
  });

  it("affiche l'histogramme de score quand le palier le permet", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByTestId("histo")).toBeInTheDocument());
  });

  it("masque l'histogramme et propose les paliers si l'accès est refusé", async () => {
    jobsService.getStatistiquesAvancees.mockRejectedValue({ response: { status: 403, data: { code: "PALIER_INSUFFISANT" } } });
    renderPage();
    await waitFor(() => expect(screen.getByText(/palier Business ou supérieur/)).toBeInTheDocument());
    expect(screen.queryByTestId("histo")).toBeNull();
  });

  it("affiche un état d'erreur si le chargement échoue", async () => {
    jobsService.getDashboard.mockRejectedValue(new Error("boom"));
    renderPage();
    await waitFor(() => expect(screen.getByText("Impossible de charger les statistiques.")).toBeInTheDocument());
  });
});
