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
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GestionOffre from "../src/Pages/Recruteur/GestionOffre/index";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// --- MOCKS ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ id: "1" }),
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
    getConstants: vi.fn().mockResolvedValue({ wilayas: [], secteurs: [], diplomes: [] }),
    updateStatutCandidature: vi.fn(),
    deleteCandidature: vi.fn(),
    cloturerOffre: vi.fn(),
    evaluerCandidature: vi.fn(),
    telechargerBulletin: vi.fn(),
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

window.URL.createObjectURL = vi.fn(() => "blob:fake-url");
window.URL.revokeObjectURL = vi.fn();

const mockDashboardData = {
  offres: [
    {
      id: 1,
      titre: "Ingénieur React",
      date_publication: "2026-05-01",
      est_cloturee: false,
      type_contrat: "CDI",
      wilaya: "Oran",
      candidatures: [
        {
          id: 100,
          statut: "RECUE",
          score_matching: 95,
          candidat: {
            first_name: "Meriem",
            last_name: "Belamri",
            email: "meriem@test.dz",
            titre_professionnel: "Dev",
          },
        },
        {
          id: 101,
          statut: "REFUSE",
          score_matching: 30,
          candidat: {
            first_name: "John",
            last_name: "Doe",
            email: "john@test.dz",
          },
        },
      ],
    },
  ],
};

describe("💼 UI & Logique - Composant <GestionOffre />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS (6/6) ---

  it("🟢 HP1 : Chargement de l'offre et affichage des candidats", async () => {
    jobsService.getDashboard.mockResolvedValue(mockDashboardData);
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Ingénieur React")).toBeInTheDocument();
      expect(screen.getAllByText("Belamri Meriem")[0]).toBeInTheDocument();
      expect(screen.getByText("Ouverte")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Changement de statut vers RETENU et apparition du PDF", async () => {
    jobsService.getDashboard.mockResolvedValue(mockDashboardData);
    jobsService.updateStatutCandidature.mockResolvedValue({});
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Belamri Meriem")[0]);

    // Le statut est maintenant un dropdown custom (plus de <select>)
    fireEvent.click(await screen.findByText("Candidature reçue")); // ouvre le menu
    fireEvent.click(await screen.findByText("Candidat retenu")); // sélectionne RETENU

    await waitFor(() => {
      expect(jobsService.updateStatutCandidature).toHaveBeenCalledWith(100, {
        statut: "RETENU",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Statut mis à jour.",
      );
      expect(screen.getByText(/Télécharger/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Programmer un entretien (Ouverture Modale + Soumission)", async () => {
    jobsService.getDashboard.mockResolvedValue(mockDashboardData);
    jobsService.updateStatutCandidature.mockResolvedValue({});
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Belamri Meriem")[0]);

    // Le statut est maintenant un dropdown custom (plus de <select>)
    fireEvent.click(await screen.findByText("Candidature reçue")); // ouvre le menu
    fireEvent.click(await screen.findByText("Entretien programmé")); // sélectionne ENTRETIEN

    await waitFor(() => screen.getByText("Programmer un entretien"));

    const dateInput = screen
      .getByText("Date *")
      .parentElement.querySelector("input");
    const heureInput = screen
      .getByText("Heure *")
      .parentElement.querySelector("input");
    fireEvent.change(dateInput, { target: { value: "2026-06-01" } });
    fireEvent.change(heureInput, { target: { value: "14:30" } });

    fireEvent.click(screen.getByRole("button", { name: /Envoyer l'invitation/i }));

    await waitFor(() => {
      expect(jobsService.updateStatutCandidature).toHaveBeenCalledWith(100, {
        statut: "ENTRETIEN",
        date_entretien: "2026-06-01T14:30",
        message_entretien: "",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Entretien programmé et email envoyé !",
      );
    });
  });

  it("🟢 HP4 : Évaluation d'un candidat", async () => {
    jobsService.getDashboard.mockResolvedValue(mockDashboardData);
    jobsService.evaluerCandidature.mockResolvedValue({
      candidature: {
        ...mockDashboardData.offres[0].candidatures[0],
        note_globale: 20,
      },
    });

    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Belamri Meriem")[0]);

    // Activer l'onglet Évaluation pour afficher le bouton
    await act(async () => {
      fireEvent.click(await screen.findByText("Évaluation"));
    });

    await act(async () => {
      fireEvent.click(await screen.findByText(/Évaluer ce candidat/i));
    });

    await waitFor(() => screen.getByText("Évaluation post-entretien"));

    // ✅ SOLUTION MIRACLE : On RE-QUÉRY le DOM après chaque clic pour éviter les nœuds détachés.
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        const boutonsCinq = screen.getAllByRole("button", { name: "5" });
        fireEvent.click(boutonsCinq[i]);
      });
    }

    const textarea = screen.getByPlaceholderText(/Points forts/i);
    await act(async () => {
      fireEvent.change(textarea, { target: { value: "Top candidat" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Sauvegarder/i }));
    });

    await waitFor(() => {
      expect(jobsService.evaluerCandidature).toHaveBeenCalledWith(100, {
        note_technique: 5,
        note_communication: 5,
        note_motivation: 5,
        note_experience: 5,
        commentaire_evaluation: "Top candidat",
      });
      expect(toast.success).toHaveBeenCalledWith("Évaluation sauvegardée !");
    });
  });

  it("🟢 HP5 : Téléchargement du Bulletin PDF", async () => {
    const mockRetenu = JSON.parse(JSON.stringify(mockDashboardData));
    mockRetenu.offres[0].candidatures[0].statut = "RETENU";

    jobsService.getDashboard.mockResolvedValue(mockRetenu);
    jobsService.telechargerBulletin.mockResolvedValue(
      new Blob(["PDF CONTENT"]),
    );
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Belamri Meriem")[0]);

    const btnDownload = await screen.findByText(/Télécharger/i);
    fireEvent.click(btnDownload);

    await waitFor(() => {
      expect(jobsService.telechargerBulletin).toHaveBeenCalledWith(100);
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Bulletin généré !",
      );
    });
  });

  it("🟢 HP6 : Clôture de l'offre", async () => {
    jobsService.getDashboard.mockResolvedValue(mockDashboardData);
    jobsService.cloturerOffre.mockResolvedValue({});
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Ingénieur React"));
    fireEvent.click(screen.getByText(/CLÔTURER L'OFFRE/i));

    await waitFor(() => {
      expect(jobsService.cloturerOffre).toHaveBeenCalledWith(1);
      expect(screen.getByText("Archivée")).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES (5/5) ---

  it("🔴 EC1 : Redirection si l'offre n'est pas dans le dashboard", async () => {
    jobsService.getDashboard.mockResolvedValue({ offres: [] });
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Offre introuvable.");
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("🔴 EC2 : Crash API lors du changement de statut (Télémétrie)", async () => {
    jobsService.getDashboard.mockResolvedValue(mockDashboardData);
    jobsService.updateStatutCandidature.mockRejectedValue(new Error("500"));
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Belamri Meriem")[0]);

    // Le statut est maintenant un dropdown custom (plus de <select>)
    fireEvent.click(await screen.findByText("Candidature reçue"));
    fireEvent.click(await screen.findByText("Candidat retenu"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la mise à jour.",
      );
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_MISE_A_JOUR_STATUT",
        expect.anything(),
      );
    });
  });

  it("🔴 EC3 : Validation Entretien bloquante (Champs manquants)", async () => {
    jobsService.getDashboard.mockResolvedValue(mockDashboardData);
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Belamri Meriem")[0]);

    // Le statut est maintenant un dropdown custom (plus de <select>)
    fireEvent.click(await screen.findByText("Candidature reçue"));
    fireEvent.click(await screen.findByText("Entretien programmé"));

    await waitFor(() => screen.getByText("Programmer un entretien"));

    fireEvent.click(screen.getByRole("button", { name: /Envoyer l'invitation/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Date et heure requises.",
      );
      expect(jobsService.updateStatutCandidature).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC4 : Validation Évaluation bloquante (Champs à 0)", async () => {
    jobsService.getDashboard.mockResolvedValue(mockDashboardData);
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByText("Belamri Meriem")[0]);

    // Activer l'onglet Évaluation pour afficher le bouton
    await act(async () => {
      fireEvent.click(await screen.findByText("Évaluation"));
    });

    await act(async () => {
      fireEvent.click(await screen.findByText(/Évaluer ce candidat/i));
    });

    await waitFor(() => screen.getByText("Évaluation post-entretien"));

    fireEvent.click(screen.getByRole("button", { name: /Sauvegarder/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Veuillez remplir toutes les notes.",
      );
      expect(jobsService.evaluerCandidature).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC5 : Annulation Suppression (Window.confirm = false)", async () => {
    window.confirm = vi.fn(() => false);
    jobsService.getDashboard.mockResolvedValue(mockDashboardData);
    render(
      <MemoryRouter>
        <GestionOffre />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Doe John"));

    // Ouvrir le détail de "Doe John" (statut REFUSE) pour afficher le bouton de suppression
    fireEvent.click(screen.getByText("Doe John"));
    await waitFor(() => {
      const btnCorbeille = screen.getAllByRole("button").find(
        btn => btn.className && btn.className.includes("bg-red-50")
      );
      expect(btnCorbeille).toBeTruthy();
      fireEvent.click(btnCorbeille);
    });

    expect(jobsService.deleteCandidature).not.toHaveBeenCalled();
  });
});
