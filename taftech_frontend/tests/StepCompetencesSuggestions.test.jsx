// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React, { useState } from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { StepCompetences } from "../src/Pages/Candidat/Onboarding/steps/StepCompetences";
import { jobsService } from "../src/Services/jobsService";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    searchCompetences: vi.fn(),
    getMetierSuggestions: vi.fn(),
  },
}));

// Conteneur d'état : l'assistant garde les compétences en attente dans son hook, ici dans un état local.
const Harness = ({ initial = [], metierIds = [7] }) => {
  const [pendingCompetences, setPendingCompetences] = useState(initial);
  return (
    <>
      <StepCompetences
        pendingCompetences={pendingCompetences}
        setPendingCompetences={setPendingCompetences}
        competencesMode="remplacer"
        setCompetencesMode={vi.fn()}
        saveCompetencesStep={vi.fn()}
        skipStep={vi.fn()}
        profil={{ competences_detail: [] }}
        saving={false}
        metierIds={metierIds}
      />
      <output data-testid="etat">{JSON.stringify(pendingCompetences.map((c) => [c.label, c.niveau, c.dans_referentiel]))}</output>
    </>
  );
};

describe("Assistant d'import : compétences suggérées pour le métier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobsService.searchCompetences.mockResolvedValue([]);
    jobsService.getMetierSuggestions.mockResolvedValue({
      competences: [{ id: 12, label: "Kaizen" }, { id: 13, label: "Audit interne" }],
    });
  });
  afterEach(() => cleanup());

  it("propose les compétences du métier sans rien ajouter d'office", async () => {
    render(<Harness />);
    expect(await screen.findByRole("button", { name: "Ajouter Kaizen" })).toBeInTheDocument();
    expect(screen.getByTestId("etat")).toHaveTextContent("[]");
  });

  it("ajoute la compétence choisie au niveau Débutant, reconnue par le référentiel", async () => {
    render(<Harness />);
    fireEvent.click(await screen.findByRole("button", { name: "Ajouter Kaizen" }));
    await waitFor(() => expect(screen.getByTestId("etat")).toHaveTextContent('[["Kaizen","DEBUTANT",true]]'));
    expect(screen.queryByRole("button", { name: "Ajouter Kaizen" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter Audit interne" })).toBeInTheDocument();
  });

  it("ne repropose pas une compétence déjà détectée dans le CV", async () => {
    render(<Harness initial={[{ label: "kaizen", niveau: "AVANCE", dans_referentiel: true, intitule_cv: null }]} />);
    expect(await screen.findByRole("button", { name: "Ajouter Audit interne" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajouter Kaizen" })).not.toBeInTheDocument();
  });

  it("sans métier, n'interroge pas le serveur", async () => {
    render(<Harness metierIds={[]} />);
    await waitFor(() => expect(screen.getByTestId("etat")).toBeInTheDocument());
    expect(jobsService.getMetierSuggestions).not.toHaveBeenCalled();
    expect(screen.queryByText(/Compétences souvent liées/)).not.toBeInTheDocument();
  });
});
