// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EntrepriseValideeGuard from "../src/Pages/Recruteur/EntrepriseValideeGuard";
import { authService } from "../src/Services/authService";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../src/Services/authService", () => ({
  authService: { getUserRole: vi.fn(), getMe: vi.fn(), logout: vi.fn() },
}));

const rendre = () =>
  render(
    <MemoryRouter>
      <EntrepriseValideeGuard>
        <p>Espace recruteur</p>
      </EntrepriseValideeGuard>
    </MemoryRouter>,
  );

describe("🔒 <EntrepriseValideeGuard /> — entreprise en attente de validation", () => {
  beforeEach(() => {
    authService.getUserRole.mockReturnValue("RECRUTEUR");
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("n'affiche que l'écran d'attente quand l'entreprise n'est pas validée", async () => {
    authService.getMe.mockResolvedValue({ entreprise_approuvee: false, nom_entreprise: "Groupe MZ" });
    rendre();
    expect(await screen.findByText("Compte en cours de validation")).toBeInTheDocument();
    expect(screen.getByText("Groupe MZ")).toBeInTheDocument();
    expect(screen.queryByText("Espace recruteur")).not.toBeInTheDocument();
  });

  it("monte l'espace recruteur quand l'entreprise est validée", async () => {
    authService.getMe.mockResolvedValue({ entreprise_approuvee: true, nom_entreprise: "Groupe MZ" });
    rendre();
    expect(await screen.findByText("Espace recruteur")).toBeInTheDocument();
    expect(screen.queryByText("Compte en cours de validation")).not.toBeInTheDocument();
  });

  it("ne monte pas l'espace pendant la lecture du statut", () => {
    authService.getMe.mockReturnValue(new Promise(() => {}));
    rendre();
    expect(screen.queryByText("Espace recruteur")).not.toBeInTheDocument();
  });

  it("ne concerne pas un compte hors recruteur (membre d'équipe) : aucun appel à me/", async () => {
    authService.getUserRole.mockReturnValue("CANDIDAT");
    rendre();
    expect(await screen.findByText("Espace recruteur")).toBeInTheDocument();
    expect(authService.getMe).not.toHaveBeenCalled();
  });

  it("« Actualiser mon statut » ouvre l'espace dès que l'entreprise est approuvée", async () => {
    authService.getMe
      .mockResolvedValueOnce({ entreprise_approuvee: false, nom_entreprise: "Groupe MZ" })
      .mockResolvedValueOnce({ entreprise_approuvee: true, nom_entreprise: "Groupe MZ" });
    rendre();
    fireEvent.click(await screen.findByRole("button", { name: /Actualiser mon statut/i }));
    expect(await screen.findByText("Espace recruteur")).toBeInTheDocument();
  });

  it("« Déconnexion » ferme la session et renvoie vers la connexion recruteur", async () => {
    authService.getMe.mockResolvedValue({ entreprise_approuvee: false, nom_entreprise: "Groupe MZ" });
    rendre();
    fireEvent.click(await screen.findByRole("button", { name: /Déconnexion/i }));
    expect(authService.logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/recruteurs/connexion");
  });

  it("si me/ échoue, n'affiche pas un écran bloqué à tort (le serveur reste le garde)", async () => {
    authService.getMe.mockRejectedValue(new Error("réseau"));
    rendre();
    await waitFor(() => expect(screen.getByText("Espace recruteur")).toBeInTheDocument());
  });
});
