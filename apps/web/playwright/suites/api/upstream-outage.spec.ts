import { expect, test, type StubRequest } from '../../api-fixtures';
import { mockReset } from '../../helpers';
import { logOf, parseAnswer, triple } from './log-helpers';

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
 *   no answer at all    — this app's outage answer, **with the mock holding no entry for the call it gave up
 *                         on**. That is what the cases below arm: `scenario.delays` holds an endpoint open past
 *                         the deadline the *app* set for it, so the API would have answered — a second later
 *                         than the app was willing to wait. Nothing refused anybody; the app decided.
 *
 * The third line's log half is the 2026-11-21 run correcting what this file assumed when it was written. An
 * abandoned call is **not** in the mock's log, not even late: the mock records a request only on the path that
 * answers it, and a call this app cut off never gets there (see `logFor` below for the lines that do it and the
 * 15 s polling window that measured it). What that leaves, and what these cases therefore prove:
 *   - the outage itself is proved by the answer alone — `503`, `502 {"statusCode":502}`,
 *     `504 {"statusCode":504,"message":"The Gauzy API did not answer in time"}` — each a shape no refusal
 *     writes;
 *   - an empty log rules the other two readings out: it says the API neither refused the caller nor answered
 *     with a status the app passed on;
 *   - and the log **cannot** by itself tell "refused here before asking" (`suites/api/foreign-origin.spec.ts`)
 *     from "asked, then abandoned". Both leave nothing behind. The status and body are what separate them, so
 *     a case that asserts only "no entry" is proving nothing about which side acted.
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

// `triple`, `logOf` and `parseAnswer` moved to `./log-helpers.ts` (PR #5675's SonarQube duplication finding).

/**
 * The mock's log for one path, read once the delay this case armed has run out.
 *
 * Not `mockRequestsWhen`: waiting for an entry that can never arrive is the mistake this file made first, and
 * the run named it — all three cases below passed their status and body assertions and then died here, on
 * `the test backend was never asked for what the test expected (after 30 reads):` with **nothing** after the
 * colon, i.e. an empty log on every read. That is what the mock does with a call the app abandoned:
 *   - `mock-gauzy-server.mjs:1011` awaits the armed delay, `:1012` then reads the body by iterating the request
 *     stream (`readJsonBody`, `for await (const chunk of request)` at `:919`) — and a request the client cut
 *     off is destroyed, so that iteration throws instead of finishing;
 *   - the throw is before `state.requests.push` (`:1041`), and the server's own catch swallows exactly this
 *     case: `if (request.aborted && error?.code === 'ECONNRESET') return;` (`:1064`);
 *   - `state.receivedTokens` is pushed after the request log (`:1052-1058`), so a cut-off call is missing from
 *     both lists.
 * The mechanism is read from those lines, which the run's empty log matches; the thrown error itself was not
 * observed. The pin below is the measured fact, and `settleMs` outlasts this case's own armed delay so the read
 * is of a settled log: if the mock ever learns to record a call it was cut off from, this read sees it and the
 * case goes red saying so — which would also change what "no entry" proves in `suites/api/foreign-origin.spec.ts`,
 * so read the two files together before re-pinning it.
 */
async function logFor(
	mock: { requests: () => Promise<StubRequest[]> },
	path: string,
	settleMs: number
): Promise<string[]> {
	await new Promise((done) => setTimeout(done, settleMs));
	return (await mock.requests()).filter((entry) => entry.path === path).map(triple);
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

		// The other half: the API never refused anybody and never answered, so it holds nothing. Pinned as the
		// run measured it — the session check reached the mock (the guard's 15 s deadline is what stopped it, not
		// a connection failure) and the mock's log stayed empty through 15 s of re-reads, 14 s after its own 16 s
		// hold elapsed. See `logFor`.
		const checks = await logFor(mock, '/api/user/me', 2_000);
		expect(
			checks,
			`the abandoned session check was expected to leave no entry in the mock's log (whole log: ${logOf(
				await mock.requests()
			)}). An entry here means the mock now records a call it was cut off from, which would make "no entry" mean something different in every case that reads it this way — re-read this file's header and suites/api/foreign-origin.spec.ts before re-pinning`
		).toEqual([]);

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

		// Same reading as the case above, measured the same way: the pass-through gave up at its own 15 s and the
		// mock recorded nothing for a call it was cut off from before its 16 s hold ended.
		const asked = await logFor(mock, '/api/ever-connect/health', 2_000);
		expect(
			asked,
			`the abandoned pass-through was expected to leave no entry in the mock's log (whole log: ${logOf(
				await mock.requests()
			)}). An entry here means the mock recorded a call it was cut off from — read this file's header before re-pinning, because "no entry" is also what suites/api/foreign-origin.spec.ts reads as "refused here"`
		).toEqual([]);

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

		// The same reading as the two cases above, and the weakest evidence of the three: this case's original
		// 15 s poll ran 60→75 s, closing at the moment its own 75 s mock hold expired, so it can only agree that
		// nothing was recorded, while the 16 s cases above prove it with 14 s to spare. If this one goes red
		// first, that is the 75 s boundary rather than a new app finding: re-run it alone with no lane running
		// (`playwright/README.md`, "A starved machine turns strict assertions red") and pin whatever entry it
		// shows, with its status, instead of this empty list. The 504 answer above stands either way.
		const asked = await logFor(mock, '/api/auth/switch-organization', 18_000);
		expect(
			asked,
			`the abandoned proxy call was expected to leave no entry in the mock's log (whole log: ${logOf(
				await mock.requests()
			)})`
		).toEqual([]);

		await mockReset();
	});
});
