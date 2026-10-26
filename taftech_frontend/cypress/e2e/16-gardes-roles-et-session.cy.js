/// <reference types="cypress" />

// Parcours complet : accès aux espaces privés selon la session et le rôle.
describe("E2E 16 : Gardes de routes, rôles et session", () => {
  beforeEach(() => {
    cy.bloquerApiReelle();
  });

  describe("Visiteur sans session", () => {
    [
      ["/dashboard-candidat", "/login"],
      ["/mes-candidatures", "/login"],
      ["/profil", "/login"],
      ["/admin-taftech", "/login"],
      ["/dashboard", "/recruteurs/connexion"],
      ["/cvtheque", "/recruteurs/connexion"],
      ["/creer-offre", "/recruteurs/connexion"],
    ].forEach(([page, attendu]) => {
      it(`${page} redirige vers ${attendu}`, () => {
        cy.visit(page);
        cy.location("pathname").should("eq", attendu);
      });
    });
  });

  describe("Candidat connecté", () => {
    it("ne peut pas ouvrir l'espace administrateur", () => {
      cy.visiterConnecte("/admin-taftech", "CANDIDAT", "candidat");
      cy.location("pathname").should("eq", "/dashboard-candidat");
    });

    it("ne peut pas ouvrir l'espace recruteur", () => {
      cy.visiterConnecte("/cvtheque", "CANDIDAT", "candidat");
      cy.location("pathname").should("eq", "/dashboard-candidat");
    });

    it("est renvoyé vers son tableau de bord s'il ouvre /login", () => {
      cy.visiterConnecte("/login", "CANDIDAT", "candidat");
      cy.location("pathname").should("eq", "/dashboard-candidat");
    });
  });

  describe("Recruteur connecté", () => {
    it("ne peut pas ouvrir l'espace candidat", () => {
      cy.visiterConnecte("/mes-candidatures", "RECRUTEUR", "recruteur");
      cy.location("pathname").should("eq", "/dashboard");
    });

    it("ne peut pas ouvrir l'espace administrateur", () => {
      cy.visiterConnecte("/admin-taftech", "RECRUTEUR", "recruteur");
      cy.location("pathname").should("eq", "/dashboard");
    });

    it("est renvoyé vers son tableau de bord s'il ouvre /recruteurs/connexion", () => {
      cy.visiterConnecte("/recruteurs/connexion", "RECRUTEUR", "recruteur");
      cy.location("pathname").should("eq", "/dashboard");
    });
  });

  describe("Administrateur connecté", () => {
    it("est renvoyé vers /admin-taftech s'il ouvre l'espace candidat", () => {
      cy.visiterConnecte("/dashboard-candidat", "ADMIN", "candidat");
      cy.location("pathname").should("match", /^\/admin-taftech/);
    });

    it("est renvoyé vers /admin-taftech s'il ouvre l'espace recruteur", () => {
      cy.visiterConnecte("/dashboard", "ADMIN", "recruteur");
      cy.location("pathname").should("match", /^\/admin-taftech/);
    });
  });

  describe("Session incohérente", () => {
    it("rôle candidat sans portail enregistré : retour sur /login (pas de boucle)", () => {
      cy.visit("/dashboard-candidat", {
        onBeforeLoad(win) { win.localStorage.setItem("userRole", "CANDIDAT"); },
      });
      cy.location("pathname").should("eq", "/login");
    });
  });
});
