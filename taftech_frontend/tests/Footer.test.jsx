// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../src/Components/Footer";

vi.mock("../src/api/axiosConfig");

describe("📑 UI & Logique - Composant <Footer />", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Rendu des sections principales", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/La plateforme de recrutement intelligente/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Oran, Algérie/i)).toBeInTheDocument();
    expect(screen.getByText(/taftech963@gmail.com/i)).toBeInTheDocument();
    expect(screen.getAllByText(/TafTech/i).length).toBeGreaterThan(0);
  });

  it("🟢 HP2 : Liens de navigation présents", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    // Colonnes "Espace candidat/recruteur/Plateforme" retirées (redondantes avec la navbar)
    expect(screen.getByText("Réseaux sociaux")).toBeInTheDocument();
    expect(screen.getByText("Légal")).toBeInTheDocument();
    expect(screen.getByText("Nous contacter")).toBeInTheDocument();
    expect(screen.getByText("Qui sommes-nous ?")).toBeInTheDocument();
  });

  it("🟢 HP3 : Copyright affiché", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(/Made for a better recruitment/i),
    ).toBeInTheDocument();
  });
});
