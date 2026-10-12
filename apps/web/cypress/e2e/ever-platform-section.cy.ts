/// <reference types="cypress" />

/**
 * Settings > Team > Ever Platform in a real browser, against the synthetic API: the connection parts
 * show only while the paired API answers `health` to the signed-in person (the server under test runs
 * with NEXT_PUBLIC_EVER_CONNECT_ENABLED=true), and the statistics card shows the operator's switch to
 * the operator and who manages the statistics to everyone else.
 */

describe('the Ever Platform settings section', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('shows the connection parts and the statistics switch while health answers', () => {
		cy.intercept('GET', '**/api/ever-connect/health').as('health');
		cy.hardVisit('/settings/team');
		cy.wait('@health', { timeout: 20_000 }).then(({ request, response }) => {
			// Asked with the signed-in person's own token.
			expect(String(request.headers.authorization ?? '')).to.match(/^Bearer /);
			expect(response?.statusCode).to.equal(200);
		});
		cy.get('[data-testid="ever-platform-section"]', { timeout: 20_000 }).should('exist');
		cy.get('[data-testid="ever-connect-panel"]').should('exist');
		cy.get('[data-testid="ever-connect-integration"]').should('have.length', 1);
		cy.get('[data-testid="ever-stats-toggle"]').should('exist');
		cy.get('a[href$="#ever-platform"]').should('exist');
	});

	it('hides the connection parts when health answers 404, and keeps the statistics card', () => {
		cy.mockScenario({ connectHealth: false });
		cy.intercept('GET', '**/api/ever-connect/health').as('health');
		cy.hardVisit('/settings/team');
		cy.wait('@health', { timeout: 20_000 }).its('response.statusCode').should('eq', 404);
		cy.get('[data-testid="ever-platform-section"]', { timeout: 20_000 }).should('exist');
		cy.get('[data-testid="ever-stats-card"]').should('exist');
		cy.get('[data-testid="ever-connect-panel"]').should('not.exist');
		cy.get('[data-testid="ever-connect-not-connected"]').should('not.exist');
	});

	it('shows who manages the statistics, and no switch or payload, to someone who is not the operator', () => {
		cy.mockScenario({ statsOperator: false, connectHealth: false });
		cy.intercept('GET', '/api/ever-stats/status').as('status');
		cy.hardVisit('/settings/team');
		cy.wait('@status', { timeout: 20_000 }).then(({ response }) => {
			expect(response?.statusCode).to.equal(404);
			expect(response?.body).to.deep.equal({ statusCode: 404, message: 'Not Found', managed_by: 'operator' });
		});
		cy.get('[data-testid="ever-stats-managed"]', { timeout: 20_000 }).should('contain.text', 'Managed by the instance operator');
		cy.get('[data-testid="ever-stats-toggle"]').should('not.exist');
		cy.get('[data-testid="ever-stats-card"] pre').should('not.exist');
	});
});
