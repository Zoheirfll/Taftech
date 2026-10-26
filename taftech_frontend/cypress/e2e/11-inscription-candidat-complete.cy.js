/// <reference types="cypress" />

// Parcours complet : inscription d'un candidat -> code e-mail à 6 chiffres -> suite.
describe("E2E 11 : Inscription candidat complète", () => {
  beforeEach(() => {
    cy.bloquerApiReelle();
    cy.simulerReferentiel();
    cy.intercept("POST", "**/accounts/register/candidat/").as("register");
    cy.intercept("POST", "**/accounts/verifier-email/").as("verify");
    cy.intercept("POST", "**/accounts/renvoyer-code/").as("resend");
  });

  const remplirFormulaire = (u, { consentement = true, confirmation } = {}) => {
    cy.get('input[name="last_name"]').type(u.nom);
    cy.get('input[name="first_name"]').type(u.prenom);
    cy.get('input[name="date_naissance"]').type("1990-01-01");
    cy.get('input[name="telephone"]').type(u.telephone);
    cy.get(".wilaya-select__control").click();
    cy.get(".wilaya-select__option").contains("31 - Oran").click();
    cy.get('input[name="adresse"]').type(`${u.id} rue des Tests`);
    cy.get('input[name="email"]').type(u.email);
    cy.get('input[name="password"]').type(u.motDePasse, { log: false });
    cy.get('input[name="confirmPassword"]').type(confirmation ?? u.motDePasse, { log: false });
    if (consentement) cy.get('input[name="consentement_loi_18_07"]').check({ force: true });
  };

  const saisirCode = (code) => {
    code.split("").forEach((chiffre, i) => cy.get('input[maxlength="1"]').eq(i).type(chiffre));
  };

  it("HP1 : inscription, saisie du code à 6 chiffres puis confirmation du compte", () => {
    cy.intercept("POST", "**/accounts/register/candidat/", {
      statusCode: 201,
      body: { message: "Code envoyé." },
    }).as("register");
    cy.intercept("POST", "**/accounts/verifier-email/", {
      statusCode: 200,
      body: { message: "Email vérifié." },
    }).as("verify");

    cy.identiteDynamique("candidat").then((u) => {
      cy.visit("/register");
      cy.wait("@constantsAPI");
      remplirFormulaire(u);
      cy.contains("button", "S'inscrire gratuitement").click();

      cy.wait("@register").its("request.body").should((body) => {
        expect(body.email).to.eq(u.email);
        expect(body.last_name).to.eq(u.nom);
      });
      cy.contains("Vérifiez votre email").should("be.visible");

      const code = String(Math.floor(100000 + Math.random() * 900000));
      saisirCode(code);
      cy.contains("button", "Confirmer mon compte").click();

      cy.wait("@verify").its("request.body").should((body) => {
        expect(body.email).to.eq(u.email);
        expect(body.code || body.otp).to.eq(code);
      });
    });

    // Un nouvel inscrit est dirigé vers l'assistant d'intégration (ou /login sinon)
    cy.location("pathname").should("match", /^\/(onboarding|login)$/);
  });

  it("EC1 : e-mail déjà utilisé : message d'erreur, on reste sur le formulaire", () => {
    cy.intercept("POST", "**/accounts/register/candidat/", {
      statusCode: 400,
      body: { email: ["Cette adresse e-mail est déjà utilisée."] },
    }).as("register");

    cy.identiteDynamique("candidat").then((u) => {
      cy.visit("/register");
      cy.wait("@constantsAPI");
      remplirFormulaire(u);
      cy.contains("button", "S'inscrire gratuitement").click();
    });

    cy.wait("@register");
    cy.contains("Inscription impossible").should("be.visible");
    cy.contains("Vérifiez votre email").should("not.exist");
  });

  it("EC2 : mots de passe différents : aucun envoi au serveur", () => {
    let appels = 0;
    cy.intercept("POST", "**/accounts/register/candidat/", () => { appels += 1; });

    cy.identiteDynamique("candidat").then((u) => {
      cy.visit("/register");
      cy.wait("@constantsAPI");
      remplirFormulaire(u, { confirmation: `${u.motDePasse}x` });
      cy.contains("button", "S'inscrire gratuitement").click();
    });

    cy.contains(/ne correspondent pas/i).should("be.visible");
    cy.then(() => expect(appels).to.eq(0));
  });

  it("EC3 : sans consentement Loi 18-07, le bouton d'inscription reste bloqué", () => {
    cy.identiteDynamique("candidat").then((u) => {
      cy.visit("/register");
      cy.wait("@constantsAPI");
      remplirFormulaire(u, { consentement: false });
    });
    cy.contains("button", "S'inscrire gratuitement").should("be.disabled");
  });

  it("EC4 : code de vérification incorrect : message d'erreur, pas de redirection", () => {
    cy.intercept("POST", "**/accounts/register/candidat/", { statusCode: 201, body: {} });
    cy.intercept("POST", "**/accounts/verifier-email/", {
      statusCode: 400,
      body: { error: "Le code est incorrect." },
    }).as("verify");

    cy.identiteDynamique("candidat").then((u) => {
      cy.visit("/register");
      cy.wait("@constantsAPI");
      remplirFormulaire(u);
      cy.contains("button", "S'inscrire gratuitement").click();
      cy.contains("Vérifiez votre email").should("be.visible");
      saisirCode("000000");
      cy.contains("button", "Confirmer mon compte").click();
    });

    cy.wait("@verify");
    cy.contains("Vérification impossible").should("be.visible");
    cy.location("pathname").should("eq", "/register");
  });
});
