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
import AdminIAConfig from "../src/Pages/Admin/AdminIAConfig";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAIConfig: vi.fn(),
    updateAIConfig: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockConfig = {
  id: 1,
  provider: "GROQ",
  groq_model: "openai/gpt-oss-20b",
  ollama_model: "mistral",
  temperature: 0.7,
  reasoning_effort: "low",
  parser_cv_actif: true,
  parser_cv_max_tokens: 6000,
  analyse_carriere_actif: true,
  analyse_carriere_max_tokens: 1200,
  analyse_recruteur_actif: true,
  analyse_recruteur_max_tokens: 400,
  generation_offre_actif: true,
  generation_offre_max_tokens: 1600,
};

describe("🤖 UI & Logique - Composant <AdminIAConfig />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAIConfig.mockResolvedValue(mockConfig);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Chargement et affichage de la configuration", async () => {
    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("openai/gpt-oss-20b")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Affiche les 4 fonctionnalités avec leurs toggles", async () => {
    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Parser CV")).toBeInTheDocument();
      expect(screen.getByText("Analyse carrière candidat")).toBeInTheDocument();
      expect(screen.getByText("Analyse IA recruteur")).toBeInTheDocument();
      expect(screen.getByText("Génération d'offre IA")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Désactiver un toggle puis enregistrer appelle updateAIConfig", async () => {
    jobsService.updateAIConfig.mockResolvedValue({ ...mockConfig, parser_cv_actif: false });

    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Parser CV"));
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]); // Parser CV toggle (premier de la liste FEATURES)

    fireEvent.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(jobsService.updateAIConfig).toHaveBeenCalledWith(
        expect.objectContaining({ parser_cv_actif: false }),
      );
      expect(toast.success).toHaveBeenCalledWith("Configuration IA mise à jour !");
    });
  });

  it("🟢 HP4 : Changer le modèle Groq met à jour le champ", async () => {
    jobsService.updateAIConfig.mockResolvedValue(mockConfig);

    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByDisplayValue("openai/gpt-oss-20b"));
    fireEvent.change(screen.getByDisplayValue("openai/gpt-oss-20b"), { target: { value: "llama-3.3-70b-versatile" } });
    fireEvent.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(jobsService.updateAIConfig).toHaveBeenCalledWith(
        expect.objectContaining({ groq_model: "llama-3.3-70b-versatile" }),
      );
    });
  });

  it("🟢 HP5 : Bandeau d'avertissement Groq affiché", async () => {
    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Groq déprécie parfois ses modèles/i)).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getAIConfig.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_AI_CONFIG",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur de chargement.");
    });
  });

  it("🔴 EC2 : Erreur sauvegarde déclenche reportError", async () => {
    jobsService.updateAIConfig.mockRejectedValue(new Error("Validation error"));

    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Enregistrer"));
    fireEvent.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_UPDATE_AI_CONFIG",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de la sauvegarde.");
    });
  });
});
