/// <reference types="cypress" />
/* global cy, describe, it, beforeEach,  */
describe("🚀 Flux E2E : Inscription Complète Candidat", () => {
  // Le reste de votre code...
  beforeEach(() => {
    // On espionne les requêtes pour pouvoir synchroniser Cypress avec le Backend
    cy.intercept("POST", "**/accounts/register/candidat/").as("registerAPI");
    cy.intercept("POST", "**/accounts/verifier-email/").as("verifyAPI");
    cy.intercept("GET", "**/jobs/constants/").as("constantsAPI");

    // On visite la page d'inscription
    cy.visit("http://localhost:5173/register");

    // On attend que les wilayas chargent pour éviter que le select soit vide
    cy.wait("@constantsAPI");
  });

  it("Doit inscrire le candidat, valider l'OTP magique et rediriger vers le login", () => {
    // -----------------------------------------------------
    // ÉTAPE 1 : Remplissage du formulaire
    // -----------------------------------------------------
    cy.log("📝 Remplissage du formulaire...");

    cy.get('input[name="last_name"]').type("Robot");
    cy.get('input[name="first_name"]').type("Cypress");
    cy.get('input[name="date_naissance"]').type("1990-01-01");
    cy.get('input[name="telephone"]').type("0555123456");
    cy.get('input[name="nin"]').type("123456789012345678");

    // 👇 L'Email magique qui active notre condition Django
    cy.get('input[name="email"]').type("cypress@test.dz");
    cy.get('input[name="password"]').type("Password123!");

    // Sélection de la Wilaya dans react-select
    // Sélection de la Wilaya dans react-select
    // On force le clic car react-select superpose des divs invisibles
    cy.contains("Sélectionnez...").click({ force: true });

    // Une fois le menu ouvert, on clique sur l'option Oran
    cy.contains("31 - Oran").click();

    // Coche la loi 18-07
    cy.get('input[type="checkbox"]').check();

    // Soumission !
    cy.contains("S'inscrire gratuitement").click();

    // -----------------------------------------------------
    // ÉTAPE 2 : Vérification OTP
    // -----------------------------------------------------
    cy.log("⏳ Attente de la sauvegarde Django...");
    cy.wait("@registerAPI").its("response.statusCode").should("eq", 201);

    cy.contains("Vérifiez votre email").should("be.visible");

    cy.log("🔐 Saisie du code OTP magique (111111)...");

    // On cible exactement les 6 cases grâce au maxlength="1"
    // et on tape le "1" case par case pour ne pas brusquer l'auto-focus de React
    cy.get('input[maxlength="1"]').eq(0).type("1");
    cy.get('input[maxlength="1"]').eq(1).type("1");
    cy.get('input[maxlength="1"]').eq(2).type("1");
    cy.get('input[maxlength="1"]').eq(3).type("1");
    cy.get('input[maxlength="1"]').eq(4).type("1");
    cy.get('input[maxlength="1"]').eq(5).type("1");

    cy.contains("Confirmer mon compte").click();

    // -----------------------------------------------------
    // ÉTAPE 3 : Validation et redirection
    // -----------------------------------------------------
    cy.log("✅ Validation de l'email et redirection...");

    // On s'assure que la vérification est un succès côté backend
    cy.wait("@verifyAPI").its("response.statusCode").should("eq", 200);

    // Vérification finale : React nous a-t-il bien redirigé vers le Login ?
    cy.url().should("include", "/login");

    // Bonus : Vérifier le Toast de succès
    cy.contains("Email vérifié avec succès").should("be.visible");
  });
});
