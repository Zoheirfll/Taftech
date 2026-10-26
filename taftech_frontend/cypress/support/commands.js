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

  if (role === "recruteur") {
    cy.visit("/recruteurs/connexion");
    cy.get('input[placeholder="votre@entreprise.com"]').type(email);
    cy.get('input[placeholder="••••••••"]').type(password);
    cy.contains("button", "Se connecter").click();
    cy.wait("@loginCmd").its("response.statusCode").should("eq", 200);
    cy.url().should("not.include", "/recruteurs/connexion");
  } else {
    cy.visit("/login");
    cy.get('input[placeholder="votre@email.com"]').type(email);
    cy.get('input[placeholder="••••••••"]').type(password);
    cy.contains("button", "Se connecter").click();
    cy.wait("@loginCmd").its("response.statusCode").should("eq", 200);
    cy.url().should("not.include", "/login");
  }
});

// Identité de test générée à chaque appel : jamais deux fois la même, rien en dur.
// Le mot de passe est aléatoire et respecte majuscule + minuscule + chiffre + symbole.
Cypress.Commands.add("identiteDynamique", (prefixe = "cy") => {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return cy.wrap({
    id,
    nom: `Nom${id}`,
    prenom: `Prenom${id}`,
    email: `${prefixe}.${id}@example.com`,
    motDePasse: `Aa1!${Math.random().toString(36).slice(2, 10)}${id.slice(-4)}`,
    message: `Message de test automatique ${id}.`,
    telephone: `05${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`,
    nin: String(Math.floor(Math.random() * 1e18)).padStart(18, "1"),
    entreprise: `Entreprise ${id}`,
    registreCommerce: `${String(Math.floor(Math.random() * 1e7)).padStart(7, "1")}B${id.slice(-2)}`,
  });
});

// Aucun appel ne doit atteindre un vrai serveur : toute route /api/ non simulée
// par le test répond 200 {} (à appeler EN PREMIER : les intercepts suivants priment).
// Évite aussi qu'un 401 réel déclenche la déconnexion automatique du site.
Cypress.Commands.add("bloquerApiReelle", () => {
  cy.intercept("**/api/**", { statusCode: 200, body: {} });
});

// Listes de référence minimales (wilayas, secteurs) pour les formulaires d'inscription.
Cypress.Commands.add("simulerReferentiel", () => {
  cy.intercept("GET", "**/jobs/constants/", {
    statusCode: 200,
    body: {
      wilayas: [
        { value: "31 - Oran", label: "31 - Oran" },
        { value: "16 - Alger", label: "16 - Alger" },
      ],
      secteurs: [],
      experiences: [],
      contrats: [],
    },
  }).as("constantsAPI");
  cy.intercept("GET", "**/jobs/nomenclature/", {
    statusCode: 200,
    body: { secteurs: [{ code: "SEC-TEST", libelle: "Secteur de test" }], domaines: [] },
  }).as("nomenclatureAPI");
});

// Ouvre une page avec une session déjà établie (clés lues par authService).
Cypress.Commands.add("visiterConnecte", (url, role, portal) => {
  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem("userRole", role);
      win.localStorage.setItem("loginPortal", portal);
    },
  });
});

// Offre fictive aux champs uniques (id numérique, titre propre à l'exécution).
Cypress.Commands.add("offreDynamique", (id, titre) => {
  return cy.wrap({
    id,
    titre,
    description: `Description de ${titre}.`,
    wilaya: "31 - Oran",
    type_contrat: "CDI",
    est_cloturee: false,
    questionnaire: null,
    entreprise: { nom_entreprise: `Société ${titre}` },
    competences_detail: [],
    date_creation: new Date().toISOString(),
  });
});

// Sélection d'une option react-select par texte
Cypress.Commands.add("selectOption", (containerSelector, optionText) => {
  cy.get(containerSelector).click();
  cy.get(".react-select__option").contains(optionText).click();
});
