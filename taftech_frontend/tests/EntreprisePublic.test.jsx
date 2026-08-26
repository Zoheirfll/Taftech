// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EntreprisePublic from "../src/Pages/Recruteur/EntreprisePublic";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

// --- MOCKS ---
// Mock de useParams pour simuler le slug de l'entreprise
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ slug: "123" }),
  };
});

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getEntreprisePublic: vi.fn(),
    getConstants: vi.fn(),
  },
}));

const mockEntrepriseBase = {
  id: 123,
  slug: "taftech-solutions",
  nom_entreprise: "TafTech Solutions",
  secteur_activite: "Informatique",
  wilaya_siege: "31 - Oran",
  commune_siege: "Oran",
  description: "Agence de développement web.",
  logo_url: "https://example.com/logo.png",
  offres_actives: [],
  nombre_offres_actives: 3,
  taille_entreprise: "ME",
};

describe("🏢 UI & Logique - Composant <EntreprisePublic />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getConstants = vi.fn().mockResolvedValue({ wilayas: [], secteurs: [], diplomes: [] });
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
      // The alt text is the company name directly
      const logo = screen.getByAltText("TafTech Solutions");
      expect(logo).toHaveAttribute("src", "https://example.com/logo.png");

      // Le composant splitte wilaya_siege sur " - " et affiche seulement la ville
      expect(screen.getByText(/Oran/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Affichage de la liste des offres actives (onglet Offres)", async () => {
    const entrepriseWithOffers = {
      ...mockEntrepriseBase,
      offres_actives: [
        {
          id: 1,
          code_public: "x1y2z3",
          secteur_libelle: "Informatique",
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

    await waitFor(() => screen.getByText("TafTech Solutions"));
    fireEvent.click(screen.getByRole("button", { name: /^Offres/i }));

    await waitFor(() => {
      // Détails de l'offre
      expect(screen.getByText("Développeur Front-End")).toBeInTheDocument();
      // Location and contract shown with lucide icons (no emojis)
      expect(screen.getByText("Alger")).toBeInTheDocument();
      expect(screen.getByText("CDI")).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Voir l'offre/i }),
      ).toHaveAttribute("href", "/entreprises/taftech-solutions/offres-d-emploi/informatique/developpeur-front-end-x1y2z3");
    });
  });

  it("🟢 HP4 : Affichage du Empty State si aucune offre (onglet Offres)", async () => {
    jobsService.getEntreprisePublic.mockResolvedValue(mockEntrepriseBase);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("TafTech Solutions"));
    fireEvent.click(screen.getByRole("button", { name: /^Offres/i }));

    await waitFor(() => {
      expect(screen.getByText("Aucune offre ouverte")).toBeInTheDocument();
      expect(
        screen.getByText("L'entreprise ne recrute pas en ce moment."),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP2b : Affiche les 3 stats (offres/effectif/ancienneté) quand annee_creation est renseignée", async () => {
    const entrepriseAvecAnnee = { ...mockEntrepriseBase, annee_creation: 2019 };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseAvecAnnee);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument(); // offres actives
      expect(screen.getByText(/ans$/i)).toBeInTheDocument(); // ancienneté "N ans"
    });
  });

  it("🔴 EC3 : Stat ancienneté absente si annee_creation est null", async () => {
    jobsService.getEntreprisePublic.mockResolvedValue({ ...mockEntrepriseBase, annee_creation: null });
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("TafTech Solutions")).toBeInTheDocument();
    });
    expect(screen.queryByText(/ans$/i)).not.toBeInTheDocument();
  });

  it("🟢 HP5 : Onglet À propos actif par défaut, avec culture d'entreprise et photo à côté du texte", async () => {
    const entrepriseComplete = {
      ...mockEntrepriseBase,
      culture_entreprise: "Ambiance conviviale, esprit d'équipe.",
      photos: [{ id: 1, image: "https://example.com/photo1.jpg", legende: "Bureaux" }],
    };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseComplete);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Agence de développement web.")).toBeInTheDocument();
      expect(screen.getByText("Ambiance conviviale, esprit d'équipe.")).toBeInTheDocument();
      expect(screen.getByAltText("Bureaux")).toBeInTheDocument();
    });
    // La liste d'offres n'est pas visible tant que l'onglet Offres n'est pas cliqué
    expect(screen.queryByText("Aucune offre ouverte")).not.toBeInTheDocument();
  });

  it("🟢 HP6 : Onglet Photos affiche la galerie complète", async () => {
    const entrepriseAvecPhotos = {
      ...mockEntrepriseBase,
      photos: [
        { id: 1, image: "https://example.com/photo1.jpg", legende: "Bureaux" },
        { id: 2, image: "https://example.com/photo2.jpg", legende: "Équipe" },
      ],
    };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseAvecPhotos);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("TafTech Solutions"));
    fireEvent.click(screen.getByRole("button", { name: /^Photos/i }));

    await waitFor(() => {
      expect(screen.getByAltText("Équipe")).toBeInTheDocument();
    });
  });

  it("🟢 HP7 : Liens LinkedIn/Site web affichés en texte simple", async () => {
    const entrepriseAvecLiens = {
      ...mockEntrepriseBase,
      linkedin: "https://linkedin.com/company/taftech",
      site_web: "https://taftech.dz",
    };
    jobsService.getEntreprisePublic.mockResolvedValue(entrepriseAvecLiens);
    render(
      <MemoryRouter>
        <EntreprisePublic />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const linkedinLink = screen.getByRole("link", { name: /LinkedIn/i });
      expect(linkedinLink).toHaveAttribute("href", "https://linkedin.com/company/taftech");
      const siteLink = screen.getByRole("link", { name: /Site web/i });
      expect(siteLink).toHaveAttribute("href", "https://taftech.dz");
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
      // Affichage du message d'erreur (no emoji in component)
      expect(
        screen.getByText(
          "Cette entreprise n'existe pas ou n'est plus disponible.",
        ),
      ).toBeInTheDocument();

      // Bouton de secours vers la liste globale
      expect(
        screen.getByRole("link", { name: /Voir toutes les offres/i }),
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
      // A Building2 lucide icon is rendered instead of an image
      expect(screen.queryByAltText(/TafTech Solutions/i)).not.toBeInTheDocument();
      // Company name still shows
      expect(screen.getByText("TafTech Solutions")).toBeInTheDocument();
    });
  });
});
