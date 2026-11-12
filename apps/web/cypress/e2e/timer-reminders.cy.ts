/// <reference types="cypress" />

/**
 * #5022, time tracking: a timer left running is worth a reminder at the employee's threshold (8 hours unless they
 * chose another), with the actions to stop it or open it. The platform reminds of it too while no tab is open (in the
 * inbox, by email or push): a tab does not repeat what the person already got from it, and marks read the platform's
 * copy of a reminder it showed, so that its email and push do not follow.
 */
const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

interface MockState {
	scenario: { timerRunning?: boolean; notifications?: Array<{ isRead?: boolean }> };
	requests: Array<{ path: string; status: number }>;
	notificationSetting: { preferences?: { timerReminderHours?: number | null } } | null;
}

const hasRead = (state: MockState, path: string) => state.requests.some((request) => request.path === path);

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

	describe("with the platform's own reminders (it reminds of a run while no tab is open)", () => {
		const timerLogId = 'aaaaaaaa-0000-4000-8000-000000005022';
		/** The platform's first reminder of a run, unread: it went by email or push. */
		const platformReminder = (entityId: string) => ({
			id: 'bbbbbbbb-0000-4000-8000-000000005022',
			type: 'TimerReminder',
			entity: 'TimeLog',
			entityId,
			title: 'Your timer has been running for 8 hours',
			message: 'Stop it if you are done, or keep it running.',
			isRead: false,
			isArchived: false,
			createdAt: hoursAgo(1)
		});

		it('does not repeat a reminder the person already got from it', () => {
			cy.mockScenario({
				timerRunning: true,
				timerStartedAt: hoursAgo(9),
				timerLogId,
				notifications: [platformReminder(timerLogId)]
			});
			cy.hardVisit('/');

			mockStateWhen(
				(state) =>
					hasRead(state, '/api/timesheet/timer/status') &&
					hasRead(state, '/api/employee-notification-setting') &&
					hasRead(state, '/api/employee-notification')
			).then((state) => {
				expect(hasRead(state, '/api/employee-notification')).to.equal(true);
			});
			// The reminder is due since an hour: the tab would show it at once, had the platform not reminded of it
			cy.wait(3000);
			cy.contains('[data-sonner-toast]', 'Your timer has been running').should('not.exist');
		});

		it('marks its copy read once the tab showed the reminder of a desktop timer, so that no email or push follows', () => {
			cy.mockScenario({
				timerRunning: true,
				timerStartedAt: hoursAgo(9),
				timerLogId,
				timerSource: 'DESKTOP',
				// Filed moments ago, unread: the platform holds its email and push for a tab to mark it read
				notifications: [
					{ ...platformReminder(timerLogId), createdAt: new Date(Date.now() - 30_000).toISOString() }
				]
			});
			cy.hardVisit('/');

			cy.contains('[data-sonner-toast]', 'Your timer has been running for 8 hours', { timeout: 30_000 }).should(
				'be.visible'
			);
			mockStateWhen((state) => state.scenario.notifications?.[0]?.isRead === true)
				.its('scenario.notifications.0.isRead')
				.should('equal', true);
		});

		it('still reminds when its reminder is about another run', () => {
			cy.mockScenario({
				timerRunning: true,
				timerStartedAt: hoursAgo(9),
				timerLogId,
				notifications: [platformReminder('aaaaaaaa-0000-4000-8000-000000000000')]
			});
			cy.hardVisit('/');

			cy.contains('[data-sonner-toast]', 'Your timer has been running for 8 hours', { timeout: 30_000 }).should(
				'be.visible'
			);
		});
	});

	it("follows the employee's threshold: none before it", () => {
		cy.mockScenario({
			timerRunning: true,
			timerStartedAt: hoursAgo(9),
			notificationPreferences: { timerReminderHours: 10 }
		});
		cy.hardVisit('/');

		// Once the timer's status and the preferences were read, still no reminder before ten hours
		mockStateWhen(
			(state) =>
				hasRead(state, '/api/timesheet/timer/status') && hasRead(state, '/api/employee-notification-setting')
		).then((state) => {
			expect(hasRead(state, '/api/employee-notification-setting')).to.equal(true);
		});
		cy.contains('Your timer has been running').should('not.exist');
	});

	it('reminds of nothing while the preferences cannot be read: the default could come before their threshold', () => {
		cy.mockScenario({ timerRunning: true, timerStartedAt: hoursAgo(9), notificationSettingFails: true });
		cy.hardVisit('/');

		// The timer's status was read, and the preferences were asked for twice (the read and its retry), refused
		const settingReads = (state: MockState) =>
			state.requests.filter((request) => request.path === '/api/employee-notification-setting');
		mockStateWhen((state) => hasRead(state, '/api/timesheet/timer/status') && settingReads(state).length >= 2).then(
			(state) => {
				expect(settingReads(state).length, 'preference reads').to.be.at.least(2);
				expect(settingReads(state).every((request) => request.status === 500)).to.equal(true);
			}
		);
		// A reminder comes at once after a read that answers: none is given on the default
		cy.wait(3000);
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

	it('keeps the threshold when another notification setting is saved', () => {
		// A row the employee already has: a switch saves itself alone, as Gauzy updates the row in part
		cy.mockScenario({ notificationPreferences: { timerReminderHours: 10 } });
		cy.hardVisit('/settings/personal/notifications');

		cy.contains('button', 'After 10 hours', { timeout: 30_000 }).should('be.visible');
		cy.get('#notification-setting-comment').click();

		// Once the switch was saved (the row updated)
		const settingPath = '/api/employee-notification-setting/notification-setting-1';
		mockStateWhen((state) => state.requests.some((request) => request.path === settingPath))
			.its('notificationSetting.preferences.timerReminderHours')
			.should('equal', 10);
		cy.contains('button', 'After 10 hours').should('be.visible');
	});
});
