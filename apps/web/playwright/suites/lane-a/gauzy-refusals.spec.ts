import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { mockReset } from '../../helpers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The half of `core/services/server/gauzy-error-response.ts` that `suites/lane-a/daily-plan-reads.spec.ts` could not
 * reach: a rejection that IS a Gauzy answer. That file says it outright (its own header, "What this lane cannot
 * answer"), because nothing in the mock refused a call. The mock grew exactly that switch — `scenario.fails`
 * (`cypress/support/mock-gauzy-server.mjs:1081-1095`) — so 16 handlers, in 14 of the 37 route files that catch with
 * `gauzyErrorResponse(error, '<fallback>')` (`grep -rln gauzyErrorResponse( apps/web/app/api --include=route.ts`), are
 * pinned here against an upstream that answers 400, 401, 403, 404, 409, 500 and 503: one control, one test per armed
 * status, one for the sentence staying out and one for the sentence appearing when the call is cut instead. The four
 * daily-plan reads are among them, because that other spec left their refusal half unpinned.
 *
 * ## The code this file measures (each line read out of its file before it is named)
 *
 * - `core/services/server/gauzy-error-response.ts`: `fallbackBody` is `{ message: fallbackMessage }` and nothing else
 *   (`:25`); a rejection that is not a Promise is answered with that body on a 502 (`:26-28`); a rejection that is one
 *   is unwrapped (`:31`) and keeps its own status whenever that body carries a numeric `statusCode` of 400 or more
 *   (`errorStatusOf` `:4-17`, used at `:32-37`) — `NextResponse.json(body, { status })`, the body untouched.
 * - `core/services/server/fetch.ts:125-131`: a non-2xx upstream answer rejects with `Promise.reject(data)`, i.e.
 *   Gauzy's own body inside a rejected promise, and `:141-150` (`unwrapRejection`) is what pulls it back out. So an
 *   armed `fails` arm is exactly the branch at `gauzy-error-response.ts:31-37`, where a `drops` arm is the branch at
 *   `:26-28` (a cut connection rejects with a plain error, `fetch.ts:141-142`).
 * - The mock's switch: `scenario.fails` (`mock-gauzy-server.mjs:1081-1095`) is keyed `<tenant>:<path>`, then
 *   `<tenant>`, then `<path>` — the tenant itself coming from `?tenantId`, then `where[tenantId]`, then the
 *   `tenant-id` header (`:1034-1037`) — and only an integer 400-599 arms it (`:1095`). Its payload is
 *   `{ statusCode, message: 'Synthetic Gauzy refusal (<status>)' }` (`:1099-1100`), the fixture handler is skipped
 *   (`:1096-1098`, `:1101-1114`), the answer's status is the armed one (`:1115`) and the log entry carries it
 *   (`:1122-1130`), which is what `mock.failures()` counts. A `drops` arm instead writes nothing (`:1146`) and is
 *   logged with `status: 0` (`:1129`), so it is never counted as a refusal.
 * - `core/services/server/guards/authenticated-guard-app.ts`: every route here authenticates through it, and it
 *   authenticates by asking the upstream `/user/me` (`:76-80`, shared per token for 5 s by `sessionChecks`, `:29-31`).
 *   `fails` is therefore never armed on `/api/user/me` and never keyed on a bare tenant: both would refuse the guard
 *   instead of the route under test.
 * - What the mock answers an unarmed call of these 16 paths: `mock-gauzy-server.mjs` has no handler for most of them,
 *   so its catch-all answers them — a DELETE as `{ affected: 1, raw: [] }` (`:825`), any other verb as the body it was
 *   sent or `{ success: true }` (`:826`), a GET as an empty page (`:827`); `POST /api/timesheet/timer/start` is
 *   answered at `:703-707` and `/api/timesheet/timer/status` at `:702`. That is why every control below is a real 2xx
 *   rather than a mock 404, and why an id the fixture does not carry (EXTRA_IDS) still gets answered: the mock never
 *   looks the record up.
 *
 * ## What was measured before any expectation was written down
 *
 * Probes against this lane on 2026-11-23: `E:\Coding\.tmp\refusal-probe-1.txt` (the 16 controls, each with the mock
 * log it produced) and `E:\Coding\.tmp\refusal-probe-3.txt` (16 routes x 7 armed statuses, then the 16 `drops` arms),
 * both read in full before this file was written. Every number and every body below is one of those measurements.
 *
 * ## The finding, stated up front
 *
 * **None of these 16 routes remaps or swallows an upstream refusal.** For all 112 route-and-status pairs the app
 * answered the armed status, unchanged, with Gauzy's body verbatim and nothing added — no 401 turned into something
 * else, no 4xx softened to a 502, no 5xx turned into a 500. So there is no `measured, not intended` case in this
 * file; the expectations are the ones the code says. What the run adds to that is the witness that it happened
 * upstream (the mock logged the armed status) and that the route's own sentence stayed out of the answer.
 *
 * Two controls are not 200 and are pinned as what they are: `POST /api/employee/rate-change-request` answers 202
 * (`app/api/employee/rate-change-request/route.ts:27`) and `DELETE /api/user-api-tokens/[id]` answers 204 with an
 * empty body (`app/api/user-api-tokens/[id]/route.ts:29`). And the two timer routes stop at the refusal: their
 * follow-up `GET /api/timesheet/timer/status` was recorded in both controls and in no refusal or drop at all
 * (`app/api/timer/start/route.ts:173-190`, `app/api/timer/discard/route.ts:44-60`), pinned per case below.
 */

/** The statuses a test arms the mock with, in the order the tests arm them. */
const REFUSAL_STATUSES = [400, 401, 403, 404, 409, 500, 503];

/**
 * One status used when a case asks for "a refusal" rather than for a particular one. 403, because it is the refusal
 * these routes most often mean in production (a role that may not do the thing).
 */
const ONE_REFUSAL = 403;

/**
 * Three ids the bootstrap fixture has no entry for. They only have to pass the route's own id schema — `z.guid()` for
 * a comment (`app/api/comment/[id]/route.ts:8`) and a notification (`app/api/employee-notification/[id]/route.ts:9`),
 * `z.uuid()` for an API token (`app/api/user-api-tokens/[id]/route.ts:9`) — and the mock answers an id it has never
 * seen (mock-gauzy-server.mjs:825-827), which is what makes a DELETE of a token that does not exist a 204.
 */
const EXTRA_IDS = {
	comment: 'dddddddd-dddd-4ddd-8ddd-111111111111',
	notification: 'eeeeeeee-eeee-4eee-8eee-222222222222',
	token: 'ffffffff-ffff-4fff-8fff-333333333333'
};

/** One `app/api` route, the upstream call it makes, and the sentence its catch passes to `gauzyErrorResponse`. */
type RefusalRoute = {
	/** Names the tests and says which route a refusal answer belongs to. */
	label: string;
	/** The verb the test calls. */
	method: 'DELETE' | 'GET' | 'POST' | 'PUT';
	/** The app route, as `api()` is called with it. */
	app: (ids: Record<string, string>) => string;
	/** The upstream pathname the requests module puts on the call — the key `fails` and `drops` are armed with. */
	upstream: (ids: Record<string, string>) => string;
	/** The body the test sends, for a route that reads one; omitted where the route takes none. */
	body?: (ids: Record<string, string>) => Record<string, unknown>;
	/** The status the same call answers with nothing armed. */
	control: number;
	/** The sentence this route hands `gauzyErrorResponse` — read from its `catch`, line named per route below. */
	fallback: string;
	/** A second upstream path this route calls only after the first one succeeded. */
	secondCall?: (ids: Record<string, string>) => string;
	/** Whether the control answers with no body at all (a 204). */
	noBody?: boolean;
};

const ROUTES: RefusalRoute[] = [
	{
		label: 'the team daily-plan read',
		method: 'GET',
		app: () => '/api/daily-plan',
		// requests/daily-plan.ts:47
		upstream: () => '/api/daily-plan',
		control: 200,
		// app/api/daily-plan/route.ts:46
		fallback: 'The team plans could not be read.'
	},
	{
		label: 'the me daily-plan read',
		method: 'GET',
		app: () => '/api/daily-plan/me',
		// requests/daily-plan.ts:84
		upstream: () => '/api/daily-plan/me',
		control: 200,
		// app/api/daily-plan/me/route.ts:32
		fallback: 'Your plans could not be read.'
	},
	{
		label: 'the employee daily-plan read',
		method: 'GET',
		app: (ids) => `/api/daily-plan/employee/${ids.employee}`,
		// requests/daily-plan.ts:123
		upstream: (ids) => `/api/daily-plan/employee/${ids.employee}`,
		control: 200,
		// app/api/daily-plan/employee/[employeeId]/route.ts:34
		fallback: "The member's plans could not be read."
	},
	{
		label: 'the task daily-plan read',
		method: 'GET',
		app: (ids) => `/api/daily-plan/task/${ids.task}`,
		// requests/daily-plan.ts:152
		upstream: (ids) => `/api/daily-plan/task/${ids.task}`,
		control: 200,
		// app/api/daily-plan/task/[taskId]/route.ts:35
		fallback: "The task's plans could not be read."
	},
	{
		label: 'the comments read',
		method: 'GET',
		app: (ids) => `/api/comment?entity=Task&entityId=${ids.task}`,
		// requests/comment.ts:15, which forwards the incoming query string as is (app/api/comment/route.ts:27-31)
		upstream: () => '/api/comment',
		control: 200,
		// app/api/comment/route.ts:35
		fallback: 'Comments request failed'
	},
	{
		label: 'the comment post',
		method: 'POST',
		app: () => '/api/comment',
		// requests/comment.ts:32
		upstream: () => '/api/comment',
		// app/api/comment/route.ts:12-19 takes a trimmed text, an entity of EBaseEntityEnum and a guid entity id
		body: (ids) => ({ comment: 'A pinned refusal probe comment', entity: 'Task', entityId: ids.task }),
		control: 200,
		// app/api/comment/route.ts:59
		fallback: 'Comment post failed'
	},
	{
		label: 'the comment edit',
		method: 'PUT',
		app: () => `/api/comment/${EXTRA_IDS.comment}`,
		// requests/comment.ts:52
		upstream: () => `/api/comment/${EXTRA_IDS.comment}`,
		body: () => ({ comment: 'A pinned refusal probe edit' }),
		control: 200,
		// app/api/comment/[id]/route.ts:68
		fallback: 'Comment update failed'
	},
	{
		label: 'the comment delete',
		method: 'DELETE',
		app: () => `/api/comment/${EXTRA_IDS.comment}`,
		// requests/comment.ts:62
		upstream: () => `/api/comment/${EXTRA_IDS.comment}`,
		control: 200,
		// app/api/comment/[id]/route.ts:90
		fallback: 'Comment delete failed'
	},
	{
		label: 'the notification state update',
		method: 'PUT',
		app: () => `/api/employee-notification/${EXTRA_IDS.notification}`,
		// requests/employee-notification.ts:32
		upstream: () => `/api/employee-notification/${EXTRA_IDS.notification}`,
		// core/lib/validation/employee-notification.ts:42-50, a strict object of the receiver's own state
		body: () => ({ isRead: true }),
		control: 200,
		// app/api/employee-notification/[id]/route.ts:39
		fallback: 'Notification update failed'
	},
	{
		label: 'the timer start',
		method: 'POST',
		app: () => '/api/timer/start',
		// requests/timer.ts:62
		upstream: () => '/api/timesheet/timer/start',
		body: (ids) => ({ taskId: ids.task }),
		secondCall: () => '/api/timesheet/timer/status',
		control: 200,
		// app/api/timer/start/route.ts:184
		fallback: 'The timer could not be started.'
	},
	{
		label: 'the timer discard',
		method: 'POST',
		app: () => '/api/timer/discard',
		// requests/timer.ts:90
		upstream: () => '/api/timesheet/timer/discard',
		body: () => ({}),
		secondCall: () => '/api/timesheet/timer/status',
		control: 200,
		// app/api/timer/discard/route.ts:47
		fallback: 'The timer could not be discarded.'
	},
	{
		label: 'the project rates read',
		method: 'GET',
		app: (ids) => `/api/organization-projects/${ids.project}/rates`,
		// requests/rates.ts:26
		upstream: (ids) => `/api/organization-projects/${ids.project}/rates`,
		control: 200,
		// app/api/organization-projects/[id]/rates/route.ts:25
		fallback: 'The project rates could not be read.'
	},
	{
		label: 'the project rate save',
		method: 'PUT',
		app: (ids) => `/api/organization-projects/${ids.project}/rate`,
		// requests/rates.ts:42
		upstream: (ids) => `/api/organization-projects/${ids.project}/rate`,
		body: () => ({ billRateValue: 25 }),
		control: 200,
		// app/api/organization-projects/[id]/rate/route.ts:36
		fallback: 'The project rate could not be saved.'
	},
	{
		label: "the member's project rate save",
		method: 'PUT',
		app: (ids) => `/api/organization-projects/${ids.project}/members/${ids.employee}/rate`,
		// requests/rates.ts:64
		upstream: (ids) => `/api/organization-projects/${ids.project}/members/${ids.employee}/rate`,
		body: () => ({ billRateValue: 25 }),
		control: 200,
		// app/api/organization-projects/[id]/members/[employeeId]/rate/route.ts:40
		fallback: "The member's rate could not be saved."
	},
	{
		label: 'the rate change request',
		method: 'POST',
		app: () => '/api/employee/rate-change-request',
		// requests/rates.ts:110
		upstream: () => '/api/employee/rate-change-request',
		body: () => ({ billRateValue: 30 }),
		// app/api/employee/rate-change-request/route.ts:27 answers the created request with 202
		control: 202,
		// app/api/employee/rate-change-request/route.ts:29
		fallback: 'The rate change request could not be sent.'
	},
	{
		label: 'the API token revoke',
		method: 'DELETE',
		app: () => `/api/user-api-tokens/${EXTRA_IDS.token}`,
		// requests/user-api-tokens.ts:47
		upstream: () => `/api/user-api-tokens/${EXTRA_IDS.token}`,
		// app/api/user-api-tokens/[id]/route.ts:29 answers a revoke with 204 and no body
		control: 204,
		noBody: true,
		// app/api/user-api-tokens/[id]/route.ts:31
		fallback: 'The API token could not be revoked.'
	}
];

/** The body the mock writes for an armed refusal (mock-gauzy-server.mjs:1100), spelled the way the app passes it on. */
const gauzyRefusal = (status: number) => ({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });

const describeAnswer = (path: string, response: APIResponse, body: string) =>
	`${path} -> ${response.status()} · content-type ${response.headers()['content-type'] ?? 'absent'} · ` +
	`body(${body.length}) ${body.slice(0, 160)}`;

/** The mock's entries for one upstream pathname, exactly as it recorded them. */
const asksFor = (requests: Array<{ method: string; path: string; status: number }>, path: string) =>
	requests.filter((request) => request.path === path);

const callRoute = (
	api: (path: string, options?: { body?: unknown; method?: string }) => Promise<APIResponse>,
	route: RefusalRoute,
	path: string,
	ids: Record<string, string>
) => api(path, { method: route.method, ...(route.body ? { body: route.body(ids) } : {}) });

test.describe('lane-a · 16 proxy routes handing a Gauzy refusal straight to the caller', () => {
	for (const route of ROUTES) {
		// 1. The control: the same call with nothing armed, and the upstream call it caused.
		test(`${route.label}: control — ${route.method} answers ${route.control} and the mock recorded the upstream call`, async ({
			api,
			mock,
			ids
		}) => {
			const path = route.app(ids);
			const upstream = route.upstream(ids);
			const response = await callRoute(api, route, path, ids);
			const body = await response.text();
			const log = await mock.requests();
			const calls = asksFor(log, upstream);
			const witness = `${describeAnswer(path, response, body)} · log ${logOf(log)}`;

			expect(response.status(), `the armed-nothing call no longer answers ${route.control}: ${witness}`).toBe(
				route.control
			);
			if (route.noBody) {
				expect(body, `${route.label} no longer answers with an empty body: ${witness}`).toBe('');
			} else {
				expect(
					response.headers()['content-type'],
					`the control answer is no longer JSON: ${witness}`
				).toContain('application/json');
			}

			// This is also the proof that `upstream` is the path this route really calls: an armed case below only
			// bites when it is named exactly.
			expect(
				triples(calls),
				`the ${route.label} is not exactly one upstream call to ${upstream}: ${JSON.stringify(
					triples(calls)
				)} — full log ${logOf(log)}`
			).toEqual([`${route.method} ${upstream} 200`]);
			expect(await mock.failures(), `the control caused a refused upstream call: ${witness}`).toEqual([]);

			if (route.secondCall) {
				// Measured: the follow-up read happens only because the first one succeeded.
				const second = route.secondCall(ids);
				expect(
					asksFor(log, second),
					`the ${route.label} no longer follows its own call with the read of ${second}: ${witness}`
				).toHaveLength(1);
			}
		});

		// 2. One test per armed status: the refusal reaches the caller as it is.
		for (const status of REFUSAL_STATUSES) {
			test(`${route.label}: an upstream ${status} is answered ${status} with Gauzy's body, not with a 502`, async ({
				api,
				mock,
				ids
			}) => {
				const path = route.app(ids);
				const upstream = route.upstream(ids);
				// Armed on the upstream path and never on a bare tenant: `fails` is keyed `<tenant>:<path>`, then
				// `<tenant>`, then `<path>` (mock-gauzy-server.mjs:1089-1094), and a tenant-wide arm would refuse the
				// guard's own `/api/user/me` check too (authenticated-guard-app.ts:76-80) — a different failure.
				await mock.scenario({ fails: { [upstream]: status } });

				const response = await callRoute(api, route, path, ids);
				const body = await response.text();
				const log = await mock.requests();
				const calls = asksFor(log, upstream);
				const witness = `${describeAnswer(path, response, body)} · log ${logOf(log)}`;

				// `gauzyErrorResponse` passes the unwrapped body on with its own status whenever that body carries a
				// `statusCode` of 400 or more (gauzy-error-response.ts:32-37 with errorStatusOf :4-17), and the mock's
				// refusal body carries the armed number (mock-gauzy-server.mjs:1099-1100, :1115).
				expect(response.status(), `an armed upstream ${status} was not answered ${status}: ${witness}`).toBe(
					status
				);
				expect(
					parseAnswer(body),
					`the ${status} answer is no longer Gauzy's body and nothing else: ${witness}`
				).toEqual(gauzyRefusal(status));
				expect(
					response.headers()['content-type'],
					`the ${status} answer is no longer the app's own JSON: ${witness}`
				).toContain('application/json');

				// The witness that this was a refusal and not an outage: the mock logged the call with the armed status,
				// so `failures()` (which filters `status >= 400`) counts exactly it.
				expect(
					triples(calls),
					`the refused call is not the single ${status} entry it must be: ${JSON.stringify(
						triples(calls)
					)} — full log ${logOf(log)}`
				).toEqual([`${route.method} ${upstream} ${status}`]);
				expect(
					triples(await mock.failures()),
					`the refused call was not the one refusal this lane counted: ${witness}`
				).toEqual([`${route.method} ${upstream} ${status}`]);

				if (route.secondCall) {
					// Measured, and it is what the code says: the route returns from its `catch` (start
					// app/api/timer/start/route.ts:181-185, discard app/api/timer/discard/route.ts:46-48) before the
					// status read it would otherwise make (start :187-190, discard :52-60).
					const second = route.secondCall(ids);
					expect(
						triples(asksFor(log, second)),
						`the ${route.label} still made its follow-up read of ${second} after the refusal: ${witness}`
					).toEqual([]);
				}
			});
		}

		// 3. The route's own sentence stayed out of the answer.
		test(`${route.label}: the route's own sentence is nowhere in the answer when Gauzy answered`, async ({
			api,
			mock,
			ids
		}) => {
			const path = route.app(ids);
			const upstream = route.upstream(ids);
			await mock.scenario({ fails: { [upstream]: ONE_REFUSAL } });

			const response = await callRoute(api, route, path, ids);
			const body = await response.text();
			const log = await mock.requests();
			const witness = `${describeAnswer(path, response, body)} · log ${logOf(log)}`;

			// The fallback object is built (`gauzy-error-response.ts:25`) and then never answered: only the branch at
			// `:26-28` or `:33-35` would answer it, and a refusal takes the third branch (`:37`).
			expect(response.status(), `the refusal was not answered ${ONE_REFUSAL}: ${witness}`).toBe(ONE_REFUSAL);
			expect(
				body,
				`the ${route.label} answer is no longer Gauzy's body alone — it names this route's own sentence ` +
					`(${JSON.stringify(route.fallback)}): ${witness}`
			).not.toContain(route.fallback);
			expect(parseAnswer(body), `the ${route.label} refusal body changed shape: ${witness}`).toEqual(
				gauzyRefusal(ONE_REFUSAL)
			);
		});

		// 4. The same route with a cut call: there the sentence is the whole answer.
		test(`${route.label}: a dropped call answers 502 with this route's own sentence`, async ({
			api,
			mock,
			ids
		}) => {
			const path = route.app(ids);
			const upstream = route.upstream(ids);
			await mock.scenario({ drops: { [upstream]: 1 } });

			const response = await callRoute(api, route, path, ids);
			const body = await response.text();
			const log = await mock.requests();
			const calls = asksFor(log, upstream);
			const entry = calls[0];
			const witness = `${describeAnswer(path, response, body)} · log ${logOf(log)}`;

			// The other half of the same function, pinned per route so the two halves cannot be confused: a rejection
			// with no readable Gauzy body is answered with `{ message: <fallback> }` on a 502, with no `statusCode`
			// added (gauzy-error-response.ts:26-28), and the mock recorded the call it cut with status 0
			// (mock-gauzy-server.mjs:1129 with the socket destroyed at :1146).
			expect(response.status(), `the outage answer of the ${route.label} moved: ${witness}`).toBe(502);
			expect(parseAnswer(body), `the outage body is no longer this route's sentence alone: ${witness}`).toEqual({
				message: route.fallback
			});
			expect(
				triples(calls),
				`the cut call is not the single zero-status entry it must be: ${JSON.stringify(
					triples(calls)
				)} — full log ${logOf(log)}`
			).toEqual([`${route.method} ${upstream} 0`]);
			expect(entry?.status, `the drop was recorded with status ${entry?.status}, not 0: ${witness}`).toBe(0);
			expect(
				await mock.failures(),
				`the drop was counted as an upstream refusal, which would make every "was refused upstream" witness in ` +
					`this repo mean two different things: ${logOf(log)}`
			).toEqual([]);
		});
	}
});

// Every case from 2 on arms a scenario, and a scenario outlives a test unless the mock is reset: `setScenario`
// shallow-merges its payload (playwright/helpers.ts:124-125), so a payload that names neither `fails` nor `drops`
// leaves the previous arm armed. The `mock` fixture resets before each test (playwright/api-fixtures.ts:51-65); this
// afterEach is what keeps an arm from being seen by the next spec in this lane.
test.afterEach(async () => {
	await mockReset();
});
