/// <reference types="cypress" />

/**
 * The Ever ID sign-in on a deployed environment. Skipped unless CYPRESS_EVER_ID_STAGE=1, so the deterministic
 * browser run (which has no identity provider) skips it.
 *
 * Run it against a deployment with its own configuration (no mock API, the real next-auth session):
 *
 *   CYPRESS_EVER_ID_STAGE=1 \
 *   CYPRESS_BASE_URL=https://<web host> \
 *   CYPRESS_EVER_ID_ISSUER_ORIGIN=https://<issuer host> \
 *   CYPRESS_EVER_ID_USERNAME=<linked person> CYPRESS_EVER_ID_PASSWORD=<password> \
 *   CYPRESS_EVER_ID_TENANT_NAME=<that person's workspace name> \
 *   yarn cypress run --config-file apps/web/cypress/ever-id-stage.config.ts
 *
 * Optional cases:
 * - CYPRESS_EVER_ID_UNLINKED_USERNAME / _PASSWORD: an Ever ID whose verified address belongs to an existing
 *   account that is not linked yet (the API's confirmed link mode). With CYPRESS_EVER_ID_CONFIRM_CODE_URL (an
 *   endpoint of the environment's mail catcher answering `{ "code": "…" }` for the latest code) the case also
 *   enters the code and reaches the workspace chooser.
 * - CYPRESS_EVER_ID_SIGNUP=1 with CYPRESS_EVER_ID_NEW_USERNAME / _PASSWORD: a person new to the product, on an API
 *   that offers the Ever ID sign-up.
 *
 * Credentials come from the CI secret store; never commit them. Every case records the URLs requested on the web
 * app's origin and checks that none carries a token or an e-mail address.
 */

const enabled = String(Cypress.env('EVER_ID_STAGE')) === '1';
const describeOnStage = enabled ? describe : describe.skip;

/** A token, a JWT or an e-mail address (plain or encoded) in a URL. */
const LEAK = /id_token|access_token|eyJ[A-Za-z0-9_-]{10,}|%40|@/;

function setting(name: string): string {
	const value = Cypress.env(name);
	return typeof value === 'string' ? value : value === undefined ? '' : String(value);
}

/** Records every URL requested on the web app's origin, to check none leaks anything. */
function recordAppUrls(urls: string[]) {
	const appOrigin = new URL(String(Cypress.config('baseUrl'))).origin;
	cy.intercept('**', (request) => {
		if (new URL(request.url).origin === appOrigin) urls.push(request.url);
	});
}

/**
 * The OAuth callback carries the authorization code and next-auth's encrypted state (a JWE, so it starts like a
 * JWT): those two parameters are the protocol itself and are left out of the check; nothing else may match.
 */
function withoutOAuthCallbackParameters(url: string): string {
	const parsed = new URL(url);
	if (parsed.pathname.endsWith('/api/auth/callback/ever-id')) {
		parsed.searchParams.delete('code');
		parsed.searchParams.delete('state');
	}
	return parsed.href;
}

function expectNoLeak(urls: string[]) {
	cy.location('href').should('not.match', LEAK);
	cy.wrap(urls).each((url: string) => {
		expect(withoutOAuthCallbackParameters(url), 'request URL on the web app').not.to.match(LEAK);
	});
}

/** Starts the Ever ID sign-in from the sign-in page and completes it at the issuer. */
function signInWithEverId(username: string, password: string) {
	cy.visit('/auth/passcode');
	cy.contains('button', 'Ever ID', { timeout: 30_000 }).click();
	cy.origin(
		setting('EVER_ID_ISSUER_ORIGIN'),
		{ args: { username, password } },
		({ username: loginName, password: secret }) => {
			cy.get('input[name="loginName"], input[autocomplete="username"], input[type="email"]', { timeout: 30_000 })
				.first()
				.type(loginName, { log: false });
			cy.get('button[type="submit"]').first().click();
			cy.get('input[type="password"]', { timeout: 30_000 }).first().type(secret, { log: false });
			cy.get('button[type="submit"]').first().click();
		}
	);
}

describeOnStage('Ever ID sign-in (deployed environment)', () => {
	it('shows the Ever ID button on the sign-in page', () => {
		cy.visit('/auth/passcode');
		cy.contains('button', 'Ever ID', { timeout: 30_000 }).should('be.visible');
	});

	it('takes a linked person to the workspace chooser with their workspace, leaking nothing in any URL', () => {
		const urls: string[] = [];
		recordAppUrls(urls);

		signInWithEverId(setting('EVER_ID_USERNAME'), setting('EVER_ID_PASSWORD'));

		cy.location('pathname', { timeout: 60_000 }).should('match', /\/auth\/workspace$/);
		cy.contains(setting('EVER_ID_TENANT_NAME'), { timeout: 30_000 }).should('be.visible');
		cy.get('#continue-to-workspace').should('be.visible');
		expectNoLeak(urls);
	});

	it('sends a link that needs the one-time e-mail code to the passcode page, with the one-time key only', function () {
		if (!setting('EVER_ID_UNLINKED_USERNAME')) this.skip();
		const urls: string[] = [];
		recordAppUrls(urls);

		signInWithEverId(setting('EVER_ID_UNLINKED_USERNAME'), setting('EVER_ID_UNLINKED_PASSWORD'));

		cy.location('pathname', { timeout: 60_000 }).should('match', /\/auth\/passcode$/);
		cy.location('search').should('match', /^\?ever_id_handoff=[A-Za-z0-9_-]{16,128}$/);
		expectNoLeak(urls);

		if (setting('EVER_ID_CONFIRM_CODE_URL')) {
			cy.request(setting('EVER_ID_CONFIRM_CODE_URL')).then(({ body }) => {
				cy.get('form input').first().type(String(body.code), { log: false });
			});
			cy.contains('button', /log ?in|sign ?in/i).click();
			cy.get('#continue-to-workspace', { timeout: 30_000 }).should('be.visible');
			expectNoLeak(urls);
		}
	});

	it('takes a person new to the product to the sign-up page with the one-time key only', function () {
		if (setting('EVER_ID_SIGNUP') !== '1' || !setting('EVER_ID_NEW_USERNAME')) this.skip();
		const urls: string[] = [];
		recordAppUrls(urls);

		signInWithEverId(setting('EVER_ID_NEW_USERNAME'), setting('EVER_ID_NEW_PASSWORD'));

		cy.location('pathname', { timeout: 60_000 }).should('match', /\/auth\/signup$/);
		cy.location('search').should('match', /^\?ever_id_handoff=[A-Za-z0-9_-]{16,128}$/);
		cy.get('#signup-email', { timeout: 30_000 }).should('have.attr', 'readonly');
		cy.get('#ever-id-signup-confirm').should('exist');
		expectNoLeak(urls);
	});
});
