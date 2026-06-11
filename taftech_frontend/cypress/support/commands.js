// Commande réutilisable de connexion — utilisée dans tous les tests
Cypress.Commands.add("login", (role = "candidat") => {
  const email =
    role === "recruteur"
      ? Cypress.env("RECRUTEUR_EMAIL")
      : Cypress.env("CANDIDAT_EMAIL");
  const password =
    role === "recruteur"
      ? Cypress.env("RECRUTEUR_PASSWORD")
      : Cypress.env("CANDIDAT_PASSWORD");

  cy.intercept("POST", "**/accounts/login/").as("loginCmd");
  cy.visit("/login");
  cy.get('input[placeholder="votre@email.com"]').type(email);
  cy.get('input[placeholder="••••••••"]').type(password);
  cy.contains("button", "Se connecter").click();
  cy.wait("@loginCmd").its("response.statusCode").should("eq", 200);
  cy.url().should("not.include", "/login");
});

// Sélection d'une option react-select par texte
Cypress.Commands.add("selectOption", (containerSelector, optionText) => {
  cy.get(containerSelector).click();
  cy.get(".react-select__option").contains(optionText).click();
});
