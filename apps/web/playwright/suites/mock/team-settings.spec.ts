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

		// The page title is its heading; the sidebar link and the breadcrumb repeat the words
		// (core/components/pages/permissions/page-component.tsx).
		await expect(page.getByRole('heading', { name: 'Roles & permissions' })).toBeVisible({ timeout: 15_000 });
		await page.getByText('ADMIN', { exact: true }).click();
		// A permission row is its label and its toggle's state (`PERMISSION_ROW` in page-component.tsx). The fixture role
		// grants TIME_TRACKER and not ORG_TEAM_JOIN_REQUEST_EDIT (`rolePermissions` in cypress/support/mock-gauzy-server.mjs).
		const permissionRow = (label: string) => page.getByText(label, { exact: true }).locator('xpath=..');
		await expect(permissionRow('Track time')).toContainText('Activated', { timeout: 15_000 });
		await expect(permissionRow('Handle requests')).toContainText('Deactivated');
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

		// "Add status" is the page's button and the add row of each status group; the row of the To do group opens the
		// inline editor (`data-add-row=<group>`, core/components/settings/pages/task-properties/property-list.tsx).
		await page.locator('[data-add-row="todo"]').click({ timeout: 20_000 });
		await page.locator('button[aria-label="Choose an icon"], button[aria-label^="Icon:"]').first().click();

		const search = page.locator('input[placeholder="Search icons"]');
		await expect(search).toBeVisible({ timeout: 15_000 });
		// Each icon group is labelled by a paragraph (property-icon-panel.tsx), Progress among them.
		await expect(page.getByRole('paragraph').filter({ hasText: /^Progress$/ })).toBeVisible();
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
