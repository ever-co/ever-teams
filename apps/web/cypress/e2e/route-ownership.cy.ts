/// <reference types="cypress" />

function requestMatcher(path: string): RegExp {
	const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(path.endsWith('/') ? `${escaped}.*` : `${escaped}(?:\\?.*)?$`);
}

function observeRequests(paths: string[]): string[] {
	return paths.map((path, index) => {
		const alias = `routeOwner${index}`;
		cy.intercept('GET', requestMatcher(path)).as(alias);
		return `@${alias}`;
	});
}

describe('route-owned data on empty-cache hard loads', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	const routes = [
		{ path: '/settings/team', expected: ['/api/invite'] },
		{ path: '/permissions', expected: ['/api/roles'] },
		{ path: '/projects', expected: ['/api/organization-projects'] },
		{ path: '/team/tasks', expected: ['/api/tasks/team'] },
		{ path: '/kanban', expected: ['/api/daily-plan'] },
		{ path: '/reports/weekly-limit', expected: ['/api/organization/'] }
	];

	for (const route of routes) {
		it(`owns required data on ${route.path}`, () => {
			const aliases = observeRequests(route.expected);
			cy.mockScenario({
				delays: Object.fromEntries(
					route.expected.filter((expected) => !expected.endsWith('/')).map((expected) => [expected, 650])
				)
			});
			cy.hardVisit(route.path);
			cy.wait(aliases, { timeout: 20_000 });
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

	it('hard-loads task and profile routes without warmed startup state', () => {
		cy.fixture('bootstrap').then((fixture) => {
			cy.hardVisit(`/task/${fixture.ids.task}`);
			cy.location('pathname').should('include', `/task/${fixture.ids.task}`);
			cy.hardVisit(`/profile/${fixture.ids.user}`);
			cy.location('pathname').should('include', `/profile/${fixture.ids.user}`);
		});
	});

	it('loads currencies only when the project financial step owns them', () => {
		cy.intercept('GET', /\/api\/currency(?:\?.*)?$/).as('projectCurrencies');
		cy.hardVisit('/projects');
		cy.contains('button', /create new project/i, { timeout: 15_000 }).click();
		cy.get('#project_title').type('Synthetic Cypress Project');
		cy.get('#project_title').closest('form').submit();
		cy.wait('@projectCurrencies', { timeout: 20_000 });
		cy.mockRequests().then((requests) => {
			expect(requests.some((request) => request.path === '/api/currency')).to.equal(true);
		});
	});
});
