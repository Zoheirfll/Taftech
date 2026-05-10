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
import CreateEntreprise from "../src/Pages/CreateEntreprise";
import { entrepriseService } from "../src/Services/entrepriseService";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import selectEvent from "react-select-event";

// --- MOCKS ---
vi.mock("../src/Services/entrepriseService", () => ({
  entrepriseService: { creerEntreprise: vi.fn() },
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getConstants: vi.fn() },
}));

vi.mock("../src/data/communes.json", () => ({
  default: [
    { wilaya_code: "31", commune_name_ascii: "Oran" },
    { wilaya_code: "16", commune_name_ascii: "Alger" },
  ],
}));

const mockWilayas = {
  wilayas: [
    { value: "31 - Oran", label: "31 - Oran" },
    { value: "16 - Alger", label: "16 - Alger" },
  ],
};

describe("🏢 UI & Logique - Composant <CreateEntreprise />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Fonction utilitaire pour trouver un input à côté d'un label non-lié
  const getFieldByLabel = (text) => {
    const label = screen.getByText(text);
    return (
      label.parentElement.querySelector("input") ||
      label.parentElement.querySelector("textarea")
    );
  };

  it("🟢 HP1 : Chargement des wilayas au montage", async () => {
    jobsService.getConstants.mockResolvedValue(mockWilayas);
    render(
      <MemoryRouter>
        <CreateEntreprise />
      </MemoryRouter>,
    );
    await waitFor(() => expect(jobsService.getConstants).toHaveBeenCalled());
  });

  it("🟢 HP2 : Cascade Wilaya -> Commune (Filtrage)", async () => {
    jobsService.getConstants.mockResolvedValue(mockWilayas);
    render(
      <MemoryRouter>
        <CreateEntreprise />
      </MemoryRouter>,
    );
    const wilayaSelect = screen.getByLabelText("wilaya-select");
    await selectEvent.select(wilayaSelect, "31 - Oran");
    expect(screen.getByLabelText("commune-select")).not.toBeDisabled();
  });

  it("🟢 HP3 : Soumission réussie et redirection", async () => {
    jobsService.getConstants.mockResolvedValue(mockWilayas);
    entrepriseService.creerEntreprise.mockResolvedValue({});
    render(
      <MemoryRouter>
        <CreateEntreprise />
      </MemoryRouter>,
    );

    // Remplissage avec la fonction utilitaire
    fireEvent.change(getFieldByLabel(/Nom de l'entreprise/i), {
      target: { value: "TafTech" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Informatique/i), {
      target: { value: "IT" },
    });

    const wilayaSelect = screen.getByLabelText("wilaya-select");
    await selectEvent.select(wilayaSelect, "31 - Oran");

    fireEvent.change(getFieldByLabel(/Registre de Commerce/i), {
      target: { value: "RC123" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Créer mon profil Recruteur/i }),
    );

    await waitFor(() => {
      expect(screen.getByText(/Entreprise enregistrée/i)).toBeInTheDocument();
    });
  });

  it("🔴 EC1 : Échec chargement Wilayas déclenche reportError", async () => {
    jobsService.getConstants.mockRejectedValue(new Error("500"));
    render(
      <MemoryRouter>
        <CreateEntreprise />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_WILAYAS_CREATE_ENT",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 : Gestion d'un doublon de Registre de Commerce (400)", async () => {
    jobsService.getConstants.mockResolvedValue(mockWilayas);
    entrepriseService.creerEntreprise.mockRejectedValue({
      response: {
        data: { registre_commerce: ["Ce numéro de RC est déjà enregistré."] },
      },
    });

    render(
      <MemoryRouter>
        <CreateEntreprise />
      </MemoryRouter>,
    );

    // On remplit TOUT pour passer la validation HTML5 'required'
    fireEvent.change(getFieldByLabel(/Nom de l'entreprise/i), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Informatique/i), {
      target: { value: "IT" },
    });
    const wilayaSelect = screen.getByLabelText("wilaya-select");
    await selectEvent.select(wilayaSelect, "31 - Oran");
    fireEvent.change(getFieldByLabel(/Registre de Commerce/i), {
      target: { value: "RC-EXISTANT" },
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(
        screen.getByText("Ce numéro de RC est déjà enregistré."),
      ).toBeInTheDocument();
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CREATION_ENTREPRISE",
        expect.anything(),
      );
    });
  });

  it("🔴 EC4 : Crash serveur lors de la création (500)", async () => {
    jobsService.getConstants.mockResolvedValue(mockWilayas);
    entrepriseService.creerEntreprise.mockRejectedValue(new Error("500"));

    render(
      <MemoryRouter>
        <CreateEntreprise />
      </MemoryRouter>,
    );

    // On remplit TOUT pour passer la validation HTML5 'required'
    fireEvent.change(getFieldByLabel(/Nom de l'entreprise/i), {
      target: { value: "Test" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ex: Informatique/i), {
      target: { value: "IT" },
    });
    const wilayaSelect = screen.getByLabelText("wilaya-select");
    await selectEvent.select(wilayaSelect, "31 - Oran");
    fireEvent.change(getFieldByLabel(/Registre de Commerce/i), {
      target: { value: "RC-CRASH" },
    });

    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(
        screen.getByText("Erreur lors de la création de l'entreprise."),
      ).toBeInTheDocument();
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CREATION_ENTREPRISE",
        expect.anything(),
      );
    });
  });
});
