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
import RegisterCandidat from "../src/Pages/RegisterCandidat";
import { authService } from "../src/Services/authService";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import selectEvent from "react-select-event";
import toast from "react-hot-toast";

// --- MOCKS ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../src/Services/authService", () => ({
  authService: { registerCandidat: vi.fn() },
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getConstants: vi.fn(), verifyEmail: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  },
}));

const mockWilayas = {
  wilayas: [
    { value: "16 - Alger", label: "16 - Alger" },
    { value: "31 - Oran", label: "31 - Oran" },
  ],
};

describe("🗳️ UI & Logique - Composant <RegisterCandidat />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getConstants.mockResolvedValue(mockWilayas);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Fonction utilitaire pour garantir que le formulaire 1 est valide
  const remplirEtape1Complet = async (container) => {
    fireEvent.change(container.querySelector('input[name="last_name"]'), {
      target: { value: "Belamri" },
    });
    fireEvent.change(container.querySelector('input[name="first_name"]'), {
      target: { value: "Meriem" },
    });
    fireEvent.change(container.querySelector('input[name="date_naissance"]'), {
      target: { value: "1995-10-10" },
    });
    fireEvent.change(container.querySelector('input[name="telephone"]'), {
      target: { value: "0555123456" },
    });
    fireEvent.change(container.querySelector('input[name="nin"]'), {
      target: { value: "123456789012345678" },
    });
    fireEvent.change(container.querySelector('input[name="email"]'), {
      target: { value: "meriem@test.dz" },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "password123" },
    });

    const selectEl = screen.getByText(/Sélectionnez.../i);
    await selectEvent.select(selectEl, "31 - Oran");

    fireEvent.click(screen.getByRole("checkbox"));
  };

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Inscription Étape 1 réussie et passage à l'étape OTP", async () => {
    authService.registerCandidat.mockResolvedValue({});
    const { container } = render(
      <MemoryRouter>
        <RegisterCandidat />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'inscrire gratuitement/i }),
    );

    expect(
      await screen.findByText(/Vérifiez votre email/i),
    ).toBeInTheDocument();
    expect(authService.registerCandidat).toHaveBeenCalled();
  });

  it("🟢 HP2 : Vérification OTP valide et redirection vers Login", async () => {
    authService.registerCandidat.mockResolvedValue({});
    jobsService.verifyEmail.mockResolvedValue({});
    const { container } = render(
      <MemoryRouter>
        <RegisterCandidat />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'inscrire gratuitement/i }),
    );

    // ✅ On attend fermement l'affichage de l'étape 2 avant d'agir
    const confirmBtn = await screen.findByRole("button", {
      name: /Confirmer mon compte/i,
    });
    const otpInputs = screen.getAllByRole("textbox");

    for (let i = 0; i < 6; i++) {
      fireEvent.change(otpInputs[i], { target: { value: "1" } });
    }

    // ✅ On attend que le bouton se déverrouille suite au setOtp
    await waitFor(() => expect(confirmBtn).not.toBeDisabled());
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(jobsService.verifyEmail).toHaveBeenCalledWith(
        "meriem@test.dz",
        "111111",
      );
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });

  it("🟢 HP3 : Consultation de la Loi 18-07 via la modale", async () => {
    render(
      <MemoryRouter>
        <RegisterCandidat />
      </MemoryRouter>,
    );

    const btnLoi = screen.getByRole("button", { name: /Loi 18-07/i });
    fireEvent.click(btnLoi);

    expect(screen.getByText(/Protection des données/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/J'ai compris/i));
    await waitFor(() => {
      expect(
        screen.queryByText(/Protection des données/i),
      ).not.toBeInTheDocument();
    });
  });

  it("🟢 HP4 : Focus OTP (Saisie déplace le curseur)", async () => {
    authService.registerCandidat.mockResolvedValue({});
    const { container } = render(
      <MemoryRouter>
        <RegisterCandidat />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'inscrire gratuitement/i }),
    );

    // ✅ Empêche de cibler les inputs de l'étape 1 en attendant que le texte de l'étape 2 soit là
    await screen.findByText(/Vérifiez votre email/i);
    const otpInputs = screen.getAllByRole("textbox");

    otpInputs[0].focus();
    fireEvent.change(otpInputs[0], { target: { value: "5" } });

    await waitFor(() => {
      expect(otpInputs[1]).toHaveFocus();
    });
  });

  // --- 🔴 EDGE CASES (4/4) ---

  it("🔴 EC1 : Inscription bloquée si consentement non coché", async () => {
    render(
      <MemoryRouter>
        <RegisterCandidat />
      </MemoryRouter>,
    );
    const btn = screen.getByRole("button", {
      name: /S'inscrire gratuitement/i,
    });

    expect(btn).toBeDisabled();
  });

  it("🔴 EC2 : Télémétrie en cas d'échec du chargement des Wilayas", async () => {
    jobsService.getConstants.mockRejectedValue(new Error("API Fail"));
    render(
      <MemoryRouter>
        <RegisterCandidat />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_WILAYAS_REGISTER",
        expect.anything(),
      );
    });
  });

  it("🔴 EC3 : Gestion d'un conflit Email/NIN existant (Télémétrie)", async () => {
    authService.registerCandidat.mockRejectedValue({
      response: { data: { email: ["Cet email est déjà utilisé."] } },
    });

    const { container } = render(
      <MemoryRouter>
        <RegisterCandidat />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'inscrire gratuitement/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Cet email est déjà utilisé.",
        expect.anything(),
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_REGISTRATION_CANDIDAT",
        expect.anything(),
      );
    });
  });

  it("🔴 EC4 : Échec de la vérification OTP (Télémétrie & Toast)", async () => {
    authService.registerCandidat.mockResolvedValue({});
    // On mock directement avec le payload qui génère le message par défaut
    jobsService.verifyEmail.mockRejectedValue({
      response: { data: { error: "Le code est incorrect ou expiré." } },
    });

    const { container } = render(
      <MemoryRouter>
        <RegisterCandidat />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'inscrire gratuitement/i }),
    );

    // ✅ On attend le rendu de l'étape 2
    const confirmBtn = await screen.findByRole("button", {
      name: /Confirmer mon compte/i,
    });
    const otpInputs = screen.getAllByRole("textbox");

    for (let i = 0; i < 6; i++) {
      fireEvent.change(otpInputs[i], { target: { value: "1" } });
    }

    // ✅ On garantit que le bouton est cliquable avant de cliquer
    await waitFor(() => expect(confirmBtn).not.toBeDisabled());
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Le code est incorrect ou expiré.",
        expect.anything(),
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_VERIFY_OTP_CANDIDAT",
        expect.anything(),
      );
    });
  });
});
