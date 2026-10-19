// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import DossierRecruteurAdmin from "../src/Pages/Admin/DossierRecruteurAdmin";
import DossierAdminAdmin from "../src/Pages/Admin/DossierAdminAdmin";
import { adminDossierService } from "../src/Services/adminDossierService";

vi.mock("../src/Services/adminDossierService", () => ({
  adminDossierService: { getDossierRecruteur: vi.fn(), getDossierAdmin: vi.fn() },
}));

const RECRUTEUR = {
  compte: { derniere_connexion: null, inscrit_le: "2026-06-22T10:00:00Z", est_actif: true },
  entreprise: {
    nom: "Acme DZ", approuvee: true, secteur: "Informatique", wilaya_siege: "Oran", commune_siege: "Bir El Djir",
    adresse: "1 rue test", registre_commerce: "RC-123", taille: "11-50", annee_creation: 2015, site_web: "",
    linkedin: "", mise_en_avant_accueil: false, refus_auto: true,
  },
  abonnement: {
    palier: "Business", actif: true, debut: "2026-10-01T00:00:00Z", expiration: "2026-11-01T00:00:00Z",
    renouvellement_auto: false, limite_offres: null, credits_mensuels_restants: 12, credits_achetes_restants: 5,
  },
  offres: {
    total: 2, en_ligne: 1, cloturees: 1, par_statut: { Approuvée: 2 },
    recentes: [{ id: 1, titre: "Développeur Back-End", statut: "Approuvée", cloturee: false, candidatures: 7, date: "2026-10-01T00:00:00Z" }],
  },
  candidatures_recues: { total: 7, par_statut: { Reçue: 5, Refusée: 2 }, derniere_le: "2026-10-18T09:00:00Z" },
  equipe: [{ nom: "Amine Kaci", email: "amine@acme.dz", role: "Utilisateur", ajoute_le: "2026-09-01T00:00:00Z" }],
  cvtheque: { debloques_total: 4, debloques_ce_mois: 1 },
  ia_mois: [{ libelle: "Analyse recruteur", appels: 2, tokens: 450 }],
};

const ADMIN = {
  compte: { type: "Super administrateur", derniere_connexion: "2026-10-19T12:00:00Z", inscrit_le: "2026-01-01T00:00:00Z", est_actif: true },
  actions: {
    total: 3, par_action: [{ action: "APPROUVER_OFFRE", libelle: "Approuver offre", nombre: 2 }], derniere_le: "2026-10-19T10:00:00Z",
    recentes: [{ action: "Approuver offre", detail: "Offre 12", date: "2026-10-19T10:00:00Z" }],
  },
};

describe("Dossiers recruteur et administrateur", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("affiche entreprise, abonnement, crédits, offres et équipe d'un recruteur", async () => {
    adminDossierService.getDossierRecruteur.mockResolvedValue(RECRUTEUR);
    render(<DossierRecruteurAdmin userId={9} />);
    await screen.findByTestId("dossier-recruteur");
    expect(adminDossierService.getDossierRecruteur).toHaveBeenCalledWith(9);
    expect(screen.getByText("Acme DZ")).toBeInTheDocument();
    expect(screen.getByText("RC-123")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("Illimitée")).toBeInTheDocument();
    expect(screen.getByText("Développeur Back-End")).toBeInTheDocument();
    expect(screen.getByText(/Amine Kaci/)).toBeInTheDocument();
    expect(screen.getByText(/2 appel\(s\)/)).toBeInTheDocument();
  });

  it("indique l'échec du chargement d'un dossier recruteur", async () => {
    adminDossierService.getDossierRecruteur.mockRejectedValue(new Error("x"));
    render(<DossierRecruteurAdmin userId={9} />);
    expect(await screen.findByText("Impossible de charger le dossier détaillé.")).toBeInTheDocument();
  });

  it("affiche le type de compte et les actions tracées d'un administrateur", async () => {
    adminDossierService.getDossierAdmin.mockResolvedValue(ADMIN);
    render(<DossierAdminAdmin userId={3} />);
    await screen.findByTestId("dossier-admin");
    expect(screen.getByText("Super administrateur")).toBeInTheDocument();
    expect(screen.getByText("Approuver offre : 2")).toBeInTheDocument();
    expect(screen.getByText(/Offre 12/)).toBeInTheDocument();
  });

  it("n'affiche aucune liste d'actions pour un administrateur sans action", async () => {
    adminDossierService.getDossierAdmin.mockResolvedValue({
      ...ADMIN,
      actions: { total: 0, par_action: [], derniere_le: null, recentes: [] },
    });
    render(<DossierAdminAdmin userId={3} />);
    await screen.findByTestId("dossier-admin");
    expect(screen.queryByText("Dernières actions")).not.toBeInTheDocument();
  });
});
