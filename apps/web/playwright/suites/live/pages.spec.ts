import { expect, test } from '../../live-fixtures';
import { devOverlayErrors } from '../../helpers';

/**
 * The pages a person reaches before they have an account, served by the local app against the demo
 * API. Nothing here is stubbed: the NextAuth session is the real one (signed out), and every call the
 * pages make goes to apidev.ever.team.
 *
 * What this proves is that the app boots and holds together against a real API — no uncaught error,
 * no Next dev overlay error, no bounce to a different page, no call to a host outside this app and
 * the demo API (the shield fails that one by itself). What it deliberately does not assert is any
 * business copy beyond the few strings the app owns.
 */
const PAGES = [
	{ label: 'passcode (default login)', path: '/auth/passcode', landsOn: /\/auth\/passcode$/ },
	{ label: 'password', path: '/auth/password', landsOn: /\/auth\/password/ },
	{ label: 'signup', path: '/auth/signup', landsOn: /\/auth\/signup/ },
	{ label: 'forgot password', path: '/auth/forgot-password', landsOn: /\/auth\/forgot-password/ },
	{ label: 'accept invite', path: '/auth/accept-invite', landsOn: /\/auth\/accept-invite/ },
	{ label: 'auth error', path: '/auth/error', landsOn: /\/auth\/error/ },
	{ label: 'workspace picker', path: '/auth/workspace', landsOn: /\/auth\/(workspace|passcode)/ }
];

test.describe('the app against the demo API, signed out', () => {
	for (const page of PAGES) {
		test(`${page.label} renders`, async ({ demo, shield }) => {
			const view = await demo(page.path);

			expect(shield.pageErrors(), `uncaught errors on ${page.label}`).toEqual([]);
			expect(shield.consoleErrors(), `app console errors on ${page.label}`).toEqual([]);
			expect(await devOverlayErrors(view), `the Next dev overlay shows an error on ${page.label}`).toEqual([]);
			await expect(view).toHaveURL(page.landsOn);
			await expect(view.locator('body')).not.toHaveText('');
		});
	}

	test('asking for a team route while signed out is answered by the sign-in page', async ({ demo }) => {
		const view = await demo('/team/tasks');
		await expect(view).toHaveURL(/\/auth\/passcode/, { timeout: 30_000 });
	});

	test('a route that does not exist answers 404 and does not crash', async ({ demo, shield }) => {
		// Not under /team: `team/[teamId]/[profileLink]` owns /team/tasks/<anything> and answers it 200.
		const view = await demo('/this-page-does-not-exist-anywhere');

		expect(shield.pageErrors()).toEqual([]);
		expect(await devOverlayErrors(view), 'a missing route must not leave a dev overlay error').toEqual([]);
		const last = shield.documents().at(-1);
		expect(last?.status, `the server answered ${last?.status}`).toBe(404);
	});
});
