import { expect, test } from '../../fixtures';
import { APP_ORIGIN, authCookieNames } from '../../helpers';

import {
	askForCode,
	assertCookiesStayOnThisOrigin,
	describeCookies,
	expiredAccessToken,
	jarCookieNames,
	MOCK_EMAIL,
	sessionCookies,
	signInWithExpiredAccessToken,
	SIGN_IN_CODE,
	fillCodeSlots
} from './lane-auth-helpers';

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
		// redirectResponse.cookies.set(key, ''))`), so the names survive the clearing and the values do not. A test
		// that only looked at names would read a session here; a test that only looked for names would miss the
		// leftover. Both are asserted.
		const view = await anon('/auth/passcode');
		await signInWithExpiredAccessToken(view.context(), fixture);
		await view.goto(`${APP_ORIGIN}/settings/personal`, { waitUntil: 'domcontentloaded' });

		await expect(
			view,
			'the expired session was not refused'
		).toHaveURL(/\/auth\/passcode$/);

		const cookies = await view.context().cookies();
		const tokenCookie = cookies.find((cookie) => cookie.name === 'auth-token');
		expect(
			tokenCookie,
			`the door did not leave the cleared name in the jar at all (jar: ${await describeCookies(view.context())})`
		).toBeTruthy();
		expect(
			tokenCookie?.value,
			`auth-token still carries a value after the door cleared it: ${JSON.stringify((tokenCookie?.value ?? '').slice(0, 12))}`
		).toBe('');
		expect(
			await sessionCookies(view.context()),
			`the cleared jar still reads as a session: ${await describeCookies(view.context())}`
		).toEqual([]);
		expect(
			(cookies.find((cookie) => cookie.name === 'auth-refresh-token')?.value ?? '').length,
			'the refresh cookie kept a value after the door cleared it, so a later visit could refresh a session nobody authorized'
		).toBe(0);
		// What the expired token was, for the record: a claims-only line, never the token.
		const claims = JSON.parse(
			Buffer.from((expiredAccessToken(fixture.ids.user, fixture.ids.organizationA).split('.')[1] ?? ''), 'base64url').toString()
		) as Record<string, unknown>;
		expect(
			typeof claims.exp === 'number' && claims.exp * 1000 < Date.now(),
			`the token this test wrote is not expired (exp ${JSON.stringify(claims.exp)}), so the refusal it proved is not the one pinned`
		).toBe(true);
	});
});
