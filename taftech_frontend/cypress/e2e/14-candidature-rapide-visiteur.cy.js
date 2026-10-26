/// <reference types="cypress" />

// Parcours complet d'un visiteur sans compte : « Postulation rapide » avec CV joint.
describe("E2E 14 : Candidature rapide d'un visiteur", () => {
  let offre;

  beforeEach(() => {
    cy.bloquerApiReelle();
    const id = Date.now();
    cy.offreDynamique(id, `Chauffeur ${id}`).then((o) => {
      offre = o;
      cy.intercept({ method: "GET", pathname: `/api/jobs/${o.id}/` }, { statusCode: 200, body: o }).as("detail");
    });
  });

  const ouvrirFormulaire = () => {
    cy.visit(`/jobs/${offre.id}`);
    cy.wait("@detail");
    cy.contains("button", "Postulation rapide (sans compte)").click();
    cy.contains("h4", "Postulation rapide").should("be.visible");
  };

  const remplir = (u) => {
    cy.get('input[name="nom_rapide"]').type(u.nom);
    cy.get('input[name="prenom_rapide"]').type(u.prenom);
    cy.get('input[name="email_rapide"]').type(u.email);
    cy.get('input[name="telephone_rapide"]').type(u.telephone);
  };

  const joindreCv = (u, nom = `cv-${u.id}.pdf`, type = "application/pdf") => {
    cy.get('input[name="cv_rapide"]').selectFile(
      { contents: Cypress.Buffer.from(`%PDF-1.4 CV de ${u.nom}`), fileName: nom, mimeType: type },
      { force: true },
    );
  };

  it("HP1 : formulaire complet + CV : candidature envoyée et confirmée", () => {
    cy.intercept("POST", "**/postuler-rapide/", {
      statusCode: 201,
      body: { message: "Candidature envoyée." },
    }).as("envoi");

    cy.identiteDynamique("visiteur").then((u) => {
      ouvrirFormulaire();
      remplir(u);
      joindreCv(u);
      cy.contains(`cv-${u.id}.pdf`).should("be.visible");
      cy.contains("button", "Envoyer ma candidature rapide").click();
      cy.wait("@envoi").its("request.headers.content-type").should("include", "multipart/form-data");
    });

    cy.contains("Candidature envoyée").should("be.visible");
  });

  it("EC1 : champs obligatoires vides : messages sous les champs, aucun envoi", () => {
    let appels = 0;
    cy.intercept("POST", "**/postuler-rapide/", () => { appels += 1; });

    ouvrirFormulaire();
    cy.contains("button", "Envoyer ma candidature rapide").click();

    cy.contains("Le nom est obligatoire.").should("be.visible");
    cy.contains("Le prénom est obligatoire.").should("be.visible");
    cy.contains("L'adresse e-mail est obligatoire.").should("be.visible");
    cy.contains("Le numéro de téléphone est obligatoire.").should("be.visible");
    cy.contains("Veuillez joindre votre CV").should("be.visible");
    cy.then(() => expect(appels).to.eq(0));
  });

  it("EC2 : e-mail mal formé refusé côté formulaire", () => {
    let appels = 0;
    cy.intercept("POST", "**/postuler-rapide/", () => { appels += 1; });

    cy.identiteDynamique("visiteur").then((u) => {
      ouvrirFormulaire();
      remplir({ ...u, email: `pas-un-email-${u.id}` });
      joindreCv(u);
      cy.contains("button", "Envoyer ma candidature rapide").click();
    });

    cy.contains("Adresse e-mail invalide.").should("be.visible");
    cy.then(() => expect(appels).to.eq(0));
  });

  it("EC3 : erreur du serveur : message d'échec, le formulaire reste accessible", () => {
    cy.intercept("POST", "**/postuler-rapide/", {
      statusCode: 400,
      body: { error: "Vous avez déjà postulé à cette offre." },
    }).as("envoi");

    cy.identiteDynamique("visiteur").then((u) => {
      ouvrirFormulaire();
      remplir(u);
      joindreCv(u);
      cy.contains("button", "Envoyer ma candidature rapide").click();
    });

    cy.wait("@envoi");
    cy.contains("Envoi impossible").should("be.visible");
  });

  it("NAV : « Se connecter pour postuler » envoie vers /login avec le retour prévu", () => {
    cy.visit(`/jobs/${offre.id}`);
    cy.wait("@detail");
    cy.contains("button", "Se connecter pour postuler").click();
    cy.location("pathname").should("eq", "/login");
    cy.location("search").should("include", `next=${encodeURIComponent(`/jobs/${offre.id}/postuler`)}`);
  });
});
