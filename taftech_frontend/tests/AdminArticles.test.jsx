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
import AdminArticles from "../src/Pages/Admin/AdminArticles";
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// TipTap/ProseMirror exige des APIs DOM que jsdom ne fournit pas complètement — on remplace
// l'éditeur par un simple textarea pour isoler les tests d'AdminArticles de l'implémentation
// de l'éditeur (déjà un composant séparé, testable indépendamment si besoin).
vi.mock("../src/Components/RichTextEditor", () => ({
  default: ({ value, onChange }) => (
    <textarea data-testid="rich-text-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminArticles: vi.fn(),
    getAdminArticle: vi.fn(),
    getAdminArticleCategories: vi.fn(),
    createArticle: vi.fn(),
    updateArticle: vi.fn(),
    deleteArticle: vi.fn(),
    createArticleCategory: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockArticles = [
  { id: 1, titre: "Comment réussir son entretien", categorie_label: "Conseils carrière", statut: "PUBLIE" },
  { id: 2, titre: "Brouillon en cours", categorie_label: null, statut: "BROUILLON" },
];

const mockCategories = [{ id: 1, label: "Conseils carrière" }];

describe("📰 UI & Logique - Composant <AdminArticles />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminArticles.mockResolvedValue(mockArticles);
    jobsService.getAdminArticleCategories.mockResolvedValue(mockCategories);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Chargement et affichage des articles", async () => {
    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Comment réussir son entretien")).toBeInTheDocument();
      expect(screen.getByText("Brouillon en cours")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Statut Publié/Brouillon affiché", async () => {
    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Publié")).toBeInTheDocument();
      expect(screen.getByText("Brouillon")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Ouverture du formulaire de création", async () => {
    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouvel article/i));
    fireEvent.click(screen.getByText(/Nouvel article/i));

    expect(screen.getByText(/^Nouvel article$/)).toBeInTheDocument();
    expect(screen.getByTestId("rich-text-editor")).toBeInTheDocument();
  });

  it("🟢 HP4 : Création d'un article réussie", async () => {
    jobsService.createArticle.mockResolvedValue({ id: 3 });

    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouvel article/i));
    fireEvent.click(screen.getByText(/Nouvel article/i));

    const titreInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(titreInput, { target: { value: "Nouvel article de test" } });

    const extraitInput = screen.getByPlaceholderText(/Affiché dans la liste/i);
    fireEvent.change(extraitInput, { target: { value: "Un extrait de test." } });

    const editor = screen.getByTestId("rich-text-editor");
    fireEvent.change(editor, { target: { value: "<p>Contenu réel.</p>" } });

    const form = extraitInput.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(jobsService.createArticle).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Article créé !");
    });
  });

  it("🟢 HP5 : Suppression d'un article réussie", async () => {
    jobsService.deleteArticle.mockResolvedValue({});

    render(
      <MemoryRouter>
        <AdminArticles />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Comment réussir son entretien"));
    const allButtons = screen.getAllByRole("button");
    // 0 = Nouvel article, puis pencil/trash par ligne — 1er trash après le 1er pencil
    fireEvent.click(allButtons[2]);
    fireEvent.click(await screen.findByText("Confirmer"));

    await waitFor(() => {
      expect(jobsService.deleteArticle).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Article supprimé.");
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getAdminArticles.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ADMIN_ARTICLES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur de chargement.");
    });
  });

  it("🔴 EC2 : Contenu vide bloque la création", async () => {
    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Nouvel article/i));
    fireEvent.click(screen.getByText(/Nouvel article/i));

    const titreInput = screen.getAllByRole("textbox")[0];
    fireEvent.change(titreInput, { target: { value: "Titre sans contenu" } });
    const extraitInput = screen.getByPlaceholderText(/Affiché dans la liste/i);
    fireEvent.change(extraitInput, { target: { value: "Un extrait." } });

    const form = extraitInput.closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Le contenu ne peut pas être vide.");
      expect(jobsService.createArticle).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Aucun article configuré", async () => {
    jobsService.getAdminArticles.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucun article pour l'instant/i)).toBeInTheDocument();
    });
  });
});
