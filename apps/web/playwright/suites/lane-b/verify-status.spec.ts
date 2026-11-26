import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * `GET /api/auth/verify/status`, pinned on lane-b (app 3032, mock 3996) on 2026-11-22, in the runs
 * `E:\Coding\.tmp\s2-lane-b-verify-*.log`; every number below is printed by the `MEASURE` lines those runs carry.
 *
 * The route is 10 lines and one call — `app/api/auth/verify/status/route.ts:8-10` exports **only** `GET` and hands the
 * request to `forwardToGauzy(req, '/auth/email/verify/status', { noStore: true })`. So everything this file pins is
 * `core/services/server/forward-to-gauzy.ts`, read at this checkout:
 *
 *   - `:89-90` `refuseForeignWrite(req)` first, before anything is read;
 *   - `:92-96` the token comes out of the request cookies (`request-cookies.ts:26-37`) and a request without one is
 *     answered `401 {"statusCode":401,"message":"Unauthorized"}` **before any upstream call** — so "anonymous" is this
 *     app's own refusal, not Gauzy's;
 *   - `:102-107` the media-type gate, only for a request that carries a body;
 *   - `:112` the upstream URL is the fixed path plus `new URL(req.url).search`: the caller controls the query string
 *     and nothing else;
 *   - `:126` an upstream that gave no answer goes to `failedUpstreamAnswer` (`:135-144`), which answers `502` JSON
 *     (`504` for a `TimeoutError`; `499` when the caller already went away) and `UPSTREAM_TIMEOUT_MS` is 60 000 ms
 *     (`:8`), the same budget `playwright/api-fixtures.ts` gives the client — the 504 branch is unreachable from a
 *     test for the reason `suites/lane-b/download-outage.spec.ts` writes out in its header, so it is not claimed here;
 *   - `:22-28` `answerHeaders` copies **only** `Content-Type` off the upstream answer, and adds
 *     `Cache-Control: no-store` because this route asked for it;
 *   - `:128-131` the copied answer is the upstream status and body with those headers and nothing else.
 *
 * The header fact that follows from `:22-28` + `:128-131` and is pinned below rather than assumed: `no-store` rides
 * only on the **copied** upstream answer. Every answer the helper writes itself — the 401 at `:96` and the 502 at
 * `:144` — is a bare `NextResponse.json`, measured with no `Cache-Control` at all.
 *
 * **This lane's mock has no handler for `/api/auth/email/verify/status`.** Its fall-through for a GET path it does not
 * know is `pagination([])` on a 200 (`cypress/support/mock-gauzy-server.mjs:806`, `pagination` at `:9` =
 * `{ items: [], total: 0 }`), written with `content-type: application/json; charset=utf-8`, and its request-log entry
 * carries `method`, `path`, `query`, `startMs`, `endMs` and `status` — `status: 0` for a call the `drops` scenario cut
 * off (`:1082-1089`). So the *content* of the answer is this mock's empty page, and what the test owns is the shape:
 * that the status, the body, the media type and exactly one upstream call are what the helper says they are. The
 * route's real subject (whether the signed-in person still has to verify their address, and Gauzy's 404 on a
 * deployment that verifies none, which `route.ts:3-7` says it passes on) is therefore not testable on this lane, and
 * this file states that gap instead of inventing an answer for it: the mock would need a handler for
 * `/api/auth/email/verify/status` (it has none — `grep -n "verify" cypress/support/mock-gauzy-server.mjs` answers
 * nothing), which is a harness change, not a spec change.
 *
 * A verb the route file does not export never reaches this app at all: Next answers it itself, bodiless, with no
 * `Cache-Control`, no `Allow` and no `Vary: Origin, Cookie` — the same shape `suites/lane-b/board-preflight.spec.ts`
 * pins for the Board routes. Measured here on 2026-11-22 with `curl` against this lane (no cookies): `POST`, `PUT` and
 * `DELETE` → `405`, 0 bytes, no `allow` header; `HEAD` → `401`, because a missing `HEAD` is implemented as the `GET`
 * handler; `OPTIONS` → `204` with `allow: GET, HEAD, OPTIONS` named by Next.
 */

const ROUTE = '/api/auth/verify/status';
/** The path the mock records: `GAUZY_API_SERVER_URL` is the base plus `/api` (see the header of `route-refusals.spec.ts`). */
const UPSTREAM = '/api/auth/email/verify/status';
const FOREIGN_ORIGIN = 'https://some-other-site.example';

/** The mock's fall-through for a GET path it has no handler for: `pagination([])` (`mock-gauzy-server.mjs:806`, `:9`). */
const MOCK_FALL_THROUGH = { items: [], total: 0 };

/** Prints one measured answer, so the run log carries the numbers the assertions below are pinned on. */
function measure(label: string, response: APIResponse, text: string): string {
	const carried = Object.entries(response.headers())
		.filter(
			([name]) =>
				!['date', 'connection', 'keep-alive', 'vary', 'content-encoding', 'transfer-encoding'].includes(name)
		)
		.sort()
		.map(([name, value]) => `${name}=${JSON.stringify(value)}`)
		.join(' ');
	const witness = `${label} -> ${response.status()} | body(${text.length}B)=${JSON.stringify(text.slice(0, 120))} | ${carried}`;
	console.log(`[lane-b verify] MEASURE ${witness}`);
	return witness;
}

/** The recorded calls of this route's upstream, as verb + status. */
const asks = (requests: Array<{ method: string; path: string; status: number }>): string[] =>
	requests.filter((request) => request.path === UPSTREAM).map((request) => `${request.method} ${request.status}`);

test.describe('lane-b · GET /api/auth/verify/status, the proxy for Gauzy’s email-verification status', () => {
	test('a signed-in GET is forwarded exactly once, and the upstream status, body and media type arrive with no-store added', async ({
		api,
		mock
	}) => {
		const response = await api(ROUTE);
		const text = await response.text();
		const witness = measure('signed-in GET /api/auth/verify/status', response, text);
		const headers = response.headers();

		expect(
			response.status(),
			`the upstream status no longer travels unchanged (the mock answers ${UPSTREAM} with its 200 fall-through): ${witness}`
		).toBe(200);
		expect(
			parseAnswer(text),
			`the body is no longer the upstream body byte for byte (${witness}) — this mock answers ${UPSTREAM} with ` +
				'`pagination([])`, so anything else means the helper stopped handing the answer through'
		).toEqual(MOCK_FALL_THROUGH);
		expect(
			headers['content-type'],
			`answerHeaders() (forward-to-gauzy.ts:24) copies the upstream media type and defaults to 'application/json'; ` +
				`this answer says ${JSON.stringify(headers['content-type'])} — the mock writes ` +
				`'application/json; charset=utf-8': ${witness}`
		).toBe('application/json; charset=utf-8');
		expect(
			headers['cache-control'],
			`noStore: true (route.ts:9 → forward-to-gauzy.ts:26) must put Cache-Control: no-store on the copied answer: ${witness}`
		).toBe('no-store');

		// Exactly one upstream call, and nothing else in the log: the whole witness of "this route asks its own
		// endpoint once, and nothing beside it".
		const log = await mock.requests();
		expect(
			triples(log),
			`the route must ask ${UPSTREAM} exactly once and nothing else: ${witness} — full log ${logOf(log)}`
		).toEqual([`GET ${UPSTREAM} 200`]);
	});

	test('an anonymous GET is refused by this app before the upstream is asked, and its 401 is not a no-store answer', async ({
		api,
		mock
	}) => {
		const response = await api(ROUTE, { anonymous: true });
		const text = await response.text();
		const witness = measure('anonymous GET /api/auth/verify/status', response, text);
		const headers = response.headers();

		// `forward-to-gauzy.ts:96`, before the `fetch` at :112: no token in the cookies, no upstream call. Gauzy never
		// sees this request, so the body is this app's own 401 shape, not Gauzy's.
		expect(response.status(), `an unauthenticated read was not refused with 401: ${witness}`).toBe(401);
		expect(
			parseAnswer(text),
			`the anonymous refusal is no longer this helper's own 401 body (${witness}) — a Gauzy-shaped body here would ` +
				'mean the token check at :96 stopped short-circuiting'
		).toEqual({ statusCode: 401, message: 'Unauthorized' });
		expect(
			headers['content-type'],
			`the 401 is a NextResponse.json this helper wrote (:96), not a copied upstream answer: ${witness}`
		).toBe('application/json');
		// The measurement that corrects the obvious reading of `noStore: true`: the option reaches `answerHeaders`
		// (:22-28), which only decorates the copied upstream answer (:128-131). An answer the helper writes itself
		// carries no Cache-Control at all — so this route's 401 is cacheable by a cache that ignores nothing else.
		expect(
			headers['cache-control'],
			`an answer this helper wrote itself now names Cache-Control=${JSON.stringify(headers['cache-control'])} — ` +
				`noStore is applied only in answerHeaders() on the copied upstream answer: ${witness}`
		).toBeUndefined();

		expect(
			await mock.requests(),
			`the anonymous read reached the test backend (${logOf(await mock.requests())}) — the token check at ` +
				'forward-to-gauzy.ts:96 is what keeps an unauthenticated caller off the upstream'
		).toEqual([]);
	});

	test('POST, PUT and DELETE are refused by Next before this app is entered, signed in or not, and nothing is forwarded', async ({
		api,
		mock
	}) => {
		for (const method of ['POST', 'PUT', 'DELETE']) {
			for (const anonymous of [false, true]) {
				const response = await api(ROUTE, {
					method,
					body: {},
					...(anonymous ? { anonymous: true } : {})
				});
				const text = await response.text();
				const headers = response.headers();
				const witness = measure(`${method} (session=${anonymous ? 'none' : 'lane fixture'})`, response, text);

				expect(
					response.status(),
					`a verb this route file does not export must be answered by Next itself, with 405: ${witness}`
				).toBe(405);
				expect(
					text.length,
					`Next's 405 is bodiless; this one answered ${text.length} B (${witness}) — a body here means the route ` +
						'module ran and refused it itself'
				).toBe(0);
				// No `Allow`: Next did not name the verbs, and `refuseForeignWrite` / the token check never ran either,
				// which is what the empty log below proves for every one of these six calls.
				expect(
					headers['allow'],
					`this 405 named Allow=${JSON.stringify(headers['allow'])} — the bodiless 405 of an unexported verb ` +
						`named none: ${witness}`
				).toBeUndefined();
				expect(
					headers['cache-control'],
					`this 405 named Cache-Control=${JSON.stringify(headers['cache-control'])} — the route module (and so ` +
						`noStore) never ran: ${witness}`
				).toBeUndefined();
			}
		}

		expect(
			await mock.requests(),
			`one of the six unexported verbs reached the test backend (${logOf(await mock.requests())})`
		).toEqual([]);

		// The two verbs Next implements by itself, measured in the same run: a missing `HEAD` is implemented as the
		// `GET` handler (so it reaches the token check and answers this app's 401), while `OPTIONS` is answered by
		// Next with the verbs the file exports plus the two it implements.
		const head = await api(ROUTE, { method: 'HEAD', anonymous: true });
		const headText = await head.text();
		expect(
			head.status(),
			`HEAD no longer reaches the GET handler: ${measure('anonymous HEAD', head, headText)}`
		).toBe(401);

		const options = await api(ROUTE, { method: 'OPTIONS', anonymous: true });
		const optionsText = await options.text();
		expect(
			options.headers()['allow'],
			`Next's auto-implemented OPTIONS no longer names what this route file exports: ${measure(
				'anonymous OPTIONS',
				options,
				optionsText
			)}`
		).toBe('GET, HEAD, OPTIONS');

		expect(
			await mock.requests(),
			`HEAD or OPTIONS reached the test backend (${logOf(await mock.requests())})`
		).toEqual([]);
	});

	test('a cut upstream answers 502 with the outage JSON, and the mock records that call with its zero status', async ({
		api,
		mock
	}) => {
		await mock.scenario({ drops: { [UPSTREAM]: 1 } });
		const response = await api(ROUTE);
		const text = await response.text();
		const witness = measure('GET with the upstream call cut', response, text);
		const headers = response.headers();
		const log = await mock.requests();
		const entry = log.find((request) => request.path === UPSTREAM);

		expect(
			response.status(),
			`the outage answer moved off 502 (${witness}) — \`failedUpstreamAnswer\` (forward-to-gauzy.ts:135-144) is the ` +
				'only branch a dropped upstream can take with a 60 s client'
		).toBe(502);
		expect(parseAnswer(text), `the outage body moved (${witness})`).toEqual({
			statusCode: 502,
			message: 'The Gauzy API is unreachable'
		});
		expect(
			headers['content-type'],
			`an outage answer is this app's own JSON, not a copied upstream media type: ${witness}`
		).toBe('application/json');
		expect(
			headers['cache-control'],
			`the outage answer names Cache-Control=${JSON.stringify(headers['cache-control'])} — the helper's own JSON ` +
				`carries no no-store: ${witness}`
		).toBeUndefined();
		// The drop is neither an answer nor a refusal: `status: 0`, and `mock.failures()` (status >= 400) stays empty.
		expect(
			entry?.status,
			`the cut call is not recorded with the drop zero: ${JSON.stringify(entry)} — full log ${logOf(log)}`
		).toBe(0);
		expect(
			await mock.failures(),
			`the drop was counted as a refusal, which would make every "was refused upstream" witness in this lane mean ` +
				`two different things: ${logOf(log)}`
		).toEqual([]);
		expect(asks(log), `the cut call is not the single ask of this route's upstream: ${logOf(log)}`).toEqual([
			'GET 0'
		]);
	});

	test('the query string rides along to the upstream path, and a query-free call arrives query-free', async ({
		api,
		mock
	}) => {
		// `forward-to-gauzy.ts:112` is the whole claim: the path is fixed by the route (`route.ts:9`) and only
		// `new URL(req.url).search` comes from the caller. The mock's log entry (`mock-gauzy-server.mjs:1082-1089`,
		// `query: requestUrl.searchParams.toString()`) is the only place that is observable. Three calls, read back as
		// the ordered list the mock recorded — one entry each, in this order.
		for (const suffix of ['', '?x=1', '?a=1&b=2']) {
			const response = await api(`${ROUTE}${suffix}`);
			const text = await response.text();
			measure(`GET ${ROUTE}${suffix || ' (no query)'}`, response, text);
		}

		const log = await mock.requests();
		const upstream = log.filter((request) => request.path === UPSTREAM);
		expect(
			upstream.map((request) => (request.query === '' ? 'no query' : request.query)),
			`a proxied call's query string is no longer what the caller sent — nothing added, nothing dropped, no ` +
				`reordering (${logOf(log)})`
		).toEqual(['no query', 'x=1', 'a=1&b=2']);
		expect(
			upstream.map((request) => request.path),
			`a query string steered the upstream path (${logOf(log)}) — the route fixes it, which is what keeps a caller ` +
				'from pointing this proxy at another Gauzy endpoint'
		).toEqual([UPSTREAM, UPSTREAM, UPSTREAM]);
		expect(triples(log), `the three calls did not each ask exactly one upstream: ${logOf(log)}`).toEqual(
			[1, 2, 3].map(() => `GET ${UPSTREAM} 200`)
		);
	});

	test('the foreign-origin guard is write-only: a cross-site GET is forwarded, and a cross-site write never reaches the guard', async ({
		api,
		mock
	}) => {
		// `refuseForeignWrite` (same-origin-request.ts:43-46) returns null for GET and HEAD, so this route's only verb
		// is never judged by origin. Measured, not assumed: the call below really is forwarded.
		const foreign = await api(ROUTE, { headers: { origin: FOREIGN_ORIGIN } });
		const foreignText = await foreign.text();
		const witness = measure(`GET with origin: ${FOREIGN_ORIGIN}`, foreign, foreignText);
		expect(
			foreign.status(),
			`a cross-site GET was refused by the origin guard although the guard is write-only (same-origin-request.ts:43-46): ${witness}`
		).toBe(200);
		expect(
			asks(await mock.requests()),
			`the cross-site GET did not reach the test backend: ${witness} — full log ${logOf(await mock.requests())}`
		).toEqual(['GET 200']);

		// The other half of the guard's test, the one a browser really sends: `sec-fetch-site: cross-site` is what
		// `refuseForeignOrigin` (same-origin-request.ts:17-18) refuses on, and a GET still rides straight through it.
		const crossSite = await api(ROUTE, { headers: { 'sec-fetch-site': 'cross-site' } });
		const crossSiteText = await crossSite.text();
		const crossSiteWitness = measure('GET sec-fetch-site cross-site', crossSite, crossSiteText);
		expect(
			crossSite.status(),
			`a GET carrying sec-fetch-site: cross-site was refused although the guard is write-only: ${crossSiteWitness} ` +
				'— refuseForeignWrite (same-origin-request.ts:44) returns null for GET before refuseForeignOrigin is called'
		).toBe(200);

		// And the guard is unreachable **on this route**: `refuseForeignWrite` runs inside `forwardToGauzy` (:89-90), and
		// Next has already answered 405 for a verb the file does not export — so no write of any origin ever gets that
		// far, and the 403 the guard would write is not a fact about this route. The log says so.
		for (const method of ['POST', 'DELETE']) {
			const foreignWrite = await api(ROUTE, { method, body: {}, headers: { origin: FOREIGN_ORIGIN } });
			const foreignWriteText = await foreignWrite.text();
			const foreignWriteWitness = measure(
				`${method} with origin: ${FOREIGN_ORIGIN}`,
				foreignWrite,
				foreignWriteText
			);
			expect(
				foreignWrite.status(),
				`a cross-site ${method} was answered ${foreignWrite.status()} instead of Next's 405 — the app's own ` +
					`cross-site 403 became reachable on a verb this route does not export: ${foreignWriteWitness}`
			).toBe(405);
		}
		expect(
			asks(await mock.requests()),
			`a cross-site write reached the test backend (${logOf(await mock.requests())})`
		).toEqual(['GET 200', 'GET 200']);
	});
});
