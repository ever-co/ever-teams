/// <reference types="cypress" />

/**
 * The operator's switch in Settings > Team > Ever Platform is stored in the paired API, and the web
 * app's own statistics reporter follows it: switched off, no report reaches Ever Platform; switched
 * back on, the next one does.
 *
 * The server under test runs with EVER_STATS_SEND_INTERVAL_S=5 and EVER_STATS_API_URL pointing at the
 * SDK's Ever Platform API mock (cypress.config.ts), which checks the signature and the schema of
 * every report it accepts.
 */

type StatsReport = { instanceId: string; period: string; product: string };

const INTERVAL_S = 5;

function teamsReports(): Cypress.Chainable<StatsReport[]> {
	return cy.task('stats:reports', null, { log: false }) as Cypress.Chainable<StatsReport[]>;
}

/** Waits until more than `count` reports were accepted. */
function waitForReportsAbove(count: number, timeoutMs = 30_000): Cypress.Chainable<StatsReport[]> {
	let deadline: number | undefined;
	const poll = (): Cypress.Chainable<StatsReport[]> =>
		teamsReports().then((reports) => {
			// The deadline starts when the first poll runs, not when the command is queued.
			deadline ??= Date.now() + timeoutMs;
			if (reports.length > count) return cy.wrap(reports, { log: false });
			if (Date.now() > deadline) throw new Error(`no new statistics report within ${timeoutMs} ms`);
			return cy.wait(1_000, { log: false }).then(poll);
		});
	return poll();
}

describe('the anonymous usage statistics switch', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.task('stats:reset', null, { log: false });
		cy.syntheticLogin();
	});

	it('stops the web app reports when the operator switches it off, and resumes them when it is back on', () => {
		// On by default, paired with the API: signed frontend reports arrive.
		waitForReportsAbove(0).then((reports) => {
			expect(reports.every((report) => report.product === 'teams')).to.equal(true);
		});

		cy.intercept('PUT', '/api/ever-stats/enabled').as('toggle');
		cy.hardVisit('/settings/team');
		cy.get('[data-testid="ever-platform-section"]', { timeout: 20_000 }).should('exist');
		cy.get('[data-testid="ever-stats-toggle"]').should('have.attr', 'aria-checked', 'true').click();
		cy.wait('@toggle').its('response.statusCode').should('eq', 200);

		// The switch is stored in the paired API, set with the operator's own token and a boolean only.
		cy.mockState().then((state) => {
			expect(state.scenario.statsEnabledUi).to.equal(false);
			expect(state.everPlatform.toggles).to.deep.equal([{ enabled: false, withBearer: true, keys: ['enabled'] }]);
		});
		cy.get('[data-testid="ever-stats-toggle"]').should('have.attr', 'aria-checked', 'false');

		// A report already on its way when the switch moved may still land: count from one interval later.
		cy.wait(INTERVAL_S * 1_000 + 1_000);
		teamsReports().then((before) => {
			// Three intervals and more: nothing new.
			cy.wait(INTERVAL_S * 1_000 * 4);
			teamsReports().its('length').should('eq', before.length);

			cy.get('[data-testid="ever-stats-toggle"]').click();
			cy.wait('@toggle').its('response.statusCode').should('eq', 200);
			cy.get('[data-testid="ever-stats-toggle"]').should('have.attr', 'aria-checked', 'true');
			waitForReportsAbove(before.length, INTERVAL_S * 1_000 * 4);
		});
	});

	it('sends nothing while the paired API does not serve this web app (unpaired: state answers 404)', () => {
		cy.mockScenario({ statsPaired: false });
		cy.wait(INTERVAL_S * 1_000 + 1_000);
		cy.mockState().then((stateBefore) => {
			teamsReports().then((before) => {
				cy.wait(INTERVAL_S * 1_000 * 3);
				teamsReports().then((after) => {
					// The reporter kept asking the paired API (so it was running), and sent nothing.
					expect(after, 'reports while unpaired').to.have.length(before.length);
				});
				cy.mockState().then((stateAfter) => {
					expect(stateAfter.everPlatform.stateReads, 'state reads').to.be.greaterThan(stateBefore.everPlatform.stateReads);
				});
			});
		});
	});
});
