// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ArticleDetail from "../src/Pages/Public/ArticleDetail";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getArticleBySlug: vi.fn(),
  },
}));

const mockArticle = {
  id: 1,
  titre: "Comment réussir son entretien",
  slug: "comment-reussir-son-entretien",
  extrait: "Extrait.",
  contenu_html: "<p>Contenu complet.</p>",
  categorie_label: "Conseils carrière",
  date_publication: "2026-08-01T00:00:00Z",
  image_couverture: null,
};

const renderAt = (slug) =>
  render(
    <MemoryRouter initialEntries={[`/blog/${slug}`]}>
      <Routes>
        <Route path="/blog/:slug" element={<ArticleDetail />} />
      </Routes>
    </MemoryRouter>,
  );

describe("📄 UI & Logique - Composant <ArticleDetail />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Affiche l'article récupéré depuis l'API", async () => {
    jobsService.getArticleBySlug.mockResolvedValue(mockArticle);
    renderAt("comment-reussir-son-entretien");

    await waitFor(() => {
      expect(screen.getByText("Comment réussir son entretien")).toBeInTheDocument();
      expect(screen.getByText("Conseils carrière")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Rend le contenu HTML de l'article", async () => {
    jobsService.getArticleBySlug.mockResolvedValue(mockArticle);
    renderAt("comment-reussir-son-entretien");

    await waitFor(() => {
      expect(screen.getByText("Contenu complet.")).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Article introuvable affiche un message et déclenche reportError", async () => {
    jobsService.getArticleBySlug.mockRejectedValue(new Error("404"));
    renderAt("inexistant");

    await waitFor(() => {
      expect(screen.getByText(/Article introuvable/i)).toBeInTheDocument();
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ARTICLE_DETAIL",
        expect.anything(),
      );
    });
  });
});
