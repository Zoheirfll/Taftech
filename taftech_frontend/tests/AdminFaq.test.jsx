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
import AdminFaq from "../src/Pages/Admin/AdminFaq";
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getAdminFaq: vi.fn(),
    createFaqItem: vi.fn(),
    updateFaqItem: vi.fn(),
    deleteFaqItem: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

const mockItems = [
  { id: 1, categorie: "GENERAL", question: "Comment postuler ?", reponse: "Créez un profil.", ordre: 0, actif: true },
  // PALIERS = catégorie lue par la page Abonnements recruteur (ex-"PREMIUM", page supprimée)
  { id: 2, categorie: "PALIERS", question: "Le paiement est-il sécurisé ?", reponse: "Oui, via Chargily.", ordre: 0, actif: false },
];

describe("❓ UI & Logique - Composant <AdminFaq />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminFaq.mockResolvedValue(mockItems);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Chargement et affichage des questions", async () => {
    render(
      <MemoryRouter>
        <AdminFaq />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Comment postuler ?")).toBeInTheDocument();
      expect(screen.getByText("Le paiement est-il sécurisé ?")).toBeInTheDocument();
    });
  });

  it("🟢 HP2 : Filtre par catégorie masque les autres questions", async () => {
    render(
      <MemoryRouter>
        <AdminFaq />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Comment postuler ?"));
    fireEvent.click(screen.getByRole("button", { name: /^Abonnements/ }));

    await waitFor(() => {
      expect(screen.queryByText("Comment postuler ?")).not.toBeInTheDocument();
      expect(screen.getByText("Le paiement est-il sécurisé ?")).toBeInTheDocument();
    });
  });

  it("🟢 HP3 : Création d'une question réussie", async () => {
    jobsService.createFaqItem.mockResolvedValue({ id: 3, categorie: "GENERAL", question: "Nouvelle question ?", reponse: "Réponse.", ordre: 0, actif: true });

    render(
      <MemoryRouter>
        <AdminFaq />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Ajouter une question/i));
    fireEvent.click(screen.getByText(/Ajouter une question/i));

    fireEvent.change(document.querySelector('input[maxlength="300"]'), { target: { value: "Nouvelle question ?" } });
    const reponseInput = screen.getByText(/Réponse \*/i).closest("div").querySelector("textarea");
    fireEvent.change(reponseInput, { target: { value: "Réponse." } });

    const form = document.querySelector('input[maxlength="300"]').closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(jobsService.createFaqItem).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("Question ajoutée");
    });
  });

  it("🟢 HP4 : Suppression d'une question réussie", async () => {
    jobsService.deleteFaqItem.mockResolvedValue({});

    render(
      <MemoryRouter>
        <AdminFaq />
        <ConfirmModalHost />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Comment postuler ?"));
    fireEvent.click(screen.getByLabelText("Supprimer la question Comment postuler ?"));
    fireEvent.click(await screen.findByText("Confirmer"));

    await waitFor(() => {
      expect(jobsService.deleteFaqItem).toHaveBeenCalledWith(1);
      expect(toast.success).toHaveBeenCalledWith("Question supprimée");
    });
  });

  // --- 🔴 EDGE CASES ---

  it("🔴 EC1 : Erreur chargement déclenche reportError", async () => {
    jobsService.getAdminFaq.mockRejectedValue(new Error("API Down"));

    render(
      <MemoryRouter>
        <AdminFaq />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_GET_ADMIN_FAQ",
        expect.anything(),
      );
      expect(toast.error).toHaveBeenCalledWith("Chargement impossible\nVeuillez réessayer dans quelques instants.");
    });
  });

  it("🔴 EC2 : Question vide bloque la création", async () => {
    render(
      <MemoryRouter>
        <AdminFaq />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText(/Ajouter une question/i));
    fireEvent.click(screen.getByText(/Ajouter une question/i));

    const form = document.querySelector('input[maxlength="300"]').closest("form");
    fireEvent.submit(form);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Question manquante\nLa question est obligatoire.");
      expect(jobsService.createFaqItem).not.toHaveBeenCalled();
    });
  });

  it("🟢 HP5 : La catégorie Abonnements (PALIERS) est proposée à la création", async () => {
    render(
      <MemoryRouter>
        <AdminFaq />
      </MemoryRouter>,
    );

    await waitFor(() => screen.getByText("Comment postuler ?"));
    fireEvent.click(screen.getByText(/Ajouter une question/i));
    expect(screen.getByRole("option", { name: /Abonnements/ })).toHaveAttribute("value", "PALIERS");
  });

  it("🔴 EC3 : Aucune question configurée", async () => {
    jobsService.getAdminFaq.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminFaq />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Aucune question configurée/i)).toBeInTheDocument();
    });
  });
});
