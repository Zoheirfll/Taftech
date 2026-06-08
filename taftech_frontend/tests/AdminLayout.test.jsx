// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "../src/Pages/Admin/AdminLayout";

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
    expect(screen.getByText("TAFTECH")).toBeInTheDocument();
    expect(screen.getByText("Super Admin")).toBeInTheDocument();
    expect(screen.getByText(/Vue d'ensemble/i)).toBeInTheDocument();
    expect(screen.getByText(/Entreprises/i)).toBeInTheDocument();
    expect(screen.getByText(/Offres d'emploi/i)).toBeInTheDocument();
    expect(screen.getByText(/Candidatures/i)).toBeInTheDocument();
    expect(screen.getByText(/Utilisateurs/i)).toBeInTheDocument();
    expect(screen.getByText(/Diffusion/i)).toBeInTheDocument();
    expect(screen.getByText(/Quitter l'admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Quitter l'admin/i).closest("a")).toHaveAttribute(
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
    const linkEntreprises = screen.getByRole("link", { name: /Entreprises/i });
    expect(linkEntreprises).toHaveClass("bg-indigo-600");
    const linkDashboard = screen.getByRole("link", { name: /Vue d'ensemble/i });
    expect(linkDashboard).not.toHaveClass("bg-indigo-600");
    expect(linkDashboard).toHaveClass("text-slate-400");
  });
});
