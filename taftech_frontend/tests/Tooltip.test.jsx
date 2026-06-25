// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import Tooltip, { TooltipIcon } from "../src/Components/Tooltip";

afterEach(cleanup);

describe("💬 Tooltip — affichage au survol", () => {

  // ── Happy Paths ────────────────────────────────────────────────────────────

  it("🟢 HP1 : Le tooltip est masqué par défaut", () => {
    render(
      <Tooltip text="Mon tooltip">
        <button>Survole-moi</button>
      </Tooltip>
    );
    expect(screen.queryByText("Mon tooltip")).not.toBeInTheDocument();
  });

  it("🟢 HP2 : Le tooltip apparaît au mouseEnter", () => {
    render(
      <Tooltip text="Aide contextuelle">
        <button>Bouton</button>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText("Bouton").closest("span"));
    expect(screen.getByText("Aide contextuelle")).toBeInTheDocument();
  });

  it("🟢 HP3 : Le tooltip disparaît au mouseLeave", () => {
    render(
      <Tooltip text="À cacher">
        <button>Bouton</button>
      </Tooltip>
    );
    const wrapper = screen.getByText("Bouton").closest("span");
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText("À cacher")).toBeInTheDocument();

    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText("À cacher")).not.toBeInTheDocument();
  });

  it("🟢 HP4 : Fonctionne avec n'importe quel children", () => {
    render(
      <Tooltip text="Tooltip sur span">
        <span>Texte quelconque</span>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText("Texte quelconque").closest("span"));
    expect(screen.getByText("Tooltip sur span")).toBeInTheDocument();
  });

  // ── Positions ─────────────────────────────────────────────────────────────

  it("🟢 HP5 : Position bottom applique les classes bottom", () => {
    render(
      <Tooltip text="En bas" position="bottom">
        <button>Bouton</button>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText("Bouton").closest("span"));
    const bubble = screen.getByText("En bas");
    expect(bubble.className).toMatch(/top-full/);
  });

  it("🟢 HP6 : Position left applique les classes left", () => {
    render(
      <Tooltip text="À gauche" position="left">
        <button>Bouton</button>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText("Bouton").closest("span"));
    const bubble = screen.getByText("À gauche");
    expect(bubble.className).toMatch(/right-full/);
  });

  it("🟢 HP7 : Position right applique les classes right", () => {
    render(
      <Tooltip text="À droite" position="right">
        <button>Bouton</button>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText("Bouton").closest("span"));
    const bubble = screen.getByText("À droite");
    expect(bubble.className).toMatch(/left-full/);
  });
});

describe("❓ TooltipIcon — icône HelpCircle avec tooltip", () => {

  it("🟢 HP1 : Affiche une icône cliquable", () => {
    render(<TooltipIcon text="Explication de l'icône" />);
    // L'icône est un SVG dans un span — le wrapper span est présent
    const wrapper = document.querySelector("span.relative");
    expect(wrapper).toBeInTheDocument();
  });

  it("🟢 HP2 : Le tooltip apparaît au survol de l'icône", () => {
    render(<TooltipIcon text="Explication icône" />);
    const wrapper = document.querySelector("span.relative");
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByText("Explication icône")).toBeInTheDocument();
  });

  it("🟢 HP3 : Le tooltip disparaît quand on quitte l'icône", () => {
    render(<TooltipIcon text="À cacher icône" />);
    const wrapper = document.querySelector("span.relative");
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText("À cacher icône")).not.toBeInTheDocument();
  });
});
