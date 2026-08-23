// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OffresListPage from "../src/Pages/Recruteur/OffresListPage";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../src/Services/authService", () => ({
  authService: {
    peutFaire: vi.fn(() => true),
  },
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getDashboard: vi.fn(),
    getConstants: vi.fn(),
    modifierOffre: vi.fn(),
    supprimerOffre: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "toast-id") },
}));

const mockData = {
  entreprise: { nom_entreprise: "TafTech", est_approuvee: true },
  offres: [
    {
      id: 1,
      titre: "Offre Ouverte",
      wilaya: "31 - Oran",
      type_contrat: "CDI",
      est_cloturee: false,
      statut_moderation: "APPROUVEE",
      date_publication: "2026-05-01",
      candidatures: [{ statut: "RECUE", score_matching: 85 }],
    },
    {
      id: 2,
      titre: "Offre Archives",
      wilaya: "31 - Oran",
      type_contrat: "CDD",
      est_cloturee: true,
      statut_moderation: "APPROUVEE",
      date_publication: "2026-04-01",
      candidatures: [],
    },
  ],
};

describe("📋 UI & Logique - Composant <OffresListPage />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getConstants.mockResolvedValue({ wilayas: [], secteurs: [] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Affiche les offres en cours par défaut et bascule sur Archives", async () => {
    jobsService.getDashboard.mockResolvedValue(mockData);
    render(
      <MemoryRouter>
        <OffresListPage />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Offre Ouverte")[0]);
    expect(screen.queryByText("Offre Archives")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Archives/i }));
    await waitFor(() => expect(screen.getAllByText("Offre Archives")[0]).toBeInTheDocument());
    expect(screen.queryByText("Offre Ouverte")).not.toBeInTheDocument();
  });

  it("🟢 HP2 : Recherche filtre par titre", async () => {
    jobsService.getDashboard.mockResolvedValue(mockData);
    render(
      <MemoryRouter>
        <OffresListPage />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Offre Ouverte")[0]);
    fireEvent.change(screen.getByPlaceholderText("Rechercher une offre..."), { target: { value: "Ouverte" } });
    await waitFor(() => expect(screen.getAllByText("Offre Ouverte")[0]).toBeInTheDocument());
  });

  it("🔴 EC1 : Suppression d'une offre après confirmation", async () => {
    jobsService.getDashboard.mockResolvedValue({
      ...mockData,
      offres: [{ ...mockData.offres[0], statut_moderation: "EN_ATTENTE" }, mockData.offres[1]],
    });
    jobsService.supprimerOffre.mockResolvedValue({});
    render(
      <MemoryRouter>
        <OffresListPage />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Offre Ouverte")[0]);
    const boutonsSuppr = screen.getAllByTitle("Supprimer l'offre");
    fireEvent.click(boutonsSuppr[0]);
    fireEvent.click(screen.getAllByText("Confirmer")[0]);

    await waitFor(() => expect(jobsService.supprimerOffre).toHaveBeenCalledWith(1));
    expect(toast.success).toHaveBeenCalled();
  });

  it("🔴 EC2 : Erreur de chargement (Télémétrie)", async () => {
    jobsService.getDashboard.mockRejectedValue(new Error("API Down"));
    render(
      <MemoryRouter>
        <OffresListPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(reporter.reportError).toHaveBeenCalledWith("ECHEC_LOAD_OFFRES_LIST", expect.any(Error)));
  });
});
