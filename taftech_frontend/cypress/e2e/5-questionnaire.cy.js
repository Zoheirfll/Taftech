// 5-questionnaire_cy.js
// Flux complet : Recruteur crée questionnaire → lie à offre → Candidat postule en remplissant
/// <reference types="cypress" />
/* global cy, describe, it, Cypress */
describe("📋 Flux Questionnaire - Recruteur & Candidat", () => {
  const recruteur = {
    email: Cypress.env("RECRUTEUR_EMAIL"),
    password: Cypress.env("RECRUTEUR_PASSWORD"),
  };
  const candidat = {
    email: Cypress.env("CANDIDAT_EMAIL"),
    password: Cypress.env("CANDIDAT_PASSWORD"),
  };

  // =============================================
  // PARTIE 1 — RECRUTEUR CRÉE UN QUESTIONNAIRE
  // =============================================

  it("🟢 HP1 : Recruteur crée un questionnaire avec questions", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(recruteur.email);
    cy.get('input[type="password"]').type(recruteur.password);
    cy.get('button[type="submit"]').click();
    cy.url().should("not.include", "/login");

    cy.visit("/questionnaires");
    cy.contains("Nouveau questionnaire").click();

    // Titre
    cy.get('input[placeholder*="Questionnaire Développeur"]').type(
      "Questionnaire Cypress Test",
    );

    // Question 1 — Réponse courte requise
    cy.get('input[placeholder="Texte de la question *"]')
      .first()
      .type("Combien d'années d'expérience avez-vous ?");
    cy.get("select").first().select("COURT");
    cy.contains("Requis").click();

    // Ajouter question 2
    cy.contains("Ajouter une question").click();
    cy.get('input[placeholder="Texte de la question *"]')
      .last()
      .type("Quel est votre niveau en React ?");
    cy.get("select").last().select("CHOIX_UNIQUE");

    // Remplir les choix
    cy.get('input[placeholder="Choix 1"]').last().type("Débutant");
    cy.get('input[placeholder="Choix 2"]').last().type("Expert");

    cy.contains("Créer le questionnaire").click();
    cy.contains("Questionnaire créé !").should("be.visible");
    cy.contains("Questionnaire Cypress Test").should("be.visible");
  });

  // =============================================
  // PARTIE 2 — RECRUTEUR LIE LE QUESTIONNAIRE À UNE OFFRE
  // =============================================

  it("🟢 HP2 : Recruteur crée une offre avec le questionnaire", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(recruteur.email);
    cy.get('input[type="password"]').type(recruteur.password);
    cy.get('button[type="submit"]').click();
    cy.url().should("not.include", "/login");

    cy.visit("/creer-offre");

    // Titre
    cy.get('input[placeholder*="Ingénieur Fullstack"]')
      .invoke("val", "Développeur React Cypress")
      .trigger("input");
    cy.wait(1000);
    cy.get("body").click(0, 0);
    cy.wait(500);
    cy.get("body").click(0, 0); // fermer suggestions
    cy.wait(500);

    // Type contrat
    cy.get('[name="type_contrat"]', { timeout: 5000 }).should("exist");

    // Wilaya
    cy.get(".react-select__control", { timeout: 10000 }).eq(1).click();
    cy.get(".react-select__option", { timeout: 5000 }).first().click();

    // Spécialité
    cy.get(".react-select__control").eq(4).click();
    cy.get(".react-select__option").first().click();

    // Associer questionnaire
    cy.contains("Associer un questionnaire").click();
    cy.contains("Questionnaire Cypress Test").click();

    // Missions
    cy.get('textarea[name="missions"]').type(
      "Développer des interfaces React.",
    );

    cy.contains("PUBLIER L'OFFRE").click();
    cy.contains("Offre publiée avec succès").should("be.visible");
  });

  // =============================================
  // PARTIE 3 — CANDIDAT POSTULE EN REMPLISSANT LE QUESTIONNAIRE
  // =============================================

  it("🟢 HP3 : Candidat voit le questionnaire avant de postuler", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(candidat.email);
    cy.get('input[type="password"]').type(candidat.password);
    cy.get('button[type="submit"]').click();
    cy.url().should("include", "/");

    cy.visit("/offres");
    cy.contains("Développeur React Cypress").click();

    // Bouton postuler indique questionnaire requis
    cy.contains("Questionnaire requis").should("be.visible");
    cy.contains("Postuler avec mon profil TafTech").click();

    // Modale questionnaire s'ouvre
    cy.contains("Questionnaire Cypress Test").should("be.visible");
    cy.contains("Combien d'années d'expérience avez-vous ?").should(
      "be.visible",
    );
  });

  it("🟢 HP4 : Candidat ne peut pas soumettre sans répondre aux questions requises", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(candidat.email);
    cy.get('input[type="password"]').type(candidat.password);
    cy.get('button[type="submit"]').click();

    cy.visit("/offres");
    cy.contains("Développeur React Cypress").click();
    cy.contains("Postuler avec mon profil TafTech").click();

    // Tenter de passer sans répondre
    cy.contains("Suivant →").click();

    // Toast d'erreur
    cy.contains("est obligatoire").should("be.visible");
  });

  it("🟢 HP5 : Candidat remplit le questionnaire et postule avec succès", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(candidat.email);
    cy.get('input[type="password"]').type(candidat.password);
    cy.get('button[type="submit"]').click();

    cy.visit("/offres");
    cy.contains("Développeur React Cypress").click();
    cy.contains("Postuler avec mon profil TafTech").click();

    // Remplir question requise
    cy.get('input[type="text"]').first().type("3 ans");

    // Sélectionner choix unique
    cy.contains("Expert").click();

    cy.contains("Suivant →").click();

    // Étape lettre de motivation
    cy.get('textarea[placeholder*="Lettre de motivation"]').type(
      "Je suis très motivé pour ce poste.",
    );
    cy.contains("Envoyer ma candidature").click();

    cy.contains("Candidature envoyée !").should("be.visible");
  });

  // =============================================
  // PARTIE 4 — RECRUTEUR VOIT LES RÉPONSES
  // =============================================

  it("🟢 HP6 : Recruteur voit les réponses du candidat dans GestionOffre", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(recruteur.email);
    cy.get('input[type="password"]').type(recruteur.password);
    cy.get('button[type="submit"]').click();
    cy.url().should("not.include", "/login");

    cy.contains("Développeur React Cypress").click();

    // Sélectionner le candidat
    cy.get(".divide-y button").first().click();

    // Onglet Questionnaire
    cy.contains("Questionnaire").click();

    cy.contains("Questionnaire Cypress Test").should("be.visible");
    cy.contains("Combien d'années d'expérience").should("be.visible");
    cy.contains("3 ans").should("be.visible");
  });

  // =============================================
  // EDGE CASES
  // =============================================

  it("🔴 EC1 : Recruteur peut modifier un questionnaire existant", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(recruteur.email);
    cy.get('input[type="password"]').type(recruteur.password);
    cy.get('button[type="submit"]').click();

    cy.visit("/questionnaires");
    cy.contains("Questionnaire Cypress Test")
      .parent()
      .parent()
      .find("button")
      .first()
      .click();

    cy.get('input[value="Questionnaire Cypress Test"]')
      .clear()
      .type("Questionnaire Cypress Modifié");

    cy.contains("Mettre à jour").click();
    cy.contains("Questionnaire mis à jour !").should("be.visible");
    cy.contains("Questionnaire Cypress Modifié").should("be.visible");
  });

  it("🔴 EC2 : Recruteur peut supprimer un questionnaire", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').type(recruteur.email);
    cy.get('input[type="password"]').type(recruteur.password);
    cy.get('button[type="submit"]').click();

    cy.visit("/questionnaires");

    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(true);
    });

    cy.contains("Questionnaire Cypress Modifié")
      .parent()
      .parent()
      .find("button")
      .last()
      .click();

    cy.contains("Questionnaire supprimé.").should("be.visible");
    cy.contains("Questionnaire Cypress Modifié").should("not.exist");
  });
});
