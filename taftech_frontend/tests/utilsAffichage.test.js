import { describe, it, expect } from "vitest";
import { dureeExperienceMois, formatDureeMois, calculerAge, formatAge } from "../src/utils/cvDates";
import { nomWilaya } from "../src/utils/wilaya";
import { criteresNonDemandes } from "../src/utils/criteresMatching";

const AUJOURDHUI = new Date(2026, 9, 15); // 15/10/2026

describe("dureeExperienceMois / formatDureeMois", () => {
  it("compte les mois entre deux dates complètes", () => {
    const mois = dureeExperienceMois([{ date_debut: "2024-01-01", date_fin: "2025-04-01", date_fin_precision: "JOUR" }], AUJOURDHUI);
    expect(mois).toBe(15);
  });

  it("une année de fin seule court jusqu'au 31/12 (2021 → 2023 = 3 ans)", () => {
    const mois = dureeExperienceMois([{ date_debut: "2021-01-01", date_fin: "2023-01-01", date_fin_precision: "ANNEE" }], AUJOURDHUI);
    expect(mois).toBe(36);
  });

  it("une année de fin seule ne dépasse jamais aujourd'hui", () => {
    const mois = dureeExperienceMois([{ date_debut: "2026-01-01", date_fin: "2026-01-01", date_fin_precision: "ANNEE" }], AUJOURDHUI);
    expect(mois).toBe(9);
  });

  it("un poste sans date de fin court jusqu'à aujourd'hui", () => {
    expect(dureeExperienceMois([{ date_debut: "2026-01-01", date_fin: null }], AUJOURDHUI)).toBe(9);
  });

  it("fusionne les périodes qui se chevauchent au lieu de les additionner", () => {
    const mois = dureeExperienceMois([
      { date_debut: "2024-01-01", date_fin: "2025-01-01", date_fin_precision: "JOUR" },
      { date_debut: "2024-07-01", date_fin: "2025-07-01", date_fin_precision: "JOUR" },
    ], AUJOURDHUI);
    expect(mois).toBe(18);
  });

  it("ignore une expérience sans date de début", () => {
    expect(dureeExperienceMois([{ date_debut: null, date_fin: null }], AUJOURDHUI)).toBe(0);
    expect(dureeExperienceMois([], AUJOURDHUI)).toBe(0);
  });

  it("formate en années et mois", () => {
    expect(formatDureeMois(27)).toBe("2 ans 3 mois");
    expect(formatDureeMois(12)).toBe("1 an");
    expect(formatDureeMois(8)).toBe("8 mois");
    expect(formatDureeMois(0)).toBe("0");
  });
});

describe("calculerAge / formatAge", () => {
  it("compte les années révolues", () => {
    expect(calculerAge("2002-03-22", AUJOURDHUI)).toBe(24);
    expect(calculerAge("2002-10-15", AUJOURDHUI)).toBe(24); // anniversaire aujourd'hui
    expect(calculerAge("2002-10-16", AUJOURDHUI)).toBe(23); // demain
  });

  it("renvoie null (et une chaîne vide) si la date est absente, invalide ou future", () => {
    expect(calculerAge(null, AUJOURDHUI)).toBeNull();
    expect(calculerAge("n'importe quoi", AUJOURDHUI)).toBeNull();
    expect(calculerAge("2030-01-01", AUJOURDHUI)).toBeNull();
    expect(formatAge(null, AUJOURDHUI)).toBe("");
  });

  it("formate « 24 ans »", () => {
    expect(formatAge("2002-03-22", AUJOURDHUI)).toBe("24 ans");
  });
});

describe("nomWilaya", () => {
  it("retire le numéro de la wilaya", () => {
    expect(nomWilaya("31 - Oran")).toBe("Oran");
    expect(nomWilaya("16 - Alger")).toBe("Alger");
  });

  it("laisse intact un nom sans numéro et gère le vide", () => {
    expect(nomWilaya("Oran")).toBe("Oran");
    expect(nomWilaya(null)).toBe("");
    expect(nomWilaya(undefined)).toBe("");
  });
});

describe("criteresNonDemandes", () => {
  const CLES = ["specialite", "diplome", "experience", "region", "competences"];

  it("utilise la liste enregistrée quand elle existe", () => {
    expect(criteresNonDemandes({ criteres_non_demandes: ["experience"], scores: {} }, CLES)).toEqual(["experience"]);
    expect(criteresNonDemandes({ criteres_non_demandes: [], scores: {} }, CLES)).toEqual([]);
  });

  it("déduit les critères exclus d'un ancien score : à 0 et sans explication", () => {
    const ancien = {
      scores: { region: 20, diplome: 20, experience: 0, specialite: 0, competences: 0 },
      explications: {
        region: "Même wilaya.", diplome: "Diplôme accepté.",
        specialite: "Spécialité non correspondante.", competences: "Aucune compétence retrouvée.",
      },
    };
    expect(criteresNonDemandes(ancien, CLES)).toEqual(["experience"]);
  });

  it("ne déduit rien sans explications enregistrées ni détails", () => {
    expect(criteresNonDemandes({ scores: { region: 0 } }, CLES)).toEqual([]);
    expect(criteresNonDemandes(null, CLES)).toEqual([]);
  });
});
