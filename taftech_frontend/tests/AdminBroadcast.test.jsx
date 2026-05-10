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
import AdminBroadcast from "../src/Pages/admin/AdminBroadcast";
import api from "../src/api/axiosConfig";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// MOCKS
vi.mock("../src/api/axiosConfig");
vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("📢 UI & Logique - Composant <AdminBroadcast />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    // Mock de window.confirm pour accepter par défaut
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Happy Path : Envoi de la campagne réussi", async () => {
    api.post.mockResolvedValue({ data: { message: "Campagne expédiée" } });

    render(<AdminBroadcast />);

    // ✅ CORRECTION : On cherche le VRAI placeholder du composant
    fireEvent.change(screen.getByPlaceholderText(/Ex: Les 5 compétences/i), {
      target: { value: "Nouvelle mise à jour" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Rédigez votre email/i), {
      target: { value: "Contenu de la newsletter..." },
    });

    // Soumission
    fireEvent.click(screen.getByText(/ENVOYER LA CAMPAGNE/i));

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(api.post).toHaveBeenCalledWith("jobs/admin/broadcast-email/", {
        type_envoi: "NEWSLETTER",
        sujet: "Nouvelle mise à jour",
        message: "Contenu de la newsletter...",
      });
      expect(toast.success).toHaveBeenCalledWith("Campagne expédiée");
    });
  });

  it("🟡 Edge Case : Refus de la confirmation annule l'envoi", async () => {
    // L'utilisateur clique sur "Annuler" dans la popup
    window.confirm.mockImplementationOnce(() => false);

    render(<AdminBroadcast />);

    // ✅ CORRECTION
    fireEvent.change(screen.getByPlaceholderText(/Ex: Les 5 compétences/i), {
      target: { value: "Test Annulation" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Rédigez votre email/i), {
      target: { value: "Message..." },
    });

    fireEvent.click(screen.getByText(/ENVOYER LA CAMPAGNE/i));

    expect(window.confirm).toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled(); // L'API ne doit pas être appelée
  });

  it("🔴 Edge Case : Crash serveur (500) déclenche reportError", async () => {
    api.post.mockRejectedValue({ response: { status: 500 } });

    render(<AdminBroadcast />);

    // ✅ CORRECTION
    fireEvent.change(screen.getByPlaceholderText(/Ex: Les 5 compétences/i), {
      target: { value: "Crash Test" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Rédigez votre email/i), {
      target: { value: "Message..." },
    });

    fireEvent.click(screen.getByText(/ENVOYER LA CAMPAGNE/i));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_ENVOI_BROADCAST",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de l'envoi des emails.",
      );
    });
  });
});
