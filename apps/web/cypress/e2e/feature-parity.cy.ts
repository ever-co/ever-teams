/// <reference types="cypress" />

describe('feature parity on the authenticated shell', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('starts the timer and preserves the canonical IN_PROGRESS taskStatusId on task mutation', () => {
		cy.mockScenario({ hasPlan: false, requirePlanToTrack: false });
		cy.hardVisit('/team/tasks');
		cy.get('button[aria-label="Start timer"]', { timeout: 20_000 })
			.should('have.attr', 'aria-disabled', 'false')
			.click();
		cy.wait(500);
		cy.mockState().then((state) => {
			expect(state.mutationProof).to.deep.equal({
				startedTimer: true,
				updatedTask: true,
				inProgressTaskStatusPreserved: true
			});
		});
	});

	it('blocks timer mutation only when the team requires a missing plan', () => {
		cy.mockScenario({ hasPlan: false, requirePlanToTrack: true });
		cy.hardVisit('/team/tasks');
		cy.get('button[aria-label="Start timer"]', { timeout: 15_000 }).click({ force: true });
		cy.wait(250);
		cy.mockState().then((state) => expect(state.mutationProof.startedTimer).to.equal(false));
	});

	it('keeps roles, permission controls, invitations, and public teams available', () => {
		cy.hardVisit('/permissions');
		cy.contains('Roles & Permissions', { timeout: 15_000 }).should('be.visible');
		cy.contains('ADMIN', { timeout: 15_000 }).click();
		cy.contains('Activated').should('exist');

		cy.hardVisit('/settings/team');
		cy.wait(250);
		cy.mockRequests().then((requests) => {
			expect(requests.some((request) => request.path === '/api/invite')).to.equal(true);
		});

		cy.fixture('bootstrap').then((fixture) => {
			cy.clearCookies({ log: false });
			cy.visit(`/team/${fixture.ids.teamA}/${fixture.profileLink}`);
			cy.get('body').should('be.visible');
			cy.wait(250);
			cy.mockRequests().then((requests) => {
				expect(requests.some((request) => request.path.startsWith('/api/public/team/'))).to.equal(true);
			});
		});
	});

	it('does not let a delayed A owner overwrite the resolved B scope', () => {
		cy.fixture('bootstrap').then((fixture) => {
			cy.mockScenario({ delays: { [`${fixture.ids.tenantA}:/api/daily-plan`]: 900 } });
			cy.hardVisit('/team/tasks');
			cy.syntheticLogin('B');
			cy.reload();
			cy.waitForShellReady();
			cy.contains(fixture.names.teamB, { timeout: 15_000 }).should('exist');
			cy.wait(1_000);
			cy.contains(fixture.names.teamB).should('exist');
			cy.mockRequests().then((requests) => {
				const teamPlans = requests.filter((request) => request.path === '/api/daily-plan');
				const lastScope = new URLSearchParams(teamPlans.at(-1)?.query).get('where[tenantId]');
				expect(lastScope).to.equal(fixture.ids.tenantB);
			});
		});
	});
});
