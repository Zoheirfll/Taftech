/// <reference types="cypress" />

describe("Flux E2E : Parcours Recruteur (Accepter un candidat)", () => {
  beforeEach(() => {
    cy.intercept("PATCH", "**/candidatures/**").as("updateStatutAPI");
    cy.login("recruteur");
  });

  it("HP1 : Doit ouvrir les candidatures d'une offre et accepter un talent", () => {
    cy.visit("/dashboard");

    // Cliquer sur la première offre qui a des candidats
    cy.contains("button", "Candidats").first().click();

    cy.contains(/candidatures/i).should("be.visible");

    // Ouvrir le dossier du premier candidat (bouton sans texte fixe — clic sur le 1er de la liste)
    cy.get(".divide-y button").first().click();

    // Le panneau candidat est ouvert quand le select de statut est visible
    cy.get("select").last().should("be.visible");

    // Changer le statut vers EN_COURS d'abord (force un vrai changement)
    cy.get("select").last().select("EN_COURS");
    cy.wait("@updateStatutAPI").its("response.statusCode").should("eq", 200);

    // Re-intercept pour le 2ème changement
    cy.intercept("PATCH", "**/candidatures/**").as("updateStatutAPI2");
    cy.get("select").last().select("RETENU");
    cy.wait("@updateStatutAPI2").its("response.statusCode").should("eq", 200);

    cy.contains("Statut mis à jour.").should("be.visible");

    // La section bulletin apparaît pour un candidat retenu
    cy.contains("Candidat retenu").should("be.visible");
    cy.contains("button", /télécharger/i).should("be.visible");
  });

  it("EC1 : Doit pouvoir refuser un candidat", () => {
    cy.visit("/dashboard");

    cy.contains("button", "Candidats").first().click();
    cy.get(".divide-y button").first().click();
    cy.get("select").last().should("be.visible");

    // Forcer un vrai changement depuis EN_COURS
    cy.get("select").last().select("EN_COURS");
    cy.wait("@updateStatutAPI").its("response.statusCode").should("eq", 200);

    cy.intercept("PATCH", "**/candidatures/**").as("updateStatutAPI2");
    cy.get("select").last().select("REFUSE");
    cy.wait("@updateStatutAPI2").its("response.statusCode").should("eq", 200);
    cy.contains("Statut mis à jour.").should("be.visible");
  });
});
