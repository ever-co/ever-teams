/// <reference types="cypress" />

/**
 * #5022, time tracking: a timer left running is worth a reminder at the employee's threshold (8 hours unless they
 * chose another), with the actions to stop it or open it.
 */
const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

interface MockState {
	scenario: { timerRunning?: boolean };
	requests: Array<{ path: string }>;
	notificationSetting: { preferences?: { timerReminderHours?: number | null } } | null;
}

/** The mock's state once `isReady` holds, read again every half second (a task's answer is not retried). */
function mockStateWhen(isReady: (state: MockState) => boolean, tries = 40): Cypress.Chainable<MockState> {
	return cy.mockState().then((state) => {
		const current = state as MockState;
		if (isReady(current) || tries <= 0) {
			return cy.wrap(current, { log: false });
		}
		return cy.wait(500, { log: false }).then(() => mockStateWhen(isReady, tries - 1));
	});
}

describe('long-running timer reminders', () => {
	beforeEach(() => {
		cy.mockReset();
		cy.syntheticLogin();
	});

	it('reminds of a timer running for eight hours, and stops it from the reminder', () => {
		cy.mockScenario({ timerRunning: true, timerStartedAt: hoursAgo(9) });
		cy.hardVisit('/');

		cy.contains('Your timer has been running for 8 hours', { timeout: 30_000 }).should('be.visible');
		// The reminder's own button: the page's timer has one with the same name
		cy.get('[data-sonner-toast]').contains('button', 'Stop timer').click();

		cy.contains('Your timer has been running for 8 hours').should('not.exist');
		mockStateWhen((state) => state.scenario.timerRunning === false)
			.its('scenario.timerRunning')
			.should('equal', false);
	});

	it("follows the employee's threshold: none before it", () => {
		cy.mockScenario({
			timerRunning: true,
			timerStartedAt: hoursAgo(9),
			notificationPreferences: { timerReminderHours: 10 }
		});
		cy.hardVisit('/');

		// Once the timer's status and the preferences were read, still no reminder before ten hours
		const hasRead = (state: MockState, path: string) => state.requests.some((request) => request.path === path);
		mockStateWhen(
			(state) =>
				hasRead(state, '/api/timesheet/timer/status') && hasRead(state, '/api/employee-notification-setting')
		).then((state) => {
			expect(hasRead(state, '/api/employee-notification-setting')).to.equal(true);
		});
		cy.contains('Your timer has been running').should('not.exist');
	});

	it('saves the threshold in the notification settings', () => {
		cy.hardVisit('/settings/personal/notifications');

		cy.contains('Long-running timer reminder', { timeout: 30_000 }).should('be.visible');
		cy.contains('button', 'After 8 hours').click();
		cy.contains('[role="option"]', 'After 4 hours').click();

		mockStateWhen((state) => state.notificationSetting?.preferences?.timerReminderHours === 4)
			.its('notificationSetting.preferences.timerReminderHours')
			.should('equal', 4);
	});
});
