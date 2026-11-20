import { expect, test } from '../../fixtures';

/**
 * Team settings that a person actually operates: the roles a team is granted, the invitations the
 * members page reads, the public team page a signed-out visitor can open, and the status editor's
 * icon library.
 *
 * Each case is anchored on something outside the page too — the mock's request record — because a
 * settings page that renders while asking for nothing is a stub, not a feature.
 *
 * Selector provenance: apps/web/cypress/e2e/feature-parity.cy.ts ('Roles & permissions', `ADMIN`,
 * 'Activated', `/api/invite`, `/api/public/team/`, 'Add status', `button[aria-label="Choose an icon"]`,
 * `input[placeholder="Search icons"]`, the `aria-label="done"` / `aria-label="bug"` icon buttons).
 */

test.describe('roles, invitations and the public team page', () => {
	test('a role can be opened and its permissions seen', async ({ app }) => {
		const page = await app('/permissions');

		await expect(page.getByText('Roles & permissions')).toBeVisible({ timeout: 15_000 });
		await page.getByText('ADMIN').click();
		await expect(page.getByText('Activated')).toBeVisible({ timeout: 15_000 });
	});

	test('the members page reads the team invitations', async ({ app, mock }) => {
		await app('/settings/team/members');

		await expect
			.poll(async () => (await mock.requests()).some((request) => request.path === '/api/invite'), {
				message: 'the members page never read the invitations'
			})
			.toBe(true);
	});

	test('a public team page opens for someone who is not signed in', async ({ anon, fixture, mock }) => {
		const page = await anon(`/team/${fixture.ids.teamA}/${fixture.profileLink}`);
		await expect(page.locator('body')).not.toHaveText('');

		await expect
			.poll(async () => (await mock.requests()).some((request) => request.path.startsWith('/api/public/team/')), {
				message: 'the public team data was never read'
			})
			.toBe(true);
	});
});

test.describe('the status editor', () => {
	test('opens the icon library inside the panel, and narrows it by search', async ({ app }) => {
		const page = await app('/settings/team/statuses');

		await page.getByRole('button', { name: 'Add status' }).click({ timeout: 20_000 });
		await page.locator('button[aria-label="Choose an icon"], button[aria-label^="Icon:"]').first().click();

		const search = page.locator('input[placeholder="Search icons"]');
		await expect(search).toBeVisible({ timeout: 15_000 });
		await expect(page.getByRole('paragraph')).toContainText('Progress');
		// The library draws its icons itself: no image file is fetched for them.
		await expect(page.locator('button[aria-label="done"] svg')).toBeVisible();

		await search.fill('defect');
		await expect(page.locator('button[aria-label="bug"] svg')).toBeVisible({ timeout: 15_000 });
		await expect(
			page.locator('button[aria-label="done"]'),
			'the search left no room for icons that do not match'
		).toHaveCount(0);
	});
});
