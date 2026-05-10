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
import RegisterRecruteur from "../src/Pages/RegisterRecruteur";
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
  authService: {
    registerRecruteur: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getConstants: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
  },
}));

const mockConstants = {
  wilayas: [
    { value: "16", label: "Alger" },
    { value: "31", label: "Oran" },
  ],
  secteurs: [{ value: "IT", label: "Informatique" }],
};

describe("🏢 UI & Logique - Composant <RegisterRecruteur />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getConstants.mockResolvedValue(mockConstants);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Helper pour remplir l'Etape 1 (Débloque les vérifications de handleSubmit)
  const remplirEtape1Complet = async (container) => {
    fireEvent.change(container.querySelector('input[name="last_name"]'), {
      target: { value: "TafTech" },
    });
    fireEvent.change(container.querySelector('input[name="first_name"]'), {
      target: { value: "Admin" },
    });
    fireEvent.change(container.querySelector('input[name="email"]'), {
      target: { value: "admin@taftech.dz" },
    });
    fireEvent.change(container.querySelector('input[name="telephone"]'), {
      target: { value: "0555000000" },
    });
    fireEvent.change(container.querySelector('input[name="nom_entreprise"]'), {
      target: { value: "TafTech Corp" },
    });
    fireEvent.change(
      container.querySelector('input[name="registre_commerce"]'),
      { target: { value: "1234A" } },
    );
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "pass1234" },
    });

    const selects = screen.getAllByText(/Sélectionnez.../i);
    await selectEvent.select(selects[0], "Informatique"); // Secteur (index 0)
    await selectEvent.select(selects[1], "Oran"); // Wilaya (index 1)
  };

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Inscription Étape 1 réussie -> Passage Étape 2", async () => {
    authService.registerRecruteur.mockResolvedValue({ message: "OK" });
    const { container } = render(
      <MemoryRouter>
        <RegisterRecruteur />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'INSCRIRE COMME EMPLOYEUR/i }),
    );

    expect(
      await screen.findByText(/Vérifiez votre Email/i),
    ).toBeInTheDocument();
    expect(authService.registerRecruteur).toHaveBeenCalled();
  });

  it("🟢 HP2 : Vérification OTP réussie -> Passage Étape 3", async () => {
    authService.registerRecruteur.mockResolvedValue({});
    authService.verifyEmail.mockResolvedValue({});
    const { container } = render(
      <MemoryRouter>
        <RegisterRecruteur />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'INSCRIRE COMME EMPLOYEUR/i }),
    );

    await screen.findByText(/Vérifiez votre Email/i);

    const otpInput = screen.getByPlaceholderText("------");
    fireEvent.change(otpInput, { target: { value: "123456" } });

    fireEvent.click(screen.getByRole("button", { name: /VALIDER MON EMAIL/i }));

    expect(await screen.findByText(/Compte Sécurisé !/i)).toBeInTheDocument();
    expect(authService.verifyEmail).toHaveBeenCalledWith(
      "admin@taftech.dz",
      "123456",
    );
  });

  it("🟢 HP3 : Navigation depuis l'écran de succès", async () => {
    authService.registerRecruteur.mockResolvedValue({});
    authService.verifyEmail.mockResolvedValue({});
    const { container } = render(
      <MemoryRouter>
        <RegisterRecruteur />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'INSCRIRE COMME EMPLOYEUR/i }),
    );

    await screen.findByText(/Vérifiez votre Email/i);
    fireEvent.change(screen.getByPlaceholderText("------"), {
      target: { value: "111111" },
    });
    fireEvent.click(screen.getByRole("button", { name: /VALIDER MON EMAIL/i }));

    const finalBtn = await screen.findByRole("button", {
      name: /ALLER À LA PAGE DE CONNEXION/i,
    });
    fireEvent.click(finalBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("🟢 HP4 : Filtre Regex du champ OTP (bloque les lettres)", async () => {
    authService.registerRecruteur.mockResolvedValue({});
    const { container } = render(
      <MemoryRouter>
        <RegisterRecruteur />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'INSCRIRE COMME EMPLOYEUR/i }),
    );

    await screen.findByText(/Vérifiez votre Email/i);
    const otpInput = screen.getByPlaceholderText("------");

    fireEvent.change(otpInput, { target: { value: "A1B2C3" } });

    expect(otpInput.value).toBe("123");
  });

  // --- 🔴 EDGE CASES (4/4) ---

  it("🔴 EC1 : Blocage si Secteur ou Wilaya manquant", async () => {
    const { container } = render(
      <MemoryRouter>
        <RegisterRecruteur />
      </MemoryRouter>,
    );

    // On remplit TOUS les champs texte obligatoires pour passer la validation HTML5
    fireEvent.change(container.querySelector('input[name="last_name"]'), {
      target: { value: "TafTech" },
    });
    fireEvent.change(container.querySelector('input[name="first_name"]'), {
      target: { value: "Admin" },
    });
    fireEvent.change(container.querySelector('input[name="email"]'), {
      target: { value: "admin@taftech.dz" },
    });
    fireEvent.change(container.querySelector('input[name="telephone"]'), {
      target: { value: "0555000000" },
    });
    fireEvent.change(container.querySelector('input[name="nom_entreprise"]'), {
      target: { value: "TafTech Corp" },
    });
    fireEvent.change(
      container.querySelector('input[name="registre_commerce"]'),
      { target: { value: "1234A" } },
    );
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: "pass1234" },
    });

    // OMISSION VOLONTAIRE : On ne touche pas aux Selects React

    fireEvent.click(
      screen.getByRole("button", { name: /S'INSCRIRE COMME EMPLOYEUR/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Veuillez sélectionner un secteur et une wilaya.",
      );
    });
    expect(authService.registerRecruteur).not.toHaveBeenCalled();
  });

  it("🔴 EC2 : Télémétrie si les constantes (Wilaya/Secteur) échouent", async () => {
    jobsService.getConstants.mockRejectedValue(new Error("Network Error"));
    render(
      <MemoryRouter>
        <RegisterRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_CONSTANTES_RECRUTEUR",
        expect.anything(),
      );
    });
  });

  it("🔴 EC3 : Doublon de Registre de Commerce (Erreur API)", async () => {
    authService.registerRecruteur.mockRejectedValue({
      response: { data: { registre_commerce: ["Ce registre existe déjà."] } },
    });
    const { container } = render(
      <MemoryRouter>
        <RegisterRecruteur />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'INSCRIRE COMME EMPLOYEUR/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Ce registre existe déjà.",
        expect.anything(),
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_REGISTRATION_RECRUTEUR",
        expect.anything(),
      );
    });
  });

  it("🔴 EC4 : Échec de l'OTP (Mauvais code) + Toast/Télémétrie", async () => {
    authService.registerRecruteur.mockResolvedValue({});
    authService.verifyEmail.mockRejectedValue({
      response: { data: { error: "Code expiré" } },
    });

    const { container } = render(
      <MemoryRouter>
        <RegisterRecruteur />
      </MemoryRouter>,
    );

    await remplirEtape1Complet(container);
    fireEvent.click(
      screen.getByRole("button", { name: /S'INSCRIRE COMME EMPLOYEUR/i }),
    );

    await screen.findByText(/Vérifiez votre Email/i);
    fireEvent.change(screen.getByPlaceholderText("------"), {
      target: { value: "000000" },
    });
    fireEvent.click(screen.getByRole("button", { name: /VALIDER MON EMAIL/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Code expiré",
        expect.anything(),
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_VERIFICATION_OTP_RECRUTEUR",
        expect.anything(),
      );
    });
  });
});
