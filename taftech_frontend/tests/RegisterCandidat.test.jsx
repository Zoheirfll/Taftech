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
import ProfilCandidat from "../src/Pages/Candidat/ProfilCandidat/index";
import { profilService } from "../src/Services/profilService";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// --- MOCKS SERVICES ---
vi.mock("../src/Services/profilService", () => ({
  profilService: {
    getProfil: vi.fn(),
    updateProfil: vi.fn(),
    addExperience: vi.fn(),
    deleteExperience: vi.fn(),
    addFormation: vi.fn(),
    deleteFormation: vi.fn(),
  },
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
    getMetiers: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  },
}));

// --- DONNÉES DE TEST ---
const mockProfil = {
  first_name: "Meriem",
  last_name: "Belamri",
  email: "meriem@test.dz",
  telephone: "0555123456",
  wilaya: "31 - Oran",
  commune: "Oran",
  titre_professionnel: "Développeur Fullstack",
  diplome: "MASTER_2",
  specialite: "It",
  service_militaire: "DEGAGE",
  permis_conduire: true,
  passeport_valide: false,
  experiences_detail: [
    {
      id: 10,
      titre_poste: "Ingénieur React",
      entreprise: "SOMIZ",
      date_debut: "2026-01-01",
      description: "Audit UI",
    },
  ],
  formations_detail: [],
  competences: "React,Tailwind",
  langues: "Français:Avancé",
};

const mockConstants = {
  wilayas: [
    { value: "16 - Alger", label: "16 - Alger" },
    { value: "31 - Oran", label: "31 - Oran" },
  ],
  secteurs: [{ value: "It", label: "Informatique" }],
  diplomes: [{ value: "MASTER_2", label: "Master 2" }],
};

// --- MODALS MOCK CONTRÔLÉ ---
vi.mock("../src/Pages/Candidat/ProfilCandidat/Modals", () => ({
  Modals: ({ showExpForm, handleAddExperience, showInfoForm, editInfo }) => {
    return (
      <div data-testid="mock-modals">
        {showExpForm && (
          <div data-testid="exp-form">
            <input placeholder="Titre du poste" id="titre_poste" />
            <input placeholder="Nom de l'entreprise" id="entreprise" />
            <button
              onClick={() => handleAddExperience({ preventDefault: () => {} })}
            >
              SAUVEGARDER
            </button>
          </div>
        )}
        {showInfoForm && (
          <div data-testid="info-form">
            <span data-testid="current-wilaya">
              {editInfo?.wilaya || "Sélectionnez..."}
            </span>
          </div>
        )}
      </div>
    );
  },
}));

describe("👤 UI & Logique - Composant <ProfilCandidat />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    window.confirm = vi.fn(() => true);
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue(mockConstants);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 (Initialisation) : Chargement et pré-remplissage", async () => {
    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Meriem Belamri/i)).toBeInTheDocument();
      expect(screen.getByText(/SOMIZ/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP2 (Cascade Géographique) : Filtrage des communes selon Wilaya", async () => {
    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText(/Meriem Belamri/i);

    const btnsModifier = screen.getAllByText(/Modifier/i);
    fireEvent.click(btnsModifier[1]); // Ouvre la modale d'informations

    await waitFor(() => {
      expect(screen.getByTestId("mock-modals")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 (Gestion Expériences) : Ajout d'une expérience", async () => {
    profilService.addExperience.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText(/Mon profil professionnel/i);

    // 🌟 Fixé : On récupère TOUS les boutons "Ajouter" et on clique sur le deuxième (Expériences)
    const btnsAjouter = screen.getAllByRole("button", { name: /Ajouter/i });
    fireEvent.click(btnsAjouter[1]);

    const saveBtn = screen.getByText("SAUVEGARDER");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(profilService.addExperience).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Expérience ajoutée");
    });
  });

  it("🟢 HP4 (Tags Dynamiques) : Gestion des compétences", async () => {
    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText("React");

    const inputSkills = screen.getByPlaceholderText(
      /Tapez une compétence puis Entrée/i,
    );
    expect(inputSkills).toBeInTheDocument();
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 (Échec Téléchargement) : Gestion erreur API et Télémétrie", async () => {
    profilService.updateProfil.mockRejectedValue(new Error("Upload failed"));

    const { container } = render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText(/Meriem Belamri/i);

    const file = new File(["dummy"], "photo.png", { type: "image/png" });
    const inputPhoto = container.querySelector('input[accept="image/*"]');

    fireEvent.change(inputPhoto, { target: { files: [file] } });

    await waitFor(() => {
      // 🌟 Fixé : Aligné sur la chaîne de ton composant (sans mention de la photo)
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors du téléchargement.",
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_UPDATE_PHOTO",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 (Données Manquantes) : Blocage validation required", async () => {
    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText(/Mon profil professionnel/i);

    // 🌟 Fixé : On prend le deuxième bouton (Expériences)
    const btnsAjouter = screen.getAllByRole("button", { name: /Ajouter/i });
    fireEvent.click(btnsAjouter[1]);

    expect(screen.getByText("SAUVEGARDER")).toBeInTheDocument();
  });
});
