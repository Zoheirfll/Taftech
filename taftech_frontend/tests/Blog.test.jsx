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
import Blog from "../src/Pages/Public/Blog";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getArticles: vi.fn(),
    getArticleCategories: vi.fn(),
  },
}));

const mockArticles = {
  results: [
    { id: 1, titre: "Comment réussir son entretien", slug: "comment-reussir-son-entretien", extrait: "Extrait 1.", categorie_label: "Conseils carrière", date_publication: "2026-08-01T00:00:00Z", image_couverture: null },
    { id: 2, titre: "Actu recrutement", slug: "actu-recrutement", extrait: "Extrait 2.", categorie_label: null, date_publication: "2026-08-02T00:00:00Z", image_couverture: null },
  ],
  next: null,
  previous: null,
  count: 2,
};

const mockCategories = [{ id: 1, label: "Conseils carrière" }];

describe("📰 UI & Logique - Composant <Blog />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getArticles.mockResolvedValue(mockArticles);
    jobsService.getArticleCategories.mockResolvedValue(mockCategories);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Affiche les articles récupérés depuis l'API", async () => {
    render(
      <MemoryRouter>
        <Blog />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Comment réussir son entretien")).toBeInTheDocument();
      expect(screen.getByText("Actu recrutement")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Affiche les filtres de catégorie", async () => {
    render(
      <MemoryRouter>
        <Blog />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Tous")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Conseils carrière" })).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Cliquer une catégorie relance getArticles avec le filtre", async () => {
    render(
      <MemoryRouter>
        <Blog />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByRole("button", { name: "Conseils carrière" }));
    fireEvent.click(screen.getByRole("button", { name: "Conseils carrière" }));

    await waitFor(() => {
      expect(jobsService.getArticles).toHaveBeenCalledWith(1, "1");
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getArticles.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <Blog />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ARTICLES_BLOG",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 : Aucun article", async () => {
    jobsService.getArticles.mockResolvedValue({ results: [], next: null, previous: null, count: 0 });

    render(
      <MemoryRouter>
        <Blog />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucun article pour l'instant/i)).toBeInTheDocument();
    });
  });
});
