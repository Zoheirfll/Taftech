import { describe, it, expect } from "vitest";
import { phraseFormation, enrichirSpecialites } from "../src/utils/phraseFormation";

const spec = (id, libelle, extra = {}) => ({
  id, libelle, domaine_id: 1, domaine_libelle: "Informatique", domaine_total: 3, domaine_non_retenues: [], ...extra,
});

describe("📝 phraseFormation — la phrase de formation lue par le candidat", () => {
  it("🟢 Rien de choisi : phrase vide", () => {
    expect(phraseFormation({})).toBe("");
  });

  it("🟢 Diplômes seuls : liste lisible avec « ou »", () => {
    expect(phraseFormation({ diplomes: [{ libelle: "Licence" }] })).toBe("Licence");
    expect(phraseFormation({ diplomes: [{ libelle: "Licence" }, { libelle: "Master 2" }, { libelle: "Ingéniorat" }] }))
      .toBe("Licence, Master 2 ou Ingéniorat");
  });

  it("🟢 Domaine entièrement coché : on écrit son nom, jamais ses spécialités", () => {
    const specialites = [spec(1, "Réseaux"), spec(2, "Génie logiciel"), spec(3, "Bases de données")];
    expect(phraseFormation({ diplomes: [{ libelle: "Master 2" }], specialites })).toBe("Master 2 en Informatique");
  });

  it("🟢 Sans diplôme : « Formation en … »", () => {
    const specialites = [spec(1, "Réseaux"), spec(2, "Génie logiciel"), spec(3, "Bases de données")];
    expect(phraseFormation({ specialites })).toBe("Formation en Informatique");
  });

  it("🟢 Plusieurs domaines entiers : joints par une virgule et « et »", () => {
    const specialites = [
      spec(1, "Transport", { domaine_id: 1, domaine_libelle: "Logistique", domaine_total: 1 }),
      spec(2, "Marketing", { domaine_id: 2, domaine_libelle: "Commerce", domaine_total: 1 }),
      spec(3, "Achats", { domaine_id: 3, domaine_libelle: "Gestion", domaine_total: 1 }),
    ];
    expect(phraseFormation({ diplomes: [{ libelle: "Bac +5" }], specialites })).toBe("Bac +5 en Logistique, Commerce et Gestion");
  });

  it("🟡 Il manque une spécialité : « sauf … »", () => {
    const specialites = [
      spec(1, "A", { domaine_total: 4, domaine_non_retenues: ["Esthétique"] }),
      spec(2, "B", { domaine_total: 4, domaine_non_retenues: ["Esthétique"] }),
      spec(3, "C", { domaine_total: 4, domaine_non_retenues: ["Esthétique"] }),
    ];
    expect(phraseFormation({ specialites })).toBe("Formation en Informatique (sauf Esthétique)");
  });

  it("🟡 Deux manquantes : « sauf X et Y »", () => {
    const manquantes = ["X", "Y"];
    const specialites = [1, 2, 3, 4].map((i) => spec(i, `S${i}`, { domaine_total: 6, domaine_non_retenues: manquantes }));
    expect(phraseFormation({ specialites })).toBe("Formation en Informatique (sauf X et Y)");
  });

  it("🟡 Sélection partielle sans « sauf » possible : on cite les spécialités gardées", () => {
    const specialites = [spec(1, "Réseaux", { domaine_total: 20 }), spec(2, "Génie logiciel", { domaine_total: 20 })];
    expect(phraseFormation({ diplomes: [{ libelle: "Licence" }], specialites })).toBe("Licence en Réseaux et Génie logiciel");
  });

  it("🔴 Plafond : au-delà de 5 spécialités citées, « et N autres »", () => {
    const specialites = [1, 2, 3, 4, 5, 6, 7].map((i) => spec(i, `S${i}`, { domaine_total: 30 }));
    expect(phraseFormation({ specialites })).toBe("Formation en S1, S2, S3, S4, S5 et 2 autres");
  });

  it("🔴 Plafond : « et 1 autre » au singulier", () => {
    const specialites = [1, 2, 3, 4, 5, 6].map((i) => spec(i, `S${i}`, { domaine_total: 30 }));
    expect(phraseFormation({ specialites })).toBe("Formation en S1, S2, S3, S4, S5 et 1 autre");
  });

  it("🟡 Spécialité sans domaine connu : citée telle quelle, jamais perdue", () => {
    expect(phraseFormation({ specialites: [{ id: 9, libelle: "Cybersécurité" }] })).toBe("Formation en Cybersécurité");
  });

  it("🟢 Masters et ingéniorat s'écrivent « Master / Ingéniorat (Bac +5) », un groupe incomplet reste détaillé", () => {
    const masters = [
      { id: 1, code: "D-MAS-A", libelle: "Master académique" },
      { id: 2, code: "D-MAS-P", libelle: "Master professionnel" },
      { id: 3, code: "D-MAS-NP", libelle: "Master à nature non précisée" },
      { id: 8, code: "D-ING", libelle: "Diplôme d'ingénieur d'État" },
    ];
    expect(phraseFormation({ diplomes: masters })).toBe("Master / Ingéniorat (Bac +5)");
    expect(phraseFormation({ diplomes: masters.slice(0, 2) })).toBe("Master académique ou Master professionnel");
  });

  it("🔴 Libellés qui contiennent « et » ou une virgule : séparateur point-virgule, jamais ambigu", () => {
    const specialites = [
      spec(1, "Réseaux et Systèmes Distribués", { domaine_total: 30 }),
      spec(2, "Statistiques et Probabilités Approfondies", { domaine_total: 30 }),
      spec(3, "Génie logiciel", { domaine_total: 30 }),
    ];
    expect(phraseFormation({ diplomes: [{ libelle: "Licence" }], specialites }))
      .toBe("Licence en Réseaux et Systèmes Distribués ; Statistiques et Probabilités Approfondies ; Génie logiciel");
  });

  it("🟢 Diplômes sans spécialité : jamais de « en » orphelin", () => {
    expect(phraseFormation({ diplomes: [{ libelle: "BTS" }], specialites: [] })).toBe("BTS");
  });
});

describe("📝 enrichirSpecialites — données du formulaire au format de la phrase", () => {
  const nomenclature = [
    { id: 1, libelle: "A", domaine_id: 10 },
    { id: 2, libelle: "B", domaine_id: 10 },
    { id: 3, libelle: "C", domaine_id: 10 },
    { id: 4, libelle: "D", domaine_id: 20 },
  ];
  const domaines = [{ id: 10, libelle: "Informatique" }, { id: 20, libelle: "Agriculture" }];

  it("🟢 Ajoute domaine, total et spécialités non retenues (2 au plus)", () => {
    const [a] = enrichirSpecialites([{ id: 1, libelle: "A" }], nomenclature, domaines);
    expect(a).toMatchObject({ domaine_id: 10, domaine_libelle: "Informatique", domaine_total: 3, domaine_non_retenues: ["B", "C"] });
  });

  it("🟢 Au-delà de 2 non retenues : liste vide (pas de « sauf »)", () => {
    const grande = Array.from({ length: 6 }, (_, i) => ({ id: 100 + i, libelle: `G${i}`, domaine_id: 30 }));
    const [g] = enrichirSpecialites([{ id: 100, libelle: "G0" }], grande, [{ id: 30, libelle: "Gros" }]);
    expect(g.domaine_total).toBe(6);
    expect(g.domaine_non_retenues).toEqual([]);
  });

  it("🟡 Spécialité inconnue de la nomenclature : conservée sans domaine", () => {
    expect(enrichirSpecialites([{ id: 99, libelle: "?" }], nomenclature, domaines)).toEqual([{ id: 99, libelle: "?" }]);
  });
});
