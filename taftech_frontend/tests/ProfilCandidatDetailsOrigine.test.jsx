// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ProfilCandidatDetails } from "../src/Pages/Recruteur/GestionOffre/detail/ProfilCandidatDetails";

const TITRE_RECRUTEUR = "Ajoutée depuis les suggestions du métier (non issue du CV)";

const candidat = (competences_detail) => ({
  metier_souhaite: "Responsable qualité",
  competences: "Kaizen, Excel", // le texte est toujours synchronisé avec competences_detail
  competences_detail,
});

describe("Détail du candidat côté recruteur : origine des compétences", () => {
  afterEach(() => cleanup());

  it("repère « suggérée » la compétence ajoutée depuis les suggestions du métier, et elle seule", () => {
    render(
      <ProfilCandidatDetails
        formatText={(texte) => texte || "—"}
        candidatData={candidat([
          { id: 1, label: "Kaizen", niveau_libelle: "Débutant", origine: "SUGGESTION" },
          { id: 2, label: "Excel", niveau_libelle: "Avancé", origine: "SAISIE" },
        ])}
      />,
    );
    expect(screen.getByText("Kaizen")).toBeInTheDocument();
    expect(screen.getByText("Excel")).toBeInTheDocument();
    expect(screen.getAllByTitle(TITRE_RECRUTEUR)).toHaveLength(1);
  });

  it("n'affiche aucune pastille pour un ancien profil sans origine", () => {
    render(
      <ProfilCandidatDetails
        formatText={(texte) => texte || "—"}
        candidatData={candidat([{ id: 1, label: "Excel", niveau_libelle: "Avancé" }])}
      />,
    );
    expect(screen.queryByTitle(TITRE_RECRUTEUR)).not.toBeInTheDocument();
  });
});
