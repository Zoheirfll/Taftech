// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import toast from "react-hot-toast";
import ProposerEntreeModal from "../src/Components/ProposerEntreeModal";
import { jobsService } from "../src/Services/jobsService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/jobsService", () => ({
  jobsService: { creerDemandeAjout: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe("💡 <ProposerEntreeModal /> — « Je ne trouve pas mon diplôme / ma spécialité »", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟡 Fermée : rien n'est affiché", () => {
    render(<ProposerEntreeModal open={false} type="DIPLOME" onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("🟢 Les textes suivent le type de demande", () => {
    const { unmount } = render(<ProposerEntreeModal open type="DIPLOME" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Demander l'ajout d'un type de diplôme" })).toBeInTheDocument();
    expect(screen.getByText("Je ne trouve pas mon diplôme")).toBeInTheDocument();
    expect(screen.getByLabelText(/Intitulé du type de diplôme/)).toBeInTheDocument();
    unmount();
    render(<ProposerEntreeModal open type="SPECIALITE" onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Demander l'ajout d'une spécialité" })).toBeInTheDocument();
    expect(screen.getByText("Je ne trouve pas ma spécialité")).toBeInTheDocument();
    expect(screen.getByLabelText(/Intitulé de la spécialité/)).toBeInTheDocument();
  });

  it("🟢 Reprend l'intitulé et la précision proposés à l'ouverture", () => {
    render(<ProposerEntreeModal open type="DIPLOME" libelleInitial="Licence pro" contexteInitial="bac+3" onClose={vi.fn()} />);
    expect(screen.getByLabelText(/Intitulé/)).toHaveValue("Licence pro");
    expect(screen.getByLabelText(/Précision/)).toHaveValue("bac+3");
  });

  it("🔒 Pas d'envoi sous 3 caractères", () => {
    render(<ProposerEntreeModal open type="DIPLOME" onClose={vi.fn()} />);
    const envoyer = screen.getByRole("button", { name: "Envoyer" });
    expect(envoyer).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Intitulé/), { target: { value: "ab" } });
    expect(envoyer).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Intitulé/), { target: { value: "abc" } });
    expect(envoyer).toBeEnabled();
  });

  it("🟢 Envoi : type, intitulé nettoyé et précision partent au serveur, puis la fenêtre se ferme", async () => {
    jobsService.creerDemandeAjout.mockResolvedValue({ message: "Merci, votre demande sera examinée par notre équipe." });
    const onClose = vi.fn();
    render(<ProposerEntreeModal open type="SPECIALITE" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Intitulé/), { target: { value: "  Cybersécurité " } });
    fireEvent.change(screen.getByLabelText(/Précision/), { target: { value: " Licence informatique " } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => expect(jobsService.creerDemandeAjout).toHaveBeenCalledWith("SPECIALITE", "Cybersécurité", "Licence informatique"));
    expect(toast.success).toHaveBeenCalledWith("Demande envoyée\nMerci, votre demande sera examinée par notre équipe.");
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("🔴 Refus du serveur (entrée déjà présente) : message affiché, fenêtre conservée", async () => {
    jobsService.creerDemandeAjout.mockRejectedValue({
      response: { data: { error: "Cette entrée existe déjà dans la liste (« Licence »). Choisissez-la dans la recherche.", code: "ENTREE_EXISTANTE" } },
    });
    const onClose = vi.fn();
    render(<ProposerEntreeModal open type="DIPLOME" libelleInitial="licence" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Cette entrée existe déjà dans la liste");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("🟢 Annuler ferme sans rien envoyer", () => {
    const onClose = vi.fn();
    render(<ProposerEntreeModal open type="DIPLOME" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onClose).toHaveBeenCalled();
    expect(jobsService.creerDemandeAjout).not.toHaveBeenCalled();
  });
});
