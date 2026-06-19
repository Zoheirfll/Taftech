/// <reference types="cypress" />

const MOCK_QUESTIONNAIRE = {
  id: 99,
  titre: "Questionnaire Cypress Test",
  questions: [
    { id: 1, texte: "Combien d'années d'expérience avez-vous ?", type_question: "COURT", requis: true, choix: [] },
    { id: 2, texte: "Quel est votre niveau en React ?", type_question: "CHOIX_UNIQUE", obligatoire: false, choix: [{ id: 1, texte: "Débutant" }, { id: 2, texte: "Expert" }] },
  ],
};

describe("Flux Questionnaire - Recruteur & Candidat", () => {

  // =============================================
  // RECRUTEUR : LISTE & CRUD
  // =============================================

  it("HP1 : Recruteur voit la liste des questionnaires", () => {
    cy.intercept("GET", "**/questionnaires/**", { statusCode: 200, body: [MOCK_QUESTIONNAIRE] }).as("getQuestionnaires");
    cy.login("recruteur");
    cy.visit("/questionnaires");
    cy.wait("@getQuestionnaires");
    cy.contains("Questionnaire Cypress Test").should("be.visible");
  });

  it("HP2 : Recruteur crée un questionnaire avec questions", () => {
    cy.intercept("GET", "**/questionnaires/**", { statusCode: 200, body: [] }).as("getQuestionnaires");
    cy.intercept("POST", "**/questionnaires/**", { statusCode: 201, body: MOCK_QUESTIONNAIRE }).as("createQuestionnaire");

    cy.login("recruteur");
    cy.visit("/questionnaires");
    cy.wait("@getQuestionnaires");

    cy.contains("Nouveau questionnaire").click();
    cy.get('input[placeholder="Ex: Questionnaire Développeur React"]').type("Questionnaire Cypress Test");

    cy.get('input[placeholder="Texte de la question *"]').first().type("Combien d'années d'expérience avez-vous ?");
    cy.get("select").first().select("COURT");
    cy.contains("Requis").click();

    cy.contains("Ajouter une question").click();
    cy.get('input[placeholder="Texte de la question *"]').last().type("Quel est votre niveau en React ?");
    cy.get("select").last().select("CHOIX_UNIQUE");
    cy.get('input[placeholder="Choix 1"]').last().type("Débutant");
    cy.get('input[placeholder="Choix 2"]').last().type("Expert");

    cy.contains("Créer le questionnaire").click();
    cy.wait("@createQuestionnaire");
    cy.contains("Questionnaire créé !").should("be.visible");
  });

  // =============================================
  // CANDIDAT : VOIR QUESTIONNAIRE & POSTULER
  // =============================================

  it("HP3 : Candidat voit le questionnaire avant de postuler", () => {
    cy.intercept("GET", "**/jobs/?*").as("jobsList");
    cy.login("candidat");
    cy.visit("/offres");
    cy.wait("@jobsList");

    cy.intercept("GET", /\/api\/jobs\/\d+\/$/, (req) => {
      req.continue((res) => { res.body.questionnaire = MOCK_QUESTIONNAIRE; });
    }).as("jobDetail");

    cy.contains("a", /voir l'offre/i).first().click();
    cy.wait("@jobDetail");

    cy.contains("Questionnaire requis").should("be.visible");
    cy.contains("Postuler avec mon profil TafTech").click();
    cy.contains("Questionnaire Cypress Test").should("be.visible");
    cy.contains("Combien d'années d'expérience avez-vous ?").should("be.visible");
  });

  it("HP4 : Candidat ne peut pas soumettre sans répondre aux questions requises", () => {
    cy.intercept("GET", "**/jobs/?*").as("jobsList");
    cy.login("candidat");
    cy.visit("/offres");
    cy.wait("@jobsList");

    cy.intercept("GET", /\/api\/jobs\/\d+\/$/, (req) => {
      req.continue((res) => { res.body.questionnaire = MOCK_QUESTIONNAIRE; });
    }).as("jobDetail");

    cy.contains("a", /voir l'offre/i).first().click();
    cy.wait("@jobDetail");

    cy.contains("Postuler avec mon profil TafTech").click();

    // Attendre la modale questionnaire — "Suivant →" n'existe que dans la modale
    cy.contains("button", "Suivant →").should("be.visible");

    // Ne rien remplir et cliquer Suivant — validation = toast "est obligatoire"
    cy.contains("button", "Suivant →").click();
    cy.contains(/obligatoire/i).should("be.visible");
  });

  it("HP5 : Candidat remplit le questionnaire et postule avec succès", () => {
    cy.intercept("GET", "**/jobs/?*").as("jobsList");
    cy.intercept("POST", "**/postuler/", { statusCode: 201, body: { message: "Candidature envoyée !" } }).as("postuler");
    cy.login("candidat");
    cy.visit("/offres");
    cy.wait("@jobsList");

    cy.intercept("GET", /\/api\/jobs\/\d+\/$/, (req) => {
      req.continue((res) => { res.body.questionnaire = MOCK_QUESTIONNAIRE; });
    }).as("jobDetail");

    cy.contains("a", /voir l'offre/i).first().click();
    cy.wait("@jobDetail");

    cy.contains("Postuler avec mon profil TafTech").click();

    // Attendre la modale questionnaire
    cy.contains("button", "Suivant →").should("be.visible");

    // Question COURT = <input> sans type (pas textarea, pas type='text')
    cy.get("input:not([type='radio']):not([type='checkbox']):not([type='hidden'])").first().type("3 ans");
    cy.contains("Expert").click();
    cy.contains("button", "Suivant →").click();

    // Étape lettre de motivation
    cy.get("textarea").first().type("Je suis très motivé pour ce poste.");
    cy.contains("Envoyer ma candidature").click();
    cy.wait("@postuler");
    cy.contains("Candidature envoyée !").should("be.visible");
  });

  // =============================================
  // EDGE CASES — RECRUTEUR
  // =============================================

  it("EC1 : Recruteur peut modifier un questionnaire existant", () => {
    cy.intercept("GET", "**/questionnaires/**", { statusCode: 200, body: [MOCK_QUESTIONNAIRE] }).as("getQuestionnaires");
    cy.intercept("PUT", "**/questionnaires/**", { statusCode: 200, body: { ...MOCK_QUESTIONNAIRE, titre: "Questionnaire Cypress Modifié" } }).as("updateQuestionnaire");

    cy.login("recruteur");
    cy.visit("/questionnaires");
    cy.wait("@getQuestionnaires");

    cy.contains("Questionnaire Cypress Test").parent().parent().find("button").first().click();
    cy.get('input[placeholder="Ex: Questionnaire Développeur React"]').clear({ force: true }).type("Questionnaire Cypress Modifié", { force: true });
    cy.contains("Mettre à jour").click();
    cy.wait("@updateQuestionnaire");
    cy.contains("Questionnaire mis à jour !").should("be.visible");
  });

  it("EC2 : Recruteur peut supprimer un questionnaire", () => {
    cy.intercept("GET", "**/questionnaires/**", { statusCode: 200, body: [MOCK_QUESTIONNAIRE] }).as("getQuestionnaires");
    cy.intercept("DELETE", "**/questionnaires/**", { statusCode: 204 }).as("deleteQuestionnaire");

    cy.login("recruteur");
    cy.visit("/questionnaires");
    cy.wait("@getQuestionnaires");

    cy.window().then((win) => { cy.stub(win, "confirm").returns(true); });

    cy.contains("Questionnaire Cypress Test").parent().parent().find("button").last().click();
    cy.wait("@deleteQuestionnaire");
    cy.contains("Questionnaire supprimé.").should("be.visible");
  });
});
