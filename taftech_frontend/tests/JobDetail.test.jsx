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
import JobDetail from "../src/Pages/JobDetail";
import { jobsService } from "../src/Services/jobsService";
import { authService } from "../src/Services/authService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

// --- MOCKS ---
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "42" }),
  };
});

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getJobById: vi.fn(),
    postuler: vi.fn(),
    postulerRapide: vi.fn(),
  },
}));

vi.mock("../src/Services/authService", () => ({
  authService: {
    isAuthenticated: vi.fn(),
    getUserRole: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
  },
}));

window.URL.createObjectURL = vi.fn(() => "blob:fake-url");
window.URL.revokeObjectURL = vi.fn();

const mockJobData = {
  id: 42,
  titre: "Lead Développeur React",
  entreprise: { id: 1, nom_entreprise: "TafTech Corp" },
  wilaya: "Oran",
  type_contrat: "CDI",
  experience_requise: "5 ans",
  salaire_propose: "200k DZD",
  description: "Description de l'offre ici",
  date_publication: "2026-05-10",
};

describe("💼 UI & Logique - Composant <JobDetail />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS (4/4) ---

  it("🟢 HP1 : Affichage des détails de l'offre (avec Entreprise)", async () => {
    jobsService.getJobById.mockResolvedValue(mockJobData);
    render(
      <MemoryRouter>
        <JobDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Lead Développeur React")).toBeInTheDocument();
      expect(screen.getByText(/TafTech Corp/i)).toBeInTheDocument();
      expect(screen.getByText("200k DZD")).toBeInTheDocument();
      expect(
        screen.getByText("Description de l'offre ici"),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Navigation entre les modes de postulation (TafTech / Rapide)", async () => {
    jobsService.getJobById.mockResolvedValue(mockJobData);
    render(
      <MemoryRouter>
        <JobDetail />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Prêt\(e\) à relever le défi/i));

    // 1. Ouvrir le mode TafTech
    fireEvent.click(screen.getByText(/Postuler avec mon profil TafTech/i));
    expect(
      screen.getByText(/Les recruteurs auront accès à votre CV/i),
    ).toBeInTheDocument();

    // 2. Revenir au choix initial
    fireEvent.click(screen.getByText(/← Changer d'option/i));

    // 3. Ouvrir le mode Rapide
    fireEvent.click(screen.getByText(/Postulation Rapide \(Sans compte\)/i));
    // Vérifier qu'un input du form rapide est bien là
    const inputNom = screen
      .getByText("Nom *")
      .parentElement.querySelector("input");
    expect(inputNom).toBeInTheDocument();

    // 4. Fermer la modale rapide
    fireEvent.click(screen.getByText("✕"));

    // Vérifier le retour à l'écran de sélection
    expect(
      screen.getByText(/Postuler avec mon profil TafTech/i),
    ).toBeInTheDocument();
  });

  it("🟢 HP3 : Postulation via profil TafTech (Connecté)", async () => {
    jobsService.getJobById.mockResolvedValue(mockJobData);
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue("CANDIDAT");
    jobsService.postuler.mockResolvedValue({});

    render(
      <MemoryRouter>
        <JobDetail />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Prêt\(e\) à relever le défi/i));

    fireEvent.click(screen.getByText(/Postuler avec mon profil TafTech/i));
    fireEvent.click(screen.getByText(/Envoyer ma candidature/i));

    await waitFor(() => {
      expect(jobsService.postuler).toHaveBeenCalledWith("42", {
        lettre_motivation: "",
      });
      expect(screen.getByText(/Candidature envoyée/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP4 : Postulation Express avec envoi FormData", async () => {
    jobsService.getJobById.mockResolvedValue(mockJobData);
    jobsService.postulerRapide.mockResolvedValue({});
    const { container } = render(
      <MemoryRouter>
        <JobDetail />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Prêt\(e\) à relever le défi/i));
    fireEvent.click(screen.getByText(/Postulation Rapide/i));

    fireEvent.change(container.querySelector('input[name="nom_rapide"]'), {
      target: { value: "Doe" },
    });
    fireEvent.change(container.querySelector('input[name="prenom_rapide"]'), {
      target: { value: "John" },
    });
    fireEvent.change(container.querySelector('input[name="email_rapide"]'), {
      target: { value: "john@test.com" },
    });
    fireEvent.change(
      container.querySelector('input[name="telephone_rapide"]'),
      { target: { value: "0555" } },
    );

    const file = new File(["dummy content"], "cv.pdf", {
      type: "application/pdf",
    });
    const inputFichier = screen.getByTestId("cv-upload-input");
    fireEvent.change(inputFichier, {
      target: { name: "cv_rapide", files: [file] },
    });

    expect(screen.getByText("cv.pdf")).toBeInTheDocument();

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(jobsService.postulerRapide).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith(
        "Candidature envoyée !",
        expect.anything(),
      );
    });
  });

  // --- 🔴 EDGE CASES (4/4) ---

  it("🔴 EC1 : Redirection erreur 404 (Job introuvable)", async () => {
    jobsService.getJobById.mockRejectedValue(new Error("404"));
    render(
      <MemoryRouter>
        <JobDetail />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Offre introuvable ou retirée/i),
      ).toBeInTheDocument();
    });
  });

  it("🔴 EC2 : Postulation TafTech bloquée si non-connecté", async () => {
    jobsService.getJobById.mockResolvedValue(mockJobData);
    authService.isAuthenticated.mockReturnValue(false);

    render(
      <MemoryRouter>
        <JobDetail />
      </MemoryRouter>,
    );
    await waitFor(() => screen.getByText(/Prêt\(e\) à relever le défi/i));

    fireEvent.click(screen.getByText(/Postuler avec mon profil TafTech/i));
    fireEvent.click(screen.getByText(/Envoyer ma candidature/i));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Vous devez être connecté en tant que candidat pour utiliser votre profil TafTech.",
      );
      expect(mockNavigate).toHaveBeenCalledWith("/login");
      expect(jobsService.postuler).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC3 : Postulation Express bloquée si CV manquant", async () => {
    jobsService.getJobById.mockResolvedValue(mockJobData);
    const { container } = render(
      <MemoryRouter>
        <JobDetail />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Prêt\(e\) à relever le défi/i));
    fireEvent.click(screen.getByText(/Postulation Rapide/i));

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Veuillez joindre votre CV en format PDF ou Word.",
      );
      expect(jobsService.postulerRapide).not.toHaveBeenCalled();
    });
  });

  it("🔴 EC4 : Affichage du bouton de soumission pendant l'envoi (Anti-Spam)", async () => {
    jobsService.getJobById.mockResolvedValue(mockJobData);
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue("CANDIDAT");

    jobsService.postuler.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    render(
      <MemoryRouter>
        <JobDetail />
      </MemoryRouter>,
    );
    await waitFor(() => screen.getByText(/Prêt\(e\) à relever le défi/i));

    fireEvent.click(screen.getByText(/Postuler avec mon profil TafTech/i));

    const submitBtn = screen.getByText(/Envoyer ma candidature/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const disabledBtn = screen.getByRole("button", {
        name: /Envoi en cours/i,
      });
      expect(disabledBtn).toBeDisabled();
    });
  });
});
