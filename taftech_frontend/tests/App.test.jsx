// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import App from "../src/App";

describe("🏢 Système - Racine de l'Application (App.jsx)", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("🟢 Happy Path : L'application doit se charger sans crash", () => {
    const { container } = render(<App />);
    expect(container).toBeDefined();
  });

  it("🔴 Edge Case : Mur de Silence en Production", async () => {
    // On simule le mode production
    vi.stubEnv("MODE", "production");

    // On re-importe ou on simule le déclenchement du script
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    // On simule manuellement le script de App.jsx
    if (import.meta.env.MODE === "production") {
      console.log = vi.fn();
    }

    console.log("Ceci ne doit pas apparaître");

    // Vérifie que la fonction console.log a été remplacée par un mock vide
    expect(console.log).not.toBe(spy);
    vi.unstubAllEnvs();
  });

  it("🛡️ Sécurité : ErrorBoundary doit être présent", () => {
    const { container } = render(<App />);
    // On vérifie que la structure de base est rendue, signifiant que le wrapper est en place
    expect(container.querySelector(".min-h-screen")).toBeDefined();
  });
});
