import { expect, test, type Page } from '../../fixtures';
import { signInAndVisit, waitForShellReady } from '../../helpers';

/**
 * Favourites across the app (#5017): a project starred from its own page is listed on the Favorites
 * page, next to the favourite tasks of every team and — kept apart — the favourites whose item is
 * gone, which are the ones a person is offered to remove.
 *
 * The mock keeps no favourites, so this spec serves its own, the way apps/web/cypress/e2e/
 * favorites.cy.ts does: `GET /api/favorite/employee` lists them, `POST /api/favorite` files one and
 * `DELETE /api/favorite/:id` removes it. The stubs answer with the shapes Gauzy answers with
 * (`{items,total}`, a created row, `{affected,raw}`) and record what the browser sent, so the
 * assertions are about the app's own requests.
 */

type StoredFavorite = { id: string; entity: string; entityId: string } & Record<string, unknown>;

const favoriteIdOf = (sequence: number) => `dddddddd-0000-4000-8000-${String(sequence).padStart(12, '0')}`;

const FAVORITE_TASK = {
	id: 'eeeeeeee-0000-4000-8000-000000005017',
	title: 'Ship the favorites',
	number: 5017,
	prefix: 'ET',
	taskNumber: 'ET-5017',
	issueType: 'Task',
	status: 'in-progress'
};

const GONE_PROJECT_ID = 'ffffffff-0000-4000-8000-000000000404';

/** Serves `favorites` as the person's favourites, and files into it whatever the app asks for. */
async function serveFavorites(page: Page, favorites: StoredFavorite[]) {
	const filed: StoredFavorite[] = [...favorites];
	const starred: Array<Record<string, unknown>> = [];
	const removed: string[] = [];
	const typeQueries: string[] = [];

	await page.route(/\/api\/favorite\/employee(\?.*)?$/, (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ items: favorites, total: favorites.length })
		})
	);
	await page.route(/\/api\/favorite\/type(\?.*)?$/, (route) => {
		typeQueries.push(route.request().url());
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ items: [FAVORITE_TASK], total: 1 })
		});
	});
	await page.route(/\/api\/favorite$/, async (route) => {
		const body = (route.request().postDataJSON() ?? {}) as Record<string, string>;
		const created: StoredFavorite = {
			id: favoriteIdOf(filed.length + 1),
			entity: body.entity,
			entityId: body.entityId,
			employeeId: body.employeeId,
			organizationId: body.organizationId,
			tenantId: body.tenantId
		};
		starred.push(body);
		favorites.push(created);
		filed.push(created);
		await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(created) });
	});
	await page.route(/\/api\/favorite\/[0-9a-f-]{36}$/, async (route) => {
		const id = new URL(route.request().url()).pathname.split('/').pop() ?? '';
		removed.push(id);
		const at = favorites.findIndex((favorite) => favorite.id === id);
		if (at >= 0) favorites.splice(at, 1);
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ affected: 1, raw: [] })
		});
	});

	return { starred, removed, typeQueries };
}

/** The `<section>` a heading belongs to, so a claim is about one list and not about the page. */
const section = (page: Page, heading: string) =>
	page.locator('section').filter({ has: page.getByRole('heading', { name: heading }) });

test.describe('favorites', () => {
	test('stars a project from its page, lists it on the Favorites page, and removes it from there', async ({
		page,
		fixture
	}) => {
		const served = await serveFavorites(page, []);
		// The interception has to be in place before the page that reads and writes favourites loads.
		await signInAndVisit(page, fixture, `/projects/${fixture.ids.project}`);

		await expect(page.getByRole('heading', { level: 1, name: 'Fixture Project' })).toBeVisible({ timeout: 20_000 });

		const star = page.locator('button[aria-label="Favorite"]');
		await expect(star).toHaveAttribute('aria-pressed', 'false');
		await star.click();

		await expect.poll(() => served.starred.length, { message: 'starring sent nothing to the API' }).toBe(1);
		expect(served.starred[0], 'the star asks for the project the person is looking at').toMatchObject({
			entity: 'OrganizationProject',
			entityId: fixture.ids.project
		});
		await expect(star, 'the button says it is starred').toHaveAttribute('aria-pressed', 'true');

		await page.goto(`/projects/${fixture.ids.project}`, { waitUntil: 'domcontentloaded' });
		await page.goto('/favorites', { waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);

		await expect(page.getByRole('heading', { level: 1, name: 'Favorites' })).toBeVisible({ timeout: 20_000 });
		const projects = section(page, 'Projects');
		await expect(projects.getByRole('link', { name: 'Fixture Project' })).toHaveAttribute(
			'href',
			new RegExp(`/projects/${fixture.ids.project}$`)
		);

		await projects.getByRole('button', { name: 'Remove Fixture Project from favorites' }).click();
		await expect.poll(() => served.removed.length, { message: 'removing sent no delete to the API' }).toBe(1);

		await expect(page.getByText('No favorites yet')).toBeVisible({ timeout: 20_000 });
	});

	test('lists a favourite task of another team, and keeps a favourite whose item is gone apart, to remove it', async ({
		page,
		fixture
	}) => {
		const served = await serveFavorites(page, [
			{ id: favoriteIdOf(1), entity: 'Task', entityId: FAVORITE_TASK.id },
			{ id: favoriteIdOf(2), entity: 'OrganizationProject', entityId: GONE_PROJECT_ID }
		]);
		await signInAndVisit(page, fixture, '/favorites');

		await expect
			.poll(() => served.typeQueries.some((url) => decodeURIComponent(url).includes('where[entity]=Task')), {
				message: 'the Favorites page never asked for the favourite tasks'
			})
			.toBe(true);

		const tasks = section(page, 'Tasks');
		await expect(tasks.getByRole('link', { name: 'Ship the favorites' })).toHaveAttribute(
			'href',
			new RegExp(`/task/${FAVORITE_TASK.id}$`)
		);
		await expect(tasks.getByText('#ET-5017')).toBeVisible();

		// The project no longer exists, so the page cannot name it: it says what is missing and offers only removal.
		const gone = section(page, 'No longer available');
		await expect(gone.getByText('A project you can no longer open')).toBeVisible();
		await gone.getByRole('button', { name: 'Remove from favorites' }).click();

		await expect
			.poll(() => served.removed, { message: 'the stale favourite was never deleted' })
			.toEqual([favoriteIdOf(2)]);
		await expect(page.getByRole('heading', { name: 'No longer available' })).toHaveCount(0, { timeout: 20_000 });
	});
});
