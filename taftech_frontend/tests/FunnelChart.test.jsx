// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import FunnelChart from "../src/Components/FunnelChart";

describe("📊 FunnelChart", () => {
  afterEach(() => cleanup());

  it("🟢 HP1 : affiche toutes les étapes avec count et %", () => {
    render(<FunnelChart etapes={[
      { label: "Candidatures reçues", count: 100, pct: 100, couleur: "#4f46e5" },
      { label: "Entretiens", count: 20, pct: 20, couleur: "#0ea5e9" },
    ]} />);
    expect(screen.getByText(/Candidatures reçues/)).toBeInTheDocument();
    expect(screen.getByText(/Entretiens/)).toBeInTheDocument();
  });

  it("🟡 EC1 : liste vide ne plante pas", () => {
    const { container } = render(<FunnelChart etapes={[]} />);
    expect(container).toBeInTheDocument();
  });
});
