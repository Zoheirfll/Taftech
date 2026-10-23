import { describe, it, expect } from "vitest";
import { phrasesCompetences } from "../src/utils/phraseCompetences";
import { joindre } from "../src/utils/listeFrancaise";

const comp = (label, type_exigence, niveau_requis = "") => ({ id: label, label, type_exigence, niveau_requis });

describe("📝 joindre — liste lisible en français", () => {
  it("🟢 Un, deux, trois éléments", () => {
    expect(joindre(["A"], "et")).toBe("A");
    expect(joindre(["A", "B"], "et")).toBe("A et B");
    expect(joindre(["A", "B", "C"], "ou")).toBe("A, B ou C");
    expect(joindre([], "et")).toBe("");
  });

  it("🔴 Un libellé qui contient lui-même une virgule ou « et » passe au point-virgule (sinon ambigu)", () => {
    expect(joindre(["Réseaux et Systèmes Distribués", "Génie logiciel"], "et")).toBe("Réseaux et Systèmes Distribués ; Génie logiciel");
    expect(joindre(["Informatique, données et numérique", "Réseaux"], "et")).toBe("Informatique, données et numérique ; Réseaux");
  });
});

describe("📝 phrasesCompetences — les compétences demandées, écrites comme des phrases", () => {
  it("🟢 Aucune compétence : aucune phrase", () => {
    expect(phrasesCompetences([])).toEqual([]);
    expect(phrasesCompetences(undefined)).toEqual([]);
  });

  it("🟢 Indispensables et souhaitées : deux phrases, niveau entre parenthèses", () => {
    const phrases = phrasesCompetences([
      comp("Conception d'API", "OBLIGATOIRE", "CONFIRME"),
      comp("Gestion de versions Git", "OBLIGATOIRE", "INTERMEDIAIRE"),
      comp("Conteneurisation Docker", "SOUHAITEE", "INTERMEDIAIRE"),
    ]);
    expect(phrases).toEqual([
      "Compétences indispensables : Conception d'API (confirmé) et Gestion de versions Git (intermédiaire).",
      "Compétences souhaitées : Conteneurisation Docker (intermédiaire).",
    ]);
  });

  it("🟢 Sans niveau requis : le nom seul", () => {
    expect(phrasesCompetences([comp("Excel", "OBLIGATOIRE")])).toEqual(["Compétences indispensables : Excel."]);
  });

  it("🟡 Seulement des souhaitées : une seule phrase", () => {
    expect(phrasesCompetences([comp("Docker", "SOUHAITEE")])).toEqual(["Compétences souhaitées : Docker."]);
  });

  it("🔴 Jamais de plafond : une compétence indispensable n'est jamais cachée au candidat", () => {
    const beaucoup = Array.from({ length: 12 }, (_, i) => comp(`Compétence ${i + 1}`, "OBLIGATOIRE"));
    const [phrase] = phrasesCompetences(beaucoup);
    expect(phrase).toContain("Compétence 12");
    expect(phrase).not.toMatch(/autres?\b/);
  });

  it("🔴 Libellés avec « et » : séparateur point-virgule, jamais ambigu", () => {
    const [phrase] = phrasesCompetences([
      comp("Statistiques et probabilités", "OBLIGATOIRE", "AVANCE"),
      comp("Gestion de projet", "OBLIGATOIRE"),
    ]);
    expect(phrase).toBe("Compétences indispensables : Statistiques et probabilités (avancé) ; Gestion de projet.");
  });

  it("🟡 Niveau inconnu : ignoré, jamais « undefined »", () => {
    const [phrase] = phrasesCompetences([comp("Excel", "OBLIGATOIRE", "GOUROU")]);
    expect(phrase).toBe("Compétences indispensables : Excel.");
  });

  it("🟡 Un type d'exigence inconnu n'est ni indispensable ni souhaité : ignoré", () => {
    expect(phrasesCompetences([comp("Excel", "AUTRE")])).toEqual([]);
  });
});
