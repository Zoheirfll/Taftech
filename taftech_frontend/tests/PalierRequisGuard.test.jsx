// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PalierRequisGuard from "../src/Pages/Recruteur/PalierRequisGuard";
import { jobsService } from "../src/Services/jobsService";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getMonAbonnement: vi.fn() },
}));

const rendre = () =>
  render(
    <MemoryRouter>
      <PalierRequisGuard droit="acces_equipe" titre="Mon équipe" message="Palier Business requis.">
        <p>Contenu de la page</p>
      </PalierRequisGuard>
    </MemoryRouter>,
  );

describe("🔒 <PalierRequisGuard /> — page non incluse dans le palier", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("remplace la page par l'écran « palier requis » quand le droit vaut false", async () => {
    jobsService.getMonAbonnement.mockResolvedValue({ acces_equipe: false });
    rendre();
    expect(await screen.findByText("Mon équipe")).toBeInTheDocument();
    expect(screen.getByText("Palier Business requis.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Voir les paliers/i })).toHaveAttribute("href", "/recruteurs/abonnements");
    expect(screen.queryByText("Contenu de la page")).not.toBeInTheDocument();
  });

  it("montre la page quand le droit vaut true", async () => {
    jobsService.getMonAbonnement.mockResolvedValue({ acces_equipe: true });
    rendre();
    expect(await screen.findByText("Contenu de la page")).toBeInTheDocument();
    expect(screen.queryByText("Palier Business requis.")).not.toBeInTheDocument();
  });

  it("ne monte pas la page pendant la lecture des droits", () => {
    jobsService.getMonAbonnement.mockReturnValue(new Promise(() => {}));
    rendre();
    expect(screen.queryByText("Contenu de la page")).not.toBeInTheDocument();
  });

  it("un droit inconnu (réponse partielle) ne verrouille rien", async () => {
    jobsService.getMonAbonnement.mockResolvedValue({ palier: "PRO" });
    rendre();
    expect(await screen.findByText("Contenu de la page")).toBeInTheDocument();
  });

  it("si la lecture échoue, la page reste affichée (le serveur reste le garde)", async () => {
    jobsService.getMonAbonnement.mockRejectedValue(new Error("réseau"));
    rendre();
    await waitFor(() => expect(screen.getByText("Contenu de la page")).toBeInTheDocument());
  });
});
