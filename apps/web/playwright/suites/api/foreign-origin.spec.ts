import { expect, test } from '../../api-fixtures';
import { APP_ORIGIN } from '../../helpers';
import { foreignOriginRoutes } from './foreign-origin.generated';
import { logOf, parseAnswer, triple } from './log-helpers';

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
 *   1. an Origin that is not this app's host is refused with 403, anonymous or signed in, and the refusal
 *      says so in its body (`{"statusCode":403,"message":"Cross-site request refused"}`);
 *   2. the refusal happened **here**: the mock recorded no call for the route under test;
 *   3. this app's own Origin is not refused as cross-site (the guard is not a blanket 403).
 *
 * Item 2 is the "which side refused" half of `AUDIT.md` finding 10, and the last describe below carries the
 * other half on named routes: the same write from this app's own origin *does* reach the API and *is answered
 * there*, with the log entry pinned as `METHOD PATH STATUS`. A 403 with an empty log and a 200 with an entry
 * are the two ends of the pair; a bare status cannot tell them apart.
 *
 * The log is read filtered — method + path of the route under test — rather than as the whole request log
 * (`AUDIT.md` finding 14, pattern from `suites/lane-c/foreign-id-scope.spec.ts`'s `triple()`). This suite
 * runs with one worker, but a route that keeps a request alive past its own test (a retry, the 5 s session
 * check memo, a delayed scenario) writes into the next test's log. The 2026-11-19 artifact recorded two cases
 * here failing on another test's entries (`audit-evidence.md` §K; that artifact is gone, and the 2026-11-21
 * run does not reproduce it — whether it was fixed or is timing-dependent is unverified). "Nothing was asked
 * *about this route*" is the claim a guard earns and the claim that survives whichever test ran last; the
 * whole log is quoted in the failure message so nothing is hidden from the reader.
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

/** `METHOD PATH STATUS`, the shape a log entry is named in (lane-c/foreign-id-scope.spec.ts's `triple`). */
// `triple`, `logOf` and `parseAnswer` moved to `./log-helpers.ts` (PR #5675's SonarQube duplication finding).

/**
 * The refusal this app writes itself (`refused()` in `core/services/server/same-origin-request.ts`). Pinning
 * the body, not only the 403, is what makes "refused **here**" a claim rather than a guess: an upstream 403
 * arrives with the API's own body, and a permission refusal arrives as "Forbidden resource"
 * (`core/services/server/refuse-without-permission.ts`).
 */
function expectRefusedHere(why: string, status: number, text: string) {
	expect(status, `${why}: answered ${status} ${text.slice(0, 200)}`).toBe(403);
	expect(
		parseAnswer(text),
		`${why}: 403, but not this app's own cross-site refusal — the answer was ${text.slice(0, 200)}, which would mean somebody else refused`
	).toMatchObject({ statusCode: 403, message: 'Cross-site request refused' });
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
			expectRefusedHere(`${why}: anonymous cross-site write`, anonymous.status(), anonymousBody);

			const signedIn = await api(path, { method: route.verb, body: {}, headers: { origin: FOREIGN_ORIGIN } });
			const signedInBody = await signedIn.text();
			expectRefusedHere(`${why}: signed-in cross-site write`, signedIn.status(), signedInBody);

			// The refusal came **here**, before any call about this route: filtered to the route under test, so a
			// late entry of another test cannot make this fail by accident — and the whole log is quoted, so a
			// reader still sees what the filtered view left out.
			const asked = await mock.calls(path);
			expect(
				asked.map(triple),
				`${why}: the refusal must come before anything is asked of the API about ${path}; the mock recorded ${logOf(
					asked
				)} (whole log: ${logOf(await mock.requests())})`
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
		// `/api/daily-plan` is one of the routes the pair describe at the bottom of this file also walks from
		// this app's own origin, where the write is answered by the API rather than refused here.
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
					expectRefusedHere(`POST ${path} with Sec-Fetch-Site: ${fetchSite}`, response.status(), body);

					const asked = await mock.calls(path);
					expect(
						asked.map(triple),
						`POST ${path} with Sec-Fetch-Site: ${fetchSite}: the header check must refuse before anything is asked about ${path}; the mock recorded ${logOf(
							asked
						)} (whole log: ${logOf(await mock.requests())})`
					).toEqual([]);
				});
			}
		}
	});
});

/**
 * The other half of "which side refused" (`AUDIT.md` finding 10), on named routes.
 *
 * Every case above pins the refusal: 403 whose body is this app's own words, and no call about that route in
 * the mock's log. A refusal is only worth what the mirror case proves — that the same write from this app's
 * own page *does* leave, and that what comes back is the API's answer, recorded there. Read together the two
 * pin the boundary rather than a status code: `403 + no entry` is a refusal by this app's guard,
 * `200 + POST /api/… 200` is the platform deciding, and a bare `toBeLessThan(500)` cannot tell them apart.
 *
 * Four named routes, one per guard family, each read in its own file first:
 *   `POST /api/tags`, `POST /api/issue-types`, `POST /api/daily-plan` — the `route` half
 *   (`refuseForeignOrigin` in the handler); none of the three validates the body before its upstream call, so
 *   a signed-in own-origin write must land in the log;
 *   `POST /api/auth/switch-organization` — the `proxy-helper` half (`forwardToGauzy` with nothing in front of
 *   it but its own guard), and the mock grants it tokens for the session's own tenant
 *   (`mock-gauzy-server.mjs`, the switch-organization branch).
 */
test.describe('a refusal names the side that made it', () => {
	const PAIRS: Array<{ path: string; upstream: string; body: (ids: Record<string, string>) => object }> = [
		{ path: '/api/tags', upstream: '/api/tags', body: () => ({}) },
		{ path: '/api/issue-types', upstream: '/api/issue-types', body: () => ({}) },
		{ path: '/api/daily-plan', upstream: '/api/daily-plan', body: () => ({}) },
		{
			path: '/api/auth/switch-organization',
			upstream: '/api/auth/switch-organization',
			body: (ids) => ({ organizationId: ids.organizationA })
		}
	];

	for (const pair of PAIRS) {
		test(`POST ${pair.path}: refused here from another site, answered there from this app`, async ({
			api,
			ids,
			mock
		}) => {
			const body = pair.body(ids);

			const foreign = await api(pair.path, { method: 'POST', body, headers: { origin: FOREIGN_ORIGIN } });
			const foreignText = await foreign.text();
			expectRefusedHere(`POST ${pair.path} from ${FOREIGN_ORIGIN}`, foreign.status(), foreignText);
			expect(
				(await mock.calls(pair.upstream)).map(triple),
				`POST ${pair.path} from ${FOREIGN_ORIGIN}: this app refused, so ${pair.upstream} must not appear in the mock's log at all (whole log: ${logOf(
					await mock.requests()
				)})`
			).toEqual([]);

			// The same caller, the same body, this app's own Origin: the guard lets it through and the API
			// answers. The entry is pinned as method + path + status, and named in the message.
			const own = await api(pair.path, { method: 'POST', body, headers: { origin: OWN_ORIGIN } });
			const ownText = await own.text();
			expect(
				own.status(),
				`POST ${pair.path} from ${OWN_ORIGIN} answered ${own.status()} ${ownText.slice(0, 200)}`
			).toBe(200);
			expect(
				ownText,
				`POST ${pair.path} from ${OWN_ORIGIN} was refused as cross-site: ${ownText.slice(0, 200)}`
			).not.toMatch(/Cross-site request refused/);

			const entry = `POST ${pair.upstream} 200`;
			expect(
				(await mock.calls(pair.upstream)).map(triple),
				`POST ${pair.path} from ${OWN_ORIGIN}: the write was expected to reach the API and be answered there as ${entry} (whole log: ${logOf(
					await mock.requests()
				)})`
			).toEqual([entry]);
		});
	}
});
