/// <reference types="cypress" />

const criticalStartupAliases = [
	'@startupUser',
	'@startupWorkspaces',
	'@startupTeams',
	'@startupTasks',
	'@startupTimer',
	'@startupPlans'
] as const;
const rotatedScopedAliases = ['@rotatedTasks', '@rotatedTimer', '@rotatedPlans'] as const;

function observeCriticalStartup() {
	cy.intercept('GET', /\/api\/user\/me(?:\?.*)?$/).as('startupUser');
	cy.intercept('GET', /\/api\/auth\/workspaces(?:\?.*)?$/).as('startupWorkspaces');
	cy.intercept('GET', /\/api\/organization-team(?:\?.*)?$/).as('startupTeams');
	cy.intercept('GET', /\/api\/tasks\/team(?:\?.*)?$/).as('startupTasks');
	cy.intercept('GET', /\/api\/timesheet\/timer\/status(?:\?.*)?$/).as('startupTimer');
	cy.intercept('GET', /\/api\/daily-plan\/me(?:\?.*)?$/).as('startupPlans');
}

function observeRotatedScopedReads() {
	cy.intercept('GET', /\/api\/tasks\/team(?:\?.*)?$/).as('rotatedTasks');
	cy.intercept('GET', /\/api\/timesheet\/timer\/status(?:\?.*)?$/).as('rotatedTimer');
	cy.intercept('GET', /\/api\/daily-plan\/me(?:\?.*)?$/).as('rotatedPlans');
}

describe('authenticated startup', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('hard-loads the shell through user, workspace, team, and critical feature phases', () => {
		cy.mockScenario({ requirePlanToTrack: true });
		observeCriticalStartup();
		cy.hardVisit('/team/tasks');
		cy.wait([...criticalStartupAliases], { timeout: 20_000 });
		cy.mockRequests().then((requests) => {
			const paths = requests.map((request) => request.path);
			const userIndex = paths.indexOf('/api/user/me');
			const workspaceIndex = paths.indexOf('/api/auth/workspaces');
			const teamIndex = paths.indexOf('/api/organization-team');
			const taskIndex = paths.indexOf('/api/tasks/team');

			expect(userIndex, 'user phase').to.be.greaterThan(-1);
			expect(workspaceIndex, 'workspace phase').to.be.greaterThan(userIndex);
			expect(teamIndex, 'team phase').to.be.greaterThan(workspaceIndex);
			expect(taskIndex, 'task phase').to.be.greaterThan(teamIndex);
			expect(paths).to.include('/api/timesheet/timer/status');
			expect(paths).to.include('/api/daily-plan/me');

			const bundles = paths.filter((path) => path === '/api/task-metadata/bootstrap');
			expect(bundles).to.have.length(1);
		});
	});

	it('does not load personal plans when the team does not require a plan', () => {
		cy.mockScenario({ requirePlanToTrack: false, hasPlan: false });
		cy.intercept('GET', /\/api\/tasks\/team(?:\?.*)?$/).as('startupTasksWithoutPlans');
		cy.intercept('GET', /\/api\/timesheet\/timer\/status(?:\?.*)?$/).as('startupTimerWithoutPlans');
		cy.hardVisit('/team/tasks');
		cy.wait(['@startupTasksWithoutPlans', '@startupTimerWithoutPlans'], { timeout: 20_000 });
		cy.wait(300);
		cy.mockRequests().then((requests) => {
			expect(requests.some((request) => request.path === '/api/daily-plan/me')).to.equal(false);
		});
	});

	it('uses the metadata bundle without starting profile activity reads', () => {
		cy.mockScenario({ requirePlanToTrack: true });
		observeCriticalStartup();
		cy.intercept('GET', /\/api\/task-metadata\/bootstrap(?:\?.*)?$/).as('metadata');
		cy.hardVisit('/team/tasks');
		cy.wait([...criticalStartupAliases], { timeout: 20_000 });
		cy.wait('@metadata', { timeout: 20_000 });
		cy.mockRequests().then((requests) => {
			const scopedCalls = requests.filter(
				(request) =>
					request.path === '/api/task-metadata/bootstrap' ||
					request.path === '/api/timesheet/statistics/profile-activity'
			);
			expect(scopedCalls.filter((request) => request.path === '/api/task-metadata/bootstrap')).to.have.length(1);
			expect(
				scopedCalls.some((request) => request.path === '/api/timesheet/statistics/profile-activity')
			).to.equal(false);
		});
	});

	it('re-owns long-lived scoped reads after access-token rotation', () => {
		cy.mockScenario({ requirePlanToTrack: true });
		observeCriticalStartup();
		cy.hardVisit('/team/tasks');
		cy.wait([...criticalStartupAliases], { timeout: 20_000 });
		cy.mockRequests().then((before) => {
			observeRotatedScopedReads();
			cy.rotateSyntheticAccessToken();
			cy.wait([...rotatedScopedAliases], { timeout: 20_000 });
			cy.mockRequests().then((after) => {
				for (const scopedPath of ['/api/tasks/team', '/api/timesheet/timer/status', '/api/daily-plan/me']) {
					const count = (requests: typeof after) =>
						requests.filter((request) => request.path === scopedPath).length;
					expect(count(after), `${scopedPath} rotated refetch`).to.be.greaterThan(count(before));
				}
			});
		});
	});
});
