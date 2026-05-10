// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import MesCandidatures from "../src/Pages/MesCandidatures";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS ---
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getMesCandidatures: vi.fn(),
  },
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

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Affichage des candidatures et de leurs statuts", async () => {
    jobsService.getMesCandidatures.mockResolvedValue(mockData);
    render(<MesCandidatures />);

    // Utilisation de findByText (qui attend dynamiquement) pour éviter les Timeouts
    const devTitle = await screen.findByText("Développeur Front-End");
    expect(devTitle).toBeInTheDocument();

    // Candidature 1 (Reçue)
    expect(screen.getByText(/TafTech Corp/i)).toBeInTheDocument();
    expect(screen.getByText("RECUE")).toBeInTheDocument();
    expect(
      screen.getByText(/Votre candidature a été envoyée avec succès/i),
    ).toBeInTheDocument();

    // Candidature 3 (Refusée)
    expect(screen.getByText("Data Analyst")).toBeInTheDocument();
    expect(screen.getByText("REFUSE")).toBeInTheDocument();
    expect(
      screen.getByText(/Malheureusement, votre profil n'a pas été retenu/i),
    ).toBeInTheDocument();
  });

  it("🟢 HP2 : Affichage de l'encart d'Entretien et Message", async () => {
    jobsService.getMesCandidatures.mockResolvedValue(mockData);
    render(<MesCandidatures />);

    // On attend que le titre du poste s'affiche
    await screen.findByText("Designer UI/UX");

    // Vérification du statut global
    expect(screen.getByText("ENTRETIEN")).toBeInTheDocument();
    expect(
      screen.getByText(/Le recruteur souhaite vous rencontrer/i),
    ).toBeInTheDocument();

    // Vérification de la "Boîte de réception" (On esquive la vérification de l'heure exacte liée aux fuseaux horaires)
    expect(screen.getByText(/Convocation à un entretien/i)).toBeInTheDocument();
    expect(
      screen.getByText(/L'entreprise vous a donné rendez-vous le/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/"Voici le lien Google Meet pour notre échange."/i),
    ).toBeInTheDocument();
  });

  it("🟢 HP3 : Affichage du badge pour les offres clôturées", async () => {
    jobsService.getMesCandidatures.mockResolvedValue(mockData);
    render(<MesCandidatures />);

    await screen.findByText("Data Analyst");

    // Le badge "🔒 Clôturée" doit être présent pour l'offre "Data Analyst"
    expect(screen.getByText("🔒 Clôturée")).toBeInTheDocument();
  });

  it("🟢 HP4 : Affichage de l'état vide (Aucune candidature)", async () => {
    jobsService.getMesCandidatures.mockResolvedValue([]);
    render(<MesCandidatures />);

    const emptyMessage = await screen.findByText(
      /Vous n'avez postulé à aucune offre pour le moment/i,
    );
    expect(emptyMessage).toBeInTheDocument();

    // On s'assure que la structure vide s'affiche au lieu de planter
    expect(screen.queryByText(/Développeur/i)).not.toBeInTheDocument();
  });

  // --- 🔴 EDGE CASES (1/1) ---

  it("🔴 EC1 : Gestion robuste de l'erreur API au chargement (Télémétrie)", async () => {
    jobsService.getMesCandidatures.mockRejectedValue(
      new Error("500 API Crash"),
    );
    render(<MesCandidatures />);

    const emptyMessage = await screen.findByText(
      /Vous n'avez postulé à aucune offre pour le moment/i,
    );
    expect(emptyMessage).toBeInTheDocument();

    // Télémétrie déclenchée
    expect(reporter.reportError).toHaveBeenCalledWith(
      "ECHEC_RECUPERATION_CANDIDATURES",
      expect.anything(),
    );
  });
});
