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

describe('fast authenticated startup', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('hard-loads the shell through user, workspace, team, and critical feature phases', () => {
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
			if (Cypress.env('FAST_APP_BOOTSTRAP')) {
				expect(workspaceIndex, 'workspace phase').to.be.greaterThan(userIndex);
				expect(teamIndex, 'team phase').to.be.greaterThan(workspaceIndex);
				expect(taskIndex, 'task phase').to.be.greaterThan(teamIndex);
			} else {
				expect(workspaceIndex, 'workspace request').to.be.greaterThan(-1);
				expect(teamIndex, 'team request').to.be.greaterThan(-1);
				expect(taskIndex, 'task request').to.be.greaterThan(-1);
			}
			expect(paths).to.include('/api/timesheet/timer/status');
			expect(paths).to.include('/api/daily-plan/me');

			const bundles = paths.filter((path) => path === '/api/task-metadata/bootstrap');
			if (Cypress.env('FAST_APP_BOOTSTRAP')) expect(bundles).to.have.length(1);
			else expect(bundles).to.have.length(0);
		});
	});

	it('loads personal plans even when the team does not require a plan', () => {
		cy.mockScenario({ requirePlanToTrack: false, hasPlan: false });
		cy.intercept('GET', /\/api\/daily-plan\/me(?:\?.*)?$/).as('personalPlans');
		cy.hardVisit('/team/tasks');
		cy.wait('@personalPlans', { timeout: 20_000 });
		cy.mockRequests().then((requests) => {
			expect(requests.some((request) => request.path === '/api/daily-plan/me')).to.equal(true);
		});
	});

	it('keeps the legacy flag-off path free of fast-only endpoints', () => {
		observeCriticalStartup();
		if (Cypress.env('FAST_APP_BOOTSTRAP')) {
			cy.intercept('GET', /\/api\/task-metadata\/bootstrap(?:\?.*)?$/).as('fastMetadata');
		}
		cy.hardVisit('/team/tasks');
		cy.wait([...criticalStartupAliases], { timeout: 20_000 });
		if (Cypress.env('FAST_APP_BOOTSTRAP')) cy.wait('@fastMetadata', { timeout: 20_000 });
		cy.mockRequests().then((requests) => {
			const fastCalls = requests.filter(
				(request) =>
					request.path === '/api/task-metadata/bootstrap' ||
					request.path === '/api/timesheet/statistics/profile-activity'
			);
			if (Cypress.env('FAST_APP_BOOTSTRAP')) {
				expect(fastCalls.some((request) => request.path === '/api/task-metadata/bootstrap')).to.equal(true);
			} else {
				expect(fastCalls).to.deep.equal([]);
			}
		});
	});

	it('re-owns long-lived scoped reads after access-token rotation', () => {
		observeCriticalStartup();
		cy.hardVisit('/team/tasks');
		cy.wait([...criticalStartupAliases], { timeout: 20_000 });
		cy.mockRequests().then((before) => {
			if (Cypress.env('FAST_APP_BOOTSTRAP')) observeRotatedScopedReads();
			cy.rotateSyntheticAccessToken();
			if (Cypress.env('FAST_APP_BOOTSTRAP')) cy.wait([...rotatedScopedAliases], { timeout: 20_000 });
			cy.mockRequests().then((after) => {
				const fastOnly = after.filter(
					(request) =>
						request.path === '/api/task-metadata/bootstrap' ||
						request.path === '/api/timesheet/statistics/profile-activity'
				);
				if (!Cypress.env('FAST_APP_BOOTSTRAP')) {
					expect(fastOnly).to.deep.equal([]);
					return;
				}

				for (const scopedPath of ['/api/tasks/team', '/api/timesheet/timer/status', '/api/daily-plan/me']) {
					const count = (requests: typeof after) =>
						requests.filter((request) => request.path === scopedPath).length;
					expect(count(after), `${scopedPath} rotated refetch`).to.be.greaterThan(count(before));
				}
			});
		});
	});
});
