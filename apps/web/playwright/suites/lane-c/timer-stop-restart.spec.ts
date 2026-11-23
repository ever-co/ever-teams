import { createHash } from 'node:crypto';

import { expect, test } from '../../api-fixtures';
import { receivedTokens } from '../../helpers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The timer sequence at the API boundary, and the one thing #5684 changed in it.
 *
 * Run on lane-c (app 3033, mock 4002) on 2026-11-22/23; the probes every number below was read off are
 * `E:\Coding\.tmp\s2-lane-c-timer-probe-1.txt` through `-6.txt` and `-9.txt` (probe 4 walks the sequences of this file
 * three times each, probe 5 asks the mock the same things without the app in the way, probe 9 re-measures the refused
 * stop and the body-less ones on tokens proved distinct), and the runs of this file are
 * `E:\Coding\.tmp\s2-lane-c-timer-<n>.log`.
 *
 * ## The fix, and what it is visible as from outside the app
 *
 * `app/api/timer/stop/route.ts:112-116` is the fix (commit `bf800ed65`): a `finally` that calls
 * `sessionChecks.drop(access_token)`. `sessionChecks` (`core/services/server/guards/authenticated-guard-app.ts:29-31`)
 * reuses one session check per access token for `SESSION_CHECK_MEMO_DEFAULT_TTL_MS` = 5 000 ms
 * (`core/services/server/guards/session-check-memo.ts:7`); `drop` (`:163-168`) forgets the kept answer for one token,
 * and it does nothing for an empty token (`:164-166`), which is also why `answer` never memoizes a caller with no
 * token at all (`:107`).
 *
 * Where the refusal actually lived: **not in the start route.** `grep -n "running\|isTrackingTime\|stuck"` over
 * `app/api/timer/start/route.ts` answers **nothing** (exit 1): that route has no tracking test of its own, it forwards
 * and takes whatever the API answers. Over `app/api/timer/` as a whole the same three words match only the stop
 * route's own comment and its unit tests. The refusal was in the client:
 * `core/hooks/timer/use-timer-api.ts`, `canStartWithoutTrackingConflict` — `if (userData?.employee.isTrackingTime)`
 * (`:673`), the desync auto-heal (`:684-696`), the refreshed read still saying tracking (`:706-712`) and #5684's own
 * rule at `:714-716`. Every one of those returns `false` **without sending anything**, so no HTTP status of this app
 * ever carried the bug, and no status code can pin it here. What the drop leaves behind for an API-level test is the
 * session check itself: after a stop, the next route of the same token must ask `GET /api/user/me` again instead of
 * being answered from the check made before the stop.
 *
 * ## Whether this mock can reproduce the pre-fix refusal: no
 *
 * `cypress/support/mock-gauzy-server.mjs:544` answers `/api/user/me` with `data.baseUser`, whose employee is built
 * once with `isTrackingTime: false` (`:129`) and is never touched again — `isTrackingTime` appears exactly once in
 * that whole file. The timer handlers (`:686-695`) flip only `state.scenario.timerRunning`, which feeds
 * `timerStatus.running` (`:253`) and nothing in the user. Measured with `scenario: { timerRunning: true }` armed
 * before the read (probe 3): `employee.isTrackingTime` is `false`, and it is still `false` after the start reached
 * the mock. So the stale-true flag the bug needs cannot be produced here, and the mock's start handler answers
 * `{ success: true }` whatever it is asked (`:687-691`), so a Start is never refused upstream either.
 *
 * What this file therefore pins, and what it does not: it pins the **sequence's correct behaviour** — every call of
 * Start / Stop / Start / Stop landing at the mock in the order it was sent, and a session check made *after* a stop
 * rather than inherited from before it — plus the harness limits below. It does **not** prove the #5684 refusal, and
 * it does not claim to: the refusal was a client decision that never left the browser, and the user this mock hands
 * the app never looks like it is tracking. The pre-fix shape is pinned at unit level, against a fake upstream whose
 * flag does flip, by `app/api/timer/stop/route.session-check.test.ts` (added in the same commit).
 *
 * ## The witness this file can use, and its control
 *
 * Measured on a warm lane, one fresh token, `start → stop → start → status` in well under the 5 s window (probe 4,
 * three runs, 88-338 ms): two `GET /api/user/me` entries, the second sitting **strictly between** the stop's own
 * upstream calls and the second `POST /api/timesheet/timer/start`, and the trailing status call paying no check of
 * its own — so the memo is sharing again the moment the drop has done its work, and the extra read is the drop's, not
 * an expired window. The control was measured too: the same three signed-in calls with **no** stop between them pay
 * **one** check (probe 3, three runs of `start → status → start`), and `start → stop` pays one (probe 4).
 *
 * Check *positions* are pinned exactly, and they are what the #5684 claim rests on. Check *counts* are pinned exactly
 * only where they were stable in every run of every shape measured (1 for `start → stop`, 1 for `start → 400 stop →
 * start`, 2 for the anonymous pair), and as bounds — "at least 2", "fewer than the calls" — on the four-call sequences,
 * for one measured reason: on the coldest run of a lane a dev compile lands inside the window and a route pays a check
 * of its own (probe 2 run 1: 4 checks for 5 calls, the first call alone 3 053 ms; probe 4 run 1: 3 checks for the four
 * calls at 94 ms wall clock). Every position pin held in the cold run as well as in the warm ones. Read a red count
 * this way: too many checks means the memo stopped sharing, or the lane recompiled mid-window — re-run the file before
 * believing either; too few means a stop no longer forces a fresh check, which is the #5684 shape. The `beforeAll`
 * warm-up is what keeps a measured run off a cold compile, and every sequence whose count is a statement about *reuse*
 * also asserts its own wall clock is inside the reuse window. (The anonymous pair's count is not such a statement: no
 * token, nothing kept, one check per call — `session-check-memo.ts:107`.)
 *
 * ## Limits measured rather than assumed
 *
 * - **An anonymous caller is not refused by these two routes, and reaches the mock.** `authenticatedGuard` hands the
 *   caller's token to `/api/user/me` and delegates the decision to it; this mock answers that with the fixture user
 *   whatever arrives, including no Bearer at all (its own note of that limit is
 *   `suites/lane-c/session-check.spec.ts`, header). Measured: both writes answered 200 and the mock recorded them
 *   with `receivedTokens` empty for the timer path — the write left this app carrying no credential. A real API would
 *   answer that check 401 and the start route would then forward the refusal through `gauzyErrorResponse`
 *   (`app/api/timer/start/route.ts:181-184`); this harness cannot cause that. Pinned as measured, not intended.
 * - **A validation refusal is not "nothing was asked".** The guard runs before the body is read
 *   (`app/api/timer/start/route.ts:86-103`), so every 400 below paid a session check first; only the timer calls are
 *   absent. A cross-site refusal is the opposite: `refuseForeignOrigin` is the first statement of both routes
 *   (`:86-87` and `:82-83` of the stop route), and the whole mock log stays empty.
 * - **`POST /api/timer/stop` with a body it cannot read answers 500 with an empty body**, while `POST /api/timer/start`
 *   with the same body-less request answers 200 and runs: the start route reads its body as
 *   `req.json().catch(() => ({}))` (`:103`), the stop route as bare `await req.json()` (`:88`). This is the app failing
 *   on its own request body, not the mock refusing it — asked directly, the mock answers that same body-less stop
 *   200 `{"success":true}` (probe 5). Pinned as measured, not intended.
 * - **A Stop this app refuses on its own does not forget the session check**, because `sessionChecks.drop` sits in the
 *   `finally` of the try that *forwards* (`:94-116`): a 400 or the 500 above never reaches it. Measured on one fresh
 *   token, `start → stop(400) → start`: one session check for the three guarded calls, the Start accepted (probe 9).
 *   Nothing about the run changed there, so the kept answer is the right answer — this is the boundary of the fix, not
 *   a hole in it.
 * - **An upstream 406 / 409 on a stop cannot be caused here.** `passedRefusalOf` (`app/api/timer/stop/route.ts:69-79`)
 *   passes Gauzy's "no running log to stop" (406) and "the named time log is not the running one" (409) through
 *   unchanged; this mock answers every stop `{ success: true }` (`cypress/support/mock-gauzy-server.mjs:692-695`), so
 *   neither status is reachable from a Playwright case. Both are pinned at unit level against a fake upstream that does
 *   answer them: 409 in `app/api/timer/stop/route.test.ts:129-135`, 406 in
 *   `app/api/timer/stop/route.session-check.test.ts:81-91`.
 */

const APP_START = '/api/timer/start';
const APP_STOP = '/api/timer/stop';
const APP_STATUS = '/api/timer/status';
const UP_START = '/api/timesheet/timer/start';
const UP_STOP = '/api/timesheet/timer/stop';
const UP_STATUS = '/api/timesheet/timer/status';
const UP_CHECK = '/api/user/me';

const FOREIGN_ORIGIN = 'https://some-other-site.example';

/** `NOTES_REFUSAL` of `app/api/timer/start/route.ts:10`, with `TIMER_NOTES_MAX_LENGTH` = 1000 (`core/lib/utils/timer/timer-notes.ts:1`). */
const NOTES_REFUSAL = 'description must be a string of at most 1000 characters';

/** `SESSION_CHECK_MEMO_DEFAULT_TTL_MS` (`core/services/server/guards/session-check-memo.ts:7`), and the window a measured sequence must fit inside. */
const MEMO_TTL_MS = 5_000;
const WINDOW_MS = 4_000;

type LogEntry = { method: string; path: string; status: number };
type TimerMockState = { scenario?: { timerRunning?: boolean }; mutationProof?: { startedTimer?: boolean } };

const base64url = (value: object) =>
	Buffer.from(JSON.stringify(value)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

/**
 * The fixture session's token with a `jti` of this test's own. `sessionChecks` keys its kept answer by the token, so a
 * per-test nonce keeps a case from being answered by a previous case's check (`mockReset()` does not clear that memo —
 * it is a property of the app process). Same shape as `suites/lane-c/session-check.spec.ts`.
 */
function tokenOfNonce(ids: Record<string, string>, nonce: string): string {
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: ids.user, organizationId: ids.organizationA, iat: now, exp: now + 86_400, jti: nonce };
	return `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(claims)}.lane-c`;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** The session cookies with only the access token replaced. */
function withToken(cookieHeader: string, token: string): string {
	return cookieHeader.replace(/(^|; )auth-token=[^;]+/, (_match, lead: string) => `${lead}auth-token=${token}`);
}

let nonceCounter = 0;
const nextNonce = () => `timer-${Date.now()}-${(nonceCounter += 1)}`;

/** Every timer call the mock recorded, in the order it recorded them, as `METHOD PATH STATUS` lines. */
const timerCalls = (requests: LogEntry[]): string[] =>
	triples(requests.filter((request) => request.path.startsWith('/api/timesheet/timer/')));

/** How many session checks the mock was asked for. */
const checks = (requests: LogEntry[]): number => requests.filter((request) => request.path === UP_CHECK).length;

const indexOfCall = (requests: LogEntry[], method: string, path: string): number =>
	requests.findIndex((request) => request.method === method && request.path === path);

/** Session checks recorded strictly between two positions of the log. */
const checksBetween = (requests: LogEntry[], after: number, before: number): number =>
	requests.filter((request, index) => index > after && index < before && request.path === UP_CHECK).length;

/** The guarded calls a signed-in sequence makes: start, stop, start, and one plain status read. */
function describeSequence(requests: LogEntry[]): string {
	return `timer ${JSON.stringify(timerCalls(requests))} · ${checks(requests)} session check(s) · whole log ${logOf(requests)}`;
}

test.describe('lane-c · the timer sequence at the API boundary', () => {
	// A cold lane pays a dev compile for the first call of a route (measured: 3 053 ms, probe 2 run 1), which lands
	// inside the memo's 5 s window and moves a check count. Every case below runs on routes this warm-up has already
	// compiled, on a token of its own that no other case inherits.
	test.beforeAll(async ({ api, cookies, ids }) => {
		const cookie = withToken(cookies('A'), tokenOfNonce(ids, nextNonce()));
		await api(APP_START, { method: 'POST', body: { taskId: ids.task }, headers: { cookie } });
		await api(APP_STATUS, { method: 'GET', headers: { cookie } });
		await api(APP_STOP, { method: 'POST', body: { source: 'TEAMS' }, headers: { cookie } });
	});

	test('a signed-in Start is forwarded, and the answer is the run the mock now holds', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		const token = tokenOfNonce(ids, nextNonce());
		const response = await api(APP_START, {
			method: 'POST',
			body: { taskId: ids.task, isBillable: true, logType: 'TRACKED' },
			headers: { cookie: withToken(cookies('A'), token) }
		});
		const text = await response.text();
		const log = await mock.requests();
		const why = `POST ${APP_START} signed in`;

		expect(response.status(), `${why} answered ${response.status()} ${text.slice(0, 200)}`).toBe(200);
		const body = parseAnswer(text) as { running?: boolean; lastLog?: { taskId?: string; source?: string } };
		expect(
			body.running,
			`${why}: the status it answered is not the run the mock was told to hold (${text.slice(0, 200)})`
		).toBe(true);
		expect(
			body.lastLog?.taskId,
			`${why}: the run it answered is not for the task the body named (${text.slice(0, 200)})`
		).toBe(ids.task);

		expect(timerCalls(log), `${why}: the mock recorded ${describeSequence(log)}`).toEqual([
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`
		]);

		const state = (await mock.state()) as TimerMockState;
		expect(
			state.scenario?.timerRunning,
			`${why}: the mock does not hold the run (${JSON.stringify(state.scenario)})`
		).toBe(true);
		expect(
			state.mutationProof?.startedTimer,
			`${why}: the mock's own write proof did not land (${JSON.stringify(state.mutationProof)})`
		).toBe(true);

		// The write is the person's own: the token the mock saw is the one this test put in the cookie, and only it.
		expect(
			await receivedTokens(UP_START),
			`${why}: the Bearer the API saw is not the session cookie's token — ${describeSequence(log)}`
		).toEqual([sha256(token)]);
	});

	test('a signed-in Stop is forwarded, and the status read that ends the run follows it at once', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		const cookie = withToken(cookies('A'), tokenOfNonce(ids, nextNonce()));
		const started = await api(APP_START, { method: 'POST', body: { taskId: ids.task }, headers: { cookie } });
		const stopped = await api(APP_STOP, { method: 'POST', body: { source: 'TEAMS' }, headers: { cookie } });
		const stoppedText = await stopped.text();
		const log = await mock.requests();
		const why = `POST ${APP_START} then POST ${APP_STOP}, signed in`;

		expect(started.status(), `${why}: the start answered ${started.status()} ${await started.text()}`).toBe(200);
		expect(stopped.status(), `${why}: the stop answered ${stopped.status()} ${stoppedText.slice(0, 200)}`).toBe(
			200
		);

		// `app/api/timer/stop/route.ts:118-121` reads the status after the stop it posted, so the stop's own status
		// read is the entry right behind the stop, and the run the answer holds is stopped.
		expect(timerCalls(log), `${why}: the mock recorded ${describeSequence(log)}`).toEqual([
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`,
			`POST ${UP_STOP} 200`,
			`GET ${UP_STATUS} 200`
		]);
		const stopAt = indexOfCall(log, 'POST', UP_STOP);
		expect(
			log[stopAt + 1]?.path,
			`${why}: nothing but a status read may follow the stop; the entry after it is ${JSON.stringify(
				log[stopAt + 1]
			)} — ${describeSequence(log)}`
		).toBe(UP_STATUS);

		const body = parseAnswer(stoppedText) as { running?: boolean };
		expect(
			body.running,
			`${why}: the answer after the stop still says the timer runs (${stoppedText.slice(0, 200)})`
		).toBe(false);
		const state = (await mock.state()) as TimerMockState;
		expect(
			state.scenario?.timerRunning,
			`${why}: the mock still holds a run (${JSON.stringify(state.scenario)})`
		).toBe(false);
	});

	test('the four calls sent back to back land at the mock in exactly the order they were sent', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		const cookie = withToken(cookies('A'), tokenOfNonce(ids, nextNonce()));
		const started = Date.now();
		const first = await api(APP_START, { method: 'POST', body: { taskId: ids.task }, headers: { cookie } });
		const firstStop = await api(APP_STOP, { method: 'POST', body: { source: 'TEAMS' }, headers: { cookie } });
		const second = await api(APP_START, { method: 'POST', body: { taskId: ids.task }, headers: { cookie } });
		const secondStop = await api(APP_STOP, { method: 'POST', body: { source: 'TEAMS' }, headers: { cookie } });
		const wallMs = Date.now() - started;
		const log = await mock.requests();
		const why = 'Start, Stop, Start, Stop on one session';
		const statuses = [first, firstStop, second, secondStop].map((response) => response.status());

		expect(statuses, `${why}: answered ${statuses.join(' / ')} — ${describeSequence(log)}`).toEqual([
			200, 200, 200, 200
		]);
		expect(
			wallMs,
			`${why}: the four calls took ${wallMs} ms, at or past the ${MEMO_TTL_MS} ms the session check is reused for, ` +
				`so "within the memo window" is no longer what this case measured — ${describeSequence(log)}`
		).toBeLessThan(WINDOW_MS);

		expect(timerCalls(log), `${why}: the mock recorded ${describeSequence(log)}`).toEqual([
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`,
			`POST ${UP_STOP} 200`,
			`GET ${UP_STATUS} 200`,
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`,
			`POST ${UP_STOP} 200`,
			`GET ${UP_STATUS} 200`
		]);

		// Two starts and two stops, so a check kept across the first stop would show up as one shared check for all
		// four routes. Measured: 2 on a warm lane, 3 on the coldest run of a lane (see the header); 4 would mean the
		// memo shared nothing here, 1 would mean a stop stopped forcing a fresh check.
		expect(
			checks(log),
			`${why}: ${checks(log)} session checks for 4 guarded calls — ${describeSequence(log)}`
		).toBeGreaterThanOrEqual(2);
		expect(
			checks(log),
			`${why}: every one of the 4 guarded calls paid its own session check, so nothing here shows reuse at all — ` +
				`${describeSequence(log)}`
		).toBeLessThan(4);

		const state = (await mock.state()) as TimerMockState;
		expect(state.scenario?.timerRunning, `${why}: the mock ends the sequence holding a run`).toBe(false);
	});
});

test.describe('lane-c · a Start sent right after a Stop (#5684)', () => {
	test('the Start after a Stop is accepted, and it is answered by a check made after the stop', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		const cookie = withToken(cookies('A'), tokenOfNonce(ids, nextNonce()));
		const started = Date.now();
		const first = await api(APP_START, { method: 'POST', body: { taskId: ids.task }, headers: { cookie } });
		const stop = await api(APP_STOP, { method: 'POST', body: { source: 'TEAMS' }, headers: { cookie } });
		const restart = await api(APP_START, { method: 'POST', body: { taskId: ids.task }, headers: { cookie } });
		// A plain guarded read after the restart: what it must NOT do is pay a check of its own.
		const status = await api(APP_STATUS, { method: 'GET', headers: { cookie } });
		const wallMs = Date.now() - started;
		const log = await mock.requests();
		const why = 'Start, Stop, Start again on one session, a few hundred ms apart';

		expect(first.status(), `${why}: the first Start answered ${first.status()} ${await first.text()}`).toBe(200);
		expect(stop.status(), `${why}: the Stop answered ${stop.status()} ${await stop.text()}`).toBe(200);
		const restartText = await restart.text();
		expect(
			restart.status(),
			`${why}: the Start sent right after the Stop was refused with ${restart.status()} ${restartText.slice(0, 200)} — ` +
				`${describeSequence(log)}`
		).toBe(200);
		const restarted = parseAnswer(restartText) as { running?: boolean };
		expect(
			restarted.running,
			`${why}: the restarted run is not the one the mock holds (${restartText.slice(0, 200)})`
		).toBe(true);
		expect(status.status(), `${why}: the status read after the restart answered ${status.status()}`).toBe(200);

		expect(timerCalls(log), `${why}: the mock recorded ${describeSequence(log)}`).toEqual([
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`,
			`POST ${UP_STOP} 200`,
			`GET ${UP_STATUS} 200`,
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`,
			`GET ${UP_STATUS} 200`
		]);

		// The #5684 shape, stated as the position the log can actually show. Before the fix the routes of the next few
		// seconds were answered from one check, so the Start that follows a stop was decided from the user as they were
		// before it — with no upstream read between the stop and that Start. `sessionChecks.drop` (stop route :115) is
		// what puts a read there.
		const stopAt = indexOfCall(log, 'POST', UP_STOP);
		const restartAt = log.findIndex(
			(request, index) => index > stopAt && request.method === 'POST' && request.path === UP_START
		);
		expect(restartAt, `${why}: the second start never reached the mock — ${describeSequence(log)}`).toBeGreaterThan(
			stopAt
		);
		expect(
			checksBetween(log, stopAt, restartAt),
			`${why}: nothing asked the API who the caller is between the stop and the Start that followed it, so that ` +
				`Start was decided from the check made before the stop — the #5684 shape. ${describeSequence(log)}`
		).toBeGreaterThanOrEqual(1);

		// Control, same token and the same few milliseconds: the read that follows the restarted Start paid no check of
		// its own. The memo shares again the moment the drop has done its work, so the read above is the drop's and not
		// an expired window.
		expect(
			checksBetween(log, restartAt, log.length),
			`${why}: the guarded status read after the restarted Start paid ${checksBetween(log, restartAt, log.length)} ` +
				`check(s) of its own, so this lane is not sharing a session check at all and the read above proves ` +
				`nothing — ${describeSequence(log)}`
		).toBe(0);
		expect(
			wallMs,
			`${why}: ${wallMs} ms of wall clock is at or past the ${MEMO_TTL_MS} ms reuse window, so a read between the ` +
				`stop and the Start could be a window that expired rather than the drop — ${describeSequence(log)}`
		).toBeLessThan(WINDOW_MS);
	});

	test('a run the mock already reports running does not make the Start refuse', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		// Pinned because it says where the decision is *not*: the start route asks nothing about a run going on, it
		// forwards and takes whatever the API answers. The #5684 refusal was made in the browser, in
		// `core/hooks/timer/use-timer-api.ts` (`canStartWithoutTrackingConflict`, :673-716), and this mock's start
		// handler answers `{ success: true }` whatever it is given (`cypress/support/mock-gauzy-server.mjs:687-691`).
		await mock.scenario({ timerRunning: true });
		const cookie = withToken(cookies('A'), tokenOfNonce(ids, nextNonce()));

		const user = await api('/api/user/me', { method: 'GET', headers: { cookie } });
		const userText = await user.text();
		const userBody = parseAnswer(userText) as { employee?: { isTrackingTime?: boolean } };
		// Measured with `timerRunning: true` armed first: the mock's user never reflects its own run state, which is
		// why the pre-fix stale-flag refusal cannot be reproduced with this mock at all.
		expect(
			userBody.employee?.isTrackingTime,
			`the mock user's tracking flag moved with scenario.timerRunning (${userText.slice(0, 200)}) — the mock grew ` +
				`the state this file says it has no access to, so the header limit above and the case above must be re-pinned`
		).toBe(false);

		const response = await api(APP_START, { method: 'POST', body: { taskId: ids.task }, headers: { cookie } });
		const text = await response.text();
		const log = await mock.requests();
		expect(
			response.status(),
			`a Start sent while the mock already reported a run was refused with ${response.status()} ${text.slice(0, 200)} ` +
				`— ${describeSequence(log)}`
		).toBe(200);
		expect(timerCalls(log), `the mock recorded ${describeSequence(log)}`).toEqual([
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`
		]);
	});
});

test.describe('lane-c · who may send these two writes', () => {
	const REFUSED = { statusCode: 403, message: 'Cross-site request refused' };

	test('a cross-site Start and a cross-site Stop are refused before anything is asked', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		const cookie = withToken(cookies('A'), tokenOfNonce(ids, nextNonce()));
		const cases: Array<{ verb: string; path: string; body: unknown; headers: Record<string, string> }> = [
			{ verb: 'POST', path: APP_START, body: { taskId: ids.task }, headers: { origin: FOREIGN_ORIGIN } },
			{ verb: 'POST', path: APP_STOP, body: { source: 'TEAMS' }, headers: { origin: FOREIGN_ORIGIN } },
			{
				verb: 'POST',
				path: APP_START,
				body: { taskId: ids.task },
				headers: { origin: 'http://localhost:3033', 'sec-fetch-site': 'cross-site' }
			}
		];

		for (const entry of cases) {
			const response = await api(entry.path, {
				method: entry.verb,
				body: entry.body,
				headers: { cookie, ...entry.headers }
			});
			const text = await response.text();
			const why = `${entry.verb} ${entry.path} from ${JSON.stringify(entry.headers)}`;
			expect(response.status(), `${why}: answered ${response.status()} ${text.slice(0, 200)}`).toBe(403);
			expect(
				parseAnswer(text),
				`${why}: 403, but not this app's own cross-site refusal — the answer was ${text.slice(0, 200)}`
			).toEqual(REFUSED);
		}

		// The whole log, not a filtered view: `refuseForeignOrigin` is the first statement of both routes
		// (`app/api/timer/start/route.ts:86-87`, `app/api/timer/stop/route.ts:82-83`), so not even the session check ran.
		const log = await mock.requests();
		expect(
			log.map((request) => `${request.method} ${request.path} ${request.status}`),
			`three cross-site writes asked the API ${logOf(log)}`
		).toEqual([]);
	});

	test('an anonymous caller is not refused by these routes: measured, not intended', async ({ api, ids, mock }) => {
		// The expectation this file came with was "refused, with no upstream call". It is not what the app does here:
		// `authenticatedGuard` delegates the sign-in decision to `GET /api/user/me` and this mock answers that with the
		// fixture user whatever arrives, no Bearer included (`cypress/support/mock-gauzy-server.mjs:544`). Both writes
		// therefore proceed, and the write that proceeds carries no credential.
		const start = await api(APP_START, { method: 'POST', body: { taskId: ids.task }, anonymous: true });
		const startText = await start.text();
		const stop = await api(APP_STOP, { method: 'POST', body: { source: 'TEAMS' }, anonymous: true });
		const stopText = await stop.text();
		const log = await mock.requests();

		expect(
			start.status(),
			`an anonymous Start was refused with ${start.status()} ${startText.slice(0, 200)} — this app makes its own ` +
				`sign-in refusal for this route now, which it does not (the guard delegates): re-read the header limit`
		).toBe(200);
		expect(stop.status(), `an anonymous Stop answered ${stop.status()} ${stopText.slice(0, 200)}`).toBe(200);

		// The whole log of both writes, exactly as measured (probe 4, and the run of this file that first pinned it):
		// each anonymous call paid its own session check, because the memo never keeps an answer for a caller with no
		// token (`core/services/server/guards/session-check-memo.ts:107`), and both writes went through.
		expect(
			log.map((request) => `${request.method} ${request.path} ${request.status}`),
			`two anonymous writes asked the API ${logOf(log)}`
		).toEqual([
			`GET ${UP_CHECK} 200`,
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`,
			`GET ${UP_CHECK} 200`,
			`POST ${UP_STOP} 200`,
			`GET ${UP_STATUS} 200`
		]);
		expect(
			checks(log),
			`the anonymous pair paid ${checks(log)} session checks for 2 guarded calls: ${logOf(log)}`
		).toBe(2);

		// The app did ask who the caller is, and asked with nothing: `serverFetch` sends no `authorization` header for
		// an empty token, so the write that proceeded carried no credential.
		expect(await receivedTokens(UP_CHECK), `an anonymous session check carried a Bearer: ${logOf(log)}`).toEqual(
			[]
		);
		expect(await receivedTokens(UP_START), `the anonymous Start carried a Bearer: ${logOf(log)}`).toEqual([]);
		expect(await receivedTokens(UP_STOP), `the anonymous Stop carried a Bearer: ${logOf(log)}`).toEqual([]);
	});
});

test.describe('lane-c · what the start route refuses on its own', () => {
	/** Each row is one refusal the start route's own code writes; the `error` strings are copied from it. */
	const START_REFUSALS: Array<{ name: string; rawBody: string; error: string }> = [
		{ name: 'an array body', rawBody: '[]', error: 'Request body must be a JSON object' }, // start/route.ts:104-105
		{ name: 'a string body', rawBody: '"track my time"', error: 'Request body must be a JSON object' },
		{ name: 'a number body', rawBody: '7', error: 'Request body must be a JSON object' },
		{
			name: 'isBillable that is not a boolean',
			rawBody: '{"isBillable":"yes"}',
			error: 'isBillable must be a boolean'
		}, // :108-111
		{ name: 'an empty taskId', rawBody: '{"taskId":""}', error: 'taskId must be a non-empty string' }, // :115-119
		{ name: 'a taskId that is not a string', rawBody: '{"taskId":12}', error: 'taskId must be a non-empty string' },
		{ name: 'an empty projectId', rawBody: '{"projectId":""}', error: 'projectId must be a non-empty string' }, // :121-125
		{
			name: 'an empty organizationTeamId',
			rawBody: '{"organizationTeamId":""}',
			error: 'organizationTeamId must be a non-empty string'
		}, // :132-136
		{
			name: 'labelIds that is not a list',
			rawBody: '{"labelIds":"label-1"}',
			error: 'labelIds must be a list of label ids'
		}, // :139-142
		{
			name: 'labelIds holding something that is not an id',
			rawBody: '{"labelIds":[12]}',
			error: 'labelIds must be a list of label ids'
		},
		{
			name: 'a logType that is neither TRACKED nor BREAK',
			rawBody: '{"logType":"WORK"}',
			error: 'logType must be TRACKED or BREAK'
		}, // :144-147
		{ name: 'notes that are not a string', rawBody: '{"description":12}', error: NOTES_REFUSAL } // :127-130
	];

	test('every refusal the start route lists comes back as its own 400, with no timer call behind it', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		// One token for the whole loop, and bodies sent as raw JSON text with `content-type: application/json` — the
		// spelling that keeps a "not an object" body a JSON string rather than whatever a client would send for it.
		const cookie = withToken(cookies('A'), tokenOfNonce(ids, nextNonce()));
		for (const refusal of START_REFUSALS) {
			const response = await api(APP_START, {
				method: 'POST',
				body: refusal.rawBody,
				headers: { cookie, 'content-type': 'application/json' }
			});
			const text = await response.text();
			const log = await mock.requests();
			const why = `${refusal.name} (${refusal.rawBody})`;

			expect(response.status(), `${why}: answered ${response.status()} ${text.slice(0, 200)}`).toBe(400);
			expect(
				parseAnswer(text),
				`${why}: the 400 says ${text.slice(0, 200)}, not the error the route's own code writes for it`
			).toEqual({ error: refusal.error });
			expect(timerCalls(log), `${why}: a refused start still asked the mock ${logOf(log)}`).toEqual([]);
		}

		// Measured, and the reason "no upstream call" is stated for the timer paths only: the guard runs before the
		// body is read (`app/api/timer/start/route.ts:86-103`), so the loop paid a session check before its first 400.
		const log = await mock.requests();
		expect(
			log[0]?.path,
			`the refusals came before the session check, which is not what this route does: ${logOf(log)}`
		).toBe(UP_CHECK);
	});

	test('a Stop this app refuses before forwarding it does not forget the session check, and the Start after it is accepted', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		// `sessionChecks.drop` sits in the `finally` of the try that *forwards* the stop (stop route :94-116), so a stop
		// this route refuses on its own validation never reaches it. That is the boundary of the fix stated from the
		// outside: the check is forgotten when the run changed, not when a stop was merely attempted — and a Start that
		// follows such a refused stop is accepted and recorded like any other.
		const cookie = withToken(cookies('A'), tokenOfNonce(ids, nextNonce()));
		const started = Date.now();
		const first = await api(APP_START, { method: 'POST', body: { taskId: ids.task }, headers: { cookie } });
		const refused = await api(APP_STOP, {
			method: 'POST',
			body: { source: 'TEAMS', timeLogId: '' },
			headers: { cookie }
		});
		const refusedText = await refused.text();
		const restart = await api(APP_START, { method: 'POST', body: { taskId: ids.task }, headers: { cookie } });
		const wallMs = Date.now() - started;
		const log = await mock.requests();
		const why = 'Start, Stop refused with a 400 (timeLogId ""), Start';

		expect(first.status(), `${why}: the first Start answered ${first.status()} ${await first.text()}`).toBe(200);
		expect(refused.status(), `${why}: the Stop answered ${refused.status()} ${refusedText.slice(0, 200)}`).toBe(
			400
		);
		expect(
			parseAnswer(refusedText),
			`${why}: the 400 says ${refusedText.slice(0, 200)}, not the message stop route :48-51 writes for a bad timeLogId`
		).toEqual({ message: 'timeLogId must be the id of a time log' });
		expect(timerCalls(log), `${why}: the mock recorded ${describeSequence(log)}`).toEqual([
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`,
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`
		]);
		expect(
			restart.status(),
			`${why}: the Start after the refused Stop was refused with ${restart.status()} ${await restart.text()} — ` +
				`${describeSequence(log)}`
		).toBe(200);

		expect(
			wallMs,
			`${why}: the three calls took ${wallMs} ms, at or past the ${MEMO_TTL_MS} ms the session check is reused ` +
				`for, so one kept check for all three proves nothing here — ${describeSequence(log)}`
		).toBeLessThan(WINDOW_MS);

		// Measured 1 for these three guarded calls, three runs of the same sequence (probe 9 A) and every run of this
		// file: the Start was answered from the check the first Start paid. A count of 3 is the other reading — every
		// call paying its own check, which is either a lane that recompiled a route mid-window (re-run before believing
		// it) or a stop route that began dropping the check even when it refused on its own.
		expect(
			checks(log),
			`${why}: ${checks(log)} session checks for 3 guarded calls — ${describeSequence(log)}`
		).toBe(1);
	});

	test('a body-less request is not a validation refusal — for the Start it is a run, for the Stop it is a 500', async ({
		api,
		cookies,
		ids,
		mock
	}) => {
		const cookie = withToken(cookies('A'), tokenOfNonce(ids, nextNonce()));

		// Measured, not intended, and not the mock's doing: the mock answers a body-less `POST /api/timesheet/timer/stop`
		// with 200 `{"success":true}` when it is asked directly (probe 5), so the 500 below is this app failing on its
		// own request body. The start route reads it as `req.json().catch(() => ({}))` (:103) — no body is an empty
		// object, which is a valid Start, the task coming from the `auth-active-task` cookie. The stop route reads it
		// as bare `await req.json()` (:88), which throws.
		const start = await api(APP_START, { method: 'POST', headers: { cookie } });
		const startText = await start.text();
		const startLog = await mock.requests();
		expect(start.status(), `a Start with no body answered ${start.status()} ${startText.slice(0, 200)}`).toBe(200);
		expect(timerCalls(startLog), `a Start with no body reached the mock as ${logOf(startLog)}`).toEqual([
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`
		]);

		const bodyless = await api(APP_STOP, { method: 'POST', headers: { cookie } });
		const bodylessText = await bodyless.text();
		const crashLog = await mock.requests();
		expect(
			bodyless.status(),
			`a Stop with no body no longer answers 500 (${bodyless.status()} ${bodylessText.slice(0, 200)}) — the stop ` +
				`route reads its body defensively now, so re-pin this case with what it answers instead`
		).toBe(500);
		expect(timerCalls(crashLog), `the crashed Stop asked the mock something: ${logOf(crashLog)}`).toEqual([
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`
		]);

		// The same route with a body it can read is an ordinary stop, and the drop it does at the end is what makes the
		// Start after it pay a session check of its own — the #5684 rule, on this route's failure path too.
		const emptyObject = await api(APP_STOP, { method: 'POST', body: {}, headers: { cookie } });
		const emptyObjectText = await emptyObject.text();
		expect(
			emptyObject.status(),
			`a Stop whose body is an empty object answered ${emptyObject.status()} ${emptyObjectText.slice(0, 200)}`
		).toBe(200);
		const restart = await api(APP_START, { method: 'POST', headers: { cookie } });
		const log = await mock.requests();
		expect(restart.status(), `the Start after that stop answered ${restart.status()} ${await restart.text()}`).toBe(
			200
		);
		expect(timerCalls(log), `the mock recorded ${logOf(log)}`).toEqual([
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`,
			`POST ${UP_STOP} 200`,
			`GET ${UP_STATUS} 200`,
			`POST ${UP_START} 200`,
			`GET ${UP_STATUS} 200`
		]);
		const stopAt = indexOfCall(log, 'POST', UP_STOP);
		const restartAt = log.findIndex(
			(request, index) => index > stopAt && request.method === 'POST' && request.path === UP_START
		);
		expect(
			checksBetween(log, stopAt, restartAt),
			`the Stop that succeeded did not force a fresh session check for the Start that followed it — ` +
				`${describeSequence(log)}`
		).toBeGreaterThanOrEqual(1);
	});
});
