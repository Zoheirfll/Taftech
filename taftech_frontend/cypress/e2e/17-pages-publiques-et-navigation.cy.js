/// <reference types="cypress" />

// Parcours complet d'un visiteur : pages d'information, page introuvable, remerciements, navigation.
describe("E2E 17 : Pages publiques et navigation", () => {
  beforeEach(() => {
    cy.bloquerApiReelle();
    cy.simulerReferentiel();
    cy.intercept({ method: "GET", pathname: "/api/jobs/" }, {
      statusCode: 200,
      body: { count: 0, next: null, previous: null, results: [] },
    });
  });

  it("404 : une adresse inconnue affiche « Page introuvable »", () => {
    cy.identiteDynamique("x").then((u) => {
      cy.visit(`/page-${u.id}`, { failOnStatusCode: false });
    });
    cy.contains("h1", "Page introuvable").should("be.visible");
  });

  it("404 : une adresse inconnue sous /blog ou /secteurs n'écrase pas le site (pas d'écran blanc)", () => {
    cy.visit("/blog/article-inexistant-0", { failOnStatusCode: false });
    cy.get("body").should("not.be.empty");
    cy.get("#root").should("not.be.empty");
  });

  it("Pages d'information : titre visible pour « Qui sommes-nous », « Contact » et « Offres »", () => {
    cy.visit("/qui-sommes-nous");
    cy.get("h1").should("be.visible");

    cy.visit("/contact");
    cy.contains("h1", "Contactez-").should("be.visible");

    cy.visit("/offres");
    cy.contains("h1", "Offres d'emploi").should("be.visible");
  });

  it("Blog : la page s'affiche avec son titre même sans article", () => {
    cy.intercept("GET", "**/blog/**", { statusCode: 200, body: { count: 0, results: [] } });
    cy.visit("/blog");
    cy.contains("h1", "Blog TafTech").should("be.visible");
  });

  it("Remerciement : /merci?type=contact affiche un message et des liens de retour", () => {
    cy.visit("/merci?type=contact");
    cy.get("h1").should("be.visible");
    cy.get('a[href="/offres"], a[href="/"], a[href="/recruteurs"]').should("have.length.at.least", 1);
  });

  it("Remerciement : un type inconnu retombe sur le message par défaut, sans erreur", () => {
    cy.identiteDynamique("x").then((u) => {
      cy.visit(`/merci?type=inconnu-${u.id}`);
    });
    cy.get("h1").should("be.visible");
  });

  it("Portail recruteur : la page d'accueil recruteur est publique", () => {
    cy.visit("/recruteurs");
    cy.location("pathname").should("eq", "/recruteurs");
    cy.get("h1").first().should("be.visible");
  });

  it("Navigation : de l'accueil à la connexion puis à l'inscription candidat", () => {
    cy.visit("/login");
    cy.get('a[href="/register"]').first().click();
    cy.location("pathname").should("eq", "/register");
    cy.visit("/login");
    cy.get('a[href="/forgot-password"]').click();
    cy.location("pathname").should("eq", "/forgot-password");
  });

  it("Pages légales : confidentialité, CGU et mentions légales répondent sans erreur", () => {
    cy.intercept("GET", "**/pages/**", {
      statusCode: 200,
      body: { slug: "x", titre: "Page légale", contenu: "<p>Texte</p>" },
    });
    ["/confidentialite", "/cgu", "/mentions-legales"].forEach((page) => {
      cy.visit(page);
      cy.get("#root").should("not.be.empty");
      cy.location("pathname").should("eq", page);
    });
  });
});
