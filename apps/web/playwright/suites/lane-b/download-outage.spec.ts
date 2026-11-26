import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { mockReset } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * What a download route answers when the platform gives it nothing, measured on lane-b (app 3032, mock 3996) on
 * 2026-11-22; the probes are `E:\Coding\.tmp\lane-b-dl-probe-2.txt`, `-3.txt` and `-4.txt`, the runs of this file are
 * `E:\Coding\.tmp\lane-b-dl-*.log`, each quoted in `PLAN.md` §13.
 *
 * `core/services/server/forward-download-to-gauzy.ts:53-60` is the whole outage half of this family: when `fetch`
 * rejects, the helper checks whether the **caller** went away first (`req.signal.aborted` → 499, an answer with no
 * reader — see the limit below), and otherwise answers 504 for a `TimeoutError` and 502 for everything else, as JSON.
 *
 * ## Which of those three branches a run can cause, stated before any of them is asserted
 *
 * - **502 (the platform gave no answer): reachable**, through `scenario.drops` — the mock accepts the request, logs
 *   it with `status: 0`, and destroys the socket (`cypress/support/mock-gauzy-server.mjs`). Pinned below for both
 *   download routes and for the JSON proxy next to it.
 * - **504 (`AbortSignal.timeout`): not reachable.** The budgets are 120 000 ms for the document route and 900 000 ms
 *   for `GET /api/export` (`app/api/export/route.ts:6`), while `playwright/api-fixtures.ts` calls every route with a
 *   60 000 ms client timeout — a test that outwaits the upstream aborts its own request first. Measured with
 *   `scenario.delays`: a 3 000 ms upstream delay is simply waited out (the app answers 200 after 3 017 ms,
 *   `lane-b-dl-probe-3.txt`), and an 8 000 ms delay with a 1 500 ms client aborts the client and leaves the mock with
 *   **no entry at all** (the app's upstream fetch was aborted with the caller's, so the mock never answered and never
 *   logged). Pinning 504 needs an upstream slower than 120 s, which no lane on this machine should sit through; the
 *   two timeout values are pinned at unit level instead (`forward-download-to-gauzy.test.ts:47-56`).
 * - **499 (the caller aborted): not assertable, and the probe says why.** The answer exists only for a connection
 *   that is already gone: at 1 513 ms the client saw `TimeoutError` and the mock's request log was empty
 *   (`lane-b-dl-probe-3.txt`). A test can observe the client's own failure, which proves nothing about the app, so
 *   this file writes the limit instead of a green test.
 * - **An upstream 4xx/5xx on a download path: not causeable with this mock at all.** Its fall-through for a path it
 *   does not know is `pagination([])` on a 200, its non-2xx answers are the untrusted-Origin 403 (which never fires
 *   here: the download helper sends `Accept`, `authorization` and `tenant-id` and no Origin) and the
 *   `HTTP_STATUS`-marked payloads of handlers for paths it knows. So "an upstream refusal versus an upstream that
 *   never answers" is answerable only in the second half, and that is written down rather than papered over; the
 *   switch the lane needs is named in `PLAN.md` §13.
 *
 * One harness fact this file had to measure rather than trust: the mock writes its request entry **before** the drop
 * hold (its `endMs` is taken when the payload is built, then `drops` sleeps, then the socket is destroyed). So
 * `endMs - startMs` is ~0 for a dropped call whatever the arm value, and cannot be the witness of how long the socket
 * was held — measured at 0 ms for an arm of 1 **and** for an arm of 60 000, while the client waited 30 033 ms in the
 * second case (`lane-b-dl-probe-3.txt`). The clamp is therefore pinned on the wall clock, and the entry timings are
 * pinned as what they are.
 */

const DOCUMENT_ID = '2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d';
const FILE = `/api/plugins/docs/documents/${DOCUMENT_ID}/export.pdf`;
const UP_FILE = FILE;
const EXPORT = '/api/export';
const PERMISSION_READ = '/api/role-permissions/me';

/** `MAX_DROP_MS` of `cypress/support/mock-gauzy-server.mjs`, read off that file: an arm above it holds 29 999 ms. */
const DROP_CEILING_MS = 30_000;
/**
 * The window this file accepts for "the mock held the ceiling" (measured today at 30 033 ms for an arm of 60 000,
 * `E:\Coding\.tmp\lane-b-dl-probe-3.txt`, against 21 ms for an arm of 1 and 3 017 ms for a 3 000 ms delay, same log).
 * ± 5 000 ms is wide for a healthy lane and is the one timing margin in this file a starved lane can cross — see
 * `PLAN.md` §13, where the flake rule is written next to it.
 */
const HOLD_WINDOW_MS = 5_000;

const describeAnswer = (response: APIResponse, text: string) =>
	`status ${response.status()} · body(${text.length}) ${text.slice(0, 160)} · headers ` +
	JSON.stringify(
		Object.entries(response.headers())
			.filter(([name]) => !['date', 'connection', 'keep-alive', 'vary'].includes(name))
			.sort()
	);

test.describe('lane-b · the download proxy when the platform gives no answer', () => {
	test('a dropped call on the file route answers 502 JSON, with none of the download headers', async ({
		api,
		mock
	}) => {
		await mockReset();
		await mock.scenario({ drops: { [UP_FILE]: 1 } });
		const response = await api(FILE);
		const text = await response.text();
		const log = await mock.requests();
		const headers = response.headers();
		const witness = describeAnswer(response, text);

		expect(response.status(), `the outage answer moved: ${witness}`).toBe(502);
		expect(parseAnswer(text), `the outage body moved (${witness})`).toEqual({
			statusCode: 502,
			message: 'The Gauzy API is unreachable'
		});
		// An outage answer is the app's own JSON, not a download: no disposition, no copied upstream type.
		expect(headers['content-disposition'], `the outage answer carries a disposition (${witness})`).toBeUndefined();
		expect(headers['content-length'], `the outage answer carries a content-length (${witness})`).toBeUndefined();
		expect(
			headers['content-type'],
			`the outage answer is no longer the app own JSON (${witness}) — a disposition-carrying upstream answer ` +
				'would mean the mock grew a download handler, and this file has to be rewritten around it'
		).toBe('application/json');

		const armed = log.filter((request) => request.path === UP_FILE);
		expect(
			armed.map((request) => `${request.method} ${request.status}`),
			`the dropped call is not recorded as the mock own zero-status entry: ${JSON.stringify(
				armed.map((request) => request.status)
			)} — full log ${logOf(log)}`
		).toEqual([`GET 0`]);
		expect(
			await mock.failures(),
			`the drop was counted as a refusal (status >= 400), which would make every "was refused upstream" ` +
				`witness in this repo mean two different things: ${logOf(log)}`
		).toEqual([]);
	});

	test('the export route answers an outage with the JSON proxy shape, its permission read is where it died', async ({
		api,
		mock
	}) => {
		// `refuseUnlessPermitted` reads the role first (`refuse-without-permission.ts:42-50`) and hands that answer
		// straight back, so the export route never reaches `forwardDownloadToGauzy` at all.
		await mockReset();
		await mock.scenario({ drops: { [PERMISSION_READ]: 1 } });
		const response = await api(EXPORT);
		const text = await response.text();
		const log = await mock.requests();
		const witness = describeAnswer(response, text);

		expect(response.status(), `the export outage answer moved: ${witness}`).toBe(502);
		expect(parseAnswer(text), `the export outage body moved (${witness})`).toEqual({
			statusCode: 502,
			message: 'The Gauzy API is unreachable'
		});
		expect(asksOf(log, EXPORT), `the export route asked its own download upstream anyway: ${logOf(log)}`).toEqual(
			[]
		);
		expect(asksOf(log, PERMISSION_READ), `the permission read is not the dropped call: ${logOf(log)}`).toEqual([
			'GET 0'
		]);
	});

	test('the download helper and the JSON proxy answer the same outage byte-identically', async ({ api, mock }) => {
		const askWithDrop = async (path: string) => {
			await mockReset();
			await mock.scenario({ drops: { [path]: 1 } });
			const response = await api(path);
			return { response, text: await response.text() };
		};

		const download = await askWithDrop(FILE);
		expect(download.response.status(), describeAnswer(download.response, download.text)).toBe(502);
		const json = await askWithDrop(PERMISSION_READ);
		expect(json.response.status(), describeAnswer(json.response, json.text)).toBe(502);

		expect(
			json.text,
			`the two outage bodies differ: download ${JSON.stringify(download.text)} vs JSON route ` +
				`${JSON.stringify(json.text)} — one of the two helpers changed its message`
		).toBe(download.text);
		expect(
			json.response.headers()['content-type'],
			`the two outage answers differ in content-type: ${describeAnswer(json.response, json.text)} vs ` +
				describeAnswer(download.response, download.text)
		).toBe(download.response.headers()['content-type']);
	});

	test('CLAMP PIN: a drop arm above the ceiling costs the ceiling, not the arm, and the entry cannot show it', async ({
		api,
		mock
	}) => {
		// `drops` is clamped to `MAX_DROP_MS` (30 000) so a typo in a scenario cannot stall a lane. Read from the
		// outside: an arm of 60 000 must cost about the ceiling and never the full minute. Named a clamp pin, not an
		// outage pin — what it holds is the ceiling, and it is the slowest case in this lane by design.
		const arm = DROP_CEILING_MS * 2;
		await mockReset();
		await mock.scenario({ drops: { [UP_FILE]: arm } });
		const started = Date.now();
		const response = await api(FILE);
		const text = await response.text();
		const waitedMs = Date.now() - started;
		const log = await mock.requests();
		const entry = log.find((request) => request.path === UP_FILE);

		expect(
			response.status(),
			`the armed download did not answer the outage: ${describeAnswer(response, text)}`
		).toBe(502);
		expect(
			entry?.status,
			`the arm above the ceiling was not recorded as a drop: status ${entry?.status}` + ` — ${logOf(log)}`
		).toBe(0);
		// Which direction each bound catches, written out because this is the only case in the lane whose witness is
		// a duration: too *long* a wait means the clamp is gone and a scenario typo can stall a lane for the minute it
		// names; too *short* a wait means a drop no longer holds the socket at all (an arm of 1 measured 21 ms,
		// `lane-b-dl-probe-3.txt`). The window is ± 5 000 ms rather than the ± 500 ms today's measurement would allow,
		// because a 30 s hold on a lane shared with two other `next dev` processes is the one number here a starved
		// machine can move — see `PLAN.md` §13 for the re-run rule that goes with it.
		expect(
			waitedMs,
			`an arm of ${arm} ms cost ${waitedMs} ms of wall clock, above the clamp ceiling of ${DROP_CEILING_MS} ms ` +
				`+ ${HOLD_WINDOW_MS} ms: the clamp is no longer holding a lane to it — full log ${logOf(log)}`
		).toBeLessThanOrEqual(DROP_CEILING_MS + HOLD_WINDOW_MS);
		expect(
			waitedMs,
			`an arm of ${arm} ms answered after only ${waitedMs} ms, below ${DROP_CEILING_MS} ms - ${HOLD_WINDOW_MS} ms, ` +
				`so a drop no longer holds the socket open at all — full log ${logOf(log)}`
		).toBeGreaterThanOrEqual(DROP_CEILING_MS - HOLD_WINDOW_MS);
		// The measurement that corrects the obvious guess: at this checkout the entry is written **before** the hold
		// (`cypress/support/mock-gauzy-server.mjs`, where `endMs` is taken when the payload is built and the drop sleep
		// happens after the push), so the entry's own duration says nothing about the hold and a lane must use its wall
		// clock for this fact. Measured: 0 ms for an arm of 1 and 0 ms for an arm of 60 000 (`lane-b-dl-probe-3.txt`).
		// If this goes red beside the bound above, the harness changed that ordering (the entry now carries the held
		// duration) — re-pin both assertions deliberately, in one commit, rather than loosening either here.
		expect(
			(entry?.endMs ?? 0) - (entry?.startMs ?? 0),
			`the mock entry now reports a duration of the drop hold (${(entry?.endMs ?? 0) - (entry?.startMs ?? 0)} ms), ` +
				`so the ordering at mock-gauzy-server.mjs changed: ${JSON.stringify(entry)}`
		).toBeLessThan(1_000);
	});

	test('arms that are not a number, or below zero, answer the file instead of dropping it', async ({ api, mock }) => {
		// A number, a negative and a word: the clamp reads all three as "no drop here" (`Number.isFinite` first).
		const arms: Array<string | number> = [-5, 'not-a-number', 0];
		for (const arm of arms) {
			await mockReset();
			await mock.scenario({ drops: { [UP_FILE]: arm as number } });
			const response = await api(FILE);
			const text = await response.text();
			const log = await mock.requests();
			const witness = `arm ${JSON.stringify(arm)} -> ${describeAnswer(response, text)}`;
			expect(response.status(), `${witness} — a bad arm was allowed to stall or cut the call`).toBe(200);
			expect(triples(log), `${witness} — the mock did not answer this call normally: ${logOf(log)}`).toEqual([
				`GET ${UP_FILE} 200`
			]);
		}
	});

	test('a slow upstream is waited for: the 3 s delay is inside the app answer and inside the mock entry', async ({
		api,
		mock
	}) => {
		await mockReset();
		await mock.scenario({ delays: { [UP_FILE]: 3_000 } });
		const started = Date.now();
		const response = await api(FILE);
		const text = await response.text();
		const waitedMs = Date.now() - started;
		const entry = (await mock.requests()).find((request) => request.path === UP_FILE);

		expect(response.status(), `a slow upstream was not waited out: ${describeAnswer(response, text)}`).toBe(200);
		expect(
			waitedMs,
			`the app answered in ${waitedMs} ms, faster than the 3 000 ms it was told to wait`
		).toBeGreaterThanOrEqual(2_500);
		expect(
			waitedMs,
			`the app gave up after ${waitedMs} ms on a 3 s upstream, well inside its 120 s budget`
		).toBeLessThan(15_000);
		// Unlike a drop hold, a delay *is* inside the entry: `endMs` is taken after the payload, which the delay built.
		expect(
			(entry?.endMs ?? 0) - (entry?.startMs ?? 0),
			`the mock entry does not report the delay it applied: ${JSON.stringify(entry)}`
		).toBeGreaterThanOrEqual(2_500);
	});
});

// Every case in this file arms a scenario, and a scenario outlives a test unless the mock is reset: `setScenario`
// shallow-merges the payload, so a payload that does not name `drops` leaves the previous `drops` entry armed, and
// `delays` accumulate across payloads even when it does. Only `mockReset()` clears both.
test.afterEach(async () => {
	await mockReset();
});

/**
 * The half of "an upstream refusal versus an upstream that never answers" this lane cannot cause today, gated rather
 * than quietly green.
 *
 * `scenario.drops` cuts a connection; nothing in `cypress/support/mock-gauzy-server.mjs` at this checkout makes it
 * answer a 4xx or 5xx for a path it does not know (its fall-through for an unknown GET is `pagination([])` on a 200;
 * its 4xx/5xx answers are all keyed to paths it knows: `/api/auth/workspaces`, `/api/auth/signin.workspace`,
 * `/api/auth/switch-organization`, the Ever ID back-channel, the notification read, `/api/ever-*`). The harness owner
 * reports a `scenario.fails` switch keyed `<tenant>:<path>` landing in `60fe12221` — that commit is not in this
 * checkout (`git merge-base --is-ancestor 60fe12221 HEAD` → "Not a valid object name"), and this lane's running mock
 * ignored every spelling of it: `E:\Coding\.tmp\lane-b-dl-probe-6.txt` armed `{ fails: { <path>: 503 } }`,
 * `{ fails: { <path>: '503' } }`, `{ failureScenarios: … }` and `{ scenario: { fails: … } }` and the download route
 * answered **200 `{"items":[],"total":0}`** every time, with the mock logging `200` and the arm visible only as an
 * unused key in `state.scenario`.
 *
 * Update 2026-11-23: the switch now exists in the mock — `scenario.fails`, keyed like `drops`, an integer status
 * 400-599, Gauzy's `{ statusCode, message }` body, logged with its status (see `MockScenario.fails` in
 * `playwright/helpers.ts`). With it, the probe below finds the switch live and both cases run: on lane-b with
 * Playwright 1.65.1, `E:\Coding\.tmp\s2-pw165-lane-b-1.log` → this file and its family `65 passed (4.3m)`, 0 skipped.
 *
 * So the probe below asks the mock, once per run, whether such an arm changes an answer, and the two cases after it
 * run only when it does. They assert nothing invented: each compares the app's answer with what the same mock answers
 * the same armed path when asked directly, so the numbers come from the run rather than from a guess.
 */
test.describe('lane-b · a download route whose upstream refuses with a status', () => {
	let switchIsLive = false;

	test.beforeAll(async ({ api, mock }) => {
		const spellings: Array<Record<string, unknown>> = [
			{ fails: { [UP_FILE]: 503 } },
			{ fails: { [UP_FILE]: '503' } },
			{ fails: { [`${UP_FILE}`]: 403 } }
		];
		for (const spelling of spellings) {
			await mockReset();
			await mock.scenario(spelling);
			const response = await api(FILE);
			const status = response.status();
			await response.text();
			const log = await mock.requests();
			const upstreamStatus = log.find((request) => request.path === UP_FILE)?.status ?? 200;
			if (status >= 400 && upstreamStatus >= 400) {
				switchIsLive = true;
				break;
			}
		}
		await mockReset();
	});

	test.beforeEach(async ({}, testInfo) => {
		if (switchIsLive) return;
		console.log(
			'lane-b download-outage.spec.ts: this lane is running a mock with no per-path failure switch, so an ' +
				'upstream *refusal* cannot be caused on a download route here (only a cut connection can, and it is ' +
				'pinned in the describe above). Restart the lane on a `mock-gauzy-server.mjs` that answers ' +
				'`scenario.fails` and re-run: these two cases then measure the refusal, and nothing before them changes.'
		);
		testInfo.skip();
	});

	test('the refusal status and body travel to the caller unchanged', async ({ api, mock }) => {
		await mockReset();
		await mock.scenario({ fails: { [UP_FILE]: 503 } });
		// The same armed path, asked directly: this is the number the app is compared with.
		const upstream = await fetch(`${MOCK_ORIGIN}${UP_FILE}`);
		const upstreamText = await upstream.text();
		await mockReset();
		await mock.scenario({ fails: { [UP_FILE]: 503 } });

		const response = await api(FILE);
		const text = await response.text();
		const witness = describeAnswer(response, text);

		expect(
			response.status(),
			`the app did not copy the upstream status it was given: app ${response.status()} vs mock ` +
				`${upstream.status} (${witness})`
		).toBe(upstream.status);
		expect(
			text,
			`the app did not pass the upstream refusal body through: ${JSON.stringify(text.slice(0, 200))} vs the ` +
				`mock own ${JSON.stringify(upstreamText.slice(0, 200))} (${witness})`
		).toBe(upstreamText);
	});

	test('a refused call is recorded with its status, not with the drop zero', async ({ api, mock }) => {
		// Armed here, not carried over: the `mock` fixture resets the mock before every test and this file's
		// `afterEach` resets it after, so an arm from the case above would already be gone.
		await mock.scenario({ fails: { [UP_FILE]: 503 } });

		const response = await api(FILE);
		const text = await response.text();
		const witness = describeAnswer(response, text);
		const log = await mock.requests();
		const entry = log.find((request) => request.path === UP_FILE);

		expect(
			entry?.status,
			`the refused call is not recorded as answered: ${JSON.stringify(entry)} — full log ${logOf(log)} (${witness})`
		).toBe(response.status());
		expect(
			await mock.failures(),
			`the upstream refusal is missing from the failures view: ${logOf(log)} (${witness})`
		).toHaveLength(1);
	});
});

/** The recorded calls for one upstream path, as verb + status lines. */
function asksOf(requests: Array<{ method: string; path: string; status: number }>, path: string): string[] {
	return requests.filter((request) => request.path === path).map((request) => `${request.method} ${request.status}`);
}
