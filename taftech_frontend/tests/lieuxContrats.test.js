import { describe, it, expect } from "vitest";
import {
  CONTRAT_LABELS, contratsTexte, lieuTexte, lieuxDeLOffre, lieuxTexte, nomWilaya, typesContratDeLOffre,
} from "../src/utils/lieuxContrats";

describe("📍 lieux de travail d'une offre (principal + supplémentaires)", () => {
  it("🟢 Le nom de la wilaya sans son numéro", () => {
    expect(nomWilaya("31 - Oran")).toBe("Oran");
    expect(nomWilaya("Oran")).toBe("Oran");
    expect(nomWilaya("")).toBe("");
    expect(nomWilaya(undefined)).toBe("");
  });

  it("🟢 Une offre à un seul lieu s'écrit comme avant : « Oran, Es Sénia »", () => {
    expect(lieuxTexte({ wilaya: "31 - Oran", commune: "Es Sénia" })).toBe("Oran, Es Sénia");
    expect(lieuxTexte({ wilaya: "31 - Oran" })).toBe("Oran");
  });

  it("🟢 Plusieurs lieux : le principal d'abord, séparés par « | »", () => {
    const offre = { wilaya: "31 - Oran", commune: "", lieux_supplementaires: [{ wilaya: "27 - Mostaganem", commune: "" }] };
    expect(lieuxTexte(offre)).toBe("Oran | Mostaganem");
    expect(lieuxDeLOffre(offre).map((l) => l.wilaya)).toEqual(["31 - Oran", "27 - Mostaganem"]);
  });

  it("🟡 Un doublon (même wilaya et même commune) n'apparaît qu'une fois", () => {
    const offre = { wilaya: "31 - Oran", commune: "Oran", lieux_supplementaires: [{ wilaya: "31 - ORAN", commune: " oran " }, { wilaya: "27 - Mostaganem" }] };
    expect(lieuxDeLOffre(offre)).toHaveLength(2);
  });

  it("🟡 Données absentes ou mal formées : jamais de plantage", () => {
    expect(lieuxDeLOffre(undefined)).toEqual([]);
    expect(lieuxDeLOffre({ wilaya: "31 - Oran", lieux_supplementaires: "n'importe quoi" })).toHaveLength(1);
    expect(lieuxTexte({})).toBe("");
  });

  it("🟢 Un lieu s'écrit « Wilaya, Commune »", () => {
    expect(lieuTexte({ wilaya: "27 - Mostaganem", commune: "Mazagran" })).toBe("Mostaganem, Mazagran");
  });
});

describe("📄 types de contrat d'une offre (principal + supplémentaires)", () => {
  it("🟢 Un seul contrat s'écrit comme avant", () => {
    expect(contratsTexte({ type_contrat: "CDI" })).toBe("CDI");
  });

  it("🟢 Plusieurs contrats : « CDD ou Stage / PFE », le principal d'abord", () => {
    expect(contratsTexte({ type_contrat: "CDD", types_contrat_supplementaires: ["STAGE"] })).toBe("CDD ou Stage / PFE");
    expect(contratsTexte({ type_contrat: "CDD", types_contrat_supplementaires: ["STAGE", "FREELANCE"] })).toBe("CDD ou Stage / PFE ou Freelance");
  });

  it("🟡 Doublons et valeurs vides ignorés ; un code inconnu reste lisible", () => {
    expect(typesContratDeLOffre({ type_contrat: "CDD", types_contrat_supplementaires: ["CDD", "", "INCONNU"] })).toEqual(["CDD", "INCONNU"]);
    expect(contratsTexte({ type_contrat: "CDD", types_contrat_supplementaires: ["INCONNU"] })).toBe("CDD ou INCONNU");
  });

  it("🟢 « CDD ou Mission » (exemple d'Emploitic) s'écrit comme sur le marché", () => {
    expect(contratsTexte({ type_contrat: "CDD", types_contrat_supplementaires: ["MISSION"] })).toBe("CDD ou Mission");
  });

  it("🟢 Tous les types de contrat du backend ont un libellé", () => {
    ["CDI", "CDD", "MISSION", "ANEM", "STAGE", "FREELANCE", "TEMPS_PARTIEL"].forEach((code) => expect(CONTRAT_LABELS[code]).toBeTruthy());
  });

  it("🟡 Offre sans contrat : texte vide", () => {
    expect(contratsTexte({})).toBe("");
    expect(contratsTexte(undefined)).toBe("");
  });
});
