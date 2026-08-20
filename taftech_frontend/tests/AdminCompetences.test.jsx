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

describe("🏷️ UI & Logique - Composant <AdminCompetences />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminCompetences.mockResolvedValue(mockItems);
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

  it("🟢 HP2 : Statut Suggérée/Masquée affiché", async () => {
    render(
      <MemoryRouter>
        <AdminCompetences />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Suggérée")).toBeInTheDocument();
      expect(screen.getByText("Masquée")).toBeInTheDocument();
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
        expect(jobsService.getAdminCompetences).toHaveBeenCalledWith("gestion");
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

    fireEvent.change(screen.getByPlaceholderText(/Ex: Gestion de projet/i), { target: { value: "Nouvelle" } });
    const form = screen.getByPlaceholderText(/Ex: Gestion de projet/i).closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(jobsService.createCompetence).toHaveBeenCalledWith({ label: "Nouvelle", actif: true });
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
    const allButtons = screen.getAllByRole("button");
    // 0 = Ajouter, 1 = pencil(item1), 2 = trash(item1)
    fireEvent.click(allButtons[2]);
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

    const form = screen.getByPlaceholderText(/Ex: Gestion de projet/i).closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Le libellé est obligatoire.");
      expect(jobsService.createCompetence).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Aucune compétence trouvée", async () => {
    jobsService.getAdminCompetences.mockResolvedValue([]);

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
