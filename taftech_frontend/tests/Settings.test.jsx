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
import Settings from "../src/Pages/Candidat/Settings";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getParametres: vi.fn(),
    updateParametres: vi.fn(),
  },
}));

vi.mock("../src/api/axiosConfig", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { est_compte_google: false } }),
    post: vi.fn(),
  },
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
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
      // Les toggles sont des <button> avec les classes bg-indigo-600 / bg-slate-200
      // On filtre uniquement les boutons qui ont ces classes (les Toggle buttons)
      const allButtons = screen.getAllByRole("button");
      const toggleButtons = allButtons.filter(
        (b) => b.className.includes("bg-indigo-600") || b.className.includes("bg-slate-200")
      );
      // Premier toggle (notif_offres_exclusives = true) → bg-indigo-600
      expect(toggleButtons[0].className).toContain("bg-indigo-600");
      // Deuxième toggle (notif_newsletter = false) → bg-slate-200
      expect(toggleButtons[1].className).toContain("bg-slate-200");
    });
  });

  it("🟢 HP2 : Changement réussi d'une préférence", async () => {
    jobsService.getParametres.mockResolvedValue(mockSettings);
    jobsService.updateParametres.mockResolvedValue({});
    render(<Settings />);
    await waitFor(() => screen.getByText("Notifications")); // Titre h2 exact
    const allButtons = screen.getAllByRole("button");
    const toggles = allButtons.filter(
      (b) => b.className.includes("bg-indigo-600") || b.className.includes("bg-slate-200")
    );
    fireEvent.click(toggles[1]); // Newsletter toggle
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
      expect(toast.error).toHaveBeenCalledWith("Erreur lors du chargement.");
    });
  });

  it("🔴 EC2 : Erreur de sauvegarde effectue un Rollback", async () => {
    jobsService.getParametres.mockResolvedValue(mockSettings);
    jobsService.updateParametres.mockRejectedValue(new Error("Update failed"));
    render(<Settings />);
    await waitFor(() => screen.getByText("Notifications")); // Titre h2 exact
    const allButtons = screen.getAllByRole("button");
    const toggles = allButtons.filter(
      (b) => b.className.includes("bg-indigo-600") || b.className.includes("bg-slate-200")
    );
    const toggle0 = toggles[0];
    // État initial: bg-indigo-600 (true)
    expect(toggle0.className).toContain("bg-indigo-600");
    fireEvent.click(toggle0);
    // Optimistic UI: devient false immédiatement
    expect(toggle0.className).toContain("bg-slate-200");
    await waitFor(() => {
      // Rollback: redevient true
      expect(toggle0.className).toContain("bg-indigo-600");
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_MAJ_PARAMETRES",
        expect.anything(),
      );
    });
  });

  it("🔴 EC3 : Validation mot de passe (Mismatch)", async () => {
    jobsService.getParametres.mockResolvedValue(mockSettings);
    render(<Settings />);
    await waitFor(() => screen.getByPlaceholderText("Nouveau mot de passe"));
    fireEvent.change(screen.getByPlaceholderText("Nouveau mot de passe"), {
      target: { value: "Password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer"), {
      target: { value: "Différent123" },
    });
    fireEvent.click(screen.getByText("Modifier"));
    expect(toast.error).toHaveBeenCalledWith(
      "Les mots de passe ne correspondent pas.",
    );
  });
});
