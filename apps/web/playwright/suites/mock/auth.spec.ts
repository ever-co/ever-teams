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

	/**
	 * The size of the reveal row that holds the password field, in CSS pixels, or `null` when the reveal is not
	 * in the document.
	 *
	 * `AuthReveal` closes by collapsing its grid row (`grid-rows-[0fr]` over a `min-h-0 overflow-hidden` box) and
	 * marking the whole subtree `inert` — it does not remove the field and does not hide it. So Playwright's
	 * `toBeHidden()` is the wrong tool here: the input keeps its own box inside the clipped row, and the
	 * assertion fails on a page that is behaving exactly as designed. What a person actually gets is a field
	 * with no room and no interaction, which is what this measures.
	 */
	const revealBoxOf = (
		page: Page,
		fieldId: string
	): Promise<{ revealHeight: number; fieldHeight: number; inert: boolean } | null> =>
		page.evaluate((id) => {
			const field = document.getElementById(id);
			// The reveal is the ancestor whose grid row is set to `1fr` or `0fr` (Tailwind renders the arbitrary
			// value into the class name), which is the same element React marks `inert` while it is closed.
			const reveal = field?.closest('[class*="grid-rows-"]');
			if (!reveal) return null;
			return {
				revealHeight: Math.round(reveal.getBoundingClientRect().height),
				fieldHeight: Math.round(field?.getBoundingClientRect().height ?? -1),
				inert: (reveal as HTMLElement).hasAttribute('inert')
			};
		}, fieldId);

	test('the passwordless page opens on the e-mailed code form: the address is shown, the password box is collapsed and inert', async ({
		anon
	}) => {
		const view = await anon('/auth/passcode');

		await expect(view.locator('#passcode-email')).toBeVisible();
		// The field is in the document — the page builds one form for both methods — but its reveal is closed:
		// zero height, and `inert`, which takes it out of the tab order and stops it receiving input.
		await expect(view.locator('#pw-password')).toHaveCount(1);
		const closed = await revealBoxOf(view, 'pw-password');
		expect(closed, 'the password field is not inside an AuthReveal at all').not.toBeNull();
		expect(closed?.revealHeight, 'the password reveal is not collapsed on the code method').toBe(0);
		expect(closed?.inert, 'the collapsed password reveal is not inert, so it still takes focus and input').toBe(true);
		await expect(methodTab(view, 'E-mail code')).toHaveAttribute('aria-selected', 'true');
		await expect(view.getByRole('button', { name: 'Send me a code' })).toBeVisible();
	});

	test('the password page opens with the password box open, on the same page', async ({ anon }) => {
		const view = await anon('/auth/password');

		await expect(view.locator('#passcode-email')).toBeVisible();
		await expect(view.locator('#pw-password')).toBeVisible();
		const open = await revealBoxOf(view, 'pw-password');
		expect(open, 'the password field is not inside an AuthReveal at all').not.toBeNull();
		expect(open?.revealHeight, 'the password reveal did not open on the password method').toBeGreaterThan(0);
		expect(open?.inert, 'the open password reveal is still inert').toBe(false);
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
	test('a signed-out person is not left on a protected page', async ({ anon }) => {
		// The gate here is the door, not the page: `apps/web/proxy.ts` answers a protected path with a 307
		// before Next renders it, and the site root is one of those paths. Where it lands is
		// `DEFAULT_APP_PATH`, which is `/auth/password` on a demo-mode deployment (the test config sets
		// NEXT_PUBLIC_DEMO=true) and `/auth/passcode` on any other. suites/api/page-gate.spec.ts covers the
		// rest of the table, including the locale-prefixed paths that used to slip through it.
		const view = await anon('/', { stubSession: false });
		await expect(view).toHaveURL(/\/auth\/(password|passcode)/, { timeout: 20_000 });
	});

	test('/team/* is not gated at the door, and shows a shell with no workspace', async ({ anon }) => {
		// proxy.ts returns early for any path whose first segment is `team`, so the 307 above never happens
		// there. What an anonymous visitor then gets is the app shell with no workspace to act in — pinned
		// here so that closing the exemption, or widening it, is a change somebody has to account for.
		const view = await anon('/team/tasks', { stubSession: false });
		await expect(view).toHaveURL(/\/team\/tasks/, { timeout: 20_000 });
		await expect(view.getByRole('button', { name: /Current workspace: No workspace/ })).toBeVisible({
			timeout: 20_000
		});
	});

	test('a signed-in person is not kept on a sign-in page', async ({ app }) => {
		// No shell wait: the point is where the person ends up, and the sign-in page has no shell of its own.
		const view = await app('/auth/passcode', { requireShell: false });
		await expect(view).not.toHaveURL(/\/auth\/passcode/, { timeout: 20_000 });
	});

	test('a path no page owns answers 404 and shows the app’s own not-found page', async ({ app, shield }) => {
		// Not a task id that does not exist: `app/[locale]/(main)/team/tasks/…` has a dynamic segment, so a bogus
		// id under it is a real document (200) whose *content* says the task is missing — a different thing, and
		// the reason this test once failed on 200. Here nothing under `app/[locale]` matches the path, so Next's
		// not-found boundary answers it, with the status a crawler and a browser both see.
		const view = await app('/this-page-does-not-exist-anywhere', { requireShell: false });
		const documents = shield.documents();
		const last = documents[documents.length - 1];

		expect(await devOverlayErrors(view), 'the Next dev overlay shows an error on a route that does not exist').toEqual(
			[]
		);
		expect(shield.pageErrors()).toEqual([]);
		expect(last?.status, `the server answered ${last?.status} for a route that does not exist`).toBe(404);
		await expect(view.getByRole('heading', { name: 'Page not found' })).toBeVisible({ timeout: 20_000 });
	});
});
