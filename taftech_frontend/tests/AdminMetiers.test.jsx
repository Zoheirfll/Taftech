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
import AdminMetiers from "../src/Pages/Admin/AdminMetiers";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminMetiers: vi.fn(),
    createMetier: vi.fn(),
    updateMetier: vi.fn(),
    deleteMetier: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockMetiersPage1 = {
  results: [
    {
      id: 1,
      titre: "Développeur Full-Stack",
      secteur: "IT",
      niveau_experience: "Junior/Senior",
      mots_cles: "React, Django",
      est_actif: true,
    },
    {
      id: 2,
      titre: "Comptable Principal",
      secteur: "FINANCE",
      niveau_experience: "Senior",
      mots_cles: "Comptabilité, TVA",
      est_actif: true,
    },
    {
      id: 3,
      titre: "Métier Inactif",
      secteur: "AUTRE",
      niveau_experience: "",
      mots_cles: "",
      est_actif: false,
    },
  ],
  count: 3,
  total_pages: 1,
};

const mockMetiersPage2 = {
  results: [
    {
      id: 4,
      titre: "Ingénieur DevOps",
      secteur: "IT",
      niveau_experience: "Intermédiaire",
      mots_cles: "Docker, Kubernetes",
      est_actif: true,
    },
  ],
  count: 21,
  total_pages: 2,
};

describe("🗂️ UI & Logique - Composant <AdminMetiers />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Chargement et affichage des métiers", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Développeur Full-Stack")).toBeInTheDocument();
      expect(screen.getByText("Comptable Principal")).toBeInTheDocument();
      expect(screen.getByText("Métier Inactif")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Affichage du compteur total", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/3 métiers au total/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Badge statut actif/inactif", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const actifsElements = screen.getAllByText("Actif");
      expect(actifsElements.length).toBe(2);
      expect(screen.getByText("Inactif")).toBeInTheDocument();
    });
  });

  it("🟢 HP4 : Ouverture modale création", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Ajouter un métier/i));
    fireEvent.click(screen.getByText(/Ajouter un métier/i));

    expect(screen.getByText(/Titre \*/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ex: Développeur Full-Stack/i),
    ).toBeInTheDocument();
  });

  it("🟢 HP5 : Création métier réussie", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);
    jobsService.createMetier.mockResolvedValue({
      id: 5,
      titre: "Nouveau Métier",
      secteur: "IT",
      niveau_experience: "",
      mots_cles: "",
      est_actif: true,
    });

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Ajouter un métier/i));
    fireEvent.click(screen.getByText(/Ajouter un métier/i));

    const titreInput = screen.getByPlaceholderText(
      /Ex: Développeur Full-Stack/i,
    );
    fireEvent.change(titreInput, { target: { value: "Nouveau Métier" } });

    const form = titreInput.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(jobsService.createMetier).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Métier ajouté !");
    });
  });

  it("🟢 HP6 : Ouverture modale édition avec données pré-remplies", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Développeur Full-Stack"));
    const allButtons = screen.getAllByRole("button");
    // bouton 0 = Ajouter, 1 = pencil du 1er métier
    fireEvent.click(allButtons[1]);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Développeur Full-Stack"),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP7 : Suppression métier réussie", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);
    jobsService.deleteMetier.mockResolvedValue({});

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Développeur Full-Stack"));
    const allButtons = screen.getAllByRole("button");
    // bouton 2 = trash du 1er métier
    fireEvent.click(allButtons[2]);

    await waitFor(() => {
      expect(jobsService.deleteMetier).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Métier supprimé.");
    });
  });

  it("🟢 HP8 : Pagination affichée si total_pages > 1", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage2);

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Page 1 \/ 2/i)).toBeInTheDocument();
      expect(screen.getByText(/Suivant →/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP9 : Recherche déclenche fetchMetiers avec debounce", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByPlaceholderText(/Rechercher un métier/i));
    const searchInput = screen.getByPlaceholderText(/Rechercher un métier/i);
    fireEvent.change(searchInput, { target: { value: "développeur" } });

    await waitFor(
      () => {
        expect(jobsService.getAdminMetiers).toHaveBeenCalledWith(
          "développeur",
          1,
        );
      },
      { timeout: 1000 },
    );
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getAdminMetiers.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ADMIN_METIERS",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur de chargement.");
    });
  });

  it("🔴 EC2 : Titre vide bloque la création", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Ajouter un métier/i));
    fireEvent.click(screen.getByText(/Ajouter un métier/i));

    const titreInput = screen.getByPlaceholderText(
      /Ex: Développeur Full-Stack/i,
    );
    const form = titreInput.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Le titre est obligatoire.");
      expect(jobsService.createMetier).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Confirmation annulée ne supprime pas", async () => {
    window.confirm = vi.fn(() => false);
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Développeur Full-Stack"));
    const allButtons = screen.getAllByRole("button");
    fireEvent.click(allButtons[2]);

    await waitFor(() => {
      expect(jobsService.deleteMetier).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC4 : Aucun métier trouvé", async () => {
    jobsService.getAdminMetiers.mockResolvedValue({
      results: [],
      count: 0,
      total_pages: 1,
    });

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucun métier trouvé/i)).toBeInTheDocument();
    });
  });

  it("🔴 EC5 : Erreur suppression déclenche reportError", async () => {
    jobsService.getAdminMetiers.mockResolvedValue(mockMetiersPage1);
    jobsService.deleteMetier.mockRejectedValue(new Error("Delete failed"));

    render(
      <MemoryRouter>
        <AdminMetiers />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Développeur Full-Stack"));
    const allButtons = screen.getAllByRole("button");
    fireEvent.click(allButtons[2]);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_DELETE_METIER",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la suppression.",
      );
    });
  });
});
