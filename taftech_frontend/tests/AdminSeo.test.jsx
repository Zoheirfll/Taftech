// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import AdminSeo from "../src/Pages/Admin/AdminSeo";
import { jobsService } from "../src/Services/jobsService";

vi.mock("../src/Services/jobsService");

const MOCK_DATA = {
  pages: [
    { type: "Offre d'emploi", url: "https://taftech.dz/entreprises/taftech/offres-d-emploi/rh/dev-abc123/", nb_pages_indexables: 12, ok: true },
    { type: "Entreprise", url: "https://taftech.dz/entreprise/taftech/", nb_pages_indexables: 5, ok: true },
    { type: "Métier", url: "https://taftech.dz/metiers/l18-informatique/", nb_pages_indexables: 87, ok: true },
    { type: "Secteur", url: "https://taftech.dz/secteurs/a-agriculture/", nb_pages_indexables: 16, ok: true },
    { type: "Wilaya", url: "https://taftech.dz/regions/16-alger/", nb_pages_indexables: 58, ok: true },
    { type: "Blog / Article", url: null, nb_pages_indexables: 0, ok: false },
  ],
  sitemap_url: "https://taftech.dz/sitemap.xml",
  robots_url: "https://taftech.dz/robots.txt",
  total_urls_sitemap: 187,
};

describe("🔍 UI - Composant <AdminSeo />", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Affiche un exemple d'URL réel par type de page", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue(MOCK_DATA);
    render(<AdminSeo />);

    await waitFor(() => expect(screen.getByText("Offre d'emploi")).toBeInTheDocument());
    expect(screen.getByText("Entreprise")).toBeInTheDocument();
    expect(screen.getByText("Métier")).toBeInTheDocument();
    expect(screen.getByText("Secteur")).toBeInTheDocument();
    expect(screen.getByText("Wilaya")).toBeInTheDocument();
    expect(screen.getByText("Blog / Article")).toBeInTheDocument();
    expect(screen.getByText(/entreprises\/taftech\/offres-d-emploi/)).toBeInTheDocument();
  });

  it("🟢 HP2 : Signale un type de page sans contenu publié (Blog)", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue(MOCK_DATA);
    render(<AdminSeo />);

    await waitFor(() => expect(screen.getByText("Aucune page publiée")).toBeInTheDocument());
    expect(screen.getByText(/5\/6 types de page ont du contenu publié/)).toBeInTheDocument();
  });

  it("🟢 HP3 : Affiche le bandeau de réassurance quand tout est OK", async () => {
    const toutOk = { ...MOCK_DATA, pages: MOCK_DATA.pages.map((p) => ({ ...p, ok: true, url: p.url || "https://taftech.dz/blog/x/" })) };
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue(toutOk);
    render(<AdminSeo />);

    await waitFor(() =>
      expect(screen.getByText(/Toutes les pages importantes ont une URL propre/i)).toBeInTheDocument(),
    );
  });

  it("🔴 EC1 : Affiche un message d'erreur si le chargement échoue", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockRejectedValue(new Error("network"));
    render(<AdminSeo />);

    await waitFor(() => expect(screen.getByText(/Impossible de charger les données SEO/)).toBeInTheDocument());
  });
});
