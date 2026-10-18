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
    { type: "Secteur", url: "https://taftech.dz/secteurs/2-agriculture/", nb_pages_indexables: 77, ok: true },
    { type: "Wilaya", url: "https://taftech.dz/regions/16-alger/", nb_pages_indexables: 58, ok: true },
    { type: "Blog / Article", url: null, nb_pages_indexables: 0, ok: false },
  ],
  sitemap_url: "https://taftech.dz/sitemap.xml",
  robots_url: "https://taftech.dz/robots.txt",
  total_urls_sitemap: 187,
  pages_statiques: 12,
  job_posting: { eligibles: 12, sans_date_fin: 3, exclues_cloturees: 2, exclues_expirees: 1, exclues_inactives: 4 },
  rendu_serveur_pret: true,
  alertes: [],
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
    expect(screen.getByText("Secteur")).toBeInTheDocument();
    expect(screen.getByText("Wilaya")).toBeInTheDocument();
    expect(screen.getByText("Blog / Article")).toBeInTheDocument();
    expect(screen.getByText(/entreprises\/taftech\/offres-d-emploi/)).toBeInTheDocument();
  });

  it("🟢 HP2 : Signale un type de page sans contenu publié (Blog)", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue(MOCK_DATA);
    render(<AdminSeo />);

    await waitFor(() => expect(screen.getByText("Aucune page publiée")).toBeInTheDocument());
    expect(screen.getByText(/4\/5 types de page ont du contenu publié/)).toBeInTheDocument();
  });

  it("🟢 HP3 : Affiche le bandeau de réassurance quand tout est OK", async () => {
    const toutOk = { ...MOCK_DATA, pages: MOCK_DATA.pages.map((p) => ({ ...p, ok: true, url: p.url || "https://taftech.dz/blog/x/" })) };
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue(toutOk);
    render(<AdminSeo />);

    await waitFor(() =>
      expect(screen.getByText(/Toutes les pages importantes ont une URL propre/i)).toBeInTheDocument(),
    );
  });

  it("🟢 HP4 : Affiche la ligne des pages fixes et la couverture Google Emploi", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue(MOCK_DATA);
    render(<AdminSeo />);

    expect(await screen.findByText("Pages fixes")).toBeInTheDocument();
    expect(screen.getByText("Google Emploi (données JobPosting)")).toBeInTheDocument();
    expect(screen.getByText("Offres éligibles")).toBeInTheDocument();
    expect(screen.getByText("Clôturées")).toBeInTheDocument();
    expect(screen.getByText(/3 offre\(s\) éligible\(s\) sans date de fin/)).toBeInTheDocument();
  });

  it("🟡 HP5 : Pas de rappel « sans date de fin » quand toutes les offres en ont une", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue({
      ...MOCK_DATA,
      job_posting: { ...MOCK_DATA.job_posting, sans_date_fin: 0 },
    });
    render(<AdminSeo />);

    await screen.findByText("Offres éligibles");
    expect(screen.queryByText(/sans date de fin/)).not.toBeInTheDocument();
  });

  it("🟢 HP6 : Indique si le rendu serveur des balises est prêt ou indisponible", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue(MOCK_DATA);
    const { unmount } = render(<AdminSeo />);
    expect(await screen.findByText(/prêts \(index\.html trouvé\)/)).toBeInTheDocument();
    unmount();

    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue({ ...MOCK_DATA, rendu_serveur_pret: false });
    render(<AdminSeo />);
    expect(await screen.findByText(/indisponibles \(index\.html introuvable/)).toBeInTheDocument();
  });

  it("🟡 HP7 : Affiche l'alerte quand SITE_URL est local, et rien sinon", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue({
      ...MOCK_DATA,
      alertes: [{ code: "SITE_URL_LOCAL", message: "SITE_URL pointe vers une adresse locale : de fausses adresses seraient publiées." }],
    });
    const { unmount } = render(<AdminSeo />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/adresse locale/);
    unmount();

    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue(MOCK_DATA);
    render(<AdminSeo />);
    await screen.findByText("Pages fixes");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("🟢 HP8 : Propose les outils Google externes avec rel=noopener", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockResolvedValue(MOCK_DATA);
    render(<AdminSeo />);

    const lien = await screen.findByRole("link", { name: /Google Search Console/ });
    expect(lien).toHaveAttribute("href", "https://search.google.com/search-console");
    expect(lien).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("🔴 EC1 : Affiche un message d'erreur si le chargement échoue", async () => {
    jobsService.getAdminSeoStats = vi.fn().mockRejectedValue(new Error("network"));
    render(<AdminSeo />);

    await waitFor(() => expect(screen.getByText(/Impossible de charger les données SEO/)).toBeInTheDocument());
  });
});
