// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminQualiteIA from "../src/Pages/Admin/AdminQualiteIA";
import { adminService } from "../src/Services/adminService";
import * as reporter from "../src/utils/errorReporter";
import { ConfirmModalHost } from "../src/utils/confirmToast";

vi.mock("../src/Services/adminService", () => ({
  adminService: {
    getQualiteIAParser: vi.fn(),
    getQualiteIACorrections: vi.fn(),
    creerAppellationDepuisCorrection: vi.fn(),
    getQualiteIAMatching: vi.fn(),
  },
}));

const parser = {
  jours: 30, total: 10, taux_reussite: 80, duree_moyenne_ms: 4200,
  erreurs: [{ code_erreur: "IA_INDISPONIBLE", n: 2 }],
  pct_exp_metier_ia: 70, pct_exp_metier_repli: 10, pct_exp_sans_metier: 20, pct_formations_sans_diplome: 15,
  competences_source: [], champs_vides: [{ champ: "bio", n: 3 }],
  par_semaine: [{ semaine: "2026-09-21T00:00:00Z", total: 10, reussis: 8 }],
  par_version: [{ version_parser: "parser-2026.09.29", n: 10, reussis: 8 }],
  recents: [],
};

const rendre = (url = "/admin-taftech/qualite-ia") =>
  render(<MemoryRouter initialEntries={[url]}><AdminQualiteIA /><ConfirmModalHost /></MemoryRouter>);

describe("📊 AdminQualiteIA", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    adminService.getQualiteIAParser.mockResolvedValue(parser);
  });
  afterEach(() => { cleanup(); vi.clearAllMocks(); });

  it("affiche les indicateurs du parser", async () => {
    rendre();
    expect(await screen.findByText("Taux de réussite")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("IA indisponible / limite de débit")).toBeInTheDocument();
  });

  it("affiche un état vide quand aucun CV n'a été analysé", async () => {
    adminService.getQualiteIAParser.mockResolvedValue({ ...parser, total: 0 });
    rendre();
    expect(await screen.findByText("Aucun CV analysé sur cette période.")).toBeInTheDocument();
  });

  it("propose de réessayer en cas d'erreur de chargement", async () => {
    adminService.getQualiteIAParser.mockRejectedValueOnce(new Error("x"));
    rendre();
    expect(await screen.findByText(/Impossible de charger/)).toBeInTheDocument();
  });

  it("ajoute une appellation depuis une correction fréquente après confirmation", async () => {
    adminService.getQualiteIACorrections.mockResolvedValue({
      total: 3,
      resultats: [{ type_correction: "METIER_EXPERIENCE", texte_source: "Chef RH", propose_id: 1, propose_libelle: "A", corrige_id: 7, corrige_libelle: "Management RH", n: 3 }],
    });
    adminService.creerAppellationDepuisCorrection.mockResolvedValue({ id: 1 });
    rendre("/admin-taftech/qualite-ia?tab=corrections");
    fireEvent.click(await screen.findByText("Ajouter l'appellation"));
    fireEvent.click(await screen.findByText("Confirmer"));
    await waitFor(() => expect(adminService.creerAppellationDepuisCorrection).toHaveBeenCalledWith("Chef RH", 7));
  });

  it("affiche les tranches de matching", async () => {
    adminService.getQualiteIAMatching.mockResolvedValue({
      total_scorees: 5, forts_scores_refuses: 1, forts_scores_non_traites_14j: 2, avertissement: "Peu de décisions",
      tranches: [{ tranche: "80-100%", total: 5, pct_preselection_ou_plus: 60, pct_entretien_ou_plus: 40, pct_retenu: 20, pct_refuse: 20, pct_non_traite: 20 }],
    });
    rendre("/admin-taftech/qualite-ia?tab=matching");
    expect(await screen.findByText("80-100%")).toBeInTheDocument();
    expect(screen.getByText("Peu de décisions")).toBeInTheDocument();
  });
});
