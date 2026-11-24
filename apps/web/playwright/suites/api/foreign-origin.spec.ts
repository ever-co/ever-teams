import { expect, test } from '../../api-fixtures';
import { APP_ORIGIN } from '../../helpers';
import { foreignOriginRoutes } from './foreign-origin.generated';

/**
 * A write that comes from another site must not reach the platform.
 *
 * These handlers act with the caller's session cookies, and a browser attaches those cookies to a
 * request another site makes too — always for a sibling subdomain, and from any site when a deployment
 * sets `NEXT_PUBLIC_COOKIE_SAME_SITE=none`. A JSON body cannot be sent that way without a CORS
 * preflight this app never grants, but a form can, so the handler checks where the request came from
 * (`core/services/server/same-origin-request.ts`) instead of trusting the body's shape.
 *
 * The list below is generated from the source — `scripts/collect-foreign-origin-routes.mjs` reads every
 * route under `app/api` and keeps the verbs whose guard runs before anything reaches the API. A guard
 * that only exists where somebody remembered to write a test is not a guard.
 *
 * What each case proves, in order:
 *   1. an Origin that is not this app's host is refused with 403, anonymous or signed in;
 *   2. the refusal happened first: the mock recorded nothing at all for the whole test;
 *   3. this app's own Origin is not refused as cross-site (the guard is not a blanket 403).
 */

const FOREIGN_ORIGIN = 'https://some-other-site.example';
/** The guard compares the Origin host with the host the request arrived at, so this has to be the origin
 * the suite actually calls (APP_ORIGIN), not a host someone typed here. */
const OWN_ORIGIN = APP_ORIGIN;

/** Dynamic segments are filled with fixture ids where they match, and with an inert name otherwise:
 * the guard must refuse before any of them is looked up. */
function concretePath(path: string, ids: Record<string, string>): string {
	return path.replace(/\[([^\]]+)\]/g, (_match, name: string) => ids[name] ?? 'playwright-guard-probe');
}

test.describe('a cross-site write is refused', () => {
	for (const route of foreignOriginRoutes) {
		test(`${route.verb} ${route.path}`, async ({ api, mock, ids }) => {
			const path = concretePath(route.path, ids);
			// `proxy-helper` names the guard by the helper that runs it (forwardToGauzy), which is how most
			// proxy routes are protected; `route` means the route file calls the guard itself.
			const why = `${route.verb} ${route.path} (${route.guard} guard in ${route.file})`;

			const anonymous = await api(path, {
				method: route.verb,
				body: {},
				anonymous: true,
				headers: { origin: FOREIGN_ORIGIN }
			});
			const anonymousBody = await anonymous.text();
			expect(
				anonymous.status(),
				`${why}: anonymous cross-site write answered ${anonymous.status()} ${anonymousBody}`
			).toBe(403);

			const signedIn = await api(path, { method: route.verb, body: {}, headers: { origin: FOREIGN_ORIGIN } });
			const signedInBody = await signedIn.text();
			expect(
				signedIn.status(),
				`${why}: signed-in cross-site write answered ${signedIn.status()} ${signedInBody}`
			).toBe(403);

			// The mock is reset before every test, so anything in its log here is a request the
			// refusal let through — which is the failure mode that matters.
			const reached = await mock.requests();
			expect(
				reached.map((request) => `${request.method} ${request.path}`),
				`${why}: the refusal must come before any call to the API`
			).toEqual([]);

			// The same call from this app's own origin is not refused *as cross-site*. It may still be
			// refused for another reason (no session, a body the validator wants) — that is not this guard.
			const own = await api(path, { method: route.verb, body: {}, headers: { origin: OWN_ORIGIN } });
			const ownBody = await own.text();
			expect(
				`${own.status()} ${ownBody}`,
				`${why}: a write from this app's own origin must not be refused as cross-site`
			).not.toMatch(/Cross-site request refused/);
		});
	}

	test.describe('the Sec-Fetch-Site check', () => {
		// A form POST carries no JSON body, so this is the header the guard has to work from.
		const FORM_ROUTES = ['/api/daily-plan', '/api/comment', '/api/employee-appointment'];

		for (const fetchSite of ['cross-site', 'same-site']) {
			for (const path of FORM_ROUTES) {
				test(`POST ${path} with Sec-Fetch-Site: ${fetchSite}`, async ({ api, mock }) => {
					const response = await api(path, {
						method: 'POST',
						body: {},
						headers: { 'sec-fetch-site': fetchSite }
					});
					const body = await response.text();
					expect(
						response.status(),
						`Sec-Fetch-Site: ${fetchSite} answered ${response.status()} ${body}`
					).toBe(403);

					const reached = await mock.requests();
					expect(reached, 'the header check must also come before any call to the API').toEqual([]);
				});
			}
		}
	});
});
