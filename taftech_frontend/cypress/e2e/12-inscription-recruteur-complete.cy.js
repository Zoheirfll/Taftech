/// <reference types="cypress" />

// Parcours complet : inscription d'une entreprise en 3 étapes
// (1 formulaire, 2 code e-mail, 3 attente de validation par l'administrateur).
describe("E2E 12 : Inscription recruteur (entreprise) complète", () => {
  beforeEach(() => {
    cy.bloquerApiReelle();
    cy.simulerReferentiel();
    cy.intercept("POST", "**/accounts/register/recruteur/").as("register");
    cy.intercept("POST", "**/accounts/verifier-email/").as("verify");
  });

  const choisir = (indexListe, texte) => {
    cy.get(".css-b62m3t-container, [class*='container']").filter(":has(input[role='combobox'])").eq(indexListe).click();
    cy.contains('[role="option"], [class*="option"]', texte).click();
  };

  const remplirEtape1 = (u, { confirmation } = {}) => {
    cy.get('input[name="last_name"]').type(u.nom);
    cy.get('input[name="first_name"]').type(u.prenom);
    cy.get('input[name="email"]').type(u.email);
    cy.get('input[name="telephone"]').type(u.telephone);
    cy.get('input[name="nom_entreprise"]').type(u.entreprise);
    choisir(0, "Secteur de test");
    choisir(1, "31 - Oran");
    cy.get('input[name="registre_commerce"]').type(u.registreCommerce);
    cy.get('input[name="password"]').type(u.motDePasse, { log: false });
    cy.get('input[name="confirmPassword"]').type(confirmation ?? u.motDePasse, { log: false });
    cy.contains("button", "S'inscrire comme employeur").click();
  };

  it("HP1 : formulaire, code e-mail puis écran « compte en cours de vérification »", () => {
    cy.intercept("POST", "**/accounts/register/recruteur/", {
      statusCode: 201,
      body: { message: "Code envoyé." },
    }).as("register");
    cy.intercept("POST", "**/accounts/verifier-email/", {
      statusCode: 200,
      body: { message: "Email vérifié." },
    }).as("verify");

    cy.identiteDynamique("rh").then((u) => {
      cy.visit("/recruteurs/inscription");
      cy.wait("@constantsAPI");
      remplirEtape1(u);

      cy.wait("@register").its("request.body").should((body) => {
        expect(body.email).to.eq(u.email);
        expect(body.nom_entreprise).to.eq(u.entreprise);
        expect(body.registre_commerce).to.eq(u.registreCommerce);
        expect(body).not.to.have.property("confirmPassword");
      });

      cy.contains("Vérifiez votre email").should("be.visible");
      cy.contains(u.email).should("be.visible");

      const code = String(Math.floor(100000 + Math.random() * 900000));
      cy.get('input[maxlength="6"]').type(code);
      cy.contains("button", "Valider mon email").click();

      cy.wait("@verify").its("request.body").should("deep.include", { email: u.email });
      cy.contains("Compte sécurisé").should("be.visible");
      cy.contains(`Bravo ${u.prenom}`).should("be.visible");
      cy.contains("button", "Aller à la connexion").click();
    });

    cy.location("pathname").should("eq", "/recruteurs/connexion");
  });

  it("EC1 : secteur et wilaya non choisis : message et aucun envoi", () => {
    let appels = 0;
    cy.intercept("POST", "**/accounts/register/recruteur/", () => { appels += 1; });

    cy.identiteDynamique("rh").then((u) => {
      cy.visit("/recruteurs/inscription");
      cy.wait("@constantsAPI");
      cy.get('input[name="last_name"]').type(u.nom);
      cy.get('input[name="first_name"]').type(u.prenom);
      cy.get('input[name="email"]').type(u.email);
      cy.get('input[name="telephone"]').type(u.telephone);
      cy.get('input[name="nom_entreprise"]').type(u.entreprise);
      cy.get('input[name="registre_commerce"]').type(u.registreCommerce);
      cy.get('input[name="password"]').type(u.motDePasse, { log: false });
      cy.get('input[name="confirmPassword"]').type(u.motDePasse, { log: false });
      cy.contains("button", "S'inscrire comme employeur").click();
    });

    cy.contains("Informations manquantes").should("be.visible");
    cy.then(() => expect(appels).to.eq(0));
  });

  it("EC2 : mots de passe différents : message sous le champ, aucun envoi", () => {
    let appels = 0;
    cy.intercept("POST", "**/accounts/register/recruteur/", () => { appels += 1; });

    cy.identiteDynamique("rh").then((u) => {
      cy.visit("/recruteurs/inscription");
      cy.wait("@constantsAPI");
      remplirEtape1(u, { confirmation: `${u.motDePasse}x` });
    });

    cy.contains(/ne correspondent pas/i).should("be.visible");
    cy.then(() => expect(appels).to.eq(0));
  });

  it("EC3 : registre de commerce déjà utilisé : l'erreur du serveur est affichée", () => {
    cy.intercept("POST", "**/accounts/register/recruteur/", {
      statusCode: 400,
      body: { registre_commerce: ["Ce registre de commerce est déjà enregistré."] },
    }).as("register");

    cy.identiteDynamique("rh").then((u) => {
      cy.visit("/recruteurs/inscription");
      cy.wait("@constantsAPI");
      remplirEtape1(u);
    });

    cy.wait("@register");
    cy.contains("Inscription impossible").should("be.visible");
    cy.contains("Vérifiez votre email").should("not.exist");
  });
});
