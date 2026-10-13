import { describe, it, expect } from "vitest";
import { convertDateRaw, precisionDateRaw, precisionDateFin, formatDatePrecise } from "../src/utils/cvDates";

describe("convertDateRaw", () => {
  it("convertit 'Mois Année' en date ISO", () => {
    expect(convertDateRaw("Janvier 2026")).toBe("2026-01-01");
  });

  it("convertit une année seule en date ISO au 1er janvier", () => {
    expect(convertDateRaw("2025")).toBe("2025-01-01");
  });

  it("retourne null pour 'Présent'/'En cours'", () => {
    expect(convertDateRaw("Présent")).toBeNull();
    expect(convertDateRaw("en cours")).toBeNull();
  });

  it("retourne null pour une valeur vide ou non reconnue", () => {
    expect(convertDateRaw("")).toBeNull();
    expect(convertDateRaw(null)).toBeNull();
    expect(convertDateRaw("texte sans date")).toBeNull();
  });

  it("convertit un mois abrégé avec point", () => {
    expect(convertDateRaw("Janv. 2023")).toBe("2023-01-01");
    expect(convertDateRaw("déc. 2022")).toBe("2022-12-01");
  });

  it("convertit un mois en anglais", () => {
    expect(convertDateRaw("February 2024")).toBe("2024-02-01");
    expect(convertDateRaw("March 2021")).toBe("2021-03-01");
  });

  it("convertit une date numérique MM/AAAA", () => {
    expect(convertDateRaw("02/2026")).toBe("2026-02-01");
    expect(convertDateRaw("09-2023")).toBe("2023-09-01");
  });

  it("ne retombe jamais sur janvier pour un mois non reconnu", () => {
    // "xyz 2023" : mot non reconnu comme mois -> on garde seulement l'année,
    // jamais un mois de janvier deviné à tort.
    expect(convertDateRaw("xyz 2023")).toBe("2023-01-01");
  });
});

describe("précision des dates extraites du CV", () => {
  it("année seule : précision ANNEE, affichée sans 01/01", () => {
    expect(precisionDateRaw("2023")).toBe("ANNEE");
    expect(formatDatePrecise(convertDateRaw("2023"), "ANNEE")).toBe("2023");
  });

  it("mois/année : précision MOIS", () => {
    expect(precisionDateRaw("Mars 2023")).toBe("MOIS");
    expect(precisionDateRaw("03/2023")).toBe("MOIS");
    expect(formatDatePrecise(convertDateRaw("Mars 2023"), "MOIS")).toBe("mars 2023");
  });

  it("date complète : précision JOUR et jour conservé", () => {
    expect(convertDateRaw("12/03/2023")).toBe("2023-03-12");
    expect(precisionDateRaw("12/03/2023")).toBe("JOUR");
    expect(formatDatePrecise("2023-03-12", "JOUR")).toBe("12/03/2023");
  });

  it("fin absente : reprend la précision du début ; poste en cours = JOUR", () => {
    expect(precisionDateFin("", "2021")).toBe("ANNEE");
    expect(precisionDateFin("Présent", "2021")).toBe("JOUR");
  });
});
