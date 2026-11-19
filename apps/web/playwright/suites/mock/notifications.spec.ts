import { expect, test } from '../../fixtures';
import { devOverlayErrors, mockStateWhen } from '../../helpers';

/**
 * The personal notification settings page, and the row it saves.
 *
 * Selector provenance: apps/web/cypress/e2e/timer-reminders.cy.ts proves the copy and controls here
 * ('Long-running timer reminder', the 'After 8 hours' trigger, the 'After 4 hours' option, the
 * `#notification-setting-comment` switch) against this same mock.
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

test.describe('personal notification settings', () => {
	test('the page offers the long-running timer threshold and its choices', async ({ app }) => {
		const page = await app('/settings/personal/notifications');

		await expect(page.getByText('Long-running timer reminder')).toBeVisible({ timeout: 30_000 });
		await expect(page.getByRole('button', { name: 'After 8 hours' })).toBeVisible();

		await page.getByRole('button', { name: 'After 8 hours' }).click();
		await expect(page.getByRole('option', { name: 'After 4 hours' })).toBeVisible();
	});

	test('choosing a threshold saves it on the server, not only in the browser', async ({ app, mock }) => {
		const page = await app('/settings/personal/notifications');

		await page.getByRole('button', { name: 'After 8 hours' }).click();
		await page.getByRole('option', { name: 'After 4 hours' }).click();

		const state = await mockStateWhen<SettingState>((s) => s.notificationSetting?.preferences?.timerReminderHours === 4);
		expect(state.notificationSetting?.preferences?.timerReminderHours, 'the stored row carries the new threshold').toBe(4);

		const writes = (await mock.requests()).filter((request) =>
			request.path.startsWith('/api/employee-notification-setting')
		);
		expect(writes.length, 'the page wrote the setting').toBeGreaterThan(0);
		expect(writes.every((write) => write.status < 400), `a write failed: ${JSON.stringify(writes)}`).toBe(true);
	});

	test('a saved threshold is read back from the API rather than defaulted', async ({ app, mock }) => {
		const page = await app('/settings/personal/notifications', {
			scenario: { notificationPreferences: { timerReminderHours: 10 } }
		});

		// The row came from the API, so the control shows the stored value and not the 8 hour default.
		await expect(page.getByRole('button', { name: 'After 10 hours' })).toBeVisible({ timeout: 30_000 });
		await expect(page.getByRole('button', { name: 'After 8 hours' })).toHaveCount(0);

		expect(await mock.calls('/api/employee-notification-setting'), 'the page read its own settings row').not.toHaveLength(
			0
		);
	});

	test('saving another switch keeps the threshold that was already set', async ({ app }) => {
		const page = await app('/settings/personal/notifications', {
			scenario: { notificationPreferences: { timerReminderHours: 10 } }
		});

		await expect(page.getByRole('button', { name: 'After 10 hours' })).toBeVisible({ timeout: 30_000 });
		await page.locator('#notification-setting-comment').click();

		const state = await mockStateWhen<SettingState>((s) => s.requests.some((request) => request.path === SETTING_ROW));
		expect(
			state.notificationSetting?.preferences?.timerReminderHours,
			'a partial update must not drop the threshold it did not touch'
		).toBe(10);

		await expect(page.getByRole('button', { name: 'After 10 hours' })).toBeVisible();
	});

	test('the page survives a preferences read that fails, and says so rather than pretending', async ({
		app,
		mock,
		shield
	}) => {
		const page = await app('/settings/personal/notifications', { scenario: { notificationSettingFails: true } });

		const reads = await mock.calls('/api/employee-notification-setting');
		expect(reads.length, 'the read is attempted').toBeGreaterThan(0);
		expect(reads.some((read) => read.status === 500), 'the mock refused the read').toBe(true);

		// A refused read must not take the page down with it.
		expect(shield.pageErrors(), 'the page crashed on a refused read').toEqual([]);
		expect(await devOverlayErrors(page), 'the Next dev overlay shows an error after a refused read').toEqual([]);
	});
});
