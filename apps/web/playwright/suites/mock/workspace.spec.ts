import type { BrowserContext } from '@playwright/test';

import { expect, test, type Page } from '../../fixtures';

/**
 * Creating another workspace while signed in.
 *
 * This is the flow the mock genuinely mutates: `POST /api/tenant`, `/api/organization`, `/api/employee`
 * and `/api/organization-team` are recorded into `state().workspaceCreation`, so the assertions below
 * are about what the server was told — the workspace name, the team name, the exact invitation
 * addresses — not about what the page rendered.
 *
 * Provenance: apps/web/cypress/e2e/create-workspace.cy.ts proves this copy and these field ids
 * (`#workspace-name`, `#workspace-team`, `#workspace-invites`) against the same mock.
 */

const NEW_TENANT_ID = '50250000-0000-4000-8000-000000000002';
const NEW_TEAM_ID = '50250000-0000-4000-8000-000000000005';

type CreationState = {
	openings: number;
	tenant: string | null;
	organization: string | null;
	employeeUserId: string | null;
	team: { name: string | null; managerIds: string[] } | null;
	invites: { emails: string[]; teamIds: string[] } | null;
};

const creation = async (mock: { state: () => Promise<Record<string, unknown>> }) =>
	(await mock.state()).workspaceCreation as CreationState;

const cookieValue = async (context: BrowserContext, name: string) =>
	(await context.cookies()).find((cookie) => cookie.name === name)?.value;

async function openForm(page: Page, name: string): Promise<void> {
	await page.locator('#workspace-name').fill(name);
}

test.describe('creating another workspace', () => {
	test('creates it with its first team and invitations, and opens it signed in', async ({ app, mock }) => {
		const page = await app('/workspace/new');
		const context = page.context();

		await page.locator('#workspace-name').fill('Lovelace Studio');
		await expect(page.locator('#workspace-team')).toHaveValue('Lovelace Studio');
		await page.locator('#workspace-team').fill('Design');
		await page.locator('#workspace-invites').fill('grace@example.test, ada@example.test');
		await page.getByRole('button', { name: 'Create workspace' }).click();

		await expect(page).toHaveURL(/\/workspace\/welcome\?invited=2/, { timeout: 30_000 });
		expect(await cookieValue(context, 'auth-tenant-id'), 'the browser moved to the new tenant').toBe(NEW_TENANT_ID);
		expect(await cookieValue(context, 'auth-active-team'), 'and to its team').toBe(NEW_TEAM_ID);
		await expect(page.getByText('Your workspace is ready')).toBeVisible();
		await expect(page.locator('[aria-label^="Current workspace: Lovelace Studio."]')).toBeVisible({
			timeout: 20_000
		});

		const created = await creation(mock);
		expect(created.openings, 'one opening was asked for').toBe(1);
		expect(created.tenant).toBe('Lovelace Studio');
		expect(created.organization).toBe('Lovelace Studio');
		expect(created.team?.name, 'the team name typed is the team created').toBe('Design');
		expect(created.invites, 'the invitations are exactly the addresses typed').toEqual({
			emails: ['grace@example.test', 'ada@example.test'],
			teamIds: [NEW_TEAM_ID]
		});
	});

	test('says so when the server allows no new workspace, and leaves the person where they were', async ({
		app,
		mock
	}) => {
		const page = await app('/workspace/new', { scenario: { tenantRegistrationClosed: true } });
		const before = await cookieValue(page.context(), 'auth-tenant-id');

		await openForm(page, 'Lovelace Studio');
		await page.getByRole('button', { name: 'Create workspace' }).click();

		await expect(page.getByText('New workspaces are turned off on this server')).toBeVisible({ timeout: 20_000 });
		await expect(page).toHaveURL(/\/workspace\/new$/);
		expect(await cookieValue(page.context(), 'auth-tenant-id'), 'the person stays in their workspace').toBe(before);
		expect((await creation(mock)).tenant, 'nothing was created').toBeNull();
		// The page gave the reason itself; a generic failure toast on top of it is a bug.
		await expect(page.getByText('That change was not saved')).toHaveCount(0);
	});

	test('waits for a running timer to stop: a new workspace would leave it counting out of sight', async ({
		app,
		mock
	}) => {
		const page = await app('/workspace/new', { scenario: { timerRunning: true } });

		await expect(page.getByText('Stop your timer first')).toBeVisible({ timeout: 20_000 });
		await openForm(page, 'Lovelace Studio');
		await expect(page.getByRole('button', { name: 'Create workspace' })).toBeDisabled();
		expect((await creation(mock)).openings, 'no workspace was opened').toBe(0);
	});

	test('says a workspace created but not opened exists, and offers no retry that would create a second one', async ({
		app,
		mock
	}) => {
		const page = await app('/workspace/new', { scenario: { newWorkspaceRefreshFails: true } });
		const before = await cookieValue(page.context(), 'auth-tenant-id');

		await openForm(page, 'Lovelace Studio');
		await page.getByRole('button', { name: 'Create workspace' }).click();

		await expect(page.getByText('Your workspace was created, but could not be opened')).toBeVisible({
			timeout: 30_000
		});
		await expect(page.getByRole('button', { name: 'Create workspace' })).toBeDisabled();
		expect(
			await cookieValue(page.context(), 'auth-tenant-id'),
			'the person is not dropped into a half-open workspace'
		).toBe(before);
		expect((await creation(mock)).team?.name, 'the workspace really was created').toBe('Lovelace Studio');
	});

	test('leads to the checkout where opening another workspace needs a subscription', async ({ app, mock }) => {
		const page = await app('/workspace/new', { scenario: { workspacePaywall: true } });

		await openForm(page, 'Lovelace Studio');
		await page.getByRole('button', { name: 'Create workspace' }).click();

		await expect(page.getByText('Another workspace needs a subscription')).toBeVisible({ timeout: 20_000 });
		const link = page.getByRole('link', { name: 'Choose a plan' });
		await expect(link).toHaveAttribute(
			'href',
			'https://checkout.example.test/?product=ever-teams&email=manager%40example.test'
		);
		await expect(link).toHaveAttribute('target', '_blank');
		expect((await creation(mock)).tenant, 'no workspace behind a paywall').toBeNull();
	});

	test('starts no timer while the new workspace opens', async ({ app, mock }) => {
		// Gauzy takes its time to open an account, so the creation is still in flight meanwhile.
		const page = await app('/workspace/new', { scenario: { delays: { '/api/auth/workspaces': 6_000 } } });

		await openForm(page, 'Lovelace Studio');
		await page.getByRole('button', { name: 'Create workspace' }).click();
		await page.locator('[aria-label="Start timer"]').first().click({ force: true });

		await expect(page).toHaveURL(/\/workspace\/welcome/, { timeout: 30_000 });
		const proof = (await mock.state()).mutationProof as { startedTimer: boolean };
		expect(proof.startedTimer, 'a timer must not start in the workspace being left behind').toBe(false);
	});

	test('says when it cannot tell whether the workspace was created, and offers no retry', async ({ app }) => {
		const page = await app('/workspace/new');
		await page.route(/\/api\/auth\/create-workspace$/, (route) => route.abort('failed'));

		await openForm(page, 'Lovelace Studio');
		await page.getByRole('button', { name: 'Create workspace' }).click();

		await expect(page.getByText('We could not tell whether your workspace was created')).toBeVisible({
			timeout: 20_000
		});
		await expect(page.getByRole('button', { name: 'Create workspace' })).toBeDisabled();
	});
});
