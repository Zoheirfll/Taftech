// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EntreprisePublic from "../src/Pages/EntreprisePublic";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS ---
// Mock de useParams pour simuler un ID d'entreprise (ex: ID "123")
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "123" }),
  };
});

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getEntreprisePublic: vi.fn(),
  },
}));

const mockEntrepriseBase = {
  id: 123,
  nom_entreprise: "TafTech Solutions",
  secteur_activite: "Informatique",
  wilaya_siege: "31 - Oran",
  commune_siege: "Oran",
  description: "Agence de développement web.",
  logo_url: "https://example.com/logo.png",
  offres_actives: [],
};

describe("🏢 UI & Logique - Composant <EntreprisePublic />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Affichage des informations de base de l'entreprise", async () => {
    jobsService.getEntreprisePublic.mockResolvedValue(mockEntrepriseBase);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(jobsService.getEntreprisePublic).toHaveBeenCalledWith("123");
      expect(screen.getByText("TafTech Solutions")).toBeInTheDocument();
      expect(
        screen.getByText("Agence de développement web."),
      ).toBeInTheDocument();
      expect(screen.getByText(/Informatique/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Gestion de l'affichage du logo et de la localisation", async () => {
    jobsService.getEntreprisePublic.mockResolvedValue(mockEntrepriseBase);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Vérification Image
      const logo = screen.getByAltText("Logo TafTech Solutions");
      expect(logo).toHaveAttribute("src", "https://example.com/logo.png");

      // Vérification Localisation (Wilaya + Commune)
      expect(screen.getByText("📍 31 - Oran - Oran")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Affichage de la liste des offres actives", async () => {
    const entrepriseWithOffers = {
      ...mockEntrepriseBase,
      offres_actives: [
        {
          id: 1,
          titre: "Développeur Front-End",
          wilaya: "Alger",
          commune: "Bab Ezzouar",
          type_contrat: "CDI",
        },
      ],
    };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseWithOffers);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Vérification du badge compteur (1 offre)
      expect(screen.getByText("1")).toBeInTheDocument();

      // Détails de l'offre
      expect(screen.getByText("Développeur Front-End")).toBeInTheDocument();
      expect(screen.getByText("📍 Alger - Bab Ezzouar")).toBeInTheDocument();
      expect(screen.getByText("📄 CDI")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Voir l'offre/i }),
      ).toHaveAttribute("href", "/jobs/1");
    });
  });

  it("🟢 HP4 : Affichage du Empty State si aucune offre", async () => {
    jobsService.getEntreprisePublic.mockResolvedValue(mockEntrepriseBase);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("0")).toBeInTheDocument(); // Badge compteur à zéro
      expect(screen.getByText("Aucune offre ouverte")).toBeInTheDocument();
      expect(
        screen.getByText("L'entreprise ne recrute pas en ce moment."),
      ).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES (2/2) ---

  it("🔴 EC1 : Erreur API au chargement (404/500) déclenche Télémétrie", async () => {
    jobsService.getEntreprisePublic.mockRejectedValue(new Error("Not Found"));
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // Affichage du message d'erreur
      expect(
        screen.getByText(
          "😕 Cette entreprise n'existe pas ou n'est plus disponible.",
        ),
      ).toBeInTheDocument();

      // Bouton de secours vers la liste globale
      expect(
        screen.getByRole("link", { name: /Voir toutes les offres d'emploi/i }),
      ).toHaveAttribute("href", "/offres");

      // Télémétrie appelée
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_ENTREPRISE_PUBLIC",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 : Fallback affichage Logo Manquant", async () => {
    const noLogoEntreprise = { ...mockEntrepriseBase, logo_url: null };
    jobsService.getEntreprisePublic.mockResolvedValue(noLogoEntreprise);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // L'émoji bâtiment doit s'afficher à la place de l'image
      expect(screen.getByText("🏢")).toBeInTheDocument();
      expect(screen.queryByAltText(/Logo/i)).not.toBeInTheDocument();
    });
  });
});
