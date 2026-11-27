import type { APIResponse } from '@playwright/test';

import { expect, test, type ApiCall } from '../../api-fixtures';
import { APP_ORIGIN } from '../../helpers';

/**
 * The three Board routes (`/api/board/session`, `/api/board/members`, `/api/board/notify`) are the only routes on this
 * app that answer a request **without an `Origin`** with 403 — and the only ones whose guard is a configured host rather
 * than "this host".
 *
 * What was already measured when this file was written, and what is not (`suites/lane-c/unguarded-writes.spec.ts:1008`,
 * green in that lane's own runs — `44 passed (7.5s)` in `E:\Coding\.tmp\lane-c-unguarded-run-7.log` at 22:41, whose test
 * 42 is that Board case; a later report to me claimed a 109-test run in a `…-run-9.log` that does not exist here, and it
 * is recorded as unattributed in the handover rather than cited): that lane drove **`POST /api/board/notify`** over HTTP
 * and pinned that it refuses a cross-site caller *and* a headerless one, with its own body, with the API never asked. That
 * is the refusal half of finding 1, already covered. Not covered there, and what this file adds: the other two routes
 * (`/api/board/session`, `/api/board/members`), the `OPTIONS` preflights, the **shape** of the refusal (no
 * `Access-Control-Allow-Origin` at all, `Cache-Control: no-store`, `Vary: Origin, Cookie`), the credential witness
 * (`state.receivedTokens` stays empty, so the caller's session provably stayed on this host), the look-alike hosts, and
 * the whole configured-Board half. Read the two files as one body of evidence, not as duplicates: if a claim here and a
 * claim there disagree, the logs decide, not this comment.
 *
 * Which guard, exactly:
 *
 * - `core/lib/board/board-app.ts:81-87` `isTrustedBoardOrigin(origin)` → `trustedBoardOrigin()` (`:71-78`) → the trimmed
 *   `NEXT_PUBLIC_BOARD_APP_DOMAIN` parsed as an absolute URL, accepted only as `https:`, or as `http:` when
 *   `NODE_ENV === 'development'` **and** the host is in `LOOPBACK_HOSTS` (`:60-69`, `:36-41`). No configured value, or a
 *   value that is not such a URL, means `trusted === null`, and then **every** origin — including this app's own,
 *   including `https://board.ever.team`, including none — fails `origin === trusted`.
 * - `core/services/server/board-cors.ts` `forbiddenForBoard()` answers that as `{"message":"Forbidden"}` 403 with
 *   `Cache-Control: no-store` and `Vary: Origin, Cookie` and **no** `Access-Control-Allow-*` header, so the browser cannot
 *   read the answer either. `forBoard()` (`:19-23`) is what a trusted caller gets instead: the caller's own origin echoed
 *   back with `Access-Control-Allow-Credentials: true`, because these routes are called with `credentials: 'include'`.
 *
 * **Every run of this suite so far has been in the first state**, because `playwright/test-servers.ts:145` starts the app
 * with `NEXT_PUBLIC_BOARD_APP_DOMAIN: ''`. That is not an accident to work around: it is what an ordinary deployment of
 * the Board feature looks like from a test lane, and half of this file pins it. The other half pins what a *configured*
 * Board looks like — the 415 / 413 / 400 gates of `/api/board/notify`, which are unreachable until an Origin passes, and
 * the CORS echo — and it **skips itself** when the app it is running against names no Board domain, rather than pretending
 * to have proved it. To run that half, start a lane with `E2E_BOARD_APP_DOMAIN` set to that lane's own loopback origin
 * (`E2E_BOARD_APP_DOMAIN=http://localhost:3034 … lane-servers.mjs up lane-d`); `playwright/test-servers.ts` blanks the
 * Board domain unless that variable is given, exactly like it blanks the Ever ID issuer unless `E2E_EVER_ID=1`.
 *
 * What a mock lane cannot answer, written instead of hidden: the mock backend has no handler for the Board's two upstream
 * endpoints — this app posts a notify to `/api/employee-notification/board-share` or `…/board-mention`
 * (`core/lib/board/board-notify.ts:15-18`, via `core/services/server/requests/employee-notification.ts:95-110`, path
 * joined onto `GAUZY_API_SERVER_URL`, which is `basePath + '/api'` — `core/constants/config/constants.tsx:227`) — and the
 * mock's tail answers anything it does not recognise: `DELETE` → `{affected:1, raw:[]}`, **any other verb → the request
 * body echoed back** (`cypress/support/mock-gauzy-server.mjs:792-794`), `GET` → `pagination([])` (`:794`). The mock's own
 * `NOT_FOUND` (`:797`) is only what a few named handlers return, not the fallback. So a trusted notify does reach a
 * `201 {notified: …}` — but `{notified: data?.notified ?? 0}` (`app/api/board/notify/route.ts:77`) reads a field the echoed
 * body never carries, so the number it reports is the mock's amnesia and not an answer about anyone being notified. The
 * tests here claim the **path, the credential and the status**, and say so in the assertion text. Measured: the notify's
 * upstream call is logged by the mock as `POST /api/employee-notification/board-share 200` and its bearer is recorded
 * against that same path (`E:\Coding\.tmp\lane-d-board-probe-2.log`), and the answer this app gives back is exactly
 * `{"notified":0}`.
 *
 * **Ran unconfigured, in lane-c's warm app and mock** (`E:\Coding\.tmp\api-board-origin-lane-c.log` 22 failed / 4
 * skipped, then `api-board-origin-lane-c-2.log` and `api-board-origin-lane-c-3.log`, each **22 passed / 4 skipped**). The
 * command, because the obvious one runs nothing: `playwright.lane.config.ts` limits a lane run to that lane's own folder
 * under `suites/` and this is a `suites/api` file, so a lane run finds 0 tests here. From the repository root:
 * `E2E_LANE=lane-c E2E_REUSE_SERVERS=1 npx playwright test --config apps/web/playwright/playwright.api.config.ts --grep "Board routes"`
 * — `E2E_REUSE_SERVERS=1` is what lets `mockServers()` reuse the lane's servers instead of starting its own app on a
 * occupied port (`test-servers.ts:103`).
 *
 * **And ran with a Board mounted, in lane-d** — the configured half is no longer "not measured".
 * `E2E_BOARD_APP_DOMAIN=http://127.0.0.1:3034 node apps/web/playwright/scripts/lane-servers.mjs up lane-d`, then the same
 * command with `E2E_LANE=lane-d`, logs `E:\Coding\.tmp\api-board-origin-lane-d-mounted-1.log` (**4 passed / 22 skipped
 * (7.2s)**, every one of the four skipping its opposite) and `api-board-origin-lane-d-mounted-2.log` (**4 passed / 22
 * skipped (4.2s)**, the run after the gate-order correction below), with `lane-d-up-board1.log` beside it. The
 * unconfigured half was then run again in the same lane with the Board taken away
 * (`api-board-origin-lane-d-unmounted-2.log`, **22 passed / 4 skipped (5.8s)**), because editing a file both halves share
 * is only evidence if the half you did not touch still passes. `lane-servers.mjs
 * check` cannot confirm this: it compares only the three origins it knows (`:138-142`), so the mount was read back off
 * the page instead — `curl -sL http://localhost:3034/` carries `NEXT_PUBLIC_BOARD_APP_DOMAIN\":\"http://127.0.0.1:3034\"`.
 * `127.0.0.1` rather than `localhost` on purpose, and it works because `LOOPBACK_HOSTS` holds both names
 * (`core/lib/board/board-app.ts:26`, `:67`) while `allowLocalhostHttp` is `NODE_ENV === 'development'` (`:39`): the
 * trusted Board origin is then a *different* origin from the app's own `http://localhost:3034`, so the cases that drive
 * this app's own origin are still refusals. With `http://localhost:3034` mounted instead, the last case's own-origin
 * probe would be filtered out as the trusted one and the "only the Board origin passes" claim would go unproven.
 *
 * What the mounted run measured, in the order the route actually answers (`app/api/board/notify/route.ts:37-81`, status
 * and body read header-by-header in `E:\Coding\.tmp\lane-d-board-probe-2.log` / `-3.log` against the same lane):
 * `403 {"message":"Forbidden"}` for an Origin that is not the trusted one → `415 {"message":"Send the request as
 * application/json"}` → **`401 {"message":"Unauthorized"}` when no `auth-token` cookie is present** → `413 {"message":
 * "The request is too large"}` → `400 {"message":["body: Name the Board by one of roomId and snapshotId."]}` /
 * `400 {"message":["receiverEmployeeIds.0: Invalid UUID"]}` → the session guard → `201 {"notified":0}`. The 401 sits
 * *between* the content-type gate and the size cap (`:52-54`), which is what the case about the gates now pins.
 * A trusted answer is a CORS-readable one whatever its status — `Access-Control-Allow-Origin: http://127.0.0.1:3034` and
 * `Access-Control-Allow-Credentials: true` on the 200, the 201, the 415, the 413 and both 400s alike — while the 403
 * refusal carries neither, which is the difference the two halves of this file are about. `Cache-Control: no-store` on
 * every one; `Vary` carries `Origin` and `Cookie` inside Next 16's own entries (measured:
 * `rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Origin, Cookie, Accept-Encoding`,
 * and without `Accept-Encoding` on the `OPTIONS` answers), which is why every Vary claim here is `toContain`.
 * One thing the mounted run ruled OUT rather than in: `Sec-Fetch-Site` does nothing on these routes. A notify with a
 * trusted `Origin` **and** `Sec-Fetch-Site: cross-site` still answered `201 {"notified":0}` (`lane-d-board-probe-3.log`
 * case M), because `isTrustedBoardOrigin` compares the Origin header as a value (`board-app.ts:81-87`) and no Board route
 * imports `refuseForeignOrigin` — so the Origin header is the only origin check here, and a caller that forges it gets
 * the same answer as the Board itself.
 */

const PROD_BOARD_ORIGIN = 'https://board.ever.team';
const FOREIGN_ORIGIN = 'https://some-other-site.example';
/** Hosts that read like the Board's and are not it, plus the Board host over plain http on a non-loopback name. */
const LOOKALIKE_ORIGINS = ['https://board.ever.team.evil.example', 'https://ever.team', 'http://board.ever.team'];

const BOARD_ROUTES = [
	{ path: '/api/board/session', verb: 'GET' },
	{ path: '/api/board/members', verb: 'GET' },
	{ path: '/api/board/notify', verb: 'POST' }
] as const;

/**
 * What the app under test *thinks* its public configuration is, read the same way `lane-servers.mjs check` reads it: the
 * runtime env the page carries in `<html data-ever-teams-runtime-env="…">` (`app/[locale]/layout.tsx` →
 * `getPublicRuntimeEnv()`), unescaped in the same order React wrote it.
 */
let runtimeEnv: Record<string, string> | undefined;
async function appRuntimeEnv(api: ApiCall) {
	if (runtimeEnv === undefined) {
		const html = await (await api('/', { anonymous: true })).text();
		const match = html.match(/data-ever-teams-runtime-env="([^"]*)"/);
		if (match) {
			const json = match[1]
				.replace(/&quot;/g, '"')
				.replace(/&#x27;/g, "'")
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&amp;/g, '&');
			try {
				runtimeEnv = JSON.parse(json) as Record<string, string>;
			} catch {
				runtimeEnv = {};
			}
		} else {
			runtimeEnv = {};
		}
	}
	return runtimeEnv;
}

const boardDomainConfigured = () => (runtimeEnv?.NEXT_PUBLIC_BOARD_APP_DOMAIN ?? '').trim() !== '';

/** The answer `forbiddenForBoard()` writes, pinned down to its headers (`board-cors.ts:11-16,26-29`). */
async function expectForbiddenForBoard(why: string, response: APIResponse) {
	const status = response.status();
	const text = await response.text();
	const headers = await response.headers();
	expect(status, `${why}: answered ${status} ${text.slice(0, 200)}`).toBe(403);
	expect(text, `${why}: 403, but not this app's Board refusal — the answer was ${text.slice(0, 200)}`).toContain(
		'Forbidden'
	);
	expect(
		headers['access-control-allow-origin'],
		`${why}: a refused Board call carries Access-Control-Allow-Origin (${headers['access-control-allow-origin']}) — forbiddenForBoard() sets no CORS header at all, and one here would mean the caller could read the answer`
	).toBeUndefined();
	expect(
		headers['cache-control'],
		`${why}: Cache-Control was ${headers['cache-control']} — privateBoardAnswer() sets no-store on every Board answer`
	).toBe('no-store');
	/**
	 * Contains, not equals — measured. The app writes `Vary: Origin, Cookie` (`board-cors.ts:14`) and Next 16 answers with
	 * its own entries merged around it: `rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch,
	 * Origin, Cookie, Accept-Encoding` (first seen in `E:\Coding\.tmp\api-board-origin-lane-c.log`, where this assertion
	 * alone red-flagged all 22 of that run's failures while status, body, the missing ACAO, `Cache-Control` and the empty
	 * mock log all held). The claim worth keeping is that the answer varies on **both** the Origin and the Cookie it was
	 * written for; the exact string is Next's, not this app's.
	 */
	const vary = headers['vary'] ?? '';
	expect(
		vary,
		`${why}: Vary was "${vary}" — a Board answer must vary on the caller's Origin and Cookie (privateBoardAnswer, board-cors.ts:14)`
	).toContain('Origin');
	expect(vary, `${why}: Vary was "${vary}" — and on the Cookie that decided it`).toContain('Cookie');
}

/**
 * The mirror of `expectForbiddenForBoard`, for the calls the Origin gate **let through**: every header `forBoard()`
 * writes (`board-cors.ts:19-23`) over `privateBoardAnswer()` (`:12-16`). Used on each answer the configured half
 * reaches — 200, 201, 415, 413, both 400s and the empty-cookie 401 — because a behind-the-gate status is only honest
 * if the caller it belongs to can actually read it. All six were read header-by-header off the mounted lane in
 * `E:\Coding\.tmp\lane-d-board-probe-2.log` (cases C–I), where every one carried the echo, the credentials and
 * `no-store`. Same rule as above on `Vary`: contains, never equals — Next 16 merges its own entries around the app's
 * `Origin, Cookie`.
 */
async function expectBoardCors(what: string, response: APIResponse, trusted: string) {
	const headers = await response.headers();
	expect(
		headers['access-control-allow-origin'],
		`${what}: answered ${response.status()} with Access-Control-Allow-Origin ${JSON.stringify(headers['access-control-allow-origin'])} — behind the Origin gate forBoard() echoes the trusted origin it accepted (${trusted}); only the 403 refusal carries no CORS header at all`
	).toBe(trusted);
	expect(
		headers['access-control-allow-credentials'],
		`${what}: answered ${response.status()} with Access-Control-Allow-Credentials ${JSON.stringify(headers['access-control-allow-credentials'])} — forBoard() answers a credentialed Board call as a credentialed one`
	).toBe('true');
	expect(
		headers['cache-control'],
		`${what}: Cache-Control was ${JSON.stringify(headers['cache-control'])} — privateBoardAnswer() sets no-store on every Board answer, refused or not`
	).toBe('no-store');
	const vary = headers['vary'] ?? '';
	expect(
		vary,
		`${what}: Vary was "${vary}" — a Board answer must vary on the caller's Origin and Cookie (privateBoardAnswer, board-cors.ts:14)`
	).toContain('Origin');
	expect(vary, `${what}: Vary was "${vary}" — and on the Cookie that decided it`).toContain('Cookie');
}

test.describe('api · the Board routes with no Board origin configured', () => {
	/**
	 * Both halves of this file gate themselves on what the app under test actually reports, so a run cannot answer the
	 * wrong question: this half skips the moment a Board domain is mounted, the half below skips while one is blank.
	 */
	test.beforeEach(async ({ api }) => {
		const env = await appRuntimeEnv(api);
		expect(
			Object.keys(env).length,
			'the app under test answered no runtime env at all — it is not answering, so nothing in this file would mean anything'
		).toBeGreaterThan(0);
		test.skip(
			(env.NEXT_PUBLIC_BOARD_APP_DOMAIN ?? '').trim() !== '',
			`this app was started with NEXT_PUBLIC_BOARD_APP_DOMAIN = ${JSON.stringify(env.NEXT_PUBLIC_BOARD_APP_DOMAIN)}; the "no Board origin" half describes only a run where it is blank (test-servers.ts:145)`
		);
	});

	for (const route of BOARD_ROUTES) {
		test.describe(`${route.verb} ${route.path}`, () => {
			const origins = [
				{
					origin: PROD_BOARD_ORIGIN,
					why: `the origin a real deployment trusts (.env:97), which this one does not`
				},
				{ origin: APP_ORIGIN, why: `this app's own origin` },
				{ origin: FOREIGN_ORIGIN, why: `an unrelated site` }
			];

			for (const probe of origins) {
				test(`${probe.origin} (${probe.why}) is refused, and the session never leaves this app`, async ({
					api,
					mock
				}) => {
					const response = await api(route.path, { method: route.verb, headers: { origin: probe.origin } });
					await expectForbiddenForBoard(`${route.verb} ${route.path} with Origin: ${probe.origin}`, response);

					// The refusal is the *first* thing the route does (route.ts:29-32, :26-29, :24-27): no session check, no
					// upstream call. The cookies the caller sent stayed on this host.
					const asked = await mock.calls(route.path);
					expect(
						asked.map((r) => `${r.method} ${r.path} ${r.status}`),
						`${route.path} reached the test backend despite the refusal (whole log: ${(await mock.requests()).map((r) => `${r.method} ${r.path} ${r.status}`).join(', ')})`
					).toEqual([]);
					const tokens = (await mock.state()).receivedTokens as Array<{ path: string }>;
					expect(
						tokens.map((t) => t.path),
						`a Bearer token reached the test backend during a refused Board call (tokens seen for: ${tokens.map((t) => t.path).join(', ')}). These routes are called with credentials: 'include', so "the refusal came before the credential" is the whole claim.`
					).toEqual([]);
				});
			}

			test('no Origin at all is refused too — the opposite of the same-origin guard', async ({ api, mock }) => {
				/**
				 * The side-by-side AUDIT.md finding 1 rests on. `core/services/server/same-origin-request.ts:20-21` runs its
				 * host comparison only `if (origin)`, so a write with no Origin passes it — pinned there in
				 * suites/api/forwarded-host.spec.ts, though that file has not been run either; and the lane-c half already
				 * measured the other side of it, `POST /api/board/notify` refusing a headerless caller (lane-c run 9);
				 * `isTrustedBoardOrigin` compares `origin === trusted` with `origin`
				 * null, which cannot match, so the same caller is 403 here. These three routes are credentialed reads and
				 * writes on another site's word, which is why they refuse the caller `refuseForeignOrigin` lets through.
				 */
				const response = await api(route.path, { method: route.verb, headers: { 'sec-fetch-site': 'none' } });
				await expectForbiddenForBoard(`${route.verb} ${route.path} with no Origin header`, response);
				expect(
					await mock.calls(route.path),
					`${route.path} reached the test backend despite the refusal`
				).toEqual([]);
			});

			for (const origin of LOOKALIKE_ORIGINS) {
				test(`${origin} is not the Board, exactly`, async ({ api }) => {
					const response = await api(route.path, { method: route.verb, headers: { origin } });
					await expectForbiddenForBoard(
						`${route.verb} ${route.path} with the look-alike Origin: ${origin}`,
						response
					);
				});
			}
		});
	}

	test('a Board CORS preflight grants nothing to an origin it does not trust', async ({ api }) => {
		// `boardPreflight` (board-cors.ts:32-41) is the only place these routes would ever name a method.
		for (const route of BOARD_ROUTES) {
			for (const origin of [PROD_BOARD_ORIGIN, FOREIGN_ORIGIN]) {
				const response = await api(route.path, {
					method: 'OPTIONS',
					headers: { origin, 'access-control-request-method': route.verb }
				});
				await expectForbiddenForBoard(`OPTIONS ${route.path} from ${origin}`, response);
				const headers = await response.headers();
				expect(
					headers['access-control-allow-methods'],
					`OPTIONS ${route.path} from ${origin} announced ${headers['access-control-allow-methods']}`
				).toBeUndefined();
			}
		}
	});
});

test.describe('api · the Board routes with a Board origin configured', () => {
	/**
	 * These cases need an app started with the Board domain mounted, which no run in this repository has done yet
	 * (`test-servers.ts:145` blanks it). They skip rather than pass vacuously, and say what to run:
	 *
	 *   E2E_LANE=lane-d E2E_BOARD_APP_DOMAIN=http://localhost:3034 node apps/web/playwright/scripts/lane-servers.mjs up lane-d
	 *   E2E_LANE=lane-d npx playwright test --config apps/web/playwright/playwright.api.config.ts suites/api/board-origin.spec.ts
	 *
	 * `http://localhost:<lane port>` is the one Board domain a dev run can trust: `isSecureBoardUrl` allows `http:` only
	 * with `allowLocalhostHttp`, and that is `process.env.NODE_ENV === 'development'` (`board-app.ts:39`).
	 */
	test.beforeEach(async ({ api }) => {
		await appRuntimeEnv(api);
		test.skip(
			!boardDomainConfigured(),
			"this app was started with NEXT_PUBLIC_BOARD_APP_DOMAIN blank, so the Board guard refuses every caller and the gates behind it cannot be reached — see the command in this file's header comment"
		);
	});

	test('GET /api/board/session from the trusted origin is not refused, and the answer is readable only by that origin', async ({
		api
	}) => {
		const trusted = runtimeEnv?.NEXT_PUBLIC_BOARD_APP_DOMAIN as string;
		const response = await api('/api/board/session', { headers: { origin: trusted } });
		// The session check ran, whatever it decided: 200 with {id,name,imageUrl} (board-app.ts:167-174), the guard's own
		// 401 for a refused session, or its 503 when the API could not answer (`guard.deny()`, route.ts:26). What must not
		// appear is 403, which here can only mean the Origin guard refused a caller it trusts — and a 403 would carry none
		// of the headers below, so a missing echo is read as a refusal.
		expect(
			response.status(),
			`/api/board/session answered ${response.status()} ${await response.text()} for its trusted Origin`
		).not.toBe(403);
		await expectBoardCors(`/api/board/session from its trusted Origin ${trusted}`, response, trusted);
	});

	test('POST /api/board/notify from the trusted origin reaches the API — as far as a mock lane can follow it', async ({
		api,
		mock
	}) => {
		const trusted = runtimeEnv?.NEXT_PUBLIC_BOARD_APP_DOMAIN as string;
		const response = await api('/api/board/notify', {
			method: 'POST',
			headers: { origin: trusted, 'content-type': 'application/json' },
			body: {
				kind: 'share',
				receiverEmployeeIds: ['2f7b6a3c-1c0d-4f0a-9a6c-1c2c6b7c9a11'],
				roomId: 'playwright-board-room'
			}
		});
		await expectBoardCors('POST /api/board/notify from its trusted Origin', response, trusted);

		/**
		 * The whole chain ran: the Origin gate, the JSON gate, the schema, the session guard, then the upstream post. Two
		 * witnesses, both independent of what the answer claims — the mock's request log names the path this app posts to
		 * (`BOARD_NOTIFY_PATHS.share`, board-notify.ts:15-18), and the mock's `receivedTokens` names the same path, which
		 * only happens when a `Bearer` arrived with it (`mock-gauzy-server.mjs:1079-1085`).
		 *
		 * What the answer's `{notified}` is **not**: the mock has no Board handler, and its tail answers any unnamed
		 * non-`GET` by echoing the body it was sent (`mock-gauzy-server.mjs:792-794`; `DELETE` → `{affected:1, raw:[]}`,
		 * an unnamed `GET` → `pagination([])`), so `data?.notified` is undefined and `route.ts:77` reports `0`. A red that
		 * reads `notified: 0` is the mock being silent, not Gauzy refusing.
		 *
		 * Which fixes what this case may claim: **path + credential + status**, and nothing about anyone having been
		 * notified. `notified` is not asserted at all — it would be the mock's echo dressed up as Gauzy's answer.
		 */
		const asked = await mock.calls('/api/employee-notification/board-share');
		expect(
			asked.map((r) => `${r.method} ${r.path} ${r.status}`),
			`a trusted Board notify never reached the test backend at /api/employee-notification/board-share (whole log: ${(await mock.requests()).map((r) => `${r.method} ${r.path} ${r.status}`).join(', ') || 'empty'})`
		).toHaveLength(1);
		const tokens = ((await mock.state()).receivedTokens ?? []) as Array<{ path: string }>;
		expect(
			tokens.map((t) => t.path),
			'the notify reached the test backend without a Bearer token, which would mean this route forwarded it without the session it is supposed to use'
		).toContain('/api/employee-notification/board-share');
		// The claim, written into the assertion: this route accepted the Board Origin, read a session, posted that session's
		// bearer to Gauzy's Board path (the two mock witnesses above) and answered 201. The `{notified}` count in the body is
		// not asserted at all — the mock has no Board handler, so that number is its echo, not Gauzy's answer.
		expect(
			response.status(),
			`/api/board/notify from its trusted Origin ${trusted} did not reach the API as a created notification: ${response.status()} ${await response.text()} — this case proves the path, the credential and the status, never the {notified} count`
		).toBe(201);
	});

	/**
	 * The order the route answers in, measured in `E:\Coding\.tmp\api-board-origin-lane-d-mounted-1.log` (and the bodies in
	 * `E:\Coding\.tmp\lane-d-board-probe-2.log`, a header-by-header read of the same lane):
	 * `403` (Origin) → `415` (content type) → **`401` (no session cookie at all)** → `413` (body over the cap) →
	 * `400` (schema) → the session guard → `201`.
	 *
	 * The middle one is the thing this case used to get wrong in its comment, which said the body gates "run before any
	 * session check (route.ts:52-61)". Half true, and the half that matters is the other way round: the empty-cookie check
	 * at `route.ts:52-54` sits *ahead of* the 413 and the 400, so those two gates are only reachable by a caller that
	 * already holds an `auth-token` cookie — which is what `api()` sends by default (`api-fixtures.ts:95`, the fixture
	 * session header unless `anonymous: true`). Proved below by driving the same two bodies with `anonymous: true`: both
	 * answer `401 {"message":"Unauthorized"}`, not 413 and not 400. Anyone who turns these four calls anonymous to
	 * "simplify" them will read a working size cap as a broken one.
	 */
	test('the gates behind the Origin: 415 for the wrong body type, 413 for a body too large, 400 for a body that is not a Board request — and 401 ahead of the last two when no session cookie is present', async ({
		api,
		mock
	}) => {
		const trusted = runtimeEnv?.NEXT_PUBLIC_BOARD_APP_DOMAIN as string;
		const triple = (path: string) => `Origin: ${trusted} on POST /api/board/notify, ${path}`;
		const json = { origin: trusted, 'content-type': 'application/json' };

		const wrongType = await api('/api/board/notify', {
			method: 'POST',
			headers: { origin: trusted, 'content-type': 'text/plain' },
			body: 'kind=share'
		});
		expect(wrongType.status(), `${triple('text/plain body')}: ${await wrongType.text()}`).toBe(415);
		expect(await wrongType.text()).toContain('application/json');
		// Behind the Origin gate, every answer is a readable one: `forBoard()` wraps every status after the 403 — measured
		// on 415, 413, both 400s and the empty-cookie 401 in `E:\Coding\.tmp\lane-d-board-probe-2.log` (cases C–I). Only the
		// 403 itself carries no CORS header, which is what `expectForbiddenForBoard` pins from the other half.
		await expectBoardCors(triple('415'), wrongType, trusted);

		const tooBig = await api('/api/board/notify', {
			method: 'POST',
			headers: json,
			body: {
				kind: 'share',
				receiverEmployeeIds: ['2f7b6a3c-1c0d-4f0a-9a6c-1c2c6b7c9a11'],
				roomId: 'p'.repeat(20_000)
			}
		});
		expect(
			tooBig.status(),
			`${triple('a body over MAX_BODY_BYTES = 16 384')}: ${(await tooBig.text()).slice(0, 120)}`
		).toBe(413);
		expect(await tooBig.text(), `${triple('413 body')}`).toContain('too large');
		await expectBoardCors(triple('413'), tooBig, trusted);

		// Both roomId and snapshotId is the schema's own contradiction (board-notify.ts:49-51), and a receiver id that is
		// not a uuid (z.uuid(), :43). Both are decided before authenticatedGuard — but *after* the empty-cookie 401, hence
		// the `api()` default session these calls ride on.
		const twoRooms = await api('/api/board/notify', {
			method: 'POST',
			headers: json,
			body: {
				kind: 'share',
				receiverEmployeeIds: ['2f7b6a3c-1c0d-4f0a-9a6c-1c2c6b7c9a11'],
				roomId: 'a-room',
				snapshotId: 'a-snapshot'
			}
		});
		expect(twoRooms.status(), `${triple('roomId and snapshotId together')}: ${await twoRooms.text()}`).toBe(400);
		// `readBoardNotifyRequest` returns `{ ok:false, messages: string[] }` (board-notify.ts:72-79) and the route passes
		// it straight through (`route.ts:63`), so the refusal is an ARRAY of why, each entry `path: message`.
		expect(
			await twoRooms.text(),
			`${triple('400 body')}: the schema says why, and it says it as an array of path-prefixed messages`
		).toContain('Name the Board by one of roomId and snapshotId.');
		await expectBoardCors(triple('400, roomId and snapshotId'), twoRooms, trusted);

		const notAnId = await api('/api/board/notify', {
			method: 'POST',
			headers: json,
			body: { kind: 'mention', receiverEmployeeIds: ['not-a-uuid'], snapshotId: 'a-snapshot' }
		});
		expect(notAnId.status(), `${triple('a receiver id that is not a uuid')}: ${await notAnId.text()}`).toBe(400);
		expect(await notAnId.text(), `${triple('400 body')}`).toContain('Invalid UUID');
		await expectBoardCors(triple('400, receiver id not a uuid'), notAnId, trusted);

		// The gate order itself, same two bodies, no cookies: the 401 wins over both.
		const tooBigSignedOut = await api('/api/board/notify', {
			anonymous: true,
			method: 'POST',
			headers: json,
			body: {
				kind: 'share',
				receiverEmployeeIds: ['2f7b6a3c-1c0d-4f0a-9a6c-1c2c6b7c9a11'],
				roomId: 'p'.repeat(20_000)
			}
		});
		expect(
			tooBigSignedOut.status(),
			`${triple('a body over the cap and no session cookie — route.ts:52-54 answers before readCappedText at :57')}: ${await tooBigSignedOut.text()}`
		).toBe(401);
		// Still a Board answer: `forBoard()` wraps the 401 too (route.ts:53), so a caller that holds no session is refused
		// by its own origin's CORS rules rather than by an unreadable body.
		await expectBoardCors(triple('413 body, no session cookie → 401'), tooBigSignedOut, trusted);

		const notAnIdSignedOut = await api('/api/board/notify', {
			anonymous: true,
			method: 'POST',
			headers: json,
			body: { kind: 'mention', receiverEmployeeIds: ['not-a-uuid'], snapshotId: 'a-snapshot' }
		});
		expect(
			notAnIdSignedOut.status(),
			`${triple('a body the schema refuses and no session cookie')}: ${await notAnIdSignedOut.text()}`
		).toBe(401);
		await expectBoardCors(triple('schema-refused body, no session cookie → 401'), notAnIdSignedOut, trusted);

		// None of the six asked the API anything: every one of them is answered before authenticatedGuard
		// (`route.ts:66`), and the four that reached the body gates never reached the guard.
		expect(
			(await mock.requests()).map((r) => `${r.method} ${r.path} ${r.status}`),
			`${triple('nothing')}: the mock recorded ${(await mock.requests().then((rs) => rs.map((r) => `${r.method} ${r.path} ${r.status}`).join(', '))) || 'nothing'}`
		).toEqual([]);
	});

	test('a configured Board still refuses a caller with no Origin, and every look-alike', async ({ api }) => {
		for (const route of BOARD_ROUTES) {
			const none = await api(route.path, { method: route.verb, headers: { 'sec-fetch-site': 'none' } });
			await expectForbiddenForBoard(
				`${route.verb} ${route.path} with no Origin, while ${runtimeEnv?.NEXT_PUBLIC_BOARD_APP_DOMAIN} is trusted`,
				none
			);
			for (const origin of [...LOOKALIKE_ORIGINS, PROD_BOARD_ORIGIN, APP_ORIGIN].filter(
				(o) => o !== runtimeEnv?.NEXT_PUBLIC_BOARD_APP_DOMAIN
			)) {
				const response = await api(route.path, { method: route.verb, headers: { origin } });
				await expectForbiddenForBoard(
					`${route.verb} ${route.path} with Origin: ${origin}, while only ${runtimeEnv?.NEXT_PUBLIC_BOARD_APP_DOMAIN} is trusted`,
					response
				);
			}
		}
	});
});
