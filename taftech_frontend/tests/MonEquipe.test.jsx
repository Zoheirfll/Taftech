// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MonEquipe from "../src/Pages/Recruteur/MonEquipe";
import { jobsService } from "../src/Services/jobsService";
import toast from "react-hot-toast";

// --- MOCKS ---
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getEquipe: vi.fn(),
    inviterMembre: vi.fn(),
    changerRoleMembre: vi.fn(),
    retirerMembre: vi.fn(),
    annulerInvitation: vi.fn(),
    getEquipeAuditLog: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "tid"),
  },
}));

vi.mock("../src/utils/errorReporter", () => ({ reportError: vi.fn() }));

// Données mock
const mockDataProprietaire = {
  mon_role: "PROPRIETAIRE",
  membres: [
    {
      id: null,
      user_id: 1,
      email: "owner@corp.dz",
      first_name: "Ali",
      last_name: "Owner",
      role: "PROPRIETAIRE",
      date_ajout: "01/01/2026",
      est_moi: true,
    },
    {
      id: 5,
      user_id: 2,
      email: "admin@corp.dz",
      first_name: "Sara",
      last_name: "Admin",
      role: "ADMIN",
      date_ajout: "10/03/2026",
      est_moi: false,
    },
  ],
  invitations: [],
};

const mockDataAdmin = {
  mon_role: "ADMIN",
  membres: [...mockDataProprietaire.membres],
  invitations: [],
};

const mockDataUtilisateur = {
  mon_role: "UTILISATEUR",
  membres: [...mockDataProprietaire.membres],
  invitations: [],
};

const mockAuditLogs = [
  {
    id: 1,
    action: "CONNEXION",
    action_display: "Connexion",
    detail: "portail recruteur",
    date: "10/06/2026 à 09:00",
    membre_email: "admin@corp.dz",
    membre_nom: "Sara Admin",
  },
  {
    id: 2,
    action: "CREER_OFFRE",
    action_display: "Créer offre",
    detail: "Dev Python",
    date: "11/06/2026 à 11:00",
    membre_email: "owner@corp.dz",
    membre_nom: "Ali Owner",
  },
];

const renderEquipe = () =>
  render(
    <MemoryRouter>
      <MonEquipe />
    </MemoryRouter>
  );

describe("👥 UI & Logique - Composant <MonEquipe />", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Affiche la liste des membres après chargement", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataProprietaire);
    renderEquipe();

    await waitFor(() => {
      expect(screen.getByText("owner@corp.dz")).toBeInTheDocument();
      expect(screen.getByText("admin@corp.dz")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Bouton 'Inviter un membre' visible pour PROPRIETAIRE", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataProprietaire);
    renderEquipe();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Inviter/i })).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Bouton 'Inviter' absent pour UTILISATEUR", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataUtilisateur);
    renderEquipe();

    await waitFor(() => screen.getByText("owner@corp.dz"));
    expect(screen.queryByRole("button", { name: /Inviter/i })).toBeNull();
  });

  it("🟢 HP4 : Journal d'activité visible pour PROPRIETAIRE", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataProprietaire);
    renderEquipe();

    await waitFor(() => {
      expect(screen.getByText(/Journal d'activité/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP5 : Journal d'activité visible pour ADMIN", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataAdmin);
    renderEquipe();

    await waitFor(() => {
      expect(screen.getByText(/Journal d'activité/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP6 : Journal d'activité absent pour UTILISATEUR", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataUtilisateur);
    renderEquipe();

    await waitFor(() => screen.getByText("owner@corp.dz"));
    expect(screen.queryByText(/Journal d'activité/i)).toBeNull();
  });

  it("🟢 HP7 : Clic sur journal charge les logs (lazy-load)", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataProprietaire);
    jobsService.getEquipeAuditLog.mockResolvedValue(mockAuditLogs);
    renderEquipe();

    await waitFor(() => screen.getByText(/Journal d'activité/i));
    fireEvent.click(screen.getByText(/Journal d'activité/i));

    await waitFor(() => {
      expect(jobsService.getEquipeAuditLog).toHaveBeenCalledTimes(1);
      expect(screen.getByText("admin@corp.dz")).toBeInTheDocument();
    });
  });

  it("🟢 HP8 : Deuxième clic sur journal ne recharge pas (cache)", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataProprietaire);
    jobsService.getEquipeAuditLog.mockResolvedValue(mockAuditLogs);
    renderEquipe();

    await waitFor(() => screen.getByText(/Journal d'activité/i));
    // Premier clic — charge les logs
    fireEvent.click(screen.getByText(/Journal d'activité/i));
    await waitFor(() => expect(jobsService.getEquipeAuditLog).toHaveBeenCalledTimes(1));

    // Deuxième clic — toggle sans recharger
    fireEvent.click(screen.getByText(/Journal d'activité/i));
    expect(jobsService.getEquipeAuditLog).toHaveBeenCalledTimes(1);
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur de chargement équipe — toast d'erreur", async () => {
    jobsService.getEquipe.mockRejectedValue(new Error("Network"));
    renderEquipe();

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Erreur de chargement.");
    });
  });

  it("🔴 EC2 : Erreur de chargement journal — toast d'erreur", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataProprietaire);
    jobsService.getEquipeAuditLog.mockRejectedValue(new Error("Audit fail"));
    renderEquipe();

    await waitFor(() => screen.getByText(/Journal d'activité/i));
    fireEvent.click(screen.getByText(/Journal d'activité/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Impossible de charger le journal.");
    });
  });

  it("🔴 EC3 : Modal invitation — email vide → toast d'erreur", async () => {
    jobsService.getEquipe.mockResolvedValue(mockDataProprietaire);
    renderEquipe();

    await waitFor(() => screen.getByRole("button", { name: /Inviter/i }));
    fireEvent.click(screen.getByRole("button", { name: /Inviter/i }));

    // Soumettre sans email
    await waitFor(() => screen.getByRole("button", { name: /Envoyer l'invitation/i }));
    fireEvent.click(screen.getByRole("button", { name: /Envoyer l'invitation/i }));

    expect(toast.error).toHaveBeenCalledWith("Email obligatoire.");
  });
});
