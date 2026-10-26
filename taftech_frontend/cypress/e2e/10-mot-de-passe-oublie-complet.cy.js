/// <reference types="cypress" />

// Parcours complet : mot de passe oublié -> code -> nouveau mot de passe -> connexion.
describe("E2E 10 : Mot de passe oublié, parcours complet", () => {
  beforeEach(() => {
    cy.bloquerApiReelle();
  });

  const remplirReset = (u, code, nouveau, confirmation) => {
    cy.get('input[placeholder="votre@email.dz"]').type(u.email);
    cy.get('input[placeholder="123456"]').type(code);
    cy.get('input[placeholder="Minimum 8 caractères"]').type(nouveau, { log: false });
    cy.get('input[placeholder="Répétez le mot de passe"]').type(confirmation, { log: false });
    cy.contains("button", /réinitialiser/i).click();
  };

  it("HP1 : demande de code puis réinitialisation, retour sur /login", () => {
    cy.intercept("POST", "**/accounts/forgot-password/", {
      statusCode: 200,
      body: { message: "Si ce compte existe, un code a été envoyé." },
    }).as("forgot");
    cy.intercept("POST", "**/accounts/reset-password/", {
      statusCode: 200,
      body: { message: "Mot de passe réinitialisé." },
    }).as("reset");

    cy.identiteDynamique("oubli").then((u) => {
      // 1) demande du code
      cy.visit("/forgot-password");
      cy.get('input[type="email"]').type(u.email);
      cy.contains("button", "Envoyer le code").click();
      cy.wait("@forgot").its("request.body").should("deep.include", { email: u.email });

      // 2) saisie du code et du nouveau mot de passe
      cy.visit("/reset-password");
      const code = String(Math.floor(100000 + Math.random() * 900000));
      remplirReset(u, code, u.motDePasse, u.motDePasse);

      cy.wait("@reset").its("request.body").should((body) => {
        expect(body.email).to.eq(u.email);
        expect(body.code).to.eq(code);
      });
      cy.contains("Mot de passe réinitialisé").should("be.visible");
      cy.location("pathname", { timeout: 8000 }).should("eq", "/login");
    });
  });

  it("EC1 : les deux mots de passe diffèrent : aucun appel au serveur", () => {
    let appels = 0;
    cy.intercept("POST", "**/accounts/reset-password/", () => { appels += 1; });

    cy.identiteDynamique("oubli").then((u) => {
      cy.visit("/reset-password");
      remplirReset(u, "123456", u.motDePasse, `${u.motDePasse}x`);
    });

    cy.contains(/ne correspondent pas/i).should("be.visible");
    cy.then(() => expect(appels).to.eq(0));
  });

  it("EC2 : mot de passe de moins de 8 caractères refusé côté formulaire", () => {
    cy.identiteDynamique("oubli").then((u) => {
      cy.visit("/reset-password");
      remplirReset(u, "123456", "Aa1!", "Aa1!");
    });

    cy.contains(/au moins 8 caractères|trop court/i).should("be.visible");
    cy.location("pathname").should("eq", "/reset-password");
  });

  it("EC3 : code invalide ou expiré : le message du serveur est affiché", () => {
    cy.intercept("POST", "**/accounts/reset-password/", {
      statusCode: 400,
      body: { error: "Code invalide ou expiré." },
    }).as("reset");

    cy.identiteDynamique("oubli").then((u) => {
      cy.visit("/reset-password");
      remplirReset(u, "000000", u.motDePasse, u.motDePasse);
    });

    cy.wait("@reset");
    cy.contains(/Réinitialisation impossible/i).should("be.visible");
    cy.location("pathname").should("eq", "/reset-password");
  });
});
