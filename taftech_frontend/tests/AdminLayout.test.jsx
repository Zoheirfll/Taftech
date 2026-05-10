// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "../src/Pages/Admin/AdminLayout";

// Un composant factice pour tester l'Outlet
const DummyDashboard = () => (
  <div data-testid="dummy-dashboard">Dashboard Content</div>
);
const DummyEntreprises = () => (
  <div data-testid="dummy-entreprises">Entreprises Content</div>
);

describe("🗂️ UI & Routage - Composant <AdminLayout />", () => {
  afterEach(() => {
    cleanup();
  });

  it("🟢 Happy Path 1 : Rendu de la structure statique (Logo & Liens)", () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    );

    // Vérification du Branding
    expect(screen.getByText("TAFTECH")).toBeInTheDocument();
    expect(screen.getByText("SUPER ADMIN")).toBeInTheDocument();

    // Vérification des liens de navigation
    expect(screen.getByText(/Vue d'ensemble/i)).toBeInTheDocument();
    expect(screen.getByText(/Entreprises/i)).toBeInTheDocument();
    expect(screen.getByText(/Offres d'emploi/i)).toBeInTheDocument();
    expect(screen.getByText(/Candidatures/i)).toBeInTheDocument();
    expect(screen.getByText(/Utilisateurs/i)).toBeInTheDocument();
    expect(screen.getByText(/Diffusion/i)).toBeInTheDocument();

    // Vérification du lien de sortie
    expect(screen.getByText(/Quitter l'Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Quitter l'Admin/i).closest("a")).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("🟢 Happy Path 2 : Injection du contenu dynamique (Outlet)", () => {
    render(
      <MemoryRouter initialEntries={["/admin-taftech/dashboard"]}>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route
              path="admin-taftech/dashboard"
              element={<DummyDashboard />}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // Vérifie que le composant factice est bien rendu DANS le layout
    expect(screen.getByTestId("dummy-dashboard")).toBeInTheDocument();
  });

  it("🟢 Happy Path 3 : Styles actifs sur les liens de navigation (NavLink)", () => {
    render(
      <MemoryRouter initialEntries={["/admin-taftech/entreprises"]}>
        <Routes>
          <Route path="/" element={<AdminLayout />}>
            <Route
              path="admin-taftech/entreprises"
              element={<DummyEntreprises />}
            />
            <Route
              path="admin-taftech/dashboard"
              element={<DummyDashboard />}
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    // ✅ CORRECTION : On cherche spécifiquement un LIEN (role: "link")
    const linkEntreprises = screen.getByRole("link", {
      name: /🏢 entreprises/i,
    });
    expect(linkEntreprises).toHaveClass("bg-blue-600");

    // Le lien inactif (Dashboard) ne doit PAS avoir la classe 'bg-blue-600'
    const linkDashboard = screen.getByRole("link", {
      name: /📊 vue d'ensemble/i,
    });
    expect(linkDashboard).not.toHaveClass("bg-blue-600");
    expect(linkDashboard).toHaveClass("text-gray-400");
  });
});
