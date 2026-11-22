import type { APIResponse, Response as BrowserResponse } from '@playwright/test';

import { expect, test, type Page } from '../../fixtures';
import { APP_ORIGIN, signInWithFixture } from '../../helpers';

/**
 * lane-b §14 — the Board preflight measured from a browser context, on a lane that actually mounted a Board domain.
 *
 * `suites/api/board-origin.spec.ts` is the owner of the Board Origin gate, and every run of it until 2026-11-22 was in
 * the *unconfigured* state (`test-servers.ts:150` blanks `NEXT_PUBLIC_BOARD_APP_DOMAIN` unless `E2E_BOARD_APP_DOMAIN`
 * is given), so the `boardPreflight` grant — the only place these three routes ever name a method — had never been
 * answered. lane-c pinned the refusal side of it (`suites/lane-c/method-and-preflight.spec.ts`, whose header records the
 * trusted preflight as not reachable in its lane); lane-d pinned the *data* answers behind the gate. What is here, and
 * nowhere else:
 *
 *   1. the granted preflight itself, on all three routes: status, and each of `Access-Control-Allow-Methods`,
 *      `-Headers`, `-Credentials`, `Access-Control-Max-Age` next to the refusal's silence about all five;
 *   2. the same OPTIONS matrix from a browser context, over four Origin situations, one of them the very server under
 *      test named the other way round;
 *   3. `GET` versus `HEAD` on a route that exports only `GET` + `OPTIONS`, and Next's bodiless `405` for a verb the
 *      file does not export — against the app's own `403 {"message":"Forbidden"}`, which has a body;
 *   4. that a preflight grant is not a data grant: the origin a `204` just blessed is judged again, on its own, by the
 *      `GET` that follows it;
 *   5. what a **real page** can and cannot do on these routes, which is where the mount choice bites: Chromium sends an
 *      `Origin` on a same-origin `POST` and on any cross-origin request, and sends **none** on a same-origin `GET` —
 *      and these three routes refuse a caller with no Origin. So mounting the Board at this app's own origin does not
 *      let this app's own pages read `/api/board/session`. Measured below, not argued.
 *
 * The two mount states this file was run in, both on lane-b (app 3032, mock 3996-3999), and what each one proves:
 *
 *   A. `E2E_BOARD_APP_DOMAIN=http://localhost:3032` — the Board mounted at the app's own origin. `APP_ORIGIN` is then
 *      the trusted origin, and the same server under the *other* loopback name (`http://127.0.0.1:3032`) is refused.
 *      Logs: `E:\Coding\.tmp\lane-b-board-api-1.log`, `E:\Coding\.tmp\lane-b-board-preflight-1.log`.
 *   B. `E2E_BOARD_APP_DOMAIN=http://127.0.0.1:3032` — the Board mounted on a *different* origin from the app's, which is
 *      the shape a real deployment has (`app.ever.team` + `board.ever.team`) and the shape `board-origin.spec.ts:78-80`
 *      says state A loses: with A, "only the Board origin passes" has no own-origin contrast left, because the two are
 *      the same string. Logs: named in `PLAN.md` §14.
 *
 * The file derives every expectation from the runtime env the app itself publishes (`data-ever-teams-runtime-env` on
 * `<html>`, `app/[locale]/layout.tsx` → `getPublicRuntimeEnv()`), so it says the same true thing in either state, and
 * skips the granted half rather than fake it when no Board domain is mounted. The rule it derives from is read out of
 * `core/lib/board/board-app.ts:71-87` (`trustedBoardOrigin` is `new URL(configured).origin`; `isTrustedBoardOrigin` is
 * `origin === trusted`, exact string equality, a null origin never matching) and `core/services/server/board-cors.ts`
 * (`boardPreflight` :31-41 → 204 + methods/headers/max-age through `forBoard` :19-23; `forbiddenForBoard` :26-28 → 403
 * with no CORS header; `privateBoardAnswer` :12-16 → `Cache-Control: no-store` + `Vary: Origin, Cookie` on both).
 *
 * Two header facts that belong to Next 16 and not to this app, both measured here rather than taken on trust, because
 * they decide how the assertions below are written:
 *
 *   - The app writes one `Vary: Origin, Cookie`. What the wire carries is Next's own entries around it, and the shape
 *     differs by answer: the granted `204` preflight arrived with **two** `Vary` lines
 *     (`rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch` and `Origin, Cookie`) and no
 *     `Accept-Encoding`, while every JSON answer arrived with **one** line that also names `Accept-Encoding`
 *     (`E:\Coding\.tmp\lane-b-board-probe-1.log`). A browser request and a curl request are not the same request, so
 *     every `Vary` claim below is `toContain`, exactly as in `board-origin.spec.ts:169-174`.
 *   - A `HEAD` reaches the `GET` handler: `auto-implement-methods.js:39-45` in
 *     `node_modules/next/dist/server/route-modules/app-route/helpers/` (quoted by lane-c's
 *     `method-and-preflight.spec.ts`) implements a missing `HEAD` as the `GET` handler. Measured here on the Board
 *     routes: a `HEAD` from an origin the guard refuses answers 403, and a `HEAD` from the trusted one answers the same
 *     status the cookieless `GET` does. A verb the file does not export at all (`PUT`, `DELETE`) gets Next's own
 *     bodiless 405 — no `Cache-Control`, no CORS header, no `Allow`.
 */

/** The names `board-cors.ts` could grant a caller, and nothing else. */
const CORS_GRANT_NAMES = [
	'access-control-allow-origin',
	'access-control-allow-methods',
	'access-control-allow-headers',
	'access-control-allow-credentials',
	'access-control-max-age'
] as const;

/** Every header name this file prints, so a log line carries the whole measured answer. */
const PRINTED_NAMES = [...CORS_GRANT_NAMES, 'allow', 'cache-control', 'content-type', 'vary'];

/**
 * The three Board routes and the verb each file exports, read out of the route files rather than inferred:
 * `app/api/board/session/route.ts:18` `GET` + `:39` `OPTIONS`; `app/api/board/members/route.ts:16` + `:49`;
 * `app/api/board/notify/route.ts:37` `POST` + `:83` `OPTIONS`. `preflight` is the `methods` string each one hands to
 * `boardPreflight` (`'GET'`, `'GET'`, `'POST'`).
 */
const BOARD_ROUTES = [
	{ path: '/api/board/session', verb: 'GET', preflight: 'GET' },
	{ path: '/api/board/members', verb: 'GET', preflight: 'GET' },
	{ path: '/api/board/notify', verb: 'POST', preflight: 'POST' }
] as const;

/** The Board origin a real deployment would mount, and one that is only unrelated. */
const PROD_BOARD_ORIGIN = 'https://board.ever.team';
const FOREIGN_ORIGIN = 'https://some-other-site.example';
/** A loopback origin this machine answers that is not this app: this lane's own control API port. */
const FOREIGN_LOOPBACK_ORIGIN = 'http://localhost:3998';
/** The very server under test, named the other way round. `LOOPBACK_HOSTS` holds both names
 * (`core/lib/board/board-app.ts:26`) while the guard compares `url.origin` strings exactly (`:86`). */
const SAME_SERVER_OTHER_NAME = 'http://127.0.0.1:3032';

type Answer = { status: number; headers: Record<string, string>; body: string };
type PageFetchInit = { method?: string; headers?: Record<string, string>; body?: string };

/**
 * What the app under test publishes as its public configuration, read the way `lane-servers.mjs check` reads it.
 * Module-level so one page render carries the whole file, as in `board-origin.spec.ts:118-140`.
 */
let runtimeEnv: Record<string, string> | undefined;

async function publishedEnv(page: Page): Promise<Record<string, string>> {
	if (runtimeEnv === undefined) {
		await page.goto(APP_ORIGIN, { waitUntil: 'domcontentloaded' });
		const match = (await page.content()).match(/data-ever-teams-runtime-env="([^"]*)"/);
		const decoded = (match?.[1] ?? '')
			.replace(/&quot;/g, '"')
			.replace(/&#x27;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&');
		try {
			runtimeEnv = decoded ? (JSON.parse(decoded) as Record<string, string>) : {};
		} catch {
			runtimeEnv = {};
		}
		console.log(
			`[lane-b board] runtime env NEXT_PUBLIC_BOARD_APP_DOMAIN=${JSON.stringify(runtimeEnv.NEXT_PUBLIC_BOARD_APP_DOMAIN)} ` +
				`NEXT_PUBLIC_WEB_APP_URL=${JSON.stringify(runtimeEnv.NEXT_PUBLIC_WEB_APP_URL)}`
		);
	}
	return runtimeEnv;
}

/** `NEXT_PUBLIC_BOARD_APP_DOMAIN` as the app published it, trimmed the way `trustedBoardOrigin` trims it. */
const mountedBoardOrigin = (env: Record<string, string>) => (env.NEXT_PUBLIC_BOARD_APP_DOMAIN ?? '').trim();

const originHeader = (origin: string | null) => (origin === null ? {} : { origin });

/** Reads an answer once, and writes what it read into the run log. */
async function record(label: string, response: APIResponse): Promise<Answer> {
	const headers = await response.headers();
	const body = await response.text();
	const shown = PRINTED_NAMES.filter((name) => headers[name] !== undefined)
		.map((name) => `${name}=${JSON.stringify(headers[name])}`)
		.join(' ');
	const otherNames = Object.keys(headers)
		.filter((name) => !PRINTED_NAMES.includes(name))
		.join(',');
	console.log(
		`[lane-b board] MEASURE ${label} -> ${response.status()} | ${shown} | body(${body.length}B)=${JSON.stringify(
			body.slice(0, 120)
		)} | other header names: ${otherNames || 'none'}`
	);
	return { status: response.status(), headers, body };
}

/** `forbiddenForBoard()`, pinned to its headers: 403, its own body, and none of the five CORS names. */
function expectBoardRefusal(why: string, answer: Answer) {
	expect(answer.status, `${why}: answered ${answer.status} ${answer.body.slice(0, 120)}`).toBe(403);
	expect(
		answer.body,
		`${why}: 403, but not this app's Board refusal — the body was ${JSON.stringify(answer.body.slice(0, 120))}`
	).toBe('{"message":"Forbidden"}');
	for (const name of CORS_GRANT_NAMES) {
		expect(
			answer.headers[name],
			`${why}: a refused Board answer carried ${name}=${JSON.stringify(
				answer.headers[name]
			)}; forbiddenForBoard() (board-cors.ts:26-28) writes no CORS header at all, and one here would let the caller read the refusal`
		).toBeUndefined();
	}
	expect(
		answer.headers['cache-control'],
		`${why}: Cache-Control was ${JSON.stringify(answer.headers['cache-control'])} — privateBoardAnswer() sets no-store`
	).toBe('no-store');
	const vary = answer.headers['vary'] ?? '';
	expect(
		vary,
		`${why}: Vary was ${JSON.stringify(vary)} — privateBoardAnswer() puts Origin and Cookie on every Board answer`
	).toContain('Origin');
	expect(vary, `${why}: Vary was ${JSON.stringify(vary)} — and the Cookie that decided it`).toContain('Cookie');
}

/** `boardPreflight()`'s grant, pinned name by name on top of `forBoard()`'s echo. */
function expectBoardPreflightGrant(why: string, answer: Answer, trusted: string, methods: string) {
	expect(answer.status, `${why}: answered ${answer.status} ${answer.body.slice(0, 120)}`).toBe(204);
	expect(
		answer.headers['access-control-allow-methods'],
		`${why}: Access-Control-Allow-Methods was ${JSON.stringify(
			answer.headers['access-control-allow-methods']
		)} — board-cors.ts:38 writes the methods string the route file handed it (${methods})`
	).toBe(methods);
	expect(
		answer.headers['access-control-allow-headers'],
		`${why}: Access-Control-Allow-Headers was ${JSON.stringify(
			answer.headers['access-control-allow-headers']
		)} — board-cors.ts:39 writes the fixed pair 'Accept, Content-Type'`
	).toBe('Accept, Content-Type');
	expect(
		answer.headers['access-control-max-age'],
		`${why}: Access-Control-Max-Age was ${JSON.stringify(
			answer.headers['access-control-max-age']
		)} — board-cors.ts:40 caches a Board preflight for 600 s`
	).toBe('600');
	expect(
		answer.headers['access-control-allow-origin'],
		`${why}: Access-Control-Allow-Origin was ${JSON.stringify(
			answer.headers['access-control-allow-origin']
		)} — forBoard() (board-cors.ts:20) echoes the trusted origin it accepted (${trusted})`
	).toBe(trusted);
	expect(
		answer.headers['access-control-allow-credentials'],
		`${why}: Access-Control-Allow-Credentials was ${JSON.stringify(
			answer.headers['access-control-allow-credentials']
		)} — the Board calls these routes with credentials: 'include'`
	).toBe('true');
	expect(
		answer.body,
		`${why}: a 204 preflight answered ${answer.body.length} bytes of body (${JSON.stringify(answer.body.slice(0, 80))})`
	).toBe('');
	expect(
		answer.headers['cache-control'],
		`${why}: Cache-Control was ${JSON.stringify(answer.headers['cache-control'])}`
	).toBe('no-store');
	const vary = answer.headers['vary'] ?? '';
	expect(vary, `${why}: Vary was ${JSON.stringify(vary)}`).toContain('Origin');
	expect(vary, `${why}: Vary was ${JSON.stringify(vary)}`).toContain('Cookie');
}

/** Next's own answer for a verb the route file does not export: nothing of the app's is on it. */
function expectNextOwnMethodRefusal(why: string, answer: Answer) {
	expect(answer.status, `${why}: answered ${answer.status} ${answer.body.slice(0, 120)}`).toBe(405);
	expect(
		answer.body,
		`${why}: Next's 405 answered ${answer.body.length} bytes of body (${JSON.stringify(answer.body.slice(0, 120))})`
	).toBe('');
	for (const name of CORS_GRANT_NAMES) {
		expect(answer.headers[name], `${why}: a bodiless Next 405 carried ${name}`).toBeUndefined();
	}
	expect(
		answer.headers['allow'],
		`${why}: Next answered ${JSON.stringify(answer.headers['allow'])} — the 405 of an unexported verb named no Allow`
	).toBeUndefined();
	expect(
		answer.headers['cache-control'],
		`${why}: Cache-Control was ${JSON.stringify(
			answer.headers['cache-control']
		)} — privateBoardAnswer() never ran, so the route module was never entered`
	).toBeUndefined();
	const vary = answer.headers['vary'] ?? '';
	expect(
		vary,
		`${why}: Vary was ${JSON.stringify(vary)} — the app's Origin/Cookie pair is absent from a 405 Next wrote by itself`
	).not.toContain('Cookie');
}

async function fetchBoard(
	request: Page['request'],
	path: string,
	options: { method: string; origin?: string | null; headers?: Record<string, string>; data?: string }
) {
	const headers: Record<string, string> = { accept: 'application/json', ...(options.headers ?? {}) };
	if (options.origin !== undefined) Object.assign(headers, originHeader(options.origin));
	return request.fetch(`${APP_ORIGIN}${path}`, {
		method: options.method,
		headers,
		...(options.data === undefined ? {} : { data: options.data }),
		timeout: 60_000
	});
}

test.describe('lane-b · the Board preflight matrix on a lane with the Board mounted', () => {
	/** The granted half only means something on an app that mounted a Board; say so instead of passing vacuously. */
	test.beforeEach(async ({ page }) => {
		const env = await publishedEnv(page);
		expect(
			Object.keys(env).length,
			'the app under test published no runtime env at all — it is not answering, so nothing below would mean anything'
		).toBeGreaterThan(0);
		test.skip(
			mountedBoardOrigin(env) === '',
			'this app names no NEXT_PUBLIC_BOARD_APP_DOMAIN, so boardPreflight() refuses every caller and the grant cannot be measured — start the lane with E2E_BOARD_APP_DOMAIN (this file header names the command)'
		);
	});

	test('OPTIONS on each Board route: one grant and six refusals, every header named', async ({
		page,
		request,
		mock
	}) => {
		const trusted = mountedBoardOrigin(await publishedEnv(page));
		const probes = [
			{ origin: APP_ORIGIN, label: `this app's own origin ${APP_ORIGIN}` },
			{ origin: SAME_SERVER_OTHER_NAME, label: `the same server under the other loopback name` },
			{ origin: FOREIGN_LOOPBACK_ORIGIN, label: `a loopback origin that is not this app` },
			{ origin: FOREIGN_ORIGIN, label: `an unrelated site` },
			{ origin: PROD_BOARD_ORIGIN, label: `the Board origin a real deployment mounts` },
			{ origin: null, label: 'no Origin header at all' }
		];

		for (const route of BOARD_ROUTES) {
			for (const probe of [...probes, { origin: trusted, label: `the Board origin this lane mounted` }]) {
				const answer = await record(
					`OPTIONS ${route.path} | Origin ${probe.origin ?? 'NONE'} (${probe.label}) | ACRM ${route.verb}`,
					await fetchBoard(request, route.path, {
						method: 'OPTIONS',
						origin: probe.origin,
						headers: { 'access-control-request-method': route.verb }
					})
				);
				if (probe.origin === trusted) {
					expectBoardPreflightGrant(
						`OPTIONS ${route.path} from ${probe.origin}`,
						answer,
						trusted,
						route.preflight
					);
				} else {
					expectBoardRefusal(
						`OPTIONS ${route.path} from ${probe.origin ?? 'no Origin'} (${probe.label})`,
						answer
					);
				}
			}
			// `boardPreflight` answers before anything else is done (board-cors.ts:31-41): grant or refusal, no preflight
			// ever touched the test backend. The whole log, not "nothing about this route".
			const asked = await mock.requests();
			expect(
				asked.map((r) => `${r.method} ${r.path} ${r.status}`),
				`a preflight of ${route.path} reached the test backend (${asked.map((r) => `${r.method} ${r.path}`).join(', ')})`
			).toEqual([]);
		}
	});

	test('the grant is per route and fixed: it names what that route exports, whatever the caller asked for', async ({
		page,
		request,
		mock
	}) => {
		const trusted = mountedBoardOrigin(await publishedEnv(page));

		for (const route of BOARD_ROUTES) {
			const answer = await record(
				`OPTIONS ${route.path} | Origin ${trusted} | ACRM DELETE, ACH x-custom`,
				await fetchBoard(request, route.path, {
					method: 'OPTIONS',
					origin: trusted,
					headers: { 'access-control-request-method': 'DELETE', 'access-control-request-headers': 'x-custom' }
				})
			);
			// `boardPreflight(req, methods)` never reads `Access-Control-Request-Method` (board-cors.ts:31-41): the grant is
			// the string the route file hard-coded, so asking for DELETE buys exactly nothing.
			expectBoardPreflightGrant(`OPTIONS ${route.path} asking for DELETE`, answer, trusted, route.preflight);
		}

		// And the grant does not extend to a verb the route file does not export: `/api/board/session` blessed `GET`
		// above and still answers a POST with Next's own bodiless 405, carrying none of the CORS names.
		const postAnswer = await record(
			'POST /api/board/session | Origin trusted, after its OPTIONS granted GET',
			await fetchBoard(request, '/api/board/session', {
				method: 'POST',
				origin: trusted,
				headers: { 'content-type': 'application/json' },
				data: JSON.stringify({ kind: 'share' })
			})
		);
		expectNextOwnMethodRefusal('POST /api/board/session from the trusted origin', postAnswer);

		expect(
			(await mock.requests()).map((r) => `${r.method} ${r.path}`),
			'a preflight or the POST it does not grant reached the test backend'
		).toEqual([]);
	});

	test('GET versus HEAD on a route that exports GET and OPTIONS only', async ({ page, request, mock }) => {
		const trusted = mountedBoardOrigin(await publishedEnv(page));
		const refused = SAME_SERVER_OTHER_NAME === trusted ? PROD_BOARD_ORIGIN : SAME_SERVER_OTHER_NAME;

		for (const route of BOARD_ROUTES) {
			if (route.verb !== 'GET') continue;

			const headTrusted = await record(
				`HEAD ${route.path} | Origin ${trusted}`,
				await fetchBoard(request, route.path, { method: 'HEAD', origin: trusted })
			);
			// Next implements a missing HEAD as the GET handler (auto-implement-methods.js:39-45, quoted in
			// suites/lane-c/method-and-preflight.spec.ts), so the Origin guard and the cookie check ran: this is a Board
			// answer with the echo, not a 405. The status is the one a cookieless GET gets (session route.ts:25-27),
			// and a HEAD response carries no body.
			expect(
				headTrusted.status,
				`HEAD ${route.path} from the trusted origin answered ${headTrusted.status} ${headTrusted.body}`
			).toBe(401);
			expect(
				headTrusted.headers['access-control-allow-origin'],
				`HEAD ${route.path} from the trusted origin carried ACAO ${JSON.stringify(
					headTrusted.headers['access-control-allow-origin']
				)} — a HEAD that reached forBoard() proves the GET handler ran`
			).toBe(trusted);
			expect(headTrusted.body, `HEAD ${route.path} answered ${headTrusted.body.length} bytes of body`).toBe('');

			const headRefused = await record(
				`HEAD ${route.path} | Origin ${refused}`,
				await fetchBoard(request, route.path, { method: 'HEAD', origin: refused })
			);
			expect(
				headRefused.status,
				`HEAD ${route.path} from ${refused} answered ${headRefused.status} — the Origin guard runs on the GET handler a HEAD is routed to`
			).toBe(403);
			expect(
				headRefused.headers['access-control-allow-origin'],
				`HEAD ${route.path} from ${refused} carried ACAO ${JSON.stringify(headRefused.headers['access-control-allow-origin'])}`
			).toBeUndefined();
			// The refusal's body is the one thing a HEAD cannot carry: same status, same guard, no bytes to read.
			expect(
				headRefused.body,
				`HEAD ${route.path} from ${refused} answered ${headRefused.body.length} B — forbiddenForBoard()'s {"message":"Forbidden"} must not ride on a HEAD`
			).toBe('');
		}

		expect(
			(await mock.requests()).map((r) => `${r.method} ${r.path}`),
			'a HEAD probe of a Board route reached the test backend'
		).toEqual([]);
	});

	test('the shapes a Board route answers, side by side: 403 with a body, 405 without one, 401 with a body, 500 as HTML', async ({
		page,
		request,
		mock
	}) => {
		const trusted = mountedBoardOrigin(await publishedEnv(page));

		for (const route of BOARD_ROUTES) {
			expectBoardRefusal(
				`${route.verb} ${route.path} from ${PROD_BOARD_ORIGIN}`,
				await record(
					`${route.verb} ${route.path} | Origin ${PROD_BOARD_ORIGIN}`,
					await fetchBoard(request, route.path, { method: route.verb, origin: PROD_BOARD_ORIGIN })
				)
			);

			for (const verb of ['PUT', 'DELETE']) {
				const notExported = await record(
					`${verb} ${route.path} | Origin ${trusted}`,
					await fetchBoard(request, route.path, { method: verb, origin: trusted })
				);
				expectNextOwnMethodRefusal(`${verb} ${route.path} (the route file does not export it)`, notExported);
			}
		}

		// The 401 behind the gate, for contrast with the 403 in front of it: same origin, no cookies, and this one *is*
		// a CORS-readable Board answer (`forBoard(… 401 …)`: session route.ts:26, members :23, notify :53).
		const signedOut = await record(
			'GET /api/board/session | Origin trusted, no cookies',
			await fetchBoard(request, '/api/board/session', { method: 'GET', origin: trusted })
		);
		expect(
			signedOut.status,
			`a signed-out GET from the trusted origin answered ${signedOut.status} ${signedOut.body}`
		).toBe(401);
		expect(signedOut.body, `the signed-out Board answer was ${JSON.stringify(signedOut.body)}`).toBe(
			'{"message":"Unauthorized"}'
		);
		expect(
			signedOut.headers['access-control-allow-origin'],
			'the 401 behind the Origin gate is still echoed to the trusted caller'
		).toBe(trusted);
		expect(signedOut.headers['access-control-allow-credentials']).toBe('true');

		// TRACE is a verb this app cannot even build a Request for: Next's own 500 error document answers it, and it is
		// the one Board-route answer on this lane that is neither JSON nor a refusal. Dev-server behaviour
		// (`TypeError: 'TRACE' HTTP method is unsupported.` from NextRequest construction, seen whole in
		// `E:\Coding\.tmp\lane-b-board-probe-1.log`), and the only one of these shapes that enters no handler of this app.
		const trace = await record(
			'TRACE /api/board/session | no Origin',
			await fetchBoard(request, '/api/board/session', { method: 'TRACE' })
		);
		expect(trace.status, `TRACE answered ${trace.status}`).toBe(500);
		expect(
			trace.headers['content-type'] ?? '',
			`TRACE answered content-type ${JSON.stringify(trace.headers['content-type'])}`
		).toContain('text/html');
		expect(trace.headers['access-control-allow-origin'], 'the TRACE 500 carried a CORS grant').toBeUndefined();
		expect(
			trace.body,
			`TRACE answered with a Board JSON refusal instead of Next's error document: ${trace.body.slice(0, 120)}`
		).not.toContain('"message":"Forbidden"');

		expect(
			(await mock.requests()).map((r) => `${r.method} ${r.path}`),
			'an Origin or verb probe reached the test backend'
		).toEqual([]);
	});

	test('a granted preflight is not a data grant: the blessed origin is judged again on the GET that follows', async ({
		page,
		request,
		anon,
		context,
		fixture,
		mock
	}) => {
		const trusted = mountedBoardOrigin(await publishedEnv(page));

		// 1. The preflight says yes.
		expectBoardPreflightGrant(
			'OPTIONS /api/board/session from its own Board origin',
			await record(
				'OPTIONS /api/board/session | Origin trusted | ACRM GET',
				await fetchBoard(request, '/api/board/session', {
					method: 'OPTIONS',
					origin: trusted,
					headers: { 'access-control-request-method': 'GET' }
				})
			),
			trusted,
			'GET'
		);
		expect(await mock.requests(), 'the preflight asked the test backend something').toEqual([]);

		// 2. The real GET from the very same origin, still no session: 401, its own body, its own echo. A 204 preflight
		// bought the caller the right to *ask*, never a session — session route.ts:25-27 checks the cookies after the Origin.
		const signedOut = await record(
			'GET /api/board/session | the preflighted origin, no cookies',
			await fetchBoard(request, '/api/board/session', { method: 'GET', origin: trusted })
		);
		expect(
			signedOut.status,
			`the preflighted origin was treated as signed in by a 204: ${signedOut.status} ${signedOut.body}`
		).toBe(401);
		expect(signedOut.body).toBe('{"message":"Unauthorized"}');
		expect(await mock.requests(), 'a signed-out 401 Board session read asked the test backend something').toEqual(
			[]
		);

		// 3. The same GET with the lane's session cookies does get an answer, and the answer names a person.
		// `request` above is Playwright's cookieless context; `page.request` carries the browser context's jar. The
		// session goes on that context through `signInWithFixture` directly — the same call `app()` makes
		// (`fixtures.ts:153-164` → helpers.ts:187-207) — because a page that mounted the app shell asks the mock for its
		// own `/api/user/me`, and this test's claim is about *who* asked it. `/favicon.ico` is the document: it is on
		// this app's origin, answers `200 image/x-icon`, and runs no code.
		await anon('/favicon.ico');
		await signInWithFixture(context, fixture);
		const askedBefore = (await mock.calls('/api/user/me')).length;
		const signedIn = await record(
			'GET /api/board/session | the preflighted origin, with the lane session',
			await fetchBoard(page.request, '/api/board/session', { method: 'GET', origin: trusted })
		);
		expect(
			signedIn.status,
			`a session-bearing Board session read answered ${signedIn.status} ${signedIn.body}`
		).toBe(200);
		const user = JSON.parse(signedIn.body) as { id?: string; name?: string; imageUrl?: string | null };
		expect(
			user.id,
			`/api/board/session answered ${signedIn.body} — boardSessionUser() answers {id,name,imageUrl} (board-app.ts:167-174)`
		).toBeTruthy();
		expect(user.name, `the session answer was ${signedIn.body} — no name`).toBeTruthy();
		expect(user, `the session answer was ${signedIn.body} — no imageUrl key`).toHaveProperty('imageUrl');
		const askedAfter = await mock.calls('/api/user/me');
		expect(
			askedAfter.map((r) => `${r.method} ${r.path} ${r.status}`),
			`the credentialed Board session read did not check its token against the test backend (${askedBefore} → ${askedAfter.length} asks of /api/user/me)`
		).toHaveLength(askedBefore + 1);
	});
});

test.describe('lane-b · what a real page on this app can read on the Board routes', () => {
	/**
	 * Everything below is driven from a page this lane's app served, so the Origin header is the browser's and not a
	 * string this file chose. The mount decides the outcome and the file derives it from the published env rather than
	 * assuming a state: a page on `APP_ORIGIN` is a trusted Board caller exactly when `APP_ORIGIN` *is* the mounted
	 * Board origin.
	 */
	test.beforeEach(async ({ page }) => {
		const env = await publishedEnv(page);
		expect(Object.keys(env).length, 'the app under test published no runtime env at all').toBeGreaterThan(0);
	});

	test("a same-origin GET sends no Origin and is refused; the same page's POST sends one and is judged by its body", async ({
		app
	}) => {
		const page = await app('/', { requireShell: false });
		const trusted = mountedBoardOrigin(await publishedEnv(page));
		const seen = watchBoardResponses(page);

		// A credentialed same-origin GET: Chromium sends no `Origin` for it (a same-origin GET is not a CORS request), so
		// the caller is the one `isTrustedBoardOrigin` can never match (`board-app.ts:85-86`, `origin === null`). Mounting
		// the Board at this app's own origin therefore does not make this app's own pages able to read the Board session.
		const get = await inPageFetch(page, `${APP_ORIGIN}/api/board/session`, {});
		console.log(`[lane-b board] in-page same-origin GET /api/board/session -> ${JSON.stringify(get)}`);
		expect(
			get.resolved ? get.status : get.error,
			`a same-origin in-page GET was not refused with 403: ${JSON.stringify(
				get
			)} — the browser sends no Origin on a same-origin GET and these routes refuse a caller with none`
		).toBe(403);
		expect(get.body ?? '', `the same-origin GET answered ${JSON.stringify(get.body)}`).toBe(
			'{"message":"Forbidden"}'
		);

		// A same-origin POST *is* a CORS-shaped request, so the browser does send `Origin`. On this lane that Origin is
		// the app's own origin, which state A mounted as the Board and state B did not — so the answer behind the gate
		// (415, the content-type gate at notify route.ts:43-49) appears only in state A.
		const post = await inPageFetch(page, `${APP_ORIGIN}/api/board/notify`, {
			method: 'POST',
			headers: { 'content-type': 'text/plain' },
			body: 'kind=share'
		});
		console.log(
			`[lane-b board] in-page same-origin POST /api/board/notify (text/plain) -> ${JSON.stringify(post)}`
		);
		if (trusted === APP_ORIGIN) {
			expect(
				post.resolved ? post.status : post.error,
				`a same-origin POST was refused by the Origin gate although this lane mounted the Board at ${trusted}: ${JSON.stringify(post)}`
			).toBe(415);
		} else {
			expect(
				post.resolved ? post.status : post.error,
				`a same-origin POST passed the Origin gate although this lane mounted the Board at ${trusted}, not ${APP_ORIGIN}: ${JSON.stringify(post)}`
			).toBe(403);
		}

		const network = seen();
		console.log(
			`[lane-b board] network layer saw ${network
				.map(
					(r) =>
						`${r.method} ${r.status} ACAO=${r.headers['access-control-allow-origin'] ?? 'NONE'} origin-header-as-Playwright-reported-it=${r.requestOrigin ?? 'not reported'}`
				)
				.join(' | ')}`
		);
	});

	/**
	 * Deliberately no `app()` here. A signed-in shell mounts React, and the shell asks the mock for its own data
	 * (`GET /api/user/me` twice, measured in `E:\Coding\.tmp\lane-b-board-preflight-2.log`), which would make every
	 * "nothing reached the test backend" claim in this test mean nothing. The page this test needs is any document on
	 * the app's own origin — `/favicon.ico` answers `200 image/x-icon` and runs no code — plus the session cookies put
	 * on the context directly (`signInWithFixture`, helpers.ts:187-207, which is exactly what `app()` does before it
	 * navigates).
	 */
	test('the session cookie is scoped to a host: a Board on the other loopback name is refused the session it would otherwise carry', async ({
		anon,
		context,
		fixture,
		mock
	}) => {
		const page = await anon('/favicon.ico');
		await signInWithFixture(context, fixture);
		const trusted = mountedBoardOrigin(await publishedEnv(page));
		const seen = watchBoardResponses(page);
		// The page is on `APP_ORIGIN` (`http://localhost:3032`); the other name of the same server is the cross-host
		// target this case needs. Which of the two the lane mounted as the Board decides who is refused (PLAN §14).
		const otherName = SAME_SERVER_OTHER_NAME;
		expect(
			otherName,
			`this case needs a target whose host differs from the page's, and the page is on ${APP_ORIGIN}`
		).not.toBe(APP_ORIGIN);

		// Same server, other loopback name, credentialed, from the page: the browser sends Origin = this page's origin.
		const cross = await inPageFetch(page, `${otherName}/api/board/session`, {});
		const readable = trusted === APP_ORIGIN;
		console.log(
			`[lane-b board] in-page cross-host GET ${otherName}/api/board/session (mounted Board = ${trusted}) -> ${JSON.stringify(cross)}`
		);
		expect(
			cross.resolved,
			`the browser ${cross.resolved ? 'let the page read' : 'blocked'} a cross-host Board call although this lane mounted the Board at ${trusted}: ${JSON.stringify(cross)}`
		).toBe(readable);
		if (readable) {
			// Readable, and empty-handed: `signInWithFixture` puts the cookies on the `localhost` host
			// (helpers.ts:194-206) and a request to `127.0.0.1` never carries them, so this caller passes the Origin gate
			// and then fails the cookie check. A real Board is a subdomain of one site, which is what the route comment
			// assumes (session route.ts:10-13); two loopback host names are not one site.
			const network = seen().find((r) => r.url.startsWith(otherName));
			expect(
				network?.status,
				`the cross-host Board call answered ${JSON.stringify(network?.status)} where the cookie check should have: ${JSON.stringify(cross)}`
			).toBe(401);
			expect(await mock.requests(), 'the cookieless cross-host Board call asked the test backend anyway').toEqual(
				[]
			);
		}

		// The signed-in page's own host, called with the Origin header set to the mounted Board origin and the browser
		// context's cookie jar: this is the call the real Board makes, and on state A it is the only one here that
		// returns a person.
		const sameHost = await record(
			`GET ${APP_ORIGIN}/api/board/session | Origin ${trusted}, browser context cookies`,
			await fetchBoard(page.request, '/api/board/session', { method: 'GET', origin: trusted })
		);
		if (trusted === APP_ORIGIN) {
			expect(
				sameHost.status,
				`the Board origin call on the app's own host answered ${sameHost.status} ${sameHost.body}`
			).toBe(200);
			expect(
				await mock.calls('/api/user/me'),
				'the Board session read never reached the test backend'
			).not.toEqual([]);
		} else {
			expectBoardRefusal(
				`GET on ${APP_ORIGIN} with Origin ${trusted}, which this lane mounted as the Board`,
				sameHost
			);
			expect(await mock.requests(), 'a refused Board session read asked the test backend').toEqual([]);
		}
	});
});

// ---- helpers that need no fixture -------------------------------------------------------------

type InPageResult = {
	resolved: boolean;
	status?: number;
	body?: string;
	exposedAcao?: string | null;
	exposedVary?: string | null;
	error?: string;
};

/**
 * A fetch the page itself makes, so the Origin and the cookies are Chromium's. `resolved: false` is the browser's own
 * CORS verdict (`TypeError: Failed to fetch`), which is the measurement that matters here.
 *
 * What the page can *see* of the answer is not the same as what was sent, measured in
 * `E:\Coding\.tmp\lane-b-board-browser-probe-1.log`: on a **cross-origin** Board call the network layer carried
 * `access-control-allow-origin: http://localhost:3032` and `vary: …` while the page read both as `null` (a CORS response
 * exposes only the safelisted names, and nothing on these routes sets `Access-Control-Expose-Headers`); on a
 * **same-origin** call of the same routes the page read `vary` whole and the ACAO the server had written. So the header
 * claims below are taken from `watchBoardResponses` (the network layer) and the `exposed*` fields are recorded only as
 * evidence of that difference, never asserted.
 */
async function inPageFetch(page: Page, url: string, init: PageFetchInit): Promise<InPageResult> {
	try {
		const result = await page.evaluate(
			async ({ target, init }: { target: string; init: PageFetchInit }) => {
				const response = await fetch(target, { ...init, credentials: 'include' });
				return {
					status: response.status,
					body: (await response.text()).slice(0, 200),
					exposedAcao: response.headers.get('access-control-allow-origin'),
					exposedVary: response.headers.get('vary')
				};
			},
			{ target: url, init }
		);
		return { resolved: true, ...result };
	} catch (error) {
		return { resolved: false, error: String(error) };
	}
}

/**
 * The headers the network layer really exchanged, for page-initiated calls. Playwright's `request.headers()` does not
 * report Chromium's own `Origin` / `Sec-Fetch-Site` on a page request (measured in
 * `E:\Coding\.tmp\lane-b-board-browser-probe-1.log`: every row printed `origin=NONE` while the server echoed an ACAO,
 * i.e. it had seen one), so this file claims an Origin only from what the app answered, never from this list.
 */
function watchBoardResponses(page: Page) {
	const seen: Array<{
		method: string;
		url: string;
		status: number;
		headers: Record<string, string>;
		requestOrigin?: string;
	}> = [];
	page.on('response', (response: BrowserResponse) => {
		if (!response.url().includes('/api/board/')) return;
		seen.push({
			method: response.request().method(),
			url: response.url(),
			status: response.status(),
			headers: response.headers(),
			requestOrigin: response.request().headers()['origin']
		});
	});
	return () => seen;
}
