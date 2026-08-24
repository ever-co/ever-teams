/// <reference types="cypress" />

describe('route-owned data on empty-cache hard loads', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	const routes = [
		{ path: '/settings/team', expected: ['/api/employee', '/api/invite'] },
		{ path: '/permissions', expected: ['/api/roles'] },
		{ path: '/projects', expected: ['/api/organization-projects'] },
		{ path: '/team/tasks', expected: ['/api/daily-plan'] },
		{ path: '/kanban', expected: ['/api/daily-plan'] },
		{ path: '/reports/weekly-limit', expected: ['/api/organization/'] }
	];

	for (const route of routes) {
		it(`owns required data on ${route.path}`, () => {
			cy.hardVisit(route.path);
			cy.wait(350);
			cy.mockRequests().then((requests) => {
				for (const expected of route.expected) {
					expect(
						requests.some((request) =>
							expected.endsWith('/') ? request.path.startsWith(expected) : request.path === expected
						),
						`${route.path} request ${expected}`
					).to.equal(true);
				}
			});
		});
	}

	it('hard-loads task and profile routes without warmed legacy startup state', () => {
		cy.fixture('bootstrap').then((fixture) => {
			cy.hardVisit(`/task/${fixture.ids.task}`);
			cy.location('pathname').should('include', `/task/${fixture.ids.task}`);
			cy.hardVisit(`/profile/${fixture.ids.user}`);
			cy.location('pathname').should('include', `/profile/${fixture.ids.user}`);
		});
	});

	it('loads currencies only when the project financial step owns them', () => {
		cy.hardVisit('/projects');
		cy.contains('button', /create new project/i, { timeout: 15_000 }).click();
		cy.get('#project_title').type('Synthetic Cypress Project');
		cy.get('#project_title').closest('form').find('button[type="submit"]').click();
		cy.wait(250);
		cy.mockRequests().then((requests) => {
			expect(requests.some((request) => request.path === '/api/currency')).to.equal(true);
		});
	});
});
