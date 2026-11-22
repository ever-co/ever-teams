import { expect, test } from '../../api-fixtures';
import { MOCK_ORIGIN } from '../../test-servers';
import { mockReset, mockScenario } from '../../helpers';

/**
 * The upstream accepted the connection, took the request, and answered nothing at all. `suites/api/upstream-outage.spec.ts`
 * arms the outage this app *waits out* (the mock's `delays` hold a path open past the app's own deadline → 503 / 502 / 504
 * by which timer fired) and it says plainly what it cannot reach
 * (`playwright/suites/api/upstream-outage.spec.ts:41-44`): "Nothing on the control API … closes a connection or refuses
 * one, and the mock's catch-all answers every path, so the app's `fetch` is never left without a socket to talk on. Only
 * a *timeout* arm exists." So `forward-to-gauzy`'s 502 `"The Gauzy API is unreachable"` (`core/services/server/
 * forward-to-gauzy.ts:140-144`) and `gauzyPassThrough`'s 502 (`core/services/server/requests/ever-platform.ts:55-56`) had
 * no route-level test, and the branch was not hypothetical: `suites/lane-b/PLAN.md` §(the miswired-lane note) read that
 * very 502 as an app answer when a lane's app was pointed at a mock that was not its own, and 25 guard tests went red on
 * it.
 *
 * This file adds the missing arm, in the test backend rather than in the app: `scenario.drops`
 * (`cypress/support/mock-gauzy-server.mjs`, addressed exactly like `delays` — `tenant:path`, then `tenant`, then `path`;
 * the value is how long to hold the socket open first, `1` meaning at once). A cut call is recorded in the request log
 * with **`status: 0`**, which no refusal and no upstream answer writes. That recording is the point of the whole switch,
 * because the log otherwise holds three readings that look alike and mean different things:
 *
 *   no entry for the path      — the app never asked (a refusal here, before any upstream call);
 *   an entry with a 4xx/5xx    — the upstream answered, with a refusal;
 *   an entry with `status: 0`  — the app asked, the upstream took it, and nothing came back.
 *
 * `upstream-outage.spec.ts:28-32` is explicit that its own abandoned calls leave the first and third readings
 * indistinguishable ("the log **cannot** by itself tell 'refused here before asking' from 'asked, then abandoned'"). With
 * `drops` the third reading has a witness of its own, so a case can say which side acted. `status: 0` is also not a
 * `failures()` hit (`playwright/api-fixtures.ts` filters `status >= 400`), so a cut call is never counted as an upstream
 * refusal — pinned below rather than assumed.
 *
 * What is asserted, and why that is the right thing to assert here:
 *   - **the proxy's own outage answer** — 502 `{statusCode:502, message:'The Gauzy API is unreachable'}`. The name is a
 *     promise about the *cause*: a timeout on the same route answers 504 with a different sentence, so the pair together
 *     is what a browser client reads as "the platform is down, do not sign anybody out"
 *     (`forward-to-gauzy.ts:71-72` says an outage must never look like a 401).
 *   - **the credential had already left** — the mock records the sha256 of the bearer it received on a cut call, so an
 *     outage of this kind is not a "nothing left this app" event. Worth pinning before anyone reasons about what an
 *     outage exposes.
 *   - **a refusal still beats an outage** — with the upstream dying on that very path, a cross-site write is still 403
 *     with this app's own body and a non-JSON body is still 415, each with **no** mock entry: the guards run before the
 *     forwarding call (`forward-to-gauzy.ts:89-90,102-107`), and an outage must not turn a refusal into a 5xx.
 *   - **the session check's outage answer** — 503, not 401, on a guarded route whose `/user/me` connection is cut
 *     (`core/services/server/guards/authenticated-guard-app.ts:88-112`), and the route's own work never ran.
 *   - **the pass-through answers an outage with a status and no sentence** — `gauzyPassThrough`'s catch is
 *     `{status: 502, data: null}` for *any* fetch failure and the route fills the empty answer with `{statusCode:502}`
 *     (`app/api/ever-connect/[...path]/route.ts:79`). So a stall and a cut connection are indistinguishable there, unlike
 *     the proxy, which splits them 504 / 502 and names its reason. That asymmetry is asserted as measured, not fixed here.
 *
 * What a run here cannot answer: whether a real deployment's front proxy reports the same thing (this is a socket cut on
 * the loopback, by the test backend), what a browser shows a person during such an outage (that is a browser suite's
 * question), and what the client's own retry does with a 502 — no `page` is driven here.
 *
 * **Self-gating, because the arm is new.** A lane's backend is a process started once and reused
 * (`playwright/scripts/lane-servers.mjs`), so a lane warmed *before* `scenario.drops` existed does not act on it, and a
 * naive run would read the mock's normal 200 as "the app survived an outage that never happened". So the file asks the
 * mock to drop a path nothing else uses and sees whether its own connection dies; if it does not, every case here is
 * skipped with that reason in the skip message, not reported as a pass. Fix it by restarting that lane (`down` then
 * `up`), which is also what `check <lane>` printing MISWIRED means.
 *
 * **What has been measured and what has not, at the time of writing.** The arm itself was proven against the test backend
 * alone (no app in the loop), on the canonical ports: an armed path answers `UND_ERR_SOCKET` to a direct call and is
 * recorded `GET … 0`; the same arm 400 ms deep cuts 412 ms in; a path not named is answered 200; after `reset()` the armed
 * path is 200 again (`E:\Coding\.tmp\drop-probe-1.log`, 2026-11-22). The route-level cases below have **not** run against
 * an app yet — they are predictions written from the source, and the first run is expected to correct some of them, the
 * way `suites/api/forwarded-host.spec.ts`'s first run corrected four of its predictions.
 *
 * Run (api suite, against a lane's warm app and mock; a lane config would find 0 tests in this folder):
 *
 *   E2E_LANE=lane-a E2E_REUSE_SERVERS=1 npx playwright test --config apps/web/playwright/playwright.api.config.ts apps/web/playwright/suites/api/upstream-dropped.spec.ts
 */

/** A path no other suite calls: the switch is probed on it, and the probe's log entry is thrown away by the reset below. */
const PROBE_PATH = '/api/playwright-drop-probe';

/** 'live' when the running backend acts on `drops`, 'absent' when it answers the probe normally. Probed once per worker. */
let dropSwitch: 'live' | 'absent' | undefined;

async function dropSwitchIsLive(): Promise<boolean> {
	if (dropSwitch === undefined) {
		await mockScenario({ drops: { [PROBE_PATH]: 1 } });
		let cut = false;
		try {
			await fetch(`${MOCK_ORIGIN}${PROBE_PATH}`, { method: 'GET' });
		} catch {
			// A connection error is the switch working: the backend took the request and destroyed the socket.
			cut = true;
		}
		await mockReset();
		dropSwitch = cut ? 'live' : 'absent';
	}
	return dropSwitch === 'live';
}

const parseAnswer = (text: string): unknown => {
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
};

const triple = (request: { method: string; path: string; status: number }) =>
	`${request.method} ${request.path} ${request.status}`;
const logOf = (requests: Array<{ method: string; path: string; status: number }>) =>
	requests.map(triple).join(', ');

test.beforeAll(async () => {
	dropSwitch = (await dropSwitchIsLive()) ? 'live' : 'absent';
});

test.beforeEach(async ({}, testInfo) => {
	if (dropSwitch !== 'live') {
		// The wording a lane's agent needs to act on, printed by the skip reporter.
		console.log(
			'suites/api/upstream-dropped.spec.ts: the test backend serving this run was started before `scenario.drops` ' +
				'exists, so no connection is ever cut here. Restart the lane (`lane-servers.mjs down <lane>`, then ' +
				'`up <lane>`) and re-run: asserting against an outage that was never caused would be a pass that proves nothing.'
		);
		testInfo.skip();
	}
});

/** Every case arms a `drops` entry, and the mock keeps answering nothing on it until reset. */
test.afterEach(async () => {
	await mockReset();
});

test.describe('api · a proxy route whose upstream connection is cut off', () => {
	const PROXY_PATH = '/api/auth/switch-organization';

	test("the answer is the proxy's own outage body, and the log says the call was asked and cut", async ({ api, mock }) => {
		await mockScenario({ drops: { [PROXY_PATH]: 1 } });
		const response = await api(PROXY_PATH, { method: 'POST', body: { organizationId: 'playwright-drop-probe' } });
		const text = await response.text();

		expect(response.status(), `POST ${PROXY_PATH} over a cut upstream: ${text}`).toBe(502);
		expect(
			parseAnswer(text),
			`the 502 must carry forward-to-gauzy's own sentence, not another layer's (body: ${text})`
		).toMatchObject({ statusCode: 502, message: 'The Gauzy API is unreachable' });

		// The witness that this is the third reading and not the first: the mock really was asked.
		const asked = await mock.calls(PROXY_PATH);
		expect(asked.map(triple), `the cut call must be in the mock log as a cut call; whole log: ${logOf(await mock.requests())}`).toEqual([
			`POST ${PROXY_PATH} 0`
		]);
	});

	test("the caller's session had already left this app when the connection died", async ({ api, mock }) => {
		await mockScenario({ drops: { [PROXY_PATH]: 1 } });
		const response = await api(PROXY_PATH, { method: 'POST', body: { organizationId: 'playwright-drop-probe' } });
		expect(response.status(), 'expected the cut upstream to answer 502 here').toBe(502);

		const tokens = ((await mock.state()).receivedTokens ?? []) as Array<{ path: string }>;
		const forPath = tokens.filter((entry) => entry.path === PROXY_PATH);
		expect(
			forPath.length,
			`an outage that cuts the connection after the request left is not a "nothing left this app" outage; ` +
				`receivedTokens: ${JSON.stringify(tokens)}`
		).toBeGreaterThan(0);
	});

	test('a cross-site write is still refused before anything is asked, even with that path dying', async ({ api, mock }) => {
		await mockScenario({ drops: { [PROXY_PATH]: 1 } });
		const response = await api(PROXY_PATH, {
			method: 'POST',
			body: { organizationId: 'playwright-drop-probe' },
			headers: { origin: 'https://some-other-site.example', 'sec-fetch-site': 'same-origin' }
		});
		const text = await response.text();

		expect(response.status(), `a foreign Origin over a dying upstream: ${text}`).toBe(403);
		expect(parseAnswer(text), `the refusal must be this app's own words, not the outage's (body: ${text})`).toMatchObject({
			message: 'Cross-site request refused'
		});
		// `forward-to-gauzy.ts:89-90` returns the refusal before the forwarding call, so the dying path was never asked.
		expect(
			(await mock.calls(PROXY_PATH)).map(triple),
			`an outage must not hide a refusal; whole mock log: ${logOf(await mock.requests())}`
		).toEqual([]);
	});

	test('a declared non-JSON body is still refused 415 before anything is asked', async ({ api, mock }) => {
		await mockScenario({ drops: { [PROXY_PATH]: 1 } });
		const response = await api(PROXY_PATH, {
			method: 'POST',
			body: 'not json at all',
			headers: { 'content-type': 'text/plain' }
		});
		const text = await response.text();

		expect(response.status(), `a text/plain write over a dying upstream: ${text}`).toBe(415);
		expect(parseAnswer(text), `415 is this app's media-type refusal (body: ${text})`).toMatchObject({
			statusCode: 415,
			message: 'Unsupported Media Type'
		});
		expect(
			(await mock.calls(PROXY_PATH)).map(triple),
			`the media-type check at forward-to-gauzy.ts:102-107 runs before the call; whole mock log: ${logOf(await mock.requests())}`
		).toEqual([]);
	});

	test('a GET proxy route answers the same outage shape (the 502 is not a POST-only answer)', async ({ api, mock }) => {
		const getPath = '/api/auth/workspaces';
		await mockScenario({ drops: { [getPath]: 1 } });
		const response = await api(getPath);
		const text = await response.text();

		expect(response.status(), `GET ${getPath} over a cut upstream: ${text}`).toBe(502);
		expect(parseAnswer(text), `body: ${text}`).toMatchObject({ statusCode: 502, message: 'The Gauzy API is unreachable' });
		expect((await mock.calls(getPath)).map(triple), `whole mock log: ${logOf(await mock.requests())}`).toEqual([
			`GET ${getPath} 0`
		]);
	});

	test('the switch is armed per path: a neighbour of the dying path is answered normally', async ({ api, mock }) => {
		const dying = '/api/auth/switch-organization';
		const healthy = '/api/auth/workspaces';
		await mockScenario({ drops: { [dying]: 1 } });

		const cutAnswer = await api(dying, { method: 'POST', body: { organizationId: 'playwright-drop-probe' } });
		const normalAnswer = await api(healthy);

		expect(cutAnswer.status(), 'the armed path must stay cut').toBe(502);
		expect(normalAnswer.status(), 'an un-armed path must not be cut').toBe(200);
		const entries = (await mock.requests()).filter((entry) => entry.path === healthy).map(triple);
		expect(entries, `whole mock log: ${logOf(await mock.requests())}`).toEqual([`GET ${healthy} 200`]);
	});

	test('mockReset() clears the arm, exactly as it clears a delay', async ({ api, mock }) => {
		const getPath = '/api/auth/workspaces';
		await mockScenario({ drops: { [getPath]: 1 } });
		expect((await api(getPath)).status(), 'the armed path must answer 502 before the reset').toBe(502);

		await mockReset();
		const after = await api(getPath);
		expect(after.status(), 'a leftover arm would make every later case in this lane a fake outage').toBe(200);
	});
});

test.describe('api · a guarded route whose session-check connection is cut off', () => {
	const GUARDED_PATH = '/api/activity-log';

	test('a cut session check is an outage (503), not an expired session (401)', async ({ api, mock }) => {
		await mockScenario({ drops: { '/api/user/me': 1 } });
		const response = await api(GUARDED_PATH);
		const text = await response.text();

		// 401 is what a client re-authenticates on (authenticated-guard-app.ts:89-91): answering an outage with it would
		// sign the person out of a session that is still valid.
		expect(response.status(), `GET ${GUARDED_PATH} with its /user/me check cut: ${text}`).toBe(503);
		expect(parseAnswer(text), `body: ${text}`).toMatchObject({ statusCode: 503 });
	});

	test("the route's own work never ran: the log holds the cut check and nothing else", async ({ api, mock }) => {
		await mockScenario({ drops: { '/api/user/me': 1 } });
		const response = await api(GUARDED_PATH);
		expect(response.status(), 'expected the 503 outage answer').toBe(503);

		const requests = await mock.requests();
		expect(
			requests.filter((entry) => entry.path === '/api/user/me').map(triple),
			`the check must be recorded as cut; whole log: ${logOf(requests)}`
		).toEqual(['GET /api/user/me 0']);
		expect(
			requests.filter((entry) => entry.path === GUARDED_PATH).map(triple),
			`the guarded route's own upstream call must not have been made; whole log: ${logOf(requests)}`
		).toEqual([]);
	});

	test('an outage answer is not kept: the next call of the same token asks again', async ({ api, mock }) => {
		await mockScenario({ drops: { '/api/user/me': 1 } });
		const first = await api(GUARDED_PATH);
		const second = await api(GUARDED_PATH);

		expect(first.status(), 'first call').toBe(503);
		expect(second.status(), 'second call').toBe(503);
		// `SessionCheckMemo` keeps only an answer that authenticated (session-check-memo.ts:73-74, :132): a cut check must
		// not sit in the memo and answer later requests with a check that never happened. The timeout half of the same
		// claim belongs to `suites/lane-c/session-check.spec.ts`; this is the cut-connection half.
		expect(
			(await mock.calls('/api/user/me')).map(triple),
			`two calls must have made two checks; whole log: ${logOf(await mock.requests())}`
		).toEqual(['GET /api/user/me 0', 'GET /api/user/me 0']);
	});
});

test.describe('api · the pass-through half answers an outage with a status and no sentence', () => {
	const PASS_THROUGH_PATH = '/api/ever-connect/health';

	test("the Ever Platform pass-through's 502 carries no statusCode and no message", async ({ api, mock }) => {
		await mockScenario({ drops: { [PASS_THROUGH_PATH]: 1 } });
		const response = await api(PASS_THROUGH_PATH);
		const text = await response.text();

		expect(response.status(), `GET ${PASS_THROUGH_PATH} over a cut upstream: ${text}`).toBe(502);
		// `gauzyPassThrough`'s catch is `{status: 502, data: null}` (ever-platform.ts:55-56) and the route fills an empty
		// answer with `{ statusCode: answer.status }` (`app/api/ever-connect/[...path]/route.ts:79`), so this 502 carries a
		// status and no sentence at all — while `forward-to-gauzy`'s 502 above carries its reason. Two different shapes of
		// the same outage, and unlike the proxy this half cannot tell a stall from a cut: its catch is `catch { }` over a
		// 15 s `AbortSignal.timeout`, so both land on the same body.
		const body = parseAnswer(text);
		const keys = body && typeof body === 'object' ? Object.keys(body) : [];
		expect(parseAnswer(text), `the pass-through's outage body: ${text}`).toMatchObject({ statusCode: 502 });
		expect(keys, `no message on this 502, unlike forward-to-gauzy's (body: ${text})`).not.toContain('message');
		expect((await mock.calls(PASS_THROUGH_PATH)).map(triple), `whole mock log: ${logOf(await mock.requests())}`).toEqual([
			`GET ${PASS_THROUGH_PATH} 0`
		]);
	});
});

test.describe('api · the cut-call witness itself', () => {
	const PROXY_PATH = '/api/auth/switch-organization';

	test('a cut call is never counted as an upstream refusal', async ({ api, mock }) => {
		await mockScenario({ drops: { [PROXY_PATH]: 1 } });
		expect((await api(PROXY_PATH, { method: 'POST', body: { organizationId: 'playwright-drop-probe' } })).status(), 'expected 502').toBe(
			502
		);

		// `api-fixtures.ts`'s `failures()` filters `status >= 400`. `status: 0` in the log therefore reads as "answered
		// nothing" and not as "refused", which is what keeps the three log readings apart. If the mock ever recorded a cut
		// call as 502, every case in this file that reasons from `failures()` would silently change meaning.
		const failures = await mock.failures();
		expect(
			failures.filter((entry) => entry.path === PROXY_PATH).map(triple),
			`a cut call must not appear in failures(); whole log: ${logOf(await mock.requests())}`
		).toEqual([]);
		expect((await mock.requests()).some((entry) => entry.status === 0), 'the cut call must be in the log with status 0').toBe(
			true
		);
	});
});
