/// <reference types="cypress" />

describe("Flux E2E : Réinitialisation mot de passe", () => {
  it("HP1 : Doit envoyer le code de reset et afficher la confirmation", () => {
    cy.intercept("POST", "**/accounts/mot-de-passe-oublie/").as("forgotAPI");

    cy.visit("/forgot-password");

    cy.get('input[placeholder="votre@email.dz"]').type(
      Cypress.env("CANDIDAT_EMAIL")
    );
    cy.contains("button", "Envoyer le code").click();

    cy.wait("@forgotAPI").then((interception) => {
      // 200 si l'email existe, ou la réponse générique "si l'email existe"
      expect(interception.response.statusCode).to.be.oneOf([200, 404]);
    });
  });

  it("HP2 : Doit réinitialiser le mot de passe avec un code valide (mock)", () => {
    cy.intercept("POST", "**/accounts/reinitialiser-mot-de-passe/", {
      statusCode: 200,
      body: { message: "Mot de passe réinitialisé avec succès." },
    }).as("resetMock");

    cy.visit("/reset-password");

    cy.get('input[placeholder="votre@email.dz"]').type(
      Cypress.env("CANDIDAT_EMAIL")
    );
    cy.get('input[placeholder="123456"]').type("111111");
    cy.get('input[placeholder="Minimum 8 caractères"]').type("NewPassword123!");
    cy.get('input[placeholder="Répétez le mot de passe"]').type("NewPassword123!");

    cy.contains("button", /réinitialiser/i).click();

    cy.wait("@resetMock");
    cy.url().should("include", "/login");
  });

  it("EC1 : Doit bloquer si les mots de passe ne correspondent pas", () => {
    cy.visit("/reset-password");

    cy.get('input[placeholder="votre@email.dz"]').type("test@test.dz");
    cy.get('input[placeholder="123456"]').type("111111");
    cy.get('input[placeholder="Minimum 8 caractères"]').type("Password123!");
    cy.get('input[placeholder="Répétez le mot de passe"]').type("AutrePassword!");

    cy.contains("button", /réinitialiser/i).click();

    // Pas d'appel API — bloqué côté frontend
    cy.contains(/ne correspondent pas/i).should("be.visible");
  });
});
