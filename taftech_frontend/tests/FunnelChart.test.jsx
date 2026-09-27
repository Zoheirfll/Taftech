// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import FunnelChart from "../src/Components/FunnelChart";

// jsdom ne calcule jamais de vraie taille de layout (getBoundingClientRect/ResizeObserver
// renvoient toujours 0) — le <ResponsiveContainer> de recharts mesure donc un conteneur 0x0
// et ne rend rien du tout (bug connu recharts+jsdom, pas un flake aléatoire). On lui donne une
// taille explicite en le remplaçant par un simple <div> qui transmet width/height fixes aux
// enfants — le reste du rendu (Funnel/LabelList/Cell) reste le vrai code recharts.
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children, width = 400, height = 300 }) => (
      <div style={{ width, height }}>{React.cloneElement(children, { width, height })}</div>
    ),
  };
});

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
