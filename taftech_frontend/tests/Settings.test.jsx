// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import Settings from "../src/Pages/candidat/Settings";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getParametres: vi.fn(),
    updateParametres: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockSettings = {
  notif_offres_exclusives: true,
  notif_newsletter: false,
  notif_mise_a_jour: true,
};

describe("⚙️ UI & Logique - Composant <Settings />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Chargement et affichage des préférences", async () => {
    jobsService.getParametres.mockResolvedValue(mockSettings);

    render(<Settings />);

    await waitFor(() => {
      const switches = screen.getAllByRole("checkbox");
      expect(switches[0]).toBeChecked(); // Offres exclusives (true)
      expect(switches[1]).not.toBeChecked(); // Newsletter (false)
    });
  });

  it("🟢 HP2 : Changement réussi d'une préférence", async () => {
    jobsService.getParametres.mockResolvedValue(mockSettings);
    jobsService.updateParametres.mockResolvedValue({});

    render(<Settings />);
    await waitFor(() => screen.getByText(/Gérer mes notifications/i));

    const newsletterSwitch = screen.getAllByRole("checkbox")[1];
    fireEvent.click(newsletterSwitch);

    await waitFor(() => {
      expect(jobsService.updateParametres).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Préférence enregistrée !");
    });
  });

  it("🔴 EC1 : Erreur de chargement déclenche reportError", async () => {
    jobsService.getParametres.mockRejectedValue(new Error("Fetch failed"));

    render(<Settings />);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_PARAMETRES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors du chargement de vos paramètres.",
      );
    });
  });

  it("🔴 EC2 : Erreur de sauvegarde effectue un Rollback", async () => {
    jobsService.getParametres.mockResolvedValue(mockSettings);
    jobsService.updateParametres.mockRejectedValue(new Error("Update failed"));

    render(<Settings />);
    await waitFor(() => screen.getByText(/Gérer mes notifications/i));

    const switchExcl = screen.getAllByRole("checkbox")[0];
    // État initial: checked (true)
    fireEvent.click(switchExcl);
    // Optimistic UI: il devient false immédiatement
    expect(switchExcl).not.toBeChecked();

    await waitFor(() => {
      // Rollback: il redevient true
      expect(switchExcl).toBeChecked();
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_MAJ_PARAMETRES",
        expect.anything(),
      );
    });
  });

  it("🔴 EC3 : Validation mot de passe (Mismatch)", async () => {
    // 1. On mock une réponse réussie pour passer le loader
    jobsService.getParametres.mockResolvedValue(mockSettings);

    render(<Settings />);

    // 2. On attend que le loader disparaisse et que les champs soient là
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
    // Note : Si vous n'avez pas de role status sur votre loader,
    // on attend simplement l'apparition d'un titre :
    await waitFor(() => screen.getByPlaceholderText("Nouveau"));

    // 3. Saisie des mots de passe
    const newPass = screen.getByPlaceholderText("Nouveau");
    const confirmPass = screen.getByPlaceholderText("Confirmer");

    fireEvent.change(newPass, { target: { value: "Password123" } });
    fireEvent.change(confirmPass, { target: { value: "Différent123" } });

    // 4. Tentative de validation
    fireEvent.click(screen.getByText("MODIFIER"));

    // 5. Vérification du blocage
    expect(toast.error).toHaveBeenCalledWith(
      "Les nouveaux mots de passe ne correspondent pas.",
    );
  });
});
