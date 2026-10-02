import { defineConfig } from 'cypress';

/**
 * Cypress configuration for the Ever ID sign-in against a deployed environment (see
 * cypress/e2e/ever-id-sign-in.cy.ts for the variables). Unlike apps/web/cypress.config.ts it starts no mock API
 * and stubs no next-auth session: the deployment, its identity provider and its API answer for real.
 *
 * A run that is not set up for it fails at once instead of passing with every case skipped.
 */
const REQUIRED = [
	'CYPRESS_EVER_ID_STAGE',
	'CYPRESS_EVER_ID_ISSUER_ORIGIN',
	'CYPRESS_EVER_ID_USERNAME',
	'CYPRESS_EVER_ID_PASSWORD',
	'CYPRESS_EVER_ID_TENANT_NAME'
] as const;

export default defineConfig({
	e2e: {
		baseUrl: process.env.CYPRESS_BASE_URL,
		specPattern: 'apps/web/cypress/e2e/ever-id-sign-in.cy.ts',
		supportFile: false,
		setupNodeEvents(_on, config) {
			if (!config.baseUrl) {
				throw new Error('The Ever ID run needs CYPRESS_BASE_URL (the deployed web app).');
			}
			const missing = REQUIRED.filter((name) => !config.env[name.replace(/^CYPRESS_/, '')]);
			if (missing.length > 0) {
				throw new Error(`The Ever ID run needs ${missing.join(', ')}.`);
			}
			if (String(config.env.EVER_ID_STAGE) !== '1') {
				throw new Error('The Ever ID run needs CYPRESS_EVER_ID_STAGE=1.');
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
