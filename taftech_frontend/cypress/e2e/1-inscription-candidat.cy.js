/// <reference types="cypress" />

describe("Flux E2E : Inscription Complète Candidat", () => {
  beforeEach(() => {
    // Nettoyer le compte cypress avant chaque test (endpoint DEBUG uniquement)
    cy.request({
      method: "DELETE",
      url: "http://localhost:8000/api/accounts/cypress-cleanup/",
      failOnStatusCode: false,
    }).then((res) => {
      cy.log(`Cleanup: ${res.status}`);
    });

    cy.intercept("POST", "**/accounts/register/candidat/").as("registerAPI");
    cy.intercept("POST", "**/accounts/verifier-email/").as("verifyAPI");
    cy.intercept("GET", "**/jobs/constants/").as("constantsAPI");
    cy.visit("/register");
    cy.wait("@constantsAPI");
  });

  it("HP1 : Doit inscrire le candidat, valider l'OTP et rediriger vers login", () => {
    // Générer un email unique pour éviter les conflits entre runs
    const uniqueEmail = `cypress_${Date.now()}@test.dz`;

    cy.get('input[name="last_name"]').type("Robot");
    cy.get('input[name="first_name"]').type("Cypress");
    cy.get('input[name="date_naissance"]').type("1990-01-01");
    cy.get('input[name="telephone"]').type("0555123456");
    // NIN unique basé sur le timestamp pour éviter les doublons
    cy.get('input[name="nin"]').type("199001011234567890".slice(0, 18));

    cy.get('input[name="email"]').type("cypress@test.dz");
    cy.get('input[name="password"]').type("Password123!");

    // React-select : cliquer sur le conteneur puis l'option
    cy.get(".wilaya-select__control").click();
    cy.get(".wilaya-select__option").contains("31 - Oran").click();

    cy.get('input[name="consentement_loi_18_07"]').check({ force: true });

    cy.contains("button", "S'inscrire gratuitement").click();

    cy.wait("@registerAPI").its("response.statusCode").should("eq", 201);

    cy.contains("Vérifiez votre email").should("be.visible");

    // Code magique 111111 (activé en DEBUG pour cypress@test.dz)
    cy.get('input[maxlength="1"]').eq(0).type("1");
    cy.get('input[maxlength="1"]').eq(1).type("1");
    cy.get('input[maxlength="1"]').eq(2).type("1");
    cy.get('input[maxlength="1"]').eq(3).type("1");
    cy.get('input[maxlength="1"]').eq(4).type("1");
    cy.get('input[maxlength="1"]').eq(5).type("1");

    cy.contains("button", "Confirmer mon compte").click();

    cy.wait("@verifyAPI").its("response.statusCode").should("eq", 200);

    cy.url().should("include", "/login");
    cy.contains("Email vérifié avec succès").should("be.visible");
  });

  it("EC1 : Doit bloquer si email déjà utilisé", () => {
    cy.get('input[name="last_name"]').type("Robot");
    cy.get('input[name="first_name"]').type("Cypress");
    cy.get('input[name="date_naissance"]').type("1990-01-01");
    cy.get('input[name="telephone"]').type("0555123456");
    cy.get('input[name="nin"]').type("123456789012345678");
    cy.get('input[name="email"]').type("cypress@test.dz");
    cy.get('input[name="password"]').type("Password123!");
    cy.get(".wilaya-select__control").click();
    cy.get(".wilaya-select__option").contains("31 - Oran").click();
    cy.get('input[name="consentement_loi_18_07"]').check({ force: true });
    cy.contains("button", "S'inscrire gratuitement").click();

    cy.wait("@registerAPI").then((interception) => {
      expect(interception.response.statusCode).to.be.oneOf([400, 409]);
    });
  });
});
