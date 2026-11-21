import { createHash } from 'node:crypto';

import { expect, test } from '../../api-fixtures';
import { mockReset, receivedTokens } from '../../helpers';

/**
 * The routes whose sign-in decision is *not* made here.
 *
 * `core/services/server/guards/authenticated-guard-app.ts` is a different animal from the `forwardToGauzy` cookie check
 * that `session-guard.spec.ts` pins. That one refuses a caller with no token before anything is asked; this one takes
 * whatever the caller's cookies hold (`access_token?.toString() || ''`, so an absent token becomes an empty string),
 * calls `GET /user/me` on the Gauzy API with it — `serverFetch` omits the `authorization` header entirely when the
 * token is empty (`core/services/server/fetch.ts` line 91) — and then answers with what the API said. So for these
 * routes the mock's request log proves *where the decision lives*, which is a different claim than "the refusal
 * happened here":
 *
 *   `/api/user/me` in the log with no entry in `state.receivedTokens` → this app asked who the caller is, about a
 *   caller it held no credential for; the answer it gave is the API's answer, not a refusal of its own.
 *   `/api/user/me` with a `receivedTokens` entry whose sha256 is the cookie token's → the app forwarded exactly the
 *   session's token, and only that one.
 *
 * The mock answers `GET /api/user/me` with the fixture user whatever arrives (`mock-gauzy-server.mjs` line 532, no
 * session check of its own), so these cases can only ever show *that* the app delegated the decision, never who wins
 * it. That limit is written down in PLAN.md rather than papered over with a friendlier assertion.
 *
 * The memo: `sessionChecks` reuses one check for the same token for 5 s (`session-check-memo.ts`), and it is a
 * property of the dev-server process, not of the mock — `mockReset()` does not clear it. Every test below therefore
 * signs in with a token of its own (a distinct `jti` claim), so no case inherits another case's kept answer. That is
 * also what the memo test is able to prove: within one token, N routes, one check.
 */

const GUARD = 'core/services/server/guards/authenticated-guard-app.ts';

/** Routes whose only sign-in step is this guard (read from each route file). */
const CHECKED_ROUTES: Array<{ verb: 'GET'; path: string }> = [
	{ verb: 'GET', path: '/api/task-statuses' },
	{ verb: 'GET', path: '/api/task-sizes' },
	{ verb: 'GET', path: '/api/task-versions' },
	{ verb: 'GET', path: '/api/task-priorities' },
	{ verb: 'GET', path: '/api/task-related-issue-types' },
	{ verb: 'GET', path: '/api/issue-types' },
	{ verb: 'GET', path: '/api/organization-projects' },
	{ verb: 'GET', path: '/api/daily-plan' },
	{ verb: 'GET', path: '/api/employee/members' },
	{ verb: 'GET', path: '/api/saved-reports' }
];

const base64url = (value: object) =>
	Buffer.from(JSON.stringify(value))
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

/**
 * The same unsigned token `helpers.ts` puts in the cookies, with a `jti` of this test's own: the memo keys an answer
 * by the token, so a per-test nonce keeps a case from being answered by a previous case's check.
 */
function tokenOfNonce(ids: Record<string, string>, organizationId: string, nonce: string): string {
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: ids.user, organizationId, iat: now, exp: now + 86_400, jti: `lane-c-${nonce}` };
	return `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(claims)}.lane-c`;
}

/** The session cookies, with only the access token replaced. */
function withToken(cookieHeader: string, token: string): string {
	return cookieHeader.replace(/(^|; )auth-token=[^;]+/, (_match, lead: string) => `${lead}auth-token=${token}`);
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

async function sessionChecks(mock: { requests: () => Promise<Array<{ method: string; path: string; status: number }>> }) {
	return (await mock.requests())
		.filter((request) => request.path === '/api/user/me')
		.map((request) => `${request.method} ${request.path} ${request.status}`);
}

async function wholeLog(mock: { requests: () => Promise<Array<{ method: string; path: string; status: number }>> }) {
	return (await mock.requests()).map((request) => `${request.method} ${request.path} ${request.status}`);
}

let nonceCounter = 0;
const nextNonce = () => `nonce-${Date.now()}-${(nonceCounter += 1)}`;

test.describe('a route guarded by the session check asks the API who the caller is', () => {
	for (const route of CHECKED_ROUTES) {
		test(`${route.verb} ${route.path} with no session: the check runs, with no credential in it`, async ({ api, mock }) => {
			const why = `${route.verb} ${route.path} (${GUARD})`;
			const response = await api(route.path, { method: route.verb, anonymous: true });
			const text = await response.text();

			// The claim: this route did not refuse the caller from its own cookies. It went and asked.
			expect(
				await sessionChecks(mock),
				`${why}: a signed-out caller was answered ${response.status()} ${text} without this app asking the API who they are`
			).toEqual(['GET /api/user/me 200']);

			// And it asked about a caller it held no token for: the mock records the sha256 of every Bearer it
			// received, so an empty list is proof that no credential travelled with the question.
			expect(
				await receivedTokens('/api/user/me'),
				`${why}: the session check carried a token after all, for a caller with no session cookie: ${await wholeLog(mock)}`
			).toEqual([]);

			// Pinned, not approved: because the mock answers the check with the fixture user, the route went on and
			// answered the caller as the API answered it. The app makes no sign-in decision of its own here.
			expect(
				response.status(),
				`${why}: this route refused the signed-out caller by itself (${response.status()} ${text}) — the guard delegates that to the API, so a 401 here means the answer came from upstream`
			).not.toBe(401);
			expect(response.status(), `${why}: the route crashed the handler (${response.status()} ${text})`).toBeLessThan(500);
		});
	}

	test('the token that reaches the API is the one in the caller’s cookies', async ({ api, cookies, ids, mock }) => {
		const nonce = nextNonce();
		const token = tokenOfNonce(ids, ids.organizationA, nonce);
		const response = await api('/api/task-statuses', { headers: { cookie: withToken(cookies('A'), token) } });
		const text = await response.text();

		expect(response.status(), `the guarded read answered ${response.status()} ${text}`).toBe(200);
		expect(await sessionChecks(mock), `the session check was not made: ${await wholeLog(mock)}`).toEqual(['GET /api/user/me 200']);

		// The mock keeps no token, only its hash, so this compares the hash of the cookie's token with the hash of
		// what arrived: exactly one, and it is this session's.
		expect(
			await receivedTokens('/api/user/me'),
			`the token the API saw is not the session's cookie token: ${await wholeLog(mock)}`
		).toEqual([sha256(token)]);
	});

	test('the same token is checked once, not once per route', async ({ api, cookies, ids, mock }) => {
		// `sessionChecks` (SessionCheckMemo, 5 s by default) is why a page that fires four route handlers in one
		// second pays one upstream round trip and not four. Pinned because every test in this lane that counts
		// `/api/user/me` reads depends on it.
		const nonce = nextNonce();
		const token = tokenOfNonce(ids, ids.organizationA, nonce);
		const cookie = withToken(cookies('A'), token);

		const first = await api('/api/task-statuses', { headers: { cookie } });
		const second = await api('/api/issue-types', { headers: { cookie } });
		const third = await api('/api/daily-plan', { headers: { cookie } });

		expect(first.status(), `the first guarded read answered ${first.status()} ${await first.text()}`).toBeLessThan(500);
		expect(second.status(), `the second guarded read answered ${second.status()} ${await second.text()}`).toBeLessThan(500);
		expect(third.status(), `the third guarded read answered ${third.status()} ${await third.text()}`).toBeLessThan(500);

		expect(
			await sessionChecks(mock),
			`three routes of one token asked the API ${(await sessionChecks(mock)).length} times: ${await wholeLog(mock)}`
		).toEqual(['GET /api/user/me 200']);
	});

	test('a second tenant’s token is a second check, not a reuse of the first', async ({ api, cookies, ids, mock }) => {
		// The memo keys an answer by the token, so the same person's other workspace (its own token, from `scope:
		// 'B'`) is checked on its own — a kept answer for one organization is never handed to the other.
		const nonceA = nextNonce();
		const nonceB = nextNonce();
		const tokenA = tokenOfNonce(ids, ids.organizationA, nonceA);
		const tokenB = tokenOfNonce(ids, ids.organizationB, nonceB);

		await api('/api/task-statuses', { headers: { cookie: withToken(cookies('A'), tokenA) } });
		await api('/api/task-statuses', { headers: { cookie: withToken(cookies('B'), tokenB) } });

		const checks = await receivedTokens('/api/user/me');
		expect(
			checks.slice().sort(),
			`the two workspaces were not checked separately: ${await wholeLog(mock)}`
		).toEqual([sha256(tokenA), sha256(tokenB)].sort());
	});

	test('a route that signs a credential with a server secret checks again, whatever the memo holds', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		// `GET /api/livekit` passes `{ fresh: true }` (app/api/livekit/route.ts): a room token minted on the strength
		// of the session must not be minted from a check made before the session was revoked. Proved against the
		// same token the memo has already answered for.
		const nonce = nextNonce();
		const token = tokenOfNonce(ids, ids.organizationA, nonce);
		const cookie = withToken(cookies('A'), token);

		const checked = await api('/api/task-statuses', { headers: { cookie } });
		expect(checked.status(), `the ordinary guarded read answered ${checked.status()} ${await checked.text()}`).toBeLessThan(
			500
		);

		const roomless = await api('/api/livekit', { headers: { cookie } });
		const text = await roomless.text();
		// The check runs before the route looks at its query, so a request the route refuses for a missing room
		// still paid the fresh check.
		expect(roomless.status(), `the livekit route refused a missing room with ${roomless.status()} ${text}`).toBe(400);

		const checks = await receivedTokens('/api/user/me');
		expect(
			checks,
			`the fresh check reused the memo's answer: ${await wholeLog(mock)} (both hashes should be this token's)`
		).toEqual([sha256(token), sha256(token)]);
	});

	test('an API that cannot answer the check is not reported as an expired session', async ({ api, cookies, ids, mock }) => {
		// `SessionCheckMemo.withDeadline` gives a check 15 s (SESSION_CHECK_DEADLINE_MS) and the guard answers a
		// check that never produced an answer with 503, so the browser client does not treat an outage as a session
		// to throw away. A mock delay past the deadline stands for an API that never answers.
		const nonce = nextNonce();
		const token = tokenOfNonce(ids, ids.organizationA, nonce);

		await mock.scenario({ delays: { '/api/user/me': 15_500 } });
		const response = await api('/api/task-statuses', {
			headers: { cookie: withToken(cookies('A'), token) }
		});
		const text = await response.text();

		expect(response.status(), `an unanswered session check answered ${response.status()} ${text}`).toBe(503);
		expect(text, `the outage answer is not a refusal the client would log out on: ${text}`).not.toContain('401');

		// The mock is still holding this request open. Give it past its own delay and reset, so its late entry
		// lands in a log the next test throws away rather than in the next test's log. (`helpers.mockReset` is the
		// same call the `mock` fixture makes before every test.)
		await new Promise((done) => setTimeout(done, 2_000));
		await mockReset();
	});
});
