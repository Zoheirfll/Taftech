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
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : affiche les 8 liens de la sidebar avec leurs labels", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());

    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("CVthèque")).toBeInTheDocument();
    expect(screen.getByText("Favoris")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
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
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });

  it("🟢 HP4 : le lien Favoris pointe vers /cvtheque?favoris=true", async () => {
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    const lien = screen.getByText("Favoris").closest("a");
    expect(lien).toHaveAttribute("href", "/cvtheque?favoris=true");
  });

  it("🟡 EC1 : un lien caché par le rôle (peutFaire=false) n'apparaît pas", async () => {
    authService.peutFaire.mockImplementation((minRole) => minRole !== "PROPRIETAIRE");
    renderLayout();
    await waitFor(() => expect(jobsService.getCandidaturesSpontanees).toHaveBeenCalled());
    expect(screen.queryByText("Mon équipe")).not.toBeInTheDocument();
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
});
