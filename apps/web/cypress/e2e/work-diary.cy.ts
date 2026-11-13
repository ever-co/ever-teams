/// <reference types="cypress" />

const TIME_LOG_PATH = '/api/timesheet/time-log';
const SLOTS_PATH = '/api/timesheet/statistics/time-slots';
const DAY_STRIP = 'ol[aria-label="Days of the period"]';

function dayKeyOf(date: Date) {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

function daysAgo(count: number) {
	const date = new Date();
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() - count);
	return date;
}

const LONG_DAY = new Intl.DateTimeFormat('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

describe('work diary', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it("opens a member's own day, outside the reports that only managers may open", () => {
		cy.mockReset();
		cy.mockScenario({ manager: false });
		cy.syntheticLogin();
		cy.hardVisit('/work-diary');

		cy.contains('h1', 'Work diary', { timeout: 20_000 }).should('be.visible');
		cy.location('pathname').should('match', /\/work-diary$/);
		cy.contains('No time tracked on', { timeout: 20_000 }).should('be.visible');
		cy.get(`${DAY_STRIP} button[aria-pressed="true"]`).should('have.length', 1);
		cy.contains('button', 'Today').should('be.disabled');
		cy.fixture('bootstrap').then((fixture) => {
			cy.mockRequests().then((requests) => {
				const ownReads = requests.filter(
					(request) =>
						[TIME_LOG_PATH, SLOTS_PATH].includes(request.path) &&
						decodeURIComponent(request.query).includes(fixture.ids.employee)
				);
				expect(ownReads.map((request) => request.path)).to.include.members([TIME_LOG_PATH, SLOTS_PATH]);
			});
		});
	});

	it('keeps the picked day in its link, so a reload opens the same day, and Today comes back', () => {
		const start = daysAgo(14);
		cy.hardVisit(`/work-diary?date=${dayKeyOf(start)}`);
		cy.contains(LONG_DAY.format(start), { timeout: 20_000 }).should('be.visible');

		cy.get(`${DAY_STRIP} button[aria-pressed="false"]:not([disabled])`).first().click();
		// Retried until the click's navigation lands: the link already held a date (the start day), so a plain match
		// would pass at once and read the old one.
		cy.location('search').should((search) => {
			const date = new URLSearchParams(search).get('date') ?? '';
			expect(date).to.match(/^\d{4}-\d{2}-\d{2}$/);
			expect(date).not.to.equal(dayKeyOf(start));
		});
		cy.location('search').then((search) => {
			const picked = new URLSearchParams(search).get('date') ?? '';
			cy.reload();
			cy.location('search').should('contain', `date=${picked}`);
			const [year, month, day] = picked.split('-').map(Number);
			cy.contains(LONG_DAY.format(new Date(year, month - 1, day)), { timeout: 20_000 }).should('be.visible');
		});

		cy.contains('button', 'Today').click();
		cy.location('search').should('equal', '');
		cy.contains(LONG_DAY.format(daysAgo(0)), { timeout: 20_000 }).should('be.visible');
	});

	it('is the My work entry of the sidebar, its own page and not the team timesheets', () => {
		cy.hardVisit('/work-diary');
		cy.contains('h1', 'Work diary', { timeout: 20_000 }).should('be.visible');
		cy.contains('a[aria-current="page"]', 'Work diary')
			.should('have.attr', 'href')
			.and('match', /\/work-diary$/);
		cy.get('a[aria-current="page"]').should('have.length', 1);
	});
});
