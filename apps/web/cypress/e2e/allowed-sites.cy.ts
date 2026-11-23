/// <reference types="cypress" />

/**
 * Settings > Security > "Sites you signed in from" in a real browser, against the synthetic API (#5595): the sites
 * a person allowed to use their timer are listed with the date until which each can renew its sign-in, and one is
 * ended after a confirmation. A server without embeds answers 404 and shows nothing.
 */

const SECURITY_PAGE = '/settings/personal/security';

const SECTION = '#allowed-sites';

describe('the sites a person signed in from', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('shows nothing on a server without embeds', () => {
		cy.intercept('GET', '**/api/embed/grants').as('grants');
		cy.hardVisit(SECURITY_PAGE);
		cy.wait('@grants', { timeout: 20_000 }).its('response.statusCode').should('eq', 404);
		cy.get(SECTION).should('not.exist');
	});

	it('lists the sites with the date each can renew its sign-in until', () => {
		cy.mockScenario({ siteGrants: true });
		cy.intercept('GET', '**/api/embed/grants').as('grants');
		cy.hardVisit(SECURITY_PAGE);
		cy.wait('@grants', { timeout: 20_000 }).its('response.statusCode').should('eq', 200);
		cy.get(SECTION, { timeout: 20_000 }).should('contain.text', 'Sites you signed in from');
		cy.get(SECTION)
			.should('contain.text', 'https://notes.example.com')
			.and('contain.text', 'https://wiki.example.com');
		cy.get(SECTION).should('contain.text', 'Can renew the sign-in until');
	});

	it('ends one site after a confirmation, and keeps the other', () => {
		cy.mockScenario({ siteGrants: true });
		cy.intercept('DELETE', '**/api/embed/grants/*').as('end');
		cy.hardVisit(SECURITY_PAGE);
		cy.get(SECTION, { timeout: 20_000 }).should('contain.text', 'https://notes.example.com');

		cy.get('button[aria-label="End: notes.example.com"]').click();
		cy.contains('[role="dialog"], [role="alertdialog"]', 'End the sign-in from notes.example.com?').should(
			'be.visible'
		);
		cy.contains('[role="dialog"] button, [role="alertdialog"] button', /^End$/).click();

		cy.wait('@end', { timeout: 20_000 }).then(({ request, response }) => {
			expect(request.url).to.match(/\/api\/embed\/grants\/grant-notes$/);
			expect(response?.statusCode).to.equal(204);
		});
		cy.get(SECTION).should('not.contain.text', 'https://notes.example.com');
		cy.get(SECTION).should('contain.text', 'https://wiki.example.com');
	});

	it('fits the width of a phone', () => {
		cy.mockScenario({ siteGrants: true });
		cy.viewport(375, 812);
		cy.hardVisit(SECURITY_PAGE);
		cy.get(SECTION, { timeout: 20_000 }).should('contain.text', 'https://notes.example.com');
		cy.get(SECTION).scrollIntoView();
		// Nothing of the section runs past the width of the phone
		cy.get(SECTION).then(($section) => {
			const box = $section[0].getBoundingClientRect();
			expect(box.right).to.be.at.most(375);
		});
		cy.get('button[aria-label="End: notes.example.com"]').should('be.visible');
	});
});
