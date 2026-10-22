// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import AdminStatsPeriode from "../src/Pages/Admin/AdminStatsPeriode";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminStatsPeriode: vi.fn(),
    exportAdminStatsPeriode: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  }),
}));

// Les graphiques recharts ne se dessinent pas dans jsdom (pas de taille) : on teste la page, pas recharts.
vi.mock("../src/Components/StatsPeriodeGraphiques", () => ({
  EvolutionChart: ({ ariaLabel }) => <div role="img" aria-label={ariaLabel} />,
  DistributionChart: ({ ariaLabel }) => <div role="img" aria-label={ariaLabel} />,
}));
vi.mock("../src/Components/FunnelChart", () => ({
  default: ({ etapes }) => <div data-testid="entonnoir">{etapes.length} étapes</div>,
}));

const indicateur = (valeur, precedente, variation) => ({ valeur, precedente, variation_pct: variation });

const donnees = (surcharge = {}) => ({
  periode: { debut: "2026-01-01", fin: "2026-12-31" },
  indicateurs: {
    offres: indicateur(30, 20, 50),
    candidatures: indicateur(120, 0, null),
    inscriptions_candidats: indicateur(40, 50, -20),
    inscriptions_recruteurs: indicateur(5, 5, 0),
    recrutements: indicateur(7, 4, 75),
    revenu_da: indicateur(15000, 10000, 50),
  },
  evolution: [{ mois: "2026-01", offres: 3, candidatures: 10, recrutements: 1, inscriptions_candidats: 4, inscriptions_recruteurs: 1, revenu_da: 0 }],
  entonnoir: {
    etapes: [
      { cle: "deposees", libelle: "Candidatures déposées", nb: 100, pct_du_total: 100, taux_passage: null },
      { cle: "examinees", libelle: "Examinées", nb: 60, pct_du_total: 60, taux_passage: 60 },
      { cle: "preselectionnees", libelle: "Présélectionnées", nb: 30, pct_du_total: 30, taux_passage: 50 },
      { cle: "entretiens", libelle: "Entretiens", nb: 10, pct_du_total: 10, taux_passage: 33.3 },
      { cle: "retenues", libelle: "Retenues", nb: 5, pct_du_total: 5, taux_passage: 50 },
    ],
    refusees: 12,
  },
  offres: { offres_approuvees: 25, sans_candidature: 4, expirees_sans_candidature: 2, candidatures_par_offre: 4.8 },
  matching: { moyenne: 66.5, distribution: [{ tranche: "0-20", nb: 1 }] },
  abonnements: {
    actifs: 3,
    par_palier: [{ palier: "PRO", nb: 3 }],
    expirations: { sous_7_jours: 1, sous_30_jours: 2 },
    revenu_par_palier: [{ palier: "PRO", nb_paiements: 3, total_da: 15000 }],
  },
  ...surcharge,
});

describe("📊 UI & Logique - Composant <AdminStatsPeriode />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminStatsPeriode.mockResolvedValue(donnees());
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 charge la période par défaut (365 jours) au premier affichage", async () => {
    render(<AdminStatsPeriode />);
    await screen.findByText("Offres créées");
    const [debut, fin] = jobsService.getAdminStatsPeriode.mock.calls[0];
    expect(debut).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(debut < fin).toBe(true);
    expect(screen.getByLabelText("Date de début")).toHaveValue(debut);
  });

  it("🟢 affiche les indicateurs avec leur variation, ou un tiret sans période précédente", async () => {
    render(<AdminStatsPeriode />);
    await screen.findByText("Offres créées");
    expect(screen.getAllByText("+50 %")).toHaveLength(2);
    expect(screen.getByText("-20 %")).toBeInTheDocument();
    expect(screen.getByText("+75 %")).toBeInTheDocument();
    // Candidatures : période précédente à 0 → pas de pourcentage, un tiret.
    expect(screen.getAllByTitle(/pas de comparaison possible/i)).toHaveLength(1);
  });

  it("🟢 affiche l'entonnoir, les offres, le matching et les abonnements", async () => {
    render(<AdminStatsPeriode />);
    await screen.findByText("Entonnoir de recrutement");
    expect(screen.getByTestId("entonnoir")).toHaveTextContent("5 étapes");
    expect(screen.getByText("Refusées")).toBeInTheDocument();
    expect(screen.getByText("Expirées sans candidature")).toBeInTheDocument();
    expect(screen.getByText(/66.5 %/)).toBeInTheDocument();
    expect(screen.getByText("Pro")).toBeInTheDocument();
  });

  it("🟡 signale les approximations (pas d'historique des statuts ni des paliers)", async () => {
    render(<AdminStatsPeriode />);
    await screen.findByText("Entonnoir de recrutement");
    expect(screen.getAllByText(/historique des changements de/i).length).toBeGreaterThanOrEqual(2);
  });

  it("🟢 un raccourci recharge les données sur la nouvelle période", async () => {
    render(<AdminStatsPeriode />);
    await screen.findByText("Offres créées");
    const [debutInitial] = jobsService.getAdminStatsPeriode.mock.calls[0];
    fireEvent.click(screen.getByRole("button", { name: "30 jours" }));
    await waitFor(() => expect(jobsService.getAdminStatsPeriode).toHaveBeenCalledTimes(2));
    const [debut30] = jobsService.getAdminStatsPeriode.mock.calls[1];
    expect(debut30 > debutInitial).toBe(true);
  });

  it("🔴 refuse une période dont le début suit la fin, sans appeler le serveur", async () => {
    render(<AdminStatsPeriode />);
    await screen.findByText("Offres créées");
    fireEvent.change(screen.getByLabelText("Date de fin"), { target: { value: "2020-01-01" } });
    fireEvent.change(screen.getByLabelText("Date de début"), { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(toast.error).toHaveBeenCalledWith("Période invalide\nLa date de début doit précéder la date de fin.");
    expect(jobsService.getAdminStatsPeriode).toHaveBeenCalledTimes(1);
  });

  it("🔴 affiche une erreur de chargement avec possibilité de réessayer", async () => {
    jobsService.getAdminStatsPeriode.mockRejectedValueOnce(new Error("boom"));
    render(<AdminStatsPeriode />);
    expect(await screen.findByText("Impossible de charger les statistiques.")).toBeInTheDocument();
    expect(reporter.reportError).toHaveBeenCalledWith("ECHEC_CHARGEMENT_STATS_PERIODE", expect.any(Error));
    fireEvent.click(screen.getByRole("button", { name: /réessayer/i }));
    expect(await screen.findByText("Offres créées")).toBeInTheDocument();
  });

  it("🟢 l'export télécharge un fichier .xlsx pour la période affichée", async () => {
    jobsService.exportAdminStatsPeriode.mockResolvedValue(new Blob(["x"]));
    window.URL.createObjectURL = vi.fn(() => "blob:test");
    window.URL.revokeObjectURL = vi.fn();
    render(<AdminStatsPeriode />);
    await screen.findByText("Offres créées");
    const [debut, fin] = jobsService.getAdminStatsPeriode.mock.calls[0];
    fireEvent.click(screen.getByRole("button", { name: /exporter/i }));
    await waitFor(() => expect(jobsService.exportAdminStatsPeriode).toHaveBeenCalledWith(debut, fin, null));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Téléchargement terminé"));
  });

  it("🟢 le filtre par entreprise recharge les données et l'export pour cette entreprise", async () => {
    jobsService.getAdminStatsPeriode.mockResolvedValue(
      donnees({ entreprises: [{ id: 7, nom: "TechCorp" }, { id: 9, nom: "AutreCorp" }] }),
    );
    render(<AdminStatsPeriode />);
    await screen.findByText("Offres créées");
    expect(screen.getByRole("option", { name: "Toutes les entreprises" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filtrer par entreprise"), { target: { value: "9" } });
    await waitFor(() => expect(jobsService.getAdminStatsPeriode).toHaveBeenCalledTimes(2));
    expect(jobsService.getAdminStatsPeriode.mock.calls[1][2]).toBe("9");
  });

  it("🟡 avec une entreprise, les inscriptions (non rattachables) sont masquées et expliquées", async () => {
    const sansInscriptions = donnees().indicateurs;
    delete sansInscriptions.inscriptions_candidats;
    delete sansInscriptions.inscriptions_recruteurs;
    jobsService.getAdminStatsPeriode.mockResolvedValue(
      donnees({ indicateurs: sansInscriptions, entreprise: { id: 7, nom: "TechCorp" }, entreprises: [{ id: 7, nom: "TechCorp" }] }),
    );
    render(<AdminStatsPeriode />);
    await screen.findByText("Offres créées");
    expect(screen.queryByText("Nouveaux candidats")).not.toBeInTheDocument();
    expect(screen.queryByText("Nouveaux recruteurs")).not.toBeInTheDocument();
    expect(screen.queryByText("Inscriptions par mois")).not.toBeInTheDocument();
    expect(screen.getByText(/ne se rattachent pas à une entreprise/i)).toBeInTheDocument();
  });
});
