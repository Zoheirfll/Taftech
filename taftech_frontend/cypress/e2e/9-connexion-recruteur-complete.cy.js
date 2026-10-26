/// <reference types="cypress" />

// Parcours complet : connexion d'un recruteur sur son portail dédié.
describe("E2E 9 : Connexion recruteur complète", () => {
  beforeEach(() => {
    cy.bloquerApiReelle();
  });

  const remplir = (u) => {
    cy.get('input[placeholder="votre@entreprise.com"]').type(u.email);
    cy.get('input[placeholder="••••••••"]').type(u.motDePasse, { log: false });
    cy.contains("button", "Se connecter").click();
  };

  it("HP1 : connexion réussie puis redirection vers /dashboard", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 200,
      body: { role: "RECRUTEUR" },
    }).as("login");

    cy.identiteDynamique("rh").then((u) => {
      cy.visit("/recruteurs/connexion");
      remplir(u);
    });

    cy.wait("@login");
    cy.location("pathname").should("eq", "/dashboard");
    cy.window().its("localStorage").invoke("getItem", "userRole").should("eq", "RECRUTEUR");
    cy.window().its("localStorage").invoke("getItem", "loginPortal").should("eq", "recruteur");
  });

  it("EC1 : un compte candidat est refusé sur le portail recruteur", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 200,
      body: { role: "CANDIDAT" },
    }).as("login");

    cy.identiteDynamique("candidat").then((u) => {
      cy.visit("/recruteurs/connexion");
      remplir(u);
    });

    cy.wait("@login");
    cy.contains("Accès refusé").should("be.visible");
    cy.location("pathname").should("not.eq", "/dashboard");
    cy.window().its("localStorage").invoke("getItem", "userRole").should("be.null");
  });

  it("EC2 : mauvais mot de passe (401) : message d'échec et pas de session", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 401,
      body: { detail: "Identifiants invalides." },
    }).as("login");

    cy.identiteDynamique("rh").then((u) => {
      cy.visit("/recruteurs/connexion");
      remplir(u);
    });

    cy.wait("@login");
    cy.contains("Connexion impossible").should("be.visible");
    cy.location("pathname").should("eq", "/recruteurs/connexion");
    cy.window().its("localStorage").invoke("getItem", "userRole").should("be.null");
  });

  it("EC3 : le portail est protégé contre la force brute : le détail du serveur est affiché", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 429,
      body: { detail: "Trop de tentatives. Réessayez plus tard." },
    }).as("login");

    cy.identiteDynamique("rh").then((u) => {
      cy.visit("/recruteurs/connexion");
      remplir(u);
    });

    cy.wait("@login");
    cy.contains("Connexion impossible").should("be.visible");
    cy.location("pathname").should("eq", "/recruteurs/connexion");
  });

  it("NAV : les liens « mot de passe oublié » et « inscription » mènent aux bonnes pages", () => {
    cy.visit("/recruteurs/connexion");
    cy.get('a[href="/recruteurs/mot-de-passe-oublie"]').click();
    cy.location("pathname").should("eq", "/recruteurs/mot-de-passe-oublie");

    cy.visit("/recruteurs/connexion");
    cy.get('a[href="/recruteurs/inscription"]').last().click();
    cy.location("pathname").should("eq", "/recruteurs/inscription");
  });
});
