/// <reference types="cypress" />

describe("Flux E2E : Connexion Utilisateur", () => {
  beforeEach(() => {
    cy.intercept("POST", "**/accounts/login/").as("loginAPI");
    cy.visit("/login");
  });

  it("EC1 : Doit bloquer la connexion avec de mauvais identifiants", () => {
    cy.get('input[placeholder="votre@email.com"]').type("compte_inexistant@taftech.dz");
    cy.get('input[placeholder="••••••••"]').type("MauvaisMotDePasse123!");
    cy.contains("button", "Se connecter").click();

    cy.wait("@loginAPI").its("response.statusCode").should("eq", 401);

    cy.url().should("include", "/login");
    cy.window().its("localStorage").invoke("getItem", "userRole").should("be.null");
  });

  it("HP1 : Doit connecter le candidat et rediriger vers l'accueil", () => {
    // Interception avec mock pour ne pas dépendre de la DB
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 200,
      body: { role: "CANDIDAT" },
    }).as("loginMock");

    cy.get('input[placeholder="votre@email.com"]').type(Cypress.env("CANDIDAT_EMAIL"));
    cy.get('input[placeholder="••••••••"]').type(Cypress.env("CANDIDAT_PASSWORD"));
    cy.contains("button", "Se connecter").click();

    cy.wait("@loginMock");
    cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
    cy.window().its("localStorage").invoke("getItem", "userRole").should("eq", "CANDIDAT");
  });

  it("HP2 : Doit connecter le recruteur et rediriger vers le dashboard", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 200,
      body: { role: "RECRUTEUR" },
    }).as("loginMock");

    cy.get('input[placeholder="votre@email.com"]').type(Cypress.env("RECRUTEUR_EMAIL"));
    cy.get('input[placeholder="••••••••"]').type(Cypress.env("RECRUTEUR_PASSWORD"));
    cy.contains("button", "Se connecter").click();

    cy.wait("@loginMock");
    cy.window().its("localStorage").invoke("getItem", "userRole").should("eq", "RECRUTEUR");
  });
});
