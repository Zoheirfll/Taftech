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
import Questionnaires from "../src/Pages/Recruteur/Questionnaires";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getQuestionnaires: vi.fn(),
    createQuestionnaire: vi.fn(),
    updateQuestionnaire: vi.fn(),
    deleteQuestionnaire: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockQuestionnaires = [
  {
    id: 1,
    titre: "Questionnaire Dev React",
    date_creation: "2026-05-01T10:00:00Z",
    questions: [
      {
        id: 1,
        texte: "Combien d'années d'expérience ?",
        type_question: "NUMERIQUE",
        requis: true,
        disqualifiant: false,
        ordre: 0,
        choix: [],
      },
      {
        id: 2,
        texte: "Quel est votre niveau en React ?",
        type_question: "CHOIX_UNIQUE",
        requis: false,
        disqualifiant: true,
        ordre: 1,
        choix: [
          { id: 1, texte: "Débutant" },
          { id: 2, texte: "Expert" },
        ],
      },
    ],
  },
  {
    id: 2,
    titre: "Questionnaire Finance",
    date_creation: "2026-05-02T10:00:00Z",
    questions: [],
  },
];

describe("📋 UI & Logique - Composant <Questionnaires />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Chargement et affichage des questionnaires", async () => {
    jobsService.getQuestionnaires.mockResolvedValue(mockQuestionnaires);

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Questionnaire Dev React")).toBeInTheDocument();
      expect(screen.getByText("Questionnaire Finance")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Affichage du nombre de questions", async () => {
    jobsService.getQuestionnaires.mockResolvedValue(mockQuestionnaires);

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/2 question/i)).toBeInTheDocument();
      expect(screen.getByText(/0 question/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Ouverture modale création", async () => {
    jobsService.getQuestionnaires.mockResolvedValue(mockQuestionnaires);

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouveau questionnaire/i));
    fireEvent.click(screen.getByText(/Nouveau questionnaire/i));

    expect(screen.getByText(/Titre du questionnaire/i)).toBeInTheDocument();
  });

  it("🟢 HP4 : Création questionnaire réussie", async () => {
    jobsService.getQuestionnaires.mockResolvedValue(mockQuestionnaires);
    jobsService.createQuestionnaire.mockResolvedValue({
      id: 3,
      titre: "Nouveau Questionnaire",
      date_creation: "2026-05-31T10:00:00Z",
      questions: [],
    });

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouveau questionnaire/i));
    fireEvent.click(screen.getByText(/Nouveau questionnaire/i));

    const titreInput = screen.getByPlaceholderText(
      /Ex: Questionnaire Développeur React/i,
    );
    fireEvent.change(titreInput, {
      target: { value: "Nouveau Questionnaire" },
    });

    // Remplir le texte de la question (obligatoire)
    const questionInput = screen.getByPlaceholderText(/Texte de la question/i);
    fireEvent.change(questionInput, { target: { value: "Ma question" } });

    // Soumettre via le form directement
    const form = titreInput.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(jobsService.createQuestionnaire).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Questionnaire créé !");
    });
  });

  it("🟢 HP5 : Ouverture modale édition avec données pré-remplies", async () => {
    jobsService.getQuestionnaires.mockResolvedValue(mockQuestionnaires);

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByRole("button"));

    const allButtons = screen.getAllByRole("button");
    // bouton index 1 = pencil du premier questionnaire (0 = Nouveau questionnaire)
    fireEvent.click(allButtons[1]);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Questionnaire Dev React"),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP6 : Suppression questionnaire réussie", async () => {
    jobsService.getQuestionnaires.mockResolvedValue(mockQuestionnaires);
    jobsService.deleteQuestionnaire.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByRole("button"));
    const allButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg"));
    fireEvent.click(allButtons[2]);

    await waitFor(() => {
      expect(jobsService.deleteQuestionnaire).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Questionnaire supprimé.");
    });
  });

  it("🟢 HP7 : Affichage vide si aucun questionnaire", async () => {
    jobsService.getQuestionnaires.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucun questionnaire/i)).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getQuestionnaires.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_QUESTIONNAIRES",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 : Titre vide bloque la création", async () => {
    jobsService.getQuestionnaires.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouveau questionnaire/i));
    fireEvent.click(screen.getByText(/Nouveau questionnaire/i));
    const form = screen
      .getByRole("button", { name: /Créer le questionnaire/i })
      .closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Le titre est obligatoire.");
      expect(jobsService.createQuestionnaire).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Question sans texte bloque la création", async () => {
    jobsService.getQuestionnaires.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouveau questionnaire/i));
    fireEvent.click(screen.getByText(/Nouveau questionnaire/i));

    const titreInput = screen.getByPlaceholderText(
      /Ex: Questionnaire Développeur React/i,
    );
    fireEvent.change(titreInput, { target: { value: "Mon Questionnaire" } });

    fireEvent.click(screen.getByText(/Créer le questionnaire/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Toutes les questions doivent avoir un texte.",
      );
    });
  });

  it("🔴 EC4 : Erreur suppression déclenche reportError", async () => {
    jobsService.getQuestionnaires.mockResolvedValue(mockQuestionnaires);
    jobsService.deleteQuestionnaire.mockRejectedValue(
      new Error("Delete failed"),
    );

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByRole("button"));
    const allButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg"));
    fireEvent.click(allButtons[2]);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_DELETE_QUESTIONNAIRE",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la suppression.",
      );
    });
  });

  it("🔴 EC5 : Confirmation annulée ne supprime pas", async () => {
    window.confirm = vi.fn(() => false);
    jobsService.getQuestionnaires.mockResolvedValue(mockQuestionnaires);

    render(
      <MemoryRouter>
        <Questionnaires />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByRole("button"));
    const allButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg"));
    fireEvent.click(allButtons[2]);

    await waitFor(() => {
      expect(jobsService.deleteQuestionnaire).not.toHaveBeenCalled();
    });
  });
});
