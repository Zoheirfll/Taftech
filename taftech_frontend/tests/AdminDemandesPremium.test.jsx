// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import AdminDemandesPremium from "../src/Pages/Admin/AdminDemandesPremium";
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { adminService } from "../src/Services/adminService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/adminService", () => ({
  adminService: {
    getDemandesPremium: vi.fn(),
    activerPremium: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const mockDemandes = [
  { id: 7, nom_entreprise: "SOMIZ Arzew", email: "rh@somiz.dz", telephone: "0555", nb_mois: 3, moyen_paiement: "CIB", date_demande: "28/09/2026 10:00", est_traitee: false, palier_actif: null },
  { id: 8, nom_entreprise: "Déjà traitée", email: "x@y.dz", telephone: "", nb_mois: 1, moyen_paiement: "EDAHABIA", date_demande: "01/09/2026 10:00", est_traitee: true, date_traitement: "02/09/2026 09:00", palier_actif: "PRO", abonnement_expire_at: "02/10/2026" },
];

describe("⭐ AdminDemandesPremium — activation d'abonnement manuelle", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    adminService.getDemandesPremium.mockResolvedValue(mockDemandes);
    adminService.activerPremium.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : n'affiche que les demandes en attente par défaut, avec compteurs", async () => {
    render(<AdminDemandesPremium />);
    await waitFor(() => expect(screen.getByText("SOMIZ Arzew")).toBeInTheDocument());
    expect(screen.queryByText("Déjà traitée")).not.toBeInTheDocument();
  });

  it("🟢 HP2 : l'activation exige une confirmation avant l'appel API", async () => {
    render(<><AdminDemandesPremium /><ConfirmModalHost /></>);
    await waitFor(() => expect(screen.getByText("SOMIZ Arzew")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Palier à activer pour SOMIZ Arzew"), { target: { value: "PRO" } });
    fireEvent.click(screen.getByRole("button", { name: /Activer/ }));

    // Rien n'est activé tant que l'admin n'a pas confirmé
    expect(adminService.activerPremium).not.toHaveBeenCalled();
    expect(await screen.findByText(/Activer l'abonnement Pro pour 3 mois/)).toBeInTheDocument();

    fireEvent.click(screen.getByText("Confirmer"));
    await waitFor(() => expect(adminService.activerPremium).toHaveBeenCalledWith(7, 3, "PRO"));
  });

  it("🟡 EC1 : annuler la confirmation n'active rien", async () => {
    render(<><AdminDemandesPremium /><ConfirmModalHost /></>);
    await waitFor(() => expect(screen.getByText("SOMIZ Arzew")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Activer/ }));
    fireEvent.click(await screen.findByText("Annuler"));
    expect(adminService.activerPremium).not.toHaveBeenCalled();
  });
});
