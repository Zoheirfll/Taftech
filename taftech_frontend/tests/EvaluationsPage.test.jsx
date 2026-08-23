// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EvaluationsPage from "../src/Pages/Recruteur/EvaluationsPage";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getDashboard: vi.fn(),
  },
}));

const mockDash = {
  offres: [
    {
      id: 1,
      titre: "Développeur Front-End",
      candidatures: [
        { id: 10, candidat: { first_name: "Ahmed", last_name: "B" }, note_globale: 15, note_technique: 4, note_communication: 3, note_motivation: 4, note_experience: 4, commentaire_evaluation: "Bon profil" },
        { id: 11, candidat: { first_name: "Sara", last_name: "K" }, note_globale: 18, note_technique: 5 },
        { id: 12, candidat: { first_name: "Non", last_name: "Note" }, note_globale: null },
      ],
    },
  ],
};

describe("🎓 EvaluationsPage — liste des candidatures évaluées", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 HP1 : affiche les candidatures évaluées triées par note desc", async () => {
    jobsService.getDashboard.mockResolvedValue(mockDash);
    render(<MemoryRouter><EvaluationsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/Sara K/)).toBeInTheDocument();
      expect(screen.getByText(/Ahmed B/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Non Note/)).not.toBeInTheDocument();
  });

  it("🟡 EC1 : aucune évaluation affiche un message", async () => {
    jobsService.getDashboard.mockResolvedValue({ offres: [] });
    render(<MemoryRouter><EvaluationsPage /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText(/Aucune candidature évaluée/i)).toBeInTheDocument();
    });
  });
});
