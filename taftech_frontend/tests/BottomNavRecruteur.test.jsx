// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNavRecruteur from "../src/Components/BottomNavRecruteur";
import { authService } from "../src/Services/authService";
import { jobsService } from "../src/Services/jobsService";

vi.mock("../src/Services/authService", () => ({
  authService: {
    peutFaire: vi.fn(() => true),
    getUserRole: vi.fn(),
    getMe: vi.fn(),
    isRecruteurOuMembre: vi.fn(() => true),
  },
}));

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getMonAbonnement: vi.fn() },
}));

const rendre = () =>
  render(
    <MemoryRouter>
      <BottomNavRecruteur />
    </MemoryRouter>,
  );

describe("📱 <BottomNavRecruteur /> — cadenas selon le palier", () => {
  beforeEach(() => {
    authService.getUserRole.mockReturnValue("RECRUTEUR");
    authService.getMe.mockResolvedValue({ entreprise_approuvee: true, nom_entreprise: "Groupe MZ" });
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("met un cadenas sur Publier et CVthèque quand le palier ne les donne pas", async () => {
    jobsService.getMonAbonnement.mockResolvedValue({ peut_publier_offre: false, acces_cvtheque: false });
    rendre();
    await waitFor(() => expect(screen.getAllByTitle("Palier supérieur requis")).toHaveLength(2));
    const liens = screen.getAllByTitle("Palier supérieur requis").map((c) => c.closest("a").getAttribute("href"));
    expect(liens.sort()).toEqual(["/creer-offre", "/cvtheque"]);
  });

  it("aucun cadenas quand le palier donne tout", async () => {
    jobsService.getMonAbonnement.mockResolvedValue({ peut_publier_offre: true, acces_cvtheque: true });
    rendre();
    await waitFor(() => expect(jobsService.getMonAbonnement).toHaveBeenCalled());
    expect(screen.queryByTitle("Palier supérieur requis")).not.toBeInTheDocument();
  });

  it("n'affiche rien et ne lit aucun droit quand l'entreprise est en attente de validation", async () => {
    authService.getMe.mockResolvedValue({ entreprise_approuvee: false, nom_entreprise: "Groupe MZ" });
    const { container } = rendre();
    await waitFor(() => expect(authService.getMe).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(jobsService.getMonAbonnement).not.toHaveBeenCalled();
  });
});
