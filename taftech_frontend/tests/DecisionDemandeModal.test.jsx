// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import DecisionDemandeModal from "../src/Pages/Admin/demandes/DecisionDemandeModal";
import { adminService } from "../src/Services/adminService";

vi.mock("../src/Services/adminService", () => ({
  adminService: {
    accepterDemande: vi.fn(),
    rattacherDemande: vi.fn(),
    refuserDemande: vi.fn(),
    getDemandesParents: vi.fn(),
    getDemandeProches: vi.fn(),
    getExplorateurRecherche: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

const demandeCompetence = {
  id: 12,
  type: "COMPETENCE",
  libelle: "Amélioration continue",
  contexte: "",
  proches: [],
  transitions_possibles: ["ACCEPTEE", "RATTACHEE", "REFUSEE"],
};

const rendre = (demande = demandeCompetence) =>
  render(<DecisionDemandeModal demande={demande} modeInitial="ACCEPTER" onClose={vi.fn()} onDecidee={vi.fn()} />);

describe("Fenêtre de décision : lier une compétence acceptée à des métiers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminService.accepterDemande.mockResolvedValue({ statut: "ACCEPTEE" });
    adminService.getDemandesParents.mockResolvedValue({ groupes: [] });
    adminService.getExplorateurRecherche.mockResolvedValue({
      resultats: [{ id: 7, libelle: "Responsable qualité", groupe: "Qualité", appellations: [] }],
    });
  });
  afterEach(() => cleanup());

  it("propose le champ « Métiers concernés » pour une compétence, sans le rendre obligatoire", () => {
    rendre();
    expect(screen.getByLabelText(/Métiers concernés \(facultatif\)/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter au référentiel" })).toBeEnabled();
  });

  it("n'affiche pas ce champ pour un métier demandé", async () => {
    rendre({ ...demandeCompetence, type: "METIER", libelle: "Technicien drone" });
    await waitFor(() => expect(adminService.getDemandesParents).toHaveBeenCalled());
    expect(screen.queryByLabelText(/Métiers concernés/)).not.toBeInTheDocument();
  });

  it("envoie les métiers choisis à l'acceptation", async () => {
    rendre();
    const champ = screen.getByLabelText(/Métiers concernés \(facultatif\)/);
    fireEvent.change(champ, { target: { value: "quali" } });
    fireEvent.click(await screen.findByText("Responsable qualité (Qualité)"));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter au référentiel" }));
    await waitFor(() => expect(adminService.accepterDemande).toHaveBeenCalledTimes(1));
    const [id, corps] = adminService.accepterDemande.mock.calls[0];
    expect(id).toBe(12);
    expect(corps.metiers_ids).toEqual([7]);
  });

  it("accepte sans métier : la liste envoyée est vide", async () => {
    rendre();
    fireEvent.click(screen.getByRole("button", { name: "Ajouter au référentiel" }));
    await waitFor(() => expect(adminService.accepterDemande).toHaveBeenCalledTimes(1));
    expect(adminService.accepterDemande.mock.calls[0][1].metiers_ids).toEqual([]);
  });
});
