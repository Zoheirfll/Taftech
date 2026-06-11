/// <reference types="cypress" />

describe("Flux E2E : Parcours Candidat (Postuler à une offre)", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/jobs/?*").as("jobsAPI");
    cy.intercept("GET", "**/jobs/*/").as("jobDetailAPI");
    cy.login("candidat");
  });

  it("HP1 : Doit trouver la première offre et postuler avec succès", () => {
    cy.visit("/offres");
    cy.wait("@jobsAPI").its("response.statusCode").should("be.oneOf", [200, 304]);

    // Intercepter le détail de l'offre pour forcer questionnaire=null
    cy.intercept("GET", "**/jobs/*/", (req) => {
      req.continue((res) => {
        res.body.questionnaire = null;
      });
    }).as("jobDetailMock");

    cy.intercept("POST", "**/postuler/", {
      statusCode: 201,
      body: { message: "Candidature envoyée avec succès !" },
    }).as("postulerMock");

    cy.contains("a", /voir l'offre/i).first().click();
    cy.wait("@jobDetailMock");

    cy.contains(/prêt à postuler/i).should("be.visible");
    cy.contains("button", /postuler avec mon profil taftech/i).click();

    cy.get("textarea").first().type(
      "Je suis très motivé par cette offre. Voici ma candidature Cypress !"
    );

    cy.contains("button", /envoyer ma candidature/i).click();
    cy.wait("@postulerMock");
    cy.contains(/candidature envoyée/i).should("be.visible");
  });

  it("EC1 : Doit afficher une erreur si déjà postulé", () => {
    cy.intercept("GET", "**/jobs/*/", (req) => {
      req.continue((res) => { res.body.questionnaire = null; });
    }).as("jobDetailMock");

    cy.intercept("POST", "**/postuler/", {
      statusCode: 400,
      body: { error: "Vous avez déjà postulé à cette offre." },
    }).as("doublon");

    cy.visit("/offres");
    cy.wait("@jobsAPI");
    cy.contains("a", /voir l'offre/i).first().click();
    cy.wait("@jobDetailMock");
    cy.contains("button", /postuler avec mon profil taftech/i).click();
    cy.get("textarea").first().type("Tentative de doublon");
    cy.contains("button", /envoyer ma candidature/i).click();

    cy.wait("@doublon");
    cy.contains(/déjà postulé/i).should("be.visible");
  });
});
