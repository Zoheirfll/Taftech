import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {},
    specPattern: "cypress/e2e/**/*.cy.js",
  },
  env: {
    RECRUTEUR_EMAIL: "zoheir.f31@gmail.com",
    RECRUTEUR_PASSWORD: "22032002",
    CANDIDAT_EMAIL: "zoheir.53@gmail.com",
    CANDIDAT_PASSWORD: "22032002",
  },
});
