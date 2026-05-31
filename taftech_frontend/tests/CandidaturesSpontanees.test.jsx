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
import CandidaturesSpontanees from "../src/Pages/CandidaturesSpontanees";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getCandidaturesSpontanees: vi.fn(),
    getConstants: vi.fn(),
    marquerSpontaneeCommentLue: vi.fn(),
    supprimerCandidatureSpontanee: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockConstants = {
  wilayas: [{ value: "31 - Oran", label: "31 - Oran" }],
  diplomes: [{ value: "MASTER_2", label: "Master 2" }],
  secteurs: [{ value: "IT", label: "Informatique" }],
};

const mockCandidatures = [
  {
    id: 1,
    nom: "Filali",
    prenom: "Zoheir",
    email: "zoheir@test.dz",
    telephone: "0664540375",
    wilaya: "31 - Oran",
    diplome: "MASTER_2",
    specialite: "IT",
    lettre_motivation: "Je suis très motivé.",
    date_envoi: "2026-05-30T10:00:00Z",
    lue: false,
    cv: "/media/cvs/test.pdf",
  },
  {
    id: 2,
    nom: "Benali",
    prenom: "Ahmed",
    email: "ahmed@test.dz",
    telephone: "0555000000",
    wilaya: "16 - Alger",
    diplome: "LICENCE",
    specialite: "FINANCE",
    lettre_motivation: "",
    date_envoi: "2026-05-29T10:00:00Z",
    lue: true,
    cv: null,
  },
];

describe("📬 UI & Logique - Composant <CandidaturesSpontanees />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // --- 🟢 HAPPY PATHS ---

  it("🟢 HP1 : Chargement et affichage des candidatures", async () => {
    jobsService.getCandidaturesSpontanees.mockResolvedValue(mockCandidatures);
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <CandidaturesSpontanees />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Filali/i)).toBeInTheDocument();
      expect(screen.getByText(/Benali/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Affichage du compteur non lues", async () => {
    jobsService.getCandidaturesSpontanees.mockResolvedValue(mockCandidatures);
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <CandidaturesSpontanees />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/1 non lue/i)).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Marquer une candidature comme lue", async () => {
    jobsService.getCandidaturesSpontanees.mockResolvedValue(mockCandidatures);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.marquerSpontaneeCommentLue.mockResolvedValue({});

    render(
      <MemoryRouter>
        <CandidaturesSpontanees />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Marquer lue/i));
    fireEvent.click(screen.getByText(/Marquer lue/i));

    await waitFor(() => {
      expect(jobsService.marquerSpontaneeCommentLue).toHaveBeenCalledWith(1);
    });
  });

  it("🟢 HP4 : Supprimer une candidature", async () => {
    jobsService.getCandidaturesSpontanees.mockResolvedValue(mockCandidatures);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.supprimerCandidatureSpontanee.mockResolvedValue({});

    render(
      <MemoryRouter>
        <CandidaturesSpontanees />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByRole("button"));
    const deleteButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg"));
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(jobsService.supprimerCandidatureSpontanee).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Candidature supprimée.");
    });
  });

  it("🟢 HP5 : Affichage vide si aucune candidature", async () => {
    jobsService.getCandidaturesSpontanees.mockResolvedValue([]);
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <CandidaturesSpontanees />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Aucune candidature trouvée/i),
      ).toBeInTheDocument();
    });
  });

  it("🟢 HP6 : Badge non lue affiché sur candidature non lue", async () => {
    jobsService.getCandidaturesSpontanees.mockResolvedValue(mockCandidatures);
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <CandidaturesSpontanees />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Marquer lue/i)).toBeInTheDocument();
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getCandidaturesSpontanees.mockRejectedValue(
      new Error("API Down"),
    );
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <CandidaturesSpontanees />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_SPONTANEES",
        expect.anything(),
      );
    });
  });

  it("🔴 EC2 : Erreur suppression déclenche reportError", async () => {
    jobsService.getCandidaturesSpontanees.mockResolvedValue(mockCandidatures);
    jobsService.getConstants.mockResolvedValue(mockConstants);
    jobsService.supprimerCandidatureSpontanee.mockRejectedValue(
      new Error("Delete failed"),
    );

    render(
      <MemoryRouter>
        <CandidaturesSpontanees />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByRole("button"));
    const deleteButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg"));
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_SUPPRIMER_SPONTANEE",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith(
        "Erreur lors de la suppression.",
      );
    });
  });

  it("🔴 EC3 : Confirmation annulée ne supprime pas", async () => {
    window.confirm = vi.fn(() => false);
    jobsService.getCandidaturesSpontanees.mockResolvedValue(mockCandidatures);
    jobsService.getConstants.mockResolvedValue(mockConstants);

    render(
      <MemoryRouter>
        <CandidaturesSpontanees />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getAllByRole("button"));
    const deleteButtons = screen
      .getAllByRole("button")
      .filter((b) => b.querySelector("svg"));
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(jobsService.supprimerCandidatureSpontanee).not.toHaveBeenCalled();
    });
  });
});
