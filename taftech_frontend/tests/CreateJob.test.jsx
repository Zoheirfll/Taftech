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
import CreateJob from "../src/Pages/CreateJob";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";
import selectEvent from "react-select-event";

// --- MOCKS ---
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
    creerOffre: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
  },
}));

vi.mock("../src/data/communes.json", () => ({
  default: [
    { wilaya_code: "31", commune_name_ascii: "Oran" },
    { wilaya_code: "16", commune_name_ascii: "Alger" },
  ],
}));

const mockConstants = {
  wilayas: [{ value: "31 - Oran", label: "31 - Oran" }],
  secteurs: [{ value: "IT", label: "Informatique" }],
  contrats: [{ value: "CDI", label: "CDI" }],
  experiences: [{ value: "DEBUTANT", label: "Débutant" }],
  diplomes: [{ value: "MASTER", label: "Master" }],
};

describe("💼 UI & Logique - Composant <CreateJob />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // 💡 UTILITAIRE : Trouve le conteneur React-Select via son input caché 'name'
  const getSelectWrapper = (container, name) => {
    return container
      .querySelector(`input[name="${name}"]`)
      .closest(".css-b62m3t-container");
  };

  it("🟢 HP1 : Chargement des constantes réussi", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    render(
      <MemoryRouter>
        <CreateJob />
      </MemoryRouter>,
    );
    await waitFor(() => expect(jobsService.getConstants).toHaveBeenCalled());
  });

  it("🟢 HP2 : Cascade Wilaya -> Commune fonctionnelle", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    const { container } = render(
      <MemoryRouter>
        <CreateJob />
      </MemoryRouter>,
    );

    // On cible précisément le select 'wilaya'
    const wilayaSelect = getSelectWrapper(container, "wilaya");
    await selectEvent.select(wilayaSelect, "31 - Oran");

    // On vérifie que le select 'commune' a changé son placeholder (il n'est plus à 'Wilaya d'abord')
    await waitFor(() => {
      expect(screen.queryByText("Wilaya d'abord")).not.toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Publication réussie", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.creerOffre.mockResolvedValue({});
    const { container } = render(
      <MemoryRouter>
        <CreateJob />
      </MemoryRouter>,
    );

    await waitFor(() => expect(jobsService.getConstants).toHaveBeenCalled());

    // Remplissage des champs (Titre + Wilaya + Spécialité requis par ton code)
    fireEvent.change(screen.getByPlaceholderText(/Ex: Ingénieur Fullstack/i), {
      target: { value: "Développeur", name: "titre" },
    });

    await selectEvent.select(
      getSelectWrapper(container, "wilaya"),
      "31 - Oran",
    );
    await selectEvent.select(
      getSelectWrapper(container, "specialite"),
      "Informatique",
    );

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(jobsService.creerOffre).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining("publiée avec succès"),
        expect.anything(),
      );
    });
  });

  it("🔴 EC1 : Échec chargement constantes", async () => {
    jobsService.getConstants.mockRejectedValue(new Error("500"));
    render(
      <MemoryRouter>
        <CreateJob />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_CONSTANTES_JOB",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 : Validation bloquante (Champs manquants)", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    const { container } = render(
      <MemoryRouter>
        <CreateJob />
      </MemoryRouter>,
    );

    // On clique sans rien remplir
    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Veuillez sélectionner au moins une Wilaya et une Spécialité.",
      );
      expect(jobsService.creerOffre).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Crash publication (500)", async () => {
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.creerOffre.mockRejectedValue(new Error("500"));
    const { container } = render(
      <MemoryRouter>
        <CreateJob />
      </MemoryRouter>,
    );

    // Remplissage pour passer le check local if(!formData.wilaya...)
    await selectEvent.select(
      getSelectWrapper(container, "wilaya"),
      "31 - Oran",
    );
    await selectEvent.select(
      getSelectWrapper(container, "specialite"),
      "Informatique",
    );

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_PUBLICATION_OFFRE",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Erreur lors de la publication"),
        expect.anything(),
      );
    });
  });
});
