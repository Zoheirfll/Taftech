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
    expect(screen.getByText("Toutes les offres")).toBeInTheDocument();
    expect(screen.getByText("Par wilaya")).toBeInTheDocument();
    // Le CTA recruteur est "Vous recrutez ? Espace recruteur →"
    expect(screen.getByText(/Espace recruteur/i)).toBeInTheDocument();
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
