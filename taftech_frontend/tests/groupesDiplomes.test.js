import { describe, it, expect } from "vitest";
import { estGroupe, membresDuGroupe, optionsNiveaux, regrouperDiplomes } from "../src/utils/groupesDiplomes";

const types = [
  { id: 1, code: "D-MAS-A", libelle: "Master académique" },
  { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
  { id: 3, code: "D-MAS-NP", libelle: "Master à nature non précisée" },
  { id: 4, code: "D-LIC-A", libelle: "Licence académique" },
  { id: 5, code: "D-LIC-P", libelle: "Licence professionnelle" },
  { id: 6, code: "D-LIC-NP", libelle: "Licence à nature non précisée" },
  { id: 7, code: "D-LIC-CL", libelle: "Licence ancien système classique" },
  { id: 8, code: "D-ING", libelle: "Diplôme d'ingénieur d'État" },
  { id: 9, code: "D-BTS", libelle: "BTS" },
];

describe("🎓 groupesDiplomes — « Master » = tous les masters, quelle que soit leur nature", () => {
  it("🟢 Reconnaît un identifiant de groupe", () => {
    expect(estGroupe("GRP-MASTER")).toBe(true);
    expect(estGroupe(12)).toBe(false);
    expect(estGroupe("")).toBe(false);
  });

  it("🟢 Un groupe réunit les trois natures d'un même niveau", () => {
    expect(membresDuGroupe("GRP-MASTER", types).map((t) => t.id)).toEqual([1, 2, 3]);
    expect(membresDuGroupe("GRP-LICENCE", types).map((t) => t.id)).toEqual([4, 5, 6]);
  });

  it("🔴 Ingénieur d'État, BTS et licence ancien système ne sont jamais dans un groupe (aucune équivalence construite)", () => {
    const tous = ["GRP-MASTER", "GRP-LICENCE", "GRP-DOCTORAT"].flatMap((g) => membresDuGroupe(g, types).map((t) => t.code));
    expect(tous).not.toContain("D-ING");
    expect(tous).not.toContain("D-BTS");
    expect(tous).not.toContain("D-LIC-CL");
  });

  it("🟢 Les niveaux proposés ne contiennent que les groupes complets de la nomenclature", () => {
    const [groupe] = optionsNiveaux(types);
    expect(groupe.options.map((o) => o.value)).toEqual(["GRP-LICENCE", "GRP-MASTER"]);
    expect(groupe.options.map((o) => o.label)).toEqual(["Licence (Bac +3)", "Master (Bac +5)"]);
  });

  it("🟡 Aucune option de niveau quand la nomenclature n'est pas chargée", () => {
    expect(optionsNiveaux([])).toEqual([]);
    expect(optionsNiveaux(undefined)).toEqual([]);
  });

  it("🟢 Trois masters choisis = une seule entrée « Master (Bac +5) »", () => {
    const choisis = [
      { id: 1, code: "D-MAS-A", libelle: "Master académique" },
      { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
      { id: 3, code: "D-MAS-NP", libelle: "Master à nature non précisée" },
    ];
    expect(regrouperDiplomes(choisis)).toEqual([{ cle: "GRP-MASTER", libelle: "Master (Bac +5)", ids: [1, 2, 3] }]);
  });

  it("🟡 Un groupe incomplet reste détaillé, rien n'est perdu", () => {
    const choisis = [{ id: 1, code: "D-MAS-A", libelle: "Master académique" }, { id: 9, code: "D-BTS", libelle: "BTS" }];
    expect(regrouperDiplomes(choisis).map((e) => e.libelle)).toEqual(["Master académique", "BTS"]);
  });

  it("🟢 Le groupe prend la place de son premier membre, les autres diplômes gardent leur ordre", () => {
    const choisis = [
      { id: 9, code: "D-BTS", libelle: "BTS" },
      { id: 1, code: "D-MAS-A", libelle: "Master académique" },
      { id: 8, code: "D-ING", libelle: "Ingénieur" },
      { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
      { id: 3, code: "D-MAS-NP", libelle: "Master non précisé" },
    ];
    expect(regrouperDiplomes(choisis).map((e) => e.libelle)).toEqual(["BTS", "Master (Bac +5)", "Ingénieur"]);
  });

  it("🟡 Un diplôme sans code (suggestion d'API) reste tel quel", () => {
    expect(regrouperDiplomes([{ id: 5, libelle: "Autre" }])).toEqual([{ cle: "5", libelle: "Autre", ids: [5] }]);
  });
});
