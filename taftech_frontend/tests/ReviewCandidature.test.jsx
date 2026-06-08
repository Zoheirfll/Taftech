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
import ReviewCandidature from "../src/Pages/Recruteur/ReviewCandidature";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// --- MOCKS ---
const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "123" }),
  };
});

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getJobById: vi.fn(),
    getProfilCandidat: vi.fn(),
    postuler: vi.fn(),
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

const mockJob = {
  id: "123",
  titre: "Développeur Full Stack",
  entreprise: { nom_entreprise: "TechCorp" },
};

const mockProfil = {
  first_name: "Meriem",
  last_name: "Belamri",
  email: "meriem@test.dz",
  telephone: "0555000000",
  titre_professionnel: "Ingénieur IT",
  wilaya: "31 - Oran",
  commune: "Bir El Djir",
  diplome: "master_2",
  specialite: "informatique_decisionnelle",
  service_militaire: "DEGAGE",
  permis_conduire: true,
  passeport_valide: false,
  secteur_souhaite: "IT",
  salaire_souhaite: "150000",
  mobilite: "NATIONALE",
  situation_actuelle: "EN_RECHERCHE",
  cv_pdf: "/media/cv_meriem.pdf",
  competences: "React, Node.js",
  langues: "Français, Anglais",
  experiences_detail: [
    {
      id: 1,
      titre_poste: "Stagiaire",
      entreprise: "Taziri",
      date_debut: "2026-01-01",
      date_fin: "2026-01-10",
    },
  ],
  formations_detail: [
    { id: 1, diplome: "Master 2 ADSI", etablissement: "Université Oran 1" },
  ],
};

describe("📋 UI & Logique - Composant <ReviewCandidature />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Affichage Initial - Job & Profil correctement chargés", async () => {
    jobsService.getJobById.mockResolvedValue(mockJob);
    jobsService.getProfilCandidat.mockResolvedValue(mockProfil);

    render(
      <MemoryRouter>
        <ReviewCandidature />
      </MemoryRouter>,
    );

    // Vérification des données après rendu du chargement asynchrone
    await waitFor(() => {
      expect(screen.getByText("Développeur Full Stack")).toBeInTheDocument();
      expect(screen.getByText(/TechCorp/i)).toBeInTheDocument();
      expect(screen.getByText(/Meriem Belamri/i)).toBeInTheDocument();
      expect(screen.getByText("Ingénieur IT")).toBeInTheDocument();
      expect(screen.getByText(/31 - Oran/i)).toBeInTheDocument();
      expect(screen.getByText(/cv_meriem.pdf/i)).toBeInTheDocument();
      expect(screen.getByText("React")).toBeInTheDocument();
      expect(screen.getByText("Node.js")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Bascule Mode Motivation (Texte <-> Fichier)", async () => {
    jobsService.getJobById.mockResolvedValue(mockJob);
    jobsService.getProfilCandidat.mockResolvedValue(mockProfil);

    render(
      <MemoryRouter>
        <ReviewCandidature />
      </MemoryRouter>,
    );
    await waitFor(() => screen.getByText(/Lettre de motivation/i));

    // Mode Texte par défaut
    expect(
      screen.getByPlaceholderText(/Rédigez votre lettre de motivation/i),
    ).toBeInTheDocument();

    // Bascule en mode Fichier via l'onglet idoine
    fireEvent.click(screen.getByRole("button", { name: "Fichier" }));

    // Le textarea disparaît, l'input file apparaît
    expect(
      screen.queryByPlaceholderText(/Rédigez votre lettre de motivation/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Cliquez ou glissez votre fichier/i),
    ).toBeInTheDocument();

    // Simulation de l'upload d'un document
    const file = new File(["dummy content"], "lettre.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Vérifie l'affichage dynamique du fichier prêt
    expect(await screen.findByText("lettre.pdf")).toBeInTheDocument();
    expect(screen.getByText(/Fichier prêt/i)).toBeInTheDocument();
  });

  it("🟢 HP3 : Soumission d'une candidature avec texte", async () => {
    jobsService.getJobById.mockResolvedValue(mockJob);
    jobsService.getProfilCandidat.mockResolvedValue(mockProfil);
    jobsService.postuler.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ReviewCandidature />
      </MemoryRouter>,
    );
    await waitFor(() =>
      screen.getByRole("button", { name: /Confirmer & postuler/i }),
    );

    const textarea = screen.getByPlaceholderText(
      /Rédigez votre lettre de motivation/i,
    );
    fireEvent.change(textarea, { target: { value: "Je suis très motivée." } });

    fireEvent.click(
      screen.getByRole("button", { name: /Confirmer & postuler/i }),
    );

    await waitFor(() => {
      expect(jobsService.postuler).toHaveBeenCalledWith(
        "123",
        expect.any(FormData),
      );

      const formDataSent = vi.mocked(jobsService.postuler).mock.calls[0][1];
      expect(formDataSent.get("lettre_motivation")).toBe(
        "Je suis très motivée.",
      );

      expect(toast.success).toHaveBeenCalledWith("Candidature envoyée !");
      expect(mockNavigate).toHaveBeenCalledWith("/mes-candidatures");
    });
  });

  it("🟢 HP4 : Soumission avec Lettre de motivation (Mode Fichier)", async () => {
    jobsService.getJobById.mockResolvedValue(mockJob);
    jobsService.getProfilCandidat.mockResolvedValue(mockProfil);
    jobsService.postuler.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ReviewCandidature />
      </MemoryRouter>,
    );
    await waitFor(() =>
      screen.getByRole("button", { name: /Confirmer & postuler/i }),
    );

    // Bascule en mode fichier
    fireEvent.click(screen.getByRole("button", { name: "Fichier" }));

    const file = new File(["dummy content"], "lm.pdf", {
      type: "application/pdf",
    });
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText("lm.pdf")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Confirmer & postuler/i }),
    );

    await waitFor(() => {
      const sentFormData = vi.mocked(jobsService.postuler).mock.calls[0][1];
      expect(sentFormData.get("lettre_motivation_file")).toBe(file);
      expect(toast.success).toHaveBeenCalledWith("Candidature envoyée !");
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Gestion de l'erreur au chargement initial (Télémétrie)", async () => {
    jobsService.getJobById.mockRejectedValue(new Error("API Fail"));
    jobsService.getProfilCandidat.mockResolvedValue(mockProfil);

    render(
      <MemoryRouter>
        <ReviewCandidature />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur de chargement du profil.",
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_REVIEW_CANDIDATURE",
        expect.anything(),
      );
      expect(screen.getByText("Erreur de chargement.")).toBeInTheDocument();
    });
  });

  it("🔴 EC2 : Gestion de l'erreur lors de la soumission (Doublon)", async () => {
    jobsService.getJobById.mockResolvedValue(mockJob);
    jobsService.getProfilCandidat.mockResolvedValue(mockProfil);
    jobsService.postuler.mockRejectedValue({
      response: { data: { message: "Vous avez déjà postulé à cette offre." } },
    });

    render(
      <MemoryRouter>
        <ReviewCandidature />
      </MemoryRouter>,
    );
    await waitFor(() =>
      screen.getByRole("button", { name: /Confirmer & postuler/i }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Confirmer & postuler/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Vous avez déjà postulé à cette offre.",
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_SOUMISSION_CANDIDATURE",
        expect.anything(),
      );
    });
  });

  it("🔴 EC3 : Résilience d'affichage avec un profil vide (No Exp / No Form)", async () => {
    jobsService.getJobById.mockResolvedValue(mockJob);
    jobsService.getProfilCandidat.mockResolvedValue({
      first_name: "John",
      last_name: "Doe",
      email: "john@test.dz",
      experiences_detail: [],
      formations_detail: null,
    });

    render(
      <MemoryRouter>
        <ReviewCandidature />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Aucun titre")).toBeInTheDocument();
      // On s'assure que le composant rend "Non renseigné" pour les tags manquants
      const missingElements = screen.getAllByText(/Non renseigné/i);
      expect(missingElements.length).toBeGreaterThan(0);

      // Vérification de la non-existence des conteneurs d'expérience/formation vides
      expect(screen.queryByText("Expériences")).not.toBeInTheDocument();
      expect(screen.queryByText("Formations")).not.toBeInTheDocument();
    });
  });
});
