// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import AdminReferentielV2 from "../src/Pages/Admin/AdminReferentielV2";
import { adminService } from "../src/Services/adminService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/adminService", () => ({
  adminService: {
    getAdminReferentielMetiers: vi.fn(),
    updateAdminReferentielMetier: vi.fn(),
    getAdminReferentielSpecialites: vi.fn(),
    updateAdminReferentielSpecialite: vi.fn(),
    getAdminReferentielDiplomes: vi.fn(),
    updateAdminReferentielDiplome: vi.fn(),
    getAdminStats: vi.fn().mockResolvedValue({}),
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

  it("🟢 HP2 : bascule vers l'onglet Spécialités", async () => {
    render(<AdminReferentielV2 />);
    await waitFor(() => expect(screen.getByText("Développeur web")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Spécialités"));
    await waitFor(() => expect(adminService.getAdminReferentielSpecialites).toHaveBeenCalled());
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
