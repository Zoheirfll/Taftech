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
import { MemoryRouter } from "react-router-dom";
import ForgotPassword from "../src/Pages/Auth/ForgotPassword";
import { authService } from "../src/Services/authService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// --- MOCKS ---
vi.mock("../src/Services/authService", () => ({
  authService: { forgotPassword: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("🔑 UI & Logique - Composant <ForgotPassword />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Affichage initial du formulaire", () => {
    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    expect(screen.getByText("Mot de passe oublié")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("votre@email.dz")).toBeInTheDocument();
    expect(screen.getByText("Envoyer le code")).toBeInTheDocument();
    expect(screen.getByText(/Retour à la connexion/i)).toBeInTheDocument();
  });

  it("🟢 HP2 : Envoi réussi affiche l'écran de confirmation", async () => {
    authService.forgotPassword.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("votre@email.dz"), {
      target: { value: "test@taftech.dz" },
    });
    fireEvent.click(screen.getByText("Envoyer le code"));

    await waitFor(() => {
      expect(authService.forgotPassword).toHaveBeenCalledWith("test@taftech.dz");
      expect(screen.getByText("Email envoyé !")).toBeInTheDocument();
      expect(screen.getByText("Entrer mon code →")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Le bouton est désactivé pendant l'envoi (Anti-Spam)", async () => {
    authService.forgotPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("votre@email.dz"), {
      target: { value: "test@taftech.dz" },
    });

    const btn = screen.getByText("Envoyer le code");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText("Envoi en cours...")).toBeInTheDocument();
      expect(screen.getByText("Envoi en cours...")).toBeDisabled();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Email vide bloque la soumission (validation front)", () => {
    const { container } = render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    // On soumet le formulaire directement pour contourner la validation HTML5
    fireEvent.submit(container.querySelector("form"));

    expect(toast.error).toHaveBeenCalledWith("Veuillez entrer votre email.");
    expect(authService.forgotPassword).not.toHaveBeenCalled();
  });

  it("🔴 EC2 : Crash API déclenche Télémétrie et toast", async () => {
    authService.forgotPassword.mockRejectedValue(new Error("Network Error"));

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("votre@email.dz"), {
      target: { value: "test@taftech.dz" },
    });
    fireEvent.click(screen.getByText("Envoyer le code"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_FORGOT_PASSWORD",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Une erreur est survenue.");
      expect(screen.getByText("Envoyer le code")).toBeInTheDocument();
    });
  });
});
