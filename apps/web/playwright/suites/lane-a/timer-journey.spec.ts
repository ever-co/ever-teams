import { expect, test, type Page } from '../../fixtures';
import { APP_ORIGIN, hardVisit, mockStateWhen, receivedTokens } from '../../helpers';

/**
 * A timer run, start to stop, proven through the mock rather than through the clock on screen.
 *
 * In this run the browser talks to the app's own route handlers (`API_BASE_URL = '/api'`,
 * core/constants/config/constants.tsx), and those handlers talk to the mock. So a click has two halves to
 * prove, and this file proves both:
 *
 *   browser → `POST http://localhost:3031/api/timer/start?todayStart=…&todayEnd=…` (recorded at the page,
 *   with its body) and `POST http://127.0.0.1:3992/api/timesheet/timer/start` (recorded by the mock itself).
 *
 * The mock is the witness of the write, and of what the write did to it:
 * `mock-gauzy-server.mjs` sets `mutationProof.startedTimer` and flips its own `scenario.timerRunning` when a
 * start reaches it, and flips `scenario.timerRunning` back when a stop does. `app/api/timer/stop/route.ts`
 * then reads `/api/timesheet/timer/status` again *server-side*, so the mock's log holds the stop and the
 * status read that follows it, in that order.
 *
 * Selector provenance: `button[aria-label="Start timer"]` / `button[aria-label="Stop timer"]` are the
 * `defaultLabel` of core/components/timer/timer-button.tsx (same control the Cypress spec
 * cypress/e2e/feature-parity.cy.ts clicks, and its own unit test core/components/timer/timer-button.test.tsx
 * asserts the same names). The task bar's `What are you working on?` textbox and the three localStorage keys
 * that keep today's plan/estimate dialogs off the timer button come from the same Cypress spec and from
 * suites/mock/timer-mutation.spec.ts.
 */

type TimerMockState = {
	scenario: { timerRunning?: boolean; timerSource?: string; timerLogId?: string };
	mutationProof: { startedTimer: boolean; updatedTask: boolean; inProgressTaskStatusPreserved: boolean };
	requests: Array<{ method: string; path: string; status: number }>;
};

type BrowserWrite = {
	method: string;
	url: string;
	path: string;
	query: string;
	body: Record<string, unknown>;
};

const TIMER_ROUTE = /\/api\/timer\/(start|stop)/;
const MOCK_START = '/api/timesheet/timer/start';
const MOCK_STOP = '/api/timesheet/timer/stop';
const MOCK_STATUS = '/api/timesheet/timer/status';

const asJson = (raw: string | null): Record<string, unknown> => {
	if (!raw) return {};
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		return { notJson: raw.slice(0, 120) };
	}
};

/**
 * Records the writes the browser itself sends, without changing them (`route.fallback()` hands the request
 * to the app's route handler as it would have gone). A test needs this because the mock's request log keeps
 * no body — it is kept body-free on purpose, as performance evidence.
 */
function recordWrites(page: Page, pattern: RegExp): BrowserWrite[] {
	const writes: BrowserWrite[] = [];
	void page.route(pattern, (route) => {
		const request = route.request();
		const url = new URL(request.url());
		writes.push({
			method: request.method(),
			url: request.url(),
			path: url.pathname,
			query: url.searchParams.toString(),
			body: asJson(request.postData())
		});
		return route.fallback();
	});
	return writes;
}

const summary = (requests: Array<{ method: string; path: string; status: number }>) =>
	JSON.stringify(requests.map((request) => [request.method, request.path, request.status]));

const startButton = (page: Page) => page.locator('button[aria-label="Start timer"]').first();
const stopButton = (page: Page) => page.locator('button[aria-label="Stop timer"]').first();

/** The app's own start/stop route handler, as the browser was told to reach it. */
const browserWriteTo = (writes: BrowserWrite[], path: string) => writes.filter((write) => write.path === path);

test.describe('a timer run from start to stop', () => {
	test('the start the page clicks reaches the mock, which then holds the run', async ({ app, mock }) => {
		const page = await app('/', { scenario: { hasPlan: false, requirePlanToTrack: false } });
		const writes = recordWrites(page, TIMER_ROUTE);

		// "The mock was told nothing" is only provable on a clean log, which this test's own reset gave it.
		const before = (await mock.state()) as TimerMockState;
		expect(before.mutationProof.startedTimer, 'a reset mock must not already hold a started timer').toBe(false);
		expect(
			before.scenario.timerRunning,
			'a reset mock must not already hold a running timer'
		).toBe(false);
		const startsBefore = await mock.calls(MOCK_START);
		expect(startsBefore.length, `the mock was asked to start before anything was clicked (${summary(startsBefore)})`).toBe(0);

		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();

		// Half one: the browser sent the app's own route handler a start.
		await expect
			.poll(() => browserWriteTo(writes, '/api/timer/start').length, {
				message: `the browser never sent the start the page was clicked (${JSON.stringify(writes)})`
			})
			.toBe(1);
		const write = browserWriteTo(writes, '/api/timer/start')[0];
		expect(write.method, 'the start leaves as a POST').toBe('POST');
		expect(
			new URL(write.url).origin,
			`the start went to the app's own route handler, not straight to the API (${write.url})`
		).toBe(APP_ORIGIN);

		// Half two: the mock recorded the start its handler forwarded, and the state that start changed.
		const state = await mockStateWhen<TimerMockState>(
			(current) => current.mutationProof.startedTimer && current.scenario.timerRunning === true
		);
		expect(state.mutationProof.startedTimer, 'the mock witnessed the start').toBe(true);
		expect(
			state.scenario.timerRunning,
			'the mock flipped its own run state, so every later read answers a running timer'
		).toBe(true);

		const mockStarts = await mock.calls(MOCK_START);
		expect(mockStarts.length, `the mock recorded the forwarded start (${summary(mockStarts)})`).toBeGreaterThanOrEqual(
			1
		);
		expect(
			mockStarts.every((request) => request.method === 'POST' && request.status === 200),
			`every start the mock recorded is a POST it answered 200 (${summary(mockStarts)})`
		).toBe(true);

		// The handler forwarded the session's token to the mock, which is what makes the write the person's own.
		const tokens = await receivedTokens(MOCK_START);
		expect(tokens.length, 'the mock received a Bearer token with the start it recorded').toBeGreaterThanOrEqual(1);
		expect(
			new Set(tokens).size,
			'the start the mock received carried an access token (its sha256, never the token)'
		).toBeGreaterThanOrEqual(1);

		// The screen half, last: the page now offers the stop of the run the mock holds.
		await expect(stopButton(page), 'the page offers the stop of the run the mock now holds').toBeVisible({
			timeout: 20_000
		});
	});

	test('the start names the task the timer bar holds and today’s plan day', async ({ app, mock, fixture }) => {
		const page = await app('/', { scenario: { hasPlan: false, requirePlanToTrack: false } });
		const writes = recordWrites(page, TIMER_ROUTE);

		// The task bar is the timer's task input (core/components/tasks/task-input.tsx); it holds the task a
		// start would run on, which is the task the fixture signed in with.
		await expect(page.getByRole('textbox', { name: 'What are you working on?' })).toHaveValue(fixture.names.task, {
			timeout: 20_000
		});

		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();

		await expect
			.poll(() => browserWriteTo(writes, '/api/timer/start').length, {
				message: `the browser never sent the start (${JSON.stringify(writes)})`
			})
			.toBe(1);
		const body = browserWriteTo(writes, '/api/timer/start')[0].body;

		expect(body.taskId, `the start names the task bar's task (${JSON.stringify(body.taskId)})`).toBe(fixture.ids.task);
		expect(typeof body.isBillable, `the start says whether the run is billable (${JSON.stringify(body)})`).toBe(
			'boolean'
		);

		// `planDay` is today's local day (core/lib/helpers/daily-plan-day.ts, moment().format('YYYY-MM-DD')):
		// the start says which plan day it belongs to, so a run is filed on a day the mock can answer for.
		const today = new Date().toLocaleDateString('en-CA');
		expect(body.planDay, `the start names today as its plan day (${JSON.stringify(body.planDay)})`).toBe(today);

		await mockStateWhen<TimerMockState>((current) => current.mutationProof.startedTimer);
		const mockStarts = await mock.calls(MOCK_START);
		expect(mockStarts.length, 'the start the browser sent reached the mock').toBeGreaterThanOrEqual(1);
	});

	test('the stop ends the run the mock holds, and the status is read again after it', async ({ app, mock }) => {
		const page = await app('/', { scenario: { hasPlan: false, requirePlanToTrack: false } });
		const writes = recordWrites(page, TIMER_ROUTE);

		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();
		await mockStateWhen<TimerMockState>((current) => current.scenario.timerRunning === true);
		await expect(stopButton(page)).toBeVisible({ timeout: 20_000 });

		await stopButton(page).click();

		await expect
			.poll(() => browserWriteTo(writes, '/api/timer/stop').length, {
				message: `the browser never sent the stop the page was clicked (${JSON.stringify(writes)})`
			})
			.toBe(1);
		const stopWrite = browserWriteTo(writes, '/api/timer/stop')[0];
		expect(stopWrite.method, 'the stop leaves as a POST').toBe('POST');
		// The client sends only what it knows: the source of the run it is ending (core/hooks/timer/use-timer-api.ts
		// stopTimerMutation → timerService.stopTimer({ source })). The task and the tenant are added by the route.
		expect(stopWrite.body.source, `the stop names the source of the run it ends (${JSON.stringify(stopWrite.body)})`).toBe(
			'TEAMS'
		);
		// The app's own route refuses a stop whose stoppedAt is in the future; a plain stop sends no time at all,
		// so the server decides when the run ended.
		expect(
			stopWrite.body.stoppedAt === undefined,
			`a plain stop sends no stoppedAt, so the server ends the run at its own clock (${JSON.stringify(stopWrite.body)})`
		).toBe(true);

		const state = await mockStateWhen<TimerMockState>((current) => current.scenario.timerRunning === false);
		expect(
			state.scenario.timerRunning,
			'the mock ended the run it was holding, so every later read answers a stopped timer'
		).toBe(false);

		const mockStops = await mock.calls(MOCK_STOP);
		expect(mockStops.length, `the mock recorded the forwarded stop (${summary(mockStops)})`).toBeGreaterThanOrEqual(1);
		expect(
			mockStops.every((request) => request.method === 'POST' && request.status === 200),
			`every stop the mock recorded is a POST it answered 200 (${summary(mockStops)})`
		).toBe(true);

		// `app/api/timer/stop/route.ts` reads the status again after the stop it forwarded, so the page is handed
		// the stopped answer rather than the answer the click started from. The mock's log is in answer order:
		// prove the status read was asked for *after* the stop landed, not only that both happened.
		const stopEndMs = Math.max(...mockStops.map((request) => request.endMs));
		const statusReadsAfter = (await mock.requests()).filter(
			(request) => request.path === MOCK_STATUS && request.startMs >= stopEndMs
		);
		expect(
			statusReadsAfter.length,
			`the status was read again after the stop landed (${summary(await mock.calls(MOCK_STATUS))})`
		).toBeGreaterThanOrEqual(1);

		await expect(startButton(page), 'the page offers the start again once the run is ended').toBeVisible({
			timeout: 20_000
		});
	});

	test('a reopened page takes the run from the mock, not from this device', async ({ app, mock }) => {
		const page = await app('/', { scenario: { hasPlan: false, requirePlanToTrack: false } });
		recordWrites(page, TIMER_ROUTE);

		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();
		await mockStateWhen<TimerMockState>((current) => current.scenario.timerRunning === true);
		await expect(stopButton(page)).toBeVisible({ timeout: 20_000 });

		// hardVisit clears localStorage and sessionStorage before it navigates, so nothing this device kept about
		// the run survives it: what the reopened page shows can only be what the mock answers.
		await hardVisit(page, '/');

		const state = (await mock.state()) as TimerMockState;
		expect(state.scenario.timerRunning, 'the mock still holds the run the reopened page is loading').toBe(true);
		expect(state.mutationProof.startedTimer, 'the start the mock witnessed is still there').toBe(true);

		await expect(stopButton(page), 'the reopened page shows the run the mock holds, not one it kept locally').toBeVisible(
			{ timeout: 20_000 }
		);
		await expect(startButton(page)).toHaveCount(0);

		// And it asked the mock for that answer: a status read landed after the reopened page mounted.
		const statusReads = await mock.calls(MOCK_STATUS);
		expect(
			statusReads.length,
			`the reopened page asked the mock for the timer status (${summary(statusReads)})`
		).toBeGreaterThanOrEqual(1);
	});
});
