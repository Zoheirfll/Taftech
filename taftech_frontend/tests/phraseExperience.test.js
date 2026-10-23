import { describe, it, expect } from "vitest";
import { phraseExperience } from "../src/utils/phraseExperience";

describe("📝 phraseExperience — l'expérience demandée, écrite comme une phrase", () => {
  it("🟢 Débutant et stage : aucun nombre d'années (le critère n'est pas évalué)", () => {
    expect(phraseExperience("DEBUTANT", 0)).toBe("Débutant accepté");
    expect(phraseExperience("STAGIAIRE", 0)).toBe("Stage ou étudiant");
  });

  it("🟢 Confirmé : années du score, « environ », et expérience pertinente seulement", () => {
    expect(phraseExperience("CONFIRME", 3)).toBe("Expérience confirmée (environ 3 ans) dans un poste similaire");
  });

  it("🟢 Les niveaux de responsabilité gardent leur intitulé", () => {
    expect(phraseExperience("MANAGER", 5)).toBe("Expérience de manager / responsable de département (environ 5 ans) dans un poste similaire");
    expect(phraseExperience("RESPONSABLE_EQUIPE", 5)).toBe("Expérience de responsable d'équipe (environ 5 ans) dans un poste similaire");
    expect(phraseExperience("CADRE_DIRIGEANT", 8)).toBe("Expérience de cadre dirigeant (environ 8 ans) dans un poste similaire");
  });

  it("🟡 Jeune diplômé : « 1 an » au singulier, sans « poste similaire »", () => {
    expect(phraseExperience("JEUNE_DIPLOME", 1)).toBe("Jeune diplômé (environ 1 an d'expérience)");
  });

  it("🔴 Jamais de fourchette ni de secteur inventés (« 5 à 10 ans », « idéalement dans le secteur… »)", () => {
    const phrase = phraseExperience("CONFIRME", 3);
    expect(phrase).not.toMatch(/à \d+ ans|idéalement|secteur/);
  });

  it("🟡 Années inconnues de l'API : le niveau seul, sans chiffre", () => {
    expect(phraseExperience("CONFIRME", undefined)).toBe("Expérience confirmée");
  });

  it("🟡 Niveau inconnu ou absent : phrase vide", () => {
    expect(phraseExperience("INCONNU", 3)).toBe("");
    expect(phraseExperience(undefined, 3)).toBe("");
    expect(phraseExperience(null, null)).toBe("");
  });
});
