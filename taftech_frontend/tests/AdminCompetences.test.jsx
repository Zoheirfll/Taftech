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
import { adminService } from "../src/Services/adminService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminCompetences: vi.fn(),
    createCompetence: vi.fn(),
    updateCompetence: vi.fn(),
    deleteCompetence: vi.fn(),
    changerStatutCompetence: vi.fn(),
  },
}));

vi.mock("../src/Services/adminService", () => ({
  adminService: { getAdminStats: vi.fn(), getDemandesAjout: vi.fn() },
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
    adminService.getAdminStats.mockResolvedValue({});
    adminService.getDemandesAjout.mockResolvedValue({ results: [], count: 0, total_pages: 1, compteurs: {} });
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

  it("🟢 HP6 : Une compétence masquée se réactive et affiche son usage", async () => {
    jobsService.getAdminCompetences.mockResolvedValue({
      results: [{
        id: 7, label: "Prompt engineering", actif: false, statut: "DESACTIVEE", origine: "IMPORT",
        nb_candidats: 4, nb_offres: 1, transitions_possibles: ["VALIDEE"],
      }],
      count: 1, total_pages: 1, compteurs: { VALIDEE: 5, DESACTIVEE: 1 },
    });
    jobsService.changerStatutCompetence.mockResolvedValue({ id: 7, statut: "VALIDEE", liens_crees: 3 });
    render(<MemoryRouter><AdminCompetences /></MemoryRouter>);

    expect(await screen.findByText("4 candidat(s) · 1 offre(s)")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Actives\s*\(5\)/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Masquées\s*\(1\)/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Suggérées|Rejetées/ })).toBeNull();

    fireEvent.click(screen.getByLabelText("Réactiver Prompt engineering"));
    await waitFor(() => {
      expect(jobsService.changerStatutCompetence).toHaveBeenCalledWith(7, "VALIDEE");
      expect(toast.success).toHaveBeenCalledWith("« Prompt engineering » est maintenant officielle — 3 saisie(s) existante(s) rattachée(s).");
    });
  });

  it("🟢 HP7 : Masquer une compétence active", async () => {
    jobsService.getAdminCompetences.mockResolvedValue({
      results: [{ id: 8, label: "Bruit", actif: true, statut: "VALIDEE", transitions_possibles: ["DESACTIVEE"] }],
      count: 1, total_pages: 1, compteurs: {},
    });
    jobsService.changerStatutCompetence.mockResolvedValue({ id: 8, statut: "DESACTIVEE" });
    render(<MemoryRouter><AdminCompetences /></MemoryRouter>);
    fireEvent.click(await screen.findByLabelText("Désactiver Bruit"));
    await waitFor(() => expect(jobsService.changerStatutCompetence).toHaveBeenCalledWith(8, "DESACTIVEE"));
  });

  it("🟢 HP8 : La pastille filtre par statut côté serveur", async () => {
    render(<MemoryRouter><AdminCompetences /></MemoryRouter>);
    await waitFor(() => screen.getByText("Gestion de projet"));
    fireEvent.click(screen.getByRole("tab", { name: /^Masquées/ }));
    await waitFor(() => expect(jobsService.getAdminCompetences).toHaveBeenLastCalledWith("", 1, "DESACTIVEE"));
  });

  it("🟢 HP9 : L'onglet Demandes charge les demandes de compétences, avec leur badge ; plus de bouton « Détecter »", async () => {
    adminService.getAdminStats.mockResolvedValue({ demandes_a_examiner: { COMPETENCE: 3 } });
    render(<MemoryRouter><AdminCompetences /></MemoryRouter>);
    await waitFor(() => screen.getByText("Gestion de projet"));
    expect(screen.queryByText(/Détecter les propositions/i)).toBeNull();
    const onglet = screen.getByRole("tab", { name: /Demandes/ });
    await waitFor(() => expect(onglet).toHaveTextContent("3"));

    fireEvent.click(onglet);
    await waitFor(() =>
      expect(adminService.getDemandesAjout).toHaveBeenCalledWith(expect.objectContaining({ type: "COMPETENCE", statut: "A_EXAMINER" })),
    );
    expect(await screen.findByText("Aucune demande de compétence.")).toBeInTheDocument();
    expect(screen.queryByText("Gestion de projet")).toBeNull();
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
