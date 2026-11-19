import { expect, test } from '../../api-fixtures';
import { idpState } from '../../helpers';

/**
 * The Ever ID sign-in routes, in the configuration every suite except the Ever ID one uses: not configured.
 *
 * `getEverIdConfig` (core/lib/auth/ever-id/config.ts) turns the sign-in off unless the deployment names the
 * provider *and* sets the issuer, the client id and the client secret — and keeps it off unless the issuer is an
 * https URL (plain http only on the local machine) and the Gauzy API URL is set explicitly, because the ID
 * tokens are exchanged there. The point of this file is the second half of that promise: while it is off, every
 * route under `/api/auth/ever-id` is a 404 that asks nothing of anybody — no issuer contact, no API call. A
 * half-configured deployment must not start posting somebody's tokens to an issuer nobody agreed to.
 *
 * The configured case is suites/ever-id/backchannel-logout.spec.ts, run with
 * playwright.ever-id.config.ts.
 */

const EVER_ID_ROUTES: Array<{ verb: 'POST' | 'GET'; path: string }> = [
	{ verb: 'POST', path: '/api/auth/ever-id/backchannel-logout' },
	{ verb: 'POST', path: '/api/auth/ever-id/confirm' },
	{ verb: 'POST', path: '/api/auth/ever-id/finish-setup' },
	{ verb: 'POST', path: '/api/auth/ever-id/signup-handoff' },
	{ verb: 'GET', path: '/api/auth/ever-id/verify-email' }
];

test.describe('the Ever ID sign-in, not configured', () => {
	for (const route of EVER_ID_ROUTES) {
		test(`${route.verb} ${route.path} answers 404 without asking anyone anything`, async ({ api, mock }) => {
			const issuerBefore = (await idpState()).contacts.length;

			const response = await api(route.path, { method: route.verb, anonymous: true });
			const status = response.status();
			await response.text();

			expect(status, `${route.verb} ${route.path}: an unconfigured Ever ID route answered ${status}`).toBe(404);
			expect(await mock.requests(), `${route.path}: the API was asked by a route that should not exist`).toEqual([]);
			expect((await idpState()).contacts.length, `${route.path}: the identity provider was contacted`).toBe(
				issuerBefore
			);
		});
	}

	test('the sign-in page is not offered the Ever ID provider', async ({ api }) => {
		// NextAuth's own list of what it serves. The Ever ID provider is added only when the sign-in is
		// configured, so a deployment that half-configures it cannot end up showing a button that leads to an
		// issuer it cannot verify.
		const response = await api('/api/auth/providers', { anonymous: true });
		const status = response.status();
		const providers = await response.json();

		expect(status, `the provider list answered ${status} instead of a JSON list of providers`).toBe(200);
		expect(Object.keys(providers), 'the Ever ID provider was offered while the sign-in is not configured').not.toContain(
			'ever-id'
		);
	});
});
