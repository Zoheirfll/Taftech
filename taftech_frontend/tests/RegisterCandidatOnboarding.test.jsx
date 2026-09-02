// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import selectEvent from "react-select-event";
import RegisterCandidat from "../src/Pages/Auth/RegisterCandidat";
import { authService } from "../src/Services/authService";
import { jobsService } from "../src/Services/jobsService";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../src/Services/authService", () => ({
  authService: {
    registerCandidat: vi.fn(),
    verifyEmail: vi.fn(),
    renvoyerCodeVerification: vi.fn(),
    googleLogin: vi.fn(),
    accepterConsentement: vi.fn(),
  },
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn().mockResolvedValue({
      wilayas: [{ value: "31 - Oran", label: "31 - Oran" }],
    }),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "id"), dismiss: vi.fn() },
}));

// GoogleLogin exige un GoogleOAuthProvider ancêtre (fourni au niveau main.jsx dans la
// vraie appli) — hors de portée de ce test, qui ne couvre que le flux email/OTP.
vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <div data-testid="google-login-mock" />,
}));

describe("RegisterCandidat — redirection vers le wizard d'onboarding", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  const remplirEtSoumettre = async (container) => {
    fireEvent.change(container.querySelector('input[name="last_name"]'), { target: { value: "Ali" } });
    fireEvent.change(container.querySelector('input[name="first_name"]'), { target: { value: "Karim" } });
    fireEvent.change(container.querySelector('input[name="date_naissance"]'), { target: { value: "2000-01-01" } });
    fireEvent.change(container.querySelector('input[name="telephone"]'), { target: { value: "0555000000" } });
    fireEvent.change(container.querySelector('input[name="adresse"]'), { target: { value: "5 rue Test" } });
    fireEvent.change(container.querySelector('input[name="email"]'), { target: { value: "karim@test.dz" } });
    fireEvent.change(container.querySelector('input[name="password"]'), { target: { value: "Password123!" } });
    fireEvent.change(container.querySelector('input[name="confirmPassword"]'), { target: { value: "Password123!" } });
    const wilayaSelect = container.querySelector('.wilaya-select__control');
    await selectEvent.select(wilayaSelect, "31 - Oran");
    fireEvent.click(container.querySelector('input[name="consentement_loi_18_07"]'));
    fireEvent.click(screen.getByRole("button", { name: /Créer mon compte/i }));
  };

  it("pose le flag onboarding avant l'inscription puis navigue vers /onboarding après l'OTP", async () => {
    authService.registerCandidat.mockResolvedValue({});
    authService.verifyEmail.mockResolvedValue({ role: "CANDIDAT", est_membre_equipe: false });

    const { container } = render(<MemoryRouter><RegisterCandidat /></MemoryRouter>);
    await screen.findByText(/Sélectionnez votre wilaya/i);

    await remplirEtSoumettre(container);

    await waitFor(() => {
      expect(sessionStorage.getItem("taftech_new_registration")).toBe("1");
    });

    await screen.findByText(/Vérifiez votre email/i);
    const otpInputs = screen.getAllByRole("textbox").filter((el) => el.maxLength === 1);
    "424242".split("").forEach((digit, i) => fireEvent.change(otpInputs[i], { target: { value: digit } }));
    fireEvent.click(screen.getByRole("button", { name: /Confirmer mon compte/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/onboarding");
    });
    expect(sessionStorage.getItem("taftech_new_registration")).toBeNull();
  });
});
