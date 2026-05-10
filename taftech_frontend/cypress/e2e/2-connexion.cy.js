/// <reference types="cypress" />
/* global cy, describe, it, beforeEach, expect */

/// <reference types="cypress" />

describe("🔐 Flux E2E : Connexion Utilisateur", () => {
  beforeEach(() => {
    // On écoute les requêtes vers l'API de connexion
    cy.intercept("POST", "**/accounts/login/").as("loginAPI");

    // On visite la page de connexion
    cy.visit("http://localhost:5173/login");
  });

  it("🔴 EC1 : Doit empêcher la connexion si les identifiants sont invalides", () => {
    cy.log("📝 Saisie de mauvais identifiants...");

    // 👇 CIBLAGE PRÉCIS : On utilise le placeholder pour ne pas confondre avec le footer
    cy.get('input[placeholder="Adresse Email"]').type(
      "compte_imaginaire@taftech.dz",
    );
    cy.get('input[placeholder="Mot de passe"]').type("MauvaisMotDePasse123!");

    // Ciblage strict du bouton
    cy.contains("button", "Se connecter").click();

    // On attend la réponse de Django (401 Unauthorized)
    cy.wait("@loginAPI").its("response.statusCode").should("eq", 401);

    // On vérifie la VRAIE sécurité : l'utilisateur reste bloqué sur la page Login
    cy.url().should("include", "/login");

    // Et on s'assure qu'absolument rien n'a été stocké dans le navigateur
    cy.window().then((win) => {
      expect(win.localStorage.getItem("userRole")).to.be.null;
    });
  });

  it("🟢 HP1 : Doit connecter l'utilisateur, rediriger et recharger la page", () => {
    cy.log("📝 Simulation d'une connexion réussie...");

    // On force Django à répondre "OK" (200) avec un rôle (indépendant de la DB)
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 200,
      body: { role: "CANDIDAT" },
    }).as("loginSuccess");

    // 👇 CIBLAGE PRÉCIS par placeholder
    cy.get('input[placeholder="Adresse Email"]').type(
      "candidat_valide@test.dz",
    );
    cy.get('input[placeholder="Mot de passe"]').type("MotDePasseValide123!");

    // Ciblage strict du bouton
    cy.contains("button", "Se connecter").click();

    // On attend l'interception de succès
    cy.wait("@loginSuccess");

    // On vérifie directement qu'on est bien sur l'accueil
    cy.url().should("eq", "http://localhost:5173/");

    // On vérifie que le rôle a bien été stocké par votre code React
    cy.window().then((win) => {
      expect(win.localStorage.getItem("userRole")).to.eq("CANDIDAT");
    });
  });
});
