/// <reference types="cypress" />

// Parcours complet : formulaire « Contactez-nous » (validation, consentement, serveur, confirmation).
describe("E2E 15 : Formulaire de contact complet", () => {
  beforeEach(() => {
    cy.bloquerApiReelle();
    cy.intercept("GET", "**/faq/**", { statusCode: 200, body: [] });
    cy.intercept("POST", "**/accounts/contact/", { statusCode: 200, body: { message: "ok" } }).as("contact");
  });

  const remplir = (u, { sauf = [] } = {}) => {
    const champs = {
      nom: () => cy.get('input[name="nom"]').type(u.nom),
      email: () => cy.get('input[name="email"]').type(u.email),
      motif: () => cy.get('select[name="motif"]').select(1),
      objet: () => cy.get('input[name="objet"]').type(`Objet ${u.id}`),
      message: () => cy.get('textarea[name="message"]').type(u.message),
    };
    Object.entries(champs).forEach(([nom, saisir]) => { if (!sauf.includes(nom)) saisir(); });
  };

  it("HP1 : tous les champs + consentement : envoi puis page de remerciement", () => {
    cy.identiteDynamique("contact").then((u) => {
      cy.visit("/contact");
      remplir(u);
      cy.get('input[name="entreprise"]').type(u.entreprise);
      cy.contains("J'accepte que mes données").click();
      cy.contains("button", "Envoyer").click();

      cy.wait("@contact").its("request.body").should((body) => {
        expect(body.nom).to.eq(u.nom);
        expect(body.email).to.eq(u.email);
        expect(body.entreprise).to.eq(u.entreprise);
        expect(body.message).to.eq(u.message);
      });
    });

    cy.location("pathname").should("eq", "/merci");
    cy.location("search").should("include", "type=contact");
  });

  it("EC1 : sans consentement : aucun envoi, on reste sur /contact", () => {
    let appels = 0;
    cy.intercept("POST", "**/accounts/contact/", () => { appels += 1; });

    cy.identiteDynamique("contact").then((u) => {
      cy.visit("/contact");
      remplir(u);
      cy.contains("button", "Envoyer").click();
    });

    cy.contains("Consentement requis").should("be.visible");
    cy.location("pathname").should("eq", "/contact");
    cy.then(() => expect(appels).to.eq(0));
  });

  it("EC2 : champs obligatoires manquants : une erreur sous chaque champ", () => {
    cy.visit("/contact");
    cy.contains("J'accepte que mes données").click();
    // noValidate absent côté navigateur : on neutralise la validation native pour tester celle du site
    cy.get("form").invoke("attr", "novalidate", "novalidate");
    cy.contains("button", "Envoyer").click();

    cy.contains("Formulaire incomplet").should("be.visible");
    cy.get("#err-nom").should("contain.text", "Champ obligatoire");
    cy.get("#err-email").should("contain.text", "Champ obligatoire");
    cy.get("#err-objet").should("contain.text", "Champ obligatoire");
    cy.get("#err-message").should("contain.text", "Champ obligatoire");
  });

  it("EC3 : e-mail invalide : message sous le champ e-mail", () => {
    cy.identiteDynamique("contact").then((u) => {
      cy.visit("/contact");
      cy.get("form").invoke("attr", "novalidate", "novalidate");
      remplir({ ...u, email: `invalide-${u.id}` });
      cy.contains("J'accepte que mes données").click();
      cy.contains("button", "Envoyer").click();
    });

    cy.get("#err-email").should("contain.text", "Adresse e-mail invalide.");
    cy.location("pathname").should("eq", "/contact");
  });

  it("EC4 : le serveur refuse l'envoi : message d'échec et saisie conservée", () => {
    cy.intercept("POST", "**/accounts/contact/", {
      statusCode: 500,
      body: { error: "Service indisponible." },
    }).as("contact");

    cy.identiteDynamique("contact").then((u) => {
      cy.visit("/contact");
      remplir(u);
      cy.contains("J'accepte que mes données").click();
      cy.contains("button", "Envoyer").click();
      cy.wait("@contact");

      cy.contains("Envoi impossible").should("be.visible");
      cy.location("pathname").should("eq", "/contact");
      cy.get('textarea[name="message"]').should("have.value", u.message);
    });
  });

  it("VAR : avec ?portail=recruteur, la page reste la même et fonctionne", () => {
    cy.visit("/contact?portail=recruteur");
    cy.contains("h1", "Contactez-").should("be.visible");
    cy.get('form').should("exist");
  });
});
