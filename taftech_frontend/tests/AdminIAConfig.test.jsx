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
import { ConfirmModalHost } from "../src/utils/confirmToast";
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
      expect(screen.getByText("Analyse carrière candidat (suggestions métiers)")).toBeInTheDocument();
      expect(screen.getByText("Analyse IA recruteur")).toBeInTheDocument();
      expect(screen.getByText("Génération d'offre IA")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Désactiver un toggle puis enregistrer appelle updateAIConfig", async () => {
    jobsService.updateAIConfig.mockResolvedValue({ ...mockConfig, parser_cv_actif: false });

    render(
      <MemoryRouter>
        <AdminIAConfig />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Parser CV"));
    // Interrupteur explicite par fonctionnalité (role="switch", libellé accessible)
    const toggleParser = screen.getByRole("switch", { name: "Activer Parser CV" });
    expect(toggleParser).toBeChecked();
    fireEvent.click(toggleParser);
    expect(toggleParser).not.toBeChecked();

    fireEvent.click(screen.getByText("Enregistrer"));
    await waitFor(() => screen.getByText("Confirmer"));
    fireEvent.click(screen.getByText("Confirmer"));

    await waitFor(() => {
      expect(jobsService.updateAIConfig).toHaveBeenCalledWith(
        expect.objectContaining({ parser_cv_actif: false }),
      );
      expect(toast.success).toHaveBeenCalledWith("Configuration IA mise à jour !");
    });
  });

  it("🔒 Prompts réservés au Super Admin : verrouillés et jamais renvoyés pour un admin simple", async () => {
    jobsService.getAIConfig.mockResolvedValue({ ...mockConfig, prompts_accessibles: false, appels_ia_mois: 7 });
    jobsService.updateAIConfig.mockResolvedValue({ ...mockConfig, prompts_accessibles: false });

    render(
      <MemoryRouter>
        <AdminIAConfig />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Parser CV"));
    expect(screen.queryByText("Prompt IA")).toBeNull();
    expect(screen.getAllByText(/modifiable uniquement par le Super Admin/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText("Enregistrer"));
    await waitFor(() => screen.getByText("Confirmer"));
    fireEvent.click(screen.getByText("Confirmer"));
    await waitFor(() => expect(jobsService.updateAIConfig).toHaveBeenCalled());
    const envoye = jobsService.updateAIConfig.mock.calls[0][0];
    expect(envoye).not.toHaveProperty("prompts_accessibles");
    expect(envoye).not.toHaveProperty("appels_ia_mois");
    expect(Object.keys(envoye).filter((k) => k.endsWith("_prompt"))).toEqual([]);
  });

  it("🔒 Fournisseur, modèles, température, effort et max_tokens : désactivés et jamais renvoyés pour un admin simple", async () => {
    const configAdminSimple = { ...mockConfig, prompts_accessibles: false, modele_modifiable: false };
    jobsService.getAIConfig.mockResolvedValue(configAdminSimple);
    jobsService.updateAIConfig.mockResolvedValue(configAdminSimple);

    render(
      <MemoryRouter>
        <AdminIAConfig />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Parser CV"));
    expect(screen.getByDisplayValue("openai/gpt-oss-20b")).toBeDisabled();
    expect(screen.getByDisplayValue("mistral")).toBeDisabled();
    expect(screen.getByDisplayValue("0.7")).toBeDisabled();
    expect(screen.getByDisplayValue("6000")).toBeDisabled();
    expect(screen.getByText(/modifiables uniquement par le Super Admin/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Enregistrer"));
    await waitFor(() => screen.getByText("Confirmer"));
    fireEvent.click(screen.getByText("Confirmer"));
    await waitFor(() => expect(jobsService.updateAIConfig).toHaveBeenCalled());
    const envoye = jobsService.updateAIConfig.mock.calls[0][0];
    [
      "modele_modifiable", "provider", "groq_model", "ollama_model", "temperature", "reasoning_effort",
      "parser_cv_max_tokens", "analyse_carriere_max_tokens", "analyse_recruteur_max_tokens", "generation_offre_max_tokens",
    ].forEach((cle) => expect(envoye).not.toHaveProperty(cle));
    // Les réglages restés ouverts à l'admin simple (interrupteurs) sont bien envoyés.
    expect(envoye).toHaveProperty("parser_cv_actif", true);
  });

  it("🔴 max_tokens au-dessus de la borne haute : champ invalide (bornes min/max natives), aucun envoi", async () => {
    jobsService.getAIConfig.mockResolvedValue({ ...mockConfig, parser_cv_max_tokens: 20000 });

    render(
      <MemoryRouter>
        <AdminIAConfig />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Parser CV"));
    const champ = screen.getByDisplayValue("20000");
    expect(champ).toHaveAttribute("max", "16000");
    expect(champ).toHaveAttribute("min", "100");
    fireEvent.click(screen.getByText("Enregistrer"));
    // Le navigateur bloque la soumission d'un champ hors bornes : ni confirmation ni appel serveur.
    expect(champ).toBeInvalid();
    expect(screen.queryByText("Confirmer")).toBeNull();
    expect(jobsService.updateAIConfig).not.toHaveBeenCalled();
  });

  it("🔒 Admin simple : plafond et seuil verrouillés et jamais renvoyés au serveur", async () => {
    jobsService.getAIConfig.mockResolvedValue({
      ...mockConfig, prompts_accessibles: false, budget_modifiable: false,
      budget_ia_appels_mois_max: 100, budget_ia_alerte_pct: 80, appels_ia_mois: 10,
    });
    jobsService.updateAIConfig.mockResolvedValue(mockConfig);
    render(
      <MemoryRouter>
        <AdminIAConfig />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Parser CV"));
    expect(screen.getByDisplayValue("100")).toBeDisabled();
    expect(screen.getByDisplayValue("80")).toBeDisabled();
    expect(screen.getByText(/Plafond et seuil d'alerte : modifiables uniquement par le Super Admin/)).toBeTruthy();

    fireEvent.click(screen.getByText("Enregistrer"));
    await waitFor(() => screen.getByText("Confirmer"));
    fireEvent.click(screen.getByText("Confirmer"));
    await waitFor(() => expect(jobsService.updateAIConfig).toHaveBeenCalled());
    const envoye = jobsService.updateAIConfig.mock.calls[0][0];
    expect(envoye).not.toHaveProperty("budget_modifiable");
    expect(envoye).not.toHaveProperty("budget_ia_appels_mois_max");
    expect(envoye).not.toHaveProperty("budget_ia_alerte_pct");
  });

  it("🟢 Super Admin : plafond et seuil modifiables", async () => {
    jobsService.getAIConfig.mockResolvedValue({
      ...mockConfig, prompts_accessibles: true, budget_modifiable: true,
      budget_ia_appels_mois_max: 100, budget_ia_alerte_pct: 80, appels_ia_mois: 10,
    });
    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );
    await waitFor(() => screen.getByText("Parser CV"));
    expect(screen.getByDisplayValue("100")).not.toBeDisabled();
    expect(screen.getByDisplayValue("80")).not.toBeDisabled();
  });

  it("🟢 Super Admin : les boutons Prompt IA restent disponibles", async () => {
    jobsService.getAIConfig.mockResolvedValue({ ...mockConfig, prompts_accessibles: true });
    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );
    await waitFor(() => screen.getByText("Parser CV"));
    expect(screen.getAllByText("Prompt IA").length).toBe(5);
  });

  it("⚠️ Plafond global : avertissement sans plafond, jauge avec plafond", async () => {
    jobsService.getAIConfig.mockResolvedValue({ ...mockConfig, appels_ia_mois: 40, budget_ia_appels_mois_max: null, budget_ia_alerte_pct: 80 });
    const { unmount } = render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );
    await waitFor(() => screen.getByText(/Aucun plafond défini/));
    unmount();

    jobsService.getAIConfig.mockResolvedValue({ ...mockConfig, appels_ia_mois: 40, budget_ia_appels_mois_max: 100, budget_ia_alerte_pct: 80 });
    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );
    await waitFor(() => screen.getByText(/40 \/ 100 appels IA ce mois-ci \(40 %\)/));
    expect(screen.queryByText(/Aucun plafond défini/)).toBeNull();
  });

  it("🟢 HP4 : Changer le modèle Groq met à jour le champ", async () => {
    jobsService.updateAIConfig.mockResolvedValue(mockConfig);

    render(
      <MemoryRouter>
        <AdminIAConfig />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByDisplayValue("openai/gpt-oss-20b"));
    fireEvent.change(screen.getByDisplayValue("openai/gpt-oss-20b"), { target: { value: "llama-3.3-70b-versatile" } });
    fireEvent.click(screen.getByText("Enregistrer"));
    await waitFor(() => screen.getByText("Confirmer"));
    fireEvent.click(screen.getByText("Confirmer"));

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

  it("🔴 EC3 : Erreur de chargement affiche un bouton Réessayer (plus de chargement infini)", async () => {
    jobsService.getAIConfig.mockRejectedValueOnce(new Error("API Down")).mockResolvedValueOnce(mockConfig);

    render(
      <MemoryRouter>
        <AdminIAConfig />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText("Réessayer"));
    await waitFor(() => {
      expect(screen.getByDisplayValue("openai/gpt-oss-20b")).toBeInTheDocument();
    });
  });

  it("🔴 EC4 : Température vide bloque l'enregistrement", async () => {
    render(
      <MemoryRouter>
        <AdminIAConfig />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByDisplayValue("0.7"));
    fireEvent.change(screen.getByDisplayValue("0.7"), { target: { value: "" } });
    fireEvent.click(screen.getByText("Enregistrer"));

    expect(toast.error).toHaveBeenCalledWith("La température doit être comprise entre 0 et 2.");
    expect(jobsService.updateAIConfig).not.toHaveBeenCalled();
  });

  it("🔴 EC2 : Erreur sauvegarde déclenche reportError", async () => {
    jobsService.updateAIConfig.mockRejectedValue(new Error("Validation error"));

    render(
      <MemoryRouter>
        <AdminIAConfig />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Enregistrer"));
    fireEvent.click(screen.getByText("Enregistrer"));
    await waitFor(() => screen.getByText("Confirmer"));
    fireEvent.click(screen.getByText("Confirmer"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_UPDATE_AI_CONFIG",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de la sauvegarde.");
    });
  });
});
