// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CookieBanner from "../src/Components/CookieBanner";
import CarteSurDemande from "../src/Components/CarteSurDemande";

const CLE = "taftech_info_cookies_vue";
const monter = (url = "/") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <CookieBanner />
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("🍪 Bannière d'information sur les cookies", () => {
  it("🟢 s'affiche à la première visite, avec le lien vers la politique de confidentialité", () => {
    monter();
    const bandeau = screen.getByRole("region", { name: "Information sur les cookies" });
    expect(bandeau).toHaveTextContent(/cookies indispensables/i);
    expect(bandeau).toHaveTextContent(/carte Google/i);
    expect(screen.getByRole("link", { name: "En savoir plus" })).toHaveAttribute("href", "/confidentialite");
  });

  it("🟢 « J'ai compris » la ferme et mémorise le choix", () => {
    monter();
    fireEvent.click(screen.getByRole("button", { name: "J'ai compris" }));
    expect(screen.queryByRole("region", { name: "Information sur les cookies" })).not.toBeInTheDocument();
    expect(localStorage.getItem(CLE)).toBe("1");
  });

  it("🟢 ne réapparaît pas une fois vue", () => {
    localStorage.setItem(CLE, "1");
    monter();
    expect(screen.queryByRole("region", { name: "Information sur les cookies" })).not.toBeInTheDocument();
  });

  it("🟡 jamais sur les pages d'administration", () => {
    monter("/admin-taftech/dashboard");
    expect(screen.queryByRole("region", { name: "Information sur les cookies" })).not.toBeInTheDocument();
  });

  it("🔴 un stockage indisponible (navigation privée) ne fait pas planter la page", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqué");
    });
    monter();
    fireEvent.click(screen.getByRole("button", { name: "J'ai compris" }));
    expect(screen.queryByRole("region", { name: "Information sur les cookies" })).not.toBeInTheDocument();
  });
});

describe("🗺️ Carte chargée seulement après un clic", () => {
  it("🟢 aucun contenu Google avant le clic", () => {
    const { container } = render(<CarteSurDemande lieu="Oran, Algérie" />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "Afficher la carte" })).toBeInTheDocument();
    expect(screen.getByText(/peut déposer ses propres cookies/i)).toBeInTheDocument();
  });

  it("🟢 après le clic, la carte du lieu s'affiche (adresse encodée)", () => {
    const { container } = render(<CarteSurDemande lieu="12 rue d'Arzew & Co, Oran" />);
    fireEvent.click(screen.getByRole("button", { name: "Afficher la carte" }));
    const cadre = container.querySelector("iframe");
    expect(cadre).not.toBeNull();
    expect(cadre.getAttribute("src")).toBe(
      `https://maps.google.com/maps?q=${encodeURIComponent("12 rue d'Arzew & Co, Oran")}&z=12&output=embed`,
    );
    expect(cadre).toHaveAttribute("title", "Localisation de l'entreprise");
    expect(screen.queryByRole("button", { name: "Afficher la carte" })).not.toBeInTheDocument();
  });
});
