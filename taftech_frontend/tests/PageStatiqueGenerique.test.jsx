// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PageStatiqueGenerique from "../src/Pages/Public/PageStatiqueGenerique";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getPageStatique: vi.fn(),
  },
}));

describe("📃 UI & Logique - Composant <PageStatiqueGenerique />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Affiche le contenu via slugFixe (route /cgu)", async () => {
    jobsService.getPageStatique.mockResolvedValue({
      id: 1, slug: "cgu", titre: "Conditions Générales d'Utilisation", contenu_html: "<p>Texte CGU.</p>",
    });

    render(
      <MemoryRouter>
        <PageStatiqueGenerique slugFixe="cgu" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(jobsService.getPageStatique).toHaveBeenCalledWith("cgu");
      expect(screen.getByText("Conditions Générales d'Utilisation")).toBeInTheDocument();
      expect(screen.getByText("Texte CGU.")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Affiche le contenu via paramètre d'URL (route /pages/:slug)", async () => {
    jobsService.getPageStatique.mockResolvedValue({
      id: 2, slug: "partenaires", titre: "Nos partenaires", contenu_html: "<p>Liste.</p>",
    });

    render(
      <MemoryRouter initialEntries={["/pages/partenaires"]}>
        <Routes>
          <Route path="/pages/:slug" element={<PageStatiqueGenerique />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(jobsService.getPageStatique).toHaveBeenCalledWith("partenaires");
      expect(screen.getByText("Nos partenaires")).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Page introuvable affiche un message", async () => {
    jobsService.getPageStatique.mockRejectedValue(new Error("404"));

    render(
      <MemoryRouter>
        <PageStatiqueGenerique slugFixe="inexistante" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Page introuvable/i)).toBeInTheDocument();
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_PAGE_STATIQUE",
        expect.anything(),
      );
    });
  });
});
