// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMetiersSuggeres from "../src/Pages/Admin/AdminMetiersSuggeres";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getPropositionsMetier: vi.fn(),
    validerPropositionMetier: vi.fn(),
    rejeterPropositionMetier: vi.fn(),
    searchMetiers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}));

const SUGGEREE = {
  id: 1, libelle: "Technicien drone", contexte: "inspection de lignes électriques", origine: "CANDIDAT",
  statut: "SUGGEREE", nb_demandeurs: 3, proposee_par_email: "cand@test.dz", date_creation: "2026-10-01T10:00:00Z",
  motif_rejet: "", issue: "", metier_resultat_libelle: null,
  transitions_possibles: ["REJETEE", "VALIDEE"],
  metiers_proches: [{ id: 42, libelle: "Opérateur de drone" }],
};
const REJETEE = {
  id: 2, libelle: "Ninja du web", contexte: "", origine: "RECRUTEUR", statut: "REJETEE", nb_demandeurs: 1,
  proposee_par_email: "rh@test.dz", date_creation: "2026-09-20T10:00:00Z", motif_rejet: "Intitulé non professionnel",
  issue: "", metier_resultat_libelle: null, transitions_possibles: ["VALIDEE"], metiers_proches: [],
};
const COMPTEURS = { SUGGEREE: 1, VALIDEE: 0, REJETEE: 1, TOUTES: 2 };

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminMetiersSuggeres />
    </MemoryRouter>,
  );

describe("🧭 Admin — Métiers suggérés", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getPropositionsMetier.mockResolvedValue({ results: [SUGGEREE], compteurs: COMPTEURS });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Affiche les propositions à examiner avec compteurs et demandeurs", async () => {
    renderPage();
    expect(await screen.findByText("Technicien drone")).toBeInTheDocument();
    expect(jobsService.getPropositionsMetier).toHaveBeenCalledWith("SUGGEREE");
    expect(screen.getByText("inspection de lignes électriques")).toBeInTheDocument();
    expect(screen.getByText(/Candidat · 3 demandeur\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/cand@test.dz/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /À examiner/ })).toHaveTextContent("(1)");
    expect(screen.getByRole("tab", { name: /Rejetées/ })).toHaveTextContent("(1)");
  });

  it("🟢 Rejet : le motif est obligatoire puis envoyé", async () => {
    jobsService.rejeterPropositionMetier.mockResolvedValue({});
    renderPage();
    fireEvent.click(await screen.findByLabelText("Rejeter Technicien drone"));

    const confirmer = screen.getByRole("button", { name: "Rejeter" });
    expect(confirmer).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Motif/), { target: { value: "ok" } });
    expect(confirmer).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Motif/), { target: { value: "Trop spécifique pour la liste" } });
    expect(confirmer).toBeEnabled();
    fireEvent.click(confirmer);

    await waitFor(() => expect(jobsService.rejeterPropositionMetier).toHaveBeenCalledWith(1, "Trop spécifique pour la liste"));
    expect(toast.success).toHaveBeenCalled();
    await waitFor(() => expect(jobsService.getPropositionsMetier).toHaveBeenCalledTimes(2)); // liste rechargée
  });

  it("🟢 Validation en rattachant à un métier proche", async () => {
    jobsService.validerPropositionMetier.mockResolvedValue({});
    renderPage();
    fireEvent.click(await screen.findByLabelText("Valider Technicien drone"));

    const rattacher = screen.getByRole("button", { name: "Rattacher" });
    expect(rattacher).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Opérateur de drone" }));
    expect(screen.getByText("Rattacher à : Opérateur de drone")).toBeInTheDocument();
    expect(rattacher).toBeEnabled();
    fireEvent.click(rattacher);

    await waitFor(() =>
      expect(jobsService.validerPropositionMetier).toHaveBeenCalledWith(1, { mode: "RATTACHER", metier_id: 42 }),
    );
  });

  it("🟢 Création d'un nouveau métier : les groupes ne sont chargés qu'à ce moment", async () => {
    renderPage();
    fireEvent.click(await screen.findByLabelText("Valider Technicien drone"));
    expect(jobsService.getPropositionsMetier).toHaveBeenCalledTimes(1);
    expect(jobsService.getPropositionsMetier).not.toHaveBeenCalledWith(expect.anything(), true);

    jobsService.getPropositionsMetier.mockResolvedValue({
      results: [SUGGEREE], compteurs: COMPTEURS, groupes: [{ id: 7, libelle: "Aéronautique", parent_libelle: "Transport" }],
    });
    fireEvent.click(screen.getByLabelText(/Créer un nouveau métier/));
    await waitFor(() => expect(jobsService.getPropositionsMetier).toHaveBeenCalledWith("SUGGEREE", true));
    expect(screen.getByRole("button", { name: "Créer le métier" })).toBeDisabled(); // aucun groupe choisi
  });

  it("🟢 Une proposition rejetée peut être réexaminée mais pas rejetée de nouveau", async () => {
    jobsService.getPropositionsMetier.mockResolvedValue({ results: [REJETEE], compteurs: COMPTEURS });
    renderPage();
    expect(await screen.findByText("Ninja du web")).toBeInTheDocument();
    expect(screen.getByText("Motif : Intitulé non professionnel")).toBeInTheDocument();
    expect(screen.getByLabelText("Valider Ninja du web")).toBeInTheDocument();
    expect(screen.queryByLabelText("Rejeter Ninja du web")).toBeNull();
  });

  it("🔴 Échec de la validation : message d'erreur et fenêtre conservée", async () => {
    jobsService.validerPropositionMetier.mockRejectedValue({ response: { data: { error: "Ce libellé existe déjà." } } });
    renderPage();
    fireEvent.click(await screen.findByLabelText("Valider Technicien drone"));
    fireEvent.click(screen.getByRole("button", { name: "Opérateur de drone" }));
    fireEvent.click(screen.getByRole("button", { name: "Rattacher" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Ce libellé existe déjà."));
    expect(screen.getByRole("dialog", { name: "Valider la proposition" })).toBeInTheDocument();
  });

  it("🔴 Échec de chargement : signalé sans casser la page", async () => {
    jobsService.getPropositionsMetier.mockRejectedValue(new Error("réseau"));
    renderPage();
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(reporter.reportError).toHaveBeenCalled();
    expect(screen.getByText("Métiers suggérés")).toBeInTheDocument();
  });
});
