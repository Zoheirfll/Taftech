import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {},
    specPattern: "cypress/e2e/**/*.cy.js",
  },
  // Les credentials sont dans cypress.env.json (gitignore)
});
