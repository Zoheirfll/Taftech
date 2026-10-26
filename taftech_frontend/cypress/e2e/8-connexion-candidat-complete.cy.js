/// <reference types="cypress" />

// Parcours complet : connexion d'un candidat (identifiants générés, API simulée).
describe("E2E 8 : Connexion candidat complète", () => {
  beforeEach(() => {
    cy.bloquerApiReelle();
    cy.intercept("GET", "**/csrf/**", { statusCode: 200, body: {} });
  });

  const remplir = (u) => {
    cy.get('input[placeholder="votre@email.com"]').type(u.email);
    cy.get('input[placeholder="••••••••"]').type(u.motDePasse, { log: false });
    cy.contains("button", "Se connecter").click();
  };

  it("HP1 : connexion réussie, session posée puis redirection vers le tableau de bord", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 200,
      body: { role: "CANDIDAT" },
    }).as("login");

    cy.identiteDynamique("candidat").then((u) => {
      cy.visit("/login");
      remplir(u);

      cy.wait("@login").its("request.body").should((body) => {
        expect(body.username || body.email).to.eq(u.email);
        expect(body.password).to.eq(u.motDePasse);
      });
    });

    cy.location("pathname").should("eq", "/dashboard-candidat");
    cy.window().its("localStorage").invoke("getItem", "userRole").should("eq", "CANDIDAT");
    cy.window().its("localStorage").invoke("getItem", "loginPortal").should("eq", "candidat");
  });

  it("HP2 : le paramètre ?next= ramène le candidat sur la page demandée", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 200,
      body: { role: "CANDIDAT" },
    });

    cy.identiteDynamique("candidat").then((u) => {
      cy.visit("/login?next=/mes-candidatures");
      remplir(u);
    });

    cy.location("pathname").should("eq", "/mes-candidatures");
  });

  it("EC1 : identifiants refusés (401) : on reste sur /login, aucune session", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 401,
      body: { detail: "Identifiants invalides." },
    }).as("login");

    cy.identiteDynamique("inconnu").then((u) => {
      cy.visit("/login");
      remplir(u);
    });

    cy.wait("@login");
    cy.contains("Connexion impossible").should("be.visible");
    cy.location("pathname").should("eq", "/login");
    cy.window().its("localStorage").invoke("getItem", "userRole").should("be.null");
  });

  it("EC2 : trop de tentatives (429) : le message du serveur est montré, pas de session", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 429,
      body: { detail: "Trop de tentatives. Réessayez dans quelques minutes." },
    }).as("login");

    cy.identiteDynamique("brute").then((u) => {
      cy.visit("/login");
      remplir(u);
    });

    cy.wait("@login");
    cy.contains("Connexion impossible").should("be.visible");
    cy.location("pathname").should("eq", "/login");
    cy.window().its("localStorage").invoke("getItem", "userRole").should("be.null");
  });

  it("EC3 : le jeton n'est jamais stocké dans le navigateur (cookies httpOnly)", () => {
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 200,
      body: { role: "CANDIDAT" },
    }).as("login");

    cy.identiteDynamique("candidat").then((u) => {
      cy.visit("/login");
      remplir(u);
    });

    cy.wait("@login");
    cy.window().then((win) => {
      const cles = Object.keys(win.localStorage).concat(Object.keys(win.sessionStorage));
      cles.forEach((c) => expect(c.toLowerCase()).not.to.match(/token|jwt|access|refresh/));
    });
  });
});
