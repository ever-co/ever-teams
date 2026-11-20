import { expect, test } from '../../fixtures';

/**
 * The contract the rest of the suite stands on: a signed-in person hard-loading /team/tasks walks
 * user -> workspace -> team -> task, exactly once each, and the shell renders the fixture team.
 * If this file is red, every other spec here is meaningless.
 */
test.describe('authenticated shell', () => {
	test('hard-loads through user, workspace, team and task phases in that order', async ({ app, mock }) => {
		await mock.scenario({ requirePlanToTrack: true });
		const page = await app('/team/tasks');

		const paths = await mock.paths();
		const user = paths.indexOf('/api/user/me');
		const workspaces = paths.indexOf('/api/auth/workspaces');
		const teams = paths.indexOf('/api/organization-team');
		const tasks = paths.indexOf('/api/tasks/team');

		expect(user, 'user phase').toBeGreaterThan(-1);
		expect(workspaces, 'workspace phase').toBeGreaterThan(user);
		expect(teams, 'team phase').toBeGreaterThan(workspaces);
		expect(tasks, 'task phase').toBeGreaterThan(teams);
		expect(paths).toContain('/api/timesheet/timer/status');
		expect(paths).toContain('/api/daily-plan/me');

		// The metadata bundle is fetched once per load, not once per widget.
		expect(paths.filter((path) => path === '/api/task-metadata/bootstrap')).toHaveLength(1);

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
		await expect(page.getByText(fixture.names.teamA)).toBeVisible();
		await expect(page.getByText(fixture.names.teamB)).toHaveCount(0);
	});

	test('a deterministic run never answers a Gauzy route with a 4xx or 5xx', async ({ app, mock }) => {
		await mock.scenario({ requirePlanToTrack: true });
		await app('/team/tasks');

		expect(await mock.failures()).toEqual([]);
	});
});
