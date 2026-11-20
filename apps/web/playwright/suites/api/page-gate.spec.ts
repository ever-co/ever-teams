import { expect, test, type ApiCall } from '../../api-fixtures';
import { APP_ORIGIN } from '../../helpers';

/**
 * Which pages an anonymous visitor is allowed to reach, at the door rather than in the page.
 *
 * `apps/web/proxy.ts` answers a protected page before Next renders it: no access token and no refresh
 * token on a path of `PROTECTED_APP_URL_PATHS` (`core/constants/config/constants.tsx`) is a 307 — to
 * `DEFAULT_APP_PATH` for the site root, and to `/unauthorized` for every other protected path. Public
 * pages and the auth pages answer 200.
 *
 * The locale prefix is the part that used to leak: protected patterns were anchored at `^/settings`, so
 * `/fr/settings/personal` matched nothing, counted as public and was served 200 to an anonymous visitor
 * while `/settings/personal` redirected. `LOCALE_PREFIX` is what closed that, and the locale cases below
 * are what keeps it closed.
 *
 * Redirects are not followed here (`maxRedirects: 0`): the answer under test is the 307 and where it
 * points, not what the page it points at then renders.
 */

const NO_SESSION: Parameters<ApiCall>[1] = { anonymous: true, maxRedirects: 0 };

/** A 307 to this exact path, or the test says what the door actually answered. */
async function expectRedirectTo(api: ApiCall, path: string, target: string) {
	const response = await api(path, NO_SESSION);
	const body = await response.text();

	expect(
		response.status(),
		`${path}: the door answered ${response.status()} instead of redirecting (${body.slice(0, 120)})`
	).toBe(307);
	// The proxy may answer with a relative Location (`/unauthorized`) or an absolute one; either way it has
	// to land on this app's own origin, at exactly that path.
	const location = response.headers()['location'] ?? '';
	const landed = new URL(location, APP_ORIGIN);
	expect(`${landed.origin}${landed.pathname}`, `${path}: redirected to ${location}, not ${target}`).toBe(
		`${APP_ORIGIN}${target}`
	);
}

test.describe('the page gate for an anonymous visitor', () => {
	test('the site root goes to the sign-in page this deployment opens by default', async ({ api }) => {
		// `DEFAULT_APP_PATH` is `/auth/passcode` — the passwordless page — unless the deployment is a hosted
		// demo (NEXT_PUBLIC_DEMO=true), which then opens the password form instead. The test config leaves demo
		// mode blank, like apps/web/.env does.
		await expectRedirectTo(api, '/', '/auth/passcode');
	});

	test('a path no page owns answers 404, and answers it as an HTTP answer', async ({ api }) => {
		// Not a page the app renders a client-side "not found" for: nothing under `app/[locale]` matches this,
		// so Next's own not-found boundary answers, with a status the browser can see.
		const response = await api('/this-page-does-not-exist-anywhere', NO_SESSION);
		expect(response.status(), `an unmatched path answered ${response.status()} instead of 404`).toBe(404);
	});

	const PROTECTED = [
		'/settings/personal',
		'/settings/team/members',
		'/profile',
		'/work-diary',
		'/my-week',
		'/views',
		'/meet',
		'/board',
		'/task/eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
	];

	for (const path of PROTECTED) {
		test(`${path} is not served to an anonymous visitor`, async ({ api }) => {
			await expectRedirectTo(api, path, '/unauthorized');
		});
	}

	// The 2026-08-17 sweep finding: only the default locale looked protected.
	for (const locale of ['fr', 'de', 'ar', 'zh']) {
		test(`/${locale}/settings/personal is protected too`, async ({ api }) => {
			await expectRedirectTo(api, `/${locale}/settings/personal`, '/unauthorized');
		});
	}

	test('the auth pages answer 200 to an anonymous visitor', async ({ api }) => {
		for (const path of [
			'/auth/passcode',
			'/auth/password',
			'/auth/signup',
			'/auth/forgot-password',
			'/auth/accept-invite'
		]) {
			const response = await api(path, NO_SESSION);
			expect(response.status(), `${path}: ${await response.text()}`).toBe(200);
		}
	});

	test('the maintenance page is reachable without a session', async ({ api }) => {
		const response = await api('/maintenance', NO_SESSION);
		expect(response.status(), 'the maintenance page was gated').toBe(200);
	});

	test('/team/* is exempt from the door — documented, not approved', async ({ api }) => {
		// proxy.ts returns early for any path whose first segment is `team`, so the 307 above never happens
		// there: an anonymous visitor gets the document and decides in the browser. The app then renders its
		// shell with no workspace (see suites/mock/auth.spec.ts), and every data call it makes carries no
		// token, so a real API answers it 401. Pinned here so that adding a gate at the door — or removing
		// the exemption — is a decision somebody has to make in the open, not a change that slips through.
		const response = await api('/team/tasks', NO_SESSION);
		expect(response.status(), '/team/tasks was gated at the door after all').toBe(200);
	});

	test('an anonymous visitor is not shown a session cookie by the door', async ({ api }) => {
		// The redirect clears the session cookies it is clearing; a plain 200 page must not set any.
		const response = await api('/auth/passcode', NO_SESSION);
		const cookies = response.headers()['set-cookie'] ?? '';

		expect(cookies, `the sign-in page set cookies: ${cookies}`).not.toContain('auth-token');
		expect(cookies, `the sign-in page set cookies: ${cookies}`).not.toContain('auth-refresh-token');
	});
});
