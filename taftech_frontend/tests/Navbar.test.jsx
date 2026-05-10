// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "../src/components/Navbar";
import { authService } from "../src/Services/authService";
import { profilService } from "../src/Services/profilService";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

// MOCKS
vi.mock("../src/Services/authService", () => ({
  authService: {
    isAuthenticated: vi.fn(),
    getUserRole: vi.fn(),
    logout: vi.fn(),
  },
}));
vi.mock("../src/Services/profilService", () => ({
  profilService: { getProfil: vi.fn() },
}));
vi.mock("../src/Services/jobsService", () => ({
  jobsService: { getNotifications: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

describe("🖥️ UI & Logique - Composant <Navbar />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Happy Path 1 : Rendu Visiteur (Non connecté)", () => {
    authService.isAuthenticated.mockReturnValue(false);
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Se connecter/i)).toBeInTheDocument();
    expect(screen.getByText(/S'inscrire/i)).toBeInTheDocument();
    expect(screen.queryByText(/Mon Compte/i)).not.toBeInTheDocument();
  });

  it("🟢 Happy Path 2 : Rendu Candidat avec Notifications et Photo", async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue("CANDIDAT");
    profilService.getProfil.mockResolvedValue({
      photo_profil: "/media/photo.jpg",
    });
    jobsService.getNotifications.mockResolvedValue([
      { lue: false },
      { lue: false },
    ]);

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.getByAltText("Profil")).toHaveAttribute(
        "src",
        "http://127.0.0.1:8000/media/photo.jpg",
      );
    });

    fireEvent.click(screen.getByText(/Mon Compte/i));
    expect(screen.getByText(/Mes candidatures/i)).toBeInTheDocument();
  });

  it("🟢 Happy Path 3 : Menu Déroulant Recruteur", async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue("RECRUTEUR");
    profilService.getProfil.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText(/Mon Compte/i));

    await waitFor(() => {
      expect(screen.getByText(/CVthèque/i)).toBeInTheDocument();
      expect(screen.getByText(/Publier une offre/i)).toBeInTheDocument();
      expect(screen.queryByText(/Mes candidatures/i)).not.toBeInTheDocument();
    });
  });

  it("🟢 Happy Path 4 : Déconnexion réussie", async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.getUserRole.mockReturnValue("ADMIN");
    profilService.getProfil.mockResolvedValue({});

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText(/Mon Compte/i));
    fireEvent.click(screen.getByText(/Déconnexion/i));

    await waitFor(() => {
      expect(authService.logout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
  });
});
