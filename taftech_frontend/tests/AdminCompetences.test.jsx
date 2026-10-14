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
import AdminCompetences from "../src/Pages/Admin/AdminCompetences";
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminCompetences: vi.fn(),
    createCompetence: vi.fn(),
    updateCompetence: vi.fn(),
    deleteCompetence: vi.fn(),
    changerStatutCompetence: vi.fn(),
    proposerCompetences: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockItems = [
  { id: 1, label: "Gestion de projet", actif: true },
  { id: 2, label: "Compétence masquée", actif: false },
];

const mockPage = (results) => ({ results, count: results.length, total_pages: 1 });

describe("🏷️ UI & Logique - Composant <AdminCompetences />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminCompetences.mockResolvedValue(mockPage(mockItems));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Chargement et affichage des compétences", async () => {
    render(
      <MemoryRouter>
        <AdminCompetences />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Gestion de projet")).toBeInTheDocument();
      expect(screen.getByText("Compétence masquée")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Statut Validée/Désactivée affiché (repli sur l'ancien booléen actif)", async () => {
    render(
      <MemoryRouter>
        <AdminCompetences />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Validée", { selector: "span" })).toBeInTheDocument();
      expect(screen.getByText("Désactivée", { selector: "span" })).toBeInTheDocument();
    });
  });

  it("🟢 HP6 : Une proposition « Suggérée » se valide et affiche son usage", async () => {
    jobsService.getAdminCompetences.mockResolvedValue({
      results: [{
        id: 7, label: "Prompt engineering", actif: false, statut: "SUGGEREE", origine: "PROPOSITION_AUTO",
        nb_candidats: 4, nb_offres: 1, transitions_possibles: ["REJETEE", "VALIDEE"],
      }],
      count: 1, total_pages: 1, compteurs: { SUGGEREE: 1, VALIDEE: 5, REJETEE: 0, DESACTIVEE: 0 },
    });
    jobsService.changerStatutCompetence.mockResolvedValue({ id: 7, statut: "VALIDEE", liens_crees: 3 });
    render(<MemoryRouter><AdminCompetences /></MemoryRouter>);

    expect(await screen.findByText("4 candidat(s) · 1 offre(s)")).toBeInTheDocument();
    expect(screen.getByText("Proposition automatique")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Suggérées\s*\(1\)/ })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Valider Prompt engineering"));
    await waitFor(() => {
      expect(jobsService.changerStatutCompetence).toHaveBeenCalledWith(7, "VALIDEE");
      expect(toast.success).toHaveBeenCalledWith("« Prompt engineering » est maintenant officielle — 3 saisie(s) existante(s) rattachée(s).");
    });
  });

  it("🟢 HP7 : Rejeter une proposition", async () => {
    jobsService.getAdminCompetences.mockResolvedValue({
      results: [{ id: 8, label: "Bruit", actif: false, statut: "SUGGEREE", transitions_possibles: ["REJETEE", "VALIDEE"] }],
      count: 1, total_pages: 1, compteurs: {},
    });
    jobsService.changerStatutCompetence.mockResolvedValue({ id: 8, statut: "REJETEE" });
    render(<MemoryRouter><AdminCompetences /></MemoryRouter>);
    fireEvent.click(await screen.findByLabelText("Rejeter Bruit"));
    await waitFor(() => expect(jobsService.changerStatutCompetence).toHaveBeenCalledWith(8, "REJETEE"));
  });

  it("🟢 HP8 : L'onglet filtre par statut côté serveur", async () => {
    render(<MemoryRouter><AdminCompetences /></MemoryRouter>);
    await waitFor(() => screen.getByText("Gestion de projet"));
    fireEvent.click(screen.getByRole("tab", { name: /^Rejetées/ }));
    await waitFor(() => expect(jobsService.getAdminCompetences).toHaveBeenLastCalledWith("", 1, "REJETEE"));
  });

  it("🟢 HP9 : La détection crée des propositions et bascule sur l'onglet Suggérées", async () => {
    jobsService.proposerCompetences.mockResolvedValue({ nb: 2, seuil: 3, propositions: [] });
    render(<MemoryRouter><AdminCompetences /></MemoryRouter>);
    await waitFor(() => screen.getByText("Gestion de projet"));
    fireEvent.click(screen.getByText(/Détecter les propositions/i));
    await waitFor(() => {
      expect(jobsService.proposerCompetences).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("2 compétence(s) proposée(s), en attente de votre validation.");
      expect(jobsService.getAdminCompetences).toHaveBeenLastCalledWith("", 1, "SUGGEREE");
    });
  });

  it("🟢 HP3 : Recherche déclenche fetchItems avec debounce", async () => {
    render(
      <MemoryRouter>
        <AdminCompetences />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByPlaceholderText(/Rechercher une compétence/i));
    fireEvent.change(screen.getByPlaceholderText(/Rechercher une compétence/i), { target: { value: "gestion" } });

    await waitFor(
      () => {
        expect(jobsService.getAdminCompetences).toHaveBeenCalledWith("gestion", 1, "");
      },
      { timeout: 1000 },
    );
  });

  it("🟢 HP4 : Création d'une compétence réussie", async () => {
    jobsService.createCompetence.mockResolvedValue({ id: 3, label: "Nouvelle", actif: true });

    render(
      <MemoryRouter>
        <AdminCompetences />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Ajouter une compétence/i));
    fireEvent.click(screen.getByText(/Ajouter une compétence/i));

    fireEvent.change(document.querySelector("form input"), { target: { value: "Nouvelle" } });
    const form = document.querySelector("form input").closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(jobsService.createCompetence).toHaveBeenCalledWith({ label: "Nouvelle", synonymes: "" });
      expect(toast.success).toHaveBeenCalledWith("Compétence ajoutée !");
    });
  });

  it("🟢 HP5 : Suppression d'une compétence réussie", async () => {
    jobsService.deleteCompetence.mockResolvedValue({});

    render(
      <MemoryRouter>
        <AdminCompetences />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Gestion de projet"));
    // Ciblage par libellé accessible (plus robuste qu'un index de bouton)
    fireEvent.click(screen.getByLabelText("Supprimer Gestion de projet"));
    fireEvent.click(await screen.findByText("Confirmer"));

    await waitFor(() => {
      expect(jobsService.deleteCompetence).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Compétence supprimée.");
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getAdminCompetences.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <AdminCompetences />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ADMIN_COMPETENCES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur de chargement.");
    });
  });

  it("🔴 EC2 : Libellé vide bloque la création", async () => {
    render(
      <MemoryRouter>
        <AdminCompetences />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Ajouter une compétence/i));
    fireEvent.click(screen.getByText(/Ajouter une compétence/i));

    const form = document.querySelector("form input").closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Le libellé est obligatoire.");
      expect(jobsService.createCompetence).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Aucune compétence trouvée", async () => {
    jobsService.getAdminCompetences.mockResolvedValue(mockPage([]));

    render(
      <MemoryRouter>
        <AdminCompetences />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucune compétence trouvée/i)).toBeInTheDocument();
    });
  });
});
