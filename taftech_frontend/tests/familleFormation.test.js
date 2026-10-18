import { describe, it, expect } from "vitest";
import {
  grouperParFamille,
  aplatirGroupes,
  familleDuDiplome,
  typesPourNiveau,
  typeAutoriseParNiveau,
  niveauPourType,
} from "../src/utils/familleFormation";

const types = [
  { id: 1, code: "D-LIC-A", libelle: "Licence académique", famille: "superieur" },
  { id: 2, code: "D-BTS", libelle: "BTS", famille: "formation_professionnelle" },
  { id: 3, code: "D-BAC", libelle: "Baccalauréat", famille: "scolaire" },
  { id: 4, code: "D-BEM", libelle: "BEM", famille: "scolaire" },
  { id: 5, code: "D-CERT", libelle: "Certification", famille: "certification" },
];
const niveaux = [
  { id: 10, code: "SC-SUP", familles: ["superieur", "autre"] },
  { id: 11, code: "SC-FP", familles: ["formation_professionnelle", "certification"] },
  { id: 12, code: "SC-SEC", familles: ["scolaire"] },
  { id: 13, code: "SC-MOY", familles: ["scolaire"], types_exclus: ["D-BAC"] },
  { id: 14, code: "SC-SANS", familles: [] },
];

describe("familleFormation", () => {
  it("groupe par famille dans l'ordre et omet les familles vides", () => {
    const groupes = grouperParFamille(types, null, (t) => ({ value: t.id, label: t.libelle }));
    expect(groupes.map((g) => g.label)).toEqual([
      "Enseignement supérieur",
      "Formation professionnelle",
      "Enseignement moyen et secondaire",
      "Certifications et attestations",
    ]);
    expect(aplatirGroupes(groupes)).toHaveLength(5);
  });

  it("n'applique de restriction de domaines que pour supérieur et formation professionnelle", () => {
    expect(familleDuDiplome(types, 1)).toBe("superieur");
    expect(familleDuDiplome(types, 2)).toBe("formation_professionnelle");
    expect(familleDuDiplome(types, 3)).toBe("");
    expect(familleDuDiplome(types, "")).toBe("");
  });

  it("filtre les types selon le niveau d'études", () => {
    expect(typesPourNiveau(types, niveaux[0]).map((t) => t.id)).toEqual([1]);
    expect(typesPourNiveau(types, niveaux[1]).map((t) => t.id)).toEqual([2, 5]);
    expect(typesPourNiveau(types, niveaux[4])).toEqual([]);
    expect(typesPourNiveau(types, null)).toHaveLength(5);
  });

  it("n'offre pas le baccalauréat au niveau moyen / collège, mais le garde au secondaire", () => {
    expect(typesPourNiveau(types, niveaux[3]).map((t) => t.code)).toEqual(["D-BEM"]);
    expect(typesPourNiveau(types, niveaux[2]).map((t) => t.code)).toEqual(["D-BAC", "D-BEM"]);
    expect(typeAutoriseParNiveau(niveaux[3], types[2])).toBe(false);
    expect(typeAutoriseParNiveau(niveaux[3], types[3])).toBe(true);
    // Un niveau sans `types_exclus` (ancienne réponse du serveur) ne change rien.
    expect(typeAutoriseParNiveau({ familles: ["scolaire"] }, types[2])).toBe(true);
  });

  it("déduit le niveau d'études d'un type déjà choisi", () => {
    expect(niveauPourType(niveaux, types, 1).code).toBe("SC-SUP");
    expect(niveauPourType(niveaux, types, 2).code).toBe("SC-FP");
    expect(niveauPourType(niveaux, types, 3).code).toBe("SC-SEC");
    expect(niveauPourType(niveaux, types, 4).code).toBe("SC-MOY");
    expect(niveauPourType(niveaux, types, 999)).toBeNull();
  });
});
