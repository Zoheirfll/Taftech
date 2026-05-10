// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import CandidatLayout from "../src/Pages/candidat/CandidatLayout";
import { jobsService } from "../src/Services/jobsService";
import { authService } from "../src/Services/authService";
import * as reporter from "../src/utils/errorReporter";

// MOCKS
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getNotifications: vi.fn(),
  },
}));

vi.mock("../src/Services/authService", () => ({
  authService: {
    logout: vi.fn(),
  },
}));

const mockNotifs = [
  { id: 1, lue: false },
  { id: 2, lue: false },
  { id: 3, lue: true },
];

describe("🏠 UI & Routage - Composant <CandidatLayout />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : Rendu du badge avec le nombre correct de messages non lus", async () => {
    jobsService.getNotifications.mockResolvedValue(mockNotifs);

    render(
      <MemoryRouter initialEntries={["/profil"]}>
        <CandidatLayout />
      </MemoryRouter>,
    );

    await waitFor(() => {
      // 2 notifications non lues dans le mock
      const badge = screen.getByText("2");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-red-500");
    });
  });

  it("🟢 HP2 : Surbrillance de l'onglet actif", async () => {
    jobsService.getNotifications.mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={["/mes-candidatures"]}>
        <CandidatLayout />
      </MemoryRouter>,
    );

    // ✅ CORRECTION : Utilisation d'une Regex plus souple (.*) pour gérer l'espace entre l'émoji et le texte
    const activeLink = screen.getByRole("link", {
      name: /💼.*mes candidatures/i,
    });
    expect(activeLink).toHaveClass("bg-blue-600");
  });

  it("🟢 HP3 : Appel de la déconnexion", async () => {
    jobsService.getNotifications.mockResolvedValue([]);
    render(
      <MemoryRouter>
        <CandidatLayout />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(/Déconnexion/i));
    expect(authService.logout).toHaveBeenCalled();
  });

  it("🔴 EC1 : Erreur API notifications déclenche reportError", async () => {
    jobsService.getNotifications.mockRejectedValue(new Error("Network Error"));

    render(
      <MemoryRouter>
        <CandidatLayout />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalledWith(
        "ECHEC_CHARGEMENT_NOTIFS_LAYOUT",
        expect.anything(),
      );
      // L'UI ne doit pas avoir de badge
      expect(screen.queryByText("2")).not.toBeInTheDocument();
    });
  });

  it("🔴 EC2 : Pas de badge si 0 message non lu", async () => {
    // Tous les messages sont lus
    jobsService.getNotifications.mockResolvedValue([{ id: 1, lue: true }]);

    render(
      <MemoryRouter>
        <CandidatLayout />
      </MemoryRouter>,
    );

    await waitFor(() => {
      const badge = screen.queryByText(/[0-9]/);
      expect(badge).not.toBeInTheDocument();
    });
  });
});
