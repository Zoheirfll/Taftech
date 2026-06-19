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

    cy.url().should("include", "/dashboard/offres/");
    cy.contains(/candidatures/i).should("be.visible");

    // Ouvrir le dossier du premier candidat
    cy.get(".divide-y button").first().click();

    // Le select statut est visible quand le panneau est ouvert
    cy.get("select").should("be.visible");

    // Changer vers EN_COURS d'abord (force un vrai changement d'état)
    cy.get("select").select("EN_COURS", { force: true });
    cy.wait("@updateStatutAPI").its("response.statusCode").should("eq", 200);

    // Re-intercept pour le 2ème changement
    cy.intercept("PATCH", "**/candidatures/**").as("updateStatutAPI2");
    cy.get("select").select("RETENU", { force: true });
    cy.wait("@updateStatutAPI2").its("response.statusCode").should("eq", 200);

    cy.contains("Statut mis à jour.").should("be.visible");

    // La section bulletin apparaît pour un candidat retenu (cibler le <p> pas l'<option>)
    cy.contains("p", "Candidat retenu — Bulletin disponible").should("be.visible");
    cy.contains("button", "Télécharger").should("be.visible");
  });

  it("EC1 : Doit pouvoir refuser un candidat", () => {
    cy.visit("/dashboard");

    cy.contains("button", "Candidats").first().click();
    cy.url().should("include", "/dashboard/offres/");

    cy.get(".divide-y button").first().click();
    cy.get("select").should("be.visible");

    // Forcer un vrai changement depuis EN_COURS
    cy.get("select").select("EN_COURS", { force: true });
    cy.wait("@updateStatutAPI").its("response.statusCode").should("eq", 200);

    cy.intercept("PATCH", "**/candidatures/**").as("updateStatutAPI2");
    cy.get("select").select("REFUSE", { force: true });
    cy.wait("@updateStatutAPI2").its("response.statusCode").should("eq", 200);
    cy.contains("Statut mis à jour.").should("be.visible");
  });
});
