import { defineConfig } from 'cypress';

export default defineConfig({
  component: {
    devServer: {
      framework: undefined as any,
      bundler: 'vite',
    },
    specPattern: 'cypress/component/**/*.cy.ts',
    supportFile: 'cypress/support/component.ts',
    indexHtmlFile: 'cypress/support/component-index.html',
  },
  e2e: {
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
  },
});
