import { expect, test } from '../../fixtures';

/**
 * The sign-in pages and the gate around the authenticated app. No credentials are typed here: a
 * deterministic run proves the pages render and that the gate sends a signed-out person to the
 * passwordless page with the intended route preserved.
 */
const AUTH_PAGES = [
	{ label: 'passcode (default login)', path: '/auth/passcode' },
	{ label: 'password', path: '/auth/password' },
	{ label: 'signup', path: '/auth/signup' },
	{ label: 'forgot password', path: '/auth/forgot-password' },
	{ label: 'accept invite', path: '/auth/accept-invite' },
	{ label: 'auth error', path: '/auth/error' },
	{ label: 'workspace picker', path: '/auth/workspace' }
];

test.describe('sign-in pages', () => {
	for (const page of AUTH_PAGES) {
		test(`${page.label} renders signed out`, async ({ anon, shield }) => {
			const view = await anon(page.path);

			expect(shield.pageErrors(), `uncaught errors on ${page.label}`).toEqual([]);
			expect(shield.consoleErrors(), `app console errors on ${page.label}`).toEqual([]);
			await expect(view.locator('nextjs-portal')).toHaveCount(0);
			await expect(view).toHaveURL(new RegExp(page.path));
			await expect(view.locator('body')).not.toHaveText('');
		});
	}

	test('the password page offers an email and a password field', async ({ anon }) => {
		const view = await anon('/auth/password');
		await expect(view.getByLabel(/email/i)).first().toBeVisible();
		await expect(view.locator('input[type="password"]').first()).toBeVisible();
	});

	test('the passcode page offers an email field and no password field', async ({ anon }) => {
		const view = await anon('/auth/passcode');
		await expect(view.getByLabel(/email/i)).first().toBeVisible();
		await expect(view.locator('input[type="password"]')).toHaveCount(0);
	});
});

test.describe('the authenticated gate', () => {
	test('a signed-out person is sent to the passwordless page, with the route preserved', async ({ anon }) => {
		const view = await anon('/team/tasks', { stubSession: false });
		await expect(view).toHaveURL(/\/auth\/passcode/, { timeout: 20_000 });
	});

	test('a signed-in person is not kept on a sign-in page', async ({ app }) => {
		const view = await app('/auth/passcode');
		await expect(view).not.toHaveURL(/\/auth\/passcode/, { timeout: 20_000 });
	});

	test('an unknown route answers 404 and does not crash', async ({ app, shield }) => {
		const view = await app('/team/tasks/does-not-exist-anywhere');
		const documents = shield.documents();
		const last = documents[documents.length - 1];

		await expect(view.locator('nextjs-portal')).toHaveCount(0);
		expect(shield.pageErrors()).toEqual([]);
		expect(last?.status, `the server answered ${last?.status} for a route that does not exist`).toBe(404);
	});
});
