// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { MetierAutocomplete } from "../src/Components/MetierAutocomplete";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";
import toast from "react-hot-toast";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: {
    searchMetiers: vi.fn(),
    creerDemandeAjout: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn(), loading: vi.fn() },
}));

const saisir = (valeur) => fireEvent.change(screen.getByRole("textbox"), { target: { value: valeur } });

describe("💡 Proposer un métier absent de la liste", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    jobsService.searchMetiers.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Le lien « Autre, préciser » est visible dès le départ avec la prop proposable", () => {
    render(<MetierAutocomplete proposable />);
    expect(screen.getByText("Autre, préciser")).toBeInTheDocument();
  });

  it("🔒 Sans la prop (filtres de recherche, admin) : jamais de lien de proposition", () => {
    render(<MetierAutocomplete />);
    saisir("Technicien drone");
    expect(screen.queryByText("Autre, préciser")).toBeNull();
  });

  it("🟢 Envoi : la fenêtre reprend la saisie et envoie intitulé et précision", async () => {
    jobsService.creerDemandeAjout.mockResolvedValue({ message: "Merci, votre proposition sera examinée." });
    render(<MetierAutocomplete proposable />);
    saisir("Technicien drone");
    fireEvent.click(screen.getByText("Autre, préciser"));

    const dialogue = await screen.findByRole("dialog", { name: "Proposer un métier" });
    expect(dialogue).toBeInTheDocument();
    expect(screen.getByLabelText(/Intitulé du métier/)).toHaveValue("Technicien drone");
    fireEvent.change(screen.getByLabelText(/Précision/), { target: { value: "inspection de lignes" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(jobsService.creerDemandeAjout).toHaveBeenCalledWith("METIER", "Technicien drone", "inspection de lignes"));
    expect(toast.success).toHaveBeenCalledWith("Merci, votre proposition sera examinée.");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Proposer un métier" })).toBeNull());
  });

  it("🟢 Écran du candidat (onPropose) : la proposition est transmise à l'écran, qui la garde sélectionnée", async () => {
    jobsService.creerDemandeAjout.mockResolvedValue({ id: 55, message: "Merci, votre demande sera examinée." });
    const onPropose = vi.fn();
    render(<MetierAutocomplete proposable onPropose={onPropose} />);
    saisir("Technicien drone");
    fireEvent.click(screen.getByText("Autre, préciser"));
    expect(await screen.findByText(/reste sélectionnée sur votre profil/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(onPropose).toHaveBeenCalledWith({ id: 55, libelle: "Technicien drone" }));
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("reste sélectionnée"));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Proposer un métier" })).toBeNull());
  });

  it("🔒 Sans onPropose (recruteur, admin) : rien n'est transmis, message historique conservé", async () => {
    jobsService.creerDemandeAjout.mockResolvedValue({ id: 56, message: "Merci, votre demande sera examinée." });
    render(<MetierAutocomplete proposable />);
    saisir("Technicien drone");
    fireEvent.click(screen.getByText("Autre, préciser"));
    expect(await screen.findByText(/choisissez le métier le plus proche/)).toBeInTheDocument();
  });

  it("🔴 Refus du serveur (métier déjà présent) : message affiché, fenêtre conservée", async () => {
    jobsService.creerDemandeAjout.mockRejectedValue({
      response: { data: { error: "Ce métier existe déjà dans la liste (« Développeur web »). Choisissez-le dans la recherche.", code: "METIER_EXISTANT" } },
    });
    render(<MetierAutocomplete proposable />);
    saisir("Développeur web");
    fireEvent.click(screen.getByText("Autre, préciser"));
    fireEvent.click(await screen.findByRole("button", { name: "Envoyer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Ce métier existe déjà dans la liste");
    expect(screen.getByRole("dialog", { name: "Proposer un métier" })).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("🟢 Annuler ferme la fenêtre sans rien envoyer", async () => {
    render(<MetierAutocomplete proposable />);
    saisir("Technicien drone");
    fireEvent.click(screen.getByText("Autre, préciser"));
    fireEvent.click(await screen.findByRole("button", { name: "Annuler" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Proposer un métier" })).toBeNull());
    expect(jobsService.creerDemandeAjout).not.toHaveBeenCalled();
  });
});
