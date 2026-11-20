import { expect, test } from '../../fixtures';
import { mockRequestsWhen } from '../../helpers';

/** The reads the phase checks below need, all answered: the shell can be ready before the last of them is. */
const PHASE_PATHS = [
	'/api/user/me',
	'/api/auth/workspaces',
	'/api/organization-team',
	'/api/tasks/team',
	'/api/timesheet/timer/status',
	'/api/daily-plan/me',
	'/api/task-metadata/bootstrap'
];

/**
 * The contract the rest of the suite stands on: a signed-in person hard-loading /team/tasks walks
 * user -> workspace -> team -> task, exactly once each, and the shell renders the fixture team.
 * If this file is red, every other spec here is meaningless.
 */
test.describe('authenticated shell', () => {
	test('hard-loads through user, workspace, team and task phases in that order', async ({ app, mock }) => {
		await mock.scenario({ requirePlanToTrack: true });
		const page = await app('/team/tasks');

		const requests = await mockRequestsWhen((log) => PHASE_PATHS.every((path) => log.some((r) => r.path === path)));
		const paths = requests.map((request) => request.path);
		// The mock logs a request once it has answered it, so the log's order is the order of the answers. The
		// phase order is when each phase was first asked: the earliest `startMs` of its path (NaN when never asked).
		const firstAsked = (path: string) => {
			const starts = requests.filter((request) => request.path === path).map((request) => request.startMs);
			return starts.length > 0 ? Math.min(...starts) : Number.NaN;
		};
		const user = firstAsked('/api/user/me');
		const workspaces = firstAsked('/api/auth/workspaces');
		const teams = firstAsked('/api/organization-team');
		const tasks = firstAsked('/api/tasks/team');

		expect(user, 'user phase').not.toBeNaN();
		expect(workspaces, 'workspace phase').toBeGreaterThan(user);
		expect(teams, 'team phase').toBeGreaterThan(workspaces);
		expect(tasks, 'task phase').toBeGreaterThan(teams);
		expect(paths).toContain('/api/timesheet/timer/status');
		expect(paths).toContain('/api/daily-plan/me');

		// The metadata bundle is fetched once per load, not once per widget: counted once the page's own requests have
		// settled, so a duplicate that is still on its way (the mock logs a request when it answers it) is counted too.
		await page.waitForLoadState('networkidle');
		const settled = (await mock.requests()).filter((request) => request.path === '/api/task-metadata/bootstrap');
		expect(settled, 'the metadata bundle was fetched more than once').toHaveLength(1);

		await expect(page).toHaveURL(/\/team\/tasks/);
	});

	test('does not read personal plans when the team does not require a plan', async ({ app, mock }) => {
		await mock.scenario({ requirePlanToTrack: false, hasPlan: false });
		await app('/team/tasks');

		const paths = await mock.paths();
		expect(paths).toContain('/api/tasks/team');
		expect(paths).toContain('/api/timesheet/timer/status');
		expect(paths).not.toContain('/api/daily-plan/me');
	});

	test('reads the task metadata bundle instead of separate profile activity reads', async ({ app, mock }) => {
		await mock.scenario({ requirePlanToTrack: true });
		await app('/team/tasks');

		const paths = await mock.paths();
		expect(paths).toContain('/api/task-metadata/bootstrap');
		expect(paths.some((path) => path.startsWith('/api/timesheet/statistics/profile-activity'))).toBe(false);
	});

	test('scope A renders the fixture team of scope A, and nothing of scope B', async ({ app, fixture }) => {
		const page = await app('/team/tasks', { scope: 'A' });
		// The header's team switcher names the active team (core/components/teams/teams-dropdown.tsx); the breadcrumb
		// repeats the name as a link, so the text alone is not one element.
		await expect(page.getByRole('button', { name: fixture.names.teamA })).toBeVisible();
		await expect(page.getByText(fixture.names.teamB)).toHaveCount(0);
	});

	test('a deterministic run never answers a Gauzy route with a 4xx or 5xx', async ({ app, mock }) => {
		await mock.scenario({ requirePlanToTrack: true });
		await app('/team/tasks');

		expect(await mock.failures()).toEqual([]);
	});
});
