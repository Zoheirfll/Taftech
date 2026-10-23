// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import DomaineSpecialites from "../src/Pages/Recruteur/CreateJob/DomaineSpecialites";

const domaines = [
  { id: 10, libelle: "Informatique, données et numérique", famille: "theme" },
  { id: 20, libelle: "Métiers des services", famille: "formation_professionnelle" },
  { id: 30, libelle: "Domaine vide", famille: "superieur" },
];
const specialites = [
  { id: 1, libelle: "Réseaux", domaine_id: 10 },
  { id: 2, libelle: "Génie logiciel", domaine_id: 10 },
  { id: 3, libelle: "Esthétique", domaine_id: 20 },
];
const reseaux = { id: 1, libelle: "Réseaux" };
const logiciel = { id: 2, libelle: "Génie logiciel" };
const esthetique = { id: 3, libelle: "Esthétique" };

const afficher = (specialitesRequises = []) => {
  const onAjouter = vi.fn();
  const onRetirer = vi.fn();
  render(
    <DomaineSpecialites domaines={domaines} specialites={specialites} specialitesRequises={specialitesRequises}
      onAjouter={onAjouter} onRetirer={onRetirer} />,
  );
  return { onAjouter, onRetirer };
};

const ouvrirListe = () => {
  const champ = screen.getByLabelText(/domaine de formation/i);
  fireEvent.focus(champ);
  fireEvent.keyDown(champ, { key: "ArrowDown", keyCode: 40 });
};

const choisirDomaine = (libelle) => {
  ouvrirListe();
  fireEvent.click(screen.getByText(libelle));
};

describe("🎓 <DomaineSpecialites /> — un domaine = une pastille, ses spécialités s'ouvrent au clic", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("🟢 Ne s'affiche pas sans domaine", () => {
    const { container } = render(
      <DomaineSpecialites domaines={[]} specialites={specialites} specialitesRequises={[]} onAjouter={vi.fn()} onRetirer={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("🟢 Les domaines sont regroupés par niveau, jamais mélangés", () => {
    afficher();
    ouvrirListe();
    expect(screen.getByText("Formation professionnelle")).toBeInTheDocument();
    expect(screen.getByText("Thèmes généraux TafTech")).toBeInTheDocument();
  });

  it("🟢 Un domaine sans spécialité sélectionnable n'est pas proposé", () => {
    afficher();
    ouvrirListe();
    expect(screen.queryByText(/Domaine vide/)).toBeNull();
  });

  it("🟢 Choisir un domaine ajoute d'emblée toutes ses spécialités", () => {
    const { onAjouter } = afficher();
    choisirDomaine("Informatique, données et numérique (2)");
    expect(onAjouter).toHaveBeenCalledTimes(1);
    expect(onAjouter.mock.calls[0][0].map((s) => s.id)).toEqual([1, 2]);
  });

  it("🟡 Choisir un domaine déjà en partie ajouté n'ajoute que ce qui manque", () => {
    const { onAjouter } = afficher([reseaux]);
    choisirDomaine("Informatique, données et numérique (2)");
    expect(onAjouter.mock.calls[0][0].map((s) => s.id)).toEqual([2]);
  });

  it("🟢 Un domaine choisi s'affiche en une pastille, sans lister ses spécialités", () => {
    afficher([reseaux, logiciel]);
    expect(screen.getByRole("button", { name: "Informatique, données et numérique (2/2)" })).toBeInTheDocument();
    expect(screen.queryByText("Réseaux")).toBeNull();
    expect(screen.queryByText("Génie logiciel")).toBeNull();
  });

  it("🟢 Une sélection partielle l'indique : « 1/2 »", () => {
    afficher([reseaux]);
    expect(screen.getByRole("button", { name: "Informatique, données et numérique (1/2)" })).toBeInTheDocument();
  });

  it("🟢 Un clic sur la pastille déplie les spécialités du domaine, cochées si choisies", () => {
    afficher([reseaux]);
    const pastille = screen.getByRole("button", { name: "Informatique, données et numérique (1/2)" });
    expect(pastille).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(pastille);
    expect(pastille).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Réseaux")).toBeChecked();
    expect(screen.getByLabelText("Génie logiciel")).not.toBeChecked();
  });

  it("🔴 Une spécialité d'un autre domaine n'apparaît jamais (l'esthétique n'est pas dans l'informatique)", () => {
    afficher([reseaux, esthetique]);
    fireEvent.click(screen.getByRole("button", { name: "Informatique, données et numérique (1/2)" }));
    expect(screen.queryByLabelText("Esthétique")).toBeNull();
  });

  it("🟢 Décocher une spécialité la retire", () => {
    const { onRetirer } = afficher([reseaux, logiciel]);
    fireEvent.click(screen.getByRole("button", { name: "Informatique, données et numérique (2/2)" }));
    fireEvent.click(screen.getByLabelText("Réseaux"));
    expect(onRetirer).toHaveBeenCalledWith(1);
  });

  it("🟢 Recocher une spécialité la remet", () => {
    const { onAjouter } = afficher([reseaux]);
    fireEvent.click(screen.getByRole("button", { name: "Informatique, données et numérique (1/2)" }));
    fireEvent.click(screen.getByLabelText("Génie logiciel"));
    expect(onAjouter.mock.calls[0][0].map((s) => s.id)).toEqual([2]);
  });

  it("🟢 La croix de la pastille retire toutes les spécialités choisies du domaine", () => {
    const { onRetirer } = afficher([reseaux, logiciel, esthetique]);
    fireEvent.click(screen.getByRole("button", { name: "Retirer le domaine Informatique, données et numérique" }));
    expect(onRetirer.mock.calls.map((c) => c[0])).toEqual([1, 2]);
  });

  it("🟡 Une spécialité choisie hors des domaines connus reste visible et retirable", () => {
    const { onRetirer } = afficher([{ id: 99, libelle: "Cybersécurité" }]);
    expect(screen.getByText("Cybersécurité")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retirer Cybersécurité" }));
    expect(onRetirer).toHaveBeenCalledWith(99);
  });
});
