// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import AdminSeo from "../src/Pages/Admin/AdminSeo";

describe("🔍 UI - Composant <AdminSeo />", () => {
  afterEach(() => {
    cleanup();
  });

  it("🟢 HP1 : Affiche un exemple d'URL par type de page", () => {
    render(<AdminSeo />);

    expect(screen.getByText("Offre d'emploi")).toBeInTheDocument();
    expect(screen.getByText("Entreprise")).toBeInTheDocument();
    expect(screen.getByText("Métier")).toBeInTheDocument();
    expect(screen.getByText("Secteur")).toBeInTheDocument();
    expect(screen.getByText("Wilaya")).toBeInTheDocument();
    expect(screen.getByText("Blog / Article")).toBeInTheDocument();
    expect(screen.getByText(/taftech\.dz\/jobs\//)).toBeInTheDocument();
  });

  it("🟢 HP2 : Affiche le bandeau de réassurance SEO", () => {
    render(<AdminSeo />);

    expect(
      screen.getByText(/Toutes les pages importantes ont une URL propre/i),
    ).toBeInTheDocument();
  });
});
