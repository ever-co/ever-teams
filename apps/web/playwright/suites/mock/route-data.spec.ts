import { expect, test } from '../../fixtures';

/**
 * Which route owns which data.
 *
 * Every route here must fetch its own data on a cold load, with nothing warmed by a previous page.
 * The endpoint is slowed down first (the mock's `delays`), so a route that renders from a cache or
 * from a parent page's fetch instead of its own would pass a plain load and fail this one.
 *
 * The pairs come from apps/web/cypress/e2e/route-ownership.cy.ts, which proved them against this mock.
 * `delays` accumulate across scenario calls and only a reset clears them, and the mock fixture resets
 * before every test — so a delay set here cannot leak into another test.
 */

const OWNED: Array<{ path: string; endpoints: string[] }> = [
	{ path: '/settings/team/members', endpoints: ['/api/invite'] },
	{ path: '/permissions', endpoints: ['/api/roles'] },
	{ path: '/projects', endpoints: ['/api/organization-projects'] },
	{ path: '/team/tasks', endpoints: ['/api/tasks/team'] },
	{ path: '/kanban', endpoints: ['/api/daily-plan'] },
	{ path: '/reports/weekly-limit', endpoints: ['/api/organization/'] },
	{ path: '/work-diary', endpoints: ['/api/timesheet/time-log', '/api/timesheet/statistics/time-slots'] },
	{ path: '/favorites', endpoints: ['/api/favorite/employee'] }
];

for (const route of OWNED) {
	test(`${route.path} fetches its own data on a cold load`, async ({ app, mock }) => {
		await mock.scenario({
			delays: Object.fromEntries(
				route.endpoints.filter((endpoint) => !endpoint.endsWith('/')).map((endpoint) => [endpoint, 650])
			)
		});

		await app(route.path);
		const paths = await mock.paths();

		for (const endpoint of route.endpoints) {
			const called = endpoint.endsWith('/')
				? paths.some((path) => path.startsWith(endpoint))
				: paths.includes(endpoint);
			expect(called, `${route.path} never requested ${endpoint} (it asked for: ${paths.join(', ')})`).toBe(true);
		}
	});
}

test('a task detail page and a profile page load from a cold cache', async ({ app, fixture, mock }) => {
	const taskPage = await app(`/task/${fixture.ids.task}`);
	await expect(taskPage).toHaveURL(new RegExp(`/task/${fixture.ids.task}`));
	expect((await mock.calls('/api/tasks/')).length, 'the task detail asked for its task').toBeGreaterThan(0);

	const profilePage = await app(`/profile/${fixture.ids.user}`);
	await expect(profilePage).toHaveURL(new RegExp(`/profile/${fixture.ids.user}`));
});

test('opening the create-project form is what loads the currencies', async ({ app, mock }) => {
	const page = await app('/projects');

	expect(await mock.calls('/api/currency'), 'the projects list alone must not load currencies').toHaveLength(0);

	await page.getByRole('button', { name: /create (new )?project/i }).click();
	await page.locator('#project_title').fill('Playwright Project');
	// Cypress's `.closest('form').submit()` (route-ownership.cy.ts): fire the form's own submit event.
	await page
		.locator('#project_title')
		.locator('xpath=ancestor::form[1]')
		.evaluate((form) => (form as HTMLFormElement).requestSubmit());

	await expect
		.poll(async () => (await mock.paths()).includes('/api/currency'), {
			message: 'the financial step of creating a project never asked for the currencies',
			timeout: 20_000
		})
		.toBe(true);
});
