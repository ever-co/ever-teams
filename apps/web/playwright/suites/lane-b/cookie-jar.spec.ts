import { expect, test } from '../../fixtures';
import { APP_ORIGIN, authCookieNames, mockRequests } from '../../helpers';

import {
	askForCode,
	assertCookiesStayOnThisOrigin,
	describeCookies,
	describeMockLog,
	jarCookieNames,
	MOCK_EMAIL,
	mockCalls,
	sessionCookies,
	signInWithExpiredAccessToken,
	SIGN_IN_CODE,
	fillCodeSlots
} from './lane-auth-helpers';

/**
 * The cookie names the door empties when it refuses: `cookiesKeys()` in `core/lib/helpers/cookies/index.ts:271-282`.
 * Spelled here rather than imported, because a suite must not reach into the app's module graph for a constant it is
 * only *checking*. Note what it does not name: `auth-active-project`, which the harness's jar does write.
 */
const DOOR_CLEARED_NAMES = [
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

/**
 * What the browser's jar actually holds, read through the browser context.
 *
 * `document.cookie` cannot see an `httpOnly` cookie at all, so every cookie assertion in this lane goes through
 * `context.cookies()`, which reports name, value, domain, path, `httpOnly`, `secure` and `sameSite`.
 * `NEXT_PUBLIC_COOKIE_DOMAINS` is blank in a test run (`test-servers.ts`) precisely because `apps/web/.env` scopes
 * cookies to `ever.team`, and a cookie scoped to `ever.team` is never sent back to `localhost` — so a cookie that
 * lands on another host is not a detail here, it is a flow that silently stops working.
 *
 * One limit stated plainly, because it decides what these numbers mean: the sessions these tests read are the ones
 * `helpers.ts` mints (`signInWithFixture`, the mirror of Cypress' `commands.ts`), because this mock cannot sign
 * anyone in — it answers every auth POST by echoing the request body and so never issues a token. The `httpOnly`,
 * `secure` and `sameSite` values asserted below are therefore the shape the harness writes, and they are asserted
 * because that shape is what the app's own cookie reading expects; the attributes a real sign-in would get come
 * from `setAuthCookies` (`core/lib/helpers/cookies/index.ts`), which no mock run can produce.
 *
 * One limit that decides the last two cases, measured 2026-11-22: the mock cannot refuse the *door*. `proxy.ts` asks
 * it to renew an expired access token and the mock answers `POST /api/auth/refresh-token` with a pair
 * (`apps/web/cypress/support/mock-gauzy-server.mjs:537`), so the door's expired-session refusal — `deny_redirect(true)`,
 * the cleared jar plus `/auth/passcode` — is out of reach, while its no-tokens refusal (`deny_redirect(false)` →
 * `/unauthorized`, same clearing) is not. The clearing is therefore pinned on the refusal this lane can cause, and the
 * renewal the mock forces is pinned as its own case.
 */
test.describe('lane-b · what the jar holds', () => {
	test('a signed-in browser holds the app’s own cookie family, on this origin, at the root path', async ({
		app,
		fixture
	}) => {
		const view = await app('/');
		const cookies = await view.context().cookies();

		const expected = authCookieNames(fixture, 'A').map(([name]) => name);
		const names = await jarCookieNames(view.context());
		const missing = expected.filter((name) => !names.includes(name));
		expect(
			missing,
			`the signed-in shell is missing these session cookies: ${missing.join(', ')} (jar: ${await describeCookies(
				view.context()
			)})`
		).toEqual([]);

		const host = new URL(APP_ORIGIN).hostname;
		const wrongPath = cookies
			.filter((cookie) => expected.includes(cookie.name) && cookie.path !== '/')
			.map((cookie) => `${cookie.name} on path ${cookie.path}`);
		expect(
			wrongPath,
			`the app's InitState reads root-path cookies; these are not root-path: ${wrongPath.join(', ')}`
		).toEqual([]);

		const wrongShape = cookies
			.filter(
				(cookie) =>
					expected.includes(cookie.name) && (cookie.httpOnly || cookie.secure || cookie.sameSite !== 'Lax')
			)
			.map((cookie) => `${cookie.name} httpOnly=${cookie.httpOnly} secure=${cookie.secure} sameSite=${cookie.sameSite}`);
		expect(
			wrongShape,
			`a session cookie is no longer readable the way the app reads it: ${wrongShape.join(', ')}`
		).toEqual([]);

		// `NEXT_PUBLIC_COOKIE_DOMAINS` is blank in a run: nothing may be scoped away from this host.
		await assertCookiesStayOnThisOrigin(view.context());
		expect(
			cookies.filter((cookie) => expected.includes(cookie.name)).map((cookie) => cookie.domain),
			`a session cookie is scoped to a host other than ${host}`
		).not.toContain('ever.team');
	});

	test('auth-token is the session’s own identity: its payload names this fixture person and their organization', async ({
		app,
		fixture
	}) => {
		const view = await app('/');
		const token = (await view.context().cookies()).find((cookie) => cookie.name === 'auth-token')?.value;

		expect(token, 'no auth-token cookie in the jar of a signed-in shell').toBeTruthy();
		// Three-part, unsigned: the harness mints it (`helpers.ts` syntheticAccessToken), the mock never issues one.
		const parts = (token as string).split('.');
		expect(parts.length, `auth-token is not a three-part token (${parts.length} parts)`).toBe(3);

		// Claims only are read out here, never the token itself: a failure message must not print a session.
		const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as Record<string, unknown>;
		expect(
			claims.sub,
			`the token names user ${JSON.stringify(claims.sub)}, not the fixture user ${fixture.ids.user}`
		).toBe(fixture.ids.user);
		expect(
			claims.organizationId,
			`the token names organization ${JSON.stringify(claims.organizationId)}, not the fixture's ${fixture.ids.organizationA}`
		).toBe(fixture.ids.organizationA);
		expect(
			typeof claims.exp === 'number' && claims.exp * 1000 > Date.now(),
			`the token this shell was given is already expired (exp ${JSON.stringify(claims.exp)})`
		).toBe(true);
	});

	test('a token that fits in one cookie writes no chunk marker', async ({ app }) => {
		const view = await app('/');
		const names = await jarCookieNames(view.context());

		// `auth-token_totalChunks` is the marker for a token split across cookies, and the door deletes it on the way
		// out (`proxy.ts`, `deny_redirect`). Its absence here is what makes the single `auth-token` the whole session.
		expect(
			names.filter((name) => name.includes('totalChunks')),
			`a chunk marker appeared in the jar of a shell whose token fits in one cookie: ${names.join(', ')}`
		).toEqual([]);
	});

	test('a magic-code attempt the API cannot finish leaves no cookie of a session behind', async ({ anon }) => {
		const view = await anon('/auth/passcode');

		await askForCode(view, MOCK_EMAIL);
		await fillCodeSlots(view, SIGN_IN_CODE);
		await view.getByRole('button', { name: 'Sign in', exact: true }).click();

		await expect(
			view.locator('#passcode-code-error'),
			`the code was not refused (${await sessionCookies(view.context())})`
		).toContainText('Invalid code', { timeout: 20_000 });

		const names = await jarCookieNames(view.context());
		expect(
			names.filter((name) => name.startsWith('auth-')),
			`a refused code left these cookies in the jar: ${await describeCookies(view.context())}`
		).toEqual([]);
	});

	test('a session the door cleared is still named in the jar, and holds nothing', async ({ anon, fixture }) => {
		// `deny_redirect` clears the session family by writing each name empty (`cookiesKeys().forEach(key =>
		// redirectResponse.cookies.set(key, ''))`, `proxy.ts:175-184`), so the names survive the clearing and the
		// values do not. A test that only looked at names would read a session here; a test that only looked at values
		// would miss the leftover. Both are asserted.
		//
		// Which refusal, measured 2026-11-22 (`lane-b-cookie-jar-1.log`): the one a mock run can cause. A protected
		// path whose jar has neither `auth-token` nor `auth-refresh-token` is `proxy.ts` CASE 1 →
		// `deny_redirect(false)` → `/unauthorized`, and that is where the clearing is written. The expired-token
		// variant this case used to drive is **not** a refusal on this mock — the next test pins what happens instead.
		const view = await anon('/auth/passcode');
		const host = new URL(APP_ORIGIN).hostname;
		await view.context().clearCookies();
		await view.context().addCookies(
			authCookieNames(fixture, 'A')
				// the two the door judges; without them the visit is the "no tokens at all" case
				.filter(([name]) => name !== 'auth-token' && name !== 'auth-refresh-token')
				.map(([name, value]) => ({
					name,
					value,
					domain: host,
					path: '/',
					httpOnly: false,
					secure: false,
					sameSite: 'Lax' as const
				}))
		);
		const jarBefore = await jarCookieNames(view.context());
		await view.goto(`${APP_ORIGIN}/settings/personal`, { waitUntil: 'domcontentloaded' });

		await expect(
			view,
			`the door let a protected visit through although the jar held no token and no refresh cookie (jar before: ${jarBefore.join(
				', '
			)}, now ${view.url()})`
		).toHaveURL(/\/unauthorized$/);

		const cookies = await view.context().cookies();
		const missing = DOOR_CLEARED_NAMES.filter((name) => !cookies.some((cookie) => cookie.name === name));
		expect(
			missing,
			`the door refused the visit without writing these names into the jar at all (jar: ${await describeCookies(
				view.context()
			)})`
		).toEqual([]);

		const stillValued = cookies
			.filter((cookie) => DOOR_CLEARED_NAMES.includes(cookie.name) && cookie.value.length > 0)
			.map((cookie) => `${cookie.name}=${cookie.value.slice(0, 12)}…`);
		expect(
			stillValued,
			`the door left a value behind in names it is supposed to empty: ${await describeCookies(view.context())}`
		).toEqual([]);

		// The leftover, and the app's own list is what explains it: `cookiesKeys()` names no `auth-active-project`, so
		// the door never empties it — the same leftover `session-routing.spec.ts` measures at sign-out. Pinned as it
		// is, not forgiven: one named cookie is all `sessionCookies()` needs to read a session in a refused jar.
		const projectCookie = cookies.find((cookie) => cookie.name === 'auth-active-project');
		expect(
			projectCookie?.value ?? '',
			`auth-active-project is in the harness's jar (authCookieNames, playwright/helpers.ts:148-163) but not in the door's clear list (cookiesKeys, core/lib/helpers/cookies/index.ts:271-282), and here it holds nothing: ${await describeCookies(
				view.context()
			)}`
		).not.toBe('');
		expect(
			(await sessionCookies(view.context())).map((line) => line.split('=')[0]),
			`the refused jar reads as a session on names other than the known leftover: ${await describeCookies(
				view.context()
			)}`
		).toEqual(['auth-active-project']);
	});

	test('an expired session is renewed by this mock rather than refused, and the jar is left alone', async ({
		anon,
		fixture
	}) => {
		// The half of the old case that *is* reachable. Written 2026-11-22 from `lane-b-cookie-jar-1.log`: the browser
		// ended on `http://localhost:3032/settings/personal`, not on `/auth/passcode`. `proxy.ts:558-575` treats an
		// access token expired *locally* as a refresh problem, not a refusal; `tryRefreshAndVerify()` posts
		// `POST <mock>/api/auth/refresh-token` and this mock answers it with a pair
		// (`apps/web/cypress/support/mock-gauzy-server.mjs:537`), so `success` is true and the page is served.
		// `deny_redirect(true)` — the cleared jar plus `/auth/passcode` — needs an API that refuses a refresh, and no
		// mock run has one. The pin below is the door's *renewal*, measured.
		const view = await anon('/auth/passcode');
		await signInWithExpiredAccessToken(view.context(), fixture);
		const tokenBefore = (await view.context().cookies()).find((cookie) => cookie.name === 'auth-token')?.value ?? '';

		await view.goto(`${APP_ORIGIN}/settings/personal`, { waitUntil: 'domcontentloaded' });

		const refreshAsks = await mockCalls('/api/auth/refresh-token');
		expect(
			refreshAsks.map((request) => `${request.method} ${request.path} → ${request.status}`),
			`the door never tried to renew the expired token. Mock log: ${describeMockLog(await mockRequests())}`
		).not.toHaveLength(0);

		await expect(
			view,
			`the expired session was not let through on the renewal answer (${view.url()})`
		).toHaveURL(/\/settings\/personal$/);

		// What the renewal actually did to the jar, measured 2026-11-22 (`lane-b-cookie-jar-2.log`): `auth-token` is no
		// longer the expired token this test wrote — it is the answer the mock handed the door, verbatim
		// (`{ token: 'synthetic-refreshed-token', refresh_token: 'synthetic-refresh-token' }`,
		// `apps/web/cypress/support/mock-gauzy-server.mjs:537`). So the door *does* write what it renewed with, and what
		// it wrote is the mock's own string: this is a mock-shaped pin, named as one. It is not what a real Gauzy answer
		// would put there, and nothing here claims that a real one would.
		const tokenAfter = (await view.context().cookies()).find((cookie) => cookie.name === 'auth-token')?.value ?? '';
		expect(
			tokenAfter,
			`the door did not replace the expired auth-token with the renewal answer (before ${JSON.stringify(
				tokenBefore.slice(0, 12)
			)}…, after ${JSON.stringify(tokenAfter)}); the value expected here is the mock's own token string`
		).toBe('synthetic-refreshed-token');
		expect(
			tokenAfter,
			`the door served the page on a renewal without changing the token it renewed: ${JSON.stringify(
				tokenAfter.slice(0, 12)
			)}…`
		).not.toBe(tokenBefore);

		expect(
			await sessionCookies(view.context()),
			`the jar was cleared anyway, which contradicts the page the door served: ${await describeCookies(
				view.context()
			)}`
		).not.toEqual([]);
	});
});
