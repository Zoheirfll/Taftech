// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FicheAdminModal from "../src/Components/FicheAdminModal";
import AdminFaq from "../src/Pages/Admin/AdminFaq";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getAdminFaq: vi.fn(), createFaqItem: vi.fn(), updateFaqItem: vi.fn(), deleteFaqItem: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn(), loading: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("FicheAdminModal (gabarit commun des fiches admin)", () => {
  it("affiche le titre, les lignes et « — » pour une valeur vide", () => {
    render(<FicheAdminModal titre="Pack Starter" lignes={[{ libelle: "Crédits", valeur: 10 }, { libelle: "Lien", valeur: "" }]} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Pack Starter" })).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("se ferme avec la croix, Échap et un clic sur le fond", () => {
    const onClose = vi.fn();
    render(<FicheAdminModal titre="Fiche" lignes={[]} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Fermer"));
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("dialog").parentElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("déclenche l'action demandée", () => {
    const onModifier = vi.fn();
    render(<FicheAdminModal titre="Fiche" lignes={[]} actions={[{ libelle: "Modifier", onClick: onModifier }]} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Modifier" }));
    expect(onModifier).toHaveBeenCalledTimes(1);
  });
});

describe("Clic sur une ligne de la FAQ admin", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getAdminFaq.mockResolvedValue([
      { id: 1, categorie: "GENERAL", question: "Comment postuler ?", reponse: "Créez un profil puis postulez.", ordre: 2, actif: true },
    ]);
  });

  it("ouvre la fiche avec la réponse complète, sans l'ouvrir au clic sur une icône d'action", async () => {
    render(<MemoryRouter><AdminFaq /></MemoryRouter>);
    const question = await screen.findByText("Comment postuler ?");

    fireEvent.click(screen.getByLabelText("Supprimer la question Comment postuler ?"));
    expect(screen.queryByRole("dialog", { name: "Comment postuler ?" })).not.toBeInTheDocument();

    fireEvent.click(question);
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Comment postuler ?" })).toBeInTheDocument());
    expect(screen.getAllByText("Créez un profil puis postulez.").length).toBeGreaterThan(0);
  });
});
