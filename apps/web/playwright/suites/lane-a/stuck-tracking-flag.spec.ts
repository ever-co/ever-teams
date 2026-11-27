import { expect, test, type Page } from '../../fixtures';
import { APP_ORIGIN, mockState, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import type { Route } from '@playwright/test';

/**
 * `route.fetch()` of a read, with one retry when the connection was reset. The mock is a Node server, which closes an
 * idle keep-alive socket after 5 s; a fetch that reuses that socket at that moment fails with `ECONNRESET`, and the
 * page then sees a network error the app never caused. Measured 2026-11-26: test 2 went red once that way in a full
 * lane run, then passed 21 of 21 in three repeats of this file. Reads only: a write is not safe to send twice.
 */
async function fetchReadFromMock(route: Route) {
	try {
		return await route.fetch();
	} catch (error) {
		if (!/ECONNRESET|socket hang up/i.test(String(error))) throw error;
		return route.fetch();
	}
}

/**
 * #5684 in the browser: the person presses Start right after a Stop and the app used to refuse with
 * "You're already tracking time in another tab or device.", because the user it read still had
 * `employee.isTrackingTime: true` while no timer ran.
 *
 * The refusal is decided in the browser, in `canStartWithoutTrackingConflict`
 * (`core/hooks/timer/use-timer-api.ts:657-749`), which runs before any start is sent (`:777-780`):
 *
 * - `:669` reads the user again (`refreshUserData` → `use-authenticate-user.ts:94-103` → `useUserQuery`
 *   → `user.service.ts:61-73` `GET /user/me?…&includeEmployee=true`);
 * - `:673` sees `employee.isTrackingTime` and `:676` compares it with this tab's own status;
 * - `:678-682` a status that says running refuses, with `timer.ALREADY_TRACKING_MESSAGE`;
 * - `:692` otherwise `stopStaleTeamsTimer` (`use-stale-timer-guard.ts:117-130`, which first reads the
 *   employee's last log) and `:696` `keepRunOrClearStuckFlag` (`use-timer-api.ts:645-654`):
 *   `keepRunGoingOn` (`:596-637`) reads the run afresh — a run it finds refuses with the same warning at
 *   `:614` — and only when none is found `clearTrackingFlag` (`:202-212`) stops to clear the flag;
 * - `:702` reads the user again, and `:706-712` a flag that is still on although the stop *claimed* a run
 *   refuses with the same warning;
 * - `:713-720` the #5684 part: when the API answered that stop **406 — nothing was left to stop**
 *   (`timer-errors.ts:20-25`), a read that still says tracking refuses nothing by itself; only a run read
 *   afresh does;
 * - `:721-731` a heal whose read failed refuses, with `toasts.timer.START_FAILED`.
 *
 * ## Why the flag has to be stubbed, and why one of these cases also stubs the stop's answer
 *
 * The lane mock's employee is `isTrackingTime: false` at every read
 * (`cypress/support/mock-gauzy-server.mjs:123-133`, the `makeEmployee` factory; `/api/user/me` is answered
 * at `:544`), so nothing on this lane has a stuck flag by itself: the cases below take the mock's own user
 * answer and flip that one field (`playwright/suites/lane-a/email-verification-panel.spec.ts` stubs the
 * same call the same way).
 *
 * The mock also answers **every** `POST /api/timesheet/timer/stop` with 200, running or not
 * (`mock-gauzy-server.mjs:692-695`), where Gauzy answers 406 when no run is left to stop — the fact the
 * app's own code is written around (`use-timer-api.ts:198-201`). That difference decides case 2 versus
 * case 3, so one pair of cases runs against the mock exactly as it is and one pair answers the stop the
 * way Gauzy does, with a `page.route` stub that asks the mock anyway (so its log still shows the call) and
 * restates the answer only when the mock held no run. Which is which is said in every case name.
 *
 * ## What the person sees, and where each selector and string comes from
 *
 * - `button[aria-label="Start timer"]` / `…("Stop timer")`: `core/components/timer/timer-button.tsx:53`
 *   (`defaultLabel`, as `suites/lane-a/timer-journey.spec.ts` uses it);
 * - "You're already tracking time in another tab or device.": `locales/en.json:3070`
 *   (`timer.ALREADY_TRACKING_MESSAGE`, the toast `use-timer-api.ts:614`, `:680` and `:710` show);
 * - "Time tracking is turned off for you. An organization admin can turn it on.": `locales/en.json:3071`
 *   (`timer.TRACKING_DISABLED_MESSAGE`, shown only by `:663`); none of these cases arms it, and the cases
 *   that refuse say so, so a refusal here is the tracking-flag one and not the disabled one;
 * - the page is `/`, with `hasPlan: false, requirePlanToTrack: false` so no plan dialog stands between the
 *   person and the Start button (the scenario `suites/lane-a/timer-journey.spec.ts` clicks through).
 *
 * ## The lane, and what reads the page does on its own
 *
 * Lane-a: app `http://localhost:3031`, mock `http://127.0.0.1:3992` (`playwright/test-servers.ts:38`), and
 * the browser talks to the mock directly (`timer-journey.spec.ts` header: `test-servers.ts:107-110`,
 * `constants.tsx:229`, `axios.ts:108-112`), so every call below is one the mock itself recorded.
 *
 * Two background reads matter to these cases and are why the assertions count only the calls that land
 * *after the click*:
 *
 * - `use-timer-api.ts:330` + `init-state.tsx:155` + `init-state.tsx:38`: the shell's timer owner re-reads
 *   the status at most every 60 000 ms, and only while a run shows (`init-state.tsx:178`, `:181-184`), so a
 *   click a second after load is not racing a status poll;
 * - `use-stale-timer-guard.ts:903-927` (`useTimerRunningPastMidnight`) and `:811-875` (`useStaleTimerGuard`)
 *   poll the employee's last log exactly when the flag says tracking and the status says stopped — which is
 *   every stubbed case here — so a stuck flag makes the page read `/api/timesheet/timer/status/worked` on
 *   its own before anything is clicked. With the mock's empty answer for that path
 *   (`mock-gauzy-server.mjs` knows no such path; it falls through to `pagination([])`) nothing is stopped
 *   and no dialog appears (`decideUnfollowedTime` answers `follow` without a log,
 *   `core/lib/utils/timer/unfollowed-time.ts:154`).
 *
 * ## Measured on this lane, in both runs (every `MEASURE` line prints the whole window)
 *
 * `E:\Coding\.tmp\s2-lane-a-stuck-1.log` … `-4.log`. Below, "after the click" is what this spec recorded
 * from the page between the Start click and the end of the case. Load-time reads that land late —
 * `…/time-goals`, `…/invite`, `…/languages`, `…/favorite/employee`, `…/daily-plan`, `…/statistics/tasks` —
 * turn up in the window as well (Playwright reports a request when its worker sees it, not when the page
 * sent it), and none of them is a heal call, so every assertion below counts only the paths the heal uses.
 *
 * - Case 1: `GET /api/user/me` 200 → `POST /api/timesheet/timer/start` 200, and in both runs nothing else:
 *   no last-log read, no stop. The short way out of `:673`, proven as an absence at the mock.
 * - Case 2: `GET /api/user/me` → `GET …/status/worked` → `GET …/status` → `GET …/status/worked` →
 *   `POST …/timer/stop` answered **200** → `GET …/status` (the read `timer.service.ts:199-233` sends after a
 *   stop it accepted) → `GET /api/user/me`. No start was sent, the warning was shown, the page kept offering
 *   Start and never a Stop. That is `use-timer-api.ts:706-712` doing exactly what it says for a server that
 *   reports a cleared run while still reporting the flag — and this mock does report it that way
 *   (`mock-gauzy-server.mjs:692-695`), where Gauzy answers 406. Measured, not intended as the person's
 *   experience: this is the #5684 refusal reproduced.
 * - Case 3: the same four reads, then `POST …/timer/stop` answered **406** → `GET /api/user/me` →
 *   `GET …/status` → `GET …/status/worked` → `POST …/timer/start` 200, no warning, run on screen. Two
 *   differences from case 2 that only the code explains: no status read follows the 406 (the stop threw, so
 *   `timer.service.ts:233` was never reached), and the status + last-log pair *after* the second user read is
 *   the run read `:713-720` added.
 * - Case 4: `GET /api/user/me` → `GET …/status/worked` ×2 → `GET …/status` → `GET …/status/worked` →
 *   `POST …/timer/stop` 200 → `GET …/status` → `GET /api/user/me` → `POST …/timer/start` 200, no warning. The
 *   extra last-log reads are `useTimerRunningPastMidnight` switching on the moment the stuck user lands
 *   (`use-stale-timer-guard.ts:915-924`), not a second heal.
 * - Case 5: Stop on screen, `Start timer` count 0, no `…/timer/start` in the mock log, no warning. On this
 *   lane that state offers nothing to press, so `:678-682` is not reachable by a click.
 * - Case 6: `GET /api/user/me` → `GET …/status/worked` → `GET …/status` (running by then) →
 *   `GET …/status/worked` → `GET …/status` (the catch-up invalidation at `:631-633`), and **no**
 *   `POST …/timer/stop`: `keepRunGoingOn` refused at `:614` before any clearing stop was asked. The warning
 *   was shown, no start was sent, and the page ended showing the run it had found.
 * - Case 7: the second Start was reachable 410 ms (run 1) and 1 396 ms (run 2) after the Stop was pressed,
 *   its heal is case 3's sequence ending in a second `POST …/timer/start` 200 with no warning, and the mock
 *   logged 2 starts and 3 stops — the person's own 200 stop between the two 406 heal stops.
 *
 * ## Would these cases have been refused before the #5684 commits? Read off the diffs, not guessed
 *
 * - Case 2 was refused then too, by the same block: `git show 50a41d6a7` only renames the condition it
 *   replaces (`- if (refreshed?.employee.isTrackingTime && !hasNoRun)`), so a `cleared` stop plus a
 *   flag-still-on read refused the start before that commit as well.
 * - Case 3 and case 7 are the ones the fix changed, and before it they were refused with a *different*
 *   toast: `git show bd2636aa6` adds `clearTrackingFlag`, the function that turns a 406 into `no-run`
 *   (`use-timer-api.ts:198-212`). Before it, `keepRunOrClearStuckFlag` awaited `timerService.stopTimer`
 *   directly and the 406 fell into the heal's `catch` — today `:721-731` — refusing with
 *   `toasts.timer.START_FAILED` and sending no start. That is the person's Stop-then-Start being refused.
 * - Cases 1, 4, 5 and 6 never reach the clearing stop, so neither commit changes them.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The calls these cases watch, all of them sent by the browser straight to the mock (see the header). */
const USER_PATH = '/api/user/me';
const TIMER_STATUS_PATH = '/api/timesheet/timer/status';
const TIMER_WORKED_PATH = '/api/timesheet/timer/status/worked';
const TIMER_START_PATH = '/api/timesheet/timer/start';
const TIMER_STOP_PATH = '/api/timesheet/timer/stop';

/** The English of the two warnings, copied from `locales/en.json:3070` and `:3071`. */
const ALREADY_TRACKING = "You're already tracking time in another tab or device.";
const TRACKING_DISABLED = 'Time tracking is turned off for you. An organization admin can turn it on.';

/** No plan dialog in front of the Start button, as in `suites/lane-a/timer-journey.spec.ts`. */
const SCENARIO = { hasPlan: false, requirePlanToTrack: false };

/**
 * The mock's CORS answer (`mock-gauzy-server.mjs:997-1006`), restated for every answer this spec writes
 * itself: the page is on `http://localhost:3031` and the API on `http://127.0.0.1:3992`, so an answer
 * without these headers is discarded by the browser and the call becomes an error. Restated rather than
 * copied off the fetched response, because Playwright keeps that response's `content-length` when a new
 * body is handed to `route.fulfill`.
 */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

type Call = { method: string; path: string; status: number };

/**
 * Every call the page sends to the mock origin, in browser order, from the moment this is attached —
 * before the first navigation, so a load-time read cannot slip past. A `status` of 0 means the answer was
 * never seen (a request that failed); `OPTIONS` is left out as a CORS preflight, not an ask of the app.
 */
function recordCalls(page: Page) {
	const calls: Call[] = [];

	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN) return;
		if (request.method() === 'OPTIONS') return;
		const call: Call = { method: request.method(), path: url.pathname, status: 0 };
		calls.push(call);
		void request
			.response()
			.then((response) => {
				if (response) call.status = response.status();
			})
			.catch(() => undefined);
	});

	return {
		calls,
		/** Where the recording stands now; `since(mark)` is what the page did after it. */
		mark: () => calls.length,
		since: (mark: number) => calls.slice(mark)
	};
}

const asPair = (call: Call) => [call.method, call.path, call.status];
const printed = (calls: Call[]) => JSON.stringify(calls.map(asPair));
/** The mock's own request log for one path, as `method path status` triples (its log keeps no body). */
const mockLog = (requests: Array<{ method: string; path: string; status: number }>) =>
	JSON.stringify(requests.map((request) => [request.method, request.path, request.status]));
const timerCalls = (calls: Call[]) => calls.filter((call) => call.path.startsWith('/api/timesheet/'));
const countOf = (calls: Call[], path: string, method: string) =>
	calls.filter((call) => call.path === path && call.method === method).length;

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
function report(label: string, calls: Call[]) {
	console.log(`[lane-a stuck] MEASURE ${label} · after the click: ${printed(calls)}`);
}

const startButton = (page: Page) => page.locator('button[aria-label="Start timer"]').first();
const stopButton = (page: Page) => page.locator('button[aria-label="Stop timer"]').first();
const alreadyTrackingToast = (page: Page) => page.getByText(ALREADY_TRACKING, { exact: true });
const trackingDisabledToast = (page: Page) => page.getByText(TRACKING_DISABLED, { exact: true });

/**
 * What the user-read stub saw: how many reads it answered, and the mock's own `employee.isTrackingTime`
 * behind each of them — the witness that the stub changed a `false` (the lane mock is always `false`,
 * `mock-gauzy-server.mjs:129`) into a stuck `true`, and never hid a flag the mock really reported.
 */
type FlagStub = { reads: number; mockFlags: boolean[] };

/**
 * Answers `GET /api/user/me` as the mock did with `employee.isTrackingTime` forced to true.
 *
 * `mode: 'every read'` keeps it stuck, the way a server that never cleared it does.
 * `mode: 'first read after the click'` flips it only for the read `canStartWithoutTrackingConflict` asks
 * first (`use-timer-api.ts:669`); the confirmation read at `:702` then gets the mock's own `false`, which
 * is what a server that *did* clear the flag answers. `window.armed` is switched on by the test right
 * before the click, so a load-time read is never the one the stub marks stuck.
 */
async function stubTrackingFlag(
	page: Page,
	seen: FlagStub,
	mode: 'every read' | 'first read after the click',
	window: { armed: boolean; used: number }
): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === USER_PATH,
		async (route) => {
			if (route.request().method() !== 'GET') return route.fallback();

			const upstream = await fetchReadFromMock(route);
			const original = (await upstream.json()) as Record<string, unknown>;
			const employee = (original.employee ?? {}) as Record<string, unknown>;
			const isStuckRead = mode === 'every read' || (window.armed && window.used === 0);
			if (isStuckRead) window.used += 1;

			seen.reads += 1;
			seen.mockFlags.push(employee.isTrackingTime === true);

			return route.fulfill({
				status: upstream.status(),
				headers: CORS_HEADERS,
				json: { ...original, employee: { ...employee, isTrackingTime: isStuckRead } }
			});
		}
	);
}

/**
 * Answers `POST /api/timesheet/timer/stop` the way Gauzy does, because this mock does not: Gauzy answers
 * 406 when no run is left to stop (`use-timer-api.ts:198-201`, and `timer-errors.ts:19-25` names that very
 * answer), while `mock-gauzy-server.mjs:692-695` answers 200 whatever its own `scenario.timerRunning`
 * says. The call is forwarded to the mock first either way, so its request log still holds the stop the
 * page sent; only the answer is restated, and only when the mock held no run.
 */
async function stubStopAsGauzyWould(page: Page, seen: { hadRun: boolean[] }): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === TIMER_STOP_PATH,
		async (route) => {
			if (route.request().method() !== 'POST') return route.fallback();

			const state = (await mockState()) as { scenario?: { timerRunning?: boolean } };
			const hadRun = state?.scenario?.timerRunning === true;
			seen.hadRun.push(hadRun);

			const upstream = await route.fetch();
			const body = (await upstream.json()) as Record<string, unknown>;
			if (hadRun) return route.fulfill({ status: upstream.status(), headers: CORS_HEADERS, json: body });

			return route.fulfill({
				status: 406,
				headers: CORS_HEADERS,
				json: { statusCode: 406, message: 'There is no running time log to stop.' }
			});
		}
	);
}

/** The person is on the team page with the timer stopped and the Start button answering. */
async function openStoppedTimer(page: Page, fixture: BootstrapFixture): Promise<void> {
	await signInAndVisit(page, fixture, '/', { scenario: SCENARIO });
	await expect(startButton(page)).toHaveAttribute('aria-disabled', 'false', { timeout: 20_000 });
}

test.describe('lane-a · a stuck isTrackingTime flag against the timer start (#5684)', () => {
	// ------------------------------------------------------------------ 1. the control

	test('1 · nothing stubbed: Start starts, and no heal call is asked for at all', async ({ page, fixture, mock }) => {
		const traffic = recordCalls(page);
		await openStoppedTimer(page, fixture);

		const mark = traffic.mark();
		await startButton(page).click();
		await expect(stopButton(page), 'the run the person asked for is on screen').toBeVisible({ timeout: 20_000 });

		const after = traffic.since(mark);
		// `canStartWithoutTrackingConflict` took the short way out (`use-timer-api.ts:673`): the flag said
		// `false`, so nothing was stopped and no last log was read. A plain status read is not proof of a
		// heal — the shell re-reads it on its own too — so the proof here is the two paths only the heal uses.
		expect(
			countOf(after, TIMER_WORKED_PATH, 'GET'),
			`the heal read a last log it had no reason to (${printed(after)})`
		).toBe(0);
		expect(
			countOf(after, TIMER_STOP_PATH, 'POST'),
			`the heal stopped something it had no reason to (${printed(after)})`
		).toBe(0);
		expect(
			countOf(after, TIMER_START_PATH, 'POST'),
			`the start was not sent from this click (${printed(after)})`
		).toBe(1);

		const mockStarts = await mock.calls(TIMER_START_PATH);
		expect(mockStarts.length, `the mock did not record exactly one start (${mockLog(mockStarts)})`).toBe(1);
		expect(
			mockStarts.every((request) => request.method === 'POST' && request.status === 200),
			`the start the mock recorded is not a 200 POST (${mockLog(mockStarts)})`
		).toBe(true);
		expect(mockStarts[0].path, 'the start is the API path the browser itself sent').toBe(TIMER_START_PATH);

		await expect(alreadyTrackingToast(page)).toHaveCount(0);
		report('1 control (no stub)', after);
	});

	// ------------------------------------------------------------------ 2. stuck flag, the mock's own 200 stop

	test('2 · flag stuck at every read, stop answered 200 as this mock answers it: the start is refused with the #5684 warning', async ({
		page,
		fixture,
		mock
	}) => {
		const seen: FlagStub = { reads: 0, mockFlags: [] };
		await stubTrackingFlag(page, seen, 'every read', { armed: false, used: 0 });
		const traffic = recordCalls(page);
		await openStoppedTimer(page, fixture);

		expect(
			seen.mockFlags.every((flag) => flag === false),
			`the stub was built on a mock user that already claimed to track time (${JSON.stringify(seen.mockFlags)})`
		).toBe(true);

		const mark = traffic.mark();
		await startButton(page).click();

		await expect(
			alreadyTrackingToast(page),
			'the person is told the timer is supposedly already running'
		).toBeVisible({ timeout: 20_000 });
		await expect(
			trackingDisabledToast(page),
			'the refusal is the tracking-flag one, not the tracking-off one'
		).toHaveCount(0);
		// Nothing started: the page still offers Start, and the mock holds no run.
		await expect(startButton(page)).toBeVisible({ timeout: 20_000 });
		await expect(stopButton(page)).toHaveCount(0);
		const mockStarts = await mock.calls(TIMER_START_PATH);
		expect(mockStarts.length, `a start was sent although the check refused (${mockLog(mockStarts)})`).toBe(0);

		const after = traffic.since(mark);
		// The heal really ran, in the order `canStartWithoutTrackingConflict` runs it: the user read at `:669`,
		// the last log for `stopStaleTeamsTimer` at `:692`, the status and the last log of `keepRunGoingOn`, the
		// clearing stop at `:651` and then the confirmation read at `:702`.
		expect(
			countOf(after, USER_PATH, 'GET'),
			`the check did not read the user twice (${printed(after)})`
		).toBeGreaterThanOrEqual(2);
		expect(
			countOf(after, TIMER_WORKED_PATH, 'GET'),
			`the heal never read the employee's last log (${printed(after)})`
		).toBeGreaterThanOrEqual(2);
		expect(
			countOf(after, TIMER_STATUS_PATH, 'GET'),
			`the heal never read the timer status (${printed(after)})`
		).toBeGreaterThanOrEqual(1);
		expect(
			countOf(after, TIMER_STOP_PATH, 'POST'),
			`the heal never sent its clearing stop (${printed(after)})`
		).toBe(1);
		expect(countOf(after, TIMER_START_PATH, 'POST'), 'a start was sent despite the refusal').toBe(0);

		// The witness of why it refused: the mock answered that stop 200 (`mock-gauzy-server.mjs:692-695`), so
		// `clearTrackingFlag` reported `cleared` (`use-timer-api.ts:202-206`) while the read after it still said
		// tracking → `use-timer-api.ts:706-712` blocks with this very toast. Measured, not intended: a real
		// Gauzy answers 406 here, and that is case 3.
		const stopCall = after.find((call) => call.path === TIMER_STOP_PATH);
		expect(stopCall?.status, 'the mock answered its own no-run stop with 200').toBe(200);
		report('2 stuck flag, mock answered the stop 200 → refused', after);
	});

	// ------------------------------------------------------------------ 3. stuck flag, stop answered 406 like Gauzy

	test('3 · flag stuck at every read, stop answered 406 as Gauzy answers it: the heal starts, with no warning', async ({
		page,
		fixture,
		mock
	}) => {
		const seen: FlagStub = { reads: 0, mockFlags: [] };
		const stops = { hadRun: [] as boolean[] };
		await stubTrackingFlag(page, seen, 'every read', { armed: false, used: 0 });
		await stubStopAsGauzyWould(page, stops);
		const traffic = recordCalls(page);
		await openStoppedTimer(page, fixture);

		const mark = traffic.mark();
		await startButton(page).click();
		await expect(stopButton(page), 'the start the person asked for went through').toBeVisible({ timeout: 20_000 });

		const after = traffic.since(mark);
		const stopCall = after.find((call) => call.path === TIMER_STOP_PATH);
		expect(stopCall?.status, `the clearing stop was not answered 406 (${printed(after)})`).toBe(406);
		expect(stops.hadRun, 'this stub restated the answer only because the mock held no run').toEqual([false]);

		// The #5684 path, in the order the code runs it: read the user (`:669`), read the last log for
		// `stopStaleTeamsTimer` (`:692`), read the status and the last log afresh in `keepRunGoingOn`, stop with
		// nothing to stop (`:651`), read the user again (`:702`) and — the part the fix added, `:713-720` — read
		// the run once more before letting the start go.
		expect(
			countOf(after, USER_PATH, 'GET'),
			`the confirmation read at :702 is missing (${printed(after)})`
		).toBeGreaterThanOrEqual(2);
		expect(
			countOf(after, TIMER_WORKED_PATH, 'GET'),
			`the run was not read afresh twice (${printed(after)})`
		).toBeGreaterThanOrEqual(2);
		expect(
			countOf(after, TIMER_STATUS_PATH, 'GET'),
			`the run was not read from the status twice (${printed(after)})`
		).toBeGreaterThanOrEqual(2);
		expect(countOf(after, TIMER_STOP_PATH, 'POST'), `the clearing stop was not sent once (${printed(after)})`).toBe(
			1
		);
		expect(countOf(after, TIMER_START_PATH, 'POST'), 'the start the person asked for was not sent').toBe(1);

		// The flag was still on at every read, and it refused nothing — which is the whole of the fix.
		expect(
			seen.mockFlags.every((flag) => flag === false),
			'the stub read a mock user that claimed to track time'
		).toBe(true);
		await expect(alreadyTrackingToast(page), 'a stuck flag with no run behind it must not warn').toHaveCount(0);
		await expect(trackingDisabledToast(page)).toHaveCount(0);

		const mockStarts = await mock.calls(TIMER_START_PATH);
		expect(
			mockStarts.filter((request) => request.method === 'POST').length,
			`the mock did not record the start it was asked for (${mockLog(mockStarts)})`
		).toBe(1);
		const mockStops = await mock.calls(TIMER_STOP_PATH);
		expect(mockStops.length, `the mock never saw the stop this spec forwarded (${mockLog(mockStops)})`).toBe(1);
		report('3 stuck flag, stop answered 406 like Gauzy → started', after);
	});

	// ------------------------------------------------------------------ 4. the server clears the flag

	test('4 · flag stuck only on the first read and cleared by the heal stop: the start goes through, no warning', async ({
		page,
		fixture,
		mock
	}) => {
		const seen: FlagStub = { reads: 0, mockFlags: [] };
		const window = { armed: false, used: 0 };
		await stubTrackingFlag(page, seen, 'first read after the click', window);
		const traffic = recordCalls(page);
		await openStoppedTimer(page, fixture);

		const mark = traffic.mark();
		window.armed = true;
		await startButton(page).click();
		await expect(stopButton(page), 'the server cleared the flag, so the start went through').toBeVisible({
			timeout: 20_000
		});

		const after = traffic.since(mark);
		expect(
			countOf(after, TIMER_STOP_PATH, 'POST'),
			`the heal did not stop to clear the flag (${printed(after)})`
		).toBe(1);
		expect(
			after.find((call) => call.path === TIMER_STOP_PATH)?.status,
			`the mock answered its clearing stop (${printed(after)})`
		).toBe(200);
		expect(
			countOf(after, USER_PATH, 'GET'),
			`the confirmation read at :702 is missing (${printed(after)})`
		).toBeGreaterThanOrEqual(2);
		expect(countOf(after, TIMER_START_PATH, 'POST'), 'the start was not sent').toBe(1);

		// `isFlagStillOn` was false at `use-timer-api.ts:706`, so this case never reaches the toast at all: the
		// stuck read was one read deep and the server's own answer came back clean.
		expect(window.used, 'the stuck read the stub produced never happened').toBe(1);
		await expect(alreadyTrackingToast(page)).toHaveCount(0);
		await expect(trackingDisabledToast(page)).toHaveCount(0);

		const mockStarts = await mock.calls(TIMER_START_PATH);
		expect(
			mockStarts.filter((request) => request.method === 'POST').length,
			`the mock did not record the start (${mockLog(mockStarts)})`
		).toBe(1);
		report('4 stale read cleared by the heal stop (mock answered 200) → started', after);
	});

	// ------------------------------------------------------------------ 5. genuinely running, on load

	test('5 · the mock holds a run and the flag is stuck: the page shows the run and offers no Start to press', async ({
		page,
		fixture,
		mock
	}) => {
		const seen: FlagStub = { reads: 0, mockFlags: [] };
		await stubTrackingFlag(page, seen, 'every read', { armed: false, used: 0 });
		const traffic = recordCalls(page);
		await signInAndVisit(page, fixture, '/', { scenario: { ...SCENARIO, timerRunning: true } });

		await expect(stopButton(page), 'the page shows the run the mock holds').toBeVisible({ timeout: 20_000 });
		// `timer-button.tsx:53` renders one button per state: while the status says running the Start button is
		// not on the page at all, so the refusal at `use-timer-api.ts:678-682` cannot be reached from this state
		// by pressing anything. That is what this case pins.
		await expect(startButton(page), 'and it offers no second start').toHaveCount(0);

		const state = (await mock.state()) as { scenario?: { timerRunning?: boolean } };
		expect(state.scenario?.timerRunning, 'the mock still holds the run').toBe(true);
		expect(
			timerCalls(traffic.calls).some((call) => call.path === TIMER_START_PATH),
			`a start was sent unprompted (${printed(traffic.calls)})`
		).toBe(false);
		await expect(alreadyTrackingToast(page), 'nothing was clicked, so nothing warned').toHaveCount(0);
		report('5 running at load (stuck flag too): no Start control', timerCalls(traffic.calls));
	});

	// ------------------------------------------------------------------ 6. a run appears while the page sits

	test('6 · a run starts elsewhere while this page sits on its stale stopped status: Start is refused with the warning', async ({
		page,
		fixture,
		mock
	}) => {
		const seen: FlagStub = { reads: 0, mockFlags: [] };
		await stubTrackingFlag(page, seen, 'every read', { armed: false, used: 0 });
		const traffic = recordCalls(page);
		await openStoppedTimer(page, fixture);

		// Another tab or device started a run, while this page's own status still says stopped. The shell's
		// status query re-reads at most every 60 000 ms (`init-state.tsx:38`, `:155`), so the click below lands
		// before any poll can answer the new run to the page.
		await mock.scenario({ timerRunning: true });
		const state = (await mock.state()) as { scenario?: { timerRunning?: boolean } };
		expect(state.scenario?.timerRunning, 'the mock now holds the run this page cannot see yet').toBe(true);

		const mark = traffic.mark();
		await startButton(page).click();

		await expect(alreadyTrackingToast(page), 'a run that goes on really does refuse the start').toBeVisible({
			timeout: 20_000
		});
		await expect(trackingDisabledToast(page)).toHaveCount(0);
		const mockStarts = await mock.calls(TIMER_START_PATH);
		expect(mockStarts.length, `a start was sent over a run that goes on (${mockLog(mockStarts)})`).toBe(0);
		// The refusal hands the person the run it found (`use-timer-api.ts:615-628` shows it, `:631-633` makes
		// the status queries catch up), so the page ends showing the run rather than a dead Start button.
		await expect(stopButton(page), 'the refused start leaves the found run on screen').toBeVisible({
			timeout: 20_000
		});

		const after = traffic.since(mark);
		// Which branch refused is readable from the calls: the refusal at `:678-682` sends no heal call at all,
		// while the one at `keepRunGoingOn` (`:614`) is preceded by a last-log read. Either way no start was sent
		// and the same warning was shown, and both are printed for the log to judge.
		const tookTheHealPath = countOf(after, TIMER_WORKED_PATH, 'GET') > 0;
		expect(
			tookTheHealPath || countOf(after, TIMER_STATUS_PATH, 'GET') >= 1,
			`neither refusal branch ran (${printed(after)})`
		).toBe(true);
		expect(countOf(after, TIMER_START_PATH, 'POST'), 'a start was sent despite the refusal').toBe(0);
		report(`6 run found afresh (heal path: ${tookTheHealPath}) → refused`, after);
	});

	// ------------------------------------------------------------------ 7. Stop, then Start right away

	test('7 · Start, Stop and Start again a moment later, flag stuck the whole time: the second start goes through', async ({
		page,
		fixture,
		mock
	}) => {
		const seen: FlagStub = { reads: 0, mockFlags: [] };
		const stops = { hadRun: [] as boolean[] };
		await stubTrackingFlag(page, seen, 'every read', { armed: false, used: 0 });
		await stubStopAsGauzyWould(page, stops);
		const traffic = recordCalls(page);
		await openStoppedTimer(page, fixture);

		await startButton(page).click();
		await expect(stopButton(page), 'the run the person started').toBeVisible({ timeout: 20_000 });
		await stopButton(page).click();

		// Not a fixed wait: the Start button is back once the status read that follows the stop landed
		// (`timer.service.ts:199-233`, the direct branch ends with `return this.getTimerStatus()`), which is the
		// moment a person who presses Start again reaches it.
		const stopPressedAt = Date.now();
		await expect(startButton(page), 'the page offers Start again after the stop').toHaveAttribute(
			'aria-disabled',
			'false',
			{ timeout: 20_000 }
		);
		const pressedAfterMs = Date.now() - stopPressedAt;
		const mark = traffic.mark();
		await startButton(page).click();
		await expect(stopButton(page), 'the second run is on screen').toBeVisible({ timeout: 20_000 });

		const after = traffic.since(mark);
		expect(countOf(after, TIMER_START_PATH, 'POST'), `the second start was refused (${printed(after)})`).toBe(1);
		expect(
			after.find((call) => call.path === TIMER_STOP_PATH)?.status,
			`the second heal's stop was not answered 406, i.e. the API had no run to stop (${printed(after)})`
		).toBe(406);
		await expect(alreadyTrackingToast(page), 'the #5684 sequence must not warn the person').toHaveCount(0);
		await expect(trackingDisabledToast(page)).toHaveCount(0);

		const mockStarts = await mock.calls(TIMER_START_PATH);
		const mockStops = await mock.calls(TIMER_STOP_PATH);
		expect(
			mockStarts.filter((request) => request.method === 'POST').length,
			`the mock did not record both starts (${mockLog(mockStarts)})`
		).toBe(2);
		expect(
			mockStops.filter((request) => request.method === 'POST').length,
			`the mock did not record the person's stop and the heal's stop (${mockLog(mockStops)})`
		).toBeGreaterThanOrEqual(2);

		// The case is only the #5684 sequence while the second Start really follows the Stop closely.
		expect(
			pressedAfterMs,
			`the second Start was pressed ${pressedAfterMs} ms after the first Stop landed`
		).toBeLessThan(15_000);
		report(`7 Start → Stop → Start ${pressedAfterMs} ms later, stuck flag, 406-aware stop`, after);
	});
});
