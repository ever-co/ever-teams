/// <reference types="cypress" />

/**
 * Reports, Timesheets, List on a phone (#5697): a row of one entry kept its status, its time and its member on one
 * line, and cut the status to its glyph and the member to three letters.
 */
const TIMESHEETS = '/reports/timesheet/';
const STATUSES = ['Pending', 'Approved', 'Rejected', 'In review'];

describe('the timesheets list on a phone', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
		cy.mockScenario({ timeLogs: true });
		cy.viewport(375, 812);
	});

	it('shows the status and the member of every entry whole', () => {
		cy.fixture('bootstrap').then((fixture) => {
			cy.hardVisit(`${TIMESHEETS}${fixture.ids.user}`);
			cy.contains('button, [role="tab"], [role="radio"]', /^List$/, { timeout: 20_000 }).click({ force: true });

			for (const status of STATUSES) {
				cy.contains('[role="row"] .chip-3d:visible .truncate', status, { timeout: 20_000 }).then(($word) => {
					const word = $word[0];
					expect(word.clientWidth, `${status} is not cut`).to.be.at.least(word.scrollWidth);
				});
			}
			const members = [fixture.names.teammate, fixture.names.user];
			cy.get('[role="row"] span.truncate:visible')
				.filter((_index, element) => members.includes(element.textContent ?? ''))
				.should('have.length', STATUSES.length)
				.each(($member) => {
					const member = $member[0];
					expect(member.clientWidth, `${member.textContent} is not cut`).to.be.at.least(member.scrollWidth);
				});
		});
	});
});
