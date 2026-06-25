// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import InfoBanner from "../src/Components/InfoBanner";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("🧭 InfoBanner — composant onboarding dismissable", () => {

  // ── Happy Paths ────────────────────────────────────────────────────────────

  it("🟢 HP1 : Affiche le titre et le contenu par défaut", () => {
    render(
      <InfoBanner storageKey="test_hp1" title="Bienvenue">
        Voici une explication utile.
      </InfoBanner>
    );
    expect(screen.getByText("Bienvenue")).toBeInTheDocument();
    expect(screen.getByText("Voici une explication utile.")).toBeInTheDocument();
  });

  it("🟢 HP2 : Ferme la bannière en cliquant sur X et écrit dans localStorage", () => {
    render(
      <InfoBanner storageKey="test_hp2" title="Info">
        Contenu
      </InfoBanner>
    );
    expect(screen.getByText("Info")).toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Fermer"));

    expect(screen.queryByText("Info")).not.toBeInTheDocument();
    expect(localStorage.getItem("banner_test_hp2")).toBe("1");
  });

  it("🟢 HP3 : Ne s'affiche pas si la clé localStorage est déjà présente", () => {
    localStorage.setItem("banner_test_hp3", "1");
    render(
      <InfoBanner storageKey="test_hp3" title="Déjà fermée">
        Invisible
      </InfoBanner>
    );
    expect(screen.queryByText("Déjà fermée")).not.toBeInTheDocument();
  });

  it("🟢 HP4 : Affiche sans titre si la prop title est absente", () => {
    render(
      <InfoBanner storageKey="test_hp4">
        Juste du texte, pas de titre.
      </InfoBanner>
    );
    expect(screen.getByText("Juste du texte, pas de titre.")).toBeInTheDocument();
  });

  // ── Variants de couleur ────────────────────────────────────────────────────

  it("🟢 HP5 : Variant teal applique les classes teal", () => {
    const { container } = render(
      <InfoBanner storageKey="test_teal" color="teal" title="Teal">
        Contenu teal
      </InfoBanner>
    );
    const div = container.firstChild;
    expect(div.className).toMatch(/teal/);
  });

  it("🟢 HP6 : Variant amber applique les classes amber", () => {
    const { container } = render(
      <InfoBanner storageKey="test_amber" color="amber" title="Amber">
        Contenu amber
      </InfoBanner>
    );
    const div = container.firstChild;
    expect(div.className).toMatch(/amber/);
  });

  // ── Edge Cases ─────────────────────────────────────────────────────────────

  it("🔴 EC1 : Deux bannières avec des storageKey différentes sont indépendantes", () => {
    localStorage.setItem("banner_key_a", "1"); // key_a fermée, key_b ouverte

    render(
      <>
        <InfoBanner storageKey="key_a" title="Bannière A">Contenu A</InfoBanner>
        <InfoBanner storageKey="key_b" title="Bannière B">Contenu B</InfoBanner>
      </>
    );

    expect(screen.queryByText("Bannière A")).not.toBeInTheDocument();
    expect(screen.getByText("Bannière B")).toBeInTheDocument();
  });

  it("🔴 EC2 : Chaque instance utilise sa propre clé localStorage", () => {
    render(<InfoBanner storageKey="unique_key" title="Unique">X</InfoBanner>);
    fireEvent.click(screen.getByTitle("Fermer"));
    expect(localStorage.getItem("banner_unique_key")).toBe("1");
    expect(localStorage.getItem("banner_autre_key")).toBeNull();
  });
});
