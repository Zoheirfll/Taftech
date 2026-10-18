// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import AdminReferentielV2 from "../src/Pages/Admin/AdminReferentielV2";
import { adminService } from "../src/Services/adminService";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
  },
}));

vi.mock("../src/Services/adminService", () => ({
  adminService: {
    getAdminReferentielMetiers: vi.fn(),
    updateAdminReferentielMetier: vi.fn(),
    getAdminReferentielSpecialites: vi.fn(),
    updateAdminReferentielSpecialite: vi.fn(),
    getAdminReferentielDiplomes: vi.fn(),
    updateAdminReferentielDiplome: vi.fn(),
    getAdminStats: vi.fn().mockResolvedValue({}),
    getDemandesAjout: vi.fn(),
  },
}));

const mockMetiers = {
  results: [
    { id: 1, code: "M-1", libelle: "Développeur web", groupe_libelle: "Informatique", selectionnable: true },
    { id: 2, code: "M-2", libelle: "Chargé de recrutement", groupe_libelle: "RH", selectionnable: false },
  ],
  count: 2,
  total_pages: 1,
};

describe("🏢 AdminReferentielV2 — panel admin référentiel v2", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    adminService.getAdminReferentielMetiers.mockResolvedValue(mockMetiers);
    adminService.getAdminReferentielSpecialites.mockResolvedValue({ results: [], count: 0, total_pages: 1 });
    adminService.getAdminReferentielDiplomes.mockResolvedValue({ results: [], count: 0, total_pages: 1 });
    adminService.getDemandesAjout.mockResolvedValue({ results: [], count: 0, total_pages: 1, compteurs: {} });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : affiche la liste des métiers par défaut", async () => {
    render(<AdminReferentielV2 />);
    await waitFor(() => {
      expect(screen.getByText("Développeur web")).toBeInTheDocument();
      expect(screen.getByText("Chargé de recrutement")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : le groupe Formations s'ouvre sur les types de diplôme, avec ses deux onglets", async () => {
    render(<AdminReferentielV2 groupe="formations" />);
    await waitFor(() => expect(adminService.getAdminReferentielDiplomes).toHaveBeenCalled());
    expect(adminService.getAdminReferentielMetiers).not.toHaveBeenCalled();
    expect(screen.getByRole("tab", { name: /Types de diplôme/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Demandes/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Formations à vérifier/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Métiers/ })).not.toBeInTheDocument();
  });

  it("🟢 HP2b : le groupe Métiers réunit la liste, les similarités et les propositions", async () => {
    render(<AdminReferentielV2 groupe="metiers" />);
    await waitFor(() => expect(screen.getByText("Développeur web")).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /^Métiers$/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Métiers similaires/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Demandes/ })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /Types de diplôme/ })).not.toBeInTheDocument();
  });

  it("🟢 HP2c : le groupe Spécialités charge les spécialités, avec ses deux onglets", async () => {
    render(<AdminReferentielV2 groupe="specialites" />);
    await waitFor(() => expect(adminService.getAdminReferentielSpecialites).toHaveBeenCalled());
    expect(screen.getByRole("tab", { name: /^Spécialités$/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Spécialités similaires/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Demandes/ })).toBeInTheDocument();
  });

  it("🟢 HP2e : l'onglet Demandes du groupe Formations charge les demandes de types de diplôme", async () => {
    render(<AdminReferentielV2 groupe="formations" />);
    fireEvent.click(await screen.findByRole("tab", { name: /Demandes/ }));
    await waitFor(() =>
      expect(adminService.getDemandesAjout).toHaveBeenCalledWith(expect.objectContaining({ type: "DIPLOME", statut: "A_EXAMINER" })),
    );
    expect(await screen.findByText("Aucune demande de type de diplôme.")).toBeInTheDocument();
  });

  it("🟢 HP2f : l'onglet Demandes du groupe Spécialités charge les demandes de spécialités", async () => {
    render(<AdminReferentielV2 groupe="specialites" />);
    fireEvent.click(await screen.findByRole("tab", { name: /Demandes/ }));
    await waitFor(() =>
      expect(adminService.getDemandesAjout).toHaveBeenCalledWith(expect.objectContaining({ type: "SPECIALITE" })),
    );
    expect(await screen.findByText("Aucune demande de spécialité.")).toBeInTheDocument();
  });

  it("🟢 HP2g : le badge des demandes à examiner vient des statistiques", async () => {
    adminService.getAdminStats.mockResolvedValueOnce({ demandes_a_examiner: { DIPLOME: 3, SPECIALITE: 0 } });
    render(<AdminReferentielV2 groupe="formations" />);
    const onglet = await screen.findByRole("tab", { name: /Demandes/ });
    await waitFor(() => expect(onglet).toHaveTextContent("3"));
  });

  it("🟢 HP2d : l'onglet Demandes des métiers s'ouvre directement et charge les demandes de métiers", async () => {
    render(<AdminReferentielV2 groupe="metiers" ongletInitial="demandes-metiers" />);
    await waitFor(() =>
      expect(adminService.getDemandesAjout).toHaveBeenCalledWith(expect.objectContaining({ type: "METIER", statut: "A_EXAMINER" })),
    );
    expect(await screen.findByText("Aucune demande de métier.")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(adminService.getAdminReferentielMetiers).not.toHaveBeenCalled();
  });

  it("🟢 HP3 : bascule le statut sélectionnable d'un métier", async () => {
    adminService.updateAdminReferentielMetier.mockResolvedValue({});
    render(<AdminReferentielV2 />);
    await waitFor(() => expect(screen.getByText("Actif")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Actif"));

    await waitFor(() => {
      expect(adminService.updateAdminReferentielMetier).toHaveBeenCalledWith(1, { selectionnable: false });
    });
  });

  it("🟢 HP4 : modifie le libellé via la modale", async () => {
    adminService.updateAdminReferentielMetier.mockResolvedValue({});
    render(<AdminReferentielV2 />);
    await waitFor(() => expect(screen.getByText("Développeur web")).toBeInTheDocument());

    fireEvent.click(screen.getAllByLabelText(/modifier/i)[0]);
    const input = await screen.findByDisplayValue("Développeur web");
    fireEvent.change(input, { target: { value: "Développeur full-stack" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(adminService.updateAdminReferentielMetier).toHaveBeenCalledWith(1, { libelle: "Développeur full-stack" });
    });
  });

  it("🔴 EC1 : erreur de chargement signalée en télémétrie", async () => {
    adminService.getAdminReferentielMetiers.mockRejectedValue(new Error("500"));
    render(<AdminReferentielV2 />);
    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith("ECHEC_GET_ADMIN_REFERENTIEL_V2", expect.any(Error));
    });
  });
});
