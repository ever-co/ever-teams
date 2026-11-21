import { expect, test, type StubRequest } from '../../api-fixtures';
import { mockReset, mockRequestsWhen } from '../../helpers';

/**
 * The answers this app gives when the platform gives none — and what the mock's log says about each.
 *
 * `AUDIT.md` finding 10: "refused here" and "refused upstream" are proved well in one file (`suites/lane-c/
 * session-guard.spec.ts`, and `suites/api/tenant-boundary.spec.ts`) and nowhere else in the api suite. The
 * distinction is carried by two things together, never by the status alone:
 *
 *   refused here        — the answer is this app's own refusal (`403 {"statusCode":403,"message":"Cross-site
 *                         request refused"}`, `401 {"statusCode":401,"message":"Unauthorized"}` from a proxy
 *                         with no token) **and the mock recorded nothing for that route**;
 *   refused upstream    — the answer carries the status and body the mock answered with, **and the mock log
 *                         holds that call**;
 *   no answer at all    — this app's outage answer, **with the log holding the call it gave up on**. That is
 *                         what the cases below arm: `scenario.delays` holds an endpoint open past the deadline
 *                         the *app* set for it, so the API answers — a second later than the app was willing
 *                         to wait. Nothing refused anybody; the app decided.
 *
 * The three deadlines an api-suite run can reach, read from the source and armed here:
 *   `SESSION_CHECK_DEADLINE_MS` 15 s (`core/services/server/guards/session-check-memo.ts`) → 503;
 *   `PASS_THROUGH_TIMEOUT_MS` 15 s (`core/services/server/requests/ever-platform.ts`) → 502;
 *   `UPSTREAM_TIMEOUT_MS` 60 s (`core/services/server/forward-to-gauzy.ts`) → 504 for a timeout, 502 for an
 *   unreachable upstream.
 *
 * What this file deliberately does **not** claim, with the reason:
 *   - `forward-to-gauzy`'s **502 "The Gauzy API is unreachable"** is not reachable from a run today. Nothing
 *     on the control API (`playwright/backend.mjs`: /health, /fixture, /reset, /scenario, /state, /requests,
 *     /stats) closes a connection or refuses one, and the mock's catch-all answers every path, so the app's
 *     `fetch` is never left without a socket to talk on. Only a *timeout* arm exists.
 *   - its **499** (the browser cancelled; `req.signal.aborted`) is not assertable either: the request that
 *     cancels is the test's own, and Playwright's client gives up before the answer arrives.
 *   - `api-fixtures.ts` gives every call `timeout: 60_000`, which is exactly `forward-to-gauzy`'s own 60 s
 *     upstream deadline. The 504 case below therefore issues its own call with a wider client timeout
 *     (110 s) instead of the `api` fixture's; a case armed at 60 s through the fixture would be a race
 *     between two timers.
 *
 * The 504 case waits 75 s for an answer it expects the app to abandon at 60 s — a 15 s margin. If it ever
 * goes red, re-run it on its own with no other lane running before treating it as an app finding
 * (`playwright/README.md`, "A starved machine turns strict assertions red"): a 200 here would mean the
 * app's own 60 s timer moved, not that the proxy stopped timing out.
 *
 * Every case here arms a `delays` entry, so every case ends with `mockReset()`: the mock is still holding the
 * request open when the app has already answered, and that late answer must land in a log the next test
 * throws away, not in the next test's evidence (`suites/lane-c/session-check.spec.ts` does the same, and
 * `AUDIT.md` finding 14 is about why). Log assertions read a filtered view (method + path) and name the entry
 * they care about for the same reason.
 */

const triple = (request: StubRequest) => `${request.method} ${request.path} ${request.status}`;
const logOf = (requests: StubRequest[]) => requests.map(triple).join(', ');

function parseAnswer(text: string): unknown {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return { unparsed: text.slice(0, 200) };
	}
}

/**
 * The mock's log for one path, re-read until the delayed answer lands in it. The mock answers a delayed
 * request *after* this app has already given up on it, so the entry the case wants arrives a moment after
 * the answer under test.
 */
async function callsTo(mock: { requests: () => Promise<StubRequest[]> }, path: string): Promise<string[]> {
	const requests = await mockRequestsWhen((log) => log.some((entry) => entry.path === path), {
		tries: 30,
		intervalMs: 500
	});
	return requests.filter((entry) => entry.path === path).map(triple);
}

const base64url = (value: object) =>
	Buffer.from(JSON.stringify(value)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

/**
 * The fixture's unsigned access token with a `jti` of this test's own. `sessionChecks` (SessionCheckMemo)
 * reuses one check per token for 5 s and lives in the dev-server process, which `mockReset()` cannot clear:
 * with the shared fixture token a case could be answered by the previous case's check, and an armed delay
 * would never be asked at all. This is `suites/lane-c/session-check.spec.ts`'s `tokenOfNonce`, the file that
 * established the problem.
 */
function tokenOfNonce(ids: Record<string, string>, organizationId: string, nonce: string): string {
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: ids.user, organizationId, iat: now, exp: now + 86_400, jti: `api-outage-${nonce}` };
	return `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(claims)}.fixture`;
}

function withToken(cookieHeader: string, token: string): string {
	return cookieHeader.replace(/(^|; )auth-token=[^;]+/, (_match, lead: string) => `${lead}auth-token=${token}`);
}

let nonceCounter = 0;
const nextNonce = () => `nonce-${Date.now()}-${(nonceCounter += 1)}`;

test.describe('an upstream that never answers is answered as an outage', () => {
	test('a session check the API never answers is a 503, never a 401 the client would log out on', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		// SESSION_CHECK_DEADLINE_MS is 15 s; the mock holds GET /api/user/me open for 16 s, so the check is
		// abandoned and the guard answers with no upstream status to pass on. `core/services/server/guards/
		// authenticated-guard-app.ts` is explicit that an outage must not look like an expired session.
		await mock.scenario({ delays: { '/api/user/me': 16_000 } });

		// One token, so both routes share the one in-flight check (the memo's whole purpose) and both are
		// answered by its failure inside the same window. They answer it differently, which is the second half
		// of what this pins: the status is the only thing the client can act on.
		const token = tokenOfNonce(ids, ids.organizationA, nextNonce());
		const cookie = withToken(cookies('A'), token);
		const [comment, teams] = await Promise.all([
			api('/api/comment', { headers: { cookie } }),
			api('/api/organization-team', { headers: { cookie } })
		]);
		const commentText = await comment.text();
		const teamsText = await teams.text();

		expect(
			comment.status(),
			`GET /api/comment under an unanswered session check answered ${comment.status()} ${commentText.slice(0, 200)}`
		).toBe(503);
		expect(
			comment.status(),
			`an unanswered session check was reported to the client as a session to throw away: GET /api/comment ${comment.status()} ${commentText.slice(0, 200)}`
		).not.toBe(401);
		expect(
			parseAnswer(commentText),
			`GET /api/comment answered ${comment.status()} with ${commentText.slice(0, 200)} — the guard's outage answer is {"statusCode":503,…}`
		).toMatchObject({ statusCode: 503 });
		// Pinned as it is, not as one might wish: `$res('Unauthorized')` labels the outage "Unauthorized" while
		// the status says 503. A client that reads the message would read it as a sign-out.
		expect(
			parseAnswer(commentText),
			`GET /api/comment's outage answer is ${commentText.slice(0, 200)}`
		).toMatchObject({ message: 'Unauthorized' });

		// The sibling route, same outage, no body to say it with: `NextResponse.json({}, { status })`.
		expect(
			teams.status(),
			`GET /api/organization-team under the same unanswered session check answered ${teams.status()} ${teamsText.slice(0, 200)}`
		).toBe(503);
		expect(
			teamsText,
			`GET /api/organization-team's outage answer is not the empty object this route answers with: ${teamsText.slice(0, 200)}`
		).toBe('{}');

		// The other half: the API never refused anybody. It answered the session check 200, a second after
		// this app had stopped waiting for it.
		const checks = await callsTo(mock, '/api/user/me');
		expect(
			checks,
			`the session check was expected to reach the API and be answered there (whole log: ${logOf(
				await mock.requests()
			)}). If the log is empty, the app's abort reached the mock before it answered — pin the empty list with that reason and keep the 503 above`
		).toEqual(['GET /api/user/me 200']);

		await mockReset();
	});

	test('a paired API that never answers is a 502 whose whole body is the status', async ({ api, mock }) => {
		// `GET /api/ever-connect/health` forwards through `gauzyPassThrough`, which swallows its own failure and
		// reports `{ status: 502, data: null }`; `route-helpers.ts` then answers that with nothing but the
		// number. PASS_THROUGH_TIMEOUT_MS is 15 s, so a 16 s hold is enough to reach it.
		await mock.scenario({ delays: { '/api/ever-connect/health': 16_000 } });

		const response = await api('/api/ever-connect/health');
		const status = response.status();
		const text = await response.text();

		expect(
			status,
			`GET /api/ever-connect/health under an unanswered paired API answered ${status} ${text.slice(0, 200)}`
		).toBe(502);
		expect(
			parseAnswer(text),
			`GET /api/ever-connect/health answered 502 with ${text.slice(0, 200)} — the pass-through's outage answer is {"statusCode":502}, with no message`
		).toEqual({ statusCode: 502 });
		// Not a refusal of anything: neither this app's cross-site 403 nor the mock's own answer.
		expect(
			text,
			`GET /api/ever-connect/health answered with a refusal rather than an outage: ${text.slice(0, 200)}`
		).not.toMatch(/Cross-site request refused|Not Found/);
		expect(response.headers()['cache-control'] ?? '', 'the outage answer was left cacheable').toContain('no-store');

		const asked = await callsTo(mock, '/api/ever-connect/health');
		expect(
			asked,
			`the paired API was expected to answer GET /api/ever-connect/health 200 after this app gave up (whole log: ${logOf(
				await mock.requests()
			)}). If the log is empty, the app's abort reached the mock before it answered — pin the empty list with that reason and keep the 502 above`
		).toEqual(['GET /api/ever-connect/health 200']);

		await mockReset();
	});

	test('a proxy that gives up on an upstream that is still thinking answers 504 "did not answer in time"', async ({
		cookies,
		ids,
		mock,
		request
	}) => {
		// `POST /api/auth/switch-organization` is a bare `forwardToGauzy` call, so the only upstream request is
		// the one this case holds open for 75 s, against the proxy's own 60 s (UPSTREAM_TIMEOUT_MS).
		// `failedUpstreamAnswer` then picks 504 for a TimeoutError and 502 for anything else — this is the 504
		// half, and the only outage answer of that helper a run can reach (see the header for why the 502 half
		// and the 499 cannot be armed today).
		await mock.scenario({ delays: { '/api/auth/switch-organization': 75_000 } });

		// Not the `api` fixture: it gives every call 60_000 ms, the same 60 s the proxy is about to spend
		// waiting, so the client would quit first and the answer under test would never be seen. The session
		// cookies go on the call by hand for the same reason the fixture would have put them there.
		const response = await request.fetch('/api/auth/switch-organization', {
			method: 'POST',
			data: { organizationId: ids.organizationA },
			headers: { accept: 'application/json', cookie: cookies('A') },
			timeout: 110_000
		});
		const status = response.status();
		const text = await response.text();

		expect(
			status,
			`POST /api/auth/switch-organization with its upstream held open 75 s answered ${status} ${text.slice(0, 200)} — the proxy's own 60 s deadline should have produced 504 first`
		).toBe(504);
		expect(
			parseAnswer(text),
			`POST /api/auth/switch-organization answered 504 with ${text.slice(0, 200)} — expected forward-to-gauzy's {"statusCode":504,"message":"The Gauzy API did not answer in time"}`
		).toMatchObject({ statusCode: 504, message: 'The Gauzy API did not answer in time' });
		// The distinction this file exists for: an outage answer, not an upstream refusal, and not this app's
		// guard refusing the caller.
		expect(text, `the 504 answer is not the timeout half of the outage pair: ${text.slice(0, 200)}`).not.toMatch(
			/unreachable|Cross-site request refused|Unauthorized/
		);

		const asked = await callsTo(mock, '/api/auth/switch-organization');
		expect(
			asked,
			`the proxy was expected to have asked the API and abandoned it (whole log: ${logOf(
				await mock.requests()
			)}). If the log is empty, the app's abort reached the mock before it answered — pin the empty list with that reason and keep the 504 above`
		).toEqual(['POST /api/auth/switch-organization 200']);

		await mockReset();
	});
});
