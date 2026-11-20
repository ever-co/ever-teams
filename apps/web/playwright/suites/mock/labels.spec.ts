import { expect, test, type Page } from '../../fixtures';
import { hardVisit, signInWithFixture } from '../../helpers';

/**
 * Settings › Team › Labels: the catalog of common labels, added to the team in one request, and no two
 * labels of one name.
 *
 * The mock keeps no labels, so this spec serves them itself — the same trick apps/web/cypress/e2e/
 * label-catalog.cy.ts plays with cy.intercept, done with page.route. `task-metadata/bootstrap` is
 * answered with the team's labels patched into it, and the two write routes answer as Gauzy would:
 * POST /api/tags/bulk reports succeeded/failed counts, POST /api/tags 409s a name the team already has.
 * Because the handlers are here, the request bodies are readable directly — no alias to wait for.
 */

const LABELS_PAGE = '/settings/team/labels';

type TeamLabel = { id: string; name: string; color: string; isSystem: boolean };
type LabelCreate = { name: string; color: string; organizationTeamId?: string };

const labelOf = (name: string, color: string, sequence: number): TeamLabel => ({
	id: `cccccccc-0000-4000-8000-${String(sequence).padStart(12, '0')}`,
	name,
	color,
	isSystem: false
});

/** Gauzy's key for a label name: lower case, dashes as spaces, runs of spaces collapsed, trimmed. */
const nameKeyOf = (name: string) => name.toLowerCase().replaceAll('-', ' ').replaceAll(/\s+/g, ' ').trim();

type LabelHarness = {
	labels: TeamLabel[];
	bulkRequests: LabelCreate[][];
	singleRequests: LabelCreate[];
};

async function serveTeamLabels(page: Page, initial: TeamLabel[]): Promise<LabelHarness> {
	const harness: LabelHarness = { labels: [...initial], bulkRequests: [], singleRequests: [] };
	const isTaken = (name: string) => harness.labels.some((label) => nameKeyOf(label.name) === nameKeyOf(name));
	const add = (item: LabelCreate) => {
		const label = labelOf(item.name, item.color, harness.labels.length + 1);
		harness.labels.push(label);
		return label;
	};

	// The bootstrap bundle is the mock's; the team's labels are patched into it.
	await page.route(/\/api\/task-metadata\/bootstrap(\?.*)?$/, async (route) => {
		const upstream = await route.fetch();
		const body = (await upstream.json()) as Record<string, unknown>;
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ ...body, taskLabels: { items: harness.labels, total: harness.labels.length } })
		});
	});

	await page.route(/\/api\/tags\/bulk(\?.*)?$/, async (route) => {
		const items = (route.request().postDataJSON()?.items ?? []) as LabelCreate[];
		harness.bulkRequests.push(items);
		const succeeded: Array<{ index: number; id: string }> = [];
		const failed: Array<{ index: number; code: string; message: string }> = [];
		items.forEach((item, index) => {
			if (isTaken(item.name))
				failed.push({ index, code: 'UNIQUE_CONSTRAINT_VIOLATION', message: `"${item.name}" is taken` });
			else succeeded.push({ index, id: add(item).id });
		});
		await route.fulfill({
			status: 201,
			contentType: 'application/json',
			body: JSON.stringify({
				succeededCount: succeeded.length,
				failedCount: failed.length,
				total: items.length,
				succeeded,
				failed
			})
		});
	});

	// Only the POST files a label (core/services/client/api/tags/tag.service.ts); a read of `/api/tags` goes on to the
	// mock.
	await page.route(/\/api\/tags(\?.*)?$/, async (route) => {
		if (route.request().method() !== 'POST') return route.fallback();
		const item = route.request().postDataJSON() as LabelCreate;
		harness.singleRequests.push(item);
		if (isTaken(item.name)) {
			await route.fulfill({
				status: 409,
				contentType: 'application/json',
				body: JSON.stringify({ statusCode: 409, message: `"${item.name}" is taken` })
			});
			return;
		}
		await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(add(item)) });
	});

	return harness;
}

const checkbox = (name: string) => `[role="checkbox"][aria-label="${name}"]`;

test.describe('the label catalog', () => {
	test('an empty list offers the catalog, and the picked labels go in one request', async ({
		page,
		fixture,
		shield
	}) => {
		const harness = await serveTeamLabels(page, []);
		await signInWithFixture(page.context(), fixture);
		await hardVisit(page, LABELS_PAGE);

		await expect(page.getByText('No labels yet')).toBeVisible({ timeout: 20_000 });
		await expect(page.getByRole('button', { name: 'Browse labels' })).toHaveCount(2);
		await page.getByRole('button', { name: 'Browse labels' }).last().click();

		const catalog = page.getByRole('dialog');
		await expect(catalog).toBeVisible();
		await expect(catalog.getByText('Pick the labels your team needs.')).toBeVisible();
		await expect(catalog.locator('fieldset[data-testid^="label-category-"]')).toHaveCount(7);
		await expect(catalog.getByRole('checkbox')).toHaveCount(70);

		await catalog.getByRole('button', { name: 'Select all: Priority' }).click();
		await catalog.locator(checkbox('Frontend')).click();
		await expect(catalog.getByText('6 labels picked')).toBeVisible();
		await catalog.getByRole('button', { name: 'Add 6 labels' }).click();

		// The catalog's own toast (label-catalog-dialog.tsx), and no error toast beside it. The app's development build
		// also raises an error toast for any read that failed (core/components/common/dev-error-toaster.tsx), so one
		// here is a failed read on this page — as the mock's old answers to the embeds and API-token switches were
		// (cypress/support/mock-gauzy-server.mjs).
		await expect(page.locator('[data-sonner-toast][data-type="success"]')).toContainText('6 labels added');
		await expect(page.locator('[data-sonner-toast][data-type="error"]'), 'an error toast came with it').toHaveCount(
			0
		);
		await expect(catalog).toHaveCount(0);
		await expect(page.locator('[data-row-menu]')).toHaveCount(6, { timeout: 20_000 });

		// One request carried all six, as labels of this team, with the catalog's own colour.
		expect(harness.bulkRequests, 'the catalog wrote the team in one request').toHaveLength(1);
		const items = harness.bulkRequests[0];
		expect(items.map((item) => item.name)).toEqual([
			'Priority: Critical',
			'Priority: High',
			'Priority: Medium',
			'Priority: Low',
			'Priority: None',
			'Frontend'
		]);
		expect(items.find((item) => item.name === 'Frontend')?.color).toBe('#3B82F6');
		for (const item of items) {
			expect(item.organizationTeamId, `${item.name} was not filed under the fixture team`).toBe(
				fixture.ids.teamA
			);
		}
		expect(harness.singleRequests, 'a bulk add must not also write label by label').toHaveLength(0);

		// What the team now has is marked and locked in the catalog.
		await page.getByTestId('browse-labels').click();
		await expect(page.locator(checkbox('Priority: High'))).toHaveAttribute('aria-checked', 'true');
		await expect(page.locator(checkbox('Priority: High'))).toHaveAttribute('data-disabled');
		await expect(page.getByRole('button', { name: 'Select all: Priority' })).toHaveCount(0);

		expect(shield.pageErrors()).toEqual([]);
	});

	test('labels the team already has are marked whatever their case or dashes', async ({ page, fixture }) => {
		await serveTeamLabels(page, [labelOf('bug', '#D73A4A', 1), labelOf('Follow up', '#0891B2', 2)]);
		await signInWithFixture(page.context(), fixture);
		await hardVisit(page, LABELS_PAGE);

		await expect(page.locator('[data-row-menu]')).toHaveCount(2, { timeout: 20_000 });
		await page.getByTestId('browse-labels').click();

		const catalog = page.getByRole('dialog');
		for (const name of ['Bug', 'Follow-up']) {
			await expect(catalog.locator(checkbox(name))).toHaveAttribute('aria-checked', 'true');
			await expect(catalog.locator(checkbox(name))).toHaveAttribute('data-disabled');
		}
		await expect(catalog.locator(checkbox('Feature'))).not.toHaveAttribute('data-disabled');
		await expect(catalog.getByRole('button', { name: 'Add labels' })).toBeDisabled();
	});

	test('the catalog narrows by label name or category', async ({ page, fixture }) => {
		await serveTeamLabels(page, []);
		await signInWithFixture(page.context(), fixture);
		await hardVisit(page, LABELS_PAGE);

		await page.getByTestId('browse-labels').click();
		const catalog = page.getByRole('dialog');
		const search = catalog.locator('input[type="search"]');

		await search.fill('priority');
		await expect(catalog.getByRole('checkbox')).toHaveCount(5);

		await search.fill('review');
		await expect(catalog.getByRole('checkbox')).toHaveCount(1);
		await expect(catalog.getByRole('checkbox')).toHaveAttribute('aria-label', 'Needs Review');

		await search.fill('zzz');
		await expect(catalog.getByText('No label matches this search.')).toBeVisible();
	});

	test('a name the team already has is refused before anything is sent', async ({ page, fixture }) => {
		const harness = await serveTeamLabels(page, [labelOf('Follow-up', '#0891B2', 1)]);
		await signInWithFixture(page.context(), fixture);
		await hardVisit(page, LABELS_PAGE);

		await expect(page.locator('[data-row-menu]')).toHaveCount(1, { timeout: 20_000 });
		// Two controls here carry the accessible name "Add label": the inline add row of the list and a button of
		// the page frame. The row is the one that opens the name input, so the test names it by the attribute
		// `property-list.tsx` gives it (`data-add-row=<group>`) instead of hoping the name is unique.
		await page.locator('[data-add-row="all"]').click();

		const nameInput = page.locator('input[placeholder="Label name"]');
		await nameInput.fill('  follow up');
		await nameInput.press('Enter');

		await expect(page.getByText('The team already has a label with this name.')).toBeVisible();
		expect(harness.singleRequests, 'a duplicate name must not reach the API').toHaveLength(0);

		await nameInput.fill('Feature');
		await nameInput.press('Enter');

		await expect(page.locator('[data-row-menu]')).toHaveCount(2, { timeout: 20_000 });
		expect(
			harness.singleRequests.map((item) => item.name),
			'the accepted name was sent as typed'
		).toEqual(['Feature']);
		await expect(page.getByText('The team already has a label with this name.')).toHaveCount(0);
	});
});
