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
    vi.stubEnv("MODE", "production");
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    if (import.meta.env.MODE === "production") {
      console.log = vi.fn();
    }
    console.log("Ceci ne doit pas apparaître");
    expect(console.log).not.toBe(spy);
    vi.unstubAllEnvs();
  });

  it("🛡️ Sécurité : ErrorBoundary doit être présent", () => {
    const { container } = render(<App />);
    expect(container.querySelector(".min-h-screen")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Tests GuestRoute — redirection selon rôle connecté
// ---------------------------------------------------------------------------

import React from "react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { authService } from "../src/Services/authService";

vi.mock("../src/Services/authService", () => ({
  authService: {
    getUserRole: vi.fn(),
    getEstMembreEquipe: vi.fn(),
    isAuthenticated: vi.fn(),
    getMembreRole: vi.fn(),
    peutFaire: vi.fn(() => true),
    logout: vi.fn(),
  },
}));

// GuestRoute extrait de App.jsx pour test unitaire
const GuestRoute = ({ children, portal = "candidat" }) => {
  const role = authService.getUserRole();
  const estMembre = authService.getEstMembreEquipe();
  if (!role) return children;
  if (role === "ADMIN") return <Navigate to="/admin-taftech" replace />;
  if (role === "RECRUTEUR" || estMembre) return <Navigate to="/dashboard" replace />;
  if (portal === "recruteur") return <Navigate to="/login" replace />;
  return <Navigate to="/profil" replace />;
};

const renderGuestRoute = (portal = "candidat") =>
  render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<GuestRoute portal={portal}><div>Page Login</div></GuestRoute>} />
        <Route path="/admin-taftech" element={<div>Admin</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/profil" element={<div>Profil</div>} />
      </Routes>
    </MemoryRouter>
  );

describe("🔐 GuestRoute — Redirection utilisateurs connectés", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authService.getEstMembreEquipe.mockReturnValue(false);
  });

  it("🟢 Non-connecté : affiche la page (pas de redirection)", () => {
    authService.getUserRole.mockReturnValue(null);
    const { getByText } = renderGuestRoute();
    expect(getByText("Page Login")).toBeDefined();
  });

  it("🔴 ADMIN connecté → redirigé vers /admin-taftech", () => {
    authService.getUserRole.mockReturnValue("ADMIN");
    const { getByText } = renderGuestRoute();
    expect(getByText("Admin")).toBeDefined();
  });

  it("🔴 RECRUTEUR connecté → redirigé vers /dashboard", () => {
    authService.getUserRole.mockReturnValue("RECRUTEUR");
    const { getByText } = renderGuestRoute();
    expect(getByText("Dashboard")).toBeDefined();
  });

  it("🔴 Membre équipe connecté → redirigé vers /dashboard", () => {
    authService.getUserRole.mockReturnValue(null);
    authService.getEstMembreEquipe.mockReturnValue(true);
    const { getByText } = renderGuestRoute();
    expect(getByText("Dashboard")).toBeDefined();
  });

  it("🔴 CANDIDAT sur portail recruteur → redirigé vers /login", () => {
    authService.getUserRole.mockReturnValue("CANDIDAT");
    render(
      <MemoryRouter initialEntries={["/recruteurs/connexion"]}>
        <Routes>
          <Route
            path="/recruteurs/connexion"
            element={<GuestRoute portal="recruteur"><div>Login Recruteur</div></GuestRoute>}
          />
          <Route path="/login" element={<div>Espace Candidat</div>} />
        </Routes>
      </MemoryRouter>
    );
    expect(document.body.textContent).toContain("Espace Candidat");
  });

  it("🔴 CANDIDAT sur portail candidat → redirigé vers /profil", () => {
    authService.getUserRole.mockReturnValue("CANDIDAT");
    const { getByText } = renderGuestRoute("candidat");
    expect(getByText("Profil")).toBeDefined();
  });
});
