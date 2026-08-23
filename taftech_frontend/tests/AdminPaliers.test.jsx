// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import AdminPaliers from "../src/Pages/Admin/AdminPaliers";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import { ConfirmModalHost } from "../src/utils/confirmToast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminPaliers: vi.fn(),
    updatePalier: vi.fn(),
  },
}));

const mockPaliers = [
  { id: 1, nom: "STARTER", prix_mensuel_da: 5900, prix_annuel_da: 70800, remise_annuelle_active: false, limite_offres: 5, limite_cv_mois: 10, acces_coordonnees: false, acces_ia_recommandes: false, acces_ia_avancee: false, acces_equipe: false, support_label: "Essentiel", ordre: 1, actif: true },
  { id: 2, nom: "PRO", prix_mensuel_da: 12900, prix_annuel_da: 154800, remise_annuelle_active: false, limite_offres: 15, limite_cv_mois: null, acces_coordonnees: true, acces_ia_recommandes: true, acces_ia_avancee: false, acces_equipe: false, support_label: "Prioritaire", ordre: 2, actif: true },
];

describe("🏢 AdminPaliers — panel admin paliers d'abonnement", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminPaliers.mockResolvedValue(mockPaliers);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : affiche la liste des paliers", async () => {
    render(<AdminPaliers />);
    await waitFor(() => {
      expect(screen.getByText("Starter")).toBeInTheDocument();
      expect(screen.getByText("Pro")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : affiche le prix mensuel de chaque palier", async () => {
    render(<AdminPaliers />);
    await waitFor(() => {
      expect(screen.getByText(/5[\s,.]?900/)).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : modifier le prix d'un palier appelle updatePalier", async () => {
    jobsService.updatePalier.mockResolvedValue({});
    render(<><AdminPaliers /><ConfirmModalHost /></>);
    await waitFor(() => expect(screen.getByText("Starter")).toBeInTheDocument());

    fireEvent.click(screen.getAllByLabelText(/modifier/i)[0]);
    const input = await screen.findByLabelText(/prix mensuel/i);
    fireEvent.change(input, { target: { value: "6900" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer|mettre à jour/i }));

    await waitFor(() => {
      expect(jobsService.updatePalier).toHaveBeenCalledWith(1, expect.objectContaining({ prix_mensuel_da: 6900 }));
    });
  });

  it("🟡 EC1 : liste vide affiche un message", async () => {
    jobsService.getAdminPaliers.mockResolvedValue([]);
    render(<AdminPaliers />);
    await waitFor(() => {
      expect(screen.getByText(/aucun palier/i)).toBeInTheDocument();
    });
  });
});
