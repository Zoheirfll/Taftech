// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminLayout from "../src/Pages/Admin/AdminLayout";
import { adminService } from "../src/Services/adminService";
import { authService } from "../src/Services/authService";

vi.mock("../src/Services/adminService", () => ({
  adminService: { getAdminStats: vi.fn() },
}));

vi.mock("../src/Services/authService", () => ({
  authService: { logout: vi.fn() },
}));

const DummyDashboard = () => (
  <div data-testid="dummy-dashboard">Dashboard Content</div>
);
const DummyEntreprises = () => (
  <div data-testid="dummy-entreprises">Entreprises Content</div>
);

describe("🗂️ UI & Routage - Composant <AdminLayout />", () => {
  beforeEach(() => {
    adminService.getAdminStats.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Référentiels : 4 entrées, avec les badges de demandes à examiner", async () => {
    adminService.getAdminStats.mockResolvedValue({
      demandes_a_examiner: { METIER: 4, DIPLOME: 3, SPECIALITE: 2, COMPETENCE: 5 },
    });
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    );
    const badge = async (nom, nombre) => {
      const lien = screen.getByRole("link", { name: new RegExp(`^${nom}`) });
      await waitFor(() => expect(lien).toHaveTextContent(String(nombre)));
    };
    await badge("Métiers", 4);
    await badge("Formations", 3);
    await badge("Spécialités", 2);
    await badge("Compétences", 5);
    expect(screen.queryByRole("link", { name: /Similarités/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Métiers suggérés/ })).toBeNull();
  });

  it("🟢 Happy Path 1 : Rendu de la structure statique (Logo & Liens)", () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    );
    expect(screen.getByText("TAFTECH")).toBeInTheDocument();
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

  it("🟢 Statut : « Super Admin » seulement si l'API confirme is_superuser", async () => {
    adminService.getAdminStats.mockResolvedValue({ est_super_admin: true });
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Super Admin")).toBeInTheDocument();
    expect(screen.queryByText("Administrateur")).toBeNull();
  });

  it("🔒 Statut : un admin simple s'affiche « Administrateur », jamais « Super Admin »", async () => {
    adminService.getAdminStats.mockResolvedValue({ est_super_admin: false });
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Administrateur")).toBeInTheDocument();
    expect(screen.queryByText("Super Admin")).toBeNull();
  });

  it("🟢 Déconnexion : le panel admin a son propre bouton (sans barre publique)", () => {
    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Déconnexion/ }));
    expect(authService.logout).toHaveBeenCalledWith("/login");
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
    expect(linkEntreprises).toHaveClass("bg-indigo-50", "text-indigo-700");
    const linkDashboard = screen.getByRole("link", { name: /Vue d'ensemble/i });
    expect(linkDashboard).not.toHaveClass("bg-indigo-50");
    expect(linkDashboard).toHaveClass("text-slate-600");
  });
});
