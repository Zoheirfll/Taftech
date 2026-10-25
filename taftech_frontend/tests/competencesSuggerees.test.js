import { describe, it, expect } from "vitest";
import {
  MAX_METIERS_SUGGESTIONS,
  MAX_SUGGESTIONS,
  fusionnerSuggestions,
  idsMetiers,
} from "../src/utils/competencesSuggerees";

describe("idsMetiers : métiers distincts à interroger", () => {
  it("garde l'ordre, retire les doublons et les valeurs vides", () => {
    expect(idsMetiers(5, "", null, 5, "7", undefined, 0)).toEqual([5, 7]);
  });

  it("accepte des listes imbriquées (métiers des expériences)", () => {
    expect(idsMetiers([1, 2], 3)).toEqual([1, 2, 3]);
  });

  it(`ne dépasse pas ${MAX_METIERS_SUGGESTIONS} métiers`, () => {
    expect(idsMetiers(1, 2, 3, 4, 5)).toHaveLength(MAX_METIERS_SUGGESTIONS);
  });

  it("ignore ce qui n'est pas un identifiant", () => {
    expect(idsMetiers("abc", -4, 2.5, "9")).toEqual([9]);
  });
});

describe("fusionnerSuggestions : compétences proposées au candidat", () => {
  const reponse = (...competences) => ({ competences: competences.map(([id, label]) => ({ id, label })) });

  it("fusionne les métiers et classe en premier ce qui concerne le plus de métiers", () => {
    const res = fusionnerSuggestions(
      [reponse([1, "Kaizen"], [2, "Audit interne"]), reponse([2, "Audit interne"], [3, "Paie"])],
      [],
    );
    expect(res.map((s) => s.label)).toEqual(["Audit interne", "Kaizen", "Paie"]);
    expect(res[0].nbMetiers).toBe(2);
  });

  it("retire ce que le candidat possède déjà, sans tenir compte de la casse ni des accents", () => {
    const res = fusionnerSuggestions([reponse([1, "Gestion de la qualité"], [2, "Kaizen"])], ["gestion de la QUALITE"]);
    expect(res.map((s) => s.label)).toEqual(["Kaizen"]);
  });

  it("accepte des compétences possédées sous forme d'objets {label}", () => {
    const res = fusionnerSuggestions([reponse([2, "Kaizen"])], [{ label: "Kaizen" }]);
    expect(res).toEqual([]);
  });

  it(`plafonne à ${MAX_SUGGESTIONS} suggestions`, () => {
    const beaucoup = Array.from({ length: 30 }, (_, i) => [i + 1, `Compétence ${i + 1}`]);
    expect(fusionnerSuggestions([reponse(...beaucoup)], [])).toHaveLength(MAX_SUGGESTIONS);
  });

  it("tolère les réponses vides ou mal formées", () => {
    expect(fusionnerSuggestions([null, {}, { competences: null }, reponse([1, ""])], [])).toEqual([]);
    expect(fusionnerSuggestions(undefined, undefined)).toEqual([]);
  });
});
