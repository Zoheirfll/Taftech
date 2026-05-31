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
import ParametresRecruteur from "../src/Pages/ParametresRecruteur";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getDashboard: vi.fn(),
    getConstants: vi.fn(),
    getParametresRecruteur: vi.fn(),
    updateProfilEntreprise: vi.fn(),
    updateParametresRecruteur: vi.fn(),
  },
}));

vi.mock("../src/Services/authService", () => ({
  authService: {
    getUserRole: vi.fn(() => "RECRUTEUR"),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("../src/data/communes.json", () => ({ default: [] }));

const mockDashboard = {
  entreprise: {
    id: 1,
    nom_entreprise: "TechCorp",
    registre_commerce: "RC123",
    secteur_activite: "IT",
    wilaya_siege: "31 - Oran",
    commune_siege: "Bir El Djir",
    taille_entreprise: "PME",
    description: "Une super entreprise",
    telephone: "0664540375",
    email: "recruteur@test.dz",
    first_name: "Zoheir",
    last_name: "Filali",
    est_approuvee: true,
    logo: null,
  },
};

const mockConstants = {
  wilayas: [{ value: "31 - Oran", label: "31 - Oran" }],
  secteurs: [{ value: "IT", label: "Informatique" }],
};

const mockNotifs = {
  email_refus_auto: false,
  message_refus_auto: "",
};

describe("⚙️ UI & Logique - Composant <ParametresRecruteur />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getDashboard.mockResolvedValue(mockDashboard);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.getParametresRecruteur.mockResolvedValue(mockNotifs);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Chargement et affichage des informations profil", async () => {
    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Zoheir")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Filali")).toBeInTheDocument();
      expect(screen.getByDisplayValue("recruteur@test.dz")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Sauvegarde profil réussie", async () => {
    jobsService.updateProfilEntreprise.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByDisplayValue("Zoheir"));

    const saveBtn = screen.getByRole("button", { name: /sauvegarder/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(jobsService.updateProfilEntreprise).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Profil mis à jour !");
    });
  });

  it("🟢 HP3 : Navigation vers onglet entreprise", async () => {
    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Mon entreprise/i));
    fireEvent.click(screen.getByText(/Mon entreprise/i));

    await waitFor(() => {
      expect(screen.getByText("TechCorp")).toBeInTheDocument();
      expect(screen.getByText("RC123")).toBeInTheDocument();
    });
  });

  it("🟢 HP4 : Navigation vers onglet notifications", async () => {
    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Notifications/i));
    fireEvent.click(screen.getByText(/Notifications/i));

    await waitFor(() => {
      expect(
        screen.getByText(/Email de refus automatique/i),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP5 : Toggle email refus auto", async () => {
    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Notifications/i));
    fireEvent.click(screen.getByText(/Notifications/i));

    await waitFor(() => screen.getByText(/Email de refus automatique/i));

    const toggleButtons = document.querySelectorAll("button.rounded-full");
    expect(toggleButtons.length).toBeGreaterThan(0);
    fireEvent.click(toggleButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Message de refus/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP6 : Sauvegarde notifications réussie", async () => {
    jobsService.updateParametresRecruteur.mockResolvedValue({});

    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Notifications/i));
    fireEvent.click(screen.getByText(/Notifications/i));

    await waitFor(() => screen.getByText(/Email de refus automatique/i));

    const saveBtn = screen.getByRole("button", { name: /sauvegarder/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(jobsService.updateParametresRecruteur).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Préférences de notification sauvegardées !",
      );
    });
  });

  it("🟢 HP7 : Statut entreprise approuvée affiché", async () => {
    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Mon entreprise/i));
    fireEvent.click(screen.getByText(/Mon entreprise/i));

    await waitFor(() => {
      expect(screen.getByText(/Compte vérifié/i)).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getDashboard.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_PARAMETRES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur de chargement.");
    });
  });

  it("🔴 EC2 : Erreur sauvegarde profil déclenche reportError", async () => {
    jobsService.updateProfilEntreprise.mockRejectedValue(
      new Error("Update failed"),
    );

    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByDisplayValue("Zoheir"));
    const saveBtn = screen.getByRole("button", { name: /sauvegarder/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_SAVE_PROFIL_PARAMETRES",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Erreur lors de la sauvegarde.");
    });
  });

  it("🔴 EC3 : Entreprise non approuvée affiche alerte", async () => {
    jobsService.getDashboard.mockResolvedValue({
      entreprise: { ...mockDashboard.entreprise, est_approuvee: false },
    });

    render(
      <MemoryRouter>
        <ParametresRecruteur />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Mon entreprise/i));
    fireEvent.click(screen.getByText(/Mon entreprise/i));

    await waitFor(() => {
      expect(screen.getByText(/En attente de validation/i)).toBeInTheDocument();
    });
  });
});
