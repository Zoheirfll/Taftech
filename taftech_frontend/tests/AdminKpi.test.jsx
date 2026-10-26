// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import AdminKpi from "../src/Pages/Admin/AdminKpi";
import { jobsService } from "../src/Services/jobsService";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getAdminKpi: vi.fn(), getAdminKpiDetail: vi.fn(), exportAdminKpi: vi.fn() },
}));

// Les graphiques recharts ne se dessinent pas dans jsdom (pas de taille) : on teste la page, pas recharts.
vi.mock("../src/Components/StatsPeriodeGraphiques", () => ({
  EvolutionChart: ({ ariaLabel }) => <div role="img" aria-label={ariaLabel} />,
  DistributionChart: ({ ariaLabel }) => <div role="img" aria-label={ariaLabel} />,
  libelleMois: (m) => m,
}));

vi.mock("react-hot-toast", () => ({
  default: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  }),
}));

const mesure = (valeur, precedente, variation) => ({ valeur, precedente, variation_pct: variation });

const donnees = (surcharge = {}) => ({
  periode: { debut: "2026-10-01", fin: "2026-10-30" },
  croissance: {
    inscriptions_candidats: mesure(40, 50, -20),
    inscriptions_recruteurs: mesure(5, 0, null),
    comptes_connectes: mesure(120, 100, 20),
  },
  activite: {
    offres: mesure(30, 20, 50),
    candidatures: mesure(120, 80, 50),
    recrutements: mesure(7, 4, 75),
    candidatures_par_offre: 4.8,
    offres_sans_candidature: 4,
    taux_recrutement_pct: 5.8,
    score_matching_moyen: 66.5,
  },
  revenus: {
    revenu_abonnements_da: mesure(15000, 10000, 50),
    revenu_packs_da: mesure(0, 0, null),
    deblocages_cvtheque: mesure(9, 3, 200),
    abonnements_actifs: 3,
    expirent_sous_7_jours: 1,
    expirent_sous_30_jours: 2,
  },
  ia: {
    appels: mesure(200, 100, 100),
    tokens: mesure(50000, 20000, 150),
    cv_analyses: mesure(40, 20, 100),
    cv_en_echec: mesure(2, 4, -50),
    taux_echec_cv_pct: mesure(5, null, null),
  },
  a_traiter: { entreprises_a_valider: 2, offres_a_moderer: 0, demandes_ajout: 3, candidatures_recues: 11 },
  ...surcharge,
});

const detail = (surcharge = {}) => ({
  theme: "activite",
  periode: { debut: "2026-10-01", fin: "2026-10-30" },
  evolution: {
    series: [
      { cle: "offres", label: "Offres", unite: "" },
      { cle: "revenu", label: "Revenu", unite: "DA" },
    ],
    lignes: [{ mois: "2026-10", offres: 3, revenu: 1000 }],
  },
  repartitions: [
    {
      cle: "offres_wilaya",
      titre: "Offres approuvées par wilaya",
      note: "",
      total: 4,
      lignes: [
        { libelle: "31 - Oran", nb: 3 },
        { libelle: "Autres", nb: 1 },
      ],
    },
  ],
  classements: [
    { cle: "top_offres", titre: "Offres les plus postulées", colonnes: ["Offre", "Entreprise", "Candidatures"], lignes: [["Dev", "TechCorp", 5]] },
  ],
  entonnoirs: [
    {
      cle: "recrutement",
      titre: "Entonnoir de recrutement",
      note: "Approximation.",
      etapes: [
        { libelle: "Candidatures déposées", nb: 100, pct_du_total: 100, taux_passage: null },
        { libelle: "Examinées", nb: 60, pct_du_total: 60, taux_passage: 60 },
      ],
      refusees: 7,
    },
  ],
  ...surcharge,
});

const afficher = () =>
  render(
    <MemoryRouter>
      <AdminKpi />
    </MemoryRouter>,
  );

describe("📈 UI & Logique - Composant <AdminKpi />", () => {
  beforeEach(() => {
    jobsService.getAdminKpi.mockResolvedValue(donnees());
    jobsService.getAdminKpiDetail.mockResolvedValue(detail());
    jobsService.exportAdminKpi.mockResolvedValue(new Blob(["x"]));
    window.URL.createObjectURL = vi.fn(() => "blob:kpi");
    window.URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("charge les KPI sur 30 jours par défaut et affiche les quatre sections", async () => {
    afficher();
    for (const titre of ["Croissance", "Offres et candidatures", "Revenus et abonnements", "Qualité et IA"]) {
      expect(await screen.findByRole("heading", { name: titre })).toBeInTheDocument();
    }
    const [debut, fin] = jobsService.getAdminKpi.mock.calls[0];
    const jours = (new Date(fin) - new Date(debut)) / 86400000;
    expect(Math.round(jours)).toBe(30);
  });

  it("affiche la valeur, la variation et la période précédente", async () => {
    afficher();
    await screen.findByText("Nouveaux candidats");
    expect(screen.getByText("-20 %")).toBeInTheDocument();
    expect(screen.getAllByText("+50 %").length).toBeGreaterThan(1);
    expect(screen.getAllByText("vs 50 avant").length).toBeGreaterThan(0);
  });

  it("n'invente pas de variation quand la période précédente est vide", async () => {
    afficher();
    await screen.findByText("Nouveaux recruteurs");
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("affiche un tiret pour un indicateur sans valeur (taux sans parsing)", async () => {
    jobsService.getAdminKpi.mockResolvedValue(
      donnees({ ia: { ...donnees().ia, taux_echec_cv_pct: mesure(null, null, null) } }),
    );
    afficher();
    expect(await screen.findByText("Taux d'échec des analyses")).toBeInTheDocument();
  });

  it("le bandeau « À traiter » renvoie vers les pages concernées", async () => {
    afficher();
    const lien = await screen.findByRole("link", { name: /Entreprises à valider/ });
    expect(lien).toHaveAttribute("href", "/admin-taftech/entreprises");
    expect(screen.getByRole("link", { name: /Candidatures jamais ouvertes/ })).toHaveAttribute(
      "href",
      "/admin-taftech/candidatures",
    );
  });

  it("un raccourci de période relance le chargement", async () => {
    afficher();
    await screen.findByRole("heading", { name: "Croissance" });
    fireEvent.click(screen.getByRole("button", { name: "12 mois" }));
    await waitFor(() => expect(jobsService.getAdminKpi).toHaveBeenCalledTimes(2));
    const [debut, fin] = jobsService.getAdminKpi.mock.calls[1];
    expect(Math.round((new Date(fin) - new Date(debut)) / 86400000)).toBe(365);
  });

  it("refuse une période inversée sans appeler l'API", async () => {
    afficher();
    await screen.findByRole("heading", { name: "Croissance" });
    fireEvent.change(screen.getByLabelText("Date de début"), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText("Date de fin"), { target: { value: "2026-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Appliquer" }));
    expect(jobsService.getAdminKpi).toHaveBeenCalledTimes(1);
  });

  it("n'appelle le détail d'un thème qu'à l'ouverture de son onglet", async () => {
    afficher();
    await screen.findByRole("heading", { name: "Croissance" });
    expect(jobsService.getAdminKpiDetail).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("tab", { name: /Offres et candidatures/ }));
    await screen.findByText("Offres approuvées par wilaya");
    expect(jobsService.getAdminKpiDetail).toHaveBeenCalledTimes(1);
    expect(jobsService.getAdminKpiDetail.mock.calls[0][0]).toBe("activite");
  });

  it("affiche répartitions, classement, entonnoir et une courbe par unité", async () => {
    afficher();
    fireEvent.click(await screen.findByRole("tab", { name: /Offres et candidatures/ }));
    await screen.findByText("Offres approuvées par wilaya");
    expect(screen.getByText("31 - Oran")).toBeInTheDocument();
    expect(screen.getByText("75 %")).toBeInTheDocument();
    expect(screen.getByText("Offres les plus postulées")).toBeInTheDocument();
    expect(screen.getByText("TechCorp")).toBeInTheDocument();
    expect(screen.getByText("Entonnoir de recrutement")).toBeInTheDocument();
    expect(screen.getByText(/60 % de l'étape précédente/)).toBeInTheDocument();
    expect(screen.getByText("Refusées")).toBeInTheDocument();
    // Dinars et effectifs ne partagent pas la même courbe.
    expect(screen.getByText("Évolution mensuelle")).toBeInTheDocument();
    expect(screen.getByText("Évolution mensuelle (DA)")).toBeInTheDocument();
  });

  it("indique l'absence de données d'une répartition vide", async () => {
    jobsService.getAdminKpiDetail.mockResolvedValue(
      detail({ repartitions: [{ cle: "vide", titre: "Offres par type de contrat", note: "", total: 0, lignes: [] }] }),
    );
    afficher();
    fireEvent.click(await screen.findByRole("tab", { name: /Offres et candidatures/ }));
    expect(await screen.findByText("Aucune donnée sur la période.")).toBeInTheDocument();
  });

  it("propose de réessayer quand le détail ne charge pas", async () => {
    jobsService.getAdminKpiDetail.mockRejectedValue(new Error("boom"));
    afficher();
    fireEvent.click(await screen.findByRole("tab", { name: /Revenus et abonnements/ }));
    expect(await screen.findByText("Impossible de charger le détail.")).toBeInTheDocument();
  });

  it("exporte le classeur sur la période affichée", async () => {
    afficher();
    await screen.findByRole("heading", { name: "Croissance" });
    fireEvent.click(screen.getByRole("button", { name: /Exporter/ }));
    await waitFor(() => expect(jobsService.exportAdminKpi).toHaveBeenCalledTimes(1));
    const [debut, fin] = jobsService.exportAdminKpi.mock.calls[0];
    expect(Math.round((new Date(fin) - new Date(debut)) / 86400000)).toBe(30);
  });

  it("propose de réessayer quand le chargement échoue", async () => {
    jobsService.getAdminKpi.mockRejectedValue(new Error("boom"));
    afficher();
    expect(await screen.findByText("Impossible de charger les indicateurs.")).toBeInTheDocument();
  });
});
