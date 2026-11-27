import type { APIResponse } from '@playwright/test';
import type { StubRequest } from '../../helpers';

import { expect, test, type ApiCall, type CookieComposer } from '../../api-fixtures';
import { APP_ORIGIN, mockReset } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The contract of the 11 integration "connect" API routes that no other spec names, pinned on lane-b (app 3032, mock
 * 3996, control 3998) in the runs `E:\Coding\.tmp\s2-lane-b-integ-1.log` … `-4.log` (2026-11-23): 243 tests, green in all
 * four of those runs. Every number, body, key list and header below is a measurement, taken first against the live lane
 * with `E:\Coding\.tmp\probe-integ\probe.mjs` … `probe6.mjs` (readings in `measured1.txt` … `measured5.txt` beside them)
 * and only then written down. `GET /api/integration-tenant/remember/state` and every mock line number here were
 * re-measured on 2026-11-24, after develop's #5726 fixes and the mock changes that came with them landed on this branch:
 * probe `E:\Coding\.tmp\probe-repin\integ.mjs`, readings in `E:\Coding\.tmp\probe-repin\integ-1.txt`, lane runs
 * `E:\Coding\.tmp\s2-lane-b-repin-1.log` and `-2.log`.
 *
 * ## The 11 routes and which half of the server code answers them
 *
 * Nine are one-line `forwardToGauzy` proxies, each called with **no options at all**
 * (`grep -rn "return forwardToGauzy(req, '/integration" app/api/integration --include=route.ts` answers exactly 9 lines,
 * line 5 of each of the nine files — the wider `grep -rn forwardToGauzy app/api/integration` answers 111 lines because
 * that family also holds the mapping/conflict/metadata routes, which are not here):
 * `GET /api/integration/{asana,jira,linear,trello}/status` (`app/api/integration/asana/status/route.ts:5` and its three
 * siblings), `POST /api/integration/{asana,jira,linear,trello}/install/state`
 * (`app/api/integration/asana/install/state/route.ts:5` and siblings) and `POST /api/integration/trello/connect`
 * (`app/api/integration/trello/connect/route.ts:5`). What their refusal, cut, media-type and cross-site contract looks
 * like as a family is already pinned in `suites/lane-b/forward-refusals.spec.ts`; the rows here pin what each of these
 * routes does with **its own path, body and query**, which is where they differ from one another.
 *
 * Two are not proxies at all, and both run `authenticatedGuard` (`core/services/server/guards/authenticated-guard-app.ts:55`)
 * and then a `serverFetch` call of their own. `POST /api/integration/github/install` (`app/api/integration/github/install/
 * route.ts:6-26`, which starts with its own `refuseForeignOrigin` at `:7`) still makes that call **with no `try`/`catch`
 * and no `gauzyErrorResponse`**; `GET /api/integration-tenant/remember/state` (`app/api/integration-tenant/remember/state/
 * route.ts:6-29`, a read with no site check) no longer does: develop wrapped its read in a `try` (`:14-28`) and answers a
 * failure through `gauzyErrorResponse` (`:25-27`), the line its own comment describes — "A refusal of the API goes back
 * with its status and reason, as in direct mode (#5726)" (`:26`). They call `installGitHubIntegration`
 * (`core/services/server/requests/integrations/github.ts:7-23`) and `getIntegrationTenantRequest`
 * (`core/services/server/requests/integrations/integration-tenant.ts:12-27`), which build the upstream query themselves
 * out of the session's cookies.
 *
 * `GET /api/integration/types` and `GET /api/integration` are deliberately **not** here: both are already pinned, control
 * and armed refusal, in `suites/lane-c/gauzy-refusals-relayed.spec.ts` — `:428-435` (`the integrations read`) and
 * `:438-445` (`the integration types read`). `POST /api/integration` is not a route at
 * all — `app/api/integration/route.ts` exports a `GET` only (`:6`), and the 405 Next gives it is pinned by the verb block
 * below and by `suites/lane-b/verify-status.spec.ts` for the family.
 *
 * ## What every route was measured on
 *
 * A control (signed in, nothing armed, the body/query the client of that route actually sends — `asana.service.ts:26,32`,
 * `trello.service.ts:25-38`, `github.service.ts:18`, `integration-tenant.service.ts:22`), the same call signed out, the
 * four armed upstream refusals 400, 401, 403 and 429 on the route's own upstream path, a cut (`drops`) call, its own
 * malformed-body cases (bodiless, unparseable bytes under a JSON media type, form-encoded, `text/plain` JSON, a body with
 * no media type it declares, unknown keys, 200 KB), the cross-site trio (`Sec-Fetch-Site: cross-site`, `Sec-Fetch-Site:
 * same-site`, `Origin: https://evil.example`) plus a same-origin control on every write, the query keys that travel
 * upstream, and `Cache-Control` + media type on every answer. Each case reads the mock's request log
 * (`playwright/api-fixtures.ts` `mock.requests()`), whose entries carry `method`, `path`, `query` and `status` and nothing
 * else (`cypress/support/mock-gauzy-server.mjs:1191-1199`): an upstream **verb, path and query key list** are provable, a
 * POST body is not — so where a body is the only carrier, the witness is either the mock's echo (it answers a write with
 * the body it was given, `:894`) or a pair of tenant-keyed arms (`fails` is read as `<tenant>:<path>` first,
 * `:1158-1163`, and the tenant is the `tenant-id` header the app writes from the session — `forward-to-gauzy.ts:97`, `:119`
 * for the nine, `core/services/server/fetch.ts:95-97` for the two request builders). Neither is ever armed on
 * `/api/user/me` nor on a bare tenant id.
 *
 * ## The findings, stated up front (each one pinned on the row it names; the rows that answer something other than what
 * the code means to carry `MEASURED, NOT INTENDED`)
 *
 * 1. **No answer of the nine `forwardToGauzy` routes carries `Cache-Control` at all — including the four minted install
 *    `state`s and the `trello/connect` answer.** (That answer is the connection summary, `ITrelloConnectionSummary` at
 *    `core/types/interfaces/integrations/trello.ts:3-14`, no token in it — Trello's token travels in the request.) The
 *    upstream marks them `no-store` and the proxy drops it. None of the nine passes `{ noStore: true }`
 *    (`grep -rn "noStore: true" app/api --include=route.ts` answers 13 lines across 11 files, none of them under
 *    `app/api/integration*`), so `answerHeaders` writes a media type only (`core/services/server/forward-to-gauzy.ts:22-28`)
 *    — the option whose own doc line is "for a route whose answer can hold a secret shown once … which no cache on the way
 *    may keep" (`:54-58`). Measured on the control, on all four armed refusals, on a 200 KB body and on a bodiless write:
 *    `cache-control` is absent. The contrast is pinned in the same run: the upstream itself marks these very answers
 *    `Cache-Control: no-store` (`mock-gauzy-server.mjs:1093`, in the headers written at `:1218`), and a route that did ask
 *    for `noStore` — `app/api/auth/sessions/route.ts:8` — hands that `no-store` on. So it is the missing option, not the
 *    mock and not the helper.
 * 2. **`POST /api/integration/github/install` is the one route of this family that answers an upstream refusal, a 401 from
 *    the platform and an outage with a bare 500: no body, no media type, no `Cache-Control`.** It calls its request builder
 *    with no `catch` (`github/install/route.ts:15-23`) and `serverFetch` rejects every non-2xx answer with Gauzy's body
 *    inside a rejected promise (`core/services/server/fetch.ts:125-131`); nothing unwraps it here, so the throw reaches
 *    Next. Measured for all four armed statuses on its own path and for a cut: 500, `""`, `content-type` absent. Every
 *    other guarded route of the family catches and answers `gauzyErrorResponse` — `app/api/integration/types/route.ts:19-22`
 *    and `app/api/integration/route.ts:24-27` ("A refusal of the API goes back with its status and reason, as in direct
 *    mode (#5726)" — `types/route.ts:20`), and `app/api/integration-tenant/remember/state/route.ts:25-27`, whose
 *    `serverFetch` call **used** to be uncoded like this one and was fixed on develop for exactly that reason (commit
 *    984c8fe43, "the integration state proxy route passes the API's refusal on (#5726)"): measured there, an armed 400,
 *    401, 403 and 429 come back as that status with Gauzy's own body, and a cut call as 502
 *    `{"message":"The integration could not be read."}` (`gauzy-error-response.ts:24-37`), each in this app's media type —
 *    pinned on the `remember/state` rows below, which no longer carry `MEASURED, NOT INTENDED`. The client consequence of
 *    the route that is left is measurable too: an armed 429 (rate limited) and an unreachable API both become 500 for
 *    `github.service.ts:18`, which is what the browser clients re-authenticate or retry on (`core/services/client/api.service.ts`
 *    reads the HTTP status).
 * 3. **`POST /api/integration/github/install` answers Gauzy's payload wrapped in `{"data": … , "response": {}}`.**
 *    `installGitHubIntegration` returns what `serverFetch` resolves — `{data, response}` (`fetch.ts:134-137`) — and
 *    `github/install/route.ts:25` hands that whole object to `$res`, while `remember/state/route.ts:24` of the same family
 *    passes `response.data`. In direct mode the same call answers the payload itself, so the two modes of this one route
 *    differ by that wrapper; measured: `{"data":{"tenantId":…,"organizationId":…,"installation_id":…,"setup_action":…},`
 *    `"response":{}}`. Nothing in this repo reads the wrapper (`use-github-integration.ts:77-89` uses the mutation only for
 *    its success), which is why no page breaks today.
 * 4. **A bodiless, typeless `POST` still mints a state, and a JSON body that is not an object is handed on as it arrived.**
 *    `forward-to-gauzy.ts:103-107` refuses a *declared* non-JSON media type (415, nothing asked) and a body that declares
 *    nothing (415), but a write with no body and no type at all passes and the state is minted anyway: measured 200 for all
 *    four `install/state` routes and for `trello/connect`. A body the mock cannot parse (unparseable bytes under
 *    `application/json`) is relayed unchanged and answers 200, and a JSON body that is a string (`"lane-b-string"`) comes
 *    back as that string: proof that this app forwards the bytes without parsing or validating them (`:106`, `:121`).
 *    `github/install` is the opposite of both: a bodiless POST, an unparseable body and a body of `null` all crash its
 *    `await req.json()` (`:13`) → 500 with nothing asked, while a `text/plain` JSON body and a typeless JSON body are
 *    parsed and installed (200) because that route never looks at a media type.
 * 5. **Which writes have an origin check, and where the check lives.** The nine forwarders are checked by the helper
 *    (`forward-to-gauzy.ts:89-90` → `core/services/server/same-origin-request.ts:43-46`): the trio is answered 403
 *    `{"statusCode":403,"message":"Cross-site request refused"}` **with `Cache-Control: no-store`** (`:48-53` of that file)
 *    and the mock was asked nothing, bodiless or not. `github/install` is checked by its own line 7 before the guard, and
 *    the same trio (even with its upstream armed) gives the same 403 with an empty log. The five reads — the four `status`
 *    routes and `remember/state` — are not checked at all, and the same headers on them change nothing, which is what
 *    `same-origin-request.ts:43-46` says a read is. `suites/api/foreign-origin.generated.ts:649-660` lists the family
 *    generically (`guard: 'proxy-helper'` vs `guard: 'route'`); the rows here pin the answer and the empty log per route.
 * 6. **A caller's `?organizationId=` wins on the four `status` reads, because these routes put no session organization in
 *    the query at all.** `forward-to-gauzy.ts:112` appends `new URL(req.url).search` to the path the route fixed, measured
 *    with `?organizationId=<organization B>&laneProbe=7&where[tenantId]=<tenant B>`: all three keys travel, values and all,
 *    including a repeated `organizationId` (both values) and an empty one — while the `tenant-id` header stays the
 *    session's (its arm pair, below). The route comment promises this ("`?organizationId=` passes through",
 *    `app/api/integration/asana/status/route.ts:3`), and `authenticated-guard-app.ts:46-53` states why the platform, not
 *    this app, decides what a token may read; so it is pinned as measured-and-intended. The same query hand-on runs on the
 *    four `install/state` writes and on `trello/connect` (`?state=fromQuery&laneProbe=7` travelled alongside a body naming
 *    another state). The two non-proxy routes are the opposite: `github/install` sent **no** query at all with
 *    `?organizationId=<other>&laneProbe=7` on the request (`requests/integrations/github.ts:16-23` builds its own path),
 *    and `remember/state` took only `?name=` and built `where[organizationId]` / `where[tenantId]` from the cookies
 *    (`requests/integrations/integration-tenant.ts:16-21`), so a caller-sent `?organizationId=` is ignored there.
 * 7. **The tenant that travels is the session's cookie, on all 11 routes.** An arm keyed `<tenant A>:<the route's own `
 *    path>` fires for the fixture's session and the identical arm on `<tenant B>` never does; with `auth-tenant-id` removed
 *    from the session the tenant-keyed arm cannot fire at all while the same arm written as a bare path does — the header
 *    is what the mock reads the tenant off (`mock-gauzy-server.mjs:1103-1106`, `:1158-1163`), and both request builders
 *    write it only when a tenant was named (`fetch.ts:95-97`). For `github/install` that is also why a cookie-less caller's
 *    body carries no `tenantId` at all: the two fields come from the guard, never from the caller's body (measured with a
 *    body naming tenant B and organization B — the answer names the session's pair).
 *
 * ## Mock limits — branches this lane cannot answer, stated instead of faked
 *
 * - `cypress/support/mock-gauzy-server.mjs` has **no handler for any of these paths** except the two it already answered
 *   (`/api/integration/types` and `/api/integration` at `:880`); `grep -n "integration" cypress/support/mock-gauzy-server.mjs`
 *   answers nothing else for `/api/integration/**` or `/api/integration-tenant`. So every payload below is the mock's
 *   catch-all: a GET answers `{items:[],total:0}` (`:895`), a write echoes its own request body or `{success:true}`
 *   (`:894`), and only when the body parses as JSON (a `where[…]=` filter, an unparseable body). What is pinned is
 *   **this app's** handling — status, cache header, media type, which upstream call was made and with which query keys —
 *   not Gauzy's payload. The echo *is* used as a witness where a body is the only carrier of the payload: the minted
 *   `state` request, the Trello token+state, and `github/install`'s rebuilt body.
 * - A signed-out caller is answered by the two guarded routes as if they knew who they were, because this mock answers
 *   `GET /api/user/me` whatever arrives (`mock-gauzy-server.mjs:607`) and `authenticated-guard-app.ts:88` delegates the
 *   decision to the API. On `remember/state` that means the read went out with **no** `where[organizationId]` /
 *   `where[tenantId]` and no tenant header (measured), and on `github/install` the install went out at all. The nine
 *   forwarders refuse a cookie-less caller themselves (`forward-to-gauzy.ts:96`), with an empty log as proof. Same
 *   delegation already pinned in `suites/lane-c/session-check.spec.ts` and in `two-factor-proxy.spec.ts`.
 * - The guard's own refusal status (`authenticated-guard-app.ts:96-112`) cannot be pinned on this lane: arming
 *   `/api/user/me` would race the 5 s session-check memo (`guards/authenticated-guard-app.ts:29`,
 *   `guards/session-check-memo.ts`), which is also why `GET /api/user/me` is excepted from every log claim here.
 *   `github/install/route.ts:11` (`NextResponse.json({}, {status: status ?? 401})`) and `remember/state/route.ts:9`
 *   (`{error:'Unauthorized'}`) are therefore pinned as unreachable rows, not asserted.
 * - `extraPermissions` only adds permissions and only accepts upper-case names (`mock-gauzy-server.mjs:54-62`), and none of
 *   these 11 routes reads one (`grep -rn "refuseUnlessPermitted\|permission" app/api/integration app/api/integration-tenant`
 *   over the route files answers nothing), so `roleName: 'SUPER_ADMIN'`, `manager: true` and an integration permission are
 *   pinned as no-ops rather than as gates.
 * - A 60 s upstream timeout (`forward-to-gauzy.ts:8`, `UPSTREAM_TIMEOUT_MS`) is not reachable from a test: the caller's own
 *   budget is the same 60 000 ms (`playwright/api-fixtures.ts:101`). `499` needs a cancelled caller.
 * - A verb a route file does not export never reaches these handlers: Next answers 405 with no body and no media type, and
 *   the mock logs nothing (`verify-status.spec.ts` pins the family; seven rows here pin it for these routes).
 * - `next dev` is what the lane runs, so "500 with no body and no media type" is *this lane's* Next answer for a handler
 *   that threw. A production build answers the same throw with its own text; the pinned part is that this app wrote no
 *   answer and did not relay Gauzy's status.
 *
 * ## Cost
 *
 * 11 route rows × (control + signed out + 4 armed refusals + cut) = 77; 5 forward writes × 8 body/media-type cases = 40;
 * `github/install` 20 rows; `remember/state` 12 rows; 6 writes × (3 foreign + 2 own + 1 bodiless-cross-site) = 36, plus 5
 * cross-site reads = 41; 11 tenant-keyed arm pairs = 22, plus 4 arm-cannot-fire pairs (2 rows each) = 8 → 30; 10 query
 * rows; 7 verb rows; 4 `Cache-Control` rows; 2 "no gate here" rows. **243 cases**, collected as 243 tests
 * (`npx playwright test … integration-connect-routes --list`), every one green in every run named above.
 */

/** The four upstream refusals every route here is pinned on. */
const REFUSAL_STATUSES = [400, 401, 403, 429] as const;

/** The upstream paths, spelled as the mock records them: `GAUZY_API_SERVER_URL` is the base plus `/api`. */
const UP = '/api/integration';
const UP_GITHUB = '/api/integration/github/install';
const UP_TENANT = '/api/integration-tenant';
const SESSIONS = '/api/auth/sessions';
/** The session check the two guarded routes run first (`authenticated-guard-app.ts:76`), excepted from every log claim. */
const GUARD_CHECK = '/api/user/me';

const PLATFORMS = ['asana', 'jira', 'linear', 'trello'] as const;

/** The media type the mock writes on every answer it makes (`mock-gauzy-server.mjs:1218`), which `forwardToGauzy` copies. */
const UPSTREAM_MEDIA_TYPE = 'application/json; charset=utf-8';
/** The media type of an answer this app wrote itself (`NextResponse.json`). */
const OWN_MEDIA_TYPE = 'application/json';

/** The mock's refusal body (`mock-gauzy-server.mjs:1168-1169`). */
const gauzyRefusal = (status: number) => ({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });

/** The mock's answer to a GET it has no handler for (`mock-gauzy-server.mjs:895`). */
const MOCK_PAGE = { items: [], total: 0 };
/** The mock's answer to a write whose body it cannot parse (`:894`). */
const MOCK_SUCCESS = { success: true };

/** What `refuseForeignOrigin` / `refuseForeignWrite` answer (`same-origin-request.ts:48-53`). */
const FOREIGN_SITE_REFUSAL: Answer = ownJson(
	403,
	{ statusCode: 403, message: 'Cross-site request refused' },
	'no-store'
);
/** What `forwardToGauzy` answers a caller with no token cookie, before anything is asked (`:96`). */
const REFUSED_BY_THIS_APP: Answer = ownJson(401, { statusCode: 401, message: 'Unauthorized' }, null);
/** What `forwardToGauzy` answers when the upstream gave no answer at all (`failedUpstreamAnswer`, `:135-144`). */
const UNREACHABLE: Answer = ownJson(502, { statusCode: 502, message: 'The Gauzy API is unreachable' }, null);
/** The media-type refusal of the forward helper (`forward-to-gauzy.ts:30-31`, `:104`, `:107`). */
const UNSUPPORTED_MEDIA: Answer = ownJson(415, { statusCode: 415, message: 'Unsupported Media Type' }, null);
/** What Next answers a handler that threw — the one route of finding 2. */
const HANDLER_CRASH: Answer = { status: 500, text: '', contentType: null, cacheControl: null };

const NOT_INTENDED = ' [MEASURED, NOT INTENDED]';
const MOCK_LIMIT = ' [mock limit]';

/** A 200 KB filler, for the size rows: nothing on these routes looks at a byte count. */
const HUGE = 'x'.repeat(200_000);
/** The body the GitHub connect page posts (`use-github-integration.ts:79-84` posts these four keys). */
const GITHUB_BODY = () => ({ installation_id: 'lane-b-installation', setup_action: 'install' });
/** The body `trello.service.ts:37` posts. */
const CONNECT_BODY = (ids: Record<string, string>) => ({
	organizationId: ids.organizationA,
	token: 'lane-b-trello-token',
	state: 'lane-b-state'
});
/** The `?name=` the GitHub settings page asks with (`integration-tenant.service.ts:22`). */
const REMEMBER_NAME = 'Github';

/** One upstream call a route makes, and what its query must look like. */
type Ask = {
	method: 'GET' | 'POST';
	path: string;
	/** The query keys the mock recorded, sorted — a lost session key or a renamed path turns this red. */
	keys: string[];
	/** Keys that must NOT be there (a session id that vanished, a caller key that was not forwarded). */
	absent?: string[];
	/** The values that must arrive under these keys, where the value is the point (the session's organization). */
	values?: Record<string, string>;
	/** The status the mock recorded for this one call, when it differs from the case's other calls. */
	status?: number;
};

/** A measured answer. `body`, `text` and `shape` are alternatives; `contentType` / `cacheControl` are measured too. */
type Answer = {
	status: number;
	/** The parsed JSON body, when the answer is JSON of a known shape. */
	body?: unknown;
	/** The answer as text, when its exact bytes or its emptiness are the point. */
	text?: string;
	/** A predicate: `null` when the body matches, a sentence saying why when it does not. */
	shape?: (body: unknown) => string | null;
	/** The `content-type`, or `null` for "carries none at all". */
	contentType?: string | null;
	/** The `cache-control`, or `null` for "carries none" — which is the point of finding 1. */
	cacheControl?: string | null;
};

type WithIds<T> = T | ((ids: Record<string, string>) => T);
const resolve = <T>(value: WithIds<T>, ids: Record<string, string>): T =>
	typeof value === 'function' ? (value as (withIds: Record<string, string>) => T)(ids) : value;

/** An answer this app wrote itself: JSON on `status`, with this app's own media type. */
function ownJson(status: number, body: unknown, cacheControl?: string | null): Answer {
	return {
		status,
		body,
		contentType: OWN_MEDIA_TYPE,
		...(cacheControl === undefined ? {} : { cacheControl })
	};
}

/** A Gauzy refusal relayed by `forwardToGauzy`: Gauzy's status, body **and media type**, no `Cache-Control` (`:128-131`). */
const relayedByForward = (status: number): Answer => ({
	status,
	body: gauzyRefusal(status),
	contentType: UPSTREAM_MEDIA_TYPE,
	cacheControl: null
});

/**
 * A Gauzy refusal relayed by a route's own `catch` → `gauzyErrorResponse` (`core/services/server/gauzy-error-response.ts`):
 * Gauzy's status and body as they stand (`:31-37`), written by `NextResponse.json`, so in **this app's** media type and with
 * no `Cache-Control` — measured, unlike the `forwardToGauzy` copy.
 */
const relayedByCatch = (status: number): Answer => ownJson(status, gauzyRefusal(status), null);

type ContractRoute = {
	label: string;
	/** The verb the route file exports. */
	method: 'GET' | 'POST';
	/** Which half of the server code answers it, which is what the media type of the answer proves. */
	half: 'forwardToGauzy' | 'github-route' | 'remember-route';
	/** Who checks where a write comes from: the helper, the route file itself, or — for a read — nobody. */
	originCheck: 'helper' | 'route' | 'read';
	/** The app route, spelled as `api()` is called with it. */
	app: (ids: Record<string, string>) => string;
	/** The JSON body a write carries. */
	body?: (ids: Record<string, string>) => unknown;
	/** The upstream calls the control causes, in the order the mock recorded them. */
	asks: (ids: Record<string, string>) => Ask[];
	control: WithIds<Answer>;
	/** The same call with no session cookies: `asks` here is what survived it. */
	signedOut: WithIds<Answer & { asks: (ids: Record<string, string>) => Ask[] }>;
	/** The answer to an armed `fails` on the control's upstream path. */
	refusal: (status: number) => Answer;
	/** The answer to a `drops` cut of that same path. */
	drop: Answer;
	/** A row that says what was measured rather than what the code means to do. */
	notIntended?: string;
};

const ROUTES: ContractRoute[] = [
	...PLATFORMS.map((platform) => ({
		label: `GET /api/integration/${platform}/status`,
		method: 'GET' as const,
		half: 'forwardToGauzy' as const,
		originCheck: 'read' as const,
		// The client asks with `?organizationId=` (`asana.service.ts:26`), and that key is what reaches the platform.
		app: (ids: Record<string, string>) => `${UP}/${platform}/status?organizationId=${ids.organizationA}`,
		asks: (ids: Record<string, string>) => [
			{
				method: 'GET' as const,
				path: `${UP}/${platform}/status`,
				keys: ['organizationId'],
				values: { organizationId: ids.organizationA }
			}
		],
		// Mock limit: the mock has no handler here, so this is its `{items:[],total:0}` page, not an integration status.
		control: {
			status: 200,
			body: MOCK_PAGE,
			contentType: UPSTREAM_MEDIA_TYPE,
			cacheControl: null
		} satisfies Answer,
		// `forward-to-gauzy.ts:96` short-circuits on the cookie before the fetch at `:112`.
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] as Ask[] },
		refusal: (status: number) => relayedByForward(status),
		drop: UNREACHABLE
	})),
	...PLATFORMS.map((platform) => ({
		label: `POST /api/integration/${platform}/install/state`,
		method: 'POST' as const,
		half: 'forwardToGauzy' as const,
		originCheck: 'helper' as const,
		app: () => `${UP}/${platform}/install/state`,
		body: (ids: Record<string, string>) => ({ organizationId: ids.organizationA }),
		// No query key at all: the organization travels in the body, which the log cannot show — the mock's echo is the witness.
		asks: () => [{ method: 'POST' as const, path: `${UP}/${platform}/install/state`, keys: [] as string[] }],
		// The echo is the body this app put upstream, key for key (`trello.service.ts:31` sends exactly this).
		control: (ids: Record<string, string>) =>
			({
				status: 200,
				body: { organizationId: ids.organizationA },
				contentType: UPSTREAM_MEDIA_TYPE,
				cacheControl: null
			}) satisfies Answer,
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] as Ask[] },
		refusal: (status: number) => relayedByForward(status),
		drop: UNREACHABLE,
		notIntended: 'the single-use state this route mints comes back with no Cache-Control (finding 1)'
	})),
	{
		label: 'POST /api/integration/trello/connect',
		method: 'POST',
		half: 'forwardToGauzy',
		originCheck: 'helper',
		app: () => `${UP}/trello/connect`,
		body: CONNECT_BODY,
		asks: () => [{ method: 'POST', path: `${UP}/trello/connect`, keys: [] }],
		// Mock limit: the echo is the caller's own token and state, where Gauzy answers the connection summary.
		control: (ids) =>
			({
				status: 200,
				body: CONNECT_BODY(ids),
				contentType: UPSTREAM_MEDIA_TYPE,
				cacheControl: null
			}) satisfies Answer,
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] },
		refusal: (status) => relayedByForward(status),
		drop: UNREACHABLE,
		notIntended:
			'the connect answer comes back with no Cache-Control although the upstream marks it no-store (finding 1)'
	},
	{
		label: 'POST /api/integration/github/install',
		method: 'POST',
		half: 'github-route',
		originCheck: 'route',
		app: () => UP_GITHUB,
		body: GITHUB_BODY,
		// `installGitHubIntegration` names no query at all (`requests/integrations/github.ts:16-23`): the body is the carrier.
		asks: () => [{ method: 'POST', path: UP_GITHUB, keys: [] }],
		control: (ids) =>
			({
				status: 200,
				body: {
					data: { tenantId: ids.tenantA, organizationId: ids.organizationA, ...GITHUB_BODY() },
					response: {}
				},
				contentType: OWN_MEDIA_TYPE,
				cacheControl: null
			}) satisfies Answer,
		// [mock limit] the mock answered `GET /user/me` with no bearer, so the handler ran; the session fields are simply
		// absent from the body, because they come from the cookies and nowhere else.
		signedOut: {
			status: 200,
			body: { data: { ...GITHUB_BODY() }, response: {} },
			contentType: OWN_MEDIA_TYPE,
			cacheControl: null,
			asks: () => [{ method: 'POST', path: UP_GITHUB, keys: [] }]
		},
		refusal: () => HANDLER_CRASH,
		drop: HANDLER_CRASH,
		notIntended:
			"the payload is wrapped in {data, response} (finding 3) and an upstream refusal is this app's bare 500 (finding 2)"
	},
	{
		label: 'GET /api/integration-tenant/remember/state',
		method: 'GET',
		half: 'remember-route',
		originCheck: 'read',
		app: () => `${UP_TENANT}/remember/state?name=${REMEMBER_NAME}`,
		// The three keys `getIntegrationTenantRequest` builds from the session (`requests/integrations/integration-tenant.ts:16-20`).
		asks: (ids) => [
			{
				method: 'GET',
				path: UP_TENANT,
				keys: ['where[name]', 'where[organizationId]', 'where[tenantId]'],
				values: {
					'where[name]': REMEMBER_NAME,
					'where[organizationId]': ids.organizationA,
					'where[tenantId]': ids.tenantA
				}
			}
		],
		// Mock limit: the mock has no `/api/integration-tenant` GET handler, so the answer is its `{items:[],total:0}` page.
		control: ownJson(200, MOCK_PAGE, null),
		// [mock limit] the guard delegated; what the read lost is the session scoping, `where[name]` alone travelled.
		signedOut: {
			...ownJson(200, MOCK_PAGE, null),
			asks: () => [
				{
					method: 'GET',
					path: UP_TENANT,
					keys: ['where[name]'],
					absent: ['where[organizationId]', 'where[tenantId]'],
					values: { 'where[name]': REMEMBER_NAME }
				}
			]
		},
		// `route.ts:25-27` catches and hands the failure to `gauzyErrorResponse`, so the refusal keeps Gauzy's status and
		// body; with nothing to relay the same catch answers 502 and the route's own sentence (`route.ts:27`).
		refusal: (status: number) => relayedByCatch(status),
		drop: ownJson(502, { message: 'The integration could not be read.' }, null)
	}
];

/** A route row by its label, for the blocks below that reuse a row's own control answer. */
function byLabel(label: string): ContractRoute {
	const route = ROUTES.find((candidate) => candidate.label === label);
	if (!route) throw new Error(`no contract route is labelled ${label}`);
	return route;
}

const asanaStatusRoute = byLabel('GET /api/integration/asana/status');
const asanaStateRoute = byLabel('POST /api/integration/asana/install/state');
const connectRoute = byLabel('POST /api/integration/trello/connect');
const githubRoute = byLabel('POST /api/integration/github/install');
const rememberRoute = byLabel('GET /api/integration-tenant/remember/state');
const FORWARD_WRITE_ROUTES = ROUTES.filter((route) => route.half === 'forwardToGauzy' && route.method === 'POST');
const WRITE_ROUTES = ROUTES.filter((route) => route.method !== 'GET');
const READ_ROUTES = ROUTES.filter((route) => route.method === 'GET');

/** The mock's entry for one path, or nothing when the mock was never asked. */
const asksFor = (requests: StubRequest[], path: string): StubRequest[] =>
	requests.filter((request) => request.path === path);

/** The query keys one recorded call carried, sorted and de-duplicated. */
const keysOf = (request: { query: string }): string[] =>
	[...new Set([...new URLSearchParams(request.query).keys()])].sort();

/** The values one recorded call carried under the keys that matter, as one object for one assertion. */
const valuesOf = (request: StubRequest, wanted: Record<string, string>) => {
	const params = new URLSearchParams(request.query);
	return Object.fromEntries(
		Object.keys(wanted)
			.sort((a, b) => a.localeCompare(b))
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
	`${JSON.stringify(body.slice(0, 200))}`;

/** The witness every assertion below ends with, and the line every case prints before it asserts. */
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

const pathsOf = (asks: Ask[]): string[] => asks.map((ask) => ask.path);

/** One `api()` call for a route row, with the overrides the extra cases need. */
type CallOverride = {
	path?: string;
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	/** An object goes as JSON, a string goes as it arrived under the media type named below. */
	body?: unknown;
	/** Send no body at all, even when the row carries one. */
	noBody?: boolean;
	/** A `Content-Type` of its own, for the cases that send something other than JSON; `''` declares none. */
	contentType?: string;
	headers?: Record<string, string>;
	anonymous?: boolean;
	scope?: 'A' | 'B';
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
	let body: unknown;
	if (override.noBody) body = undefined;
	else if (override.body !== undefined) body = override.body;
	else if (route.body) body = route.body(ids);

	const headers: Record<string, string> = { ...(override.headers ?? {}) };
	if (override.contentType !== undefined) headers['content-type'] = override.contentType;
	if (override.cookieWithout) headers.cookie = cookies(override.scope ?? 'A', [override.cookieWithout]);

	const response = await api(path, {
		method,
		...(body === undefined ? {} : { body }),
		...(override.anonymous ? { anonymous: true } : {}),
		...(override.scope ? { scope: override.scope } : {}),
		...(Object.keys(headers).length ? { headers } : {})
	});
	return { response, text: await response.text(), path };
}

/** The assertions every case shares: the upstream asks, their scoping values, and the answer this route gave. */
function expectRouteAnswer(
	asked: Ask[],
	/** The status the mock recorded for every ask of this case: 200, an armed 4xx, or the drop's 0. */
	askedStatus: number,
	response: APIResponse,
	text: string,
	path: string,
	log: StubRequest[],
	answer: Answer,
	why: string
) {
	const witness = witnessOf(path, response, text, log, pathsOf(asked));
	const parsed = parseAnswer(text);

	expect(response.status(), `${why}: the answer moved off ${answer.status} — ${witness}`).toBe(answer.status);

	if (answer.body !== undefined) {
		expect(
			parsed,
			`${why}: the answer body is no longer what this route answers (${JSON.stringify(answer.body).slice(0, 220)} vs ` +
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

	// Nothing else was asked. `GET /api/user/me` is excepted on purpose: the session check answers are reused per token
	// for `SESSION_CHECK_MEMO_TTL_MS` (`guards/authenticated-guard-app.ts:29`, `guards/session-check-memo.ts`), so whether
	// that read lands in this log depends on what ran seconds earlier — never on the route under test.
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

const noteOf = (route: ContractRoute): string => (route.notIntended ? NOT_INTENDED : '');

const signedOutNote = (route: ContractRoute): string =>
	route.half === 'forwardToGauzy'
		? 'this app refuses, and the mock was asked nothing'
		: 'the guard delegates, so only the session scoping disappears [mock limit: this mock answers /user/me with no bearer, Gauzy refuses it]';

test.describe('lane-b · the 11 connect routes, each pinned on its own upstream call', () => {
	for (const route of ROUTES) {
		test(`${route.label}: control — one call, on this path, with these keys${noteOf(route)}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const asked = route.asks(ids);
			const { response, text, path } = await callRoute(api, cookies, route, ids);
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE control ${witnessOf(path, response, text, log, pathsOf(asked))}`);

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

		test(`${route.label}: signed out — ${signedOutNote(route)}`, async ({ api, mock, ids, cookies }) => {
			const answer = resolve(route.signedOut, ids);
			const asked = answer.asks(ids);
			const { response, text, path } = await callRoute(api, cookies, route, ids, { anonymous: true });
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE signed-out ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(asked, 200, response, text, path, log, answer, `${route.label} signed out`);

			if (route.half === 'forwardToGauzy') {
				// An empty log is the proof that this app, and not the platform, refused (`forward-to-gauzy.ts:96`).
				expect(
					triples(log),
					`${route.label}: a caller with no session cookie reached the test backend at all (${logOf(log)}) — the ` +
						'refusal must come from this app'
				).toEqual([]);
			}
		});

		for (const status of REFUSAL_STATUSES) {
			test(`${route.label}: an upstream ${status} on its own path is ${
				route.half === 'forwardToGauzy'
					? 'relayed as it arrived'
					: route.half === 'github-route'
						? "turned into this app's bare 500"
						: "relayed with Gauzy's status and body, under this app's own media type"
			}${noteOf(route)}`, async ({ api, mock, ids, cookies }) => {
				const firstAsk = route.asks(ids)[0];
				await mock.scenario({ fails: { [`${ids.tenantA}:${firstAsk.path}`]: status } });

				const { response, text, path } = await callRoute(api, cookies, route, ids);
				const log = await mock.requests();
				const asked = [{ ...firstAsk, status }];

				console.log(
					`[lane-b integ] MEASURE armed-${status} ${witnessOf(path, response, text, log, pathsOf(asked))}`
				);

				expectRouteAnswer(
					asked,
					status,
					response,
					text,
					path,
					log,
					route.refusal(status),
					`${route.label} with ${ids.tenantA}:${firstAsk.path} armed ${status}`
				);
				expect(
					triples(await mock.failures()),
					`${route.label}: the armed ${status} is missing from the failures view (${logOf(log)})`
				).toEqual([`${firstAsk.method} ${firstAsk.path} ${status}`]);
			});
		}

		test(`${route.label}: a cut upstream call is answered${noteOf(route)}`, async ({ api, mock, ids, cookies }) => {
			const firstAsk = route.asks(ids)[0];
			await mock.scenario({ drops: { [`${ids.tenantA}:${firstAsk.path}`]: 1 } });

			const { response, text, path } = await callRoute(api, cookies, route, ids);
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE cut ${witnessOf(path, response, text, log, [firstAsk.path])}`);

			expectRouteAnswer(
				[{ ...firstAsk, status: 0 }],
				0,
				response,
				text,
				path,
				log,
				route.drop,
				`${route.label} with ${ids.tenantA}:${firstAsk.path} cut`
			);
			expect(
				await mock.failures(),
				`${route.label}: a cut call was counted as a refusal, which would make every "was refused upstream" ` +
					`witness in this lane mean two things (${logOf(log)})`
			).toEqual([]);
		});
	}
});

/** One measured body or media-type case for one of the five forward writes. */
type ForwardBodyShape = {
	label: string;
	/** The `data` the fixture sends: an object goes as JSON, a string as it arrived, a Buffer as raw bytes. */
	send?: (ids: Record<string, string>, route: ContractRoute) => unknown;
	contentType?: string;
	noBody?: boolean;
	/** `false` pins "the mock was asked nothing at all". */
	asked?: boolean;
	answer: (ids: Record<string, string>, route: ContractRoute) => Answer;
	notIntended?: string;
};

const relayedAnswer = (body: unknown): Answer => ({
	status: 200,
	body,
	contentType: UPSTREAM_MEDIA_TYPE,
	cacheControl: null
});

/** The answer of a `status` read: the mock's page, with the upstream media type copied (`forward-to-gauzy.ts:128-131`). */
const FORWARD_READ_CONTROL: Answer = {
	status: 200,
	body: MOCK_PAGE,
	contentType: UPSTREAM_MEDIA_TYPE,
	cacheControl: null
};

/** The body a forward-write row carries, as an object this table can copy and extend. */
const bodyOf = (route: ContractRoute, ids: Record<string, string>): Record<string, unknown> =>
	(route.body as (i: Record<string, string>) => Record<string, unknown>)(ids);

const FORWARD_BODY_SHAPES: ForwardBodyShape[] = [
	{
		label: 'no body at all — 200, the state was minted anyway',
		noBody: true,
		// `:103-107`: a write with neither a body nor a declared type is not a media-type problem, so it goes out.
		answer: () => relayedAnswer(MOCK_SUCCESS),
		notIntended: 'a bodiless POST still starts the connect flow (`forward-to-gauzy.ts:103-107`)'
	},
	{
		label: 'unparseable bytes under application/json — relayed, the mock could not read them',
		send: () => Buffer.from('not json at all {'),
		contentType: 'application/json',
		answer: () => relayedAnswer(MOCK_SUCCESS),
		notIntended: 'the body is handed on without being parsed or validated (`forward-to-gauzy.ts:106`, `:121`)'
	},
	{
		label: 'a JSON body that is a string, not an object — relayed as it arrived',
		// Playwright passes a JSON-parsable string through unchanged (`client/fetch.js:149-151`), so the bytes that arrive
		// are "lane-b-string" and the mock echoes its own parse back.
		send: () => '"lane-b-string"',
		contentType: 'application/json',
		answer: () => relayedAnswer('lane-b-string'),
		notIntended: 'no shape is checked on this body, not even that it is an object'
	},
	{
		label: 'an application/x-www-form-urlencoded body — 415, nothing was asked',
		send: (ids) => `organizationId=${ids.organizationA}`,
		contentType: 'application/x-www-form-urlencoded',
		asked: false,
		answer: () => UNSUPPORTED_MEDIA
	},
	{
		label: 'a JSON body declared as text/plain — 415, nothing was asked',
		send: (ids, route) => JSON.stringify(bodyOf(route, ids)),
		contentType: 'text/plain',
		asked: false,
		answer: () => UNSUPPORTED_MEDIA
	},
	{
		label: 'a JSON body with no media type declared — 415, nothing was asked',
		send: (ids, route) => JSON.stringify(bodyOf(route, ids)),
		contentType: '',
		asked: false,
		answer: () => UNSUPPORTED_MEDIA
	},
	{
		label: 'an unknown key is relayed as the whole body — 200',
		send: () => ({ nope: 1 }),
		answer: () => relayedAnswer({ nope: 1 })
	},
	{
		label: 'a 200 KB body is relayed whole — 200, no size cap on this family',
		send: (ids, route) => ({ ...bodyOf(route, ids), huge: HUGE }),
		answer: (ids, route) => relayedAnswer({ ...bodyOf(route, ids), huge: HUGE })
	}
];

test.describe('lane-b · what the five forward writes do with a body, and which bodies never leave', () => {
	for (const route of FORWARD_WRITE_ROUTES) {
		for (const shape of FORWARD_BODY_SHAPES) {
			test(`${route.label}: ${shape.label}${shape.notIntended ? NOT_INTENDED : ''}`, async ({
				api,
				mock,
				ids,
				cookies
			}) => {
				const ask = route.asks(ids)[0];
				const asked = shape.asked === false ? [] : [ask];
				const { response, text, path } = await callRoute(api, cookies, route, ids, {
					...(shape.send === undefined ? {} : { body: shape.send(ids, route) }),
					...(shape.contentType === undefined ? {} : { contentType: shape.contentType }),
					...(shape.noBody ? { noBody: true } : {})
				});
				const log = await mock.requests();

				console.log(`[lane-b integ] MEASURE body ${witnessOf(path, response, text, log, pathsOf(asked))}`);

				expectRouteAnswer(
					asked,
					200,
					response,
					text,
					path,
					log,
					shape.answer(ids, route),
					`${route.label} ${shape.label}`
				);
			});
		}
	}
});

/** A measured row of `POST /api/integration/github/install`. */
type RouteRow = {
	label: string;
	send?: unknown;
	/** A body built from the fixture ids, when a row is about "the caller named the other tenant". */
	sendIds?: (ids: Record<string, string>) => unknown;
	contentType?: string;
	noBody?: boolean;
	anonymous?: boolean;
	cookieWithout?: string;
	scope?: 'A' | 'B';
	path?: (ids: Record<string, string>) => string;
	headers?: Record<string, string>;
	/** Arms for this row alone, spelled once the fixture ids exist. */
	scenario?: (ids: Record<string, string>) => Record<string, unknown>;
	/** The upstream calls this row is pinned on; `[]` means "the mock was asked nothing at all". */
	asks?: (ids: Record<string, string>) => Ask[];
	askedStatus?: number;
	answer: WithIds<Answer>;
	notIntended?: string;
};

const githubAnswer = (fields: Record<string, unknown>): Answer => ({
	status: 200,
	body: { data: fields, response: {} },
	contentType: OWN_MEDIA_TYPE,
	cacheControl: null
});

const GITHUB_ROWS: RouteRow[] = [
	{
		label: 'the body may name another tenant and organization; what travels is the session pair',
		sendIds: (ids) => ({ ...GITHUB_BODY(), tenantId: ids.tenantB, organizationId: ids.organizationB }),
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA, ...GITHUB_BODY() })
	},
	{
		label: 'a session with its token cookie missing installs anyway — the guard delegated' + MOCK_LIMIT,
		cookieWithout: 'auth-token',
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA, ...GITHUB_BODY() })
	},
	{
		label: 'a session with its organization cookie installs without that field',
		cookieWithout: 'auth-organization-id',
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, ...GITHUB_BODY() })
	},
	{
		label: 'a session with its tenant cookie installs without that field (its arm row is in the tenant block)',
		cookieWithout: 'auth-tenant-id',
		answer: (ids) => githubAnswer({ organizationId: ids.organizationA, ...GITHUB_BODY() })
	},
	{
		label: "the fixture's other workspace installs into the other tenant",
		scope: 'B',
		answer: (ids) => githubAnswer({ tenantId: ids.tenantB, organizationId: ids.organizationB, ...GITHUB_BODY() })
	},
	{
		label: 'no body at all — the handler crashed on `await req.json()`, nothing was asked',
		noBody: true,
		asks: () => [],
		answer: () => HANDLER_CRASH,
		notIntended: 'a 500 with no body and no media type, where no upstream call was made (`route.ts:13`)'
	},
	{
		label: 'a body that is not JSON at all — 500, nothing was asked',
		send: Buffer.from('not json at all {'),
		contentType: 'application/json',
		asks: () => [],
		answer: () => HANDLER_CRASH
	},
	{
		label: 'a body of `null` — 500, because destructuring null throws',
		send: 'null',
		contentType: 'application/json',
		asks: () => [],
		answer: () => HANDLER_CRASH
	},
	{
		label: 'an application/x-www-form-urlencoded body — 500 (no 415 here: this route never reads a media type)',
		send: 'installation_id=x',
		contentType: 'application/x-www-form-urlencoded',
		asks: () => [],
		answer: () => HANDLER_CRASH
	},
	{
		label: 'a JSON body declared as text/plain — installed, because `req.json()` parses it',
		send: JSON.stringify(GITHUB_BODY()),
		contentType: 'text/plain',
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA, ...GITHUB_BODY() })
	},
	{
		label: 'a JSON body with no media type declared — installed',
		send: JSON.stringify(GITHUB_BODY()),
		contentType: '',
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA, ...GITHUB_BODY() })
	},
	{
		label: 'a JSON body that is a string — installed with neither field, so only the session fields travel',
		send: '"lane-b-string"',
		contentType: 'application/json',
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA })
	},
	{
		label: 'an array body — installed with neither field',
		send: '[1,2]',
		contentType: 'application/json',
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA })
	},
	{
		label: 'an empty object — installed with neither field',
		send: {},
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA })
	},
	{
		label: 'an unknown key is dropped, not forwarded',
		send: { nope: 1 },
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA })
	},
	{
		label: 'only setup_action — the installation id is simply absent upstream',
		send: { setup_action: 'install' },
		answer: (ids) =>
			githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA, setup_action: 'install' })
	},
	{
		label: 'a numeric installation_id is handed on as a number',
		send: { installation_id: 123, setup_action: 'install' },
		answer: (ids) =>
			githubAnswer({
				tenantId: ids.tenantA,
				organizationId: ids.organizationA,
				installation_id: 123,
				setup_action: 'install'
			})
	},
	{
		label: 'a 200 KB body: 200, and only the two named fields travel',
		send: { ...GITHUB_BODY(), huge: HUGE },
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA, ...GITHUB_BODY() })
	},
	{
		label: 'a caller query is not forwarded at all: the request builder names its own path',
		path: (ids) => `${UP_GITHUB}?organizationId=${ids.organizationB}&laneProbe=7`,
		asks: () => [{ method: 'POST', path: UP_GITHUB, keys: [], absent: ['organizationId', 'laneProbe'] }],
		answer: (ids) => githubAnswer({ tenantId: ids.tenantA, organizationId: ids.organizationA, ...GITHUB_BODY() })
	},
	{
		label: 'cross-site with the upstream armed: the site check answers before the crash',
		headers: { 'sec-fetch-site': 'cross-site' },
		scenario: () => ({ fails: { [UP_GITHUB]: 403 } }),
		asks: () => [],
		answer: () => FOREIGN_SITE_REFUSAL
	}
];

test.describe('lane-b · POST /api/integration/github/install: no try/catch, rebuilt body, own origin check', () => {
	for (const row of GITHUB_ROWS) {
		test(`POST /api/integration/github/install: ${row.label}${row.notIntended ? NOT_INTENDED : ''}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			if (row.scenario) await mock.scenario(row.scenario(ids));

			const asked = row.asks ? row.asks(ids) : githubRoute.asks(ids);
			const send = row.sendIds ? row.sendIds(ids) : row.send;
			const { response, text, path } = await callRoute(api, cookies, githubRoute, ids, {
				...(row.path ? { path: row.path(ids) } : {}),
				...(send === undefined ? {} : { body: send }),
				...(row.contentType === undefined ? {} : { contentType: row.contentType }),
				...(row.noBody ? { noBody: true } : {}),
				...(row.anonymous ? { anonymous: true } : {}),
				...(row.cookieWithout ? { cookieWithout: row.cookieWithout } : {}),
				...(row.scope ? { scope: row.scope } : {}),
				...(row.headers ? { headers: row.headers } : {})
			});
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE github ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(
				asked,
				row.askedStatus ?? 200,
				response,
				text,
				path,
				log,
				resolve(row.answer, ids),
				`POST /api/integration/github/install ${row.label}`
			);
		});
	}
});

const rememberApp = (query: string) => `${UP_TENANT}/remember/state${query}`;

/** The three session keys of a signed-in read, as `getIntegrationTenantRequest` builds them. */
const rememberAsk = (ids: Record<string, string>, name: string | null): Ask => ({
	method: 'GET',
	path: UP_TENANT,
	keys:
		name === null
			? ['where[organizationId]', 'where[tenantId]']
			: ['where[name]', 'where[organizationId]', 'where[tenantId]'],
	absent: name === null ? ['where[name]'] : undefined,
	values: {
		...(name === null ? {} : { 'where[name]': name }),
		'where[organizationId]': ids.organizationA,
		'where[tenantId]': ids.tenantA
	}
});

const REMEMBER_ROWS: RouteRow[] = [
	{
		label: 'a name of another case travels exactly as it was written',
		path: () => rememberApp('?name=JIRA'),
		asks: (ids) => [rememberAsk(ids, 'JIRA')],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: 'no `?name=` at all — the filter is simply not built, the read still happens',
		path: () => rememberApp(''),
		asks: (ids) => [rememberAsk(ids, null)],
		answer: () => ownJson(200, MOCK_PAGE, null),
		notIntended: 'a name-less lookup asks for every integration of the organization (`route.ts:12`)'
	},
	{
		label: 'an empty `?name=` is the same as no name at all (`searchParams.get(…) || undefined`)',
		path: () => rememberApp('?name='),
		asks: (ids) => [rememberAsk(ids, null)],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: 'two `name=` keys: the first one travels',
		path: () => rememberApp('?name=Github&name=JIRA'),
		asks: (ids) => [rememberAsk(ids, 'Github')],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: 'a name of spaces and non-ASCII characters travels whole',
		path: () => rememberApp(`?name=${encodeURIComponent('Asana Cloud 日本')}`),
		asks: (ids) => [rememberAsk(ids, 'Asana Cloud 日本')],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: 'a name carrying & and = stays one value',
		path: () => rememberApp(`?name=${encodeURIComponent('a&b=c')}`),
		asks: (ids) => [rememberAsk(ids, 'a&b=c')],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: 'a name of 2 000 characters travels whole — no cap here',
		path: () => rememberApp(`?name=${'n'.repeat(2_000)}`),
		asks: (ids) => [rememberAsk(ids, 'n'.repeat(2_000))],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: 'a caller-sent ?organizationId and ?tenantId are ignored: the cookies build the filter',
		path: (ids) =>
			rememberApp(`?name=Github&organizationId=${ids.organizationB}&tenantId=${ids.tenantB}&laneProbe=7`),
		asks: (ids) => [
			{
				...rememberAsk(ids, REMEMBER_NAME),
				absent: ['organizationId', 'tenantId', 'laneProbe']
			}
		],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: 'a session with its tenant cookie loses `where[tenantId]` and the tenant header' + MOCK_LIMIT,
		cookieWithout: 'auth-tenant-id',
		asks: (ids) => [
			{
				method: 'GET',
				path: UP_TENANT,
				keys: ['where[name]', 'where[organizationId]'],
				absent: ['where[tenantId]'],
				values: { 'where[name]': REMEMBER_NAME, 'where[organizationId]': ids.organizationA }
			}
		],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: 'a session with its organization cookie loses `where[organizationId]`',
		cookieWithout: 'auth-organization-id',
		asks: (ids) => [
			{
				method: 'GET',
				path: UP_TENANT,
				keys: ['where[name]', 'where[tenantId]'],
				absent: ['where[organizationId]'],
				values: { 'where[name]': REMEMBER_NAME, 'where[tenantId]': ids.tenantA }
			}
		],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: "the fixture's other workspace asks with the other pair",
		scope: 'B',
		asks: (ids) => [
			{
				method: 'GET',
				path: UP_TENANT,
				keys: ['where[name]', 'where[organizationId]', 'where[tenantId]'],
				values: {
					'where[name]': REMEMBER_NAME,
					'where[organizationId]': ids.organizationB,
					'where[tenantId]': ids.tenantB
				}
			}
		],
		answer: () => ownJson(200, MOCK_PAGE, null)
	},
	{
		label: 'a cross-site caller is answered as any other read (same-origin-request.ts:43-46)',
		headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' },
		answer: () => ownJson(200, MOCK_PAGE, null)
	}
];

test.describe('lane-b · GET /api/integration-tenant/remember/state: what travels in ?name=, and what a refusal becomes', () => {
	for (const row of REMEMBER_ROWS) {
		test(`${row.label}${row.notIntended ? NOT_INTENDED : ''}`, async ({ api, mock, ids, cookies }) => {
			const asked = row.asks ? row.asks(ids) : rememberRoute.asks(ids);
			const { response, text, path } = await callRoute(api, cookies, rememberRoute, ids, {
				...(row.path ? { path: row.path(ids) } : {}),
				...(row.cookieWithout ? { cookieWithout: row.cookieWithout } : {}),
				...(row.scope ? { scope: row.scope } : {}),
				...(row.headers ? { headers: row.headers } : {}),
				...(row.anonymous ? { anonymous: true } : {})
			});
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE remember ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(asked, 200, response, text, path, log, resolve(row.answer, ids), row.label);
		});
	}
});

/** Header sets a browser sends when the request came from another site, or a forged caller can send on its own. */
const FOREIGN_HEADERS: Array<{ label: string; headers: Record<string, string> }> = [
	{ label: 'Sec-Fetch-Site: cross-site', headers: { 'sec-fetch-site': 'cross-site' } },
	{ label: 'Sec-Fetch-Site: same-site', headers: { 'sec-fetch-site': 'same-site' } },
	{ label: 'an Origin of another site', headers: { origin: 'https://evil.example' } }
];

/** Header sets a same-origin browser write actually sends. All of them must pass, or the app's own pages break. */
const OWN_HEADERS: Array<{ label: string; headers: Record<string, string> }> = [
	{ label: 'an Origin naming this very host', headers: { origin: APP_ORIGIN } },
	{ label: 'Sec-Fetch-Site: same-origin', headers: { 'sec-fetch-site': 'same-origin' } }
];

test.describe('lane-b · the six writes of this family refuse a caller that came from another site; the five reads do not', () => {
	for (const route of WRITE_ROUTES) {
		for (const item of FOREIGN_HEADERS) {
			test(`${route.label} with ${item.label} — 403 here, the platform was asked nothing at all (${
				route.originCheck === 'route' ? 'route.ts:7' : 'forward-to-gauzy.ts:89'
			})`, async ({ api, mock, ids, cookies }) => {
				const { response, text, path } = await callRoute(api, cookies, route, ids, { headers: item.headers });
				const log = await mock.requests();

				console.log(`[lane-b integ] MEASURE foreign ${witnessOf(path, response, text, log, [])}`);

				expectRouteAnswer(
					[],
					200,
					response,
					text,
					path,
					log,
					FOREIGN_SITE_REFUSAL,
					`${route.label} with ${item.label}`
				);
				// The check runs before the guard and before the write, so even the session check never happens: an empty
				// log is what says this app, not the platform, refused.
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

				console.log(`[lane-b integ] MEASURE own ${witnessOf(path, response, text, log, pathsOf(asked))}`);

				expectRouteAnswer(
					asked,
					200,
					response,
					text,
					path,
					log,
					resolve(route.control, ids),
					`${route.label} with ${item.label}`
				);
			});
		}

		// A write with no body at all needs neither a media type nor a CORS preflight, which is why the origin check has
		// to come first (`forward-to-gauzy.ts:85-88`). Pinned per write, bodiless.
		test(`${route.label}, bodiless and cross-site: still 403 here, before the body or the session is read`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const { response, text, path } = await callRoute(api, cookies, route, ids, {
				noBody: true,
				headers: { 'sec-fetch-site': 'cross-site' }
			});
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE bodiless-foreign ${witnessOf(path, response, text, log, [])}`);

			expectRouteAnswer(
				[],
				200,
				response,
				text,
				path,
				log,
				FOREIGN_SITE_REFUSAL,
				`${route.label} bodiless with Sec-Fetch-Site: cross-site`
			);
		});
	}

	for (const route of READ_ROUTES) {
		test(`${route.label}: the same headers on a read change nothing (same-origin-request.ts:43-46)`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const asked = route.asks(ids);
			const { response, text, path } = await callRoute(api, cookies, route, ids, {
				headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' }
			});
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE foreign-read ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				resolve(route.control, ids),
				`${route.label} with cross-site headers`
			);
		});
	}
});

/** The routes whose tenant-keyed arms are pinned twice: as the session tenant and as the other one. */
const TENANT_ARMS: ContractRoute[] = ROUTES;

test.describe('lane-b · an arm addressed to the session tenant fires, the same arm on the other tenant does not', () => {
	for (const route of TENANT_ARMS) {
		test(`${route.label}: armed as <tenant A>:<its path>, it is refused as its row says`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const ask = route.asks(ids)[0];
			await mock.scenario({ fails: { [`${ids.tenantA}:${ask.path}`]: 403 } });

			const { response, text, path } = await callRoute(api, cookies, route, ids);
			const log = await mock.requests();
			const asked = [{ ...ask, status: 403 }];

			console.log(`[lane-b integ] MEASURE tenantA ${witnessOf(path, response, text, log, [ask.path])}`);

			expectRouteAnswer(
				asked,
				403,
				response,
				text,
				path,
				log,
				route.refusal(403),
				`${route.label} armed 403 on ${ids.tenantA}:${ask.path}`
			);
		});

		test(`${route.label}: armed as <tenant B>:<its path>, nothing of it applies`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const ask = route.asks(ids)[0];
			await mock.scenario({ fails: { [`${ids.tenantB}:${ask.path}`]: 403 } });

			const { response, text, path } = await callRoute(api, cookies, route, ids);
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE tenantB ${witnessOf(path, response, text, log, [ask.path])}`);

			expectRouteAnswer(
				[ask],
				200,
				response,
				text,
				path,
				log,
				resolve(route.control, ids),
				`${route.label} armed 403 on ${ids.tenantB}:${ask.path}, which this session never sends`
			);
			expect(
				await mock.failures(),
				`${route.label}: an arm for the other tenant fired anyway (${logOf(log)}), which would mean the tenant that ` +
					'travels is not the session tenant'
			).toEqual([]);
		});
	}

	/** The four routes measured with `auth-tenant-id` gone: the mock reads the tenant off the `tenant-id` header it was
	 *  given (`mock-gauzy-server.mjs:1103-1106`), and these two helpers write that header only when a tenant was named
	 *  (`forward-to-gauzy.ts:119`, `fetch.ts:95-97`), so no tenant-addressed arm can reach the call. */
	const NO_TENANT_ROUTES: ContractRoute[] = [asanaStatusRoute, asanaStateRoute, connectRoute, githubRoute];

	for (const route of NO_TENANT_ROUTES) {
		test(`${route.label}: with the tenant cookie gone the tenant-addressed arm cannot fire`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const ask = route.asks(ids)[0];
			await mock.scenario({ fails: { [`${ids.tenantA}:${ask.path}`]: 403 } });

			const { response, text, path } = await callRoute(api, cookies, route, ids, {
				cookieWithout: 'auth-tenant-id'
			});
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE no-tenant ${witnessOf(path, response, text, log, [ask.path])}`);

			expectRouteAnswer(
				[ask],
				200,
				response,
				text,
				path,
				log,
				// The nine forwarders answer as their cookie-less row minus the tenant header; the GitHub route loses
				// `tenantId` from the body it builds (finding 7).
				route.half === 'github-route'
					? githubAnswer({ organizationId: ids.organizationA, ...GITHUB_BODY() })
					: resolve(route.control, ids),
				`${route.label} armed 403 on ${ids.tenantA}:${ask.path} with no tenant cookie`
			);
			expect(
				await mock.failures(),
				`${route.label}: a tenant-addressed arm fired for a call that sends no tenant header (${logOf(log)})`
			).toEqual([]);
		});

		test(`${route.label}: the same arm written as a bare path does fire — it is the header, not the arming`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const ask = route.asks(ids)[0];
			await mock.scenario({ fails: { [ask.path]: 403 } });

			const { response, text, path } = await callRoute(api, cookies, route, ids, {
				cookieWithout: 'auth-tenant-id'
			});
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE bare-arm ${witnessOf(path, response, text, log, [ask.path])}`);

			expectRouteAnswer(
				[{ ...ask, status: 403 }],
				403,
				response,
				text,
				path,
				log,
				route.refusal(403),
				`${route.label} armed 403 on the bare path ${ask.path}`
			);
		});
	}
});

test.describe('lane-b · the query these routes hand on, and the one a caller cannot put into them', () => {
	for (const platform of PLATFORMS) {
		test(`GET /api/integration/${platform}/status: a caller's ?organizationId wins, because no session organization is put in the query`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const path = `${UP}/${platform}/status?organizationId=${ids.organizationB}&laneProbe=7&where%5BtenantId%5D=${ids.tenantB}`;
			const { response, text } = await callRoute(
				api,
				cookies,
				byLabel(`GET /api/integration/${platform}/status`),
				ids,
				{
					path
				}
			);
			const log = await mock.requests();

			console.log(
				`[lane-b integ] MEASURE status-query ${witnessOf(path, response, text, log, [`${UP}/${platform}/status`])}`
			);

			// `forward-to-gauzy.ts:112` appends `new URL(req.url).search` to the path the route fixed; the session's
			// organization is not in that query at all, and the tenant header is pinned by the arm rows above.
			expectRouteAnswer(
				[
					{
						method: 'GET',
						path: `${UP}/${platform}/status`,
						keys: ['organizationId', 'laneProbe', 'where[tenantId]'],
						values: { organizationId: ids.organizationB, laneProbe: '7', 'where[tenantId]': ids.tenantB }
					}
				],
				200,
				response,
				text,
				path,
				log,
				FORWARD_READ_CONTROL,
				`GET ${path}`
			);
		});
	}

	test('GET /api/integration/asana/status: a repeated and an empty organizationId both travel as written', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const path = `${UP}/asana/status?organizationId=${ids.organizationA}&organizationId=&laneProbe=`;
		const { response, text } = await callRoute(api, cookies, asanaStatusRoute, ids, { path });
		const log = await mock.requests();

		console.log(
			`[lane-b integ] MEASURE status-query2 ${witnessOf(path, response, text, log, [`${UP}/asana/status`])}`
		);

		const ask = asksFor(await mock.requests(), `${UP}/asana/status`)[0];
		expect(
			new URLSearchParams(ask.query).getAll('organizationId'),
			`a repeated organizationId is not folded to one value — ${witnessOf(path, response, text, [ask], [`${UP}/asana/status`])}`
		).toEqual([ids.organizationA, '']);
		expect(
			new URLSearchParams(ask.query).getAll('laneProbe'),
			`an empty caller key is dropped rather than forwarded — ${witnessOf(path, response, text, [ask], [`${UP}/asana/status`])}`
		).toEqual(['']);
	});

	for (const platform of PLATFORMS) {
		test(`POST /api/integration/${platform}/install/state: the caller's query travels alongside the body, and both may name another organization`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const route = byLabel(`POST /api/integration/${platform}/install/state`);
			const path = `${UP}/${platform}/install/state?organizationId=${ids.organizationB}&laneProbe=7`;
			const { response, text } = await callRoute(api, cookies, route, ids, {
				path,
				body: { organizationId: ids.organizationA }
			});
			const log = await mock.requests();

			console.log(
				`[lane-b integ] MEASURE state-query ${witnessOf(path, response, text, log, [`${UP}/${platform}/install/state`])}`
			);

			// The query key and the body key are two different organization ids in one call, and both arrive; Gauzy decides
			// (`authenticated-guard-app.ts:46-53`), the mock echo proves what the body carried.
			expectRouteAnswer(
				[
					{
						method: 'POST',
						path: `${UP}/${platform}/install/state`,
						keys: ['organizationId', 'laneProbe'],
						values: { organizationId: ids.organizationB, laneProbe: '7' }
					}
				],
				200,
				response,
				text,
				path,
				log,
				relayedAnswer({ organizationId: ids.organizationA }),
				`POST ${path}`
			);
		});
	}

	test('POST /api/integration/trello/connect: its query travels too, so a caller can name a state outside the body', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const path = `${UP}/trello/connect?state=fromQuery&laneProbe=7`;
		const { response, text } = await callRoute(api, cookies, connectRoute, ids, {
			path,
			body: { token: 'lane-b-trello-token', state: 'bodyState' }
		});
		const log = await mock.requests();

		console.log(
			`[lane-b integ] MEASURE connect-query ${witnessOf(path, response, text, log, [`${UP}/trello/connect`])}`
		);

		expectRouteAnswer(
			[
				{
					method: 'POST',
					path: `${UP}/trello/connect`,
					keys: ['state', 'laneProbe'],
					values: { state: 'fromQuery', laneProbe: '7' }
				}
			],
			200,
			response,
			text,
			path,
			log,
			relayedAnswer({ token: 'lane-b-trello-token', state: 'bodyState' }),
			`POST ${path}`
		);
	});
});

test.describe('lane-b · a verb these route files do not export never reaches their handlers', () => {
	const VERB_ROWS: Array<{
		label: string;
		method: 'GET' | 'POST' | 'PUT' | 'DELETE';
		path: (ids: Record<string, string>) => string;
	}> = [
		{
			label: 'POST /api/integration/asana/status',
			method: 'POST',
			path: (ids) => `${UP}/asana/status?organizationId=${ids.organizationA}`
		},
		{ label: 'DELETE /api/integration/jira/status', method: 'DELETE', path: () => `${UP}/jira/status` },
		{ label: 'GET /api/integration/linear/install/state', method: 'GET', path: () => `${UP}/linear/install/state` },
		{ label: 'PUT /api/integration/trello/install/state', method: 'PUT', path: () => `${UP}/trello/install/state` },
		{ label: 'GET /api/integration/trello/connect', method: 'GET', path: () => `${UP}/trello/connect` },
		{ label: 'GET /api/integration/github/install', method: 'GET', path: () => UP_GITHUB },
		{
			label: 'POST /api/integration-tenant/remember/state',
			method: 'POST',
			path: () => `${UP_TENANT}/remember/state?name=Github`
		}
	];

	for (const row of VERB_ROWS) {
		test(`${row.label}: 405 from Next, no body, no media type, and the mock was asked nothing`, async ({
			api,
			mock,
			ids
		}) => {
			const path = row.path(ids);
			const response = await api(path, { method: row.method });
			const text = await response.text();
			const log = await mock.requests();

			console.log(`[lane-b integ] MEASURE verb405 ${witnessOf(path, response, text, log, [])}`);

			expectRouteAnswer(
				[],
				200,
				response,
				text,
				path,
				log,
				{ status: 405, text: '', contentType: null, cacheControl: null },
				`${row.label} (${row.method})`
			);
			expect(triples(log), `${row.label}: the mock was asked (${logOf(log)}) — Next answers 405 itself`).toEqual(
				[]
			);
		});
	}
});

test.describe('lane-b · Cache-Control on these answers, measured against the upstream that asked for no-store', () => {
	const CACHE_ROWS: Array<{
		label: string;
		path: (ids: Record<string, string>) => string;
		method: 'GET' | 'POST';
	}> = [
		{
			label: 'a status read',
			path: (ids) => `${UP}/asana/status?organizationId=${ids.organizationA}`,
			method: 'GET'
		},
		{ label: 'a minted install state', path: () => `${UP}/asana/install/state`, method: 'POST' },
		{ label: 'the trello connect answer', path: () => `${UP}/trello/connect`, method: 'POST' }
	];

	for (const row of CACHE_ROWS) {
		test(`${row.label}: the app answers with no Cache-Control while the same path asked of the mock answers no-store${NOT_INTENDED}`, async ({
			api,
			mock,
			ids
		}) => {
			const path = row.path(ids);
			const body = { organizationId: ids.organizationA };
			const response = await api(path, { ...(row.method === 'POST' ? { body } : {}), method: row.method });
			const appText = await response.text();
			// The very same path, asked of the mock directly: what the upstream asked for is `no-store`.
			const upstream = await fetch(`${MOCK_ORIGIN}${path}`, {
				method: row.method,
				headers: { accept: 'application/json', 'content-type': 'application/json' },
				...(row.method === 'POST' ? { body: JSON.stringify(body) } : {})
			});
			const upstreamText = await upstream.text();
			const log = await mock.requests();
			const witness =
				`${path} via this app -> ${response.status()} cache-control ${JSON.stringify(
					response.headers()['cache-control'] ?? null
				)} body(${appText.length}) · the same path asked of the mock directly -> ${upstream.status} cache-control ` +
				`${JSON.stringify(upstream.headers.get('cache-control'))} body(${upstreamText.length}) · log ${logOf(log)}`;

			console.log(`[lane-b integ] MEASURE cache ${witness}`);

			expect(
				response.headers()['cache-control'] ?? null,
				`${row.label}: this app now writes a Cache-Control where no integration route passes { noStore: true } ` +
					'(forward-to-gauzy.ts:22-28, :54-58) — ' +
					`${witness}`
			).toBeNull();
			expect(
				upstream.headers.get('cache-control'),
				`${row.label}: the mock no longer marks its own answer no-store (mock-gauzy-server.mjs:1093, :1218), so ` +
					`the contrast this row pins is gone — ${witness}`
			).toBe('no-store');
		});
	}

	test('the sibling that did pass { noStore: true } — GET /api/auth/sessions — hands no-store on (app/api/auth/sessions/route.ts:8)', async ({
		api,
		mock
	}) => {
		const response = await api(SESSIONS);
		const text = await response.text();
		const log = await mock.requests();
		const witness = witnessOf(SESSIONS, response, text, log, [SESSIONS]);

		console.log(`[lane-b integ] MEASURE nostore-sibling ${witness}`);

		expectRouteAnswer(
			[{ method: 'GET', path: SESSIONS, keys: [] }],
			200,
			response,
			text,
			SESSIONS,
			log,
			{ status: 200, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: 'no-store' },
			'GET /api/auth/sessions, the noStore contrast'
		);
	});
});

test.describe('lane-b · no permission gate and no role read sits in front of any of these 11 routes', () => {
	test('GET /api/integration/asana/status as SUPER_ADMIN with an integration permission: answered as its control', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		await mock.scenario({ roleName: 'SUPER_ADMIN', manager: true, extraPermissions: ['ORG_INTEGRATIONS_VIEW'] });
		const asked = asanaStatusRoute.asks(ids);
		const { response, text, path } = await callRoute(api, cookies, asanaStatusRoute, ids);
		const log = await mock.requests();

		console.log(`[lane-b integ] MEASURE no-gate-read ${witnessOf(path, response, text, log, pathsOf(asked))}`);

		expectRouteAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			resolve(asanaStatusRoute.control, ids),
			'GET /api/integration/asana/status with a role name and an extra permission'
		);
		expect(
			asksFor(log, '/api/role-permissions/me').length,
			`a route of this family that read the role would now show it in the log — ${logOf(log)}`
		).toBe(0);
	});

	test('GET /api/integration-tenant/remember/state as SUPER_ADMIN: the same three query keys, nothing added', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		await mock.scenario({ roleName: 'SUPER_ADMIN', extraPermissions: ['ORG_INTEGRATIONS_VIEW'] });
		const asked = rememberRoute.asks(ids);
		const { response, text, path } = await callRoute(api, cookies, rememberRoute, ids);
		const log = await mock.requests();

		console.log(`[lane-b integ] MEASURE no-gate-remember ${witnessOf(path, response, text, log, pathsOf(asked))}`);

		expectRouteAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			resolve(rememberRoute.control, ids),
			'GET /api/integration-tenant/remember/state with a role name and an extra permission'
		);
	});
});

/** Every case above arms the mock or drops a session cookie; the next test must not inherit either. The `mock`
 * fixture is automatic and resets on its own, so this is the same reset one lane later — kept because it is also what
 * makes "the mock was asked nothing" a claim about this test and not about the previous one. */
test.afterEach(async () => {
	await mockReset();
});
