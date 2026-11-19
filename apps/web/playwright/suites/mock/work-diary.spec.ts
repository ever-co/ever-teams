import { expect, test, type Page } from '../../fixtures';
import { waitForShellReady } from '../../helpers';

/**
 * The work diary: a person's own tracked day, day by day.
 *
 * Two of these three cases are proven by what the app asked the API for, not by what it painted:
 * `/api/timesheet/time-log` and `/api/timesheet/statistics/time-slots` are read with the *employee*
 * of the day in their query, and the mock logs every call it answered, so "whose day is this" is
 * answerable from the request log. `manager: false` is the point of the first case: a plain member
 * gets their own diary, on a page the manager-only reports do not open.
 *
 * Selector provenance: apps/web/cypress/e2e/work-diary.cy.ts, against the same mock — the day strip
 * is `ol[aria-label="Days of the period"]` and its days are buttons carrying `aria-pressed`.
 */

const TIME_LOG_PATH = '/api/timesheet/time-log';
const SLOTS_PATH = '/api/timesheet/statistics/time-slots';
const DAY_STRIP = 'ol[aria-label="Days of the period"]';

const LONG_DAY = new Intl.DateTimeFormat('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

function dayKeyOf(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${date.getFullYear()}-${month}-${day}`;
}

function daysAgo(count: number): Date {
	const date = new Date();
	date.setHours(0, 0, 0, 0);
	date.setDate(date.getDate() - count);
	return date;
}

const dateParamOf = (page: Page) => new URL(page.url()).searchParams.get('date') ?? '';

test.describe('work diary', () => {
	test("a member's own day, outside the reports only managers may open", async ({ app, mock, fixture }) => {
		const page = await app('/work-diary', { scenario: { manager: false } });

		await expect(page.getByRole('heading', { level: 1, name: 'Work diary' })).toBeVisible({ timeout: 20_000 });
		await expect(page).toHaveURL(/\/work-diary$/);
		await expect(page.getByText('No time tracked on')).toBeVisible({ timeout: 20_000 });

		// One day is selected at a time, and it is the day the page is showing.
		await expect(page.locator(`${DAY_STRIP} button[aria-pressed="true"]`)).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Today' })).toBeDisabled();

		const ownReads = (await mock.requests()).filter(
			(request) =>
				[TIME_LOG_PATH, SLOTS_PATH].includes(request.path) &&
				decodeURIComponent(request.query).includes(fixture.ids.employee)
		);
		expect(
			ownReads.map((request) => request.path),
			`the diary read the day of ${fixture.ids.employee} through both endpoints`
		).toIncludeSameMembers([TIME_LOG_PATH, SLOTS_PATH]);
	});

	test('keeps the picked day in its link, so a reload opens the same day and Today comes back', async ({ app }) => {
		const start = daysAgo(14);
		const page = await app(`/work-diary?date=${dayKeyOf(start)}`);

		await expect(page.getByText(LONG_DAY.format(start))).toBeVisible({ timeout: 20_000 });

		await page.locator(`${DAY_STRIP} button[aria-pressed="false"]:not([disabled])`).first().click();

		// The address already held a date (the start day), so "it changed" has to be waited for, not assumed.
		let picked = dateParamOf(page);
		await expect
			.poll(() => {
				picked = dateParamOf(page);
				return /^\d{4}-\d{2}-\d{2}$/.test(picked) && picked !== dayKeyOf(start);
			}, { message: 'picking another day never reached the address bar' })
			.toBe(true);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForShellReady(page);
		expect(dateParamOf(page), 'the picked day survived the reload').toBe(picked);

		const [year, month, day] = picked.split('-').map(Number);
		await expect(page.getByText(LONG_DAY.format(new Date(year, month - 1, day)))).toBeVisible({ timeout: 20_000 });

		await page.getByRole('button', { name: 'Today' }).click();
		await expect
			.poll(() => new URL(page.url()).search, { message: 'Today left a date in the address bar' })
			.toBe('');
		await expect(page.getByText(LONG_DAY.format(daysAgo(0)))).toBeVisible({ timeout: 20_000 });
	});

	test('is the My work entry of the sidebar, its own page and not the team timesheets', async ({ app }) => {
		const page = await app('/work-diary');

		await expect(page.getByRole('heading', { level: 1, name: 'Work diary' })).toBeVisible({ timeout: 20_000 });
		const current = page.locator('a[aria-current="page"]');
		await expect(current).toHaveCount(1);
		await expect(current).toHaveAttribute('href', /\/work-diary$/);
	});
});
