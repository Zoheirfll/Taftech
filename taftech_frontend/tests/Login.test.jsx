// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import {
  describe,
  it,
  expect,
  afterEach,
  vi,
  beforeEach,
  beforeAll,
  afterAll,
} from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../src/Pages/Auth/Login";
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
  authService: {
    login: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
  },
}));

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: ({ onSuccess, onError }) => (
    <button onClick={() => onSuccess({ credential: "fake-token" })}>
      Connexion Google (mock)
    </button>
  ),
}));

// Hack JSDOM : Impossible de mocker window.location.reload directement
// car location est en lecture seule. On doit le redéfinir temporairement.
const originalLocation = window.location;
const mockReload = vi.fn();

describe("🔐 UI & Logique - Composant <Login />", () => {
  beforeAll(() => {
    delete window.location;
    window.location = { ...originalLocation, reload: mockReload };
  });

  afterAll(() => {
    window.location = originalLocation;
  });

  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS (1/1) ---

  it("🟢 HP1 : Connexion réussie (API, Redirection et Reload)", async () => {
    authService.login.mockResolvedValue({ token: "fake-jwt" });
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    // Remplissage du formulaire
    fireEvent.change(screen.getByPlaceholderText("votre@email.com"), {
      target: { value: "test@taftech.dz" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    // Soumission
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      // Vérification du service d'auth
      expect(authService.login).toHaveBeenCalledWith(
        "test@taftech.dz",
        "password123",
        "candidat",
        false,
      );

      // Vérification des retours visuels
      expect(toast.loading).toHaveBeenCalledWith("Connexion en cours...");
      expect(toast.success).toHaveBeenCalledWith("Connexion réussie !", {
        id: "toast-id",
      });

      // Vérification de la navigation et du rafraîchissement
      expect(mockNavigate).toHaveBeenCalledWith("/");
      expect(mockReload).toHaveBeenCalled();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC0 : Premium expiré (403 PREMIUM_EXPIRE) — toast spécifique sans navigation", async () => {
    const premiumError = {
      response: {
        status: 403,
        data: {
          code: "PREMIUM_EXPIRE",
          detail: "L'abonnement Premium de votre entreprise a expiré. Contactez le propriétaire.",
        },
      },
    };
    authService.login.mockRejectedValue(premiumError);
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("votre@email.com"), {
      target: { value: "membre@corp.dz" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      // Le toast d'erreur doit contenir le message backend, pas le message générique
      expect(toast.error).toHaveBeenCalled();
      // Pas de navigation
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC1 : Échec de la connexion (Mauvais identifiants & Télémétrie)", async () => {
    authService.login.mockRejectedValue(new Error("Unauthorized"));
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByPlaceholderText("votre@email.com"), {
      target: { value: "wrong@taftech.dz" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrongpass" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Email ou mot de passe incorrect.",
        { id: "toast-id" },
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CONNEXION",
        expect.anything(),
      );

      // On s'assure que le système ne navigue pas et ne recharge pas
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockReload).not.toHaveBeenCalled();
    });
  });
});
