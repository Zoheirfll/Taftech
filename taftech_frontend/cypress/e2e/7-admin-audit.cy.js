/// <reference types="cypress" />

describe("Flux E2E : Admin — Journal d'audit", () => {
  beforeEach(() => {
    // Connexion admin via mock (superuser)
    cy.intercept("POST", "**/accounts/login/", {
      statusCode: 200,
      body: { role: "ADMIN" },
    }).as("loginAdmin");

    cy.visit("/login");
    cy.get('input[placeholder="Adresse Email"]').type(Cypress.env("RECRUTEUR_EMAIL"));
    cy.get('input[placeholder="Mot de passe"]').type(Cypress.env("RECRUTEUR_PASSWORD"));
    cy.contains("button", "Se connecter").click();
    cy.wait("@loginAdmin");
  });

  it("HP1 : Doit afficher le journal d'audit avec pagination", () => {
    cy.intercept("GET", "**/jobs/admin/audit-logs/**").as("auditAPI");

    cy.visit("/admin-taftech/audit");

    cy.wait("@auditAPI").its("response.statusCode").should("eq", 200);

    cy.contains("Journal d'audit").should("be.visible");
  });

  it("HP2 : La recherche filtre les résultats", () => {
    cy.intercept("GET", "**/jobs/admin/audit-logs/**").as("auditAPI");

    cy.visit("/admin-taftech/audit");
    cy.wait("@auditAPI");

    cy.get('input[placeholder*="Rechercher"]').type("APPROUVER");

    // Les résultats filtrés ne contiennent que des lignes pertinentes
    cy.get("tbody tr").each(($row) => {
      const text = $row.text().toLowerCase();
      const isEmpty = $row.find("td").length === 0;
      if (!isEmpty) {
        expect(text).to.match(/approuver|aucun/i);
      }
    });
  });

  it("HP3 : La pagination affiche le bon nombre de pages", () => {
    // Mock avec 45 entrées pour tester la pagination (20 par page = 3 pages)
    cy.intercept("GET", "**/jobs/admin/audit-logs/**", {
      statusCode: 200,
      body: {
        count: 45,
        next: "http://localhost:8000/api/jobs/admin/audit-logs/?page=2",
        previous: null,
        results: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          admin: "admin@taftech.dz",
          action: "APPROUVER_OFFRE",
          detail: `offre #${i + 1}`,
          ip: "127.0.0.1",
          date: "11/06/2026 14:30",
        })),
      },
    }).as("auditPaged");

    cy.visit("/admin-taftech/audit");
    cy.wait("@auditPaged");

    cy.contains("Page 1 sur 3").should("be.visible");
    cy.contains("button", "Suivant").should("not.be.disabled");
    cy.contains("button", "Précédent").should("be.disabled");
  });
});
