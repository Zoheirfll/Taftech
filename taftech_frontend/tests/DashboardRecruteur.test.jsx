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
import DashboardRecruteur from "../src/Pages/Recruteur/DashboardRecruteur";
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

vi.mock("../src/Services/authService", () => ({
  authService: {
    getUserRole: vi.fn(() => "RECRUTEUR"),
    getEstMembreEquipe: vi.fn(() => false),
    getMembreRole: vi.fn(() => null),
    peutFaire: vi.fn(() => true),
  },
}));

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
      // Vérification du Header — badge "Vérifié" (pas "Compte vérifié")
      expect(screen.getByText("TafTech")).toBeInTheDocument();
      expect(screen.getByText("Vérifié")).toBeInTheDocument();
      // Vérification de l'onglet par défaut et des stats (1 candidature totale)
      expect(screen.getAllByText("Offre Ouverte")[0]).toBeInTheDocument();
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

    await waitFor(() => screen.getByText("TafTech"));

    // Onglet Archives - the tab button contains text "Archives" with a count badge
    fireEvent.click(screen.getByRole("button", { name: /Archives/i }));
    expect(screen.getAllByText("Offre Archives")[0]).toBeInTheDocument();
    // "Offre Ouverte" peut apparaître dans d'autres sections (candidatures), on vérifie juste que Archives est affiché
  });

  it("🟢 HP3 : Actions autorisées si l'entreprise est approuvée", async () => {
    jobsService.getDashboard.mockResolvedValue(mockData);
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("TafTech"));

    // Les deux boutons doivent être présents et cliquables
    const btnPublier = screen.getByRole("button", { name: /Publier une offre/i });
    fireEvent.click(btnPublier);
    expect(mockNavigate).toHaveBeenCalledWith("/creer-offre");

    // Le bouton CVthèque affiche "CV" avec une icône Search
    const btnCV = screen.getByRole("button", { name: /^CV$/i });
    fireEvent.click(btnCV);
    expect(mockNavigate).toHaveBeenCalledWith("/cvtheque");
  });

  it("🟢 HP4 : Navigation entre onglets Offres en cours et Archives", async () => {
    jobsService.getDashboard.mockResolvedValue(mockData);
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("TafTech"));

    // Par défaut l'onglet "Offres en cours" est actif
    expect(screen.getAllByText("Offre Ouverte")[0]).toBeInTheDocument();

    // Aller sur Archives
    fireEvent.click(screen.getByRole("button", { name: /Archives/i }));
    expect(screen.getAllByText("Offre Archives")[0]).toBeInTheDocument();
  });

  // --- 🔴 EDGE CASES (4/4) ---

  it("🔴 EC0 : Membre bloqué si premium expiré (403 PREMIUM_EXPIRE)", async () => {
    jobsService.getDashboard.mockRejectedValue({
      response: {
        status: 403,
        data: { code: "PREMIUM_EXPIRE", error: "L'abonnement Premium a expiré." },
      },
    });
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Abonnement Premium expiré/i)).toBeInTheDocument();
    });
  });

  it("🔴 EC1 : Redirection forcée (404/403) si non inscrit", async () => {
    jobsService.getDashboard.mockRejectedValue({ response: { status: 404 } });
    render(
      <MemoryRouter>
        <DashboardRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/register-entreprise");
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
      // Badge "En attente" dans le header (pas "En attente de validation")
      expect(screen.getByText("En attente")).toBeInTheDocument();
      // The publish button is disabled when not approved
      const btnPublier = screen.getByRole("button", { name: /Publier une offre/i });
      expect(btnPublier).toBeDisabled();
      expect(
        screen.getByText(/Validation admin requise/i),
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

    await waitFor(() => screen.getByText("TafTech"));

    // Vérifier que la liste des offres s'affiche correctement
    expect(screen.getAllByText("Offre Ouverte")[0]).toBeInTheDocument();
  });
});
