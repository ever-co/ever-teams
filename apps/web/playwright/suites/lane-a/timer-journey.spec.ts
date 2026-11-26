import { expect, test, type Page } from '../../fixtures';
import { MOCK_ORIGIN } from '../../test-servers';
import { hardVisit, mockStateWhen, receivedTokens, stubNextAuthSession } from '../../helpers';

/**
 * A timer run, start to stop, proven through the mock rather than through the clock on screen.
 *
 * **Which hop a timer click takes here was measured, not assumed.** A first draft of this file asserted
 * `POST http://localhost:3031/api/timer/start` — the app's own route handler — and it failed with the real URL
 * the browser sent: `POST http://127.0.0.1:3992/api/timesheet/timer/start`. That is the app's *direct* mode, and
 * it is what this harness configures:
 *
 *   - `playwright/test-servers.ts:107-110` names the mock as the app's public API URL
 *     (`NEXT_PUBLIC_GAUZY_API_SERVER_URL: http://127.0.0.1:<lane mock>`) and leaves
 *     `NEXT_PUBLIC_GAUZY_API_BASE_SERVER_URL` empty;
 *   - `core/constants/config/constants.tsx:229` builds `GAUZY_API_BASE_SERVER_URL` from
 *     `NEXT_PUBLIC_GAUZY_API_SERVER_URL` — i.e. from the mock origin, so it is not empty;
 *   - `core/services/client/axios.ts:108-112` then sets the browser's axios base to `<that origin>/api`;
 *   - `core/services/client/api/timers/timer.service.ts` takes its direct branch for start/stop/status, so the
 *     browser itself sends `/timesheet/timer/start`, `/timesheet/timer/stop` and `/timesheet/timer/status`.
 *
 * So the request the browser sends *is* the request the mock logs: one hop, proven twice — at the page (method,
 * URL, body) and at the mock (its own request log, plus the state that write changed). The app's
 * `app/api/timer/**` route handlers are not in this path at all, which is worth saying plainly because the same
 * click in a deployment with `NEXT_PUBLIC_GAUZY_API_BASE_SERVER_URL` set does go through them.
 *
 * The mock is the witness of what the write did to it: `mock-gauzy-server.mjs` sets `mutationProof.startedTimer`
 * and flips its own `scenario.timerRunning` when a start reaches it, flips it back when a stop does, and answers
 * every later `/api/timesheet/timer/status` from that state. `timerService.stopTimer` reads the status again right
 * after the stop it posted, so the mock's log holds the stop and the status read that follows it, in that order.
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
 * Records every write the browser itself sends — its method, its full URL and its body.
 *
 * Deliberately unfiltered: which half of the chain a click takes (this app's own route handler under
 * `/api/…`, or the API origin directly) is exactly the kind of thing a spec should not assume, and a failure
 * that lists every write the page made says what actually happened. The mock's request log keeps no body —
 * it is kept body-free on purpose, as performance evidence — so the body half has to be recorded here.
 */
function recordWrites(page: Page): BrowserWrite[] {
	const writes: BrowserWrite[] = [];
	page.on('request', (request) => {
		const method = request.method();
		if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;
		const url = new URL(request.url());
		writes.push({
			method,
			url: request.url(),
			path: url.pathname,
			query: url.searchParams.toString(),
			body: asJson(request.postData())
		});
	});
	return writes;
}

/**
 * Counts the timer status reads *this page* sent, from the moment it is attached.
 *
 * The mock's own log says a status read happened, but not which page asked for it — with two pages open, a poll
 * from the first one would answer the same question. Counting at the page is what attributes the read, and it
 * avoids comparing clocks: the mock's `startMs` is its own elapsed-time counter (measured: values like 5842.4,
 * 8514.9), not a wall-clock time a test can compare with `Date.now()`.
 */
function recordStatusReads(page: Page): number[] {
	const reads: number[] = [];
	page.on('request', (request) => {
		if (request.method() === 'GET' && new URL(request.url()).pathname === MOCK_STATUS) reads.push(1);
	});
	return reads;
}

const summary = (requests: Array<{ method: string; path: string; status: number }>) =>
	JSON.stringify(requests.map((request) => [request.method, request.path, request.status]));

const startButton = (page: Page) => page.locator('button[aria-label="Start timer"]').first();
const stopButton = (page: Page) => page.locator('button[aria-label="Stop timer"]').first();

/** The writes the browser sent whose path holds `fragment`, oldest first. */
const browserWritesTo = (writes: BrowserWrite[], fragment: string) => writes.filter((write) => write.path.includes(fragment));

test.describe('a timer run from start to stop', () => {
	test('the start the page clicks reaches the mock, which then holds the run', async ({ app, mock }) => {
		const page = await app('/', { scenario: { hasPlan: false, requirePlanToTrack: false } });
		const writes = recordWrites(page);

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

		/*
		 * The mock half is proved first, on purpose. The mock can only witness what this click caused, so "a run
		 * exists" is the earlier fact — and when it does not happen, `mockStateWhen` dumps the mock's whole request
		 * log, which is what tells a reader where the chain actually stopped.
		 */
		const state = await mockStateWhen<TimerMockState>(
			(current) => current.mutationProof.startedTimer && current.scenario.timerRunning === true,
			{ tries: 60 }
		);
		expect(state.mutationProof.startedTimer, 'the mock witnessed the start').toBe(true);
		expect(
			state.scenario.timerRunning,
			'the mock flipped its own run state, so every later read answers a running timer'
		).toBe(true);

		// The same start, seen from the page: the browser itself sent it, to the API origin this harness names.
		await expect
			.poll(() => browserWritesTo(writes, 'timer/start').length, {
				message: `the browser never sent the start the page was clicked (${JSON.stringify(writes)})`,
				timeout: 60_000
			})
			.toBe(1);
		const write = browserWritesTo(writes, 'timer/start')[0];
		expect(write.method, 'the start leaves as a POST').toBe('POST');
		expect(
			new URL(write.url).origin,
			`the start left the browser for the API origin the app was configured with (${write.url})`
		).toBe(new URL(MOCK_ORIGIN).origin);
		expect(
			write.path,
			`the start is the API's own timer start path, so the page's request is the one the mock logged (${write.method} ${write.url})`
		).toBe(MOCK_START);

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
		const writes = recordWrites(page);

		// The task bar is the timer's task input (core/components/tasks/task-input.tsx); it holds the task a
		// start would run on, which is the task the fixture signed in with.
		await expect(page.getByRole('textbox', { name: 'What are you working on?' })).toHaveValue(fixture.names.task, {
			timeout: 20_000
		});

		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();

		await expect
			.poll(() => browserWritesTo(writes, 'timer/start').length, {
				message: `the browser never sent the start (${JSON.stringify(writes)})`,
				timeout: 60_000
			})
			.toBe(1);
		const body = browserWritesTo(writes, 'timer/start')[0].body;

		expect(body.taskId, `the start names the task bar's task (${JSON.stringify(body.taskId)})`).toBe(fixture.ids.task);
		expect(typeof body.isBillable, `the start says whether the run is billable (${JSON.stringify(body)})`).toBe(
			'boolean'
		);

		// `planDay` is today's local day (core/lib/helpers/daily-plan-day.ts, moment().format('YYYY-MM-DD')):
		// the start says which plan day it belongs to, so a run is filed on a day the mock can answer for.
		const today = new Date().toLocaleDateString('en-CA');
		expect(body.planDay, `the start names today as its plan day (${JSON.stringify(body.planDay)})`).toBe(today);

		await mockStateWhen<TimerMockState>((current) => current.mutationProof.startedTimer, { tries: 60 });
		const mockStarts = await mock.calls(MOCK_START);
		expect(mockStarts.length, 'the start the browser sent reached the mock').toBeGreaterThanOrEqual(1);
	});

	test('the stop ends the run the mock holds, and the status is read again after it', async ({ app, mock }) => {
		const page = await app('/', { scenario: { hasPlan: false, requirePlanToTrack: false } });
		const writes = recordWrites(page);

		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();
		await mockStateWhen<TimerMockState>((current) => current.scenario.timerRunning === true, { tries: 60 });
		await expect(stopButton(page)).toBeVisible({ timeout: 20_000 });

		await stopButton(page).click();

		await expect
			.poll(() => browserWritesTo(writes, 'timer/stop').length, {
				message: `the browser never sent the stop the page was clicked (${JSON.stringify(writes)})`,
				timeout: 60_000
			})
			.toBe(1);
		const stopWrite = browserWritesTo(writes, 'timer/stop')[0];
		expect(stopWrite.method, 'the stop leaves as a POST').toBe('POST');
		// In direct mode the client sends only what it knows: the source of the run it is ending
		// (core/hooks/timer/use-timer-api.ts stopTimerMutation → timerService.stopTimer({ source }) →
		// core/services/client/api/timers/timer.service.ts, the `GAUZY_API_BASE_SERVER_URL.value` branch). No tenant,
		// no team, no task: those are what the app's own `/api/timer/stop` route would add in a proxied deployment.
		expect(stopWrite.body.source, `the stop names the source of the run it ends (${JSON.stringify(stopWrite.body)})`).toBe(
			'TEAMS'
		);
		// A plain stop sends no time at all, so the API ends the run at its own clock rather than at a time the
		// browser guessed.
		expect(
			stopWrite.body.stoppedAt === undefined,
			`a plain stop sends no stoppedAt, so the API ends the run at its own clock (${JSON.stringify(stopWrite.body)})`
		).toBe(true);

		const state = await mockStateWhen<TimerMockState>((current) => current.scenario.timerRunning === false);
		expect(
			state.scenario.timerRunning,
			'the mock ended the run it was holding, so every later read answers a stopped timer'
		).toBe(false);

		const mockStops = await mock.calls(MOCK_STOP);
		expect(mockStops.length, `the mock recorded the stop the page sent (${summary(mockStops)})`).toBeGreaterThanOrEqual(1);
		expect(
			mockStops.every((request) => request.method === 'POST' && request.status === 200),
			`every stop the mock recorded is a POST it answered 200 (${summary(mockStops)})`
		).toBe(true);

		// `timerService.stopTimer` reads the status again right after the stop it posted (timer.service.ts: the direct
		// branch ends `return this.getTimerStatus()`), so the page is handed the stopped answer rather than the answer
		// the click started from. The mock's log is in answer order: prove the status read was asked for *after* the
		// stop landed, not only that both happened.
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

	test('a page that never saw the click shows the run, because the mock holds it', async ({ app, context, mock }) => {
		const page = await app('/', { scenario: { hasPlan: false, requirePlanToTrack: false } });
		recordWrites(page);

		await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
		await startButton(page).click();
		await mockStateWhen<TimerMockState>((current) => current.scenario.timerRunning === true, { tries: 60 });
		await expect(stopButton(page)).toBeVisible({ timeout: 20_000 });

		/*
		 * What this device kept about the run goes first — localStorage and sessionStorage are cleared while the
		 * page that started the run is still open — and only then does another page open. Storage is per context, so
		 * the page below boots with the run forgotten, and the only place left that can answer it is the mock. The
		 * session cookies stay on purpose: what has to be gone is this device's memory of the run, not the session.
		 */
		await page.evaluate(() => {
			window.localStorage.clear();
			window.sessionStorage.clear();
		});

		/*
		 * A page that never saw the click. The fixtures' `app()` hands out one page per test (fixtures.ts:152-163),
		 * so a second page has to come from the context; it is closed with it. Its recorder is attached before it
		 * navigates, so a start it might send while booting cannot slip past.
		 */
		const second = await context.newPage();
		const secondWrites = recordWrites(second);
		const secondStatusReads = recordStatusReads(second);
		await stubNextAuthSession(second);
		await hardVisit(second, '/');

		const state = (await mock.state()) as TimerMockState;
		expect(state.scenario.timerRunning, 'the mock still holds the run the new page is loading').toBe(true);
		expect(state.mutationProof.startedTimer, 'the start the mock witnessed is still there').toBe(true);

		await expect(stopButton(second), 'the new page shows the run the mock holds, not one it kept locally').toBeVisible({
			timeout: 20_000
		});
		await expect(startButton(second), 'and it offers no second start').toHaveCount(0);

		// It did not begin a run of its own to explain what it shows.
		expect(
			browserWritesTo(secondWrites, 'timer/start').length,
			`the new page sent no start of its own (${JSON.stringify(secondWrites)})`
		).toBe(0);

		// And it asked the mock for that answer itself. Counting the read on this page is what attributes it: with
		// the first page still open and polling, the mock's log alone cannot say who asked.
		await expect
			.poll(() => secondStatusReads.length, {
				message: `the new page never asked the mock for the timer status itself (${summary(await mock.calls(MOCK_STATUS))})`,
				timeout: 30_000
			})
			.toBeGreaterThanOrEqual(1);
	});
});
