import type { APIResponse } from '@playwright/test';
import type { StubRequest } from '../../helpers';

import { expect, test, type ApiCall } from '../../api-fixtures';
import { APP_ORIGIN, mockReset } from '../../helpers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The contract of the 19 timer / timesheet route handlers that no other spec named, pinned on lane-b (app 3032, mock
 * 3996, control 3998) on 2026-11-23 in the runs `E:\Coding\.tmp\s2-lane-b-timer-1.log` and `s2-lane-b-timer-2.log`.
 * Every number, body, key list and header below is a measurement, taken first against the live lane with
 * `E:\Coding\.tmp\probe-timer\probe.mjs` .. `probe5.mjs` (readings in `measured.txt`, `m1.txt`, `m2.txt`, `m3.txt`,
 * `m4.txt`, `m5.txt`, `m6.txt` beside those scripts), and only then written down.
 *
 * ## The 19 routes and which half of the server code answers them
 *
 * Seven are one-line `forwardToGauzy` proxies (`app/api/timesheet/activity/route.ts:4`, `app/api/timesheet/status/
 * route.ts:4`, `…/time-log/conflict/route.ts:4`, `…/time-log/history/route.ts:5`, `…/time-log/project-budget-limit/
 * route.ts:4`, `…/time-log/report/owed-report/route.ts:4`, `…/time-log/time-limit/route.ts:4`). That helper fixes the
 * upstream path, hands on the caller's query string unchanged (`forward-to-gauzy.ts:112`), answers with Gauzy's status
 * and body (`:128-131`), writes its own 401 for a caller with no token cookie (`:96`), writes its own 502 when Gauzy
 * gave no answer at all (`failedUpstreamAnswer`, `:135-144`), and refuses a write that comes from another site before
 * anything is read (`refuseForeignWrite` at `:89`, with `same-origin-request.ts:48-53` as the answer).
 *
 * The other twelve are hand-written handlers over `core/services/server/requests/**` and `serverFetch`
 * (`core/services/server/fetch.ts`): they build their own upstream query (`qs` or `URLSearchParams`), authenticate
 * through `authenticatedGuard` (`guards/authenticated-guard-app.ts:55`), and each holds its own validation in front. Five
 * of the twelve now wrap their call in a `try` and answer the failure through `gauzyErrorResponse`, so they do relay a
 * Gauzy refusal: `app/api/timer/daily/route.ts:42-45`, `app/api/timer/slot/window/route.ts:35-38`, `app/api/timer/
 * status/worked/route.ts:27-30` and `:40-43`, `app/api/timer/timesheet/all-statistics-tasks/route.ts:22-25` and
 * `app/api/timer/timesheet/statistics-tasks/route.ts:55-58` — each catch carries the same comment, "A refusal of the API
 * goes back with its status and reason, as in direct mode (#5726)". The other seven answer the same refusal with
 * something of their own instead of Gauzy's answer: a 500 carrying their own sentence (finding 2), the bodyless 500 of
 * finding 1, or the 200 of finding 3 — which is what the armed cases below exist to show and what still separates this
 * file from `suites/lane-c/gauzy-refusals-relayed.spec.ts`.
 *
 * ## What every route was measured on
 *
 * One control (signed in, nothing armed), the same call signed out, one armed 403 on the route's own upstream path,
 * one cut (`drops`) call on that path, and the route's own missing-required-value case. Every case reads the mock's
 * request log (`playwright/api-fixtures.ts` `mock.requests()`), whose entries carry `method`, `path` and `query` and
 * nothing else (`mock-gauzy-server.mjs:1191-1199`) — so an upstream **path**, verb and query key list are provable, a
 * POST or PUT **body** is not, and where a body is the only carrier of the scoping (the two `POST
 * /api/timesheet/statistics/tasks` calls, `POST /api/timesheet/time-slot`, `PUT /api/timesheet/status` from the guard
 * route) the scoping is pinned with a tenant-keyed arm instead: `fails` is read as `<tenant>:<path>` first
 * (`mock-gauzy-server.mjs:1158-1163`) and the tenant is resolved from `?tenantId`, then from the `tenant-id` header
 * (`:1103-1106`), so an arm keyed `<session tenant>:<path>` fires only when that header travelled, and the same arm
 * keyed on the fixture's other tenant proves the arm is not simply matching the path. Neither is ever armed on
 * `/api/user/me` nor on a bare tenant key, for the reason `suites/lane-c/gauzy-refusals-relayed.spec.ts:35-38` gives:
 * both would refuse the guard rather than the route under test.
 *
 * ## The findings, stated up front (each one is pinned on the row it names, with `MEASURED, NOT INTENDED`)
 *
 * 1. **One route still answers an upstream refusal, or a cut call, with a 500 that has no body and no `content-type` at
 *   all**: `POST /api/timer/sync` (`app/api/timer/sync/route.ts:25`, whose write is `requests/timer.ts:129`). Its handler
 *   holds no `try`, so `serverFetch`'s rejection (`fetch.ts:122-132`) leaves the handler and Next answers its own empty
 *   500: Gauzy's 403 and Gauzy's body are both gone, and the client's re-authentication on a 401 cannot see one either.
 *   The same happens on a cut call. **Five more used to answer exactly that way and were fixed for it on develop
 *   (#5726)**, each now catching and answering through `gauzyErrorResponse`: `GET /api/timer/daily` (`app/api/timer/daily/
 *   route.ts:42-45`), `GET /api/timer/slot/window` (`app/api/timer/slot/window/route.ts:35-38`), `GET
 *   /api/timer/status/worked` (`app/api/timer/status/worked/route.ts:27-30` and `:40-43`), `GET
 *   /api/timer/timesheet/all-statistics-tasks` (`…/all-statistics-tasks/route.ts:22-25`) and `GET
 *   /api/timer/timesheet/statistics-tasks` (`…/statistics-tasks/route.ts:55-58`). Measured on all five: an armed 403 comes
 *   back as 403 with `{"statusCode":403,"message":"Synthetic Gauzy refusal (403)"}` and a cut call as 502 with the
 *   route's own sentence — "The activity of the day could not be read.", "The time slots could not be read.", "The last
 *   time worked could not be read." and, on both statistics routes, "The time worked on the tasks could not be read."
 *   (`gauzy-error-response.ts:24-37`), every one in this app's media type and with no `Cache-Control`. Those rows are what
 *   the code means to do, so they no longer carry `MEASURED, NOT INTENDED`.
 * 2. **Five of them turn a refusal into a 500 carrying their own sentence**, so the caller can neither see Gauzy's
 *   status nor its message: `GET /api/timer/timesheet/daily` (`app/api/timer/timesheet/daily/route.ts:32-34`), `GET
 *   /api/timesheet/statistics/counts` (`app/api/timesheet/statistics/counts/route.ts:86-88`), `GET
 *   /api/timesheet/time-log/report/daily-chart` (`app/api/timesheet/time-log/report/daily-chart/route.ts:86-88`),
 *   `GET /api/timesheet/time-log/report/weekly` (`app/api/timesheet/time-log/report/weekly/route.ts:58-60`) and `GET
 *   /api/timesheet/activity/report` (`app/api/timesheet/activity/report/route.ts:86-97`, which also reports
 *   `"error":"Unknown error"` because the thrown value is the rejected promise `fetch.ts:128` rather than an `Error`).
 * 3. **`PUT /api/timer/timesheet/status` answers 200 to everything**, because every exit of that handler goes through
 *   the guard's `$res`, which writes no status (`authenticated-guard-app.ts:118`): an upstream 403 is
 *   `200 {success:false, message:'Failed to update timesheet status'}` (`app/api/timer/timesheet/status/
 *   route.ts:59-64`), a cut call the same (`:59-64`), and each of its four validation refusals is a 200 too
 *   (`:21-23`, `:33-35`, `:40-42`). Its sibling `PUT /api/timesheet/status`, the `forwardToGauzy` one, answers the
 *   same upstream 403 as 403 with Gauzy's body — same upstream path, two opposite contracts.
 * 4. **`GET /api/timesheet/activity/report` reads the caller's `logType[]` and `source[]` and never sends them**: the
 *   route collects both (`app/api/timesheet/activity/report/route.ts:57-58,63-64`) and `getActivityReportRequest`
 *   builds the query with `buildTimeLogParams` (`core/services/server/requests/timesheet.ts:338-343`), which appends
 *   neither key (`:230-274`). Measured: a call carrying `logType[0]=TRACKED&logType[1]=IDLE&source=TEAMS&source=
 *   DESKTOP` reached `/api/timesheet/activity/report` with `organizationId, tenantId, startDate, endDate, shape` only.
 *   A report asked for one log type is therefore a report of all of them.
 * 5. **`GET /api/timer/timesheet/daily` asks its upstream path with a second `?` in it**: `getTaskTimesheetRequest`
 *   writes the path as `/timesheet/time-log?activityLevel?${query}` (`core/services/server/requests/
 *   timesheet.ts:75`), so the mock records a query whose first key is the pair `activityLevel?tenantId` — the marker
 *   `activityLevel` is glued to the first parameter instead of being one of its own.
 * 6. **`GET /api/timesheet/time-log/report/weekly` forwards the literal text `undefined`** for its two scoping ids
 *   when the session carries none: the values come from the guard (`app/api/timesheet/time-log/report/weekly/
 *   route.ts:31`) and go through `new URLSearchParams({...})` (`requests/timesheet.ts:231-237`), which stringifies
 *   `undefined`. Signed out, the call left as `organizationId=undefined&tenantId=undefined`.
 * 7. **A signed-out caller is answered by the twelve guarded routes as if they knew who they were** — the guard
 *   delegates that decision to the API (`authenticated-guard-app.ts:76`) and this mock answers `GET /api/user/me`
 *   whatever arrives (`mock-gauzy-server.mjs:607`). Already pinned as a limitation in
 *   `suites/lane-c/session-check.spec.ts`; here it is pinned per route only for what it does to the *scoping*: the
 *   session keys vanish from the upstream query (or turn into `undefined`, finding 6) while the ids the caller sent
 *   stay. The seven `forwardToGauzy` routes are the opposite: 401 from this app, and the mock logged nothing at all.
 *
 * ## What is not here, and why
 *
 * - `POST /api/timer/sync`'s own status read is deliberately tolerant: a failed `GET /api/timesheet/timer/status`
 *   after a successful write answers **200 with `null`** (`app/api/timer/sync/route.ts:41-49`, whose comment says a
 *   failed read must not fail the sync or the retry would credit the interval twice). Pinned, intended.
 * - Three branches are unreachable from this mock and are therefore not faked: the two `if (!employeeId) return
 *   $res([])` exits (`app/api/timer/slot/window/route.ts:23`, `app/api/timer/status/worked/route.ts:35`) and the `if
 *   (!data) → 404` of `app/api/timer/timesheet/daily/route.ts:26-29`. The mock's `/api/user/me` always carries an
 *   `employee` (`mock-gauzy-server.mjs:155`, `baseUser.employee`) and its `/api/timesheet/time-log` handler answers
 *   `[]` for a GET (`:798-801`), which is truthy.
 * - `504` (a 60 s upstream timeout) is not reachable from a test: `UPSTREAM_TIMEOUT_MS` is 60 000 ms
 *   (`forward-to-gauzy.ts:8`), the same budget `playwright/api-fixtures.ts` gives the caller — see the note at the top
 *   of `suites/lane-b/download-outage.spec.ts`.
 * - A verb a route file does not export never reaches these handlers (Next answers 405 itself): pinned in
 *   `suites/lane-b/verify-status.spec.ts`, not repeated here.
 * - `GET /api/timesheet/time-log/report/daily` and the `POST /api/timesheet/timer/*` family already have their own
 *   specs (`suites/lane-a/gauzy-refusals.spec.ts`, `suites/lane-c/timer-stop-restart.spec.ts`); this file names only
 *   the routes the brief lists.
 *
 * ## Cost
 *
 * 149 cases, all browser-free, one worker, one mock: 19 routes × (control + signed out + armed 403 + cut) = 76; 46
 * validation and value-passthrough cases; 3 writes × (3 foreign-site header cases + 3 own-site header cases) plus 1
 * read that must not be refused = 19; 4 tenant-keyed arm pairs = 8.
 */

/** The dates the control calls send; `2026-11-01` parses to this instant, which is what the two `Date` routes forward. */
const START_DAY = '2026-11-01';
const END_DAY = '2026-11-20';
const START_ISO = '2026-11-01T00:00:00.000Z';
const END_ISO = '2026-11-20T00:00:00.000Z';

/** Two ids of this file's own, for the routes that take an id list: no fixture record stands behind them. */
const PROBE_IDS = ['lane-b-timesheet-id-1', 'lane-b-timesheet-id-2'];
const PROBE_TIME_LOG_ID = 'lane-b-timesheet-probe-log';

/** The one refusal status this file arms: what a role that may not do the thing gets in production. */
const REFUSAL = 403;

/** The mock's refusal body (`mock-gauzy-server.mjs:1168-1169`). */
const gauzyRefusal = (status: number) => ({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });

/** The media type the mock writes on every answer it makes (`mock-gauzy-server.mjs:1218`), which `forwardToGauzy` copies. */
const UPSTREAM_MEDIA_TYPE = 'application/json; charset=utf-8';
/** The media type of an answer this app wrote itself (`NextResponse.json`, and the hand-built `new Response`). */
const OWN_MEDIA_TYPE = 'application/json';

/** The upstream paths, spelled as the mock records them: `GAUZY_API_SERVER_URL` is the base plus `/api`. */
const UP = {
	activityDaily: '/api/timesheet/activity/daily',
	timeSlot: '/api/timesheet/time-slot',
	timerStatus: '/api/timesheet/timer/status',
	timerWorked: '/api/timesheet/timer/status/worked',
	statisticsTasks: '/api/timesheet/statistics/tasks',
	timeLog: '/api/timesheet/time-log',
	timesheetStatus: '/api/timesheet/status',
	activity: '/api/timesheet/activity',
	activityReport: '/api/timesheet/activity/report',
	counts: '/api/timesheet/statistics/counts',
	conflict: '/api/timesheet/time-log/conflict',
	history: '/api/timesheet/time-log/history',
	budgetLimit: '/api/timesheet/time-log/project-budget-limit',
	dailyChart: '/api/timesheet/time-log/report/daily-chart',
	owedReport: '/api/timesheet/time-log/report/owed-report',
	weeklyReport: '/api/timesheet/time-log/report/weekly',
	timeLimit: '/api/timesheet/time-log/time-limit'
};

/** One upstream call a route makes, and what its query must look like. */
type Ask = {
	method: 'GET' | 'POST' | 'PUT';
	path: string;
	/** The query keys the mock recorded, sorted — a renamed key or a dropped scoping key turns this red. */
	keys: string[];
	/** Keys that must NOT be there (a filter the request builder loses, a tenant sent only as a header). */
	absent?: string[];
	/** The values that must arrive under these keys, where the value is the point (session ids, caller ids, dates). */
	values?: Record<string, string>;
	/** The status the mock recorded for this one call, when it differs from the case's other calls — a route whose
	 * first call answered 200 and whose second was cut or armed says two different statuses in one log. */
	status?: number;
};

/** One measured answer. `body`, `text` and `shape` are alternatives; `contentType` / `cacheControl` are measured too. */
type Answer = {
	status: number;
	/** The parsed JSON body, when the answer is JSON of a known shape. */
	body?: unknown;
	/** The answer as text, when its exact bytes or its emptiness are the point. */
	text?: string;
	/** A predicate: `null` when the body matches, a sentence saying why when it does not. */
	shape?: (body: unknown) => string | null;
	/** The `content-type`, or `null` for "carries none at all" — which half answered is readable from this. */
	contentType?: string | null;
	/** The `cache-control`, or `null` for "carries none". */
	cacheControl?: string | null;
};

/** A measured answer, or the same answer once the fixture's ids are known (a body that echoes them). */
type WithIds<T> = T | ((ids: Record<string, string>) => T);
const resolve = <T>(value: WithIds<T>, ids: Record<string, string>): T =>
	typeof value === 'function' ? (value as (withIds: Record<string, string>) => T)(ids) : value;

type ContractRoute = {
	label: string;
	/** The verb the route file exports. */
	method: 'GET' | 'POST' | 'PUT';
	/** Which half of the server code answers it, which is what the media type of the answer proves. */
	half: 'forwardToGauzy' | 'guard';
	/** The app route, spelled as `api()` is called with it, including the control's query string. */
	app: (ids: Record<string, string>) => string;
	/** The JSON body a write carries. */
	body?: (ids: Record<string, string>) => unknown;
	/** The upstream calls the control causes, in the order the mock recorded them. */
	asks: (ids: Record<string, string>) => Ask[];
	control: WithIds<Answer>;
	/** The same call with no session cookies: `asks` here is what survived it. */
	signedOut: WithIds<Answer & { asks: (ids: Record<string, string>) => Ask[] }>;
	/** Armed `fails: { <first ask's path>: 403 }`. */
	refusal: WithIds<Answer>;
	/** Armed `drops: { <first ask's path>: 1 }`. */
	drop: WithIds<Answer>;
	/** A row that says what was measured rather than what the code means to do. */
	notIntended?: string;
};

/** The mock's entry for one path, or `undefined` when the mock was never asked. */
const asksFor = (requests: StubRequest[], path: string): StubRequest[] =>
	requests.filter((request) => request.path === path);

/** The query keys one recorded call carried, sorted and de-duplicated. Typed on `query` alone, because `lineOf` has to
 * pass it an entry it narrowed to the four keys a log line needs. */
const keysOf = (request: { query: string }): string[] =>
	[...new Set([...new URLSearchParams(request.query).keys()])].sort();

/** The values one recorded call carried under the keys that matter, as one object for one assertion. */
const valuesOf = (request: StubRequest, wanted: Record<string, string>) => {
	const params = new URLSearchParams(request.query);
	return Object.fromEntries(
		Object.keys(wanted)
			.sort()
			.map((key) => [key, params.get(key) ?? null])
	);
};

const wantedValues = (wanted: Record<string, string>) =>
	Object.fromEntries(Object.entries(wanted).sort(([a], [b]) => a.localeCompare(b)));

/** One recorded call as the line a failure message quotes: `GET /api/x 200 keys=[a,b]`. */
const lineOf = (request: { method: string; path: string; status: number; query: string }): string =>
	`${request.method} ${request.path} ${request.status} keys=[${keysOf(request).join(',')}]`;

const expectedLine = (ask: Ask, status: number): string =>
	`${ask.method} ${ask.path} ${status} keys=[${[...ask.keys].sort().join(',')}]`;

const describeAnswer = (path: string, response: APIResponse, body: string): string =>
	`${path} -> ${response.status()} · content-type ${JSON.stringify(
		response.headers()['content-type'] ?? null
	)} · cache-control ${JSON.stringify(response.headers()['cache-control'] ?? null)} · body(${body.length}) ` +
	`${JSON.stringify(body.slice(0, 180))}`;

/** The witness every assertion below ends with: this app's answer and the whole mock log. */
const witnessOf = (
	path: string,
	response: APIResponse,
	body: string,
	log: StubRequest[],
	askedPaths: string[]
): string => {
	const asked = log.filter((request) => askedPaths.includes(request.path));
	return `${describeAnswer(path, response, body)} · asked ${JSON.stringify(
		asked.map((request) => lineOf(request))
	)} · full log ${logOf(log)}`;
};

/** The session cookies of the fixture person, with one named cookie left out. */
type CookieComposer = (scope: 'A' | 'B', without?: readonly string[]) => string;

/** One `api()` call for a table row, with the optional overrides the extra cases need. */
type CallOverride = {
	path?: string;
	method?: 'GET' | 'POST' | 'PUT';
	body?: unknown;
	headers?: Record<string, string>;
	anonymous?: boolean;
	/** Build the session from the fixture's cookies minus this one name: a session missing exactly one thing. */
	cookieWithout?: string;
};

async function callRoute(
	api: ApiCall,
	cookies: CookieComposer,
	route: ContractRoute,
	ids: Record<string, string>,
	override: CallOverride = {}
): Promise<{ response: APIResponse; text: string; path: string }> {
	const path = override.path ?? route.app(ids);
	const method = override.method ?? route.method;
	const body = override.body !== undefined ? override.body : route.body ? route.body(ids) : undefined;
	const headers: Record<string, string> = { ...(override.headers ?? {}) };
	if (override.cookieWithout) headers.cookie = cookies('A', [override.cookieWithout]);

	const response = await api(path, {
		method,
		...(body === undefined ? {} : { body }),
		...(override.anonymous ? { anonymous: true } : {}),
		...(Object.keys(headers).length ? { headers } : {})
	});
	return { response, text: await response.text(), path };
}

/** The assertions every case shares: the upstream asks, their scoping values, and the answer this route gave. */
function expectRouteAnswer(
	asked: Ask[],
	/** The status the mock recorded for every ask of this case: 200, an armed 403, or the drop's 0. */
	askedStatus: number,
	response: APIResponse,
	text: string,
	path: string,
	log: StubRequest[],
	answer: Answer,
	why: string
) {
	const witness = witnessOf(
		path,
		response,
		text,
		log,
		asked.map((ask) => ask.path)
	);
	const parsed = parseAnswer(text);

	expect(response.status(), `${why}: the answer moved off ${answer.status} — ${witness}`).toBe(answer.status);

	if (answer.body !== undefined) {
		expect(
			parsed,
			`${why}: the answer body is no longer what this route answers (${JSON.stringify(answer.body)} vs ` +
				`${JSON.stringify((parsed as { unparsed?: string } | null)?.unparsed ?? parsed).slice(0, 220)}) — ` +
				`${witness}`
		).toEqual(answer.body);
	}
	if (answer.text !== undefined) {
		expect(
			text,
			`${why}: the answer is no longer ${JSON.stringify(answer.text)} (${JSON.stringify(text.slice(0, 180))}) — ` +
				`${witness}`
		).toBe(answer.text);
	}
	if (answer.shape) {
		const mismatch = answer.shape(parsed);
		expect(mismatch, `${why}: the answer body no longer has the shape this route answers — ${witness}`).toBeNull();
	}
	if (answer.contentType !== undefined) {
		expect(
			response.headers()['content-type'] ?? null,
			`${why}: the media type moved off ${JSON.stringify(answer.contentType)} — ${witness}. It is what says which ` +
				'half answered: an answer this app wrote carries application/json, a copied upstream answer carries the mock media type'
		).toBe(answer.contentType);
	}
	if (answer.cacheControl !== undefined) {
		expect(
			response.headers()['cache-control'] ?? null,
			`${why}: Cache-Control moved off ${JSON.stringify(answer.cacheControl)} — ${witness}`
		).toBe(answer.cacheControl);
	}

	// Every expected ask, grouped by path, against the entries the mock recorded for that same path: verb, path,
	// status and the sorted query keys. A renamed path, a dropped verb, a lost scoping key or an extra ask all red.
	const expected = new Map<string, string[]>();
	for (const ask of asked)
		expected.set(ask.path, [...(expected.get(ask.path) ?? []), expectedLine(ask, ask.status ?? askedStatus)]);
	const recorded = new Map<string, string[]>();
	for (const askPath of expected.keys()) {
		recorded.set(
			askPath,
			asksFor(log, askPath).map((entry) => lineOf(entry))
		);
	}
	expect(
		[...expected.keys()].map((askPath) => `${askPath} :: ${recorded.get(askPath)?.join(' + ') ?? 'nothing'}`),
		`${why}: the upstream calls are no longer the ones this route makes — ${witness}`
	).toEqual([...expected.keys()].map((askPath) => `${askPath} :: ${(expected.get(askPath) ?? []).join(' + ')}`));

	// Nothing else was asked. `GET /api/user/me` is excepted on purpose: the session check answers are reused per
	// token for `SESSION_CHECK_MEMO_TTL_MS` (`guards/authenticated-guard-app.ts:29`, `session-check-memo.ts`), so
	// whether that read lands in this log depends on what ran seconds earlier — never on the route under test.
	const stray = log.filter((request) => request.path !== GUARD_CHECK && !expected.has(request.path));
	expect(
		triples(stray),
		`${why}: the case asked something besides the calls this route is pinned on — ${witness}`
	).toEqual([]);

	for (const ask of asked) {
		const entry = asksFor(log, ask.path)[0];
		if (!entry) continue;
		if (ask.absent?.length) {
			const present = keysOf(entry).filter((key) => ask.absent?.includes(key));
			expect(
				present,
				`${why}: ${ask.path} was asked with ${JSON.stringify(present)}, which this route is measured not to ` +
					`send — ${witness}`
			).toEqual([]);
		}
		if (ask.values) {
			expect(
				valuesOf(entry, ask.values),
				`${why}: the scoping values that reached ${ask.path} moved — ${witness}`
			).toEqual(wantedValues(ask.values));
		}
	}
}

/** `POST /api/timer/sync` answers the mock's timer status, whose timestamps change on every read. */
const timerStatusShape = (body: unknown): string | null => {
	const status = body as { duration?: unknown; running?: unknown; lastLog?: unknown } | null;
	if (!status || typeof status !== 'object') return `the answer is not an object: ${JSON.stringify(body)}`;
	if (typeof status.running !== 'boolean') return `no boolean "running": ${JSON.stringify(Object.keys(status))}`;
	if (typeof status.duration !== 'number') return `no number "duration": ${JSON.stringify(Object.keys(status))}`;
	if (!status.lastLog || typeof status.lastLog !== 'object') {
		return `no "lastLog" object: ${JSON.stringify(Object.keys(status))}`;
	}
	return null;
};

/** A 500 with no body and no media type at all: what Next answers when a handler throws (finding 1). */
const THROWN_ERROR: Answer = { status: 500, text: '', contentType: null };

/** What `forwardToGauzy` answers a caller with no token cookie, before anything is asked (`:96`). */
const REFUSED_BY_THIS_APP: Answer = {
	status: 401,
	body: { statusCode: 401, message: 'Unauthorized' },
	contentType: OWN_MEDIA_TYPE
};

/** What `forwardToGauzy` answers when the upstream gave no answer at all (`:135-144`). */
const UNREACHABLE: Answer = {
	status: 502,
	body: { statusCode: 502, message: 'The Gauzy API is unreachable' },
	contentType: OWN_MEDIA_TYPE
};

/** What `forwardToGauzy` hands on: Gauzy's status, Gauzy's body, the mock's media type, and no `Cache-Control` —
 * none of the seven routes here passed `{ noStore: true }` (`forward-to-gauzy.ts:22-28`). */
const relayed = (status: number): Answer => ({
	status,
	body: gauzyRefusal(status),
	contentType: UPSTREAM_MEDIA_TYPE,
	cacheControl: null
});

/** An answer this app wrote itself: JSON on `status`, with this app's own media type. */
const ownJson = (status: number, body: unknown): Answer => ({ status, body, contentType: OWN_MEDIA_TYPE });

/** A Gauzy refusal that a route's own `catch` handed to `gauzyErrorResponse`: Gauzy's status and body as they stand,
 * written by `NextResponse.json`, so in this app's media type and with no `Cache-Control`
 * (`core/services/server/gauzy-error-response.ts:31-37`). */
const relayedThroughCatch = (status: number): Answer => ownJson(status, gauzyRefusal(status));

/** What that same `catch` answers when Gauzy gave nothing readable at all: 502 and the route's own sentence
 * (`gauzy-error-response.ts:24-29`). */
const noUpstreamAnswer = (sentence: string): Answer => ownJson(502, { message: sentence });

/** The session check every guarded route runs first (`authenticated-guard-app.ts:76`), excepted from every log claim. */
const GUARD_CHECK = '/api/user/me';

/** The empty page this mock answers an unhandled GET with (`mock-gauzy-server.mjs:895`). */
const MOCK_PAGE = { items: [], total: 0 };
/** The plain list this mock answers its timesheet list handlers with (`mock-gauzy-server.mjs:798-817`). */
const MOCK_LIST: unknown[] = [];

const ROUTES: ContractRoute[] = [
	{
		label: 'GET /api/timer/daily',
		method: 'GET',
		half: 'guard',
		// The caller's own ids and dates: `employeeIds[0]` overrules the session member, `type` becomes `types[0]`
		app: (ids) =>
			`/api/timer/daily?startDate=${START_DAY}&endDate=${END_DAY}&employeeIds[0]=${ids.teammateEmployee}&type=MANUAL&title[0]=lane-b-title`,
		asks: (ids) => [
			{
				// core/services/server/requests/timer/daily.ts:41
				method: 'GET',
				path: UP.activityDaily,
				keys: [
					'activityLevel[end]',
					'activityLevel[start]',
					'employeeIds[0]',
					'endDate',
					'organizationId',
					'startDate',
					'title[0]',
					'tenantId',
					'types[0]'
				],
				values: {
					tenantId: ids.tenantA,
					organizationId: ids.organizationA,
					'employeeIds[0]': ids.teammateEmployee,
					startDate: START_ISO,
					endDate: END_ISO,
					'types[0]': 'MANUAL',
					'title[0]': 'lane-b-title',
					'activityLevel[start]': '0',
					'activityLevel[end]': '100'
				}
			}
		],
		control: ownJson(200, MOCK_PAGE),
		// Finding 7: the guard delegated, so the read went out with the ids the caller sent and the session ids gone.
		signedOut: {
			...ownJson(200, MOCK_PAGE),
			asks: (ids) => [
				{
					method: 'GET',
					path: UP.activityDaily,
					keys: [
						'activityLevel[end]',
						'activityLevel[start]',
						'employeeIds[0]',
						'endDate',
						'startDate',
						'title[0]',
						'types[0]'
					],
					absent: ['tenantId', 'organizationId'],
					// Everything the caller itself named survived; only the session's tenant and organization are gone.
					values: { 'employeeIds[0]': ids.teammateEmployee, 'types[0]': 'MANUAL', 'title[0]': 'lane-b-title' }
				}
			]
		},
		// `route.ts:42-45` catches and answers `gauzyErrorResponse`: the 403 keeps Gauzy's status and body, the cut call
		// gets this route's own sentence on a 502
		refusal: relayedThroughCatch(REFUSAL),
		drop: noUpstreamAnswer('The activity of the day could not be read.')
	},
	{
		label: 'GET /api/timer/slot/window',
		method: 'GET',
		half: 'guard',
		// A caller asking for a teammate's slots is not answered one: `employeeId` here comes from the session only
		app: (ids) =>
			`/api/timer/slot/window?startDate=${START_ISO}&endDate=${END_ISO}&employeeIds[0]=${ids.teammateEmployee}`,
		asks: (ids) => [
			{
				// core/services/server/requests/timer/timer-slot.ts:83
				method: 'GET',
				path: UP.timeSlot,
				keys: ['employeeIds[0]', 'endDate', 'organizationId', 'startDate', 'tenantId'],
				values: {
					tenantId: ids.tenantA,
					organizationId: ids.organizationA,
					// the session employee, not the teammate the caller named
					'employeeIds[0]': ids.employee,
					startDate: START_ISO,
					endDate: END_ISO
				}
			}
		],
		control: ownJson(200, { success: true }),
		signedOut: {
			...ownJson(200, { success: true }),
			asks: () => [
				{
					method: 'GET',
					path: UP.timeSlot,
					keys: ['employeeIds[0]', 'endDate', 'startDate'],
					absent: ['tenantId', 'organizationId']
				}
			]
		},
		// `route.ts:35-38` catches: the same relay, and this route's own sentence on a cut call
		refusal: relayedThroughCatch(REFUSAL),
		drop: noUpstreamAnswer('The time slots could not be read.')
	},
	{
		label: 'GET /api/timer/status/worked',
		method: 'GET',
		half: 'guard',
		// A caller-sent `employeeId` is not a filter this route reads; only the indexed form is (route.ts:6-14)
		app: (ids) => `/api/timer/status/worked?employeeId=${ids.teammateEmployee}`,
		asks: (ids) => [
			{
				// core/services/server/requests/timer.ts:45
				method: 'GET',
				path: UP.timerWorked,
				keys: ['employeeId', 'organizationId', 'tenantId'],
				values: {
					tenantId: ids.tenantA,
					organizationId: ids.organizationA,
					employeeId: ids.employee
				}
			}
		],
		control: ownJson(200, MOCK_PAGE),
		signedOut: {
			...ownJson(200, MOCK_PAGE),
			asks: () => [
				{ method: 'GET', path: UP.timerWorked, keys: ['employeeId'], absent: ['tenantId', 'organizationId'] }
			]
		},
		// `route.ts:27-30` (teammate ids) and `:40-43` (the session member) both catch and relay
		refusal: relayedThroughCatch(REFUSAL),
		drop: noUpstreamAnswer('The last time worked could not be read.')
	},
	{
		label: 'POST /api/timer/sync',
		method: 'POST',
		half: 'guard',
		app: () => `/api/timer/sync?todayStart=${START_ISO}&todayEnd=${END_ISO}`,
		body: () => ({
			source: 'TEAMS',
			duration: 37,
			startedAt: START_ISO,
			timeLogId: PROBE_TIME_LOG_ID
		}),
		asks: (ids) => [
			{
				// core/services/server/requests/timer.ts:129 — the write carries its scoping in the body, which the log
				// never shows, so the tenant is pinned with a tenant-keyed arm below instead
				method: 'POST',
				path: UP.timeSlot,
				keys: []
			},
			{
				// core/services/server/requests/timer.ts:26 with readTodayRange's two keys
				method: 'GET',
				path: UP.timerStatus,
				keys: ['organizationId', 'tenantId', 'todayEnd', 'todayStart'],
				values: {
					tenantId: ids.tenantA,
					organizationId: ids.organizationA,
					todayStart: START_ISO,
					todayEnd: END_ISO
				}
			}
		],
		control: { status: 200, shape: timerStatusShape, contentType: OWN_MEDIA_TYPE },
		signedOut: {
			status: 200,
			shape: timerStatusShape,
			contentType: OWN_MEDIA_TYPE,
			asks: () => [
				{ method: 'POST', path: UP.timeSlot, keys: [] },
				{
					method: 'GET',
					path: UP.timerStatus,
					keys: ['todayEnd', 'todayStart'],
					absent: ['tenantId', 'organizationId']
				}
			]
		},
		refusal: THROWN_ERROR,
		drop: THROWN_ERROR,
		notIntended:
			'the write itself answers 500 with no body and no media type when its upstream refused or was cut (finding 1)'
	},
	{
		label: 'GET /api/timer/timesheet/all-statistics-tasks',
		method: 'GET',
		half: 'guard',
		app: () => '/api/timer/timesheet/all-statistics-tasks',
		asks: () => [
			{
				// core/services/server/requests/timesheet.ts:29 — a POST whose whole payload is the body (`{tenantId,
				// organizationId, employeeIds: [], defaultRange: 'false'}`, app/api/timer/timesheet/all-statistics-tasks/
				// route.ts:12-20), invisible in the log: the tenant-keyed arm below pins its tenant instead
				method: 'POST',
				path: UP.statisticsTasks,
				keys: []
			}
		],
		control: ownJson(200, MOCK_LIST),
		signedOut: { ...ownJson(200, MOCK_LIST), asks: () => [{ method: 'POST', path: UP.statisticsTasks, keys: [] }] },
		// `route.ts:22-25` catches: the relayed 403, and this route's sentence on a 502
		refusal: relayedThroughCatch(REFUSAL),
		drop: noUpstreamAnswer('The time worked on the tasks could not be read.')
	},
	{
		label: 'GET /api/timer/timesheet/daily',
		method: 'GET',
		half: 'guard',
		app: () => `/api/timer/timesheet/daily?startDate=${START_DAY}&endDate=${END_DAY}`,
		asks: (ids) => [
			{
				// Finding 5: `requests/timesheet.ts:75` joins the query onto the path with a second `?`, so the first
				// recorded key is the pair `activityLevel?tenantId` rather than `tenantId` plus an `activityLevel`
				method: 'GET',
				path: UP.timeLog,
				keys: ['activityLevel?tenantId', 'endDate', 'organizationId', 'startDate'],
				values: {
					'activityLevel?tenantId': ids.tenantA,
					organizationId: ids.organizationA,
					startDate: START_DAY,
					endDate: END_DAY
				}
			}
		],
		control: ownJson(200, MOCK_LIST),
		signedOut: {
			...ownJson(200, MOCK_LIST),
			asks: () => [
				{
					method: 'GET',
					path: UP.timeLog,
					keys: ['activityLevel?startDate', 'endDate'],
					absent: ['tenantId', 'organizationId']
				}
			]
		},
		// Finding 2: its own catch (`route.ts:32-34`) answers Gauzy's 403 with a 500 and this route's sentence
		refusal: ownJson(500, { error: 'Failed to fetch timesheet data' }),
		drop: ownJson(500, { error: 'Failed to fetch timesheet data' }),
		notIntended: "an upstream 403 answers 500 with this app's own sentence; Gauzy's status and body are gone"
	},
	{
		label: 'GET /api/timer/timesheet/statistics-tasks',
		method: 'GET',
		half: 'guard',
		app: () => '/api/timer/timesheet/statistics-tasks',
		asks: () => [
			// The same POST twice: all time (`defaultRange: 'false'`) and today (`'true'`), `route.ts:26-49`
			{ method: 'POST', path: UP.statisticsTasks, keys: [] },
			{ method: 'POST', path: UP.statisticsTasks, keys: [] }
		],
		control: ownJson(200, { global: [], today: [] }),
		signedOut: {
			...ownJson(200, { global: [], today: [] }),
			asks: () => [
				{ method: 'POST', path: UP.statisticsTasks, keys: [] },
				{ method: 'POST', path: UP.statisticsTasks, keys: [] }
			]
		},
		// `route.ts:55-58` catches both POSTs: the first refused one ends the route, so only one call is ever asked
		refusal: relayedThroughCatch(REFUSAL),
		drop: noUpstreamAnswer('The time worked on the tasks could not be read.')
	},
	{
		label: 'PUT /api/timer/timesheet/status',
		method: 'PUT',
		half: 'guard',
		app: () => `/api/timer/timesheet/status?ids=${encodeURIComponent(JSON.stringify(PROBE_IDS))}&status=approved`,
		asks: () => [
			{
				// core/services/server/requests/timesheet.ts:100: a PUT whose ids, status, tenant and organization are
				// all in the body (`route.ts:45-53`), so the answer's echo of them is the witness
				method: 'PUT',
				path: UP.timesheetStatus,
				keys: []
			}
		],
		// The mock echoes the body it was sent (`mock-gauzy-server.mjs:894`), so this answer is the witness of what
		// `route.ts:45-53` put in the write: the caller's ids, unchanged, and the session's two scoping ids
		control: (ids) =>
			ownJson(200, {
				success: true,
				data: { ids: PROBE_IDS, organizationId: ids.organizationA, status: 'approved', tenantId: ids.tenantA }
			}),
		signedOut: {
			// `route.ts:49-51` coerces the missing session ids to empty strings, and the write still went out
			...ownJson(200, {
				success: true,
				data: { ids: PROBE_IDS, organizationId: '', status: 'approved', tenantId: '' }
			}),
			asks: () => [{ method: 'PUT', path: UP.timesheetStatus, keys: [] }]
		},
		// Finding 3: every exit answers through `$res`, which writes no status
		refusal: ownJson(200, { success: false, message: 'Failed to update timesheet status' }),
		drop: ownJson(200, { success: false, message: 'Failed to update timesheet status' }),
		notIntended:
			'an upstream 403 and a cut call are both answered 200 with {success:false} — the same upstream path answers 403 on PUT /api/timesheet/status'
	},
	{
		label: 'GET /api/timesheet/activity/report',
		method: 'GET',
		half: 'guard',
		app: (ids) =>
			`/api/timesheet/activity/report?tenantId=${ids.tenantA}&organizationId=${ids.organizationA}` +
			`&startDate=${START_DAY}&endDate=${END_DAY}&timeZone=UTC&groupBy=project&shape=lean` +
			`&projectIds[0]=${ids.project}&employeeIds[0]=${ids.employee}&source=TEAMS&logType[0]=TRACKED` +
			`&activityLevel[start]=10&activityLevel[end]=90`,
		asks: (ids) => [
			{
				// core/services/server/requests/timesheet.ts:338-343 with buildTimeLogParams (`:230-274`)
				method: 'GET',
				path: UP.activityReport,
				keys: [
					'activityLevel[end]',
					'activityLevel[start]',
					'employeeIds[0]',
					'endDate',
					'groupBy',
					'organizationId',
					'projectIds[0]',
					'shape',
					'startDate',
					'tenantId',
					'timeZone'
				],
				// Finding 4: the caller's log types and sources never leave this app
				absent: ['logType[0]', 'source'],
				values: {
					tenantId: ids.tenantA,
					organizationId: ids.organizationA,
					startDate: START_DAY,
					endDate: END_DAY,
					timeZone: 'UTC',
					groupBy: 'project',
					shape: 'lean',
					'projectIds[0]': ids.project,
					'employeeIds[0]': ids.employee,
					'activityLevel[start]': '10',
					'activityLevel[end]': '90'
				}
			}
		],
		control: ownJson(200, MOCK_PAGE),
		// Both scoping ids came from the caller's query here, not from the session, so nothing was lost
		signedOut: {
			...ownJson(200, MOCK_PAGE),
			asks: (ids) => [
				{
					method: 'GET',
					path: UP.activityReport,
					keys: [
						'activityLevel[end]',
						'activityLevel[start]',
						'employeeIds[0]',
						'endDate',
						'groupBy',
						'organizationId',
						'projectIds[0]',
						'shape',
						'startDate',
						'tenantId',
						'timeZone'
					],
					values: { tenantId: ids.tenantA, organizationId: ids.organizationA }
				}
			]
		},
		// Finding 2, and the `"error":"Unknown error"` half of it: the thrown value is `Promise.reject(body)`
		refusal: ownJson(500, { message: 'Internal server error', error: 'Unknown error' }),
		drop: ownJson(500, { message: 'Internal server error', error: 'fetch failed' }),
		notIntended:
			'an upstream 403 answers 500 {message:"Internal server error",error:"Unknown error"}; the caller\'s logType[] and source[] are dropped on the way out'
	},
	{
		label: 'GET /api/timesheet/activity',
		method: 'GET',
		half: 'forwardToGauzy',
		app: (ids) =>
			`/api/timesheet/activity?tenantId=${ids.tenantA}&organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}`,
		asks: (ids) => [
			{
				// forward-to-gauzy.ts:112 hands the caller's query on unchanged: no re-encoding, no defaults added
				method: 'GET',
				path: UP.activity,
				keys: ['endDate', 'organizationId', 'startDate', 'tenantId'],
				values: {
					tenantId: ids.tenantA,
					organizationId: ids.organizationA,
					startDate: START_DAY,
					endDate: END_DAY
				}
			}
		],
		control: { status: 200, body: MOCK_LIST, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null },
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] },
		refusal: relayed(REFUSAL),
		drop: UNREACHABLE
	},
	{
		label: 'GET /api/timesheet/statistics/counts',
		method: 'GET',
		half: 'guard',
		app: (ids) =>
			`/api/timesheet/statistics/counts?tenantId=${ids.tenantA}&organizationId=${ids.organizationA}` +
			`&startDate=${START_DAY}&endDate=${END_DAY}&timeZone=UTC&logType[0]=TRACKED&logType[1]=MANUAL` +
			`&employeeIds[0]=${ids.employee}&projectIds[0]=${ids.project}&teamIds[0]=${ids.teamA}` +
			`&activityLevel[start]=5&activityLevel[end]=95`,
		asks: (ids) => [
			{
				// core/services/server/requests/timesheet.ts:223: `tenantId` is destructured out of the query and sent
				// as the `tenant-id` header instead (`fetch.ts:88-90`), which is what the tenant-keyed arms below prove
				method: 'GET',
				path: UP.counts,
				keys: [
					'activityLevel[end]',
					'activityLevel[start]',
					'employeeIds[0]',
					'endDate',
					'logType[0]',
					'logType[1]',
					'organizationId',
					'projectIds[0]',
					'startDate',
					'teamIds[0]',
					'timeZone'
				],
				absent: ['tenantId'],
				values: {
					organizationId: ids.organizationA,
					startDate: START_DAY,
					endDate: END_DAY,
					timeZone: 'UTC',
					'logType[0]': 'TRACKED',
					'logType[1]': 'MANUAL',
					'employeeIds[0]': ids.employee,
					'projectIds[0]': ids.project,
					'teamIds[0]': ids.teamA,
					'activityLevel[start]': '5',
					'activityLevel[end]': '95'
				}
			}
		],
		control: ownJson(200, { today: 0, week: 0, month: 0 }),
		signedOut: {
			...ownJson(200, { today: 0, week: 0, month: 0 }),
			// Every key here came from the caller's query, so nothing is lost; `tenantId` was never a query key at all
			// on this path — it travels in the `tenant-id` header, which the log cannot show (the tenant-keyed arms
			// below are what pin it)
			asks: (ids) => [
				{
					method: 'GET',
					path: UP.counts,
					keys: [
						'activityLevel[end]',
						'activityLevel[start]',
						'employeeIds[0]',
						'endDate',
						'logType[0]',
						'logType[1]',
						'organizationId',
						'projectIds[0]',
						'startDate',
						'teamIds[0]',
						'timeZone'
					],
					absent: ['tenantId'],
					values: {
						organizationId: ids.organizationA,
						'logType[0]': 'TRACKED',
						'logType[1]': 'MANUAL',
						timeZone: 'UTC'
					}
				}
			]
		},
		refusal: ownJson(500, { error: 'Failed to fetch timesheet statistics counts' }),
		drop: ownJson(500, { error: 'Failed to fetch timesheet statistics counts' }),
		notIntended: "an upstream 403 answers 500 with this app's own sentence (`route.ts:86-88`)"
	},
	{
		label: 'PUT /api/timesheet/status',
		method: 'PUT',
		half: 'forwardToGauzy',
		app: () => `/api/timesheet/status?ids=${encodeURIComponent(JSON.stringify(PROBE_IDS))}&status=approved`,
		body: () => ({ ids: PROBE_IDS, status: 'approved' }),
		asks: () => [
			{
				// forward-to-gauzy.ts:4 + :112: the query is handed on as the caller spelled it, and so is the body —
				// this route validates nothing, unlike its `/api/timer/timesheet/status` sibling
				method: 'PUT',
				path: UP.timesheetStatus,
				keys: ['ids', 'status'],
				values: { status: 'approved' }
			}
		],
		// The mock answers an unmatched write by echoing its body (`mock-gauzy-server.mjs:894`): the echo is the witness
		// that exactly this JSON reached Gauzy
		control: {
			status: 200,
			body: { ids: PROBE_IDS, status: 'approved' },
			contentType: UPSTREAM_MEDIA_TYPE,
			cacheControl: null
		},
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] },
		refusal: relayed(REFUSAL),
		drop: UNREACHABLE
	},
	{
		label: 'GET /api/timesheet/time-log/conflict',
		method: 'GET',
		half: 'forwardToGauzy',
		app: (ids) =>
			`/api/timesheet/time-log/conflict?startDate=${START_ISO}&endDate=${END_ISO}&employeeId=${ids.employee}`,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.conflict,
				keys: ['employeeId', 'endDate', 'startDate'],
				values: { employeeId: ids.employee }
			}
		],
		control: { status: 200, body: MOCK_PAGE, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null },
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] },
		refusal: relayed(REFUSAL),
		drop: UNREACHABLE
	},
	{
		label: 'GET /api/timesheet/time-log/history',
		method: 'GET',
		half: 'forwardToGauzy',
		app: (ids) =>
			`/api/timesheet/time-log/history?startDate=${START_DAY}&endDate=${END_DAY}&organizationId=${ids.organizationA}&tenantId=${ids.tenantA}`,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.history,
				keys: ['endDate', 'organizationId', 'startDate', 'tenantId'],
				values: { tenantId: ids.tenantA, organizationId: ids.organizationA }
			}
		],
		control: { status: 200, body: MOCK_PAGE, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null },
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] },
		refusal: relayed(REFUSAL),
		drop: UNREACHABLE
	},
	{
		label: 'GET /api/timesheet/time-log/project-budget-limit',
		method: 'GET',
		half: 'forwardToGauzy',
		app: (ids) =>
			`/api/timesheet/time-log/project-budget-limit?organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}&projectIds[0]=${ids.project}`,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.budgetLimit,
				keys: ['endDate', 'organizationId', 'projectIds[0]', 'startDate'],
				values: { organizationId: ids.organizationA, 'projectIds[0]': ids.project }
			}
		],
		control: { status: 200, body: MOCK_LIST, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null },
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] },
		refusal: relayed(REFUSAL),
		drop: UNREACHABLE
	},
	{
		label: 'GET /api/timesheet/time-log/report/daily-chart',
		method: 'GET',
		half: 'guard',
		app: (ids) =>
			`/api/timesheet/time-log/report/daily-chart?organizationId=${ids.organizationA}&tenantId=${ids.tenantA}` +
			`&startDate=${START_DAY}&endDate=${END_DAY}&timeZone=UTC&groupBy=date&activityLevel[start]=1&activityLevel[end]=99` +
			`&logType[0]=TRACKED&logType[1]=BREAK&projectIds[0]=${ids.project}&employeeIds[0]=${ids.employee}` +
			`&taskIds[0]=${ids.task}&teamIds[0]=${ids.teamA}`,
		asks: (ids) => [
			{
				// the route builds this query itself (`app/api/timesheet/time-log/report/daily-chart/route.ts:59-76`)
				// and hands it to `serverFetch` (`:78-83`), so both scoping ids come from the caller's query
				method: 'GET',
				path: UP.dailyChart,
				keys: [
					'activityLevel[end]',
					'activityLevel[start]',
					'employeeIds[0]',
					'endDate',
					'groupBy',
					'logType[0]',
					'logType[1]',
					'organizationId',
					'projectIds[0]',
					'startDate',
					'taskIds[0]',
					'teamIds[0]',
					'tenantId',
					'timeZone'
				],
				values: {
					tenantId: ids.tenantA,
					organizationId: ids.organizationA,
					startDate: START_DAY,
					endDate: END_DAY,
					timeZone: 'UTC',
					groupBy: 'date',
					'activityLevel[start]': '1',
					'activityLevel[end]': '99',
					'logType[0]': 'TRACKED',
					'logType[1]': 'BREAK',
					'projectIds[0]': ids.project,
					'employeeIds[0]': ids.employee,
					'taskIds[0]': ids.task,
					'teamIds[0]': ids.teamA
				}
			}
		],
		control: ownJson(200, MOCK_LIST),
		signedOut: {
			...ownJson(200, MOCK_LIST),
			asks: (ids) => [
				{
					method: 'GET',
					path: UP.dailyChart,
					keys: [
						'activityLevel[end]',
						'activityLevel[start]',
						'employeeIds[0]',
						'endDate',
						'groupBy',
						'logType[0]',
						'logType[1]',
						'organizationId',
						'projectIds[0]',
						'startDate',
						'taskIds[0]',
						'teamIds[0]',
						'tenantId',
						'timeZone'
					],
					values: { tenantId: ids.tenantA, organizationId: ids.organizationA }
				}
			]
		},
		refusal: ownJson(500, { error: 'Failed to fetch daily chart data' }),
		drop: ownJson(500, { error: 'Failed to fetch daily chart data' }),
		notIntended: "an upstream 403 answers 500 with this app's own sentence (`route.ts:86-88`)"
	},
	{
		label: 'GET /api/timesheet/time-log/report/owed-report',
		method: 'GET',
		half: 'forwardToGauzy',
		app: (ids) =>
			`/api/timesheet/time-log/report/owed-report?organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}&projectIds[0]=${ids.project}`,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.owedReport,
				keys: ['endDate', 'organizationId', 'projectIds[0]', 'startDate'],
				values: { organizationId: ids.organizationA, 'projectIds[0]': ids.project }
			}
		],
		control: { status: 200, body: MOCK_LIST, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null },
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] },
		refusal: relayed(REFUSAL),
		drop: UNREACHABLE
	},
	{
		label: 'GET /api/timesheet/time-log/report/weekly',
		method: 'GET',
		half: 'guard',
		// The caller sends no scoping ids at all here: this route takes them from the session (`route.ts:31`)
		app: (ids) =>
			`/api/timesheet/time-log/report/weekly?startDate=${START_DAY}&endDate=${END_DAY}&timeZone=UTC` +
			`&billableOnly=true&projectIds[0]=${ids.project}&employeeIds[0]=${ids.employee}&teamIds[0]=${ids.teamA}`,
		asks: (ids) => [
			{
				// core/services/server/requests/timesheet.ts:321-327 with buildTimeLogParams
				method: 'GET',
				path: UP.weeklyReport,
				keys: [
					'billableOnly',
					'employeeIds[0]',
					'endDate',
					'organizationId',
					'projectIds[0]',
					'startDate',
					'teamIds[0]',
					'tenantId',
					'timeZone'
				],
				values: {
					tenantId: ids.tenantA,
					organizationId: ids.organizationA,
					startDate: START_DAY,
					endDate: END_DAY,
					timeZone: 'UTC',
					billableOnly: 'true',
					'projectIds[0]': ids.project,
					'employeeIds[0]': ids.employee,
					'teamIds[0]': ids.teamA
				}
			}
		],
		control: ownJson(200, MOCK_LIST),
		signedOut: {
			...ownJson(200, MOCK_LIST),
			// Finding 6: the two session ids go upstream as the text `undefined`
			asks: () => [
				{
					method: 'GET',
					path: UP.weeklyReport,
					keys: [
						'billableOnly',
						'employeeIds[0]',
						'endDate',
						'organizationId',
						'projectIds[0]',
						'startDate',
						'teamIds[0]',
						'tenantId',
						'timeZone'
					],
					values: { organizationId: 'undefined', tenantId: 'undefined' }
				}
			]
		},
		refusal: ownJson(500, { error: 'Failed to fetch weekly report' }),
		drop: ownJson(500, { error: 'Failed to fetch weekly report' }),
		notIntended:
			'an upstream 403 answers 500 with this app\'s own sentence; signed out, the two scoping ids go upstream as "undefined"'
	},
	{
		label: 'GET /api/timesheet/time-log/time-limit',
		method: 'GET',
		half: 'forwardToGauzy',
		app: (ids) =>
			`/api/timesheet/time-log/time-limit?organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}&employeeIds[0]=${ids.employee}`,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.timeLimit,
				keys: ['employeeIds[0]', 'endDate', 'organizationId', 'startDate'],
				values: { organizationId: ids.organizationA, 'employeeIds[0]': ids.employee }
			}
		],
		control: { status: 200, body: MOCK_LIST, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null },
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] },
		refusal: relayed(REFUSAL),
		drop: UNREACHABLE
	}
];
test.describe('lane-b · the 19 timer / timesheet routes, each pinned on its upstream call', () => {
	for (const route of ROUTES) {
		const note = route.notIntended ? ' [MEASURED, NOT INTENDED]' : '';

		test(`${route.label}: control — one call, on this path, with these keys${note}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const asked = route.asks(ids);
			const { response, text, path } = await callRoute(api, cookies, route, ids);
			const log = await mock.requests();

			expectRouteAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				resolve(route.control, ids),
				`${route.label} control`
			);
			expect(
				await mock.failures(),
				`the control caused a refused upstream call (${logOf(log)}) — a control is an answer, not a refusal`
			).toEqual([]);
		});

		test(`${route.label}: signed out — ${
			route.half === 'forwardToGauzy'
				? 'this app refuses, and the mock was asked nothing'
				: 'the guard delegates, so the session scoping is what disappears'
		}${route.half === 'forwardToGauzy' ? '' : ' [mock limit: this mock answers /user/me with no bearer, Gauzy refuses it]'}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const answer = resolve(route.signedOut, ids);
			const asked = answer.asks(ids);
			const { response, text, path } = await callRoute(api, cookies, route, ids, { anonymous: true });
			const log = await mock.requests();

			expectRouteAnswer(asked, 200, response, text, path, log, answer, `${route.label} signed out`);

			if (route.half === 'forwardToGauzy') {
				// `forward-to-gauzy.ts:96` short-circuits on the cookie before the fetch at `:112`: an empty log is the
				// proof that this app, and not Gauzy, refused (`suites/lane-c/session-guard.spec.ts` pins the family)
				expect(
					triples(log),
					`${route.label}: a caller with no session cookie reached the test backend at all (${logOf(log)}) — ` +
						'the refusal must come from this app'
				).toEqual([]);
			}
		});

		test(`${route.label}: an upstream ${REFUSAL} on the path it asks first is answered${note}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const firstAsk = route.asks(ids)[0];
			await mock.scenario({ fails: { [firstAsk.path]: REFUSAL } });

			const { response, text, path } = await callRoute(api, cookies, route, ids);
			const log = await mock.requests();
			// What survives a refused first call: that call alone. A route that asked twice asks once.
			const asked = [firstAsk];

			expectRouteAnswer(
				asked,
				REFUSAL,
				response,
				text,
				path,
				log,
				resolve(route.refusal, ids),
				`${route.label} with ${firstAsk.path} armed ${REFUSAL}`
			);
			expect(
				triples(await mock.failures()),
				`${route.label}: the armed ${REFUSAL} is missing from the failures view (${logOf(log)})`
			).toEqual([`${firstAsk.method} ${firstAsk.path} ${REFUSAL}`]);
		});

		test(`${route.label}: a cut upstream call is answered${note}`, async ({ api, mock, ids, cookies }) => {
			const firstAsk = route.asks(ids)[0];
			await mock.scenario({ drops: { [firstAsk.path]: 1 } });

			const { response, text, path } = await callRoute(api, cookies, route, ids);
			const log = await mock.requests();

			expectRouteAnswer(
				[firstAsk],
				0,
				response,
				text,
				path,
				log,
				resolve(route.drop, ids),
				`${route.label} with ${firstAsk.path} cut`
			);
			expect(
				await mock.failures(),
				`${route.label}: a cut call was counted as a refusal, which would make every "was refused upstream" ` +
					`witness in this lane mean two things (${logOf(log)})`
			).toEqual([]);
		});
	}
});

/** One validation or value-passthrough case, measured with nothing else armed unless `fails` says so. */
type ExtraCase = {
	/** Names the test, and says which route it belongs to. */
	label: string;
	method: 'GET' | 'POST' | 'PUT';
	app: (ids: Record<string, string>) => string;
	/** The JSON body this case sends, when it is a write. */
	send?: (ids: Record<string, string>) => unknown;
	anonymous?: boolean;
	/** The session cookie this case removes; the token always stays, so the guard still authenticates. */
	cookieWithout?: string;
	/** A `fails` arm this case needs, most often to prove that a route validates before it forwards. */
	fails?: (ids: Record<string, string>) => Record<string, number>;
	/** A `drops` arm, for a case about a call that gave no answer at all. */
	drops?: (ids: Record<string, string>) => Record<string, number>;
	status: number;
	/** The answer body this case measured (`null` is an answer, so it is spelled out where a route answers null). */
	body?: unknown;
	shape?: (body: unknown) => string | null;
	/** Defaults to this app's own media type, because only a `forwardToGauzy` answer carries the mock's; a row of one
	 * of the seven forwarders therefore names `UPSTREAM_MEDIA_TYPE` itself. */
	contentType?: string | null;
	/** The upstream calls this case caused (usually none: a refused request never reaches Gauzy). */
	asks?: (ids: Record<string, string>) => Ask[];
	askedStatus?: number;
	/** A row that answers something other than what the code means to. */
	notIntended?: boolean;
};

const EXTRA_CASES: ExtraCase[] = [
	// --- GET /api/timer/daily -------------------------------------------------------------------
	{
		label: 'GET /api/timer/daily: an unparseable startDate is refused with 400 and the read never starts',
		method: 'GET',
		app: () => '/api/timer/daily?startDate=not-a-date&endDate=2026-11-20',
		status: 400,
		body: { error: 'Invalid startDate or endDate' },
		asks: () => []
	},
	{
		label: 'GET /api/timer/daily: an armed 403 does not outrank its own 400',
		method: 'GET',
		app: () => '/api/timer/daily?startDate=not-a-date&endDate=2026-11-20',
		fails: () => ({ [UP.activityDaily]: REFUSAL }),
		status: 400,
		body: { error: 'Invalid startDate or endDate' },
		asks: () => []
	},
	{
		label: 'GET /api/timer/daily: dates the caller did not send are absent upstream, not empty',
		method: 'GET',
		app: () => '/api/timer/daily',
		status: 200,
		body: MOCK_PAGE,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.activityDaily,
				keys: ['activityLevel[end]', 'activityLevel[start]', 'employeeIds[0]', 'organizationId', 'tenantId'],
				absent: ['startDate', 'endDate'],
				values: { tenantId: ids.tenantA, organizationId: ids.organizationA, 'employeeIds[0]': ids.employee }
			}
		]
	},
	{
		label: 'GET /api/timer/daily: types[0] wins over type, and both reach Gauzy as types[0]',
		method: 'GET',
		app: () => `/api/timer/daily?startDate=${START_DAY}&endDate=${END_DAY}&types[0]=IDLE&type=TRACKED`,
		status: 200,
		body: MOCK_PAGE,
		asks: () => [
			{
				method: 'GET',
				path: UP.activityDaily,
				keys: [
					'activityLevel[end]',
					'activityLevel[start]',
					'employeeIds[0]',
					'endDate',
					'organizationId',
					'startDate',
					'tenantId',
					'types[0]'
				],
				absent: ['type'],
				values: { 'types[0]': 'IDLE' }
			}
		]
	},
	{
		label: 'GET /api/timer/daily: the tenant cookie is the tenant that travels, and dropping it drops the key',
		method: 'GET',
		app: () => `/api/timer/daily?startDate=${START_DAY}&endDate=${END_DAY}`,
		cookieWithout: 'auth-tenant-id',
		status: 200,
		body: MOCK_PAGE,
		asks: () => [
			{
				method: 'GET',
				path: UP.activityDaily,
				keys: [
					'activityLevel[end]',
					'activityLevel[start]',
					'employeeIds[0]',
					'endDate',
					'organizationId',
					'startDate'
				],
				absent: ['tenantId']
			}
		]
	},
	{
		label: 'GET /api/timer/daily: the organization cookie is the organization that travels',
		method: 'GET',
		app: () => `/api/timer/daily?startDate=${START_DAY}&endDate=${END_DAY}`,
		cookieWithout: 'auth-organization-id',
		status: 200,
		body: MOCK_PAGE,
		asks: () => [
			{
				method: 'GET',
				path: UP.activityDaily,
				keys: [
					'activityLevel[end]',
					'activityLevel[start]',
					'employeeIds[0]',
					'endDate',
					'startDate',
					'tenantId'
				],
				absent: ['organizationId']
			}
		]
	},
	// --- GET /api/timer/slot/window -------------------------------------------------------------
	{
		label: 'GET /api/timer/slot/window: two dates out of order are refused before the slots are asked for',
		method: 'GET',
		app: () => `/api/timer/slot/window?startDate=${END_ISO}&endDate=${START_ISO}`,
		status: 400,
		body: { error: 'startDate and endDate must be valid dates, in order' },
		asks: () => []
	},
	{
		label: 'GET /api/timer/slot/window: no dates at all is the same 400',
		method: 'GET',
		app: () => '/api/timer/slot/window',
		status: 400,
		body: { error: 'startDate and endDate must be valid dates, in order' },
		asks: () => []
	},
	// --- GET /api/timer/status/worked -----------------------------------------------------------
	{
		label: 'GET /api/timer/status/worked: indexed employeeIds ask for teammates, in the order they were sent',
		method: 'GET',
		app: (ids) =>
			`/api/timer/status/worked?employeeIds[0]=${ids.teammateEmployee}&employeeIds[1]=${ids.deniedEmployee}`,
		status: 200,
		body: MOCK_PAGE,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.timerWorked,
				keys: ['employeeIds[0]', 'employeeIds[1]', 'organizationId', 'tenantId'],
				absent: ['employeeId'],
				values: { 'employeeIds[0]': ids.teammateEmployee, 'employeeIds[1]': ids.deniedEmployee }
			}
		]
	},
	{
		label: 'GET /api/timer/status/worked: the same list sent without indices is read too, and forwarded with indices',
		method: 'GET',
		app: (ids) => `/api/timer/status/worked?employeeIds=${ids.teammateEmployee}&employeeIds=${ids.deniedEmployee}`,
		status: 200,
		body: MOCK_PAGE,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.timerWorked,
				keys: ['employeeIds[0]', 'employeeIds[1]', 'organizationId', 'tenantId'],
				values: { 'employeeIds[0]': ids.teammateEmployee, 'employeeIds[1]': ids.deniedEmployee }
			}
		]
	},
	// --- POST /api/timer/sync -------------------------------------------------------------------
	{
		label: 'POST /api/timer/sync: no todayStart/todayEnd, and the status read goes without them',
		method: 'POST',
		app: () => '/api/timer/sync',
		send: () => ({ source: 'TEAMS', duration: 12 }),
		status: 200,
		shape: timerStatusShape,
		asks: (ids) => [
			{ method: 'POST', path: UP.timeSlot, keys: [] },
			{
				method: 'GET',
				path: UP.timerStatus,
				keys: ['organizationId', 'tenantId'],
				absent: ['todayEnd', 'todayStart'],
				values: { tenantId: ids.tenantA, organizationId: ids.organizationA }
			}
		]
	},
	{
		label: 'POST /api/timer/sync: a refused status read after a credited write answers 200 with null (route.ts:39-49)',
		method: 'POST',
		app: () => `/api/timer/sync?todayStart=${START_ISO}&todayEnd=${END_ISO}`,
		send: () => ({ source: 'TEAMS', duration: 37 }),
		fails: () => ({ [UP.timerStatus]: REFUSAL }),
		status: 200,
		body: null,
		// The write went through and answered 200; only the read was refused, and the route treats that as "no timer".
		asks: (ids) => [
			{ method: 'POST', path: UP.timeSlot, keys: [] },
			{
				method: 'GET',
				path: UP.timerStatus,
				keys: ['organizationId', 'tenantId', 'todayEnd', 'todayStart'],
				values: { tenantId: ids.tenantA, organizationId: ids.organizationA },
				status: REFUSAL
			}
		]
	},
	{
		label: 'POST /api/timer/sync: a status read that was cut answers 200 with null too',
		method: 'POST',
		app: () => `/api/timer/sync?todayStart=${START_ISO}&todayEnd=${END_ISO}`,
		send: () => ({ source: 'TEAMS', duration: 37 }),
		drops: () => ({ [UP.timerStatus]: 1 }),
		status: 200,
		body: null,
		asks: (ids) => [
			{ method: 'POST', path: UP.timeSlot, keys: [] },
			{
				method: 'GET',
				path: UP.timerStatus,
				keys: ['organizationId', 'tenantId', 'todayEnd', 'todayStart'],
				values: { tenantId: ids.tenantA, organizationId: ids.organizationA },
				status: 0
			}
		]
	},
	// --- GET /api/timer/timesheet/daily ---------------------------------------------------------
	{
		label: 'GET /api/timer/timesheet/daily: a missing endDate is refused before the session is even read',
		method: 'GET',
		app: () => `/api/timer/timesheet/daily?startDate=${START_DAY}`,
		status: 400,
		body: { error: 'startDate and endDate are required' },
		asks: () => []
	},
	// --- GET /api/timer/timesheet/statistics-tasks ----------------------------------------------
	{
		label: 'GET /api/timer/timesheet/statistics-tasks?activeTask=true: with an active task it still asks twice',
		method: 'GET',
		app: () => '/api/timer/timesheet/statistics-tasks?activeTask=true',
		status: 200,
		body: { global: [], today: [] },
		asks: () => [
			{ method: 'POST', path: UP.statisticsTasks, keys: [] },
			{ method: 'POST', path: UP.statisticsTasks, keys: [] }
		]
	},
	{
		label: 'GET /api/timer/timesheet/statistics-tasks?activeTask=true: no active-task cookie, so it answers its own empty pair and asks nothing',
		method: 'GET',
		app: () => '/api/timer/timesheet/statistics-tasks?activeTask=true',
		cookieWithout: 'auth-active-task',
		status: 200,
		body: { global: [], today: [] },
		asks: () => []
	},
	{
		label: 'GET /api/timer/timesheet/statistics-tasks: a teammate and a team named by the caller still cost two POSTs (their body is not in the log)',
		method: 'GET',
		app: (ids) => `/api/timer/timesheet/statistics-tasks?employeeId=${ids.teammateEmployee}&teamId=${ids.teamA}`,
		status: 200,
		body: { global: [], today: [] },
		asks: () => [
			{ method: 'POST', path: UP.statisticsTasks, keys: [] },
			{ method: 'POST', path: UP.statisticsTasks, keys: [] }
		]
	},
	// --- PUT /api/timer/timesheet/status --------------------------------------------------------
	{
		label: 'PUT /api/timer/timesheet/status: no ids answers 200 with {success:false} and never writes',
		method: 'PUT',
		app: () => '/api/timer/timesheet/status?status=approved',
		status: 200,
		body: { success: false, message: 'Missing required parameters' },
		asks: () => [],
		notIntended: true
	},
	{
		label: 'PUT /api/timer/timesheet/status: ids that are not JSON answers 200 with {success:false}',
		method: 'PUT',
		app: () => '/api/timer/timesheet/status?ids=not-json&status=approved',
		status: 200,
		body: { success: false, message: 'Invalid ids format' },
		asks: () => [],
		notIntended: true
	},
	{
		label: 'PUT /api/timer/timesheet/status: an empty ids array answers 200 with {success:false}',
		method: 'PUT',
		app: () => `/api/timer/timesheet/status?ids=${encodeURIComponent(JSON.stringify([]))}&status=approved`,
		status: 200,
		body: { success: false, message: 'Invalid ids format' },
		asks: () => [],
		notIntended: true
	},
	{
		label: 'PUT /api/timer/timesheet/status: ids that are an object answers 200 with {success:false}',
		method: 'PUT',
		app: () => `/api/timer/timesheet/status?ids=${encodeURIComponent(JSON.stringify({ a: 1 }))}&status=approved`,
		status: 200,
		body: { success: false, message: 'Invalid ids format' },
		asks: () => [],
		notIntended: true
	},
	{
		label: 'PUT /api/timer/timesheet/status: a status outside pending/approved/rejected answers 200 with {success:false}',
		method: 'PUT',
		app: () => `/api/timer/timesheet/status?ids=${encodeURIComponent(JSON.stringify(['x']))}&status=whatever`,
		status: 200,
		body: { success: false, message: 'Invalid status value' },
		asks: () => [],
		notIntended: true
	},
	{
		label: 'PUT /api/timer/timesheet/status: its own 200 refusals are checked before the armed upstream is asked',
		method: 'PUT',
		app: () => '/api/timer/timesheet/status?status=approved',
		fails: () => ({ [UP.timesheetStatus]: REFUSAL }),
		status: 200,
		body: { success: false, message: 'Missing required parameters' },
		asks: () => [],
		notIntended: true
	},
	// --- GET /api/timesheet/activity/report -----------------------------------------------------
	{
		label: 'GET /api/timesheet/activity/report: a missing tenantId is a 400 naming all four required keys',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/activity/report?organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}`,
		status: 400,
		body: {
			message: 'Required parameters missing: tenantId, organizationId, startDate, and endDate are required'
		},
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/activity/report: a missing startDate is the same 400',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/activity/report?tenantId=${ids.tenantA}&organizationId=${ids.organizationA}&endDate=${END_DAY}`,
		status: 400,
		body: {
			message: 'Required parameters missing: tenantId, organizationId, startDate, and endDate are required'
		},
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/activity/report: nothing optional is added when the caller sends none of it',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/activity/report?tenantId=${ids.tenantA}&organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}`,
		status: 200,
		body: MOCK_PAGE,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.activityReport,
				keys: ['endDate', 'organizationId', 'startDate', 'tenantId'],
				absent: ['shape', 'timeZone', 'groupBy', 'activityLevel[start]', 'logType[0]'],
				values: { tenantId: ids.tenantA, organizationId: ids.organizationA }
			}
		]
	},
	// --- GET /api/timesheet/activity ------------------------------------------------------------
	{
		label: 'GET /api/timesheet/activity: no query at all is forwarded as no query at all',
		method: 'GET',
		app: () => '/api/timesheet/activity',
		status: 200,
		contentType: UPSTREAM_MEDIA_TYPE,
		body: MOCK_LIST,
		asks: () => [{ method: 'GET', path: UP.activity, keys: [] }]
	},
	// --- GET /api/timesheet/statistics/counts ---------------------------------------------------
	{
		label: 'GET /api/timesheet/statistics/counts: no logType is a 400, and this route reads only TRACKED, MANUAL, IDLE',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/statistics/counts?tenantId=${ids.tenantA}&organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}`,
		status: 400,
		body: { error: 'At least one valid logType is required (TRACKED, MANUAL, or IDLE)' },
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/statistics/counts: RESUMED is a log type Gauzy has and this route refuses',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/statistics/counts?tenantId=${ids.tenantA}&organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}&logType[0]=RESUMED`,
		status: 400,
		body: { error: 'At least one valid logType is required (TRACKED, MANUAL, or IDLE)' },
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/statistics/counts: a missing organizationId is a 400 before anything else',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/statistics/counts?tenantId=${ids.tenantA}&startDate=${START_DAY}&endDate=${END_DAY}&logType[0]=TRACKED`,
		status: 400,
		body: {
			error: 'Missing required parameters: startDate, endDate, organizationId, and tenantId are required'
		},
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/statistics/counts: signed out and with no query tenantId, so its 400 needs no session at all',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/statistics/counts?organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}&logType[0]=TRACKED`,
		anonymous: true,
		status: 400,
		body: {
			error: 'Missing required parameters: startDate, endDate, organizationId, and tenantId are required'
		},
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/statistics/counts: no query tenantId takes the session tenant cookie and fills its defaults',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/statistics/counts?organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}&logType[0]=TRACKED`,
		status: 200,
		body: { today: 0, week: 0, month: 0 },
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.counts,
				keys: [
					'activityLevel[end]',
					'activityLevel[start]',
					'endDate',
					'logType[0]',
					'organizationId',
					'startDate',
					'timeZone'
				],
				absent: ['tenantId', 'employeeIds[0]', 'projectIds[0]', 'teamIds[0]'],
				values: {
					organizationId: ids.organizationA,
					'logType[0]': 'TRACKED',
					'activityLevel[start]': '0',
					'activityLevel[end]': '100',
					timeZone: 'Etc/UTC'
				}
			}
		]
	},
	// --- PUT /api/timesheet/status --------------------------------------------------------------
	{
		label: 'PUT /api/timesheet/status: a status the route never validated is forwarded as asked',
		method: 'PUT',
		app: () => `/api/timesheet/status?ids=${encodeURIComponent(JSON.stringify(['lane-b-probe-status-x']))}`,
		status: 200,
		contentType: UPSTREAM_MEDIA_TYPE,
		body: { success: true },
		asks: () => [{ method: 'PUT', path: UP.timesheetStatus, keys: ['ids'] }]
	},
	// --- the seven forwarders, with nothing to validate -----------------------------------------
	{
		label: 'GET /api/timesheet/time-log/conflict: no query at all is forwarded as no query at all',
		method: 'GET',
		app: () => '/api/timesheet/time-log/conflict',
		status: 200,
		contentType: UPSTREAM_MEDIA_TYPE,
		body: MOCK_PAGE,
		asks: () => [{ method: 'GET', path: UP.conflict, keys: [] }]
	},
	{
		label: 'GET /api/timesheet/time-log/history: no query at all is forwarded as no query at all',
		method: 'GET',
		app: () => '/api/timesheet/time-log/history',
		status: 200,
		contentType: UPSTREAM_MEDIA_TYPE,
		body: MOCK_PAGE,
		asks: () => [{ method: 'GET', path: UP.history, keys: [] }]
	},
	{
		label: 'GET /api/timesheet/time-log/project-budget-limit: no query at all is forwarded as no query at all',
		method: 'GET',
		app: () => '/api/timesheet/time-log/project-budget-limit',
		status: 200,
		contentType: UPSTREAM_MEDIA_TYPE,
		body: MOCK_LIST,
		asks: () => [{ method: 'GET', path: UP.budgetLimit, keys: [] }]
	},
	{
		label: 'GET /api/timesheet/time-log/report/owed-report: no query at all is forwarded as no query at all',
		method: 'GET',
		app: () => '/api/timesheet/time-log/report/owed-report',
		status: 200,
		contentType: UPSTREAM_MEDIA_TYPE,
		body: MOCK_LIST,
		asks: () => [{ method: 'GET', path: UP.owedReport, keys: [] }]
	},
	{
		label: 'GET /api/timesheet/time-log/time-limit: keys this app knows nothing about go upstream as they came',
		method: 'GET',
		app: () => `/api/timesheet/time-log/time-limit?a=1&b=2&employeeIds[0]=${'lane-b-probe-employee'}`,
		status: 200,
		contentType: UPSTREAM_MEDIA_TYPE,
		body: MOCK_LIST,
		asks: () => [{ method: 'GET', path: UP.timeLimit, keys: ['a', 'b', 'employeeIds[0]'] }]
	},
	// --- GET /api/timesheet/time-log/report/daily-chart -----------------------------------------
	{
		label: 'GET /api/timesheet/time-log/report/daily-chart: a missing tenantId is refused here, where the query carries it',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/time-log/report/daily-chart?organizationId=${ids.organizationA}&startDate=${START_DAY}&endDate=${END_DAY}`,
		status: 400,
		body: {
			error: 'Missing required parameters: startDate, endDate, organizationId, and tenantId are required'
		},
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/time-log/report/daily-chart: an unknown logType is refused, and here the five of them are allowed',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/time-log/report/daily-chart?organizationId=${ids.organizationA}&tenantId=${ids.tenantA}&startDate=${START_DAY}&endDate=${END_DAY}&logType[0]=NOPE`,
		status: 400,
		body: { error: 'logType takes TRACKED, MANUAL, IDLE, RESUMED, BREAK' },
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/time-log/report/daily-chart: no logType is allowed here, and the defaults fill the rest',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/time-log/report/daily-chart?organizationId=${ids.organizationA}&tenantId=${ids.tenantA}&startDate=${START_DAY}&endDate=${END_DAY}`,
		status: 200,
		body: MOCK_LIST,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.dailyChart,
				keys: [
					'activityLevel[end]',
					'activityLevel[start]',
					'endDate',
					'groupBy',
					'organizationId',
					'startDate',
					'tenantId',
					'timeZone'
				],
				absent: ['logType[0]', 'projectIds[0]', 'taskIds[0]'],
				values: {
					tenantId: ids.tenantA,
					organizationId: ids.organizationA,
					groupBy: 'date',
					timeZone: 'Etc/UTC',
					'activityLevel[start]': '0',
					'activityLevel[end]': '100'
				}
			}
		]
	},
	// --- GET /api/timesheet/time-log/report/weekly ----------------------------------------------
	{
		label: 'GET /api/timesheet/time-log/report/weekly: a missing endDate is refused before the session is read',
		method: 'GET',
		app: () => `/api/timesheet/time-log/report/weekly?startDate=${START_DAY}`,
		status: 400,
		body: { error: 'Missing required parameters: startDate and endDate are required' },
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/time-log/report/weekly: two dates the wrong way round are the other 400',
		method: 'GET',
		app: () => `/api/timesheet/time-log/report/weekly?startDate=${END_DAY}&endDate=${START_DAY}`,
		status: 400,
		body: {
			error: 'Invalid parameters: startDate and endDate must be valid dates, startDate not after endDate'
		},
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/time-log/report/weekly: an unparseable date is that same 400',
		method: 'GET',
		app: () => `/api/timesheet/time-log/report/weekly?startDate=zzz&endDate=${END_DAY}`,
		status: 400,
		body: {
			error: 'Invalid parameters: startDate and endDate must be valid dates, startDate not after endDate'
		},
		asks: () => []
	},
	{
		label: 'GET /api/timesheet/time-log/report/weekly: the session ids win over the tenant and organization the caller sent',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/time-log/report/weekly?startDate=${START_DAY}&endDate=${END_DAY}&tenantId=${ids.tenantB}&organizationId=${ids.organizationB}`,
		status: 200,
		body: MOCK_LIST,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.weeklyReport,
				keys: ['endDate', 'organizationId', 'startDate', 'tenantId'],
				values: { tenantId: ids.tenantA, organizationId: ids.organizationA }
			}
		]
	},
	{
		label: 'GET /api/timesheet/time-log/report/weekly: billableOnly=false sends nothing at all, and the time zone goes as named',
		method: 'GET',
		app: () =>
			'/api/timesheet/time-log/report/weekly?startDate=2026-11-01&endDate=2026-11-20&billableOnly=false&timeZone=Europe%2FBerlin',
		status: 200,
		body: MOCK_LIST,
		asks: (ids) => [
			{
				method: 'GET',
				path: UP.weeklyReport,
				keys: ['endDate', 'organizationId', 'startDate', 'tenantId', 'timeZone'],
				absent: ['billableOnly'],
				values: { timeZone: 'Europe/Berlin', tenantId: ids.tenantA, organizationId: ids.organizationA }
			}
		]
	}
];

test.describe('lane-b · what each of those 19 refuses on its own, before Gauzy is asked', () => {
	for (const item of EXTRA_CASES) {
		test(`${item.label}${item.notIntended ? ' [MEASURED, NOT INTENDED]' : ''}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			if (item.fails || item.drops) {
				await mock.scenario({
					...(item.fails ? { fails: item.fails(ids) } : {}),
					...(item.drops ? { drops: item.drops(ids) } : {})
				});
			}

			const path = item.app(ids);
			const headers: Record<string, string> = {};
			if (item.cookieWithout) headers.cookie = cookies('A', [item.cookieWithout]);
			const sent = item.send ? item.send(ids) : undefined;

			const response = await api(path, {
				method: item.method,
				...(sent === undefined ? {} : { body: sent }),
				...(item.anonymous ? { anonymous: true } : {}),
				...(Object.keys(headers).length ? { headers } : {})
			});
			const text = await response.text();
			const log = await mock.requests();
			const asked = item.asks ? item.asks(ids) : [];

			expectRouteAnswer(
				asked,
				item.askedStatus ?? 200,
				response,
				text,
				path,
				log,
				{
					status: item.status,
					...(item.body === undefined ? {} : { body: item.body }),
					...(item.shape ? { shape: item.shape } : {}),
					contentType: item.contentType ?? OWN_MEDIA_TYPE
				},
				item.label
			);
		});
	}
});
/** A table row by its label, for the blocks below that reuse a row's own control answer. */
function byLabel(label: string): ContractRoute {
	const route = ROUTES.find((candidate) => candidate.label === label);
	if (!route) throw new Error(`no contract route is labelled ${label}`);
	return route;
}

/** The three routes of these 19 that change something — the only ones a site check can answer for
 * (`app/api/timer/sync/route.ts:12`, `app/api/timer/timesheet/status/route.ts:8`, and `forward-to-gauzy.ts:89` for
 * `app/api/timesheet/status/route.ts`). */
const WRITE_ROUTES = ROUTES.filter((route) => route.method !== 'GET');

/** What a site check answers (`core/services/server/same-origin-request.ts:48-53`): its own JSON and `no-store`. */
const FOREIGN_SITE_REFUSAL: Answer = {
	status: 403,
	body: { statusCode: 403, message: 'Cross-site request refused' },
	contentType: OWN_MEDIA_TYPE,
	cacheControl: 'no-store'
};

/** Header sets a browser sends when the request came from another site, or a forged caller can send on its own. */
const FOREIGN_HEADERS: Array<{ label: string; headers: Record<string, string> }> = [
	{ label: 'Sec-Fetch-Site: cross-site', headers: { 'sec-fetch-site': 'cross-site' } },
	{ label: 'Sec-Fetch-Site: same-site', headers: { 'sec-fetch-site': 'same-site' } },
	{ label: 'an Origin of another site', headers: { origin: 'https://evil.example' } }
];

/** Header sets a same-origin browser write actually sends: an `Origin` naming this very host, or a `Sec-Fetch-Site`
 * that says nothing about another one. All three must pass — a check that refused them would break the app's own pages. */
const OWN_HEADERS: Array<{ label: string; headers: Record<string, string> }> = [
	{ label: 'an Origin naming this very host', headers: { origin: APP_ORIGIN } },
	{ label: 'Sec-Fetch-Site: none', headers: { 'sec-fetch-site': 'none' } },
	{ label: 'Sec-Fetch-Site: same-origin', headers: { 'sec-fetch-site': 'same-origin' } }
];

test.describe('lane-b · the POST and the two PUTs of those 19 refuse a caller that came from another site', () => {
	for (const route of WRITE_ROUTES) {
		for (const item of FOREIGN_HEADERS) {
			test(`${route.label} refused by ${item.label} — Gauzy was asked nothing at all`, async ({
				api,
				mock,
				ids,
				cookies
			}) => {
				const { response, text, path } = await callRoute(api, cookies, route, ids, { headers: item.headers });
				const log = await mock.requests();

				expectRouteAnswer(
					[],
					200,
					response,
					text,
					path,
					log,
					FOREIGN_SITE_REFUSAL,
					`${route.label} sent with ${item.label}`
				);
				// The check runs before the guard and before the write (`app/api/timer/sync/route.ts:12`,
				// `app/api/timer/timesheet/status/route.ts:8`), so even the session check never happens: an empty log is
				// what says the refusal came from this app rather than from Gauzy.
				expect(
					triples(log),
					`${route.label} sent with ${item.label} still reached the test backend (${logOf(log)}) — the write went ` +
						'though the caller came from another site'
				).toEqual([]);
			});
		}

		for (const item of OWN_HEADERS) {
			test(`${route.label} answered as always with ${item.label}`, async ({ api, mock, ids, cookies }) => {
				const asked = route.asks(ids);
				const { response, text, path } = await callRoute(api, cookies, route, ids, { headers: item.headers });
				const log = await mock.requests();

				expectRouteAnswer(
					asked,
					200,
					response,
					text,
					path,
					log,
					resolve(route.control, ids),
					`${route.label} sent with ${item.label}`
				);
			});
		}
	}

	test('GET /api/timesheet/time-log/conflict: the same headers on a read change nothing (same-origin-request.ts:44)', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const route = byLabel('GET /api/timesheet/time-log/conflict');
		const asked = route.asks(ids);
		const { response, text, path } = await callRoute(api, cookies, route, ids, {
			headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' }
		});
		const log = await mock.requests();

		expectRouteAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			resolve(route.control, ids),
			'GET /api/timesheet/time-log/conflict sent with cross-site headers'
		);
	});
});

/**
 * The mock addresses `fails` / `drops` as `<tenant>:<path>`, then `<tenant>`, then `<path>`
 * (`cypress/support/mock-gauzy-server.mjs:1134-1139` and `:1158-1163`), and the tenant it matches is the `tenant-id` header
 * `serverFetch` sends from the session (`core/services/server/fetch.ts`). Four of these 19 take their scoping from the
 * session and not from the query — `POST /api/timesheet/time-slot`, `POST /api/timesheet/statistics/tasks` (twice),
 * `PUT /api/timesheet/status` and `GET /api/timesheet/statistics/counts` — so their payload is invisible in the log.
 * An arm that fires for the session tenant and not for the other one is the only witness these routes carry.
 */
const TENANT_KEYED_ARMS: Array<{ route: ContractRoute; askPath: string }> = [
	{ route: byLabel('GET /api/timer/timesheet/statistics-tasks'), askPath: UP.statisticsTasks },
	{ route: byLabel('POST /api/timer/sync'), askPath: UP.timeSlot },
	{ route: byLabel('PUT /api/timer/timesheet/status'), askPath: UP.timesheetStatus },
	{ route: byLabel('GET /api/timesheet/statistics/counts'), askPath: UP.counts }
];

test.describe('lane-b · an arm addressed to the session tenant fires, the same arm on the other tenant does not', () => {
	for (const item of TENANT_KEYED_ARMS) {
		test(`${item.route.label}: armed as <tenant A>:${item.askPath}, it is refused as its row says`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			await mock.scenario({ fails: { [`${ids.tenantA}:${item.askPath}`]: REFUSAL } });

			const { response, text, path } = await callRoute(api, cookies, item.route, ids);
			const log = await mock.requests();

			expectRouteAnswer(
				[item.route.asks(ids)[0]],
				REFUSAL,
				response,
				text,
				path,
				log,
				resolve(item.route.refusal, ids),
				`${item.route.label} armed ${REFUSAL} on ${ids.tenantA}:${item.askPath}`
			);
		});

		test(`${item.route.label}: armed as <tenant B>:${item.askPath}, nothing of it applies`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			await mock.scenario({ fails: { [`${ids.tenantB}:${item.askPath}`]: REFUSAL } });

			const asked = item.route.asks(ids);
			const { response, text, path } = await callRoute(api, cookies, item.route, ids);
			const log = await mock.requests();

			expectRouteAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				resolve(item.route.control, ids),
				`${item.route.label} armed ${REFUSAL} on ${ids.tenantB}:${item.askPath}, which this session never sends`
			);
			expect(
				await mock.failures(),
				`${item.route.label}: an arm for the other tenant fired anyway (${logOf(log)}), which would mean the ` +
					'tenant that travels is not the session tenant'
			).toEqual([]);
		});
	}
});

/** Every case above arms the mock or drops a session cookie; the next test must not inherit either. The `mock` fixture
 * is automatic and resets on its own, so this is the same reset one lane later — kept because it is also what makes
 * "the mock was asked nothing" a claim about this test and not about the previous one (`suites/lane-c/`). */
test.afterEach(async () => {
	await mockReset();
});
