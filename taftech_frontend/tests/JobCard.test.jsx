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
import JobCard from "../src/Components/JobCard";
import { authService } from "../src/Services/authService";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

// MOCKS
vi.mock("../src/Services/authService", () => ({
  authService: { isAuthenticated: vi.fn() },
}));
vi.mock("../src/Services/jobsService", () => ({
  jobsService: { postuler: vi.fn() },
}));

const mockJob = {
  id: 1,
  titre: "Développeur Fullstack",
  entreprise: { nom_entreprise: "TafTech" },
  type_contrat: "CDI",
  wilaya: "Oran",
  experience_requise: "2 ans",
  salaire_propose: "80 000 DA",
  date_publication: "2026-05-01",
};

describe("💼 UI & Logique - Composant <JobCard />", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Success Path 1 : Candidature réussie", async () => {
    authService.isAuthenticated.mockReturnValue(true);
    jobsService.postuler.mockResolvedValue({ message: "Candidature envoyée" });

    render(
      <MemoryRouter>
        <JobCard job={mockJob} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(/Postuler/i));

    await waitFor(() => {
      expect(screen.getByText(/✅ Candidature envoyée/i)).toBeInTheDocument();
    });
  });

  it("🟢 Success Path 3 : Rendu Visiteur (Non connecté)", () => {
    authService.isAuthenticated.mockReturnValue(false);
    render(
      <MemoryRouter>
        <JobCard job={mockJob} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Connectez-vous pour postuler/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Postuler")).not.toBeInTheDocument();
  });

  it("🔴 Edge Case : Crash Serveur (500) -> reportError appelé", async () => {
    authService.isAuthenticated.mockReturnValue(true);
    jobsService.postuler.mockRejectedValue({ response: { status: 500 } });

    render(
      <MemoryRouter>
        <JobCard job={mockJob} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText(/Postuler/i));

    await waitFor(() => {
      expect(reporter.reportError).toHaveBeenCalled();
      expect(
        screen.getByText(/❌ Erreur lors de la candidature/i),
      ).toBeInTheDocument();
    });
  });
});
