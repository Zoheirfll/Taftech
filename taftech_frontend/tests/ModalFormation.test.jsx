// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModalFormation } from "../src/Pages/Candidat/ProfilCandidat/ModalFormation";

// Faux sélecteur : le bouton simule le choix d'un type de diplôme dans la liste du référentiel.
vi.mock("../src/Components/FormationReferentielSelect", () => ({
  FormationReferentielSelect: (props) => (
    <button type="button" data-testid="choisir-licence" onClick={() => props.onChangeDiplome(9, "Licence académique")} />
  ),
}));

const afficher = (newForm = {}) => {
  const setNewForm = vi.fn();
  render(
    <ModalFormation
      inputClass="champ" modalClass="modal" modalInnerClass="modal-interieur" btnPrimary="btn" btnCancel="btn"
      showFormForm setShowFormForm={vi.fn()} newForm={{ diplome: "Master", etablissement: "Université Oran 1", ...newForm }}
      setNewForm={setNewForm} editingFormId={5} setEditingFormId={vi.fn()} profil={{}}
      handleAddFormation={vi.fn()} handleUpdateFormation={vi.fn()}
    />,
  );
  return setNewForm;
};

describe("ModalFormation — intitulé de la formation", () => {
  afterEach(cleanup);

  const MASTER = "DIPLÔME DE MASTER EN INFORMATIQUE (AIDE À LA DÉCISION ET SYSTÈMES INTELLIGENTS)";

  it("affiche l'intitulé du CV dans un champ modifiable", () => {
    const setNewForm = afficher({ diplome: MASTER });
    expect(screen.getByLabelText(/Intitulé de la formation/i)).toHaveValue(MASTER);
    fireEvent.change(screen.getByLabelText(/Intitulé de la formation/i), { target: { value: "Master informatique" } });
    expect(setNewForm).toHaveBeenCalledWith(expect.objectContaining({ diplome: "Master informatique", etablissement: "Université Oran 1" }));
  });

  it("garde un intitulé personnalisé quand on change de type de diplôme", () => {
    const setNewForm = afficher({ diplome: MASTER, diplome_ref_libelle: "Master académique" });
    fireEvent.click(screen.getByTestId("choisir-licence"));
    const apres = setNewForm.mock.calls[0][0]({ diplome: MASTER, diplome_ref_libelle: "Master académique" });
    expect(apres).toMatchObject({ diplome: MASTER, diplome_ref: 9, diplome_ref_libelle: "Licence académique" });
  });

  it("met à jour l'intitulé quand il n'était que le libellé du type précédent", () => {
    const setNewForm = afficher({ diplome: "Master académique", diplome_ref_libelle: "Master académique" });
    fireEvent.click(screen.getByTestId("choisir-licence"));
    const apres = setNewForm.mock.calls[0][0]({ diplome: "Master académique", diplome_ref_libelle: "Master académique" });
    expect(apres).toMatchObject({ diplome: "Licence académique", diplome_ref: 9 });
  });
});

describe("ModalFormation — note libre (mémoire, mention)", () => {
  afterEach(cleanup);

  it("affiche la note existante dans un champ modifiable", () => {
    afficher({ description: "Mémoire : Ordonnancement multi-objectif" });
    expect(screen.getByLabelText(/Description ou mention/i)).toHaveValue("Mémoire : Ordonnancement multi-objectif");
  });

  it("enregistre la modification de la note sans toucher aux autres champs", () => {
    const setNewForm = afficher({ description: "Mémoire : A" });
    fireEvent.change(screen.getByLabelText(/Description ou mention/i), { target: { value: "Mémoire : B" } });
    expect(setNewForm).toHaveBeenCalledWith(expect.objectContaining({
      description: "Mémoire : B", diplome: "Master", etablissement: "Université Oran 1",
    }));
  });
});
