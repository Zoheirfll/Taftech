/// <reference types="cypress" />
/* global cy, describe, it, beforeEach,  */

describe("🤝 Flux E2E : Parcours Recruteur (Accepter un candidat)", () => {
  beforeEach(() => {
    // 1. Interceptions pour surveiller le réseau
    cy.intercept("POST", "**/accounts/login/").as("loginAPI");

    // Selon votre configuration DRF, la mise à jour (update) est un PUT ou un PATCH
    cy.intercept("PUT", "**/candidatures/**").as("updateStatutAPI");
    cy.intercept("PATCH", "**/candidatures/**").as("updateStatutAPI");

    // 2. Le Recruteur se connecte
    cy.visit("http://localhost:5173/login");

    // 👇 REMPLACEZ PAR LES IDENTIFIANTS DU RECRUTEUR PROPRIÉTAIRE DE L'OFFRE 👇
    cy.get('input[placeholder="Adresse Email"]').type("zoheir.f31@gmail.com");
    cy.get('input[placeholder="Mot de passe"]').type("22032002");
    // 👆 ===================================================================== 👆

    cy.contains("button", "Se connecter").click();

    // On attend la validation de l'API
    cy.wait("@loginAPI").its("response.statusCode").should("eq", 200);
  });

  it("🟢 HP1 : Doit ouvrir les candidatures d'une offre et accepter un talent", () => {
    // -----------------------------------------------------
    // ÉTAPE 1 : Le Dashboard
    // -----------------------------------------------------
    cy.log("🗺️ Navigation vers le Dashboard Recruteur...");

    // On force la visite au dashboard au cas où la redirection atterrirait ailleurs
    cy.visit("http://localhost:5173/dashboard");

    // On clique sur le bouton de la première offre de la liste
    cy.contains("button", "GÉRER LES CANDIDATS ➔").first().click();

    // On s'assure d'être bien arrivé sur la page de Gestion de l'Offre
    cy.contains("Candidatures reçues").should("be.visible");

    // -----------------------------------------------------
    // ÉTAPE 2 : Ouverture du profil candidat
    // -----------------------------------------------------
    cy.log("🖱️ Ouverture du dossier du candidat...");

    // On clique sur le bouton "Voir" de la première candidature du tableau
    cy.contains("button", "👁️ Voir").first().click();

    // On s'assure que le panneau latéral / modale s'est bien ouvert
    cy.contains("Décision Recrutement").should("be.visible");

    // -----------------------------------------------------
    // ÉTAPE 3 : Acceptation (Changement de statut)
    // -----------------------------------------------------
    cy.log('✅ Changement du statut vers "Candidat retenu"...');

    // Comme il y a un <select> dans le tableau et un dans la modale, on cible le dernier (celui de la modale)
    cy.get("select").last().select("RETENU");

    // On vérifie que le Toast de succès apparaît bien à l'écran
    cy.contains("Statut mis à jour avec succès").should("be.visible");

    // -----------------------------------------------------
    // ÉTAPE 4 : Apparition du Bulletin
    // -----------------------------------------------------
    cy.log("📄 Vérification du déblocage du Bulletin...");

    // Puisque le statut est "RETENU", ce bouton doit obligatoirement être généré par React
    cy.contains("button", "📥 Télécharger le Bulletin").should("be.visible");

    // (Optionnel) : On pourrait même cliquer dessus pour tester le téléchargement !
    // cy.contains('button', '📥 Télécharger le Bulletin').click();
  });
});
