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
import ProfilCandidat from "../src/Pages/ProfilCandidat";
import { profilService } from "../src/Services/profilService";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import selectEvent from "react-select-event";
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

describe("👤 UI & Logique - Composant <ProfilCandidat />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS (HP) ---

  it("🟢 HP1 (Initialisation) : Chargement et pré-remplissage", async () => {
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue(mockConstants);

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
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText(/Meriem Belamri/i);

    const btnsModifier = screen.getAllByText(/Modifier/i);
    fireEvent.click(btnsModifier[1]);

    const wilayaSelect = screen.getByText("31 - Oran");
    await selectEvent.select(wilayaSelect, "16 - Alger");

    // ✅ Correction : Une fois la wilaya choisie, le placeholder devient "Sélectionnez..."
    // car (editInfo.wilaya ? "Sélectionnez..." : "Wilaya d'abord")
    expect(screen.getByText(/Sélectionnez.../i)).toBeInTheDocument();
  });

  it("🟢 HP3 (Gestion Expériences) : Ajout d'une expérience", async () => {
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    profilService.addExperience.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText(/Mon Profil Professionnel/i);

    const btnsAjouter = screen.getAllByText(/\+ Ajouter/i);
    fireEvent.click(btnsAjouter[0]);

    fireEvent.change(screen.getByPlaceholderText(/Titre du poste/i), {
      target: { value: "Ingénieur" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Nom de l'entreprise/i), {
      target: { value: "SOMIZ" },
    });

    const dateInput = screen
      .getByText(/Date de début/i)
      .parentElement.querySelector("input");
    fireEvent.change(dateInput, { target: { value: "2026-01-01" } });

    fireEvent.click(screen.getByText("SAUVEGARDER"));

    await waitFor(() => {
      expect(profilService.addExperience).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Expérience ajoutée");
    });
  });

  it("🟢 HP4 (Tags Dynamiques) : Gestion des compétences", async () => {
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    profilService.updateProfil.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText("React");

    const inputSkills = screen.getByPlaceholderText(/Tapez une compétence/i);
    fireEvent.change(inputSkills, { target: { value: "Docker" } });
    fireEvent.keyDown(inputSkills, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(profilService.updateProfil).toHaveBeenCalled();
      const sentFormData = profilService.updateProfil.mock.calls[0][0];
      expect(sentFormData.get("competences")).toContain("Docker");
    });
  });

  // --- 🔴 EDGE CASES (EC) ---

  it("🔴 EC1 (Échec Téléchargement) : Gestion erreur API et Télémétrie", async () => {
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    profilService.updateProfil.mockRejectedValue(new Error("Upload failed"));

    const { container } = render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText(/Meriem Belamri/i);

    // ✅ Correction : Ciblage de l'input photo par son attribut accept
    const file = new File(["dummy"], "photo.png", { type: "image/png" });
    const inputPhoto = container.querySelector('input[accept="image/*"]');

    fireEvent.change(inputPhoto, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors du téléchargement de la photo.",
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_UPDATE_PHOTO",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 (Données Manquantes) : Blocage validation required", async () => {
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <ProfilCandidat />
      </MemoryRouter>,
    );
    await screen.findByText(/Mon Profil Professionnel/i);

    const btnsAjouter = screen.getAllByText(/\+ Ajouter/i);
    fireEvent.click(btnsAjouter[0]);

    fireEvent.click(screen.getByText("SAUVEGARDER"));
    expect(profilService.addExperience).not.toHaveBeenCalled();
  });
});
