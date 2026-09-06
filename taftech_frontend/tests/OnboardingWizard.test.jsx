// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import OnboardingWizard from "../src/Pages/Candidat/Onboarding/OnboardingWizard";
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { profilService } from "../src/Services/profilService";
import { jobsService } from "../src/Services/jobsService";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("../src/Services/profilService", () => ({
  profilService: {
    getProfil: vi.fn(),
    updateProfil: vi.fn(),
    addExperience: vi.fn(),
    deleteExperience: vi.fn(),
    addFormation: vi.fn(),
    deleteFormation: vi.fn(),
  },
}));
vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    getConstants: vi.fn(),
    parserCV: vi.fn(),
    ajouterCompetence: vi.fn(),
    supprimerCompetence: vi.fn(),
    searchCompetences: vi.fn(),
    getNomenclature: vi.fn().mockResolvedValue({
      secteurs: [{ code: "L", libelle: "Support à l'entreprise" }],
      domaines: [{ id: 1, code: "L18", libelle: "Systèmes d'information", secteur_code: "L" }],
      sous_domaines: [],
    }),
  },
}));
vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(() => "id"), dismiss: vi.fn() },
}));

const mockProfil = {
  first_name: "Karim", last_name: "Ali", telephone: "", wilaya: "", commune: "",
  diplome: "", specialite: "", sexe: "", date_naissance: "",
  experiences_detail: [], formations_detail: [], langues: "", competences_detail: [],
};

describe("OnboardingWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profilService.getProfil.mockResolvedValue(mockProfil);
    jobsService.getConstants.mockResolvedValue({ wilayas: [{ value: "16 - Alger", label: "16 - Alger" }], diplomes: [] });
    profilService.updateProfil.mockResolvedValue({});
    profilService.addExperience.mockResolvedValue({});
    profilService.addFormation.mockResolvedValue({});
    jobsService.ajouterCompetence.mockResolvedValue({});
  });
  afterEach(cleanup);

  it("affiche l'étape 1 avec le lien Passer cette étape", async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    expect(screen.getByText(/Passer cette étape/i)).toBeInTheDocument();
  });

  it("Passer cette étape avance à l'étape 2 sans appeler parserCV", async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i));
    await waitFor(() => expect(screen.getByText(/Infos personnelles/i)).toBeInTheDocument());
    expect(jobsService.parserCV).not.toHaveBeenCalled();
  });

  it("affiche le champ Sexe à l'étape 2 et sauvegarde avance à l'étape 3", async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i));

    await screen.findByLabelText(/Sexe/i);
    fireEvent.change(screen.getByLabelText(/Sexe/i), { target: { value: "HOMME" } });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    await waitFor(() => {
      expect(profilService.updateProfil).toHaveBeenCalled();
      expect(screen.getByText(/expérience\(s\) prête\(s\)/i)).toBeInTheDocument();
    });
  });

  it("parcourt les 8 étapes en tout skip jusqu'à l'écran Félicitations, puis navigue au dashboard", async () => {
    render(<MemoryRouter><OnboardingWizard mode="page" /></MemoryRouter>);
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 2

    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 3 (save infos)
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 4
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 5
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 6
    await screen.findByRole("button", { name: /Continuer/i });
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i })); // -> 7 (save compétences)
    await screen.findByText(/Passer cette étape/i);
    fireEvent.click(screen.getByText(/Passer cette étape/i)); // -> 8 (préférences)

    await screen.findByText(/Félicitations/i);
    fireEvent.click(screen.getByRole("button", { name: /Continuer/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard-candidat");
  });

  it("mode modal : le bouton Quitter demande confirmation puis appelle onClose", async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <OnboardingWizard mode="modal" onClose={onClose} />
        <ConfirmModalHost />
      </MemoryRouter>,
    );
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByLabelText(/Quitter/i));
    fireEvent.click(await screen.findByText(/Confirmer/i));
    expect(onClose).toHaveBeenCalled();
  });

  it("mode page : le bouton Quitter demande confirmation puis navigue vers le dashboard", async () => {
    render(
      <MemoryRouter>
        <OnboardingWizard mode="page" />
        <ConfirmModalHost />
      </MemoryRouter>,
    );
    await screen.findByText(/Upload CV/i);
    fireEvent.click(screen.getByLabelText(/Quitter/i));
    fireEvent.click(await screen.findByText(/Confirmer/i));
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard-candidat");
  });
});
