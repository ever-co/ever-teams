import { expect, test } from '../../fixtures';
import { APP_ORIGIN, mockRequests } from '../../helpers';

import {
	describeCookies,
	describeMockLog,
	expiredAccessToken,
	fieldError,
	jarCookieNames,
	MOCK_EMAIL,
	mockCalls,
	sessionCookies,
	signInWithExpiredAccessToken,
	UNDECODABLE_RESET_TOKEN
} from './lane-auth-helpers';

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

/**
 * The door's second answer, as this deployment can actually be driven to it.
 *
 * The case used to assert the refusal `deny_redirect(true)` writes — `/auth/passcode` plus a cleared jar. Measured
 * 2026-11-22 (`lane-b-session-routing-1.log`: `Expected pattern: /\/auth\/passcode$/ / Received string:
 * "http://localhost:3032/settings/personal"`; the same reading in `lane-b-cookie-jar-1.log` and in a second agent's
 * `lane-b-session-routing-1.log` of 02:53), and it is not a contention artefact: `proxy.ts:558-575` treats a token
 * expired *locally* as a refresh problem, `tryRefreshAndVerify()` posts `POST <mock>/api/auth/refresh-token`, and this
 * mock answers that path with a pair (`apps/web/cypress/support/mock-gauzy-server.mjs:537`), so `success` is true and
 * the page is served — `deny_redirect(true)` is reached only by an API that **refuses** a refresh, which no mock run
 * has. The pins below are the half that is real: the ask, the page it bought, and the jar the renewal left behind.
 * They are written to fail the day the mock grows a refusing scenario, which is the day the refusal becomes testable.
 */
test('a browser holding an expired session is renewed by this mock, and the door serves the page on that answer', async ({
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
	const tokenBefore = (await view.context().cookies()).find((cookie) => cookie.name === 'auth-token')?.value ?? '';
	expect(
		tokenBefore,
		'the auth-token cookie in the jar is not the expired one this test wrote'
	).toBe(expiredAccessToken(fixture.ids.user, fixture.ids.organizationA));

	await view.goto(`${APP_ORIGIN}/settings/personal`, { waitUntil: 'domcontentloaded' });

	await expect(
		view,
		`the door did not serve the gated page on its renewal answer (the browser is on ${view.url()})`
	).toHaveURL(/\/settings\/personal$/);

	const refreshAsks = await mockCalls('/api/auth/refresh-token');
	expect(
		refreshAsks.map((request) => `${request.method} ${request.path} → ${request.status}`),
		`the door never asked the API to renew the expired token. Mock log: ${describeMockLog(await mockRequests())}`
	).not.toHaveLength(0);

	// …and the visit it served is not a refused one: the family was not emptied, `auth-token` among it.
	const session = await sessionCookies(view.context());
	expect(
		session.map((line) => line.split('=')[0]),
		`the door emptied the session family on a visit it served: ${await describeCookies(view.context())}`
	).toContain('auth-token');
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

test('a signed-in person whose sign-in page carries a locale is sent off it, and the app root answers in that locale', async ({
	app
}) => {
	// `proxy.ts:461-467` redirects a signed-in visit to an auth page to `new URL('/', request.url)`
	// (`DEFAULT_MAIN_PATH = '/'`, `constants.tsx:102`): the **auth page's** prefix is dropped, which is the door's
	// answer. What the person then reads is `/fr`, measured 2026-11-22 (`lane-b-session-routing-1.log`: `Received
	// string: "http://localhost:3032/fr"`) — the locale the same visit put in next-intl's own `NEXT_LOCALE` cookie
	// (`locale-rendering.spec.ts` pins that cookie) hands the prefix straight back on the app root. So the pin is two
	// facts, not one: off the prefixed auth page, onto the prefixed root, with the cookie as the reason.
	const view = await app('/fr/auth/passcode');

	await expect(
		view,
		`the door left a signed-in visitor on the auth page or on a different address (the URL is ${view.url()})`
	).toHaveURL(/\/fr$/);

	const localeCookie = (await view.context().cookies()).find((cookie) => cookie.name === 'NEXT_LOCALE');
	expect(
		localeCookie?.value,
		`the visit landed on /fr without next-intl's locale cookie carrying it (jar: ${await describeCookies(
			view.context()
		)})`
	).toBe('fr');
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

	// What signing out leaves, measured 2026-11-22 (`lane-b-session-routing-1.log`: `Received
	// ["auth-active-project=aaaaaaaa-aaaa-4aaa-8aaa-…"]`). The app's own clear list — `cookiesKeys()` in
	// `core/lib/helpers/cookies/index.ts:271-282` — names ten cookies (refresh-token, token, active-team, tenant-id,
	// organization-id, active-task, active-language, no-team-popup-show, user-active-task, user-id) and **not**
	// `auth-active-project`, which the harness's jar does write (`authCookieNames`, playwright/helpers.ts:148-163).
	// Sign-out empties the ten and leaves that one valued. Kept as a red-turned-pin rather than softened, because
	// `cookie-jar.spec.ts` measures the same leftover on the door's refusal: it is the clear list that is short, not
	// one flow.
	const jarAfterSignOut = await view.context().cookies();
	const stillValued = jarAfterSignOut
		.filter((cookie) => cookie.name.startsWith('auth-') && cookie.value.length > 0)
		.map((cookie) => cookie.name);
	expect(
		stillValued,
		`signing out left something other than the one cookie cookiesKeys() does not name: ${await describeCookies(
			view.context()
		)}`
	).toEqual(['auth-active-project']);

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
