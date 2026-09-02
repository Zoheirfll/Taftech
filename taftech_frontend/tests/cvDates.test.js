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
});
