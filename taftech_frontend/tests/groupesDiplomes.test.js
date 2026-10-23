import { describe, it, expect } from "vitest";
import { estGroupe, libellesDiplomesCompacts, membresDuGroupe, optionsNiveaux, regrouperDiplomes } from "../src/utils/groupesDiplomes";

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

  it("🟢 Un groupe réunit les natures d'un même niveau ; le Master inclut l'ingéniorat (Bac +5)", () => {
    expect(membresDuGroupe("GRP-MASTER", types).map((t) => t.id)).toEqual([1, 2, 3, 8]);
    expect(membresDuGroupe("GRP-LICENCE", types).map((t) => t.id)).toEqual([4, 5, 6]);
  });

  it("🔴 BTS et licence ancien système ne sont dans aucun groupe (aucune équivalence construite)", () => {
    const tous = ["GRP-MASTER", "GRP-LICENCE", "GRP-DOCTORAT"].flatMap((g) => membresDuGroupe(g, types).map((t) => t.code));
    expect(tous).not.toContain("D-BTS");
    expect(tous).not.toContain("D-LIC-CL");
  });

  it("🟢 Les niveaux proposés ne contiennent que les groupes complets de la nomenclature", () => {
    const [groupe] = optionsNiveaux(types);
    expect(groupe.options.map((o) => o.value)).toEqual(["GRP-LICENCE", "GRP-MASTER"]);
    expect(groupe.options.map((o) => o.label)).toEqual(["Licence (Bac +3)", "Master / Ingéniorat (Bac +5)"]);
  });

  it("🟡 Aucune option de niveau quand la nomenclature n'est pas chargée", () => {
    expect(optionsNiveaux([])).toEqual([]);
    expect(optionsNiveaux(undefined)).toEqual([]);
  });

  it("🟢 Les trois masters et l'ingéniorat choisis = une seule entrée « Master / Ingéniorat (Bac +5) »", () => {
    const choisis = [
      { id: 1, code: "D-MAS-A", libelle: "Master académique" },
      { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
      { id: 3, code: "D-MAS-NP", libelle: "Master à nature non précisée" },
      { id: 8, code: "D-ING", libelle: "Diplôme d'ingénieur d'État" },
    ];
    expect(regrouperDiplomes(choisis)).toEqual([{ cle: "GRP-MASTER", libelle: "Master / Ingéniorat (Bac +5)", ids: [1, 2, 3, 8] }]);
  });

  it("🟢 Les 3 masters sans l'ingéniorat (offre créée avant) s'écrivent « Master (Bac +5) », pas leur liste", () => {
    const choisis = [
      { id: 1, code: "D-MAS-A", libelle: "Master académique" },
      { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
      { id: 3, code: "D-MAS-NP", libelle: "Master à nature non précisée" },
    ];
    expect(regrouperDiplomes(choisis)).toEqual([{ cle: "GRP-MASTER-SEUL", libelle: "Master (Bac +5)", ids: [1, 2, 3] }]);
  });

  it("🔴 Le groupe « Master » seul n'est jamais proposé à la sélection : un seul choix, avec l'ingéniorat", () => {
    const valeurs = optionsNiveaux(types).flatMap((g) => g.options.map((o) => o.value));
    expect(valeurs).not.toContain("GRP-MASTER-SEUL");
    expect(valeurs).toContain("GRP-MASTER");
  });

  it("🟡 Deux masters seulement : le niveau n'est pas complet, ils restent détaillés", () => {
    const choisis = [
      { id: 1, code: "D-MAS-A", libelle: "Master académique" },
      { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
    ];
    expect(regrouperDiplomes(choisis).map((e) => e.libelle)).toEqual(["Master académique", "Master professionnel"]);
  });

  it("🟢 Cartes de liste : au plus deux niveaux, puis « N autres »", () => {
    const choisis = [
      { id: 9, code: "D-BTS", libelle: "BTS" },
      { id: 4, code: "D-LIC-A", libelle: "Licence académique" },
      { id: 5, code: "D-LIC-P", libelle: "Licence professionnelle" },
      { id: 6, code: "D-LIC-NP", libelle: "Licence à nature non précisée" },
      { id: 1, code: "D-MAS-A", libelle: "Master académique" },
      { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
      { id: 3, code: "D-MAS-NP", libelle: "Master à nature non précisée" },
      { id: 8, code: "D-ING", libelle: "Diplôme d'ingénieur d'État" },
    ];
    expect(libellesDiplomesCompacts(choisis)).toEqual(["BTS", "Licence (Bac +3)", "1 autre"]);
    expect(libellesDiplomesCompacts(choisis, 1)).toEqual(["BTS", "2 autres"]);
  });

  it("🟡 Cartes de liste : deux niveaux ou moins, rien n'est abrégé", () => {
    const choisis = [
      { id: 1, code: "D-MAS-A", libelle: "Master académique" },
      { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
      { id: 3, code: "D-MAS-NP", libelle: "Master à nature non précisée" },
    ];
    expect(libellesDiplomesCompacts(choisis)).toEqual(["Master (Bac +5)"]);
    expect(libellesDiplomesCompacts([])).toEqual([]);
    expect(libellesDiplomesCompacts(undefined)).toEqual([]);
  });

  it("🟡 Cartes de liste : « — nature non précisée » est retiré, le détail complet reste dans regrouperDiplomes", () => {
    const choisis = [
      { id: 6, code: "D-LIC-NP", libelle: "Licence — nature non précisée" },
      { id: 3, code: "D-MAS-NP", libelle: "Master — nature non précisée" },
    ];
    expect(libellesDiplomesCompacts(choisis)).toEqual(["Licence", "Master"]);
    expect(regrouperDiplomes(choisis).map((e) => e.libelle)).toEqual(["Licence — nature non précisée", "Master — nature non précisée"]);
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
    expect(regrouperDiplomes(choisis).map((e) => e.libelle)).toEqual(["BTS", "Master / Ingéniorat (Bac +5)"]);
  });

  it("🟡 Un diplôme sans code (suggestion d'API) reste tel quel", () => {
    expect(regrouperDiplomes([{ id: 5, libelle: "Autre" }])).toEqual([{ cle: "5", libelle: "Autre", ids: [5] }]);
  });
});
