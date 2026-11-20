import { expect, test } from '../../fixtures';
import { mockStateWhen } from '../../helpers';

/**
 * Time tracking reminders: a timer left running is worth a reminder at the employee's threshold
 * (8 hours unless they chose another), the reminder can stop the timer, and a reminder the platform
 * already sent by email or push is not repeated in the tab.
 *
 * Selector provenance: apps/web/cypress/e2e/timer-reminders.cy.ts proves this copy and this toast
 * markup ('Your timer has been running for 8 hours', '[data-sonner-toast]', its 'Stop timer' button)
 * against the same mock; the Playwright version asserts the same behaviours through the control API
 * instead of cy.task.
 */

const HOUR = 60 * 60 * 1000;
const hoursAgo = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

type ReminderState = {
	scenario: { timerRunning?: boolean; timerSource?: string; notifications?: Array<{ isRead?: boolean }> };
	requests: Array<{ path: string; status: number }>;
	notificationSetting: { preferences?: { timerReminderHours?: number | null } } | null;
};

const asked = (state: ReminderState, path: string) => state.requests.some((request) => request.path === path);

test.describe('a timer left running', () => {
	test('reminds at eight hours and stops the timer from the reminder', async ({ app, mock }) => {
		const page = await app('/', { scenario: { timerRunning: true, timerStartedAt: hoursAgo(9) } });

		const reminder = page.getByText('Your timer has been running for 8 hours');
		await expect(reminder).toBeVisible({ timeout: 30_000 });

		// The reminder's own button; the page timer has a button with the same name, so scope to the toast.
		await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Stop timer' }).click();

		await expect(reminder).toHaveCount(0);

		const state = await mockStateWhen<ReminderState>((s) => s.scenario.timerRunning === false);
		expect(state.scenario.timerRunning, 'the mock stopped the run after the reminder button').toBe(false);
		expect((await mock.calls('/api/timesheet/timer/stop')).length, 'a stop call reached the API').toBeGreaterThan(
			0
		);
	});

	test("follows the employee's own threshold: nothing before it", async ({ app }) => {
		const page = await app('/', {
			scenario: {
				timerRunning: true,
				timerStartedAt: hoursAgo(9),
				notificationPreferences: { timerReminderHours: 10 }
			}
		});

		// The status and the preferences were both read; nine hours is under the employee's ten.
		await mockStateWhen<ReminderState>(
			(s) => asked(s, '/api/timesheet/timer/status') && asked(s, '/api/employee-notification-setting')
		);
		await page.waitForTimeout(3_000);

		await expect(page.getByText(/Your timer has been running/)).toHaveCount(0);
	});

	test('reminds of nothing while the preferences cannot be read', async ({ app, mock }) => {
		const page = await app('/', {
			scenario: { timerRunning: true, timerStartedAt: hoursAgo(9), notificationSettingFails: true }
		});

		const settingReads = async () => await mock.calls('/api/employee-notification-setting');
		await mockStateWhen<ReminderState>(
			(s) =>
				s.requests.some((request) => request.path === '/api/timesheet/timer/status') &&
				s.requests.filter((request) => request.path === '/api/employee-notification-setting').length >= 2
		);

		const reads = await settingReads();
		expect(reads.length, 'the preferences are read and retried').toBeGreaterThanOrEqual(2);
		expect(
			reads.every((read) => read.status === 500),
			'every preferences read was refused'
		).toBe(true);

		await page.waitForTimeout(3_000);
		// A reminder would come at once after a read that answers; on a refused read the default is not used
		await expect(page.getByText(/Your timer has been running/)).toHaveCount(0);
	});

	test('does not repeat a reminder the platform already sent', async ({ app }) => {
		const timerLogId = 'aaaaaaaa-0000-4000-8000-000000005022';
		const page = await app('/', {
			scenario: {
				timerRunning: true,
				timerStartedAt: hoursAgo(9),
				timerLogId,
				notifications: [
					{
						id: 'bbbbbbbb-0000-4000-8000-000000005022',
						type: 'TimerReminder',
						entity: 'TimeLog',
						entityId: timerLogId,
						title: 'Your timer has been running for 8 hours',
						message: 'Stop it if you are done, or keep it running.',
						isRead: false,
						isArchived: false,
						createdAt: hoursAgo(1)
					}
				]
			}
		});

		await mockStateWhen<ReminderState>(
			(s) => asked(s, '/api/timesheet/timer/status') && asked(s, '/api/employee-notification')
		);
		await page.waitForTimeout(3_000);

		await expect(page.locator('[data-sonner-toast]').getByText(/Your timer has been running/)).toHaveCount(0);
	});

	test("marks the platform's copy read when the tab shows a reminder of a desktop timer", async ({ app }) => {
		const timerLogId = 'aaaaaaaa-0000-4000-8000-000000005022';
		const page = await app('/', {
			scenario: {
				timerRunning: true,
				timerStartedAt: hoursAgo(9),
				timerLogId,
				timerSource: 'DESKTOP',
				notifications: [
					{
						id: 'bbbbbbbb-0000-4000-8000-000000005022',
						type: 'TimerReminder',
						entity: 'TimeLog',
						entityId: timerLogId,
						title: 'Your timer has been running for 8 hours',
						message: 'Stop it if you are done, or keep it running.',
						isRead: false,
						isArchived: false,
						createdAt: new Date(Date.now() - 30_000).toISOString()
					}
				]
			}
		});

		await expect(
			page.locator('[data-sonner-toast]').getByText('Your timer has been running for 8 hours')
		).toBeVisible({
			timeout: 30_000
		});

		const state = await mockStateWhen<ReminderState>((s) => s.scenario.notifications?.[0]?.isRead === true);
		expect(
			state.scenario.notifications?.[0]?.isRead,
			'the platform copy was marked read, so no email follows'
		).toBe(true);
	});

	test('still reminds when the platform reminder is about a different run', async ({ app }) => {
		const page = await app('/', {
			scenario: {
				timerRunning: true,
				timerStartedAt: hoursAgo(9),
				timerLogId: 'aaaaaaaa-0000-4000-8000-000000005022',
				notifications: [
					{
						id: 'bbbbbbbb-0000-4000-8000-000000000000',
						type: 'TimerReminder',
						entity: 'TimeLog',
						entityId: 'aaaaaaaa-0000-4000-8000-000000000000',
						title: 'Your timer has been running for 8 hours',
						isRead: false,
						isArchived: false,
						createdAt: hoursAgo(1)
					}
				]
			}
		});

		await expect(
			page.locator('[data-sonner-toast]').getByText('Your timer has been running for 8 hours')
		).toBeVisible({
			timeout: 30_000
		});
	});

	test('a timer that is not running gets no reminder', async ({ app }) => {
		const page = await app('/', { scenario: { timerRunning: false, timerStartedAt: hoursAgo(9) } });
		await page.waitForTimeout(3_000);
		await expect(page.getByText(/Your timer has been running/)).toHaveCount(0);
	});
});
