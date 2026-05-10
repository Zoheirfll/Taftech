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
import DashboardRecruteur from "../src/Pages/DashboardRecruteur";
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
  };
});

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getDashboard: vi.fn(),
    getConstants: vi.fn(),
    updateProfilEntreprise: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockData = {
  entreprise: {
    nom_entreprise: "TafTech",
    est_approuvee: true,
    last_name: "Doe",
    first_name: "John",
    email: "john@test.dz",
    telephone: "0555",
    secteur_activite: "IT",
  },
  offres: [
    {
      id: 1,
      titre: "Offre Ouverte",
      est_cloturee: false,
      date_publication: "2026-05-01",
      candidatures: [{ statut: "RECUE", score_matching: 85 }],
    },
    {
      id: 2,
      titre: "Offre Archives",
      est_cloturee: true,
      date_publication: "2026-04-01",
      candidatures: [],
    },
  ],
};

describe("🏢 UI & Logique - Composant <DashboardRecruteur />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getConstants.mockResolvedValue({ wilayas: [], secteurs: [] });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // Utilitaire pour cibler les inputs via leurs labels parents
  const getFieldByLabel = (text) => {
    const label = screen.getByText(text);
    return (
      label.parentElement.querySelector("input") ||
      label.parentElement.querySelector("textarea")
    );
  };

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Chargement et calcul des statistiques", async () => {
    jobsService.getDashboard.mockResolvedValue(mockData);
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Vérification du Header
      expect(screen.getByText("Espace TafTech")).toBeInTheDocument();
      expect(screen.getByText("✓ COMPTE VÉRIFIÉ")).toBeInTheDocument();
      // Vérification de l'onglet par défaut et des stats (1 candidature totale)
      expect(screen.getByText("Offre Ouverte")).toBeInTheDocument();
      // La stat "Total Candidatures" est dans une carte, on vérifie que le "1" est affiché
      const allText1 = screen.getAllByText("1");
      expect(allText1.length).toBeGreaterThan(0);
    });
  });

  it("🟢 HP2 : Navigation fluide entre les onglets", async () => {
    jobsService.getDashboard.mockResolvedValue(mockData);
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Espace TafTech"));

    // Onglet Archives
    fireEvent.click(screen.getByText(/Archives \(1\)/i));
    expect(screen.getByText("Offre Archives")).toBeInTheDocument();
    expect(screen.queryByText("Offre Ouverte")).not.toBeInTheDocument();

    // Onglet Profil
    fireEvent.click(screen.getByText(/Profil Entreprise/i));
    expect(screen.getByText("Identité du Responsable")).toBeInTheDocument();
  });

  it("🟢 HP3 : Actions autorisées si l'entreprise est approuvée", async () => {
    jobsService.getDashboard.mockResolvedValue(mockData);
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Espace TafTech"));

    // Les deux boutons doivent être présents et cliquables
    const btnPublier = screen.getByText(/\+ PUBLIER UNE OFFRE/i);
    fireEvent.click(btnPublier);
    expect(mockNavigate).toHaveBeenCalledWith("/creer-offre");

    const btnCV = screen.getByText(/🔍 CHERCHER UN CV/i);
    fireEvent.click(btnCV);
    expect(mockNavigate).toHaveBeenCalledWith("/cvtheque");
  });

  it("🟢 HP4 : Édition et sauvegarde du profil", async () => {
    jobsService.getDashboard.mockResolvedValue(mockData);
    jobsService.updateProfilEntreprise.mockResolvedValue({});
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Espace TafTech"));

    // Aller sur le profil
    fireEvent.click(screen.getByText(/Profil Entreprise/i));

    // Activer l'édition
    fireEvent.click(screen.getByText("MODIFIER MON PROFIL"));

    // Modifier le champ Prénom
    const prenomInput = getFieldByLabel("Prénom");
    fireEvent.change(prenomInput, { target: { value: "Jack" } });

    // Sauvegarder
    fireEvent.click(screen.getByText("SAUVEGARDER"));

    await waitFor(() => {
      expect(jobsService.updateProfilEntreprise).toHaveBeenCalledWith(
        expect.objectContaining({ first_name: "Jack" }),
      );
      expect(toast.success).toHaveBeenCalledWith("Profil mis à jour !");
    });
  });

  // --- 🔴 EDGE CASES (4/4) ---

  it("🔴 EC1 : Redirection forcée (404/403) si non inscrit", async () => {
    jobsService.getDashboard.mockRejectedValue({ response: { status: 404 } });
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/creer-entreprise");
    });
  });

  it("🔴 EC2 : Crash serveur au chargement (Télémétrie)", async () => {
    jobsService.getDashboard.mockRejectedValue(new Error("500"));
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Impossible de charger les données du dashboard."),
      ).toBeInTheDocument();
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_DASHBOARD",
        expect.anything(),
      );
    });
  });

  it("🔴 EC3 : Blocage des actions si compte en attente", async () => {
    const pendingData = {
      ...mockData,
      entreprise: { ...mockData.entreprise, est_approuvee: false },
    };
    jobsService.getDashboard.mockResolvedValue(pendingData);
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText("⏳ EN ATTENTE DE VALIDATION"),
      ).toBeInTheDocument();
      // Le bouton normal n'est plus là, c'est la version bloquée
      expect(screen.getByText("🔒 PUBLIER UNE OFFRE")).toBeDisabled();
      expect(
        screen.getByText(/Validation admin requise pour recruter/i),
      ).toBeInTheDocument();
    });
  });

  it("🔴 EC4 : Échec lors de la sauvegarde du profil (Télémétrie)", async () => {
    jobsService.getDashboard.mockResolvedValue(mockData);
    jobsService.updateProfilEntreprise.mockRejectedValue(new Error("API Down"));
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Espace TafTech"));

    fireEvent.click(screen.getByText(/Profil Entreprise/i));
    fireEvent.click(screen.getByText("MODIFIER MON PROFIL"));
    fireEvent.click(screen.getByText("SAUVEGARDER"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de la sauvegarde.");
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_MISE_A_JOUR_PROFIL_ENTREPRISE",
        expect.anything(),
      );
    });
  });
});
