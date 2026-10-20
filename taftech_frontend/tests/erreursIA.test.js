import { describe, it, expect } from "vitest";
import { bloqueLaFonctionIA, CODE_FOURNISSEUR_SATURE } from "../src/utils/erreursIA";

describe("bloqueLaFonctionIA", () => {
  it("bloque quand le quota de l'utilisateur est atteint", () => {
    expect(bloqueLaFonctionIA({ code: "QUOTA_IA_JOUR_ATTEINT", quota_restant_jour: 0 })).toBe(true);
  });

  it("bloque quand le budget global ou l'abonnement l'exigent", () => {
    expect(bloqueLaFonctionIA({ code: "BUDGET_IA_EPUISE" })).toBe(true);
    expect(bloqueLaFonctionIA({ code: "PALIER_INSUFFISANT" })).toBe(true);
  });

  it("ne bloque PAS sur une saturation temporaire du fournisseur : le bouton reste actif", () => {
    expect(bloqueLaFonctionIA({ code: CODE_FOURNISSEUR_SATURE, error: "temporairement indisponible" })).toBe(false);
  });

  it("ne bloque pas sur une erreur sans code ni quota (panne ordinaire)", () => {
    expect(bloqueLaFonctionIA({ error: "Service IA temporairement indisponible." })).toBe(false);
    expect(bloqueLaFonctionIA(undefined)).toBe(false);
    expect(bloqueLaFonctionIA(null)).toBe(false);
  });
});
