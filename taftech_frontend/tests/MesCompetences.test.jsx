// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import MesCompetences from "../src/Pages/Candidat/MesCompetences";
import { jobsService } from "../src/Services/jobsService";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getMesCompetencesDetail: vi.fn(),
    getProfilCandidat: vi.fn(),
    getMetierSuggestions: vi.fn(),
    ajouterCompetence: vi.fn(),
    supprimerCompetence: vi.fn(),
    searchCompetences: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

const possedee = { id: 1, label: "Gestion de la qualité", niveau: "AVANCE" };

describe("Mes compétences : suggestions selon le métier du candidat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    jobsService.getMesCompetencesDetail.mockResolvedValue([possedee]);
    jobsService.getProfilCandidat.mockResolvedValue({
      metier_souhaite: 7,
      metier: 7,
      experiences_detail: [{ metier: 9 }, { metier: null }],
    });
    jobsService.getMetierSuggestions.mockImplementation(async (id) => ({
      competences:
        id === 7
          ? [{ id: 11, label: "Gestion de la qualité" }, { id: 12, label: "Kaizen" }]
          : [{ id: 12, label: "Kaizen" }, { id: 13, label: "Audit interne" }],
    }));
    jobsService.ajouterCompetence.mockImplementation(async (label, niveau) => ({ id: 99, label, niveau }));
  });
  afterEach(() => cleanup());

  it("interroge chaque métier une seule fois et propose ce que le candidat n'a pas déjà", async () => {
    render(<MesCompetences />);
    expect(await screen.findByRole("button", { name: "Ajouter Kaizen" }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter Audit interne" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajouter Gestion de la qualité" })).not.toBeInTheDocument();
    expect(jobsService.getMetierSuggestions).toHaveBeenCalledTimes(2);
    expect(jobsService.getMetierSuggestions.mock.calls.map((c) => c[0])).toEqual([7, 9]);
  });

  it("n'ajoute rien d'office : aucune compétence n'est enregistrée avant le clic", async () => {
    render(<MesCompetences />);
    await screen.findByRole("button", { name: "Ajouter Kaizen" }, { timeout: 5000 });
    expect(jobsService.ajouterCompetence).not.toHaveBeenCalled();
  });

  it("ajoute la compétence choisie au niveau Débutant puis la retire des suggestions", async () => {
    render(<MesCompetences />);
    fireEvent.click(await screen.findByRole("button", { name: "Ajouter Kaizen" }, { timeout: 5000 }));
    await waitFor(() => expect(jobsService.ajouterCompetence).toHaveBeenCalledWith("Kaizen", "DEBUTANT", "SUGGESTION"));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Ajouter Kaizen" })).not.toBeInTheDocument());
    expect(screen.getByText("Kaizen")).toBeInTheDocument();
  });

  it("repère « suggérée » les compétences venues des suggestions, et elles seules", async () => {
    jobsService.getMesCompetencesDetail.mockResolvedValue([
      possedee,
      { id: 2, label: "Kaizen", niveau: "DEBUTANT", origine: "SUGGESTION" },
    ]);
    render(<MesCompetences />);
    expect(await screen.findByText("Kaizen")).toBeInTheDocument();
    expect(screen.getAllByTitle("Choisie parmi les suggestions de votre métier")).toHaveLength(1);
  });

  it("sans métier renseigné, aucune suggestion n'est demandée", async () => {
    jobsService.getProfilCandidat.mockResolvedValue({ metier_souhaite: null, metier: null, experiences_detail: [] });
    render(<MesCompetences />);
    expect(await screen.findByText("Gestion de la qualité")).toBeInTheDocument();
    expect(jobsService.getMetierSuggestions).not.toHaveBeenCalled();
    expect(screen.queryByText(/Compétences souvent liées/)).not.toBeInTheDocument();
  });

  it("la page reste utilisable si le profil ne se charge pas", async () => {
    jobsService.getProfilCandidat.mockRejectedValue(new Error("réseau"));
    render(<MesCompetences />);
    expect(await screen.findByText("Gestion de la qualité")).toBeInTheDocument();
    expect(screen.queryByText(/Compétences souvent liées/)).not.toBeInTheDocument();
  });
});
