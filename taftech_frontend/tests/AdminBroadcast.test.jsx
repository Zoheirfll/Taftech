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
import AdminBroadcast from "../src/Pages/Admin/AdminBroadcast";
import { ConfirmModalHost } from "../src/utils/confirmToast";
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
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Happy Path : Envoi de la campagne réussi", async () => {
    api.post.mockResolvedValue({ data: { message: "Campagne expédiée" } });

    render(
      <>
        <AdminBroadcast />
        <ConfirmModalHost />
      </>,
    );

    // ✅ CORRECTION : On cherche le VRAI placeholder du composant
    fireEvent.change(screen.getByPlaceholderText(/Ex: Les 5 compétences/i), {
      target: { value: "Nouvelle mise à jour" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Rédigez votre email/i), {
      target: { value: "Contenu de la newsletter..." },
    });

    // Soumission → ouvre la modale de confirmation
    fireEvent.click(screen.getByText(/Envoyer la campagne/i));
    fireEvent.click(await screen.findByText("Confirmer"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("jobs/admin/broadcast-email/", {
        type_envoi: "NEWSLETTER",
        sujet: "Nouvelle mise à jour",
        message: "Contenu de la newsletter...",
      });
      expect(toast.success).toHaveBeenCalledWith("Campagne expédiée");
    });
  });

  it("🟡 Edge Case : Refus de la confirmation annule l'envoi", async () => {
    render(
      <>
        <AdminBroadcast />
        <ConfirmModalHost />
      </>,
    );

    // ✅ CORRECTION
    fireEvent.change(screen.getByPlaceholderText(/Ex: Les 5 compétences/i), {
      target: { value: "Test Annulation" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Rédigez votre email/i), {
      target: { value: "Message..." },
    });

    fireEvent.click(screen.getByText(/Envoyer la campagne/i));
    // L'utilisateur clique sur "Annuler" dans la modale
    fireEvent.click(await screen.findByText("Annuler"));

    expect(api.post).not.toHaveBeenCalled(); // L'API ne doit pas être appelée
  });

  it("🔴 Edge Case : Crash serveur (500) déclenche reportError", async () => {
    api.post.mockRejectedValue({ response: { status: 500 } });

    render(
      <>
        <AdminBroadcast />
        <ConfirmModalHost />
      </>,
    );

    // ✅ CORRECTION
    fireEvent.change(screen.getByPlaceholderText(/Ex: Les 5 compétences/i), {
      target: { value: "Crash Test" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Rédigez votre email/i), {
      target: { value: "Message..." },
    });

    fireEvent.click(screen.getByText(/Envoyer la campagne/i));
    fireEvent.click(await screen.findByText("Confirmer"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_ENVOI_BROADCAST",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de l'envoi.");
    });
  });
});
