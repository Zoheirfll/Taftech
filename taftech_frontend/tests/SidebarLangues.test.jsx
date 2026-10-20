// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import SidebarLangues from "../src/Pages/Candidat/ProfilCandidat/SidebarLangues";

const profil = { langues: "Arabe:Maternelle,Anglais:Avancé" };

const afficher = (surcharges = {}) => {
  const props = { profil, handleRemoveTag: vi.fn(), handleAddLanguage: vi.fn(), handleUpdateLanguage: vi.fn(), ...surcharges };
  render(<SidebarLangues {...props} />);
  return props;
};

describe("SidebarLangues", () => {
  afterEach(cleanup);

  it("permet de modifier le niveau d'une langue", () => {
    const props = afficher();
    fireEvent.click(screen.getByLabelText("Modifier la langue Anglais"));
    fireEvent.change(screen.getByLabelText("Niveau de la langue"), { target: { value: "Intermédiaire" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(props.handleUpdateLanguage).toHaveBeenCalledWith("Anglais:Avancé", "Anglais", "Intermédiaire");
  });

  it("permet de modifier le nom d'une langue et retire les séparateurs", () => {
    const props = afficher();
    fireEvent.click(screen.getByLabelText("Modifier la langue Arabe"));
    fireEvent.change(screen.getByLabelText("Nom de la langue"), { target: { value: "Arabe, littéraire:" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(props.handleUpdateLanguage).toHaveBeenCalledWith("Arabe:Maternelle", "Arabe littéraire", "Maternelle");
  });

  it("garde un niveau du CV absent de la liste tel quel et permet d'annuler", () => {
    const props = afficher();
    fireEvent.click(screen.getByLabelText("Modifier la langue Arabe"));
    expect(screen.getByLabelText("Niveau de la langue")).toHaveValue("Maternelle");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(props.handleUpdateLanguage).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Modifier la langue Arabe")).toBeInTheDocument();
  });

  it("n'enregistre pas un nom vide", () => {
    const props = afficher();
    fireEvent.click(screen.getByLabelText("Modifier la langue Anglais"));
    fireEvent.change(screen.getByLabelText("Nom de la langue"), { target: { value: "  " } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(props.handleUpdateLanguage).not.toHaveBeenCalled();
  });
});
