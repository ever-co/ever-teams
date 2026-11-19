import { expect, test, type Page } from '../../fixtures';
import type { Locator } from '@playwright/test';
import { devOverlayErrors } from '../../helpers';

/**
 * The sign-in pages and the gate around the authenticated app.
 *
 * No credentials are typed against a real identity provider here: a deterministic run proves the
 * pages render, which form each one opens with, and that the gate sends a signed-out person to the
 * passwordless page. The field ids and the method switch come from the app itself:
 * `core/components/pages/auth/sign-in/credentials-step.tsx` (`#passcode-email`, `#pw-password`),
 * `core/components/pages/auth/signup/page-component.tsx` (`#signup-email`),
 * `core/components/pages/auth/forgot-password/forgot-password-form.tsx` (`#forgot-email`) and
 * `core/components/common/segmented-control.tsx` (the `role="tab"` pair `E-mail code` / `Password`).
 *
 * `/auth/passcode` and `/auth/password` render the same page and only choose the method it opens
 * with, so the interesting assertion is which field is there and which is not.
 */
const AUTH_PAGES = [
	{ label: 'passcode (default login)', path: '/auth/passcode', landsOn: /\/auth\/passcode$/ },
	{ label: 'password', path: '/auth/password', landsOn: /\/auth\/password/ },
	{ label: 'signup', path: '/auth/signup', landsOn: /\/auth\/signup/ },
	{ label: 'forgot password', path: '/auth/forgot-password', landsOn: /\/auth\/forgot-password/ },
	{ label: 'accept invite', path: '/auth/accept-invite', landsOn: /\/auth\/accept-invite/ },
	{ label: 'auth error', path: '/auth/error', landsOn: /\/auth\/error/ },
	// A signed-out person has no workspace to pick, so the picker may hand them to sign-in instead;
	// what must hold either way is that the route answers and shows no error screen.
	{ label: 'workspace picker', path: '/auth/workspace', landsOn: /\/auth\/(workspace|passcode)/ }
];

/** The sign-in method switch is a pair of `role="tab"` buttons (segmented-control.tsx). */
const methodTab = (page: Page, name: string): Locator => page.getByRole('tab', { name });

test.describe('sign-in pages', () => {
	for (const page of AUTH_PAGES) {
		test(`${page.label} renders signed out`, async ({ anon, shield }) => {
			const view = await anon(page.path);

			expect(shield.pageErrors(), `uncaught errors on ${page.label}`).toEqual([]);
			expect(shield.consoleErrors(), `app console errors on ${page.label}`).toEqual([]);
			expect(await devOverlayErrors(view), `the Next dev overlay shows an error on ${page.label}`).toEqual([]);
			await expect(view).toHaveURL(page.landsOn);
			await expect(view.locator('body')).not.toHaveText('');
		});
	}

	test('the passwordless page opens on the e-mailed code form: an address, no password box', async ({ anon }) => {
		const view = await anon('/auth/passcode');

		await expect(view.locator('#passcode-email')).toBeVisible();
		await expect(view.locator('#pw-password')).toHaveCount(0);
		await expect(methodTab(view, 'E-mail code')).toHaveAttribute('aria-selected', 'true');
		await expect(view.getByRole('button', { name: 'Send me a code' })).toBeVisible();
	});

	test('the password page opens with the password box, on the same page', async ({ anon }) => {
		const view = await anon('/auth/password');

		await expect(view.locator('#passcode-email')).toBeVisible();
		await expect(view.locator('#pw-password')).toBeVisible();
		await expect(methodTab(view, 'Password')).toHaveAttribute('aria-selected', 'true');
	});

	test('switching the sign-in method changes the form in place, not the page', async ({ anon }) => {
		const view = await anon('/auth/passcode');

		await methodTab(view, 'Password').click();
		await expect(view.locator('#pw-password')).toBeVisible({ timeout: 20_000 });
		await expect(methodTab(view, 'Password')).toHaveAttribute('aria-selected', 'true');
		// The method is kept in the address bar, so a reload or a shared link opens the same form.
		await expect(view).toHaveURL(/\/auth\/passcode\?method=password/);
	});

	test('signup asks for the address a new account is created with', async ({ anon }) => {
		const view = await anon('/auth/signup');
		await expect(view.locator('#signup-email')).toBeVisible({ timeout: 20_000 });
	});

	test('a forgotten password is recovered from the address alone', async ({ anon }) => {
		const view = await anon('/auth/forgot-password');
		await expect(view.locator('#forgot-email')).toBeVisible({ timeout: 20_000 });
	});
});

test.describe('the authenticated gate', () => {
	test('a signed-out person is sent to the passwordless page', async ({ anon }) => {
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

		expect(await devOverlayErrors(view), 'the Next dev overlay shows an error on a route that does not exist').toEqual(
			[]
		);
		expect(shield.pageErrors()).toEqual([]);
		expect(last?.status, `the server answered ${last?.status} for a route that does not exist`).toBe(404);
	});
});
