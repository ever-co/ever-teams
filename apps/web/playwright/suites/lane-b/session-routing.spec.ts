import { expect, test } from '../../fixtures';

import {
	describeCookies,
	expiredAccessToken,
	fieldError,
	jarCookieNames,
	MOCK_EMAIL,
	mockCalls,
	sessionCookies,
	signInWithExpiredAccessToken,
	UNDECODABLE_RESET_TOKEN
} from './lane-auth-helpers';
import { APP_ORIGIN } from '../../helpers';

/**
 * What a session does to routing, from the browser's side.
 *
 * `proxy.ts` is the whole gate. `PROTECTED_APP_URL_PATHS` (`core/constants/config/constants.tsx`) names the families
 * a visit needs a session for; with no `auth-token` and no `auth-refresh-token` the door answers
 * `NextResponse.redirect(origin + '/unauthorized')` and clears every cookie of `cookiesKeys()` on the way
 * (`deny_redirect`). `suites/api/page-gate.spec.ts` already pins that as a status code for `/settings/...`,
 * `/profile`, `/work-diary`, `/my-week`, `/views`, `/meet`, `/board` and `/task/<id>`, server-side. What this file
 * adds is the browser half — the page the person actually lands on — for the families nobody pins
 * (`/goals`, `/inbox`, `/favorites`, `/chat`, `/docs`, `/about`, `/workspace`), and the two answers the door gives
 * that are not the same answer:
 *
 *   no cookies at all on a protected path   → `/unauthorized`   ("Sign in to see this page")
 *   an expired token + a refresh cookie     → `/auth/passcode`  (the door tried to refresh, could not, and cleared)
 *
 * The second one is measurable only against a mock that cannot refresh (`/auth/refresh-token` is answered by
 * echoing the request body, so it carries no `token`), which is exactly the situation this lane is in.
 */

/** The protected families no other suite walks from the browser. */
const GATED_PATHS = ['/goals', '/inbox', '/favorites', '/chat', '/docs', '/about', '/workspace'];

for (const path of GATED_PATHS) {
	test(`a signed-out visitor is sent away from ${path} and lands on the page that offers sign-in`, async ({
		anon
	}) => {
		const view = await anon(path);

		await expect(
			view,
			`${path} let a visitor without any session cookie through instead of sending them to sign in`
		).toHaveURL(/\/unauthorized$/);
		await expect(
			view.getByText('Sign in to see this page'),
			`${path} sent the visitor somewhere that is not the "sign in" page`
		).toBeVisible();
		await expect(
			view.getByRole('link', { name: 'Sign in', exact: true }),
			'the page the visitor was sent to does not offer the sign-in page'
		).toHaveAttribute('href', /\/auth\/passcode/);
		expect(
			await sessionCookies(view.context()),
			`being sent to sign in left session cookies in the jar: ${await describeCookies(view.context())}`
		).toEqual([]);
	});
}

test('the refusal is a redirect the browser was told to follow, not a page that rendered and then moved', async ({
	anon,
	shield
}) => {
	const view = await anon('/goals');

	// `shield.documents()` is the server's own answer, oldest first: the requested path answered a redirect and the
	// browser followed it to /unauthorized. A page that rendered /goals and moved on the client would look different
	// here — it would show 200 for /goals.
	const documents = shield.documents();
	const asked = documents.find((document) => document.url.includes('/goals'));
	expect(
		documents.map((document) => `${document.status} ${document.url}`),
		'/goals was not refused with a redirect by this app'
	).not.toHaveLength(0);
	expect(
		asked?.status,
		`/goals was answered ${asked?.status}; the gate is expected to answer it 307 and let the browser follow`
	).toBe(307);
	await expect(
		view,
		'the browser did not end on the page the redirect named'
	).toHaveURL(/\/unauthorized$/);
});

test('a browser holding an expired session is sent to the sign-in page, and the door clears the cookies it could not refresh', async ({
	anon,
	fixture
}) => {
	// A public page first: `anon` clears the jar, so the expired session is put in place before the gated visit.
	const view = await anon('/auth/passcode');
	await signInWithExpiredAccessToken(view.context(), fixture);

	const held = await jarCookieNames(view.context());
	expect(
		held,
		'the expired session was not put in the jar before the gated visit'
	).toContain('auth-token');
	expect(
		(await view.context().cookies()).find((cookie) => cookie.name === 'auth-token')?.value,
		'the auth-token cookie in the jar is not the expired one this test wrote'
	).toBe(expiredAccessToken(fixture.ids.user, fixture.ids.organizationA));

	await view.goto(`${APP_ORIGIN}/settings/personal`, { waitUntil: 'domcontentloaded' });

	// The door decoded the token, found `exp` past, asked for a refresh, and — with a mock that answers a refresh by
	// echoing the body, so no new token comes back — cleared the session family and redirected to the sign-in page
	// (`deny_redirect(true)`), which is a different answer from the no-cookies-at-all `/unauthorized`.
	await expect(
		view,
		'an expired session was not sent to the sign-in page (the door answered it some other way)'
	).toHaveURL(/\/auth\/passcode$/);

	const refreshAsks = await mockCalls('/auth/refresh-token');
	expect(
		refreshAsks.map((request) => `${request.method} ${request.path} → ${request.status}`),
		'the door never tried to refresh the expired token on its way to the sign-in page'
	).not.toHaveLength(0);

	expect(
		await sessionCookies(view.context()),
		`the door left a session in the browser after it refused to refresh it: ${await describeCookies(
			view.context()
		)}`
	).toEqual([]);
});

test('the gate drops the locale the visitor was browsing in', async ({ anon }) => {
	// `next-intl` serves `/ar/...`, and the door's refusal names `/unauthorized` with no locale prefix — so an
	// Arabic-browsing visitor lands on an English page. Pinned as it is, because the copy proves it.
	const view = await anon('/ar/settings/personal');

	await expect(
		view,
		'an Arabic visit kept its locale prefix through the gate; the door names /unauthorized without one'
	).toHaveURL(/\/unauthorized$/);
	await expect(
		view.getByText('Sign in to see this page'),
		'the refused Arabic visit was served the Arabic page, not the locale-less English one'
	).toBeVisible();
});

test('a signed-in person is not kept on the sign-in page', async ({ app }) => {
	const view = await app('/auth/passcode');

	await expect(
		view,
		'a signed-in visit to /auth/passcode was left on the sign-in page instead of being sent to the app'
	).toHaveURL(/\/$/);
});

test('a signed-in person whose sign-in page carries a locale lands on the app without it', async ({ app }) => {
	// `proxy.ts` redirects a signed-in visit to an auth page to `new URL('/', request.url)`: the locale prefix is
	// dropped on the way, which is the door's answer, not next-intl's (`localePrefix: 'as-needed'`).
	const view = await app('/fr/auth/passcode');

	await expect(
		view,
		`/fr/auth/passcode kept its locale prefix for a signed-in visitor (the URL is ${view.url()})`
	).toHaveURL(/\/$/);
});

test('password recovery stays open for a person who is already signed in', async ({ app }) => {
	// `core/lib/auth/signed-in-auth-paths.ts`: every auth page sends a signed-in visitor to the app except the two
	// recovery pages, because a reset link can open while the person is still signed in somewhere else.
	const forgot = await app('/auth/forgot-password', { requireShell: false });
	await expect(
		forgot,
		'a signed-in visit to /auth/forgot-password was bounced to the app'
	).toHaveURL(/\/auth\/forgot-password/);
	await expect(
		forgot.locator('#forgot-email'),
		'the forgot-password form a signed-in person was sent to is not on the page'
	).toBeVisible();

	const reset = await app(`/auth/reset-password?token=${UNDECODABLE_RESET_TOKEN}`, { requireShell: false });
	await expect(
		reset,
		'a signed-in visit to a reset link was bounced to the app'
	).toHaveURL(/\/auth\/reset-password/);
	await expect(
		reset.locator('#reset-password'),
		'the reset form a signed-in person opened from a link is not on the page'
	).toBeVisible();
});

test('signing out empties the jar and the next visit is refused', async ({ app }) => {
	const view = await app('/', { stubSession: false });

	const sessionBefore = await sessionCookies(view.context());
	expect(
		sessionBefore.length,
		'the signed-in shell was opened without any session cookie in the jar'
	).toBeGreaterThan(0);

	// The account menu is at the foot of the sidebar at this viewport; the top-bar avatar of the same menu is
	// `md:hidden`, so only the visible one can be clicked (`:visible` keeps strict mode from matching both).
	const accountMenu = view.locator('[aria-label="Account menu"]:visible');
	expect(await accountMenu.count(), 'the signed-in shell does not offer exactly one account menu').toBe(1);
	await accountMenu.click();

	const logOut = view.locator('button:visible').filter({ hasText: /^Log out$/ });
	expect(await logOut.count(), 'the opened account menu does not offer exactly one Log out button').toBe(1);
	await logOut.click();

	// `useAuthenticateUser().logOut()` (stop the timer, forget this browser's push registration, remove the auth
	// cookies, clear the query cache, replace the page) and then NextAuth's `signOut({ redirectTo: DEFAULT_APP_PATH })`.
	await expect(
		view,
		'signing out did not land the browser on the sign-in page'
	).toHaveURL(/\/auth\/passcode$/, { timeout: 40_000 });

	expect(
		await sessionCookies(view.context()),
		`signing out left session cookies in the jar: ${await describeCookies(view.context())}`
	).toEqual([]);

	// The proof the session is really gone: the same visit that worked a moment ago is now refused.
	await view.goto(`${APP_ORIGIN}/`, { waitUntil: 'domcontentloaded' });
	await expect(
		view,
		'after signing out, the page that needs a session let the browser in'
	).toHaveURL(/\/auth\/passcode$/);
});

test('the sign-in page a signed-out visitor is sent to is the passwordless one this deployment opens', async ({
	anon
}) => {
	const view = await anon('/goals');
	await expect(view.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', /\/auth\/passcode/);

	await view.getByRole('link', { name: 'Sign in', exact: true }).click();

	await expect(
		view,
		'the sign-in link from a refused page does not open the passwordless sign-in page'
	).toHaveURL(/\/auth\/passcode$/);
	await expect(
		view.locator('#passcode-email'),
		'the sign-in page the visitor reached does not ask for an address'
	).toBeVisible();
	// And the way in works from there: the address field is the one the code flow uses.
	await view.locator('#passcode-email').fill(MOCK_EMAIL);
	await view.getByRole('button', { name: 'Send me a code' }).click();
	await expect(
		fieldError(view, 'passcode-code'),
		'the sign-in journey started from a refused page did not reach its code step'
	).toBeHidden();
	await expect(
		view.locator('#passcode-code-label'),
		'starting the code flow from a refused page did not open the code step'
	).toBeVisible({ timeout: 20_000 });
});
