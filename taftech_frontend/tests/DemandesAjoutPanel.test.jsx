// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent, within } from "@testing-library/react";
import selectEvent from "react-select-event";
import toast from "react-hot-toast";
import DemandesAjoutPanel from "../src/Pages/Admin/demandes/DemandesAjoutPanel";
import { adminService } from "../src/Services/adminService";
import * as reporter from "../src/utils/errorReporter";

vi.mock("../src/Services/adminService", () => ({
  adminService: {
    getDemandesAjout: vi.fn(),
    getDemandeProches: vi.fn(),
    getDemandesParents: vi.fn(),
    accepterDemande: vi.fn(),
    rattacherDemande: vi.fn(),
    refuserDemande: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const ligne = (surcharge = {}) => ({
  id: 1, type: "DIPLOME", libelle: "Licence pro", contexte: "bac+3", statut: "A_EXAMINER", origine: "CANDIDAT",
  nb_demandeurs: 2, demandeurs_apercu: [{ nom: "Karim B.", email: "karim@test.dz", role: "CANDIDAT" }], nb_formations: 1,
  entree_id: null, entree_libelle: "", motif_refus: "", date_creation: "2026-10-14T10:00:00Z",
  transitions_possibles: ["ACCEPTEE", "RATTACHEE", "REFUSEE"],
  proches: [{ id: 7, libelle: "Licence", detail: "superieur_lmd" }],
  ...surcharge,
});

const reponse = (results, compteurs = {}) => ({
  results, count: results.length, total_pages: 1,
  compteurs: { TOUTES: results.length, A_EXAMINER: results.length, ACCEPTEE: 0, RATTACHEE: 0, REFUSEE: 0, ...compteurs },
});

const panneau = (props = {}) => render(<DemandesAjoutPanel type="DIPLOME" {...props} />);

describe("📥 <DemandesAjoutPanel /> — onglet Demandes du référentiel", () => {
  beforeEach(() => {
    vi.spyOn(reporter, "reportError").mockImplementation(() => {});
    adminService.getDemandesAjout.mockResolvedValue(reponse([ligne()]));
    adminService.getDemandeProches.mockResolvedValue({ proches: [] });
    adminService.getDemandesParents.mockResolvedValue({
      systemes: [{ valeur: "superieur_lmd", libelle: "superieur lmd", famille: "Enseignement supérieur" }],
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Affiche les demandes, leurs demandeurs et les compteurs par statut", async () => {
    panneau();
    expect(await screen.findByText("Licence pro")).toBeInTheDocument();
    expect(screen.getByText("bac+3")).toBeInTheDocument();
    expect(screen.getByText(/Candidat · 2 demandeur\(s\)/)).toBeInTheDocument();
    expect(screen.getByText(/Karim B\. et 1 autre\(s\)/)).toBeInTheDocument();
    expect(screen.getByText("1 formation(s)")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /À examiner/ })).toHaveTextContent("(1)");
    expect(screen.getByRole("tab", { name: /Refusées/ })).toHaveTextContent("(0)");
  });

  it("🟢 Charge d'abord les demandes à examiner du type demandé", async () => {
    panneau({ type: "SPECIALITE" });
    await waitFor(() =>
      expect(adminService.getDemandesAjout).toHaveBeenCalledWith({ type: "SPECIALITE", statut: "A_EXAMINER", search: "", page: 1 }),
    );
  });

  it("🟢 Changer de pastille recharge avec le nouveau statut", async () => {
    panneau();
    await screen.findByText("Licence pro");
    fireEvent.click(screen.getByRole("tab", { name: /Refusées/ }));
    await waitFor(() =>
      expect(adminService.getDemandesAjout).toHaveBeenLastCalledWith({ type: "DIPLOME", statut: "REFUSEE", search: "", page: 1 }),
    );
  });

  it("🟢 La recherche attend la fin de la saisie puis recharge", async () => {
    panneau();
    await screen.findByText("Licence pro");
    fireEvent.change(screen.getByLabelText("Rechercher une demande"), { target: { value: " master " } });
    await waitFor(() =>
      expect(adminService.getDemandesAjout).toHaveBeenLastCalledWith({ type: "DIPLOME", statut: "A_EXAMINER", search: "master", page: 1 }),
    );
  });

  it("🟡 Aucune demande : message propre au type", async () => {
    adminService.getDemandesAjout.mockResolvedValue(reponse([]));
    const { unmount } = panneau();
    expect(await screen.findByText("Aucune demande de type de diplôme.")).toBeInTheDocument();
    unmount();
    panneau({ type: "SPECIALITE" });
    expect(await screen.findByText("Aucune demande de spécialité.")).toBeInTheDocument();
  });

  it("🔒 Les actions suivent les transitions autorisées par le serveur", async () => {
    adminService.getDemandesAjout.mockResolvedValue(reponse([
      ligne({ id: 1, libelle: "Terminée", statut: "ACCEPTEE", transitions_possibles: [], proches: [] }),
      ligne({ id: 2, libelle: "Refusée", statut: "REFUSEE", transitions_possibles: ["ACCEPTEE", "RATTACHEE"], motif_refus: "Trop vague" }),
    ]));
    panneau();
    await screen.findByText("Terminée");
    expect(screen.queryByRole("button", { name: "Accepter Terminée" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Refuser Terminée" })).toBeNull();
    expect(screen.getByRole("button", { name: "Accepter Refusée" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rattacher Refusée" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refuser Refusée" })).toBeNull();
    expect(screen.getByText("Motif : Trop vague")).toBeInTheDocument();
  });

  it("🟢 Refuser : le motif est obligatoire, un motif rapide le remplit, la liste est rechargée", async () => {
    adminService.refuserDemande.mockResolvedValue(ligne({ statut: "REFUSEE" }));
    const onChange = vi.fn();
    panneau({ onChange });
    await screen.findByText("Licence pro");
    fireEvent.click(screen.getByRole("button", { name: "Refuser Licence pro" }));

    const dialogue = await screen.findByRole("dialog", { name: "Décision sur la demande" });
    const soumettre = within(dialogue).getByRole("button", { name: "Refuser" });
    expect(soumettre).toBeDisabled();
    fireEvent.click(within(dialogue).getByRole("button", { name: "Trop vague" }));
    expect(within(dialogue).getByLabelText(/Motif/)).toHaveValue("Trop vague");
    expect(soumettre).toBeEnabled();

    fireEvent.click(soumettre);
    await waitFor(() => expect(adminService.refuserDemande).toHaveBeenCalledWith(1, "Trop vague"));
    expect(toast.success).toHaveBeenCalledWith("Demande refusée");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(adminService.getDemandesAjout.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(onChange).toHaveBeenCalled();
  });

  it("🟢 Rattacher à une entrée proche", async () => {
    adminService.rattacherDemande.mockResolvedValue(ligne({ statut: "RATTACHEE" }));
    panneau();
    await screen.findByText("Licence pro");
    fireEvent.click(screen.getByRole("button", { name: "Rattacher Licence pro" }));

    const dialogue = await screen.findByRole("dialog", { name: "Décision sur la demande" });
    const soumettre = within(dialogue).getByRole("button", { name: "Rattacher" });
    expect(soumettre).toBeDisabled();
    fireEvent.click(within(dialogue).getByRole("button", { name: "Licence" }));
    expect(within(dialogue).getByText("Rattacher à : Licence")).toBeInTheDocument();
    fireEvent.click(soumettre);
    await waitFor(() => expect(adminService.rattacherDemande).toHaveBeenCalledWith(1, 7));
  });

  it("🟢 Rattacher : recherche libre d'une autre entrée", async () => {
    adminService.getDemandeProches.mockResolvedValue({ proches: [{ id: 9, libelle: "Master", detail: "superieur_lmd" }] });
    adminService.rattacherDemande.mockResolvedValue(ligne({ statut: "RATTACHEE" }));
    panneau();
    await screen.findByText("Licence pro");
    fireEvent.click(screen.getByRole("button", { name: "Rattacher Licence pro" }));
    const dialogue = await screen.findByRole("dialog", { name: "Décision sur la demande" });

    fireEvent.change(within(dialogue).getByLabelText("Chercher une autre entrée"), { target: { value: "mast" } });
    const resultat = await within(dialogue).findByText("Master");
    expect(adminService.getDemandeProches).toHaveBeenCalledWith(1, "mast");
    fireEvent.click(resultat);
    fireEvent.click(within(dialogue).getByRole("button", { name: "Rattacher" }));
    await waitFor(() => expect(adminService.rattacherDemande).toHaveBeenCalledWith(1, 9));
  });

  it("🟢 Accepter un type de diplôme : système obligatoire, libellé corrigeable", async () => {
    adminService.accepterDemande.mockResolvedValue(ligne({ statut: "ACCEPTEE" }));
    panneau();
    await screen.findByText("Licence pro");
    fireEvent.click(screen.getByRole("button", { name: "Accepter Licence pro" }));
    const dialogue = await screen.findByRole("dialog", { name: "Décision sur la demande" });

    const soumettre = within(dialogue).getByRole("button", { name: "Ajouter au référentiel" });
    expect(soumettre).toBeDisabled();
    fireEvent.change(within(dialogue).getByLabelText(/Libellé/), { target: { value: " Licence professionnelle " } });
    await selectEvent.select(within(dialogue).getByLabelText(/Système du nouveau diplôme/), "superieur lmd (Enseignement supérieur)");
    expect(soumettre).toBeEnabled();

    fireEvent.click(soumettre);
    await waitFor(() =>
      expect(adminService.accepterDemande).toHaveBeenCalledWith(1, {
        libelle: "Licence professionnelle", parent: "superieur_lmd", filiere_id: null, diplomes_ids: [],
      }),
    );
    expect(toast.success).toHaveBeenCalledWith("Demande acceptée\n« Licence professionnelle » ajoutée au référentiel.");
  });

  it("🟢 Accepter une spécialité : domaine, filière et diplômes concernés", async () => {
    adminService.getDemandesAjout.mockResolvedValue(reponse([ligne({ id: 5, type: "SPECIALITE", libelle: "Cybersécurité" })]));
    adminService.getDemandesParents.mockResolvedValue({
      domaines: [{ id: 3, libelle: "Informatique", famille: "", filieres: [{ id: 11, libelle: "Réseaux" }] }],
      diplomes: [{ id: 2, libelle: "Licence" }],
    });
    adminService.accepterDemande.mockResolvedValue(ligne({ statut: "ACCEPTEE" }));
    panneau({ type: "SPECIALITE" });
    await screen.findByText("Cybersécurité");
    fireEvent.click(screen.getByRole("button", { name: "Accepter Cybersécurité" }));
    const dialogue = await screen.findByRole("dialog", { name: "Décision sur la demande" });

    await selectEvent.select(within(dialogue).getByLabelText(/Domaine de la nouvelle spécialité/), "Informatique");
    await selectEvent.select(within(dialogue).getByLabelText(/Filière/), "Réseaux");
    await selectEvent.select(within(dialogue).getByLabelText(/Diplômes concernés/), "Licence");
    fireEvent.click(within(dialogue).getByRole("button", { name: "Ajouter au référentiel" }));
    await waitFor(() =>
      expect(adminService.accepterDemande).toHaveBeenCalledWith(5, {
        libelle: "Cybersécurité", parent: 3, filiere_id: 11, diplomes_ids: [2],
      }),
    );
  });

  it("🔴 Refus du serveur : message affiché, fenêtre conservée", async () => {
    adminService.refuserDemande.mockRejectedValue({ response: { data: { error: "Cette demande ne peut plus recevoir cette décision." } } });
    panneau();
    await screen.findByText("Licence pro");
    fireEvent.click(screen.getByRole("button", { name: "Refuser Licence pro" }));
    const dialogue = await screen.findByRole("dialog", { name: "Décision sur la demande" });
    fireEvent.change(within(dialogue).getByLabelText(/Motif/), { target: { value: "Hors périmètre" } });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Refuser" }));

    expect(await within(dialogue).findByRole("alert")).toHaveTextContent("Cette demande ne peut plus recevoir cette décision.");
    expect(screen.getByRole("dialog", { name: "Décision sur la demande" })).toBeInTheDocument();
  });

  it("🟢 Annuler ferme la fenêtre sans rien envoyer", async () => {
    panneau();
    await screen.findByText("Licence pro");
    fireEvent.click(screen.getByRole("button", { name: "Refuser Licence pro" }));
    const dialogue = await screen.findByRole("dialog", { name: "Décision sur la demande" });
    fireEvent.click(within(dialogue).getByRole("button", { name: "Annuler" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(adminService.refuserDemande).not.toHaveBeenCalled();
  });
});
