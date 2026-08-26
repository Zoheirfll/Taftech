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
import SuggestionsCarriere from "../src/Pages/Candidat/SuggestionsCarriere";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS ---
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getMetiersAccessibles: vi.fn(),
    getAnalyseCarriere: vi.fn(),
  },
}));

const mockMetiers = [
  { domaine_code: "L18", libelle: "Systèmes d'information et de télécommunication", score: 88 },
  { domaine_code: "L14", libelle: "Organisation et études", score: 75 },
  { domaine_code: "L12", libelle: "Comptabilité et finance", score: 60 },
  { domaine_code: "L11", libelle: "Achats", score: 55 },
  { domaine_code: "L16", libelle: "Secrétariat et assistance", score: 50 },
  { domaine_code: "L13", libelle: "Direction d'entreprise", score: 45 },
];

const mockAnalyse = {
  analyse: `### POINTS FORTS ###
5 ans d'expérience en développement web.
### COMPÉTENCES MANQUANTES ###
Approfondissez Node.js et TypeScript.
### FORMATIONS RECOMMANDÉES ###
Formation TypeScript avancé.
### ÉVOLUTION PROFESSIONNELLE ###
Vous pouvez évoluer vers un poste de Tech Lead.`,
};

describe("🚀 UI & Logique - Composant <SuggestionsCarriere />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Chargement et affichage de la liste de métiers accessibles avec %", async () => {
    jobsService.getMetiersAccessibles.mockResolvedValue(mockMetiers);

    render(<SuggestionsCarriere />);

    await waitFor(() => {
      expect(screen.getByText("Suggestions de carrière")).toBeInTheDocument();
      expect(screen.getByText("Systèmes d'information et de télécommunication")).toBeInTheDocument();
      expect(screen.getByText("88% compatible")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Pagination — navigation vers la page suivante", async () => {
    jobsService.getMetiersAccessibles.mockResolvedValue(mockMetiers);

    render(<SuggestionsCarriere />);

    await waitFor(() => screen.getByText("Systèmes d'information et de télécommunication"));

    // 6 métiers, 5 par page → 2 pages
    expect(screen.getByText(/Page 1 \/ 2/i)).toBeInTheDocument();
    expect(screen.queryByText("Direction d'entreprise")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /suivant/i }));

    expect(screen.getByText("Direction d'entreprise")).toBeInTheDocument();
    expect(screen.queryByText("Systèmes d'information et de télécommunication")).not.toBeInTheDocument();
    expect(screen.getByText(/Page 2 \/ 2/i)).toBeInTheDocument();
  });

  it("🟢 HP3 : Bouton Actualiser recharge les métiers accessibles", async () => {
    jobsService.getMetiersAccessibles.mockResolvedValue(mockMetiers);

    render(<SuggestionsCarriere />);

    await waitFor(() => screen.getByText("Systèmes d'information et de télécommunication"));

    jobsService.getMetiersAccessibles.mockClear();
    fireEvent.click(screen.getByText(/Actualiser/i));

    await waitFor(() => {
      expect(jobsService.getMetiersAccessibles).toHaveBeenCalledTimes(1);
    });
  });

  it("🟢 HP4 : Analyse IA — affichage des sections parsées (sans Métiers possibles)", async () => {
    jobsService.getMetiersAccessibles.mockResolvedValue(mockMetiers);
    jobsService.getAnalyseCarriere.mockResolvedValue(mockAnalyse);

    render(<SuggestionsCarriere />);

    await waitFor(() => screen.getByText("Analyser mon profil"));
    fireEvent.click(screen.getByText("Analyser mon profil"));

    await waitFor(() => {
      expect(screen.getByText(/POINTS FORTS/i)).toBeInTheDocument();
      expect(screen.getByText(/COMPÉTENCES MANQUANTES/i)).toBeInTheDocument();
      expect(screen.getByText(/FORMATIONS RECOMMANDÉES/i)).toBeInTheDocument();
      expect(screen.getByText(/ÉVOLUTION PROFESSIONNELLE/i)).toBeInTheDocument();
      expect(screen.queryByText(/MÉTIERS POSSIBLES/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Vous pouvez évoluer vers un poste de Tech Lead/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP5 : Réinitialiser l'analyse cache les sections et réaffiche le bouton", async () => {
    jobsService.getMetiersAccessibles.mockResolvedValue(mockMetiers);
    jobsService.getAnalyseCarriere.mockResolvedValue(mockAnalyse);

    render(<SuggestionsCarriere />);

    await waitFor(() => screen.getByText("Analyser mon profil"));
    fireEvent.click(screen.getByText("Analyser mon profil"));

    await waitFor(() => screen.getByText(/POINTS FORTS/i));

    fireEvent.click(screen.getByText("Réinitialiser"));

    await waitFor(() => {
      expect(screen.queryByText(/POINTS FORTS/i)).not.toBeInTheDocument();
      expect(screen.getByText("Analyser mon profil")).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Aucun métier accessible → message de profil incomplet", async () => {
    jobsService.getMetiersAccessibles.mockResolvedValue([]);

    render(<SuggestionsCarriere />);

    await waitFor(() => {
      expect(
        screen.getByText(/Complétez votre profil/i),
      ).toBeInTheDocument();
    });
  });

  it("🔴 EC2 : Crash chargement métiers accessibles → Télémétrie (composant ne crashe pas)", async () => {
    jobsService.getMetiersAccessibles.mockRejectedValue(new Error("API Down"));

    render(<SuggestionsCarriere />);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_METIERS_ACCESSIBLES",
        expect.anything(),
      );
      expect(screen.getByText("Suggestions de carrière")).toBeInTheDocument();
    });
  });

  it("🔴 EC3 : Crash API Analyse IA → fallback message affiché", async () => {
    jobsService.getMetiersAccessibles.mockResolvedValue(mockMetiers);
    jobsService.getAnalyseCarriere.mockRejectedValue(new Error("IA Down"));

    render(<SuggestionsCarriere />);

    await waitFor(() => screen.getByText("Analyser mon profil"));
    fireEvent.click(screen.getByText("Analyser mon profil"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ANALYSE_CARRIERE",
        expect.anything(),
      );
      expect(
        screen.getByText(/Service IA temporairement indisponible/i),
      ).toBeInTheDocument();
    });
  });
});
