import { expect, test, type Page } from '../../fixtures';

/**
 * Meetings: scheduling a meeting writes a real appointment on the mock, and cancelling removes it.
 *
 * `/api/employee-appointment` is one of the few genuinely mutable collections the mock keeps (POST
 * appends, PUT merges, DELETE removes), so the scheduled meeting that reappears on the agenda is the
 * server's answer, not a browser-side echo. What the app sent is read off the request the browser
 * made, the same proof Cypress gets from `cy.intercept(...).as('schedule')`.
 *
 * Selector provenance: apps/web/cypress/e2e/feature-parity.cy.ts (`[data-testid="meetings-schedule"]`,
 * `#meeting-title`, the `Schedule` and `Done` buttons, `[data-testid="meeting-scheduled"]`,
 * `[data-testid="scheduled-meeting"]`, 'Copy invitation', 'Add to calendar').
 *
 * The room itself is out of scope here: joining opens a video server, and a hermetic run does not
 * stand one up. `/api/auth/meet/jwt` is stubbed for the same reason Cypress stubs it.
 */

async function stubMeetJwt(page: Page): Promise<void> {
	await page.route('**/api/auth/meet/jwt*', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ token: 'synthetic-meet-token', room: 'room_tenant' })
		})
	);
}

async function recordAppointments(page: Page) {
	const scheduled: Array<Record<string, unknown>> = [];
	const cancelled: string[] = [];
	await page.route(/\/api\/employee-appointment(\?.*)?$/, async (route) => {
		if (route.request().method() === 'POST') scheduled.push(route.request().postDataJSON() ?? {});
		return route.fallback();
	});
	await page.route(/\/api\/employee-appointment\/[^/]+$/, async (route) => {
		if (route.request().method() === 'DELETE') cancelled.push(route.request().url());
		return route.fallback();
	});
	return { scheduled, cancelled };
}

async function scheduleMeeting(page: Page, title: string): Promise<void> {
	await page.getByTestId('meetings-schedule').click();
	await page.locator('#meeting-title').fill(title);
	await page.getByRole('button', { name: /^Schedule$/ }).click();
}

test.describe('meetings', () => {
	test('scheduling a meeting writes an appointment and confirms it', async ({ app, mock }) => {
		const page = await app('/meet');
		const written = await recordAppointments(page);
		await stubMeetJwt(page);

		await scheduleMeeting(page, 'Sprint review');
		await expect(page.getByTestId('meeting-scheduled')).toContainText('Sprint review', { timeout: 20_000 });
		await expect(page.getByRole('button', { name: 'Copy invitation' })).toBeVisible();
		await expect(page.getByRole('button', { name: 'Add to calendar' })).toBeVisible();

		expect(written.scheduled, 'the schedule sent nothing to the API').toHaveLength(1);
		const body = written.scheduled[0];
		expect(body.agenda, 'the title typed becomes the appointment agenda').toBe('Sprint review');
		expect(body, 'a meeting scheduled without invitees must not carry an emails field').not.toHaveProperty(
			'emails'
		);
		// The API's own names for the two ends of the appointment — not a `startTime` the client invented.
		expect(body, 'the appointment carries its start as the API names it').toHaveProperty('startDateTime');
		expect(body, 'the appointment carries its end as the API names it').toHaveProperty('endDateTime');

		const writes = await mock.calls('/api/employee-appointment');
		expect(
			writes.every((write) => write.status < 400),
			`the API refused the schedule: ${JSON.stringify(writes)}`
		).toBe(true);
	});

	test('the scheduled meeting stays on the agenda after a reload', async ({ app, mock }) => {
		const page = await app('/meet');
		await stubMeetJwt(page);
		await scheduleMeeting(page, 'Retro');
		await expect(page.getByTestId('meeting-scheduled')).toContainText('Retro', { timeout: 20_000 });
		await page.getByRole('button', { name: /^Done$/ }).click();

		// The appointment lives on the mock now; a fresh load reads it back through the API.
		await expect
			.poll(async () => (await mock.calls('/api/employee-appointment')).some((call) => call.method === 'POST'), {
				message: 'the schedule never reached the API'
			})
			.toBe(true);

		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(page.getByTestId('scheduled-meeting')).toHaveCount(1, { timeout: 20_000 });
	});

	test('cancelling a scheduled meeting deletes it from the server', async ({ app, mock }) => {
		const page = await app('/meet');
		const written = await recordAppointments(page);
		await stubMeetJwt(page);
		await scheduleMeeting(page, 'To be cancelled');
		await expect(page.getByTestId('scheduled-meeting')).toHaveCount(1, { timeout: 20_000 });

		// The schedule confirmation is a dialog. Its viewport overlay covers the whole page and swallows every
		// click on the agenda below it, so the meeting cannot be opened from the list until it is closed.
		await page.getByRole('button', { name: /^Done$/ }).click();
		await expect(page.getByTestId('meeting-scheduled')).toHaveCount(0, { timeout: 20_000 });

		await page.getByTestId('scheduled-meeting').click();
		await page.getByRole('button', { name: /^Delete$/ }).click();
		// Cancellation asks for a confirmation before it deletes anything.
		await page.getByRole('button', { name: /cancel the meeting|^Cancel$/ }).click();

		await expect(page.getByTestId('scheduled-meeting')).toHaveCount(0, { timeout: 20_000 });
		expect(written.cancelled, 'the delete never reached the API').toHaveLength(1);

		const deletes = await mock.calls('/api/employee-appointment');
		expect(
			deletes.some((call) => call.method === 'DELETE'),
			'the mock recorded the delete'
		).toBe(true);
	});

	test('invites a team member and an address typed in, as the appointment’s e-mail list', async ({ app }) => {
		const page = await app('/meet');
		const written = await recordAppointments(page);
		await stubMeetJwt(page);

		await page.getByTestId('meetings-schedule').click();
		await page.locator('#meeting-title').fill('Kick-off');
		await page.getByTestId('meeting-team-members').click();
		await page.getByRole('option', { name: 'Fixture Teammate' }).click();

		const address = page.locator('input[placeholder="Add an email address"]');
		await address.click();
		await address.fill('guest@example.org');
		await page.keyboard.press('Enter');

		await expect(page.locator('ul[aria-label="Participants"] li')).toHaveCount(2);
		await page.getByRole('button', { name: /^Schedule$/ }).click();

		await expect.poll(() => written.scheduled.length, { message: 'the schedule never reached the API' }).toBe(1);
		expect(written.scheduled[0].emails, 'the people added are who the notice goes to').toBe(
			'teammate@example.test, guest@example.org'
		);
		await expect(page.getByTestId('meeting-scheduled')).toContainText('The people you added get a short email');
	});

	test('reads the date and time typed on the clocks of the time zone picked', async ({ app }) => {
		const page = await app('/meet');
		const written = await recordAppointments(page);
		await stubMeetJwt(page);

		await page.getByTestId('meetings-schedule').click();
		await page.locator('#meeting-title').fill('Tokyo sync');

		// The person's own zone comes first; the fixture user's is UTC.
		await expect(page.getByTestId('meeting-time-zone')).toContainText('UTC');
		await page.locator('#meeting-date').fill('2030-01-15');
		await page.locator('#meeting-time').fill('10:00');

		await page.getByTestId('meeting-time-zone').click();
		await page.locator('input[placeholder="Search by city or region"]').fill('Asia/Tokyo');
		await page.getByRole('option', { name: 'Asia/Tokyo' }).click();
		await expect(page.getByTestId('meeting-time-zone')).toContainText('Asia/Tokyo');
		await expect(page.getByTestId('meeting-time-zone')).toContainText('UTC +09:00');

		await page.getByRole('button', { name: /^Schedule$/ }).click();
		await expect.poll(() => written.scheduled.length, { message: 'the schedule never reached the API' }).toBe(1);
		// 10:00 in Tokyo is 01:00 UTC: the appointment is stored in UTC, not in the zone it was typed in.
		expect(written.scheduled[0].startDateTime, 'the typed wall clock was converted to UTC').toBe(
			'2030-01-15T01:00:00.000Z'
		);
	});

	test('shows the agenda one day at a time: the day before, the day after, and back to today', async ({ app }) => {
		const page = await app('/meet');
		await stubMeetJwt(page);

		await expect(page.getByTestId('meetings-agenda-day')).toContainText('No meetings scheduled today', {
			timeout: 20_000
		});
		await expect(page.getByRole('heading', { level: 2, name: /^Today, / })).toBeVisible();

		await page.getByRole('button', { name: 'Next day' }).click();
		await expect(page.getByRole('heading', { level: 2, name: /^Tomorrow, / })).toBeVisible({ timeout: 20_000 });
		await expect(page.getByTestId('meetings-agenda-day')).toContainText('No meetings scheduled this day');

		// Any day from the month under the header; the 15th is never a neighbouring month's day in the grid.
		await page.getByTestId('meetings-agenda-day-picker').click();
		await page.getByRole('gridcell', { name: /^15$/ }).click();
		await expect(page.getByTestId('meetings-agenda-day-picker')).toContainText(' 15, ');
		await expect(page.getByRole('gridcell')).toHaveCount(0);

		await page.getByRole('button', { name: 'Today' }).click();
		await expect(page.getByRole('heading', { level: 2, name: /^Today, / })).toBeVisible({ timeout: 20_000 });
		await page.getByRole('button', { name: 'Previous day' }).click();
		await expect(page.getByRole('heading', { level: 2, name: /^Yesterday, / })).toBeVisible({ timeout: 20_000 });
	});

	test('refuses to join on something that is neither a meeting link nor a room name', async ({ app }) => {
		const page = await app('/meet');
		await stubMeetJwt(page);

		await page.getByTestId('meetings-join').click();
		const input = page.locator('#meeting-join-input');
		await input.fill('not a link');
		await page.getByRole('button', { name: /^Join$/ }).click();
		await expect(page.getByText('neither a meeting link nor a room name')).toBeVisible({ timeout: 20_000 });
		await expect(page).not.toHaveURL(/\/meet\/jitsi/);

		await input.fill('design-review');
		await page.getByRole('button', { name: /^Join$/ }).click();
		await expect(page).toHaveURL(/\/meet\/jitsi$/, { timeout: 20_000 });
		await expect(page.getByTestId('meet-join-now')).toBeVisible({ timeout: 20_000 });
	});

	test('keeps the camera and noise-filter choices on the device where they were saved', async ({ app }) => {
		const page = await app('/meet');
		await stubMeetJwt(page);

		await page.getByTestId('meetings-settings').click();
		const dialog = page.getByRole('dialog', { name: 'Audio and video' });
		await expect(dialog).toBeVisible({ timeout: 20_000 });
		await expect(dialog.locator('section[aria-label="Camera preview"]')).toHaveCount(1);

		await expect(page.getByTestId('meeting-noise-filter')).toHaveAttribute('aria-checked', 'true');
		await expect(page.getByTestId('meeting-hd-video')).toHaveAttribute('aria-checked', 'true');
		await page.getByTestId('meeting-hd-video').click();
		await dialog.getByRole('button', { name: /^Save changes$/ }).click();
		await expect(dialog).toHaveCount(0);

		const saved = await page.evaluate(() =>
			JSON.parse(window.localStorage.getItem('ever-teams:meeting-devices') ?? 'null')
		);
		expect(saved, 'the pre-join check reads these back off the device').toMatchObject({
			audioInputId: '',
			videoInputId: '',
			noiseFilter: true,
			hdVideo: false
		});
	});
});
