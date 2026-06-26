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
import ResetPassword from "../src/Pages/Auth/ResetPassword";
import { authService } from "../src/Services/authService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// --- MOCKS ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../src/Services/authService", () => ({
  authService: { resetPassword: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("🔐 UI & Logique - Composant <ResetPassword />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  // Le formulaire utilise maintenant 6 inputs OTP individuels (un chiffre chacun)
  const fillForm = (email = "test@taftech.dz", code = "123456", mdp = "newpass123", confirm = "newpass123") => {
    fireEvent.change(screen.getByPlaceholderText("votre@email.dz"), { target: { value: email } });
    // Remplir les 6 cases OTP individuellement
    const otpInputs = document.querySelectorAll('input[maxLength="1"]');
    code.split("").forEach((digit, i) => {
      if (otpInputs[i]) {
        fireEvent.change(otpInputs[i], { target: { value: digit } });
      }
    });
    fireEvent.change(screen.getByPlaceholderText("Minimum 8 caractères"), { target: { value: mdp } });
    fireEvent.change(screen.getByPlaceholderText("Répétez le mot de passe"), { target: { value: confirm } });
  };

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Affichage initial du formulaire", () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    expect(screen.getByText("Nouveau mot de passe")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("votre@email.dz")).toBeInTheDocument();
    // 6 inputs OTP individuels (maxLength="1")
    expect(document.querySelectorAll('input[maxLength="1"]').length).toBe(6);
    expect(screen.getByPlaceholderText("Minimum 8 caractères")).toBeInTheDocument();
    expect(screen.getByText("Réinitialiser le mot de passe")).toBeInTheDocument();
  });

  it("🟢 HP2 : Pré-remplissage de l'email via location.state", () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/reset-password", state: { email: "prefill@taftech.dz" } }]}>
        <ResetPassword />
      </MemoryRouter>,
    );

    expect(screen.getByPlaceholderText("votre@email.dz")).toHaveValue("prefill@taftech.dz");
  });

  it("🟢 HP3 : Réinitialisation réussie → état succès + redirection", async () => {
    authService.resetPassword.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    fillForm();
    fireEvent.submit(screen.getByRole("button", { name: /Réinitialiser/i }).closest("form"));

    await waitFor(() => {
      expect(authService.resetPassword).toHaveBeenCalledWith(
        "test@taftech.dz",
        "123456",
        "newpass123",
      );
      // Le composant affiche un état visuel (pas toast.success)
      expect(screen.getByText("Mot de passe réinitialisé !")).toBeInTheDocument();
    });

    vi.advanceTimersByTime(3000);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("🟢 HP4 : Toggle visibilité du mot de passe", () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    const inputMdp = screen.getByPlaceholderText("Minimum 8 caractères");
    expect(inputMdp).toHaveAttribute("type", "password");

    // Clic sur le bouton œil (Eye/EyeOff dans le parent relatif)
    const toggleBtn = inputMdp.closest("div.relative").querySelector("button");
    fireEvent.click(toggleBtn);
    expect(inputMdp).toHaveAttribute("type", "text");

    fireEvent.click(toggleBtn);
    expect(inputMdp).toHaveAttribute("type", "password");
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Mots de passe non identiques bloquent la soumission", () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    fillForm("test@taftech.dz", "123456", "password1", "password2");
    fireEvent.submit(screen.getByRole("button", { name: /Réinitialiser/i }).closest("form"));

    expect(toast.error).toHaveBeenCalledWith(
      "Les mots de passe ne correspondent pas.",
    );
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it("🔴 EC2 : Mot de passe trop court bloque la soumission", () => {
    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    fillForm("test@taftech.dz", "123456", "short", "short");
    fireEvent.submit(screen.getByRole("button", { name: /Réinitialiser/i }).closest("form"));

    expect(toast.error).toHaveBeenCalledWith(
      "Le mot de passe doit contenir au moins 8 caractères.",
    );
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it("🔴 EC3 : Code invalide → toast + Télémétrie", async () => {
    authService.resetPassword.mockRejectedValue({
      response: { data: { error: "Code invalide ou expiré." } },
    });

    render(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    );

    fillForm();
    fireEvent.submit(screen.getByRole("button", { name: /Réinitialiser/i }).closest("form"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_RESET_PASSWORD",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Code invalide ou expiré.");
    });
  });
});
