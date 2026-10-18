// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import BlocFormationRequise from "../src/Pages/Recruteur/CreateJob/BlocFormationRequise";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { creerDemandeAjout: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const job = () => ({
  diplomesGroupes: [], specialitesGroupes: [], draftDiplomeId: "", setDraftDiplomeId: vi.fn(),
  draftSpecialiteId: "", setDraftSpecialiteId: vi.fn(), diplomesRequis: [], specialitesRequises: [],
  ajouterDiplomeRequis: vi.fn(), retirerDiplomeRequis: vi.fn(), ajouterDiplomeSuggere: vi.fn(),
  ajouterSpecialiteRequise: vi.fn(), retirerSpecialiteRequise: vi.fn(), ajouterSpecialiteSuggeree: vi.fn(),
  suggestionsPourMetier: { diplomes: [], specialites: [], elargi: false, avertissement: "" },
});

describe("🎓 <BlocFormationRequise /> — demander un diplôme ou une spécialité absent de la liste", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Un lien sous chaque liste, sans fenêtre ouverte au départ", () => {
    render(<BlocFormationRequise job={job()} />);
    expect(screen.getAllByRole("button", { name: "Autre, préciser" })).toHaveLength(2);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("🟢 Demande d'un type de diplôme manquant", async () => {
    jobsService.creerDemandeAjout.mockResolvedValue({ message: "Merci." });
    render(<BlocFormationRequise job={job()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Autre, préciser" })[0]);

    const dialogue = await screen.findByRole("dialog", { name: "Demander l'ajout d'un type de diplôme" });
    expect(dialogue).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Intitulé du type de diplôme/), { target: { value: "Licence professionnelle" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(jobsService.creerDemandeAjout).toHaveBeenCalledWith("DIPLOME", "Licence professionnelle", ""));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("🟢 Demande d'une spécialité manquante", async () => {
    jobsService.creerDemandeAjout.mockResolvedValue({ message: "Merci." });
    render(<BlocFormationRequise job={job()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Autre, préciser" })[1]);

    await screen.findByRole("dialog", { name: "Demander l'ajout d'une spécialité" });
    fireEvent.change(screen.getByLabelText(/Intitulé de la spécialité/), { target: { value: "Cybersécurité" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(jobsService.creerDemandeAjout).toHaveBeenCalledWith("SPECIALITE", "Cybersécurité", ""));
  });

  it("🟡 Annuler referme la fenêtre sans envoi", async () => {
    render(<BlocFormationRequise job={job()} />);
    fireEvent.click(screen.getAllByRole("button", { name: "Autre, préciser" })[0]);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(jobsService.creerDemandeAjout).not.toHaveBeenCalled();
  });
});
