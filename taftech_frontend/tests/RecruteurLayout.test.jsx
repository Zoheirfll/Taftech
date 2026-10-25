// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RecruteurLayout from "../src/Pages/Recruteur/RecruteurLayout";
import { jobsService } from "../src/Services/jobsService";
import { authService } from "../src/Services/authService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getCandidaturesSpontanees: vi.fn(),
    getMonAbonnement: vi.fn(),
  },
}));

vi.mock("../src/Services/authService", () => ({
  authService: {
    peutFaire: vi.fn(() => true),
    logout: vi.fn(),
  },
}));

const renderLayout = (initialPath = "/dashboard") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<RecruteurLayout />}>
          <Route path="/dashboard" element={<div>Contenu Dashboard</div>} />
          <Route path="/cvtheque" element={<div>Contenu CVthèque</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe("🏢 RecruteurLayout — sidebar recruteur", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.getCandidaturesSpontanees.mockResolvedValue([]);
    jobsService.getMonAbonnement.mockResolvedValue({ acces_ia_recommandes: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : affiche les liens de la sidebar avec leurs labels", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());

    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("CVthèque")).toBeInTheDocument();
    expect(screen.getByText("Candidatures spontanées")).toBeInTheDocument();
    expect(screen.getByText("Publier une offre")).toBeInTheDocument();
    expect(screen.getByText("Questionnaires")).toBeInTheDocument();
    expect(screen.getByText("Mon équipe")).toBeInTheDocument();
    expect(screen.getByText("Paramètres entreprise")).toBeInTheDocument();
  });

  it("🟢 HP2 : affiche le contenu de la route enfant via Outlet", async () => {
    renderLayout("/dashboard");
    await waitFor(() => expect(screen.getByText("Contenu Dashboard")).toBeInTheDocument());
  });

  it("🟢 HP3 : le badge Messages affiche le nombre de candidatures spontanées non lues", async () => {
    jobsService.getCandidaturesSpontanees.mockResolvedValue([
      { id: 1, lue: false },
      { id: 2, lue: true },
      { id: 3, lue: false },
    ]);
    renderLayout();
    await waitFor(() => expect(screen.getAllByText("2").length).toBeGreaterThan(0));
  });

  it("🟡 EC1 : un lien interdit par le rôle reste visible avec un cadenas", async () => {
    // Rôle administrateur : tout sauf ce qui est réservé au propriétaire (abonnements, facturation).
    authService.peutFaire.mockImplementation((minRole) => minRole !== "PROPRIETAIRE");
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    expect(screen.getByText("Facturation")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Réservé à un rôle supérieur dans l'équipe")).toHaveLength(2);
    expect(screen.getByText("Mon équipe")).toBeInTheDocument();
  });

  it("🟢 HP5 : le bouton Déconnexion appelle authService.logout()", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Déconnexion"));
    expect(authService.logout).toHaveBeenCalled();
  });

  it("🟢 HP6 : Ctrl+K focus le champ de recherche du header", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    const input = screen.getByPlaceholderText(/Rechercher un candidat/i);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(input).toHaveFocus();
  });

  it("🟢 HP7 : Ctrl+K + Entrée navigue vers /cvtheque?search=<terme>", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    const input = screen.getByPlaceholderText(/Rechercher un candidat/i);
    fireEvent.change(input, { target: { value: "développeur react" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByText("Contenu CVthèque")).toBeInTheDocument());
  });

  it("🟢 HP8 : sur /cvtheque, le lien CVthèque est actif", async () => {
    renderLayout("/cvtheque");
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    const lienCVtheque = screen.getByText("CVthèque").closest("a");
    expect(lienCVtheque.className).toMatch(/bg-teal-700/);
  });

  it("🟡 EC2 : un cadenas signale « Candidats recommandés » quand le palier ne l'inclut pas", async () => {
    jobsService.getMonAbonnement.mockResolvedValue({ palier: "STARTER", acces_ia_recommandes: false });
    renderLayout();
    const cadenas = await screen.findByTitle("Palier supérieur requis");
    expect(cadenas.closest("a")).toHaveAttribute("href", "/candidats-recommandes");
    // L'entrée reste visible et cliquable : l'écran « palier requis » de la page explique le blocage.
    expect(screen.getByText("Candidats recommandés")).toBeInTheDocument();
  });

  it("🟡 EC3 : cadenas sur CVthèque (aucun palier actif) et sur Mon équipe (droit équipe absent)", async () => {
    authService.peutFaire.mockImplementation(() => true); // EC1 a masqué « Mon équipe » : on remet l'état
    jobsService.getMonAbonnement.mockResolvedValue({
      palier: null, acces_cvtheque: false, acces_equipe: false, acces_ia_recommandes: false, peut_publier_offre: false,
    });
    renderLayout();
    await waitFor(() => expect(screen.getAllByTitle("Palier supérieur requis")).toHaveLength(4));
    const liens = screen.getAllByTitle("Palier supérieur requis").map((c) => c.closest("a").getAttribute("href"));
    expect(liens.sort()).toEqual(["/candidats-recommandes", "/creer-offre", "/cvtheque", "/mon-equipe"]);
  });

  it("🟡 EC4 : un droit inconnu (réponse partielle) ne verrouille rien", async () => {
    jobsService.getMonAbonnement.mockResolvedValue({ palier: "PRO" });
    renderLayout();
    await waitFor(() => expect(jobsService.getMonAbonnement).toHaveBeenCalled());
    expect(screen.queryByTitle("Palier supérieur requis")).not.toBeInTheDocument();
  });

  it("🟢 HP9 : aucun cadenas quand le palier inclut les candidats recommandés", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getMonAbonnement).toHaveBeenCalled());
    expect(screen.queryByTitle("Palier supérieur requis")).not.toBeInTheDocument();
  });
});
