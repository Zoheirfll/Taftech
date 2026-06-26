// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MesCandidatures from "../src/Pages/Candidat/MesCandidatures";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getMesCandidatures: vi.fn() },
}));

const mockData = [
  {
    id: 1,
    offre_titre: "Développeur Front-End",
    entreprise_nom: "TafTech Corp",
    date_postulation: "2026-05-01T10:00:00Z",
    statut: "RECUE",
    offre_est_cloturee: false,
  },
  {
    id: 2,
    offre_titre: "Designer UI/UX",
    entreprise_nom: "Creative Studio",
    date_postulation: "2026-04-15T09:00:00Z",
    statut: "ENTRETIEN",
    offre_est_cloturee: false,
    date_entretien: "2026-06-01T14:30:00Z",
    message_entretien: "Voici le lien Google Meet pour notre échange.",
  },
  {
    id: 3,
    offre_titre: "Data Analyst",
    entreprise_nom: "Big Data DZ",
    date_postulation: "2026-03-10T08:00:00Z",
    statut: "REFUSE",
    offre_est_cloturee: true,
  },
];

describe("📁 UI & Logique - Composant <MesCandidatures />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Affichage des candidatures et de leurs statuts", async () => {
    jobsService.getMesCandidatures.mockResolvedValue(mockData);
    render(<MemoryRouter><MesCandidatures /></MemoryRouter>);
    expect(
      await screen.findByText("Développeur Front-End"),
    ).toBeInTheDocument();
    expect(screen.getByText(/TafTech Corp/i)).toBeInTheDocument();
    // STATUT_LABELS: RECUE → "Reçue", REFUSE → "Refusé(e)"
    expect(screen.getByText("Reçue")).toBeInTheDocument();
    expect(
      screen.getByText(/Votre candidature a été envoyée et attend/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Data Analyst")).toBeInTheDocument();
    expect(screen.getByText("Refusé(e)")).toBeInTheDocument();
    expect(
      screen.getByText(/votre profil n'a pas été retenu/i),
    ).toBeInTheDocument();
  });

  it("🟢 HP2 : Affichage de l'encart d'Entretien et Message", async () => {
    jobsService.getMesCandidatures.mockResolvedValue(mockData);
    render(<MemoryRouter><MesCandidatures /></MemoryRouter>);
    await screen.findByText("Designer UI/UX");
    expect(screen.getByText("Entretien")).toBeInTheDocument();
    expect(
      screen.getByText(/Le recruteur souhaite vous rencontrer/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Convocation à un entretien/i)).toBeInTheDocument();
    expect(
      screen.getByText(/"Voici le lien Google Meet pour notre échange."/i),
    ).toBeInTheDocument();
  });

  it("🟢 HP3 : Affichage du badge pour les offres clôturées", async () => {
    jobsService.getMesCandidatures.mockResolvedValue(mockData);
    render(<MemoryRouter><MesCandidatures /></MemoryRouter>);
    await screen.findByText("Data Analyst");
    expect(screen.getByText("Clôturée")).toBeInTheDocument();
  });

  it("🟢 HP4 : Affichage de l'état vide", async () => {
    jobsService.getMesCandidatures.mockResolvedValue([]);
    render(<MemoryRouter><MesCandidatures /></MemoryRouter>);
    expect(
      await screen.findByText(/Aucune candidature pour l'instant/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Développeur/i)).not.toBeInTheDocument();
  });

  it("🔴 EC1 : Gestion robuste de l'erreur API (Télémétrie)", async () => {
    jobsService.getMesCandidatures.mockRejectedValue(
      new Error("500 API Crash"),
    );
    render(<MemoryRouter><MesCandidatures /></MemoryRouter>);
    expect(
      await screen.findByText(/Aucune candidature pour l'instant/i),
    ).toBeInTheDocument();
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_RECUPERATION_CANDIDATURES",
      expect.anything(),
    );
  });
});
