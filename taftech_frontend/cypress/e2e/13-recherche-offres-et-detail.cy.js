/// <reference types="cypress" />

// Parcours complet d'un visiteur : liste des offres -> recherche -> détail d'une offre.
describe("E2E 13 : Recherche d'offres et page de détail", () => {
  let offre1;
  let offre2;

  beforeEach(() => {
    cy.bloquerApiReelle();
    cy.simulerReferentiel();

    const id = Date.now();
    cy.offreDynamique(id, `Comptable ${id}`).then((o) => { offre1 = o; });
    cy.offreDynamique(id + 1, `Développeur ${id}`).then((o) => { offre2 = o; });

    // Liste : la réponse dépend du terme recherché (comme le vrai serveur)
    cy.intercept({ method: "GET", pathname: "/api/jobs/" }, (req) => {
      const terme = (new URL(req.url).searchParams.get("search") || "").toLowerCase();
      const toutes = [offre1, offre2];
      const results = terme ? toutes.filter((o) => o.titre.toLowerCase().includes(terme)) : toutes;
      req.reply({ statusCode: 200, body: { count: results.length, next: null, previous: null, results } });
    }).as("liste");
  });

  it("HP1 : la liste affiche les offres reçues", () => {
    cy.visit("/offres");
    cy.wait("@liste");
    cy.contains("h3", offre1.titre).should("be.visible");
    cy.contains("h3", offre2.titre).should("be.visible");
  });

  it("HP2 : la recherche envoie le terme au serveur et filtre les résultats", () => {
    cy.visit("/offres");
    cy.wait("@liste");

    cy.get('input[placeholder="Métier, compétence, entreprise..."]')
      .should("not.be.disabled")
      .type("comptable");

    cy.wait("@liste").its("request.url").should("include", "search=comptable");
    cy.contains("h3", offre1.titre).should("be.visible");
    cy.contains("h3", offre2.titre).should("not.exist");
  });

  it("HP3 : un clic sur une offre ouvre sa page de détail", () => {
    cy.intercept({ method: "GET", pathname: `/api/jobs/${offre1.id}/` }, {
      statusCode: 200,
      body: offre1,
    }).as("detail");

    cy.visit("/offres");
    cy.wait("@liste");
    cy.contains("h3", offre1.titre).click();

    cy.wait("@detail");
    cy.location("pathname").should("include", `${offre1.id}`);
    cy.contains("h1", offre1.titre).should("be.visible");
    cy.contains("Prêt à postuler").should("be.visible");
  });

  it("EC1 : aucun résultat : la liste est vide, la recherche reste utilisable", () => {
    cy.visit("/offres");
    cy.wait("@liste");
    cy.get('input[placeholder="Métier, compétence, entreprise..."]')
      .should("not.be.disabled")
      .type(`introuvable${Date.now()}`);

    cy.wait("@liste");
    cy.get("h3").should("not.contain.text", offre1.titre);
    cy.get('input[placeholder="Métier, compétence, entreprise..."]').should("not.be.disabled");
  });

  it("EC2 : offre retirée (404) : message clair et lien de retour aux offres", () => {
    cy.intercept({ method: "GET", pathname: "/api/jobs/987654/" }, {
      statusCode: 404,
      body: { detail: "Introuvable." },
    }).as("detail404");

    cy.visit("/jobs/987654");
    cy.wait("@detail404");
    cy.contains("Offre introuvable ou retirée.").should("be.visible");
    cy.contains("a", "Retourner aux offres").click();
    cy.location("pathname").should("eq", "/offres");
  });
});
