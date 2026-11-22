import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { mockReset, type StubRequest } from '../../helpers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The four daily-plan READ routes, pinned on lane-a (app 3031, mock 3992). Every number and every recorded query
 * below was measured against this lane before it was written down, in the probes
 * `E:\Coding\.tmp\dp-probe-1.txt` and `E:\Coding\.tmp\dp-probe-2.txt` (2026-11-22) and in the runs of this file,
 * `E:\Coding\.tmp\s2-lane-a-dp-1.log` onward.
 *
 * ## The code this file measures (each line read out of the file before it is named)
 *
 * - The four handlers: `app/api/daily-plan/route.ts:36-47`, `app/api/daily-plan/me/route.ts:20-33`,
 *   `app/api/daily-plan/employee/[employeeId]/route.ts:21-35` and `app/api/daily-plan/task/[taskId]/route.ts:24-36`.
 *   Each GET wraps its upstream read in `try`/`catch` and hands the rejection to `gauzyErrorResponse` with its own
 *   sentence — the four sentences differ per route, so they are pinned per route below.
 * - `core/services/server/gauzy-error-response.ts`: `fallbackBody` is `{ message: fallbackMessage }` and nothing else
 *   (`:25`); a rejection that is not a Promise is answered with that body on a 502 (`:26`, `:28`); a rejection that
 *   is one gets its body unwrapped (`:31`, `core/services/server/fetch.ts:143-150`) and keeps its own status only when
 *   that body carries a `statusCode` of 400 or more (`errorStatusOf` `:4-17`, used at `:32-37`).
 * - `core/services/server/fetch.ts:125-131`: a non-2xx upstream answer rejects with `Promise.reject(data)`, and
 *   `:141-142` says the other kind of failure — a network one — rejects with a plain error carrying no status. So the
 *   cut-connection arm below is exactly the branch at `gauzy-error-response.ts:26-28`.
 * - `core/services/server/requests/daily-plan.ts`: `getAllDayPlans` (`:14-52`), `getMyDailyPlansRequest` (`:54-89`),
 *   `getDayPlansByEmployee` (`:91-128`) and `getPlansByTask` (`:130-157`), each building its query with `qs.stringify`
 *   over `where[organizationId]`, `where[tenantId]` (`:34`, `:72`, `:112`, `:145`) and `where[organizationTeamId]`,
 *   and each passing `tenantId` to `serverFetch` (`:50`, `:87`, `:126`, `:155`) — which turns it into the upstream
 *   `tenant-id` header at `core/services/server/fetch.ts:95-97`.
 * - `core/services/server/requests/response-shape.ts:9-12` (`readResponseShape`) accepts only `lean` and `full` and
 *   answers `undefined` for anything else; `requests/daily-plan.ts:74` and `:113` spread it into the query as `shape`
 *   when it is present.
 * - `core/services/server/guards/authenticated-guard-app.ts`: the guard authenticates by asking the upstream
 *   `/user/me` with the cookie token (`:61-76`, `:79-85`, and `core/services/server/requests/auth.ts:141-159` is that
 *   request), accepts any 2xx body that is not a 401 envelope (`:22-23`), refuses with the upstream status or 503
 *   when the check gave no usable answer (`:88-113`), and states that it does not authorize the resource
 *   (`:46-51`). `tenantId`, `organizationId` and the team id come from the caller's cookies (`:63`, `:64`, `:69`).
 * - The mock: its page shape is `pagination` at `cypress/support/mock-gauzy-server.mjs:9`, the four daily-plan paths
 *   are answered at `:697-698` with the fixture plan built at `:240-250`; `/api/user/me` is answered with the fixture
 *   user at `:544` with no bearer check anywhere on that path; the tenant a scenario arm is keyed on is resolved from
 *   `?tenantId`, then `where[tenantId]`, then the `tenant-id` header at `:1013-1016`; `drops` and `delays` are
 *   addressed as `<tenant>:<path>`, then `<tenant>`, then `<path>` (`:1017-1021` and `:1044-1049`); the request log
 *   entry is written at `:1082-1090` with `query` as `searchParams.toString()` (`:1085`) and `status: 0` for a call
 *   the mock cut off (`:1089`), and the socket is destroyed at `:1101-1107`.
 *
 * ## What this lane cannot answer, written down instead of asserted
 *
 * - **The guard's 401 is not reachable here.** The mock answers the guard's own `/user/me` check whoever asks
 *   (`mock-gauzy-server.mjs:544`), so a request with no cookie at all is authenticated as far as the guard can tell
 *   and its read goes upstream with an empty tenant and an empty organization. `daily-plan-reads` pins that measured
 *   answer instead of the 401 the code can produce against a real API.
 * - **An upstream refusal (a 4xx/5xx answer) cannot be caused on these paths**: nothing in this checkout's mock
 *   answers `/api/daily-plan*` with a status (`:697-698` is a plain page), so the `statusCode >= 400` half of
 *   `gauzy-error-response.ts:31-37` is not testable on a lane. Only the no-answer half is, and only through `drops`.
 * - **Whether the new `tenant-id` header is actually sent cannot be proven on this mock**, because the mock resolves
 *   the tenant from the query first (`:1013-1016`) and all four reads put `where[tenantId]` in that query
 *   (`requests/daily-plan.ts:34`, `:72`, `:112`, `:145`). See the last test for what is proven instead.
 */

/** The four reads: the app route, the upstream path the requests module builds for it, and the sentence its catch uses. */
type ReadRoute = {
	/** Names the test and says which read a failure message is about. */
	label: string;
	/** The app route the test calls. */
	app: (ids: Record<string, string>) => string;
	/** The upstream pathname `core/services/server/requests/daily-plan.ts` puts on the call. */
	upstream: (ids: Record<string, string>) => string;
	/** The `relations[i]` entries that read asks for, in the order it asks for them. */
	relations: string[];
	/** The fallback sentence this route passes to `gauzyErrorResponse`. */
	message: string;
	/**
	 * Whether this route hands the requests module an empty string instead of the cookie value it did not get: only
	 * `/api/daily-plan` does (`organizationId: organizationId || ''` and the same for the tenant and the team,
	 * app/api/daily-plan/route.ts:38-41), and that is the whole reason its sessionless read still carries three empty
	 * `where[...]` keys while the other three carry none (`qs.stringify` skips undefined, keeps an empty string).
	 */
	emptyWhereKeys: boolean;
};

const READS: ReadRoute[] = [
	{
		label: 'the team read',
		app: () => '/api/daily-plan',
		upstream: () => '/api/daily-plan',
		// requests/daily-plan.ts:24 (the proxy's own trim, explained at :19-23)
		relations: ['tasks'],
		message: 'The team plans could not be read.',
		emptyWhereKeys: true
	},
	{
		label: 'the me read',
		app: () => '/api/daily-plan/me',
		upstream: () => '/api/daily-plan/me',
		// requests/daily-plan.ts:59
		relations: ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user'],
		message: 'Your plans could not be read.',
		emptyWhereKeys: false
	},
	{
		label: 'the employee read',
		app: (ids) => `/api/daily-plan/employee/${ids.employee}`,
		upstream: (ids) => `/api/daily-plan/employee/${ids.employee}`,
		// requests/daily-plan.ts:97
		relations: ['employee', 'tasks', 'employee.user', 'tasks.members', 'tasks.members.user'],
		message: "The member's plans could not be read.",
		emptyWhereKeys: false
	},
	{
		label: 'the task read',
		app: (ids) => `/api/daily-plan/task/${ids.task}`,
		upstream: (ids) => `/api/daily-plan/task/${ids.task}`,
		// getPlansByTask sends no relations at all (requests/daily-plan.ts:143-156)
		relations: [],
		message: "The task's plans could not be read.",
		emptyWhereKeys: false
	}
];

/** The `key=value` pairs of a recorded query, decoded from what the mock stored (`mock-gauzy-server.mjs:1085`). */
const queryPairs = (query: string): Array<[string, string]> => Array.from(new URLSearchParams(query).entries());

/** The upstream query the requests module builds for one signed-in scope-A read. */
const signedQuery = (
	ids: Record<string, string>,
	read: ReadRoute,
	shape?: 'lean' | 'full'
): Array<[string, string]> => [
	['where[organizationId]', ids.organizationA],
	['where[tenantId]', ids.tenantA],
	['where[organizationTeamId]', ids.teamA],
	...(shape ? [['shape', shape] as [string, string]] : []),
	...read.relations.map((relation, index): [string, string] => [`relations[${index}]`, relation])
];

/**
 * What a read asks when the guard had no cookies to read ids from: the relations half it always asks for, plus the
 * three empty `where[...]` keys on the one route that falls back to `''` (ReadRoute.emptyWhereKeys).
 */
const sessionlessQuery = (read: ReadRoute): Array<[string, string]> => [
	...(read.emptyWhereKeys
		? ([
				['where[organizationId]', ''],
				['where[tenantId]', ''],
				['where[organizationTeamId]', '']
			] as Array<[string, string]>)
		: []),
	...read.relations.map((relation, index): [string, string] => [`relations[${index}]`, relation])
];

const describeAnswer = (path: string, response: APIResponse, body: string) =>
	`${path} -> ${response.status()} · content-type ${response.headers()['content-type'] ?? 'absent'} · ` +
	`body(${body.length}) ${body.slice(0, 160)}`;

/** The mock's entries for one upstream path, each with the query it recorded. */
const asksFor = (requests: StubRequest[], path: string): StubRequest[] =>
	requests.filter((request) => request.path === path);

test.describe('lane-a · the four daily-plan reads, and what each answers when the platform gives no answer', () => {
	// ---------------------------------------------------------------- 1. the signed-in read, and the call it caused

	for (const read of READS) {
		test(`${read.label}: 200, exactly one upstream read, and the query the mock saw`, async ({
			api,
			mock,
			ids
		}) => {
			const path = read.app(ids);
			const response = await api(path);
			const body = await response.text();
			const log = await mock.requests();
			const upstream = asksFor(log, read.upstream(ids));
			const witness = `${describeAnswer(path, response, body)} · log ${logOf(log)}`;

			expect(response.status(), `the signed-in read no longer answers 200: ${witness}`).toBe(200);
			expect(
				triples(upstream),
				`the read is not exactly one upstream call to ${read.upstream(ids)}: ${JSON.stringify(
					triples(upstream)
				)} — full log ${logOf(log)}`
			).toEqual([`GET ${read.upstream(ids)} 200`]);

			const entry = upstream[0];
			expect(
				queryPairs(entry?.query ?? ''),
				`the upstream query the mock recorded moved (${witness}) — it is what ${read.label.replace(
					'the ',
					''
				)} asks the platform for`
			).toEqual(signedQuery(ids, read));

			// The body is the mock's own fixture page (mock-gauzy-server.mjs:697-698 with the plan at :240-250), so the
			// read the app returned is the one the lane answered, not something the route invented.
			const answer = parseAnswer(body) as { items?: Array<{ id?: string }>; total?: number };
			expect(
				[answer.total, answer.items?.map((item) => item.id)],
				`the answer is no longer the mock's one-plan page: ${witness}`
			).toEqual([1, [ids.plan]]);
			expect(await mock.failures(), `the signed read caused a refused upstream call: ${witness}`).toEqual([]);
		});
	}

	// ---------------------------------------------------------------- 2. the same four routes with no cookies

	for (const read of READS) {
		test(`${read.label}: with no cookies the read still reaches the platform, because this mock answers the guard`, async ({
			api,
			mock,
			ids
		}) => {
			const path = read.app(ids);
			const response = await api(path, { anonymous: true });
			const body = await response.text();
			const log = await mock.requests();
			const upstream = asksFor(log, read.upstream(ids));
			const witness = `${describeAnswer(path, response, body)} · log ${logOf(log)}`;

			// measured, not intended: an anonymous GET is answered 200 here and its read is recorded, where a real
			// Gauzy would refuse it. `authenticatedGuard` authorizes nothing itself (authenticated-guard-app.ts:46-51)
			// — it authenticates by asking the upstream `/user/me` with the cookie token (:61-76, :79-85, the request
			// itself in core/services/server/requests/auth.ts:141-159) and accepts any 2xx body that is not a 401
			// envelope (:22-23). This lane's mock answers `/api/user/me` with the fixture user whoever asks and whatever
			// bearer it got (cypress/support/mock-gauzy-server.mjs:544, no bearer check on that path), so a caller that
			// brought no cookie is signed in as far as the guard can tell, and the refusal at :88-113 is never reached.
			// If this goes red beside the assertions below, the mock grew a bearer check (or the guard grew an own
			// session test) and the 401 half of these routes became testable — re-measure all four cases, do not flip
			// the expectation here.
			expect(response.status(), `the sessionless read no longer answers what the lane measured: ${witness}`).toBe(
				200
			);
			expect(
				triples(upstream),
				`the sessionless read is not exactly one upstream call to ${read.upstream(ids)}: ${JSON.stringify(
					triples(upstream)
				)} — full log ${logOf(log)}`
			).toEqual([`GET ${read.upstream(ids)} 200`]);

			// What the read carried instead: the keys are there or they are not, but no tenant id and no organization id
			// ever is. `/api/daily-plan` sends its three `where` keys empty because its route falls back to `''`
			// (app/api/daily-plan/route.ts:38-41); the other three routes pass the guard's undefined cookie values
			// straight through (me/route.ts:22-25, employee/[employeeId]/route.ts:23-27, task/[taskId]/route.ts:26-30)
			// and `qs.stringify` leaves an undefined key out — which is why the task read's recorded query is the empty
			// string.
			const entry = upstream[0];
			expect(
				queryPairs(entry?.query ?? ''),
				`a sessionless read carried a tenant or an organization it had none of: ${JSON.stringify(
					queryPairs(entry?.query ?? '')
				)} (${witness})`
			).toEqual(sessionlessQuery(read));
			expect(
				asksFor(log, '/api/daily-plan').filter((request) => request.path !== read.upstream(ids)).length,
				`the sessionless ${read.label} also asked another daily-plan path: ${witness}`
			).toBe(0);
		});
	}

	// ---------------------------------------------------------------- 3. the new error mapping, per route

	for (const read of READS) {
		test(`${read.label}: a cut upstream call answers 502 with this route's own sentence, and is logged as a drop`, async ({
			api,
			mock,
			ids
		}) => {
			const path = read.app(ids);
			const upstreamPath = read.upstream(ids);
			await mock.scenario({ drops: { [upstreamPath]: 1 } });

			const response = await api(path);
			const body = await response.text();
			const log = await mock.requests();
			const upstream = asksFor(log, upstreamPath);
			const entry = upstream[0];
			const witness = `${describeAnswer(path, response, body)} · log ${logOf(log)}`;

			// `gauzyErrorResponse` answers a rejection that is not a Gauzy error body with its fallback on a 502
			// (gauzy-error-response.ts:26-28), and a dropped connection is that kind of rejection
			// (core/services/server/fetch.ts:141-142). The body is the fallback object alone: no `statusCode` was added.
			expect(response.status(), `the outage answer moved: ${witness}`).toBe(502);
			expect(parseAnswer(body), `the outage body is no longer this route's sentence alone: ${witness}`).toEqual({
				message: read.message
			});
			expect(
				response.headers()['content-type'],
				`the outage answer is no longer the app's own JSON: ${witness}`
			).toContain('application/json');

			// The witness that this was an outage and not a refusal: the mock recorded the call it cut with `status: 0`
			// (mock-gauzy-server.mjs:1089), i.e. it was asked and answered nothing, and `failures()` (which filters
			// `status >= 400`) stays empty.
			expect(
				triples(upstream),
				`the cut call is not the single zero-status entry it must be: ${JSON.stringify(
					triples(upstream)
				)} — full log ${logOf(log)}`
			).toEqual([`GET ${upstreamPath} 0`]);
			expect(entry?.status, `the drop was recorded with status ${entry?.status}, not 0: ${witness}`).toBe(0);
			expect(
				await mock.failures(),
				`the drop was counted as an upstream refusal, which would make every "was refused upstream" witness in ` +
					`this repo mean two different things: ${logOf(log)}`
			).toEqual([]);
			// The read was built normally before it died: the dropped call carries the same query as the answered one.
			expect(
				queryPairs(entry?.query ?? ''),
				`the dropped call no longer carries the query the read builds: ${JSON.stringify(
					queryPairs(entry?.query ?? '')
				)} (${witness})`
			).toEqual(signedQuery(ids, read));
		});
	}

	// ---------------------------------------------------------------- 4. a slow upstream is waited for

	for (const read of READS) {
		test(`${read.label}: a 2 s upstream is waited out with 200, not failed fast`, async ({ api, mock, ids }) => {
			const path = read.app(ids);
			const upstreamPath = read.upstream(ids);
			await mock.scenario({ delays: { [upstreamPath]: 2_000 } });

			const started = Date.now();
			const response = await api(path);
			const body = await response.text();
			const waitedMs = Date.now() - started;
			const entry = asksFor(await mock.requests(), upstreamPath)[0];
			const witness =
				`${describeAnswer(path, response, body)} · waited ${waitedMs} ms · entry ` + JSON.stringify(entry);

			// Nothing in these four routes sets its own deadline, so the only budget on this call is Playwright's own
			// 60 000 ms (playwright/api-fixtures.ts:101): a fast failure here would mean a timeout was added to the
			// route or to the request module.
			expect(response.status(), `a slow upstream was not waited out: ${witness}`).toBe(200);
			expect(
				waitedMs,
				`the app answered a 2 000 ms upstream in ${waitedMs} ms — faster than the upstream was held, so a ` +
					`deadline was introduced somewhere on this read`
			).toBeGreaterThanOrEqual(2_000);
			expect(
				waitedMs,
				`the app waited ${waitedMs} ms on a 2 000 ms upstream, far past the 2 126-2 435 ms this lane measured`
			).toBeLessThan(20_000);
			// A delay, unlike a drop, is inside the mock entry: `endMs` is taken after the payload was built
			// (mock-gauzy-server.mjs:1076, :1082-1090). Measured 2 003-2 009 ms for this arm.
			expect(
				(entry?.endMs ?? 0) - (entry?.startMs ?? 0),
				`the mock entry does not report the 2 000 ms delay it applied: ${JSON.stringify(entry)}`
			).toBeGreaterThanOrEqual(1_900);
		});
	}

	// ---------------------------------------------------------------- 5. shape=lean reaches the upstream query

	test('the me read forwards shape=lean, forwards shape=full, and drops a shape it does not know', async ({
		api,
		mock,
		ids
	}) => {
		const path = '/api/daily-plan/me';
		const read = READS[1];
		const cases: Array<{ ask: string; forwarded: 'lean' | 'full' | null }> = [
			{ ask: 'lean', forwarded: 'lean' },
			{ ask: 'full', forwarded: 'full' },
			{ ask: 'bogus', forwarded: null }
		];

		for (const one of cases) {
			const response = await api(`${path}?shape=${one.ask}`);
			const body = await response.text();
			const log = await mock.requests();
			const entry = asksFor(log, read.upstream(ids))[0];
			const witness = `${describeAnswer(`${path}?shape=${one.ask}`, response, body)} · entry ${JSON.stringify(entry)}`;
			const pairs = queryPairs(entry?.query ?? '');

			expect(response.status(), `a shaped read was not answered: ${witness}`).toBe(200);
			// `readResponseShape` (core/services/server/requests/response-shape.ts:9-12) reads only `lean` and `full`
			// and answers undefined otherwise, and requests/daily-plan.ts:74 spreads the value between the `where` keys
			// and the relations — which is the order the pairs below pin.
			expect(pairs, `the shape this read forwarded moved (${one.ask}): ${witness}`).toEqual(
				one.forwarded ? signedQuery(ids, read, one.forwarded) : signedQuery(ids, read)
			);
			expect(
				pairs.filter(([key]) => key === 'shape').length,
				`shape=${one.ask} produced ${pairs.filter(([key]) => key === 'shape').length} upstream shape entries: ${witness}`
			).toBe(one.forwarded ? 1 : 0);
			await mockReset();
		}
	});

	test('the employee read forwards shape=lean too', async ({ api, mock, ids }) => {
		const read = READS[2];
		const path = `${read.app(ids)}?shape=lean`;
		const response = await api(path);
		const body = await response.text();
		const entry = asksFor(await mock.requests(), read.upstream(ids))[0];
		const witness = `${describeAnswer(path, response, body)} · entry ${JSON.stringify(entry)}`;

		expect(response.status(), `the shaped employee read was not answered: ${witness}`).toBe(200);
		expect(queryPairs(entry?.query ?? ''), `the employee read lost the shape it forwards: ${witness}`).toEqual(
			signedQuery(ids, read, 'lean')
		);
	});

	test('the team read and the task read forward no shape at all — measured, and why', async ({ api, mock, ids }) => {
		for (const read of [READS[0], READS[3]]) {
			const path = `${read.app(ids)}?shape=lean`;
			const response = await api(path);
			const body = await response.text();
			const entry = asksFor(await mock.requests(), read.upstream(ids))[0];
			const pairs = queryPairs(entry?.query ?? '');
			const witness = `${describeAnswer(path, response, body)} · entry ${JSON.stringify(entry)}`;

			// Measured: `shape` never appears in what either route asked for. Neither requests module function has a
			// shape parameter (`getAllDayPlans` takes `relations` only, requests/daily-plan.ts:14-31, and its own note
			// at :19-23 says the proxy route discards the incoming query string; `getPlansByTask` at :130-142 takes
			// taskId, organizationId, tenantId, organizationTeamId and bearer only), so `readResponseShape` is not
			// called by either handler (app/api/daily-plan/route.ts:36-47, app/api/daily-plan/task/[taskId]/route.ts:24-36).
			expect(response.status(), `the shaped read was not answered: ${witness}`).toBe(200);
			expect(
				pairs.filter(([key]) => key === 'shape'),
				`${read.label} now forwards a shape it did not: ${witness}`
			).toEqual([]);
			expect(pairs, `the query ${read.label} asks for changed: ${witness}`).toEqual(signedQuery(ids, read));
		}
	});

	// ---------------------------------------------------------------- 6. the tenant, and what this mock cannot tell

	test('every read carries the session tenant to the platform, as where[tenantId], for tenant A and for tenant B', async ({
		api,
		mock,
		ids
	}) => {
		for (const read of READS) {
			for (const scope of ['A', 'B'] as const) {
				const path = read.app(ids);
				const response = await api(path, { scope });
				const body = await response.text();
				const entry = asksFor(await mock.requests(), read.upstream(ids))[0];
				const pairs = queryPairs(entry?.query ?? '');
				const witness = `${describeAnswer(path, response, body)} · entry ${JSON.stringify(entry)}`;
				const expectedTenant = scope === 'A' ? ids.tenantA : ids.tenantB;

				expect(response.status(), `the scope-${scope} read was not answered: ${witness}`).toBe(200);
				// The tenant id the read carried is the one in `auth-tenant-id` (authenticated-guard-app.ts:63), and the
				// organization it carried moved with it (`auth-organization-id`, :64) — measured on this lane: scope B
				// reads carry `where[tenantId]=<tenantB>` and `where[organizationId]=<organizationB>`.
				expect(
					pairs.filter(([key]) => key.startsWith('where[')),
					`the scope-${scope} ${read.label} no longer carries its own tenant and organization: ${witness}`
				).toEqual([
					['where[organizationId]', scope === 'A' ? ids.organizationA : ids.organizationB],
					['where[tenantId]', expectedTenant],
					['where[organizationTeamId]', scope === 'A' ? ids.teamA : ids.teamB]
				]);
				await mockReset();
			}
		}
	});

	test('the tenant differential proves the QUERY carried the tenant, not the new tenant-id header — and this mock cannot tell the difference', async ({
		api,
		mock,
		ids
	}) => {
		// `drops` and `delays` are keyed on the tenant the mock resolved for the call (mock-gauzy-server.mjs:1017-1021
		// and :1044-1049), and that tenant comes from `?tenantId`, then `where[tenantId]`, then the `tenant-id` header
		// (:1013-1016). All four reads put `where[tenantId]` in the query (requests/daily-plan.ts:34, :72, :112, :145)
		// and none puts a top-level `tenantId` (measured in every recorded query above), so the mock decides the tenant
		// from the query and never looks at the header. Consequence, stated before it is pinned: an arm keyed on the
		// session's own tenant bites and an arm keyed on the other one does not, and that difference says only that the
		// query named tenant A. It cannot show whether the `tenant-id` header these four calls now pass
		// (requests/daily-plan.ts:50, :87, :126, :155 → the header at core/services/server/fetch.ts:95-97) was sent.
		// Measured as far as it goes: a direct, query-less call to the mock carrying only `tenant-id: <tenantB>` IS cut
		// by the same `<tenantB>:<path>` arm and answers 200 when unarmed (`E:\Coding\.tmp\dp-probe-2.txt`), so the
		// switch does read the header — these four reads simply never let it be consulted. Proving the header would
		// need a mock that resolves the tenant from the header first, or a `scenario` switch that reports the header it
		// received; neither exists in this checkout's mock, and nothing here claims the header.
		for (const read of READS) {
			const upstreamPath = read.upstream(ids);
			const arms = [
				{ key: `${ids.tenantA}:${upstreamPath}`, status: 502, mockStatus: 0, why: "the read's own tenant" },
				{ key: `${ids.tenantB}:${upstreamPath}`, status: 200, mockStatus: 200, why: 'the other tenant' }
			];

			for (const arm of arms) {
				await mockReset();
				await mock.scenario({ drops: { [arm.key]: 1 } });
				const response = await api(read.app(ids));
				const body = await response.text();
				const log = await mock.requests();
				const upstream = asksFor(log, upstreamPath);
				const witness = `arm ${arm.key} (${arm.why}) · ${describeAnswer(read.app(ids), response, body)} · log ${logOf(
					log
				)}`;

				expect(response.status(), `the ${read.label} tenant differential broke: ${witness}`).toBe(arm.status);
				expect(triples(upstream), `the call the ${read.label} recorded broke: ${witness}`).toEqual([
					`GET ${upstreamPath} ${arm.mockStatus}`
				]);
			}
		}
		await mockReset();
	});
});

// Every case from 3 on arms a scenario, and a scenario outlives a test unless the mock is reset: `setScenario`
// shallow-merges its payload (playwright/helpers.ts:115-118), so a payload that does not name `drops` leaves the
// previous arm armed and `delays` accumulate even when it does. The `mock` fixture resets before each test
// (playwright/api-fixtures.ts:51-65); this afterEach is what keeps an arm from being seen by anything the next spec
// in this lane runs.
test.afterEach(async () => {
	await mockReset();
});
