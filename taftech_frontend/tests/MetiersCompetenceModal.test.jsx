// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import MetiersCompetenceModal from "../src/Pages/Admin/MetiersCompetenceModal";
import { ConfirmModalHost } from "../src/utils/confirmToast";
import { adminService } from "../src/Services/adminService";

vi.mock("../src/Services/adminService", () => ({
  adminService: {
    getMetiersCompetence: vi.fn(),
    lierMetiersCompetence: vi.fn(),
    retirerMetierCompetence: vi.fn(),
    getExplorateurRecherche: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

const competence = { id: 4, label: "Kaizen" };
const classeur = { id: 1, libelle: "Responsable qualité", groupe: "Qualité", retirable: false };
const taftech = { id: 2, libelle: "Inspecteur qualité", groupe: "Qualité", retirable: true };

const rendre = (props = {}) =>
  render(
    <>
      <MetiersCompetenceModal competence={competence} onClose={vi.fn()} onChange={vi.fn()} {...props} />
      <ConfirmModalHost />
    </>,
  );

describe("Fenêtre « Métiers » d'une compétence officielle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminService.getMetiersCompetence.mockResolvedValue({ metiers: [classeur, taftech] });
    adminService.getExplorateurRecherche.mockResolvedValue({
      resultats: [{ id: 9, libelle: "Responsable production", groupe: "Industrie", appellations: [] }],
    });
  });
  afterEach(() => cleanup());

  it("liste les métiers liés ; seul un lien TafTech peut être retiré", async () => {
    rendre();
    expect(await screen.findByText("Responsable qualité")).toBeInTheDocument();
    expect(screen.getByText("Classeur")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retirer Responsable qualité" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirer Inspecteur qualité" })).toBeInTheDocument();
  });

  it("signale qu'aucun métier n'est lié", async () => {
    adminService.getMetiersCompetence.mockResolvedValue({ metiers: [] });
    rendre();
    expect(await screen.findByText(/n'apparaît dans aucune liste de suggestions/)).toBeInTheDocument();
  });

  it("ajoute les métiers choisis et prévient la page du nouveau total", async () => {
    adminService.lierMetiersCompetence.mockResolvedValue({
      metiers: [classeur, taftech, { id: 9, libelle: "Responsable production", groupe: "Industrie", retirable: true }],
      ajoutes: 1,
    });
    const onChange = vi.fn();
    rendre({ onChange });
    await screen.findByText("Responsable qualité");
    fireEvent.change(screen.getByLabelText("Ajouter des métiers"), { target: { value: "prod" } });
    fireEvent.click(await screen.findByText("Responsable production (Industrie)"));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    await waitFor(() => expect(adminService.lierMetiersCompetence).toHaveBeenCalledWith(4, [9]));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(3));
    expect(await screen.findByText("Responsable production")).toBeInTheDocument();
  });

  it("n'autorise l'ajout qu'une fois un métier choisi", async () => {
    rendre();
    await screen.findByText("Responsable qualité");
    expect(screen.getByRole("button", { name: "Ajouter" })).toBeDisabled();
  });

  it("retire un lien TafTech après confirmation", async () => {
    adminService.retirerMetierCompetence.mockResolvedValue({ metiers: [classeur] });
    const onChange = vi.fn();
    rendre({ onChange });
    fireEvent.click(await screen.findByRole("button", { name: "Retirer Inspecteur qualité" }));
    expect(adminService.retirerMetierCompetence).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByText("Confirmer"));
    await waitFor(() => expect(adminService.retirerMetierCompetence).toHaveBeenCalledWith(4, 2));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText("Inspecteur qualité")).not.toBeInTheDocument());
  });

  it("affiche le message du serveur si l'ajout est refusé", async () => {
    adminService.lierMetiersCompetence.mockRejectedValue({ response: { data: { error: "Métier introuvable dans le référentiel." } } });
    rendre();
    await screen.findByText("Responsable qualité");
    fireEvent.change(screen.getByLabelText("Ajouter des métiers"), { target: { value: "prod" } });
    fireEvent.click(await screen.findByText("Responsable production (Industrie)"));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Métier introuvable dans le référentiel.");
  });
});
