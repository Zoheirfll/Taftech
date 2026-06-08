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
    getSuggestionsCarriere: vi.fn(),
    getAnalyseCarriere: vi.fn(),
  },
}));

const mockSuggestions = {
  profil_secteur: "Informatique",
  metiers: [
    { id: 1, titre: "Développeur React", secteur: "IT", niveau_experience: "2 ans" },
    { id: 2, titre: "Tech Lead", secteur: "IT", niveau_experience: "5 ans" },
    { id: 3, titre: "DevOps Engineer", secteur: "IT", niveau_experience: "3 ans" },
    { id: 4, titre: "Data Scientist", secteur: "IT", niveau_experience: "2 ans" },
    { id: 5, titre: "Architecte Cloud", secteur: "IT", niveau_experience: "7 ans" },
    { id: 6, titre: "Product Manager", secteur: "IT", niveau_experience: "4 ans" },
  ],
};

const mockAnalyse = {
  analyse: `### ÉVOLUTION POSSIBLE ###
Vous pouvez devenir Tech Lead.
### COMPÉTENCES À ACQUÉRIR ###
Approfondissez Node.js et TypeScript.
### CONSEIL PERSONNALISÉ ###
Faites du networking et présentez-vous dans des conférences.`,
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

  it("🟢 HP1 : Chargement et affichage de la liste de métiers", async () => {
    jobsService.getSuggestionsCarriere.mockResolvedValue(mockSuggestions);

    render(<SuggestionsCarriere />);

    await waitFor(() => {
      expect(screen.getByText("Suggestions de carrière")).toBeInTheDocument();
      expect(screen.getByText("Développeur React")).toBeInTheDocument();
      expect(screen.getByText("Informatique")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Pagination — navigation vers la page suivante", async () => {
    jobsService.getSuggestionsCarriere.mockResolvedValue(mockSuggestions);

    render(<SuggestionsCarriere />);

    await waitFor(() => screen.getByText("Développeur React"));

    // 6 métiers, 5 par page → 2 pages
    expect(screen.getByText(/Page 1 \/ 2/i)).toBeInTheDocument();
    expect(screen.queryByText("Product Manager")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Suivant →"));

    expect(screen.getByText("Product Manager")).toBeInTheDocument();
    expect(screen.queryByText("Développeur React")).not.toBeInTheDocument();
    expect(screen.getByText(/Page 2 \/ 2/i)).toBeInTheDocument();
  });

  it("🟢 HP3 : Bouton Actualiser recharge les suggestions", async () => {
    jobsService.getSuggestionsCarriere.mockResolvedValue(mockSuggestions);

    render(<SuggestionsCarriere />);

    await waitFor(() => screen.getByText("Développeur React"));

    jobsService.getSuggestionsCarriere.mockClear();
    fireEvent.click(screen.getByText(/Actualiser/i));

    await waitFor(() => {
      expect(jobsService.getSuggestionsCarriere).toHaveBeenCalledTimes(1);
    });
  });

  it("🟢 HP4 : Analyse IA — affichage des sections parsées", async () => {
    jobsService.getSuggestionsCarriere.mockResolvedValue(mockSuggestions);
    jobsService.getAnalyseCarriere.mockResolvedValue(mockAnalyse);

    render(<SuggestionsCarriere />);

    await waitFor(() => screen.getByText("Analyser mon profil"));
    fireEvent.click(screen.getByText("Analyser mon profil"));

    await waitFor(() => {
      expect(screen.getByText(/ÉVOLUTION POSSIBLE/i)).toBeInTheDocument();
      expect(screen.getByText(/COMPÉTENCES À ACQUÉRIR/i)).toBeInTheDocument();
      expect(screen.getByText(/CONSEIL PERSONNALISÉ/i)).toBeInTheDocument();
      expect(screen.getByText(/Vous pouvez devenir Tech Lead/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP5 : Réinitialiser l'analyse cache les sections et réaffiche le bouton", async () => {
    jobsService.getSuggestionsCarriere.mockResolvedValue(mockSuggestions);
    jobsService.getAnalyseCarriere.mockResolvedValue(mockAnalyse);

    render(<SuggestionsCarriere />);

    await waitFor(() => screen.getByText("Analyser mon profil"));
    fireEvent.click(screen.getByText("Analyser mon profil"));

    await waitFor(() => screen.getByText(/ÉVOLUTION POSSIBLE/i));

    fireEvent.click(screen.getByText("Réinitialiser"));

    await waitFor(() => {
      expect(screen.queryByText(/ÉVOLUTION POSSIBLE/i)).not.toBeInTheDocument();
      expect(screen.getByText("Analyser mon profil")).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Aucune suggestion → message de profil incomplet", async () => {
    jobsService.getSuggestionsCarriere.mockResolvedValue({ metiers: [] });

    render(<SuggestionsCarriere />);

    await waitFor(() => {
      expect(
        screen.getByText(/Complétez votre profil/i),
      ).toBeInTheDocument();
    });
  });

  it("🔴 EC2 : Crash chargement suggestions → Télémétrie (composant ne crashe pas)", async () => {
    jobsService.getSuggestionsCarriere.mockRejectedValue(new Error("API Down"));

    render(<SuggestionsCarriere />);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_SUGGESTIONS_CARRIERE",
        expect.anything(),
      );
      expect(screen.getByText("Suggestions de carrière")).toBeInTheDocument();
    });
  });

  it("🔴 EC3 : Crash API Analyse IA → fallback message affiché", async () => {
    jobsService.getSuggestionsCarriere.mockResolvedValue(mockSuggestions);
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
