// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Merci from "../src/Pages/Public/Merci";
import ContactezNous from "../src/Pages/Public/ContactezNous";
import { authService } from "../src/Services/authService";

vi.mock("../src/Services/authService", () => ({
  authService: {
    getUserRole: vi.fn(() => null),
    getEstMembreEquipe: vi.fn(() => false),
    envoyerContact: vi.fn(),
  },
}));
vi.mock("../src/Services/jobsService", () => ({ jobsService: { getFaq: vi.fn(() => Promise.resolve([])) } }));
vi.mock("../src/utils/informationsSociete", () => ({
  useInformationsSociete: () => ({}),
  contactsDepuis: () => [],
}));
vi.mock("react-hot-toast", () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const robots = () => document.head.querySelector('meta[name="robots"]');

const renderMerci = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Merci />
    </MemoryRouter>,
  );

beforeEach(() => document.head.querySelectorAll('meta[name="robots"]').forEach((e) => e.remove()));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("🙏 <Merci /> : page de confirmation", () => {
  it("🟢 confirme l'envoi d'un message de contact", () => {
    renderMerci("/merci?type=contact");
    expect(screen.getByRole("heading", { name: "Message envoyé" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour à l'accueil" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Voir les offres" })).toHaveAttribute("href", "/offres");
  });

  it("🟢 sans type connu, affiche un message neutre", () => {
    renderMerci("/merci?type=n-importe-quoi");
    expect(screen.getByRole("heading", { name: "Merci !" })).toBeInTheDocument();
  });

  it("🟢 depuis le portail recruteur, ramène à l'espace recruteur", () => {
    renderMerci("/merci?type=contact&portail=recruteur");
    expect(screen.getByRole("link", { name: "Retour à l'espace recruteur" })).toHaveAttribute("href", "/recruteurs");
    expect(screen.queryByRole("link", { name: "Voir les offres" })).not.toBeInTheDocument();
  });

  it("🟡 n'est jamais indexée", () => {
    renderMerci("/merci");
    expect(robots()).toHaveAttribute("content", "noindex, nofollow");
  });

  it("🔴 ne reflète aucun paramètre de l'URL dans la page (pas d'injection)", () => {
    renderMerci("/merci?type=%3Cimg%20src=x%3E&portail=%3Cb%3E");
    expect(document.body.innerHTML).not.toContain("<img src=x>");
  });
});

describe("✉️ Formulaire de contact : redirection vers /merci", () => {
  const remplirEtEnvoyer = async (container) => {
    const champ = (nom) => container.querySelector(`[name="${nom}"]`);
    fireEvent.change(champ("nom"), { target: { name: "nom", value: "Amine" } });
    fireEvent.change(champ("email"), { target: { name: "email", value: "amine@test.dz" } });
    fireEvent.change(champ("motif"), { target: { name: "motif", value: "Autre" } });
    fireEvent.change(champ("objet"), { target: { name: "objet", value: "Question" } });
    fireEvent.change(champ("message"), { target: { name: "message", value: "Bonjour" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(container.querySelector("form"));
  };

  const renderContact = (url = "/contact") =>
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/contact" element={<ContactezNous />} />
          <Route path="/merci" element={<Merci />} />
        </Routes>
      </MemoryRouter>,
    );

  it("🟢 après un envoi réussi, affiche la page de remerciement", async () => {
    authService.envoyerContact.mockResolvedValue({});
    const { container } = renderContact();
    await remplirEtEnvoyer(container);
    expect(await screen.findByRole("heading", { name: "Message envoyé" })).toBeInTheDocument();
    expect(authService.envoyerContact).toHaveBeenCalledTimes(1);
  });

  it("🟢 depuis le portail recruteur, la page de remerciement ramène à l'espace recruteur", async () => {
    authService.envoyerContact.mockResolvedValue({});
    const { container } = renderContact("/contact?portail=recruteur");
    await remplirEtEnvoyer(container);
    expect(await screen.findByRole("link", { name: "Retour à l'espace recruteur" })).toBeInTheDocument();
  });

  it("🔴 un envoi refusé par le serveur reste sur le formulaire", async () => {
    authService.envoyerContact.mockRejectedValue({ response: { data: { error: "Erreur serveur." } } });
    const { container } = renderContact();
    await remplirEtEnvoyer(container);
    await waitFor(() => expect(authService.envoyerContact).toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Message envoyé" })).not.toBeInTheDocument();
    expect(container.querySelector("form")).toBeInTheDocument();
  });
});
