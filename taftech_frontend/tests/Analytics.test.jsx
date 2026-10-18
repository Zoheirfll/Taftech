// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Analytics, { configurationAnalytics } from "../src/Components/Analytics";

const script = () => document.getElementById("taftech-analytics");
const monter = (url = "/") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Analytics />
    </MemoryRouter>,
  );

beforeEach(() => script()?.remove());
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("📈 Analytics sans cookie", () => {
  it("🟢 ne charge rien tant que rien n'est configuré", () => {
    monter();
    expect(script()).toBeNull();
  });

  it("🟢 Plausible : script https, domaine, exclusion de l'admin", () => {
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "plausible");
    vi.stubEnv("VITE_ANALYTICS_ID", "taftech.dz");
    monter();
    expect(script()).toHaveAttribute("src", "https://plausible.io/js/script.js");
    expect(script()).toHaveAttribute("data-domain", "taftech.dz");
    expect(script()).toHaveAttribute("data-exclude", "/admin-taftech/**");
    expect(script()).toHaveAttribute("defer");
  });

  it("🟢 Umami auto-hébergé : adresse de l'outil, identifiant du site, Do Not Track respecté", () => {
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "umami");
    vi.stubEnv("VITE_ANALYTICS_ID", "abc-123");
    vi.stubEnv("VITE_ANALYTICS_HOST", "https://stats.taftech.dz/");
    monter();
    expect(script()).toHaveAttribute("src", "https://stats.taftech.dz/script.js");
    expect(script()).toHaveAttribute("data-website-id", "abc-123");
    expect(script()).toHaveAttribute("data-do-not-track", "true");
  });

  it("🟡 jamais sur les pages d'administration", () => {
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "plausible");
    vi.stubEnv("VITE_ANALYTICS_ID", "taftech.dz");
    monter("/admin-taftech/dashboard");
    expect(script()).toBeNull();
  });

  it("🟡 chargé une seule fois même si le composant est remonté", () => {
    vi.stubEnv("VITE_ANALYTICS_PROVIDER", "plausible");
    vi.stubEnv("VITE_ANALYTICS_ID", "taftech.dz");
    monter();
    cleanup();
    monter();
    expect(document.querySelectorAll("#taftech-analytics")).toHaveLength(1);
  });

  it("🔴 refuse une adresse non sécurisée ou mal formée, un fournisseur inconnu, un identifiant absent", () => {
    expect(configurationAnalytics({ VITE_ANALYTICS_PROVIDER: "umami", VITE_ANALYTICS_ID: "x", VITE_ANALYTICS_HOST: "http://stats.test" })).toBeNull();
    expect(configurationAnalytics({ VITE_ANALYTICS_PROVIDER: "umami", VITE_ANALYTICS_ID: "x", VITE_ANALYTICS_HOST: "javascript:alert(1)" })).toBeNull();
    expect(configurationAnalytics({ VITE_ANALYTICS_PROVIDER: "umami", VITE_ANALYTICS_ID: "x" })).toBeNull();
    expect(configurationAnalytics({ VITE_ANALYTICS_PROVIDER: "google", VITE_ANALYTICS_ID: "x" })).toBeNull();
    expect(configurationAnalytics({ VITE_ANALYTICS_PROVIDER: "plausible" })).toBeNull();
  });
});
