/// <reference types="cypress" />

describe('fast authenticated startup', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('hard-loads the shell through user, workspace, team, and critical feature phases', () => {
		cy.hardVisit('/team/tasks');
		cy.wait(300);
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
			if (Cypress.env('FAST_APP_BOOTSTRAP')) expect(bundles).to.have.length(1);
			else expect(bundles).to.have.length(0);
		});
	});

	it('loads personal plans even when the team does not require a plan', () => {
		cy.mockScenario({ requirePlanToTrack: false, hasPlan: false });
		cy.hardVisit('/team/tasks');
		cy.wait(250);
		cy.mockRequests().then((requests) => {
			expect(requests.some((request) => request.path === '/api/daily-plan/me')).to.equal(true);
		});
	});

	it('keeps the legacy flag-off path free of fast-only endpoints', () => {
		cy.hardVisit('/team/tasks');
		cy.wait(250);
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
		cy.hardVisit('/team/tasks');
		cy.wait(250);
		cy.mockRequests().then((before) => {
			cy.rotateSyntheticAccessToken();
			cy.wait(350);
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
