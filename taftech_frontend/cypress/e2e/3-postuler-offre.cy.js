/// <reference types="cypress" />
/* global cy, describe, it, beforeEach,  */
describe("🚀 Flux E2E : Parcours Candidat (Postuler à une offre)", () => {
  beforeEach(() => {
    // 1. On écoute le réseau (Aucune triche, on va vraiment se connecter)
    cy.intercept("POST", "**/accounts/login/").as("loginAPI");
    cy.intercept("GET", "**/jobs/?*").as("jobsAPI");
    cy.intercept("GET", "**/jobs/*/").as("jobDetailAPI");
    cy.intercept("POST", "**/jobs/*/postuler/").as("postulerAPI");

    // 2. Cypress se connecte avant chaque test
    cy.visit("http://localhost:5173/login");

    // 👇 VRAIE CONNEXION avec le compte créé au Test 1 👇
    cy.get('input[placeholder="Adresse Email"]').type("cypress@test.dz");
    cy.get('input[placeholder="Mot de passe"]').type("Password123!");
    cy.contains("button", "Se connecter").click();

    // On attend que Django réponde 200 (Succès) et donne les vrais cookies
    cy.wait("@loginAPI").its("response.statusCode").should("eq", 200);

    // On s'assure d'être bien redirigé sur l'accueil
    cy.url().should("eq", "http://localhost:5173/");
  });

  it("🟢 HP1 : Doit trouver la première offre, l'ouvrir et postuler avec succès", () => {
    // -----------------------------------------------------
    // ÉTAPE 1 : Navigation vers les offres
    // -----------------------------------------------------
    cy.log("🗺️ Navigation vers la liste des offres...");

    // On visite la page des offres
    cy.visit("http://localhost:5173/offres");

    // Cette fois-ci, Django va répondre 200 car nous avons nos cookies !
    cy.wait("@jobsAPI")
      .its("response.statusCode")
      .should("be.oneOf", [200, 304]);

    // -----------------------------------------------------
    // ÉTAPE 2 : Sélection de la première offre
    // -----------------------------------------------------
    cy.log("🖱️ Clic sur la première offre...");

    // On clique sur le premier bouton "Voir l'offre" trouvé
    cy.contains("a", "Voir l'offre").first().click();

    // On s'assure que le bloc de candidature est visible
    cy.contains("Prêt(e) à relever le défi ?").should("be.visible");

    // -----------------------------------------------------
    // ÉTAPE 3 : Le processus de postulation
    // -----------------------------------------------------
    cy.log("📝 Choix du mode de postulation (Profil TafTech)...");

    cy.contains("button", "Postuler avec mon profil TafTech").click();

    cy.log("✍️ Rédaction de la lettre de motivation...");
    cy.get('textarea[placeholder*="lettre de motivation"]').type(
      "Bonjour, je suis très motivé par cette offre. Voici ma candidature Cypress !",
    );

    cy.log("🚀 Envoi de la candidature...");

    // On simule juste la dernière étape (le succès) pour ne pas créer 100 candidatures dans votre DB
    cy.intercept("POST", "**/jobs/*/postuler/", {
      statusCode: 201,
      body: { message: "Candidature envoyée" },
    }).as("postulerSuccess");

    cy.contains("button", "Envoyer ma candidature").click();

    // -----------------------------------------------------
    // ÉTAPE 4 : Vérification du succès
    // -----------------------------------------------------
    cy.log("✅ Vérification du message de succès...");

    cy.wait("@postulerSuccess");

    cy.contains("Candidature envoyée !").should("be.visible");
    cy.contains("Le recruteur a bien reçu votre profil").should("be.visible");
  });
});
