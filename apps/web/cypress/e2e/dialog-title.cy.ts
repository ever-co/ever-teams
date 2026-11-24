/// <reference types="cypress" />

// cspell:ignore Erstellen einen heute

/**
 * The header of the app's dialogs, on the sheet a person without a plan for today gets when pressing Start (#5736).
 * In German the title is longer than a phone's line: it was cut with an ellipsis and lost "heute" (today).
 */
const START = 'button[aria-label="Start timer"]';
const GERMAN_TITLE = 'Erstellen Sie einen Plan für heute';
const ENGLISH_TITLE = 'Create a plan for today';
const ONE_LINE = 20;

function openNoPlanSheet(path: string) {
	// The sheet opens once the person's plans are read: until then Start cannot tell that today has none
	cy.intercept('GET', /\/api\/daily-plan\/me(?:\?.*)?$/).as('plans');
	cy.hardVisit(path);
	cy.wait('@plans', { timeout: 20_000 });
	cy.get(START, { timeout: 20_000 }).should('have.attr', 'aria-disabled', 'false');
	cy.wait(1000);
	cy.get(START).first().click({ force: true });
}

function titleOf(text: string) {
	return cy.contains('[role="dialog"] h2', text, { timeout: 15_000 }).should('be.visible');
}

describe('the title of a dialog', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
		cy.mockScenario({ hasPlan: false, requirePlanToTrack: true, planDate: '2020-01-01' });
	});

	it('shows a long title whole on a phone, on two lines', () => {
		cy.viewport(375, 812);
		openNoPlanSheet('/de/team/tasks');

		titleOf(GERMAN_TITLE).then(($title) => {
			const title = $title[0];
			expect(title.scrollWidth, 'nothing is cut on the side').to.be.at.most(title.clientWidth);
			expect(title.scrollHeight, 'nothing is cut below').to.be.at.most(title.clientHeight);
			expect(title.clientHeight, 'two lines').to.equal(2 * ONE_LINE);
		});
	});

	it('keeps a title that fits on one line as it was on a phone', () => {
		cy.viewport(375, 812);
		openNoPlanSheet('/team/tasks');

		titleOf(ENGLISH_TITLE).then(($title) => {
			const title = $title[0];
			expect(title.clientHeight, 'one line').to.equal(ONE_LINE);
			expect(title.parentElement?.clientHeight, 'the height of the header').to.equal(52);
		});
	});

	it('keeps a long title on one line from the width where the dialog leaves the bottom edge', () => {
		cy.viewport(768, 1024);
		openNoPlanSheet('/de/team/tasks');

		titleOf(GERMAN_TITLE).then(($title) => {
			const title = $title[0];
			expect(title.clientHeight, 'one line').to.equal(ONE_LINE);
			expect(title.parentElement?.clientHeight, 'the height of the header').to.equal(52);
		});
	});
});
