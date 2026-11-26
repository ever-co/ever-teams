import { createHash } from 'node:crypto';

import { expect, test, type Page } from '../../fixtures';
import { APP_ORIGIN, mockReset, receivedTokens, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person experiences when the platform refuses a data read in the middle of using the app, pinned in
 * a real Chrome on lane-a (app `http://localhost:3031`, mock `http://127.0.0.1:3992`, `playwright/test-servers.ts:38`)
 * on 2026-11-23. Every number, URL, string and cookie name below was measured in this file's own runs
 * (`E:\Coding\.tmp\s2-lane-a-session-1.log` … `-6.log`, the last two the passing pair); each `MEASURE` line prints
 * what the page and the network actually did, so an assertion can be re-checked against the log.
 *
 * ## The code this file measures (each line read out of its file before it is named)
 *
 * - `core/services/client/api.service.ts:251-263`: the response interceptor hands a 401 the call did not ask for
 *   (`expectedUnauthorized`, `axios.ts:82-101`) to `handleUnauthorized`; every other refusal is rejected as itself.
 * - `core/services/client/api.service.ts:317-364`: `handleUnauthorized` renews the session once
 *   (`renewSession(refusedToken)`), and — `:337-349` — when the renewal answers `ended` it calls the centralized
 *   `handleUnauthorized()` (sign out) and the request fails with its 401. When the renewal answers `renewed` the
 *   request is sent again **only** with a token of the same session scope: `:354-361` sets `sentAgainAfterRenewal`
 *   and compares `tokensShareScope(refusedToken, getAccessTokenCookie())` (`core/lib/auth/jwt-utils.ts:80-92`), and
 *   a token that cannot be decoded never shares a scope (`jwt-utils.ts:42-61`, `:83-85`). A second 401 of the same
 *   request is its answer (`:324`), and a renewal is never started twice for one request.
 * - `core/lib/auth/session-renewal.ts:100-141`: the renewal posts the refresh token through
 *   `authService.refreshTokenRaw` (`core/services/client/api/auth/auth.service.ts:57-67`), whose own 401 is the call's
 *   answer (`RENEWAL_REQUEST = { noSessionRenewal: true, … }`, `auth.service.ts:45`) so it cannot start a renewal of
 *   itself; a refused refresh token answers `ended` unless the refusal names a rotation
 *   (`:136-137` with `takePairOfOtherRenewal` `:66-93` and `core/lib/auth/rotated-refresh-token.ts:9-18`), and one
 *   renewal is in flight at a time (`:182-202`), a token renewed moments ago is not renewed again
 *   (`RENEWED_TOKEN_GRACE_MS` `:33`, `:188-190`).
 * - `core/lib/auth/handle-unauthorized.ts:42-84`: the sign-out leaves the sign-in notice (`:48`), clears the session
 *   cookies (`:51`) and the feature memory, clears the React Query cache, drops `auth-state`/`user-data` from
 *   localStorage and then `window.location.assign(DEFAULT_APP_PATH)` (`:82`) — `/auth/passcode`, because the lane runs
 *   with demo mode off (`core/constants/config/constants.tsx:98-101`, `playwright/test-servers.ts:119-123`).
 * - The notice: `core/lib/auth/session-ended-notice.ts:14` keeps it in the tab's sessionStorage under
 *   `ever-teams.session-ended`; `core/components/pages/auth/sign-in/session-ended-notice.tsx:93-102` renders it as a
 *   warning `AuthNotice` with `auth.sessionEnded.TITLE` and `auth.sessionEnded.TEXT`, and `credentials-step.tsx:175`
 *   mounts it on the sign-in page. The English, from `locales/en.json:6640-6642`: "Your session has ended" /
 *   "Sign in again to continue.". `core/components/layouts/app/init-state.tsx:60-64` removes the note when a signed-in
 *   shell mounts again.
 * - The cookies: `core/lib/helpers/cookies/index.ts:271-284` `cookiesKeys()` is the list `removeAuthCookies()` clears
 *   (`:306-314`, the access token also cross-site); `auth-active-project` (`constants.tsx:147`) is **not** in that
 *   list. A cookie written empty reads as none: `nonEmptyStringOrNull` (`:317-325`) turns `''` into `null`.
 * - On this lane the browser talks to the mock directly: `constants.tsx:229-232` takes
 *   `GAUZY_API_BASE_SERVER_URL` from `NEXT_PUBLIC_GAUZY_API_SERVER_URL`, `test-servers.ts:109` sets that to the mock
 *   origin and `core/services/client/axios.ts:108-112` makes the base `<mock origin>/api`. So every refusal below is
 *   one the mock itself answered and recorded, and every call listed is one the browser sent.
 * - The mock's switch: `scenario.fails` (`cypress/support/mock-gauzy-server.mjs:1060-1079`) answers a path with the
 *   armed status and `{ statusCode, message: 'Synthetic Gauzy refusal (<status>)' }`, keyed `<tenant>:<path>`, then
 *   `<tenant>`, then `<path>`; it is armed for **every** call of that path until `mockReset()` or a `fails` payload
 *   that names no key (`playwright/helpers.ts:122-125` merges), which is why the armed cases reload rather than
 *   re-click, and why the "refused once" cases refuse one call with `page.route` instead: the mock cannot answer a
 *   path 401 once and 200 after. A call the spec restates is forwarded to the mock first (`route.fetch()`), so the
 *   mock's own 200 stays in its log.
 * - The read armed here is `GET /api/organization-team` (the shell's team list) and, in case 6, `GET /api/user/me`.
 *   Both are made on every load of `/` (case 1's `MEASURE control … readStatuses`, and the mock's own log for them),
 *   which is what makes a reload the trigger; neither is armed on a bare tenant, so nothing else is refused.
 *
 * ## What was measured, per case (the numbers the assertions below are pinned on)
 *
 * - Case 1, nothing armed: `/` loads signed in, `GET /api/organization-team` 200, **no**
 *   `POST /api/auth/refresh-token` and **no** `POST /api/auth/switch-organization` at all, the session cookies carry
 *   values, no notice in sessionStorage.
 * - Case 2, the read 401 once and the mock's own refresh answer: `GET /api/organization-team` 401 →
 *   `POST /api/auth/refresh-token` 200 → `POST /api/auth/switch-organization` 200 → `GET /api/organization-team` 200,
 *   and the person is still on `/` with the data. **A mock limit, not an app defect** (case 3 is the real shape): the
 *   refused request is
 *   *not* the one that gets re-sent with the renewed token, because this mock's refreshed token is the literal
 *   `synthetic-refreshed-token` (`mock-gauzy-server.mjs:549-550`), which `decodeJWT` cannot read, so
 *   `api.service.ts:358-361` refuses to send that request as that person; what carries the read through is
 *   `init-state.tsx:80-88` asking for a token of the team's organization (`switch-organization`, answered as a real
 *   JWT at `mock-gauzy-server.mjs:554-565`) and `init-state.tsx:226-248` re-owning the shell's queries once the
 *   cookies hold it. The mock's fixed answer is also not decodable, so `shouldRefreshToken`
 *   (`jwt-utils.ts:107-116`, used at `use-proactive-token-refresh.ts:82`) says "needs refresh" and one or two further
 *   renewals land in the window (measured: 1 in `s2-lane-a-session-2.log`, 2 in `-3.log`) — never a refusal, never a
 *   sign-out, and `session-renewal.ts:33` is what keeps it from looping.
 * - Case 3, the same 401 with the refresh answered as a decodable pair of the same scope (the shape Gauzy answers,
 *   `mock-gauzy-server.mjs:347-352`): `GET /api/organization-team` 401 → `POST /api/auth/refresh-token` 200 → the
 *   **same** read 200 carrying the renewed token (`receivedTokens` witness below), no `switch-organization` at all,
 *   still on `/`, no notice. That is `api.service.ts:354-363` doing its job, and it is the case that answers the
 *   question "does the app refresh and retry silently" — yes, when the renewed token is one it can read.
 * - Case 4, the read 401 **and** the refresh 401: `GET /api/organization-team` 401 → `POST /api/auth/refresh-token`
 *   401, one of each, and the person lands on `http://localhost:3031/auth/passcode` with the notice.
 * - Case 5, the read 403: no refresh, no sign-out, still on `/` signed in; the read is asked twice (the query
 *   layer's own retry) and **both** answers are 403, the shell's `ever-teams:shell-ready` mark is never written
 *   because the team read never succeeded (`init-state.tsx:262-269`), and the page still shows the workspace, the
 *   team and a failed-query toast naming `403 · Synthetic Gauzy refusal (403)`.
 * - Case 6, `GET /api/user/me` 401 with the refresh refused: the same ending as case 4.
 * - In cases 4 and 6 `removeAuthCookies()` is visible as measured: every name it clears is left in the jar **with an
 *   empty value** (`auth-token` with `''` among them) and `auth-active-project` keeps its value — an empty cookie is
 *   what every reader of the app treats as no session at all (`cookies/index.ts:317-325`). The follow-up visit to `/`
 *   in cases 4 and 6 is the witness that the person really is signed out: the app's own middleware answers it 307 and
 *   the browser lands back on `/auth/passcode` (in the `documents` each of those cases prints).
 *
 * The shield's `consoleErrors()` is deliberately not asserted empty here: a refusal logs itself through
 * `ApiService.logError` (`api.service.ts:421-430`), which is the app reporting the outage rather than a defect.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const USER_ME_PATH = '/api/user/me';
const READ_PATH = '/api/organization-team';
const REFRESH_PATH = '/api/auth/refresh-token';
const SWITCH_PATH = '/api/auth/switch-organization';

/** `session-ended-notice.ts:14`, the sessionStorage key the sign-in page reads. */
const NOTICE_KEY = 'ever-teams.session-ended';
/** `locales/en.json:6641` and `:6642`. */
const SESSION_ENDED_TITLE = 'Your session has ended';
const SESSION_ENDED_TEXT = 'Sign in again to continue.';
/** Where `handle-unauthorized.ts:82` sends the person: `DEFAULT_APP_PATH`, `/auth/passcode` with demo mode off. */
const SIGN_IN_URL = `${APP_ORIGIN}/auth/passcode`;

/** The names `cookiesKeys()` (`cookies/index.ts:271-284`) lists, i.e. what a forced sign-out clears. */
const CLEARED_COOKIE_NAMES = [
	'auth-refresh-token',
	'auth-token',
	'auth-active-team',
	'auth-tenant-id',
	'auth-organization-id',
	'auth-active-task',
	'auth-active-language',
	'no-team-popup-show',
	'auth-user-active-task',
	'auth-user-id'
];

/** No plan dialog stands between the person and the page, as in `suites/lane-a/timer-journey.spec.ts`. */
const SCENARIO = { hasPlan: false, requirePlanToTrack: false };

/**
 * The mock's own CORS answer, restated for every answer this spec writes itself: the page is on `localhost:3031` and
 * the API on `127.0.0.1:3992`, so an answer without these headers is discarded by the browser and the refusal would
 * become a connection error instead of the 401 under test.
 */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

type Call = { origin: 'mock' | 'app'; method: string; path: string; status: number };
type CookieState = { name: string; empty: boolean };

const gauzyRefusal = (status: number) => ({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });

/** Only the first 12 hex of a sha256, so a token can be told apart in a log without reproducing it. */
const tokenTag = (value: string | undefined) =>
	createHash('sha256')
		.update(value ?? '')
		.digest('hex')
		.slice(0, 12);

/** Gauzy's token shape as the mock builds it (`mock-gauzy-server.mjs:347-352`), unsigned. */
function syntheticJwt(userId: string, organizationId: string, rotation: string): string {
	const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: userId, organizationId, iat: now, exp: now + 86_400, jti: rotation };
	return `${part({ alg: 'none', typ: 'JWT' })}.${part(claims)}.fixture`;
}

/**
 * Every fetch/xhr call of the page, in browser order, from the moment this is attached, on the mock origin (the reads
 * and the session calls) and on the app origin (its own routes). `status` 0 is a call whose answer the browser never
 * saw — the page was left while it was in flight — and `OPTIONS` is dropped as a CORS preflight, not an ask.
 */
function recordCalls(page: Page) {
	const calls: Call[] = [];

	page.on('request', (request) => {
		const url = new URL(request.url());
		const origin = url.origin === MOCK_API_ORIGIN ? 'mock' : url.origin === APP_ORIGIN ? 'app' : undefined;
		if (!origin || request.method() === 'OPTIONS') return;
		const type = request.resourceType();
		if (type !== 'fetch' && type !== 'xhr') return;
		const call: Call = { origin, method: request.method(), path: url.pathname, status: 0 };
		calls.push(call);
		void request
			.response()
			.then((response) => {
				if (response) call.status = response.status();
			})
			.catch(() => undefined);
	});

	return {
		calls,
		mark: () => calls.length,
		since: (mark: number) => calls.slice(mark)
	};
}

/**
 * The mock answers what it is armed to answer for *every* call of the armed path, so "refused once" is written here:
 * the call is forwarded to the mock (its own 200 stays in its log) and the first answer is restated as the refusal
 * Gauzy would send. Later calls of the same path go to the mock untouched — the refusal is lifted by construction.
 */
async function refuseFirstCallOnly(page: Page, path: string, status: number): Promise<void> {
	let refused = false;
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === path,
		async (route) => {
			if (route.request().method() !== 'GET') return route.fallback();
			if (refused) return route.fallback();
			refused = true;
			await route.fetch();
			return route.fulfill({ status, headers: CORS_HEADERS, json: gauzyRefusal(status) });
		}
	);
}

/**
 * Answers the mock's own refresh with a pair the app can read: the refresh token is passed through and the mock is
 * asked (so its log still holds the renewal), only the answer is the JWT pair Gauzy would have answered.
 */
async function answerRefreshWithJwtPair(page: Page, userId: string, organizationId: string): Promise<string> {
	const renewed = syntheticJwt(userId, organizationId, 'pinned-by-this-spec');
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === REFRESH_PATH,
		async (route) => {
			if (route.request().method() !== 'POST') return route.fallback();
			await route.fetch();
			return route.fulfill({
				status: 200,
				headers: CORS_HEADERS,
				json: { token: renewed, refresh_token: 'synthetic-refresh-token' }
			});
		}
	);
	return renewed;
}

const printed = (calls: Call[]) =>
	JSON.stringify(calls.map((call) => [call.origin, call.method, call.path, call.status]));
const ofPath = (calls: Call[], path: string) => calls.filter((call) => call.path === path);
const statusOf = (calls: Call[], path: string) => ofPath(calls, path).map((call) => call.status);
const cookieState = async (page: Page): Promise<CookieState[]> =>
	(await page.context().cookies())
		.map((cookie) => ({ name: cookie.name, empty: (cookie.value ?? '') === '' }))
		.sort((first, second) => first.name.localeCompare(second.name));
const namedCookies = async (page: Page) => (await cookieState(page)).filter((cookie) => !cookie.empty);
const noticeStored = (page: Page) => page.evaluate((key) => window.sessionStorage.getItem(key) !== null, NOTICE_KEY);
const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a session-rejected] MEASURE ${label} ${JSON.stringify(value)}`);

/** The session names a signed-in person holds, told apart by whether their value survived. */
const clearedStillCarryingAValue = (state: CookieState[]) =>
	state.filter((cookie) => CLEARED_COOKIE_NAMES.includes(cookie.name) && !cookie.empty).map((cookie) => cookie.name);

async function reloadSignedIn(page: Page) {
	await page.reload({ waitUntil: 'domcontentloaded' });
}

/** Waits for the app's own redirect to the sign-in page; false when it never came, which is a finding to print. */
async function waitSignInPage(page: Page): Promise<boolean> {
	return page
		.waitForURL('**/auth/passcode', { timeout: 25_000 })
		.then(() => true)
		.catch(() => false);
}

test.describe('lane-a · the platform refusing a signed-in person mid-use', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ------------------------------------------------------------------ 1. the control

	test('1 · control: a signed-in load of / never asks for a renewal', async ({ page, fixture, mock }) => {
		const traffic = recordCalls(page);
		await signInAndVisit(page, fixture, '/', { scenario: SCENARIO });

		expect(page.url(), 'the signed-in home page is not /').toBe(`${APP_ORIGIN}/`);
		expect(
			statusOf(traffic.calls, READ_PATH),
			`the team read did not land 200 (${printed(traffic.calls)})`
		).toContain(200);
		expect(
			ofPath(traffic.calls, REFRESH_PATH),
			`an unrefused load asked for a renewal (${printed(traffic.calls)})`
		).toEqual([]);
		expect(
			ofPath(traffic.calls, SWITCH_PATH),
			`an unrefused load asked for a token of another organization (${printed(traffic.calls)})`
		).toEqual([]);
		expect(await mock.calls(REFRESH_PATH), 'the mock was asked to renew a session it never refused').toEqual([]);

		const carrying = await namedCookies(page);
		expect(
			carrying.map((cookie) => cookie.name),
			'the signed-in cookies do not carry their values'
		).toEqual(expect.arrayContaining(['auth-token', 'auth-refresh-token', 'auth-tenant-id', 'auth-user-id']));
		expect(await noticeStored(page), 'a fresh signed-in tab holds a session-ended notice').toBe(false);

		report('control', {
			url: page.url(),
			cookies: await cookieState(page),
			readStatuses: statusOf(traffic.calls, READ_PATH),
			refreshCalls: ofPath(traffic.calls, REFRESH_PATH).length
		});
	});

	// ------------------------------------------------------------------ 2. one 401, the mock's refresh answer

	test('2 · a read refused 401 while the refresh answers its pair: the person stays on / and the read lands', async ({
		page,
		fixture,
		mock
	}) => {
		await signInAndVisit(page, fixture, '/', { scenario: SCENARIO });
		const traffic = recordCalls(page);
		await refuseFirstCallOnly(page, READ_PATH, 401);

		const tokenBefore = tokenTag(
			(await page.context().cookies()).find((cookie) => cookie.name === 'auth-token')?.value
		);
		const mark = traffic.mark();
		await reloadSignedIn(page);
		await page.waitForTimeout(8000);

		const statuses = statusOf(traffic.since(mark), READ_PATH);
		expect(
			statuses.filter((status) => status === 401),
			`the read was refused more than once (${printed(traffic.since(mark))})`
		).toHaveLength(1);
		expect(
			statuses.filter((status) => status === 200).length,
			`the refused read never landed after the renewal (${printed(traffic.since(mark))})`
		).toBeGreaterThan(0);

		const refreshes = ofPath(traffic.since(mark), REFRESH_PATH);
		expect(
			refreshes.length,
			`the refused read did not ask for a renewal (${printed(traffic.since(mark))})`
		).toBeGreaterThan(0);
		expect(
			refreshes.filter((call) => call.status !== 200),
			`the renewal was not answered 200 (${printed(refreshes)})`
		).toEqual([]);

		expect(page.url(), 'the person was sent away from the page they were using').toBe(`${APP_ORIGIN}/`);
		expect(await noticeStored(page), 'the app left a session-ended note it had no right to leave').toBe(false);
		const carrying = (await namedCookies(page)).map((cookie) => cookie.name);
		expect(carrying, 'the session cookies no longer carry their values after a refused read').toEqual(
			expect.arrayContaining(['auth-token', 'auth-refresh-token', 'auth-tenant-id', 'auth-user-id'])
		);
		expect(
			tokenTag((await page.context().cookies()).find((cookie) => cookie.name === 'auth-token')?.value),
			'the access token cookie was not replaced by the renewal'
		).not.toBe(tokenBefore);

		const asked = await mock.requests();
		expect(
			asked.filter((request) => request.path === REFRESH_PATH && request.status !== 200),
			'the mock refused a renewal it was never armed to refuse'
		).toEqual([]);

		report('one 401 + mock refresh pair', {
			url: page.url(),
			readStatuses: statuses,
			refresh: printed(ofPath(traffic.since(mark), REFRESH_PATH)),
			switch: printed(ofPath(traffic.since(mark), SWITCH_PATH)),
			tokenTagBefore: tokenBefore,
			tokenTagAfter: tokenTag((await page.context().cookies()).find((c) => c.name === 'auth-token')?.value),
			tokensTheMockSawAtTheRead: (await receivedTokens(READ_PATH)).map((hash) => hash.slice(0, 12))
		});
	});

	// ------------------------------------------------------------------ 3. one 401, a token the app can read

	test('3 · the same 401 with the refresh answering a token of the same scope: the read is sent again with it', async ({
		page,
		fixture,
		mock
	}) => {
		await signInAndVisit(page, fixture, '/', { scenario: SCENARIO });
		const traffic = recordCalls(page);
		const renewed = await answerRefreshWithJwtPair(page, fixture.ids.user, fixture.ids.organizationA);
		await refuseFirstCallOnly(page, READ_PATH, 401);

		const mark = traffic.mark();
		await reloadSignedIn(page);
		await page.waitForTimeout(8000);

		const since = traffic.since(mark);
		const statuses = statusOf(since, READ_PATH);
		expect(
			statuses.filter((status) => status === 401),
			`the read was refused more than once (${printed(since)})`
		).toHaveLength(1);
		// Measured exactly one 200 here (the request `api.service.ts:363` sends again). A re-own re-read
		// (`init-state.tsx:226-248` with `token-refresh-query-ownership.ts:13-26`, which invalidates the shell's active
		// queries when the access token changes) can add a second one, so the count below is a floor and the exact
		// witness is the token the retried read carried, under this assertion.
		expect(
			statuses.filter((status) => status === 200).length,
			`the refused read was never answered after the renewal (${printed(since)})`
		).toBeGreaterThanOrEqual(1);
		expect(
			statuses.filter((status) => status !== 401 && status !== 200),
			`the read was answered something else than refused-then-accepted (${printed(since)})`
		).toEqual([]);
		expect(printed(ofPath(since, REFRESH_PATH)), 'the renewal was not exactly one accepted POST').toEqual(
			JSON.stringify([['mock', 'POST', REFRESH_PATH, 200]])
		);
		expect(
			ofPath(since, SWITCH_PATH),
			`the app asked for a token of another organization it never needed (${printed(since)})`
		).toEqual([]);

		// Which token the retried read carried: the mock's own sha256 of each bearer it received at that path
		// (`mock-gauzy-server.mjs:1119-1126`), against this file's own tag of the pair it handed the app.
		const tokensAtRead = await receivedTokens(READ_PATH);
		const renewedTag = tokenTag(renewed);
		expect(
			tokensAtRead.map((hash) => hash.slice(0, 12)),
			`no read reached the mock carrying the renewed token ${renewedTag} (${tokensAtRead
				.map((hash) => hash.slice(0, 12))
				.join(' ')})`
		).toContain(renewedTag);

		expect(page.url(), 'the person was sent away from the page they were using').toBe(`${APP_ORIGIN}/`);
		expect(await noticeStored(page), 'a silently renewed session left a session-ended note').toBe(false);
		expect(
			tokenTag((await page.context().cookies()).find((cookie) => cookie.name === 'auth-token')?.value),
			'the access token cookie does not hold the renewed pair'
		).toBe(renewedTag);
		expect(await mock.failures(), 'the mock refused a call it was never armed to refuse').toEqual([]);

		report('one 401 + JWT pair', {
			url: page.url(),
			readStatuses: statuses,
			refresh: printed(ofPath(since, REFRESH_PATH)),
			tokensTheMockSawAtTheRead: tokensAtRead.map((hash) => hash.slice(0, 12)),
			renewedTag
		});
	});

	// ------------------------------------------------------------------ 4. read refused and refresh refused

	test('4 · the read refused 401 and the refresh refused 401: signed out, on the sign-in page, with the notice', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await signInAndVisit(page, fixture, '/', { scenario: SCENARIO });
		const traffic = recordCalls(page);
		const cookiesBefore = await cookieState(page);
		await mock.scenario({ fails: { [READ_PATH]: 401, [REFRESH_PATH]: 401 } });

		const mark = traffic.mark();
		await reloadSignedIn(page);
		const signedOut = await waitSignInPage(page);
		await page.waitForTimeout(3000);

		const since = traffic.since(mark);
		expect(
			printed(ofPath(since, READ_PATH)),
			`the read is not the single 401 the mock was armed to answer (${printed(since)})`
		).toEqual(JSON.stringify([['mock', 'GET', READ_PATH, 401]]));
		expect(
			printed(ofPath(since, REFRESH_PATH)),
			`the renewal is not the single 401 the mock was armed to answer (${printed(since)})`
		).toEqual(JSON.stringify([['mock', 'POST', REFRESH_PATH, 401]]));

		expect(signedOut, `the person was never sent to the sign-in page (${page.url()})`).toBe(true);
		expect(page.url(), 'the person did not end on the sign-in page').toBe(SIGN_IN_URL);
		expect(
			await page.getByText(SESSION_ENDED_TITLE, { exact: true }).count(),
			`the sign-in page does not show "${SESSION_ENDED_TITLE}"`
		).toBe(1);
		expect(
			await page.getByText(SESSION_ENDED_TEXT, { exact: true }).count(),
			`the sign-in page does not show "${SESSION_ENDED_TEXT}"`
		).toBe(1);
		expect(await noticeStored(page), `no ${NOTICE_KEY} was left in the tab's sessionStorage`).toBe(true);
		expect(
			shield.logMatching(/Logout/).some((text) => text.includes('REFRESH_TOKEN_EXPIRED')),
			'the app did not log the reason it ended the session'
		).toBe(true);

		// The cookies a forced sign-out clears, as the browser's jar holds them afterwards.
		const after = await cookieState(page);
		const carrying = clearedStillCarryingAValue(after);
		expect(
			carrying,
			`a cookie the forced sign-out clears still carries its value: ${JSON.stringify(carrying)}`
		).toEqual([]);
		expect(
			after.find((cookie) => cookie.name === 'auth-active-project')?.empty,
			'auth-active-project, which cookiesKeys() does not list, lost its value too'
		).toBe(false);
		expect(
			cookiesBefore.filter((cookie) => !cookie.empty).map((cookie) => cookie.name),
			'the signed-in person held no session cookies to begin with'
		).toEqual(expect.arrayContaining(['auth-token', 'auth-refresh-token']));

		// The witness that the session really is gone: a fresh visit to the page they were thrown off.
		await page.goto(`${APP_ORIGIN}/`, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(3000);
		expect(
			page.url(),
			`a signed-out visit to / landed on the app instead of the sign-in page (${JSON.stringify(after)})`
		).toBe(SIGN_IN_URL);

		report('read 401 + refresh 401', {
			url: page.url(),
			cookiesAfterSignOut: after,
			notice: await noticeStored(page),
			read: printed(ofPath(since, READ_PATH)),
			refresh: printed(ofPath(since, REFRESH_PATH)),
			documents: shield.documents()
		});
	});

	// ------------------------------------------------------------------ 5. a 403 is not a session problem

	test('5 · a read refused 403 keeps the session: no renewal, no sign-out, the person stays on the page', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await signInAndVisit(page, fixture, '/', { scenario: SCENARIO });
		const traffic = recordCalls(page);
		await mock.scenario({ fails: { [READ_PATH]: 403 } });

		const mark = traffic.mark();
		await reloadSignedIn(page);
		await page.waitForTimeout(6000);

		const since = traffic.since(mark);
		expect(ofPath(since, REFRESH_PATH), `a 403 made the app renew the session (${printed(since)})`).toEqual([]);
		expect(
			statusOf(since, READ_PATH),
			`the read was not answered 403 every time it was asked (${printed(since)})`
		).toEqual([403, 403]);

		expect(page.url(), 'a 403 sent the person off the page they were using').toBe(`${APP_ORIGIN}/`);
		expect(await noticeStored(page), `a 403 left a ${NOTICE_KEY} note for the sign-in page`).toBe(false);
		const carrying = (await namedCookies(page)).map((cookie) => cookie.name);
		expect(carrying, 'the session cookies no longer carry their values after a 403').toEqual(
			expect.arrayContaining(['auth-token', 'auth-refresh-token', 'auth-tenant-id', 'auth-user-id'])
		);

		// What the page shows instead: the refusal, as the failed-query toast of a development build.
		await expect(
			page.getByText('403 · Synthetic Gauzy refusal (403)').first(),
			'the page never showed the refusal the read answered'
		).toBeVisible({ timeout: 15_000 });
		expect(
			await page.getByText(SESSION_ENDED_TITLE, { exact: true }).count(),
			'the sign-in notice appeared on a page the person is still on'
		).toBe(0);
		expect(
			shield.consoleErrors().some((text) => text.includes('HTTP 403 Forbidden - GET /organization-team')),
			'the app logged no error for the 403 it was answered'
		).toBe(true);
		expect(await mock.failures(), 'the mock recorded a refusal other than the armed 403').toEqual(
			expect.arrayContaining([expect.objectContaining({ path: READ_PATH, status: 403 })])
		);

		report('403', {
			url: page.url(),
			readStatuses: statusOf(since, READ_PATH),
			refreshCalls: ofPath(since, REFRESH_PATH).length,
			toast: await page
				.getByText('403 · Synthetic Gauzy refusal (403)')
				.first()
				.innerText()
				.catch(() => ''),
			shellReadyMark: await page
				.evaluate(() => performance.getEntriesByName('ever-teams:shell-ready').length)
				.catch(() => -1)
		});
	});

	// ------------------------------------------------------------------ 6. the user read itself refused

	test('6 · /api/user/me refused 401 on load with the refresh refused: the same ending as case 4', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await signInAndVisit(page, fixture, '/', { scenario: SCENARIO });
		const traffic = recordCalls(page);
		await mock.scenario({ fails: { [USER_ME_PATH]: 401, [REFRESH_PATH]: 401 } });

		const mark = traffic.mark();
		await reloadSignedIn(page);
		const signedOut = await waitSignInPage(page);
		await page.waitForTimeout(3000);

		const since = traffic.since(mark);
		expect(
			printed(ofPath(since, REFRESH_PATH)),
			`the renewal is not the single 401 the mock was armed to answer (${printed(since)})`
		).toEqual(JSON.stringify([['mock', 'POST', REFRESH_PATH, 401]]));
		expect(statusOf(since, USER_ME_PATH).includes(401), `the user read was not refused (${printed(since)})`).toBe(
			true
		);

		expect(signedOut, `the person was never sent to the sign-in page (${page.url()})`).toBe(true);
		expect(page.url(), 'the person did not end on the sign-in page').toBe(SIGN_IN_URL);
		expect(
			await page.getByText(SESSION_ENDED_TITLE, { exact: true }).count(),
			`the sign-in page does not show "${SESSION_ENDED_TITLE}" for a refused user read`
		).toBe(1);
		expect(
			await page.getByText(SESSION_ENDED_TEXT, { exact: true }).count(),
			`the sign-in page does not show "${SESSION_ENDED_TEXT}" for a refused user read`
		).toBe(1);
		expect(await noticeStored(page), `no ${NOTICE_KEY} was left for the sign-in page`).toBe(true);

		const carrying = clearedStillCarryingAValue(await cookieState(page));
		expect(
			carrying,
			`a cookie the forced sign-out clears still carries its value: ${JSON.stringify(carrying)}`
		).toEqual([]);

		await page.goto(`${APP_ORIGIN}/`, { waitUntil: 'domcontentloaded' });
		await page.waitForTimeout(3000);
		expect(page.url(), 'a signed-out visit to / landed on the app instead of the sign-in page').toBe(SIGN_IN_URL);

		report('user/me 401 + refresh 401', {
			url: page.url(),
			userMe: printed(ofPath(since, USER_ME_PATH)),
			refresh: printed(ofPath(since, REFRESH_PATH)),
			cookiesAfterSignOut: await cookieState(page),
			documents: shield.documents()
		});
	});
});
