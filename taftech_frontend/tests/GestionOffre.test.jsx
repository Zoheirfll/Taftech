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
import GestionOffre from "../src/Pages/GestionOffre";
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

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getDashboard: vi.fn(),
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
      expect(screen.getByText("Belamri Meriem")).toBeInTheDocument();
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

    await waitFor(() => screen.getByText("Belamri Meriem"));

    const btnsVoir = screen.getAllByText("👁️ Voir");
    fireEvent.click(btnsVoir[0]);

    const decisionLabel = await screen.findByText("Décision Recrutement");
    const selectModal = decisionLabel.parentElement.querySelector("select");
    fireEvent.change(selectModal, { target: { value: "RETENU" } });

    await waitFor(() => {
      expect(jobsService.updateStatutCandidature).toHaveBeenCalledWith(100, {
        statut: "RETENU",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Statut mis à jour avec succès.",
      );
      expect(screen.getByText(/Télécharger le Bulletin/i)).toBeInTheDocument();
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

    await waitFor(() => screen.getByText("Belamri Meriem"));

    const btnsVoir = screen.getAllByText("👁️ Voir");
    fireEvent.click(btnsVoir[0]);

    const decisionLabel = await screen.findByText("Décision Recrutement");
    const selectModal = decisionLabel.parentElement.querySelector("select");
    fireEvent.change(selectModal, { target: { value: "ENTRETIEN" } });

    await waitFor(() => screen.getByText("Programmer un entretien"));

    const dateInput = screen
      .getByText("Date *")
      .parentElement.querySelector("input");
    const heureInput = screen
      .getByText("Heure *")
      .parentElement.querySelector("input");
    fireEvent.change(dateInput, { target: { value: "2026-06-01" } });
    fireEvent.change(heureInput, { target: { value: "14:30" } });

    fireEvent.click(screen.getByRole("button", { name: /Inviter/i }));

    await waitFor(() => {
      expect(jobsService.updateStatutCandidature).toHaveBeenCalledWith(100, {
        statut: "ENTRETIEN",
        date_entretien: "2026-06-01T14:30",
        message_entretien: "",
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Entretien programmé et e-mail envoyé !",
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

    await waitFor(() => screen.getByText("Belamri Meriem"));

    const btnsVoir = screen.getAllByText("👁️ Voir");
    fireEvent.click(btnsVoir[0]);

    const btnEval = await screen.findByText("⭐ Évaluer le candidat");
    fireEvent.click(btnEval);

    await waitFor(() => screen.getByText("Évaluation Globale"));

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

    await waitFor(() => screen.getByText("Belamri Meriem"));
    const btnsVoir = screen.getAllByText("👁️ Voir");
    fireEvent.click(btnsVoir[0]);

    const btnDownload = await screen.findByText(/Télécharger le Bulletin/i);
    fireEvent.click(btnDownload);

    await waitFor(() => {
      expect(jobsService.telechargerBulletin).toHaveBeenCalledWith(100);
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Bulletin généré avec succès !",
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

    await waitFor(() => screen.getByText("Belamri Meriem"));
    const btnsVoir = screen.getAllByText("👁️ Voir");
    fireEvent.click(btnsVoir[0]);

    const decisionLabel = await screen.findByText("Décision Recrutement");
    const selectModal = decisionLabel.parentElement.querySelector("select");
    fireEvent.change(selectModal, { target: { value: "RETENU" } });

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

    await waitFor(() => screen.getByText("Belamri Meriem"));
    const btnsVoir = screen.getAllByText("👁️ Voir");
    fireEvent.click(btnsVoir[0]);

    const decisionLabel = await screen.findByText("Décision Recrutement");
    const selectModal = decisionLabel.parentElement.querySelector("select");
    fireEvent.change(selectModal, { target: { value: "ENTRETIEN" } });

    await waitFor(() => screen.getByText("Programmer un entretien"));

    fireEvent.click(screen.getByRole("button", { name: /Inviter/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Veuillez sélectionner une date et une heure.",
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

    await waitFor(() => screen.getByText("Belamri Meriem"));
    const btnsVoir = screen.getAllByText("👁️ Voir");
    fireEvent.click(btnsVoir[0]);

    const btnEval = await screen.findByText("⭐ Évaluer le candidat");
    fireEvent.click(btnEval);

    await waitFor(() => screen.getByText("Évaluation Globale"));

    fireEvent.click(screen.getByRole("button", { name: /Sauvegarder/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Veuillez remplir toutes les notes sur 5.",
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

    const btnCorbeille = screen.getByTitle("Supprimer définitivement");
    fireEvent.click(btnCorbeille);

    expect(jobsService.deleteCandidature).not.toHaveBeenCalled();
  });
});
