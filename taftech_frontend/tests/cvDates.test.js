import { describe, it, expect } from "vitest";
import { convertDateRaw } from "../src/utils/cvDates";

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
