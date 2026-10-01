import { defineConfig } from 'cypress';

/**
 * Cypress configuration for the Ever ID sign-in against a deployed environment (see
 * cypress/e2e/ever-id-sign-in.cy.ts for the variables). Unlike apps/web/cypress.config.ts it starts no mock API
 * and stubs no next-auth session: the deployment, its identity provider and its API answer for real.
 */
export default defineConfig({
	e2e: {
		baseUrl: process.env.CYPRESS_BASE_URL,
		specPattern: 'apps/web/cypress/e2e/ever-id-sign-in.cy.ts',
		supportFile: false,
		setupNodeEvents(_on, config) {
			if (!config.baseUrl) {
				throw new Error('The Ever ID run needs CYPRESS_BASE_URL (the deployed web app).');
			}
			return config;
		}
	},
	chromeWebSecurity: true,
	defaultCommandTimeout: 15_000,
	requestTimeout: 20_000,
	responseTimeout: 30_000,
	retries: 0,
	screenshotOnRunFailure: true,
	video: false,
	viewportHeight: 900,
	viewportWidth: 1440
});
