// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../src/Components/Footer";
import { jobsService } from "../src/Services/jobsService";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getPagesLibres: vi.fn(),
    getInformationsSociete: vi.fn(),
  },
}));

const INFOS_VIDES = {
  email_contact: "", telephone: "", adresse: "", whatsapp: "",
  facebook_url: "", instagram_url: "", linkedin_url: "",
};

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

describe("📑 UI & Logique - Composant <Footer />", () => {
  beforeEach(() => {
    jobsService.getPagesLibres.mockResolvedValue([]);
    jobsService.getInformationsSociete.mockResolvedValue(INFOS_VIDES);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Slogan, liens légaux et copyright", async () => {
    renderFooter();
    expect(
      screen.getByText("La plateforme de recrutement qui combine intelligence artificielle, expertise RH et accompagnement humain."),
    ).toBeInTheDocument();
    expect(screen.getByText("Légal")).toBeInTheDocument();
    expect(screen.getByText("Mentions légales")).toBeInTheDocument();
    expect(screen.getByText("Confidentialité")).toBeInTheDocument();
    expect(screen.getByText("CGU")).toBeInTheDocument();
    expect(screen.getByText("Nous contacter")).toBeInTheDocument();
    expect(screen.getByText("Qui sommes-nous ?")).toBeInTheDocument();
    expect(screen.getByText(/Made for a better recruitment/i)).toBeInTheDocument();
    await waitFor(() => expect(jobsService.getInformationsSociete).toHaveBeenCalled());
  });

  it("🔒 Sans informations renseignées : aucune coordonnée ni réseau social affiché", async () => {
    renderFooter();
    await waitFor(() => expect(jobsService.getInformationsSociete).toHaveBeenCalled());
    expect(screen.queryByText("Contact")).toBeNull();
    expect(screen.queryByText("Réseaux sociaux")).toBeNull();
    expect(screen.queryByText(/taftech963/i)).toBeNull();
    expect(screen.queryByText(/0770/)).toBeNull();
  });

  it("🟢 Informations renseignées : seuls les champs remplis apparaissent", async () => {
    jobsService.getInformationsSociete.mockResolvedValue({
      ...INFOS_VIDES,
      email_contact: "contact@exemple.dz",
      adresse: "Oran",
      facebook_url: "https://www.facebook.com/exemple",
    });
    renderFooter();

    expect(await screen.findByText("contact@exemple.dz")).toBeInTheDocument();
    expect(screen.getByText("Oran")).toBeInTheDocument();
    expect(screen.queryByText("Téléphone")).toBeNull();

    expect(screen.getByRole("link", { name: "Facebook" })).toHaveAttribute("href", "https://www.facebook.com/exemple");
    expect(screen.queryByRole("link", { name: "Instagram" })).toBeNull();
    expect(screen.queryByRole("link", { name: "LinkedIn" })).toBeNull();
    expect(screen.queryByRole("link", { name: "WhatsApp" })).toBeNull();
  });

  it("🟢 WhatsApp et téléphone : liens construits à partir des valeurs saisies", async () => {
    jobsService.getInformationsSociete.mockResolvedValue({
      ...INFOS_VIDES, telephone: "+213 41 00 00 00", whatsapp: "21341000000",
    });
    renderFooter();

    expect(await screen.findByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/21341000000");
    expect(screen.getByText("+213 41 00 00 00").closest("a")).toHaveAttribute("href", "tel:+21341000000");
  });

  it("🔴 Échec de chargement : le pied de page reste affiché sans coordonnées", async () => {
    jobsService.getInformationsSociete.mockRejectedValue(new Error("réseau"));
    renderFooter();
    await waitFor(() => expect(jobsService.getInformationsSociete).toHaveBeenCalled());
    expect(screen.getByText("Légal")).toBeInTheDocument();
    expect(screen.queryByText("Contact")).toBeNull();
  });
});
