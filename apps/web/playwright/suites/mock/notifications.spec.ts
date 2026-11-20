import { expect, test, type Page } from '../../fixtures';
import { mockStateWhen } from '../../helpers';

/**
 * The personal notification settings page, and the row it saves.
 *
 * Selector provenance: apps/web/cypress/e2e/timer-reminders.cy.ts proves the copy and controls here
 * ('Long-running timer reminder', the 'After 8 hours' trigger, the 'After 4 hours' option, the
 * `#notification-setting-comment` switch) against this same mock. Cypress finds the trigger as a `button`; to the
 * accessibility tree it is a combobox (see `threshold` below).
 *
 * What the mock makes provable: `POST /api/employee-notification-setting` stores what the browser
 * sent and `PUT /api/employee-notification-setting/:id` merges into the stored row, so
 * `mock.state().notificationSetting` is the server's own record of the save — not an echo of the
 * request. A partial update must not drop the fields it did not touch.
 */

type SettingState = {
	notificationSetting: { preferences?: Record<string, number | null> } | null;
	requests: Array<{ method: string; path: string; status: number }>;
};

const SETTING_ROW = '/api/employee-notification-setting/notification-setting-1';

/**
 * The threshold control: a select whose trigger is a combobox named by its row and showing the threshold chosen
 * (core/components/settings/pages/notifications/reminder-threshold-row.tsx). `exact`, because the row's email-mode
 * select is named "Email: Long-running timer reminder".
 */
const threshold = (page: Page) => page.getByRole('combobox', { name: 'Long-running timer reminder', exact: true });

test.describe('personal notification settings', () => {
	test('the page offers the long-running timer threshold and its choices', async ({ app }) => {
		const page = await app('/settings/personal/notifications');

		await expect(page.getByText('Long-running timer reminder')).toBeVisible({ timeout: 30_000 });
		await expect(threshold(page)).toHaveText('After 8 hours');

		await threshold(page).click();
		await expect(page.getByRole('option', { name: 'After 4 hours' })).toBeVisible();
	});

	test('choosing a threshold saves it on the server, not only in the browser', async ({ app, mock }) => {
		const page = await app('/settings/personal/notifications');

		await expect(threshold(page)).toHaveText('After 8 hours', { timeout: 30_000 });
		await threshold(page).click();
		await page.getByRole('option', { name: 'After 4 hours' }).click();

		const state = await mockStateWhen<SettingState>(
			(s) => s.notificationSetting?.preferences?.timerReminderHours === 4
		);
		expect(
			state.notificationSetting?.preferences?.timerReminderHours,
			'the stored row carries the new threshold'
		).toBe(4);

		const writes = (await mock.requests()).filter((request) =>
			request.path.startsWith('/api/employee-notification-setting')
		);
		expect(writes.length, 'the page wrote the setting').toBeGreaterThan(0);
		expect(
			writes.every((write) => write.status < 400),
			`a write failed: ${JSON.stringify(writes)}`
		).toBe(true);
	});

	test('a saved threshold is read back from the API rather than defaulted', async ({ app, mock }) => {
		const page = await app('/settings/personal/notifications', {
			scenario: { notificationPreferences: { timerReminderHours: 10 } }
		});

		// The row came from the API, so the control shows the stored value — all of its text — and not the 8 hour default.
		await expect(threshold(page)).toHaveText('After 10 hours', { timeout: 30_000 });

		expect(
			await mock.calls('/api/employee-notification-setting'),
			'the page read its own settings row'
		).not.toHaveLength(0);
	});

	test('saving another switch keeps the threshold that was already set', async ({ app }) => {
		const page = await app('/settings/personal/notifications', {
			scenario: { notificationPreferences: { timerReminderHours: 10 } }
		});

		await expect(threshold(page)).toHaveText('After 10 hours', { timeout: 30_000 });
		await page.locator('#notification-setting-comment').click();

		const state = await mockStateWhen<SettingState>((s) =>
			s.requests.some((request) => request.path === SETTING_ROW)
		);
		expect(
			state.notificationSetting?.preferences?.timerReminderHours,
			'a partial update must not drop the threshold it did not touch'
		).toBe(10);

		await expect(threshold(page)).toHaveText('After 10 hours');
	});

	test('the page survives a preferences read that fails, and says so rather than pretending', async ({
		app,
		mock,
		shield
	}) => {
		const page = await app('/settings/personal/notifications', { scenario: { notificationSettingFails: true } });

		// The read follows the shell, and the mock logs it once answered: polled, not read once.
		await expect
			.poll(async () => (await mock.calls('/api/employee-notification-setting')).map((read) => read.status), {
				message: 'the read was never attempted, or the mock never refused it'
			})
			.toContain(500);

		// It says so: the load error notice with its retry, and no threshold control pretending to know the saved value
		// (core/components/settings/pages/notifications/notifications-settings-page.tsx shows the rows only once settled).
		await expect(page.getByText('Your notification settings could not load.')).toBeVisible({ timeout: 15_000 });
		await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
		await expect(page.getByText('Long-running timer reminder')).toHaveCount(0);

		// A refused read must not take the page down with it: no uncaught error, and no console error but the app's own
		// log of the refusal ("[HttpClient] HTTP Error: GET <url> 500", core/services/logs/logger-adapter.service.ts).
		// Those two are what Next's dev overlay reports on a page that rendered, and here it reports that log as its one
		// issue — as a toast, or opened on its code frame, as timing has it — so the shield is read instead of the overlay.
		const isLoggedRefusal = (text: string) =>
			/\[HttpClient\] HTTP Error: GET \/employee-notification-setting\?/.test(text);
		expect(shield.pageErrors(), 'the page crashed on a refused read').toEqual([]);
		expect(
			shield.consoleErrors().filter((text) => !isLoggedRefusal(text)),
			'the page logged an error besides the refused read'
		).toEqual([]);
		expect(shield.consoleErrors().some(isLoggedRefusal), 'the refusal the overlay reports was logged').toBe(true);
	});
});
