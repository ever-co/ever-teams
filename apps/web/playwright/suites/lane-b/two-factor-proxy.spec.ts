import type { APIResponse } from '@playwright/test';
import type { StubRequest } from '../../helpers';

import { expect, test, type ApiCall, type CookieComposer } from '../../api-fixtures';
import { APP_ORIGIN, mockReset } from '../../helpers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The contract of the two-factor proxy routes and of `POST /api/auth/switch-workspace`, pinned on lane-b (app 3032,
 * mock 3996, control 3998) on 2026-11-23 in the runs `E:\Coding\.tmp\s2-lane-b-2fa-1.log` and `-2.log`. Every number,
 * body, key list and header below is a measurement, taken first against the live lane with
 * `E:\Coding\.tmp\probe-2fa\probe.mjs` and `probe2.mjs` (readings in `measured1.txt` and `measured2.txt` beside them),
 * and only then written down.
 *
 * ## The eight routes and which half of the server code answers them
 *
 * Seven are `core/services/server/two-factor-proxy.ts`: `proxyTwoFactorStatus` (`:50`), `proxyTwoFactorWrite` (`:64`,
 * shared by `enroll` / `confirm` / `disable` / `recovery-codes`), `proxyResetMemberTwoFactor` (`:100`) and
 * `proxyTwoFactorVerify` (`:123`). Each of the five non-public ones starts with `authenticatedGuard`
 * (`guards/authenticated-guard-app.ts:55`), i.e. a `GET /user/me` check; every one of them answers a Gauzy failure
 * through `gauzyErrorResponse` (`gauzy-error-response.ts:24`), so Gauzy's status and body pass on and a failure with no
 * readable answer is a 502 (`:28`, `:34`) — never a 500, which is what the 19 timer routes of
 * `suites/lane-b/timer-timesheet-contract.spec.ts` do. Five of the writes call `refuseForeignOrigin` themselves before
 * the handler runs (`app/api/auth/two-factor/enroll/route.ts:6`, `confirm/route.ts:6`, `disable/route.ts:6`,
 * `recovery-codes/route.ts:6`, and `users/[userId]/route.ts:6`).
 *
 * One — `POST /api/auth/two-factor/verify` — is public: no guard, no origin check, only its own schema
 * (`app/api/auth/two-factor/verify/route.ts:4-6`). One — `POST /api/auth/switch-workspace` — is a one-line
 * `forwardToGauzy` proxy (`app/api/auth/switch-workspace/route.ts:8`), whose refusal contract as a family is already
 * pinned in `suites/lane-b/forward-refusals.spec.ts`; the rows here pin what this route does with a body and a query,
 * which is where it differs from its siblings.
 *
 * ## What every route was measured on
 *
 * A control (signed in, nothing armed, a valid body), the same call signed out, the four armed upstream refusals 400,
 * 401, 403 and 429 on the route's own upstream path (429 because a rate-limited code check is Gauzy's answer, and the
 * comment at `two-factor-proxy.ts:27` promises it passes through), a cut (`drops`) call, its own malformed-body cases,
 * and the cross-site header trio on every write. Each case reads the mock's request log (`playwright/api-fixtures.ts`
 * `mock.requests()`), whose entries carry `method`, `path`, `query` and `status` and nothing else
 * (`cypress/support/mock-gauzy-server.mjs:1122-1130`): an upstream **verb, path and query key list** are provable, a
 * POST **body is not** — so where a body is the only carrier of the payload (every write here) the witness is a pair of
 * tenant-keyed arms: `fails` is read as `<tenant>:<path>` first (`:1089-1093`) and the tenant is the `tenant-id` header
 * `serverFetch` writes from the session (`core/services/server/fetch.ts:95-97`), so an arm keyed
 * `<session tenant>:<path>` fires only when that header travelled, and the same arm on the fixture's other tenant shows
 * the arm is not simply matching the path. Neither is ever armed on `/api/user/me` nor on a bare tenant key.
 *
 * ## The findings, stated up front (each one pinned on the row it names, with `MEASURED, NOT INTENDED`)
 *
 * 1. **`POST /api/auth/two-factor/verify` is refused by nothing.** `Sec-Fetch-Site: cross-site`, `Sec-Fetch-Site:
 *    same-site` and `Origin: https://evil.example` all reach Gauzy's `/auth/two-factor/verify`, which is asked exactly
 *    once, as on a same-origin call (`measured1.txt`, `verify sec-fetch-site cross-site`). Every other write of this
 *    family answers that trio 403 with an empty log. It is the second step of a sign-in, so the session cookies it
 *    mints come from a POST another page can make; it is already listed as an unguarded write in
 *    `suites/lane-c/unguarded-writes.spec.ts:530-540`. Nothing in `app/api/auth/two-factor/verify/route.ts` reads a
 *    header. Its body schema still holds (`two-factor-proxy.ts:124`), so a cross-site caller needs a valid challenge
 *    and a code — but the caller can bring its own: a person signs in to their own account, keeps the challenge and a
 *    fresh code from their own authenticator, and posts them from their page. `bodyOf` reads the body as JSON whatever
 *    its media type (`two-factor-proxy.ts:40-42`; `enroll` parses a `text/plain` JSON body, pinned below), so a plain
 *    form with `enctype="text/plain"` can carry it without a preflight. On success the answer sets that account's
 *    session cookies (`:129-136`) in the browser of whoever opened the page: the login-CSRF shape. Whether a browser
 *    keeps cookies set by a cross-site POST depends on their `SameSite`; not measured here (an owner question).
 * 2. **`POST /api/auth/switch-workspace` relays an answer that carries freshly minted tokens with no `Cache-Control`
 *    at all.** `forwardToGauzy` writes only a media type unless the route asks for `noStore`
 *    (`core/services/server/forward-to-gauzy.ts:22-28`, documented at `:54-58` for exactly "a route whose answer can
 *    hold a secret shown once"), and `app/api/auth/switch-workspace/route.ts:8` passes no options. Measured on the
 *    control, on all four armed refusals and on a 200 KB body: `cache-control` is absent. In production that body is
 *    Gauzy's `{user, token, refresh_token}`. The two-factor handlers of the same repo do set it
 *    (`two-factor-proxy.ts:33-34`).
 * 3. **Five answers of `two-factor-proxy.ts` carry no `Cache-Control` although the file says these answers are never
 *    cached** (`:33-34`): the member-reset permission refusal (`:110`), the successful reset (`:113`) and its outage
 *    answer (`:115`); and on `verify`, the relayed refusal (`:143`) and the "account is not yet ready" 400 (`:138-141`).
 *    Pinned as measured. None of those five bodies carries a secret (a refusal, `{reset:true}`, an error sentence), so
 *    this is an inconsistency with the file's own rule rather than a leak — the secret-bearing answers (`enroll`
 *    `:75`, `confirm` `:81`, `recovery-codes` `:90`, the status read `:55`) do carry `no-store`, and that is pinned too.
 * 4. **`POST /api/auth/two-factor/enroll` starts an enrollment from a body that is not a body.** `bodyOf` swallows the
 *    parse failure (`:40-42`) and `enroll` parses `body ?? {}` (`:71`), so a bodiless POST, a body of `not json at all {`
 *    and an `application/x-www-form-urlencoded` body all answer **200 and enroll**, on the default issuer
 *    (`{"issuer":"Ever Teams"}`, `APP_NAME` at `:73`), while a JSON body under a foreign media type (`text/plain`) is
 *    parsed as usual and enrolls with the issuer it names. `confirm`, `disable`, `recovery-codes` and
 *    `verify` answer those same bodies 400 with nothing upstream, and `switch-workspace` answers them 415
 *    (`forward-to-gauzy.ts:104`, `:107`). `enroll` is origin-checked (`enroll/route.ts:6`), so no cross-site caller can
 *    reach it: a tolerant handler, not an open door.
 * 5. **The 400 sentence of `enroll` names the wrong field.** Every refusal of that schema says `issuer must be 64
 *    characters at most` (`:72`), measured for `{nope:1}` (an unknown key), `{issuer:42}` (a number) and a 200 KB body —
 *    none of which is a too-long issuer. Same family on the other four: `code is required` for a 17-character code
 *    (`:79`), `code or recoveryCode is required` for a 33-character recovery code (`:84`), and `challenge and code or
 *    recoveryCode are required` for a 4 097-character challenge (`:125`).
 * 6. **The body caps are field caps, not request caps.** Nothing on these routes looks at a byte count: 200 KB was
 *    refused on `enroll`, `confirm` and `verify` only because the field maxes are 64, 16 and 4 096 characters
 *    (`core/lib/validation/two-factor.ts:9-10`, `:16`, `:19`, `:24-27`), and `POST /api/auth/switch-workspace` relayed a
 *    200 KB JSON body to Gauzy and answered with it (`measured2.txt`, `switch 200 KB body`). A 4 096-character
 *    challenge passes, a 4 097-character one does not.
 * 7. **`POST /api/auth/switch-workspace` validates no body at all**, and the tenant that travels is the session's, not
 *    the one the body names: an arm keyed `<tenant A>:…/switch-workspace` fires for a call whose body says
 *    `tenantId: <tenant B>`, and the same arm on tenant B does not (`forward-to-gauzy.ts:97`, `:119`). A bodiless POST,
 *    a body of `tenantId=` and a 200 KB object are all handed upstream as they arrived.
 * 8. **`POST /api/auth/two-factor/verify` sends its Gauzy call with no `tenant-id` header at all.**
 *    `verifyTwoFactorRequest` names no tenant (`core/services/server/requests/two-factor.ts:83-90`) and `serverFetch`
 *    writes that header only when it was given one (`core/services/server/fetch.ts:95-97`). It is the public call of
 *    the family, so the tenant is whatever the challenge Gauzy holds says, not what the caller's cookies say — pinned
 *    by the arm case that cannot fire, where the same arm written as a bare path does fire.
 *
 * ## Mock limits — branches this lane cannot answer, stated instead of faked
 *
 * - `cypress/support/mock-gauzy-server.mjs` has **no `/api/auth/two-factor*` handler at all** (only
 *   `/api/role-permissions/me` at `:627`), so every two-factor call lands on its catch-all: a GET answers
 *   `{items:[],total:0}` (`:827`), a write echoes its own request body or `{success:true}` (`:826`), a DELETE answers
 *   `{affected:1,raw:[]}` (`:825`). The control answers below are therefore the mock's, not Gauzy's: `confirm` echoes
 *   the caller's own code instead of `{enabledAt, recoveryCodes}`, `disable` and `recovery-codes` echo the proof, and
 *   the member reset answers `{affected:1,raw:[]}` instead of the `{reset:true}` its request builder declares
 *   (`core/services/server/requests/two-factor.ts:73-80`). What is pinned is the **app's** handling — status, cache
 *   header, media type, which upstream call was made and with which query keys — not the payload. The echo *is* used
 *   as a witness where it matters: it proves what this app put into the upstream body (finding 4, and the `?issuer=` /
 *   `?code=` cases).
 * - `POST /api/auth/two-factor/verify`'s signed-in half is unreachable here for the same reason: the echo carries no
 *   `user.tenantId` and no `token`, so `respondWithWorkspaceSession` (`core/services/server/workspace-session.ts:23-34`)
 *   returns null and the route answers its `{"errors":{"email":…}}` 400 (`two-factor-proxy.ts:129-141`). The success
 *   path, where that answer carries the session cookies, is pinned by the unit test
 *   `core/services/server/two-factor-proxy.test.ts:62-80`, not here.
 * - A signed-out caller is answered by the six guarded routes as if they knew who they were, because this mock answers
 *   `GET /api/user/me` whatever arrives (`mock-gauzy-server.mjs:560`) and `authenticated-guard-app.ts:88` delegates the
 *   decision to the API. Only `switch-workspace` refuses a cookie-less caller itself (`forward-to-gauzy.ts:96`) — and
 *   its log is then empty, which is the proof that this app, and not Gauzy, refused. Same delegation already pinned in
 *   `suites/lane-c/session-check.spec.ts` and in `timer-timesheet-contract.spec.ts` finding 7.
 * - `extraPermissions` cannot take a permission away and only accepts upper-case names (`mock-gauzy-server.mjs:54-62`),
 *   so "the role holds `ORG_USERS_EDIT` but with `enabled: false`" — the half `enabledPermissionsOf` also checks
 *   (`core/lib/utils/member-access.ts`, as `refuse-without-permission.ts:17-24` does for the other gate family) —
 *   cannot be armed on this lane. `roleName` and `manager` do not matter here either: this gate reads
 *   `GET /role-permissions/me`, never the role's name; pinned by the `roleName: SUPER_ADMIN` row.
 * - A 60 s upstream timeout (`forward-to-gauzy.ts:8`, `UPSTREAM_TIMEOUT_MS`) is not reachable from a test: the caller's
 *   own budget is the same 60 000 ms (`playwright/api-fixtures.ts:101`).
 * - A verb a route file does not export never reaches these handlers: Next answers 405 with no body and no media type,
 *   and the mock logs nothing (`verified-status.spec.ts` and `timer-timesheet-contract.spec.ts` pin the family; three
 *   rows here pin it for these routes).
 *
 * ## Cost
 *
 * 192 cases: 7 table routes × (control + signed out + 4 armed refusals + cut) = 49; 49 body and media-type cases; 18
 * foreign-header + 12 own-header + 6 bodiless-cross-site + 1 cross-site read = 37 header cases; the member reset: 11
 * pinned rows + 5 wrong-permission rows + 1 mixed grant + 1 role name + 4 armed refusals + 4 permission-read refusals +
 * 2 cuts + 3 foreign headers + 1 own-Origin = 32; 7 tenant-keyed arm pairs = 14, plus the arm that cannot fire and the
 * arm that names the wrong tenant = 16; 6 scoping / query-passthrough cases; 3 verb rows.
 */

/** The four upstream refusals every route here is pinned on (`two-factor-proxy.ts:27` promises all four pass through). */
const REFUSAL_STATUSES = [400, 401, 403, 429] as const;

/** The upstream paths, spelled as the mock records them: `GAUZY_API_SERVER_URL` is the base plus `/api`. */
const UP = '/api/auth/two-factor';
const UP_ENROLL = `${UP}/enroll`;
const UP_CONFIRM = `${UP}/confirm`;
const UP_DISABLE = `${UP}/disable`;
const UP_RECOVERY = `${UP}/recovery-codes`;
const UP_VERIFY = `${UP}/verify`;
const UP_SWITCH = '/api/auth/switch-workspace';
const ROLE_READ = '/api/role-permissions/me';
/** The session check the six guarded routes run first (`authenticated-guard-app.ts:76`), excepted from every log claim. */
const GUARD_CHECK = '/api/user/me';

/** The media type the mock writes on every answer it makes (`mock-gauzy-server.mjs:1149`), which `forwardToGauzy` copies. */
const UPSTREAM_MEDIA_TYPE = 'application/json; charset=utf-8';
/** The media type of an answer this app wrote itself (`NextResponse.json`). */
const OWN_MEDIA_TYPE = 'application/json';

/** The mock's refusal body (`mock-gauzy-server.mjs:1100`). */
const gauzyRefusal = (status: number) => ({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });

/** The mock's answer to a GET it has no handler for (`mock-gauzy-server.mjs:827`). */
const MOCK_PAGE = { items: [], total: 0 };
/** The mock's answer to a DELETE it has no handler for (`:825`). */
const MOCK_DELETE = { affected: 1, raw: [] };
/** The mock's answer to a write with no parsable body (`:826`). */
const MOCK_SUCCESS = { success: true };
/** `APP_NAME`, the issuer `enroll` fills in when the body carries none (`two-factor-proxy.ts:73`). */
const DEFAULT_ISSUER = 'Ever Teams';
/** The 400 `verify` answers when the upstream answer carried no session in it (`two-factor-proxy.ts:138-141`). */
const NO_SESSION_BODY = { errors: { email: 'Your account is not yet ready to be used on the Ever Teams Platform' } };

/** One upstream call a route makes, and what its query must look like. */
type Ask = {
	method: 'GET' | 'POST' | 'DELETE';
	path: string;
	/** The query keys the mock recorded, sorted — a forwarded caller key or a lost session key turns this red. */
	keys: string[];
	/** Keys that must NOT be there (a caller-sent `?organizationId`, a session id that vanished). */
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
	/** The `cache-control`, or `null` for "carries none" — which is the point of several rows below. */
	cacheControl?: string | null;
};

/** A measured answer, or the same answer once the fixture's ids are known (an answer that echoes them). */
type WithIds<T> = T | ((ids: Record<string, string>) => T);
const resolve = <T>(value: WithIds<T>, ids: Record<string, string>): T =>
	typeof value === 'function' ? (value as (withIds: Record<string, string>) => T)(ids) : value;

/** An answer this app wrote itself: JSON on `status`, with this app's own media type. */
const ownJson = (status: number, body: unknown, cacheControl?: string | null): Answer => ({
	status,
	body,
	contentType: OWN_MEDIA_TYPE,
	...(cacheControl === undefined ? {} : { cacheControl })
});

/** A body this route refused before Gauzy was asked: 400, `{message}`, `no-store` (`two-factor-proxy.ts:36-38`). */
const invalidBody = (message: string): Answer => ownJson(400, { message }, 'no-store');

/**
 * A Gauzy refusal relayed by `gauzyErrorResponse` (`gauzy-error-response.ts:37`): Gauzy's status and body, on this
 * app's own media type because `NextResponse.json` wrote the body. `noStore` says whether the caller wrapped the answer
 * in `withNoStore` (`two-factor-proxy.ts:44-47`) — `proxyTwoFactorStatus` and `proxyTwoFactorWrite` do,
 * `proxyResetMemberTwoFactor` and `proxyTwoFactorVerify` do not.
 */
const relayedByHandler = (status: number, noStore: boolean): Answer =>
	ownJson(status, gauzyRefusal(status), noStore ? 'no-store' : null);

/** A Gauzy refusal relayed by `forwardToGauzy`: Gauzy's status, body **and media type**, no `Cache-Control` (`:128-131`). */
const relayedByForward = (status: number): Answer => ({
	status,
	body: gauzyRefusal(status),
	contentType: UPSTREAM_MEDIA_TYPE,
	cacheControl: null
});

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

/** What `gauzyErrorResponse` answers a failure with no readable Gauzy body (`:25-28`): 502 and its own sentence. */
const outage = (message: string, noStore: boolean): Answer => ownJson(502, { message }, noStore ? 'no-store' : null);

/** The mock's media-type refusal, for the one route here that checks a media type (`forward-to-gauzy.ts:30-31`). */
const UNSUPPORTED_MEDIA: Answer = ownJson(415, { statusCode: 415, message: 'Unsupported Media Type' }, null);

/** The refusal this app writes when the role lacks `ORG_USERS_EDIT` (`two-factor-proxy.ts:110`). */
const NOT_A_MANAGER: Answer = ownJson(403, { message: 'You may not reset this member.' }, null);

/**
 * The role read every member-reset call makes before it decides (`two-factor-proxy.ts:107`). Its own status is pinned
 * here because a case arms the reset and the read separately: an armed 429 on the delete leaves this call at 200.
 */
const ROLE_READ_ASK: Ask = { method: 'GET', path: ROLE_READ, keys: [], status: 200 };

const INVALID_ENROLL = invalidBody('issuer must be 64 characters at most');
const INVALID_CONFIRM = invalidBody('code is required');
const INVALID_PROOF = invalidBody('code or recoveryCode is required');
const INVALID_VERIFY = invalidBody('challenge and code or recoveryCode are required');

const NOT_INTENDED = ' [MEASURED, NOT INTENDED]';

type ContractRoute = {
	label: string;
	/** The verb the route file exports. */
	method: 'GET' | 'POST';
	/** Which half of the server code answers it, which is what the media type of the answer proves. */
	half: 'two-factor-proxy' | 'forwardToGauzy';
	/** Whether a write of another site is refused before anything is read. `verify` is the one that is not. */
	originGuarded: boolean;
	/** The app route, spelled as `api()` is called with it. */
	app: (ids: Record<string, string>) => string;
	/** The JSON body a write carries. */
	body?: (ids: Record<string, string>) => unknown;
	/** The upstream calls the control causes, in the order the mock recorded them. */
	asks: (ids: Record<string, string>) => Ask[];
	control: WithIds<Answer>;
	/** The same call with no session cookies: `asks` here is what survived it. */
	signedOut: WithIds<Answer & { asks: (ids: Record<string, string>) => Ask[] }>;
	/** The answer to an armed `fails` on the control's first ask. */
	refusal: (status: number) => Answer;
	/** The answer to a `drops` cut of that same path. */
	drop: Answer;
	/**
	 * A bodiless write of this route that comes from another site. Every guarded one is answered by the site check;
	 * `verify` has none, so its own schema answers it.
	 */
	bodilessCrossSite?: { asks: (ids: Record<string, string>) => Ask[]; answer: Answer };
	/** A row that says what was measured rather than what the code means to do. */
	notIntended?: string;
};

const ROUTES: ContractRoute[] = [
	{
		label: 'GET /api/auth/two-factor',
		method: 'GET',
		half: 'two-factor-proxy',
		originGuarded: true,
		// The organization comes from the session cookie and nowhere else: `twoFactorStatusRequest`
		// (`requests/two-factor.ts:22-23`) builds `?organizationId=` from it and forwards nothing the caller sent.
		app: () => UP,
		asks: (ids) => [
			{ method: 'GET', path: UP, keys: ['organizationId'], values: { organizationId: ids.organizationA } }
		],
		control: ownJson(200, MOCK_PAGE, 'no-store'),
		// The guard delegated (`authenticated-guard-app.ts:88`, mock `:560`), so the read went out with the session's
		// organization gone: no query at all, because `twoFactorStatusRequest` skips `?organizationId` when it is
		// undefined. [mock limit]
		signedOut: {
			...ownJson(200, MOCK_PAGE, 'no-store'),
			asks: () => [{ method: 'GET', path: UP, keys: [], absent: ['organizationId'] }]
		},
		refusal: (status) => relayedByHandler(status, true),
		drop: outage('Two-factor authentication could not be read.', true)
	},
	{
		label: 'POST /api/auth/two-factor/enroll',
		method: 'POST',
		half: 'two-factor-proxy',
		originGuarded: true,
		app: () => UP_ENROLL,
		body: () => ({ issuer: 'Lane B Probe' }),
		// No query key at all: the issuer travels in the body, which the log cannot show — hence the tenant-keyed arms.
		asks: () => [{ method: 'POST', path: UP_ENROLL, keys: [] }],
		// The mock echoes what this app sent, so the answer is the witness for the upstream body.
		control: ownJson(200, { issuer: 'Lane B Probe' }, 'no-store'),
		// The same call minus its cookies ran the whole handler, because the mock answered `GET /user/me` (see the
		// header). The issuer of the body still travelled and came back — the default issuer (`Ever Teams`) only shows
		// when the body carries none, which is the bodiless case below.
		signedOut: {
			...ownJson(200, { issuer: 'Lane B Probe' }, 'no-store'),
			asks: () => [{ method: 'POST', path: UP_ENROLL, keys: [] }]
		},
		refusal: (status) => relayedByHandler(status, true),
		drop: outage('Two-factor authentication could not be changed.', true)
	},
	{
		label: 'POST /api/auth/two-factor/confirm',
		method: 'POST',
		half: 'two-factor-proxy',
		originGuarded: true,
		app: () => UP_CONFIRM,
		body: () => ({ code: '123456' }),
		asks: () => [{ method: 'POST', path: UP_CONFIRM, keys: [] }],
		// Mock limit: the echo is the caller's own code, where Gauzy answers `{enabledAt, recoveryCodes}`.
		control: ownJson(200, { code: '123456' }, 'no-store'),
		signedOut: {
			...ownJson(200, { code: '123456' }, 'no-store'),
			asks: () => [{ method: 'POST', path: UP_CONFIRM, keys: [] }]
		},
		refusal: (status) => relayedByHandler(status, true),
		drop: outage('Two-factor authentication could not be changed.', true)
	},
	{
		label: 'POST /api/auth/two-factor/disable',
		method: 'POST',
		half: 'two-factor-proxy',
		originGuarded: true,
		app: () => UP_DISABLE,
		body: () => ({ code: '123456' }),
		asks: () => [{ method: 'POST', path: UP_DISABLE, keys: [] }],
		control: ownJson(200, { code: '123456' }, 'no-store'),
		signedOut: {
			...ownJson(200, { code: '123456' }, 'no-store'),
			asks: () => [{ method: 'POST', path: UP_DISABLE, keys: [] }]
		},
		refusal: (status) => relayedByHandler(status, true),
		drop: outage('Two-factor authentication could not be changed.', true)
	},
	{
		label: 'POST /api/auth/two-factor/recovery-codes',
		method: 'POST',
		half: 'two-factor-proxy',
		originGuarded: true,
		app: () => UP_RECOVERY,
		body: () => ({ code: '123456' }),
		asks: () => [{ method: 'POST', path: UP_RECOVERY, keys: [] }],
		// Mock limit: the echo is the proof, where Gauzy answers the new recovery codes (`two-factor-proxy.ts:89-90`).
		control: ownJson(200, { code: '123456' }, 'no-store'),
		signedOut: {
			...ownJson(200, { code: '123456' }, 'no-store'),
			asks: () => [{ method: 'POST', path: UP_RECOVERY, keys: [] }]
		},
		refusal: (status) => relayedByHandler(status, true),
		drop: outage('Two-factor authentication could not be changed.', true)
	},
	{
		label: 'POST /api/auth/two-factor/verify',
		method: 'POST',
		half: 'two-factor-proxy',
		// Finding 1: no `refuseForeignOrigin` in `app/api/auth/two-factor/verify/route.ts`.
		originGuarded: false,
		app: () => UP_VERIFY,
		body: (ids) => ({ challenge: 'lane-b.challenge', code: '123456', teamId: ids.teamA }),
		asks: () => [{ method: 'POST', path: UP_VERIFY, keys: [] }],
		// Mock limit: the echo carries no `user.tenantId` and no `token`, so the session half of
		// `respondWithWorkspaceSession` returns null and the route answers its own 400 (`two-factor-proxy.ts:129-141`).
		control: ownJson(400, NO_SESSION_BODY, null),
		// A public route: signed out is the control, and the mock was asked the same one call.
		signedOut: {
			...ownJson(400, NO_SESSION_BODY, null),
			asks: () => [{ method: 'POST', path: UP_VERIFY, keys: [] }]
		},
		refusal: (status) => relayedByHandler(status, false),
		drop: outage('The code could not be checked.', false),
		// With no site check in front of it, a bodiless cross-site POST is answered by the schema at `:124-125` exactly
		// as a same-origin one would be, and Gauzy is never asked.
		bodilessCrossSite: { asks: () => [], answer: INVALID_VERIFY },
		notIntended: 'a write no site check refuses (finding 1), and no Cache-Control on any of its answers (finding 3)'
	},
	{
		label: 'POST /api/auth/switch-workspace',
		method: 'POST',
		half: 'forwardToGauzy',
		originGuarded: true,
		app: () => UP_SWITCH,
		// The body names the workspace to switch to; the tenant that travels is the session's own (finding 7).
		body: (ids) => ({ tenantId: ids.tenantB }),
		asks: () => [{ method: 'POST', path: UP_SWITCH, keys: [] }],
		// Mock limit: the echo is the request body, where Gauzy answers `{user, token, refresh_token}`.
		control: (ids) => ({
			status: 200,
			body: { tenantId: ids.tenantB },
			contentType: UPSTREAM_MEDIA_TYPE,
			cacheControl: null
		}),
		// `forward-to-gauzy.ts:96` short-circuits on the cookie before the fetch at `:112`.
		signedOut: { ...REFUSED_BY_THIS_APP, asks: () => [] },
		refusal: (status) => relayedByForward(status),
		drop: UNREACHABLE,
		notIntended: 'the answer carries fresh tokens with no Cache-Control (finding 2)'
	}
];

/** A route row by its label, for the blocks below that reuse a row's own control answer. */
function byLabel(label: string): ContractRoute {
	const route = ROUTES.find((candidate) => candidate.label === label);
	if (!route) throw new Error(`no contract route is labelled ${label}`);
	return route;
}

const statusRoute = byLabel('GET /api/auth/two-factor');
const enrollRoute = byLabel('POST /api/auth/two-factor/enroll');
const confirmRoute = byLabel('POST /api/auth/two-factor/confirm');
const disableRoute = byLabel('POST /api/auth/two-factor/disable');
const recoveryRoute = byLabel('POST /api/auth/two-factor/recovery-codes');
const verifyRoute = byLabel('POST /api/auth/two-factor/verify');
const switchRoute = byLabel('POST /api/auth/switch-workspace');

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
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	/** An object goes as JSON, a string goes as it arrived. */
	body?: unknown;
	/** Send no body at all, even when the row carries one. */
	noBody?: boolean;
	/** A `Content-Type` of its own, for the cases that send something other than JSON. */
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

const noteOf = (route: ContractRoute): string => (route.notIntended ? NOT_INTENDED : '');

const signedOutNote = (route: ContractRoute): string =>
	route.half === 'forwardToGauzy'
		? 'this app refuses, and the mock was asked nothing'
		: 'the guard delegates, so only the session scoping disappears [mock limit: this mock answers /user/me with no bearer, Gauzy refuses it]';

test.describe('lane-b · the two-factor proxy routes and switch-workspace, each pinned on its upstream call', () => {
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

			console.log(`[lane-b 2fa] MEASURE control ${witnessOf(path, response, text, log, pathsOf(asked))}`);

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

			console.log(`[lane-b 2fa] MEASURE signed-out ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(asked, 200, response, text, path, log, answer, `${route.label} signed out`);

			if (route.half === 'forwardToGauzy') {
				// An empty log is the proof that this app, and not Gauzy, refused (`forward-to-gauzy.ts:96`).
				expect(
					triples(log),
					`${route.label}: a caller with no session cookie reached the test backend at all (${logOf(log)}) — ` +
						'the refusal must come from this app'
				).toEqual([]);
			}
		});

		for (const status of REFUSAL_STATUSES) {
			test(`${route.label}: an upstream ${status} on the path it asks first is relayed${noteOf(route)}`, async ({
				api,
				mock,
				ids,
				cookies
			}) => {
				const firstAsk = route.asks(ids)[0];
				await mock.scenario({ fails: { [firstAsk.path]: status } });

				const { response, text, path } = await callRoute(api, cookies, route, ids);
				const log = await mock.requests();
				// What survives a refused first call: that call alone.
				const asked = [firstAsk];

				console.log(
					`[lane-b 2fa] MEASURE armed-${status} ${witnessOf(path, response, text, log, pathsOf(asked))}`
				);

				expectRouteAnswer(
					asked,
					status,
					response,
					text,
					path,
					log,
					route.refusal(status),
					`${route.label} with ${firstAsk.path} armed ${status}`
				);
				expect(
					triples(await mock.failures()),
					`${route.label}: the armed ${status} is missing from the failures view (${logOf(log)})`
				).toEqual([`${firstAsk.method} ${firstAsk.path} ${status}`]);
			});
		}

		test(`${route.label}: a cut upstream call is answered${noteOf(route)}`, async ({ api, mock, ids, cookies }) => {
			const firstAsk = route.asks(ids)[0];
			await mock.scenario({ drops: { [firstAsk.path]: 1 } });

			const { response, text, path } = await callRoute(api, cookies, route, ids);
			const log = await mock.requests();

			console.log(`[lane-b 2fa] MEASURE cut ${witnessOf(path, response, text, log, [firstAsk.path])}`);

			expectRouteAnswer(
				[firstAsk],
				0,
				response,
				text,
				path,
				log,
				route.drop,
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

/** One measured body case: the route it belongs to, what was sent, what this app answered, what it asked. */
type BodyCase = {
	label: string;
	route: ContractRoute;
	/** The body to send: an object is JSON-encoded by the fixture, a string goes as it arrived. */
	send?: unknown;
	/** A `Content-Type` of its own; `''` declares none. */
	contentType?: string;
	/** `true` sends no body at all, even though the row carries one. */
	noBody?: boolean;
	/** Drop this one cookie from the session. */
	cookieWithout?: string;
	/** Arms for this case alone. */
	scenario?: Record<string, unknown>;
	/** The upstream calls this case is pinned on; `[]` means "the mock was asked nothing at all". */
	asks?: (ids: Record<string, string>) => Ask[];
	askedStatus?: number;
	answer: WithIds<Answer>;
	notIntended?: string;
};

const PROOF_BODY = { recoveryCode: 'AAAAA-BBBBB-CCCCC-DDDDD' };

const BODY_CASES: BodyCase[] = [
	// ---- enroll: the only write here that answers a body it cannot read with 200 (finding 4)
	{
		label: 'POST /api/auth/two-factor/enroll: no body at all — 200, the default issuer, one call upstream',
		route: enrollRoute,
		noBody: true,
		answer: ownJson(200, { issuer: DEFAULT_ISSUER }, 'no-store'),
		notIntended: 'a bodiless POST still starts an enrollment (`body ?? {}` at two-factor-proxy.ts:71)'
	},
	{
		label: 'POST /api/auth/two-factor/enroll: a body that is not JSON at all — 200, the default issuer',
		route: enrollRoute,
		send: 'not json at all {',
		answer: ownJson(200, { issuer: DEFAULT_ISSUER }, 'no-store'),
		notIntended: '`bodyOf` swallows the parse failure (`:40-42`), so the body is simply absent'
	},
	{
		label: 'POST /api/auth/two-factor/enroll: an application/x-www-form-urlencoded body — 200, the default issuer',
		route: enrollRoute,
		send: 'issuer=Lane+B',
		contentType: 'application/x-www-form-urlencoded',
		answer: ownJson(200, { issuer: DEFAULT_ISSUER }, 'no-store'),
		notIntended: 'no media type is checked here, unlike forward-to-gauzy.ts:104'
	},
	{
		label: 'POST /api/auth/two-factor/enroll: a JSON body under another media type — 200, its issuer',
		route: enrollRoute,
		send: JSON.stringify({ issuer: 'Lane B Probe' }),
		contentType: 'text/plain',
		answer: ownJson(200, { issuer: 'Lane B Probe' }, 'no-store'),
		notIntended: 'the body is parsed whatever it was declared as, and 415 is a forwardToGauzy answer only'
	},
	{
		label: 'POST /api/auth/two-factor/enroll: an issuer of 64 characters goes through',
		route: enrollRoute,
		send: { issuer: 'x'.repeat(64) },
		answer: ownJson(200, { issuer: 'x'.repeat(64) }, 'no-store')
	},
	{
		label: 'POST /api/auth/two-factor/enroll: an issuer of 65 characters is refused here, nothing went upstream',
		route: enrollRoute,
		send: { issuer: 'x'.repeat(65) },
		asks: () => [],
		answer: INVALID_ENROLL,
		notIntended: 'the only sentence this schema has (finding 5)'
	},
	{
		label: 'POST /api/auth/two-factor/enroll: an unknown key is refused with the issuer sentence',
		route: enrollRoute,
		send: { nope: 1 },
		asks: () => [],
		answer: INVALID_ENROLL,
		notIntended: 'the message names a field that is not the problem (`two-factor-proxy.ts:72`)'
	},
	{
		label: 'POST /api/auth/two-factor/enroll: a non-string issuer is refused with the issuer sentence',
		route: enrollRoute,
		send: { issuer: 42 },
		asks: () => [],
		answer: INVALID_ENROLL
	},
	{
		label: 'POST /api/auth/two-factor/enroll: a 200 KB body is refused, so the cap is a field cap (finding 6)',
		route: enrollRoute,
		send: { huge: 'x'.repeat(200_000) },
		asks: () => [],
		answer: INVALID_ENROLL
	},

	// ---- confirm
	{
		label: 'POST /api/auth/two-factor/confirm: {} is refused before Gauzy',
		route: confirmRoute,
		send: {},
		asks: () => [],
		answer: INVALID_CONFIRM
	},
	{
		label: 'POST /api/auth/two-factor/confirm: a non-string code is refused before Gauzy',
		route: confirmRoute,
		send: { code: 123456 },
		asks: () => [],
		answer: INVALID_CONFIRM
	},
	{
		label: 'POST /api/auth/two-factor/confirm: a 17-character code is refused with "code is required" (finding 5)',
		route: confirmRoute,
		send: { code: '1'.repeat(17) },
		asks: () => [],
		answer: INVALID_CONFIRM
	},
	{
		label: 'POST /api/auth/two-factor/confirm: a blank code is refused before Gauzy',
		route: confirmRoute,
		send: { code: '   ' },
		asks: () => [],
		answer: INVALID_CONFIRM
	},
	{
		label: 'POST /api/auth/two-factor/confirm: an unknown key is refused before Gauzy',
		route: confirmRoute,
		send: { code: '123456', nope: 1 },
		asks: () => [],
		answer: INVALID_CONFIRM
	},
	{
		label: 'POST /api/auth/two-factor/confirm: a bodiless POST is refused before Gauzy',
		route: confirmRoute,
		noBody: true,
		asks: () => [],
		answer: INVALID_CONFIRM
	},
	{
		label: 'POST /api/auth/two-factor/confirm: a body that is not JSON is refused before Gauzy',
		route: confirmRoute,
		send: '{ code:',
		asks: () => [],
		answer: INVALID_CONFIRM
	},
	{
		label: 'POST /api/auth/two-factor/confirm: a form-encoded body is refused before Gauzy',
		route: confirmRoute,
		send: 'code=123456',
		contentType: 'application/x-www-form-urlencoded',
		asks: () => [],
		answer: INVALID_CONFIRM
	},
	{
		label: 'POST /api/auth/two-factor/confirm: a 200 KB code is refused, so the cap is a field cap',
		route: confirmRoute,
		send: { code: '1'.repeat(200_000) },
		asks: () => [],
		answer: INVALID_CONFIRM
	},

	// ---- disable
	{
		label: 'POST /api/auth/two-factor/disable: a recovery code alone is a proof, and it travels',
		route: disableRoute,
		send: PROOF_BODY,
		answer: ownJson(200, PROOF_BODY, 'no-store')
	},
	{
		label: 'POST /api/auth/two-factor/disable: {} is refused before Gauzy',
		route: disableRoute,
		send: {},
		asks: () => [],
		answer: INVALID_PROOF
	},
	{
		label: 'POST /api/auth/two-factor/disable: a blank code is refused before Gauzy',
		route: disableRoute,
		send: { code: '   ' },
		asks: () => [],
		answer: INVALID_PROOF
	},
	{
		label: 'POST /api/auth/two-factor/disable: a non-string code is refused before Gauzy',
		route: disableRoute,
		send: { code: 123456 },
		asks: () => [],
		answer: INVALID_PROOF
	},
	{
		label: 'POST /api/auth/two-factor/disable: a 17-character code is refused with the proof sentence (finding 5)',
		route: disableRoute,
		send: { code: '1'.repeat(17) },
		asks: () => [],
		answer: INVALID_PROOF
	},
	{
		label: 'POST /api/auth/two-factor/disable: a 33-character recovery code is refused with the proof sentence',
		route: disableRoute,
		send: { recoveryCode: 'A'.repeat(33) },
		asks: () => [],
		answer: INVALID_PROOF
	},
	{
		label: 'POST /api/auth/two-factor/disable: an unknown key is refused before Gauzy',
		route: disableRoute,
		send: { code: '123456', nope: 1 },
		asks: () => [],
		answer: INVALID_PROOF
	},
	{
		label: 'POST /api/auth/two-factor/disable: a bodiless POST is refused before Gauzy',
		route: disableRoute,
		noBody: true,
		asks: () => [],
		answer: INVALID_PROOF
	},
	{
		label: 'POST /api/auth/two-factor/disable: a form-encoded body is refused before Gauzy',
		route: disableRoute,
		send: 'code=123456',
		contentType: 'application/x-www-form-urlencoded',
		asks: () => [],
		answer: INVALID_PROOF
	},

	// ---- recovery-codes
	{
		label: 'POST /api/auth/two-factor/recovery-codes: a recovery code alone is a proof, and it travels',
		route: recoveryRoute,
		send: PROOF_BODY,
		answer: ownJson(200, PROOF_BODY, 'no-store')
	},
	{
		label: 'POST /api/auth/two-factor/recovery-codes: {} is refused before Gauzy',
		route: recoveryRoute,
		send: {},
		asks: () => [],
		answer: INVALID_PROOF
	},
	{
		label: 'POST /api/auth/two-factor/recovery-codes: an unknown key is refused before Gauzy',
		route: recoveryRoute,
		send: { nope: 1 },
		asks: () => [],
		answer: INVALID_PROOF
	},
	{
		label: 'POST /api/auth/two-factor/recovery-codes: a bodiless POST is refused before Gauzy',
		route: recoveryRoute,
		noBody: true,
		asks: () => [],
		answer: INVALID_PROOF
	},

	// ---- verify
	{
		label: 'POST /api/auth/two-factor/verify: a recovery code alone is a proof',
		route: verifyRoute,
		send: { challenge: 'lane-b.challenge', recoveryCode: 'AAAAA-BBBBB-CCCCC-DDDDD' },
		answer: ownJson(400, NO_SESSION_BODY, null)
	},
	{
		label: 'POST /api/auth/two-factor/verify: a challenge with no proof is refused before Gauzy',
		route: verifyRoute,
		send: { challenge: 'lane-b.challenge' },
		asks: () => [],
		answer: INVALID_VERIFY
	},
	{
		label: 'POST /api/auth/two-factor/verify: a code with no challenge is refused before Gauzy',
		route: verifyRoute,
		send: { code: '123456' },
		asks: () => [],
		answer: INVALID_VERIFY
	},
	{
		label: 'POST /api/auth/two-factor/verify: an empty challenge is refused before Gauzy',
		route: verifyRoute,
		send: { challenge: '', code: '123456' },
		asks: () => [],
		answer: INVALID_VERIFY
	},
	{
		label: 'POST /api/auth/two-factor/verify: an unknown key is refused before Gauzy',
		route: verifyRoute,
		send: { challenge: 'lane-b.challenge', code: '123456', nope: 1 },
		asks: () => [],
		answer: INVALID_VERIFY
	},
	{
		label: 'POST /api/auth/two-factor/verify: a teamId over 64 characters is refused before Gauzy',
		route: verifyRoute,
		send: { challenge: 'lane-b.challenge', code: '123456', teamId: 't'.repeat(65) },
		asks: () => [],
		answer: INVALID_VERIFY
	},
	{
		label: 'POST /api/auth/two-factor/verify: a 4 097-character challenge is refused, nothing went upstream',
		route: verifyRoute,
		send: { challenge: 'c'.repeat(4097), code: '123456' },
		asks: () => [],
		answer: INVALID_VERIFY
	},
	{
		label: 'POST /api/auth/two-factor/verify: a 4 096-character challenge passes the cap and reaches Gauzy',
		route: verifyRoute,
		send: { challenge: 'c'.repeat(4096), code: '123456' },
		answer: ownJson(400, NO_SESSION_BODY, null)
	},
	{
		label: 'POST /api/auth/two-factor/verify: a 200 KB body is refused, so the cap is a field cap',
		route: verifyRoute,
		send: { challenge: 'c'.repeat(200_000), code: '123456' },
		asks: () => [],
		answer: INVALID_VERIFY
	},
	{
		label: 'POST /api/auth/two-factor/verify: a bodiless POST is refused before Gauzy',
		route: verifyRoute,
		noBody: true,
		asks: () => [],
		answer: INVALID_VERIFY
	},
	{
		label: 'POST /api/auth/two-factor/verify: a form-encoded body is refused before Gauzy',
		route: verifyRoute,
		send: 'challenge=lane-b.challenge&code=123456',
		contentType: 'application/x-www-form-urlencoded',
		asks: () => [],
		answer: INVALID_VERIFY
	},

	// ---- switch-workspace: no body validation, and a media type check instead (finding 7)
	{
		label: 'POST /api/auth/switch-workspace: a bodiless POST goes upstream as it is',
		route: switchRoute,
		noBody: true,
		answer: { status: 200, body: MOCK_SUCCESS, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null }
	},
	{
		label: 'POST /api/auth/switch-workspace: a body that is not JSON is relayed, not refused',
		route: switchRoute,
		// Playwright quotes a string body under a declared JSON media type (`client/fetch.js:151`), so the bytes that
		// arrive are `"tenantId="` — valid JSON, a string rather than an object. What the mock echoed back is the proof
		// that this app handed the body on exactly as it arrived (`forward-to-gauzy.ts:106`, `:121`): no parse, no
		// validation, no refusal. (The raw-body variant, `tenantId=` under `application/json`, answered the mock's
		// `{success:true}` for a body it could not parse — `E:\Coding\.tmp\probe-2fa\measured1.txt`.)
		send: 'tenantId=',
		contentType: 'application/json',
		answer: { status: 200, body: 'tenantId=', contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null },
		notIntended: 'the route checks a media type, never a body (`forward-to-gauzy.ts:102-107`)'
	},
	{
		label: 'POST /api/auth/switch-workspace: a 200 KB JSON body is relayed upstream and back',
		route: switchRoute,
		send: { huge: 'x'.repeat(200_000) },
		answer: {
			status: 200,
			body: { huge: 'x'.repeat(200_000) },
			contentType: UPSTREAM_MEDIA_TYPE,
			cacheControl: null
		},
		notIntended: 'no request-level size cap on a forwardToGauzy route'
	},
	{
		label: 'POST /api/auth/switch-workspace: an application/x-www-form-urlencoded body is refused 415',
		route: switchRoute,
		send: 'tenantId=x',
		contentType: 'application/x-www-form-urlencoded',
		asks: () => [],
		answer: UNSUPPORTED_MEDIA
	},
	{
		label: 'POST /api/auth/switch-workspace: a text/plain body is refused 415',
		route: switchRoute,
		send: JSON.stringify({ tenantId: 'x' }),
		contentType: 'text/plain',
		asks: () => [],
		answer: UNSUPPORTED_MEDIA
	},
	{
		label: 'POST /api/auth/switch-workspace: a JSON body with no media type declared is refused 415',
		route: switchRoute,
		send: JSON.stringify({ tenantId: 'x' }),
		contentType: '',
		asks: () => [],
		answer: UNSUPPORTED_MEDIA
	},
	{
		label: 'POST /api/auth/switch-workspace: a session with its token cookie missing is refused here, 401, nothing asked',
		route: switchRoute,
		cookieWithout: 'auth-token',
		asks: () => [],
		answer: REFUSED_BY_THIS_APP
	}
];

test.describe('lane-b · what each of the eight refuses on its own, before Gauzy is asked', () => {
	for (const item of BODY_CASES) {
		test(`${item.label}${item.notIntended ? NOT_INTENDED : ''}`, async ({ api, mock, ids, cookies }) => {
			if (item.scenario) await mock.scenario(item.scenario);

			const asked = item.asks ? item.asks(ids) : item.route.asks(ids);
			const { response, text, path } = await callRoute(api, cookies, item.route, ids, {
				...(item.send === undefined ? {} : { body: item.send }),
				...(item.contentType === undefined ? {} : { contentType: item.contentType }),
				...(item.noBody ? { noBody: true } : {}),
				...(item.cookieWithout ? { cookieWithout: item.cookieWithout } : {})
			});
			const log = await mock.requests();

			console.log(`[lane-b 2fa] MEASURE body ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(
				asked,
				item.askedStatus ?? 200,
				response,
				text,
				path,
				log,
				resolve(item.answer, ids),
				item.label
			);
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

const WRITE_ROUTES = ROUTES.filter((route) => route.method !== 'GET');

test.describe('lane-b · every write of this family refuses a caller that came from another site — except verify', () => {
	for (const route of WRITE_ROUTES) {
		for (const item of FOREIGN_HEADERS) {
			test(`${route.label} with ${item.label} — ${
				route.originGuarded
					? '403 here, Gauzy was asked nothing at all'
					: 'answered as the control, because nothing checks it' + NOT_INTENDED
			}`, async ({ api, mock, ids, cookies }) => {
				const { response, text, path } = await callRoute(api, cookies, route, ids, { headers: item.headers });
				const log = await mock.requests();
				const asked = route.originGuarded ? [] : route.asks(ids);

				console.log(`[lane-b 2fa] MEASURE foreign ${witnessOf(path, response, text, log, pathsOf(asked))}`);

				expectRouteAnswer(
					asked,
					200,
					response,
					text,
					path,
					log,
					route.originGuarded ? FOREIGN_SITE_REFUSAL : resolve(route.control, ids),
					`${route.label} sent with ${item.label}`
				);
				// The check runs before the guard and before the write (`enroll/route.ts:6`, `users/[userId]/route.ts:6`,
				// `forward-to-gauzy.ts:89`), so even the session check never happens: an empty log is what says this app,
				// not Gauzy, refused.
				if (route.originGuarded) {
					expect(
						triples(log),
						`${route.label} sent with ${item.label} still reached the test backend (${logOf(log)}) — the write ` +
							'went though the caller came from another site'
					).toEqual([]);
				}
			});
		}

		for (const item of OWN_HEADERS) {
			test(`${route.label} answered as always with ${item.label}`, async ({ api, mock, ids, cookies }) => {
				const asked = route.asks(ids);
				const { response, text, path } = await callRoute(api, cookies, route, ids, { headers: item.headers });
				const log = await mock.requests();

				console.log(`[lane-b 2fa] MEASURE own ${witnessOf(path, response, text, log, pathsOf(asked))}`);

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

		// A write with no body at all needs neither a media type nor a CORS preflight, which is why the origin check has
		// to come first (`forward-to-gauzy.ts:85-88`). Pinned per route, bodiless.
		test(`${route.label}, bodiless and cross-site: ${
			route.originGuarded
				? 'still 403 here, before the body or the session is read'
				: `answered by its own body schema, because nothing checks it${NOT_INTENDED}`
		}`, async ({ api, mock, ids, cookies }) => {
			const { response, text, path } = await callRoute(api, cookies, route, ids, {
				noBody: true,
				headers: { 'sec-fetch-site': 'cross-site' }
			});
			const log = await mock.requests();
			const caseOf = route.bodilessCrossSite ?? { asks: () => [] as Ask[], answer: FOREIGN_SITE_REFUSAL };
			const asked = caseOf.asks(ids);

			console.log(
				`[lane-b 2fa] MEASURE bodiless-foreign ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			expectRouteAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				caseOf.answer,
				`${route.label} bodiless and sent with Sec-Fetch-Site: cross-site`
			);
		});
	}

	test('GET /api/auth/two-factor: the same headers on a read change nothing (same-origin-request.ts:43-46)', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const asked = statusRoute.asks(ids);
		const { response, text, path } = await callRoute(api, cookies, statusRoute, ids, {
			headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' }
		});
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE foreign-read ${witnessOf(path, response, text, log, pathsOf(asked))}`);

		expectRouteAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			resolve(statusRoute.control, ids),
			'GET /api/auth/two-factor sent with cross-site headers'
		);
	});
});

/** `DELETE /api/auth/two-factor/users/[userId]` — the one route here that needs a permission to do anything. */
const usersPathOf = (id: string) => `${UP}/users/${id}`;
const usersApp = (ids: Record<string, string>) => usersPathOf(ids.teammateUser);
const GRANTED = { extraPermissions: ['ORG_USERS_EDIT'] };

type ResetCase = {
	label: string;
	/** The app path, with the crafted segments spelled as they are requested. */
	path: (ids: Record<string, string>) => string;
	/** Arms for this case alone. */
	scenario?: Record<string, unknown>;
	anonymous?: boolean;
	headers?: Record<string, string>;
	/** The upstream calls this case is pinned on. */
	asks: (ids: Record<string, string>) => Ask[];
	askedStatus?: number;
	answer: Answer;
	notIntended?: string;
};

const RESET_ROWS: ResetCase[] = [
	{
		label: 'DELETE …/users/[teammate id]: without ORG_USERS_EDIT this app refuses and never asks the reset',
		path: usersApp,
		asks: () => [ROLE_READ_ASK],
		answer: NOT_A_MANAGER,
		notIntended:
			'no Cache-Control on this refusal, unlike every other answer of the file (`two-factor-proxy.ts:110`)'
	},
	{
		label: 'DELETE …/users/[teammate id]: with ORG_USERS_EDIT it goes through, on this exact path',
		path: usersApp,
		scenario: GRANTED,
		asks: (ids) => [ROLE_READ_ASK, { method: 'DELETE', path: usersPathOf(ids.teammateUser), keys: [] }],
		answer: ownJson(200, MOCK_DELETE, null),
		notIntended:
			'no Cache-Control on a manager reset either (`:113`); mock limit: Gauzy answers {reset:true}, this mock answers {affected:1,raw:[]}'
	},
	{
		label: 'DELETE …/users/[own id]: a manager may reset their own second factor through the same route',
		path: (ids) => usersPathOf(ids.user),
		scenario: GRANTED,
		asks: (ids) => [ROLE_READ_ASK, { method: 'DELETE', path: usersPathOf(ids.user), keys: [] }],
		answer: ownJson(200, MOCK_DELETE, null)
	},
	{
		label: 'DELETE …/users/[teammate id] with a caller-sent query: the query is not forwarded, the id is the input',
		path: (ids) => `${usersPathOf(ids.teammateUser)}?laneB=1`,
		asks: () => [ROLE_READ_ASK],
		answer: NOT_A_MANAGER
	},
	{
		label: 'DELETE …/users/[teammate id] signed out: the permission read still ran, same 403 [mock limit: the guard delegates]',
		path: usersApp,
		anonymous: true,
		asks: () => [ROLE_READ_ASK],
		answer: NOT_A_MANAGER
	},
	// A crafted segment. `twoFactorUserIdSchema` is `z.guid()` (`core/lib/validation/two-factor.ts:32`), so nothing that
	// is not a canonical guid reaches `resetMemberTwoFactorRequest`, whose own `encodeURIComponent`
	// (`requests/two-factor.ts:75`) is the second half of the containment. A crafted id is refused before the
	// permission is even read, granted or not — and the mock is asked nothing at all, so no crafted segment ever
	// reached an upstream path.
	{
		label: 'DELETE …/users/..%2Femployee: 400 here, nothing upstream, permission armed or not',
		path: () => usersPathOf('..%2Femployee'),
		asks: () => [],
		answer: invalidBody('A user id is required')
	},
	{
		label: 'DELETE …/users/..%2Femployee with ORG_USERS_EDIT: still 400, and the permission was never read',
		path: () => usersPathOf('..%2Femployee'),
		scenario: GRANTED,
		asks: () => [],
		answer: invalidBody('A user id is required')
	},
	{
		label: 'DELETE …/users/..%2F..%2Femployee with ORG_USERS_EDIT: 400, nothing upstream',
		path: () => usersPathOf('..%2F..%2Femployee'),
		scenario: GRANTED,
		asks: () => [],
		answer: invalidBody('A user id is required')
	},
	{
		label: 'DELETE …/users/x%3Fy%3D1 with ORG_USERS_EDIT: 400, so no `?` escapes into the upstream path',
		path: () => usersPathOf('x%3Fy%3D1'),
		scenario: GRANTED,
		asks: () => [],
		answer: invalidBody('A user id is required')
	},
	{
		label: 'DELETE …/users/[uuid without dashes]: z.guid() wants the canonical form, 400 here',
		path: () => usersPathOf('3db49a7e69d2471a94953b69ece6fc54'),
		scenario: GRANTED,
		asks: () => [],
		answer: invalidBody('A user id is required')
	},
	{
		label: 'DELETE …/users/[teammate id] with Sec-Fetch-Site: cross-site: the 403 of the site check, not the 400 of the id',
		path: () => usersPathOf('..%2Femployee'),
		scenario: GRANTED,
		headers: { 'sec-fetch-site': 'cross-site' },
		asks: () => [],
		answer: FOREIGN_SITE_REFUSAL
	}
];

test.describe('lane-b · the member reset: ORG_USERS_EDIT or nothing, and a [userId] that stays inside its segment', () => {
	for (const item of RESET_ROWS) {
		test(`${item.label}${item.notIntended ? NOT_INTENDED : ''}`, async ({ api, mock, ids, cookies }) => {
			if (item.scenario) await mock.scenario(item.scenario);

			const path = item.path(ids);
			const headers: Record<string, string> = { ...(item.headers ?? {}) };
			if (item.anonymous) headers.cookie = cookies('A', ['auth-token', 'auth-tenant-id']);
			const response = await api(path, { method: 'DELETE', ...(Object.keys(headers).length ? { headers } : {}) });
			const text = await response.text();
			const log = await mock.requests();
			const asked = item.asks(ids);

			console.log(`[lane-b 2fa] MEASURE reset ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(asked, item.askedStatus ?? 200, response, text, path, log, item.answer, item.label);
		});
	}

	// The gate names one permission (`RESET_MEMBER_TWO_FACTOR_PERMISSION`, `two-factor-proxy.ts:31`), matched by
	// `enabledPermissionsOf` (`core/lib/utils/member-access.ts`). Each row hands the role a different one.
	for (const permission of ['ORG_TEAM_EDIT', 'INVOICES_EDIT', 'ORG_EMPLOYEES_EDIT', 'ALL_ORG_EDIT', 'USERS_EDIT']) {
		test(`DELETE …/users/[teammate id] with only ${permission}: refused, the reset was never asked`, async ({
			api,
			mock,
			ids
		}) => {
			await mock.scenario({ extraPermissions: [permission] });
			const path = usersApp(ids);
			const response = await api(path, { method: 'DELETE' });
			const text = await response.text();
			const log = await mock.requests();

			console.log(`[lane-b 2fa] MEASURE gate-${permission} ${witnessOf(path, response, text, log, [ROLE_READ])}`);

			expectRouteAnswer(
				[ROLE_READ_ASK],
				200,
				response,
				text,
				path,
				log,
				NOT_A_MANAGER,
				`the member reset with only ${permission} granted`
			);
		});
	}

	test('DELETE …/users/[teammate id] with ORG_USERS_EDIT held among three permissions: through', async ({
		api,
		mock,
		ids
	}) => {
		await mock.scenario({ extraPermissions: ['ORG_TEAM_EDIT', 'ORG_USERS_EDIT', 'INVOICES_VIEW'] });
		const path = usersApp(ids);
		const response = await api(path, { method: 'DELETE' });
		const text = await response.text();
		const log = await mock.requests();
		const asked = [ROLE_READ_ASK, { method: 'DELETE' as const, path, keys: [] }];

		console.log(`[lane-b 2fa] MEASURE gate-granted-mixed ${witnessOf(path, response, text, log, pathsOf(asked))}`);

		expectRouteAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			ownJson(200, MOCK_DELETE, null),
			'the member reset with ORG_USERS_EDIT held among three permissions'
		);
	});

	test(`DELETE …/users/[teammate id] as roleName SUPER_ADMIN, without the permission: refused [mock limit: this gate reads role-permissions/me, never the role name]`, async ({
		api,
		mock,
		ids
	}) => {
		await mock.scenario({ roleName: 'SUPER_ADMIN' });
		const path = usersApp(ids);
		const response = await api(path, { method: 'DELETE' });
		const text = await response.text();
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE gate-rolename ${witnessOf(path, response, text, log, [ROLE_READ])}`);

		expectRouteAnswer(
			[ROLE_READ_ASK],
			200,
			response,
			text,
			path,
			log,
			NOT_A_MANAGER,
			'the member reset as a SUPER_ADMIN role name without ORG_USERS_EDIT'
		);
	});

	for (const status of REFUSAL_STATUSES) {
		test(`DELETE …/users/[teammate id]: Gauzy's ${status} on the reset is relayed, after the permission read${NOT_INTENDED}`, async ({
			api,
			mock,
			ids
		}) => {
			const path = usersApp(ids);
			await mock.scenario({ ...GRANTED, fails: { [path]: status } });
			const response = await api(path, { method: 'DELETE' });
			const text = await response.text();
			const log = await mock.requests();
			const asked = [ROLE_READ_ASK, { method: 'DELETE' as const, path, keys: [], status }];

			console.log(
				`[lane-b 2fa] MEASURE reset-armed-${status} ${witnessOf(path, response, text, log, [ROLE_READ, path])}`
			);

			expectRouteAnswer(
				asked,
				status,
				response,
				text,
				path,
				log,
				relayedByHandler(status, false),
				`the member reset with ${path} armed ${status}`
			);
			expect(
				triples(await mock.failures()),
				`the member reset with ${path} armed ${status}: the refusal is missing from the failures view (${logOf(log)})`
			).toEqual([`DELETE ${path} ${status}`]);
		});

		test(`DELETE …/users/[teammate id]: Gauzy's ${status} on the permission read becomes this route's answer, no reset asked`, async ({
			api,
			mock,
			ids
		}) => {
			const path = usersApp(ids);
			await mock.scenario({ fails: { [ROLE_READ]: status } });
			const response = await api(path, { method: 'DELETE' });
			const text = await response.text();
			const log = await mock.requests();

			console.log(
				`[lane-b 2fa] MEASURE gate-armed-${status} ${witnessOf(path, response, text, log, [ROLE_READ])}`
			);

			expectRouteAnswer(
				[{ ...ROLE_READ_ASK, status }],
				status,
				response,
				text,
				path,
				log,
				relayedByHandler(status, false),
				`the member reset with ${ROLE_READ} armed ${status}`
			);
		});
	}

	test(`DELETE …/users/[teammate id]: a cut reset answers 502 with this app's own sentence${NOT_INTENDED}`, async ({
		api,
		mock,
		ids
	}) => {
		const path = usersApp(ids);
		await mock.scenario({ ...GRANTED, drops: { [path]: 1 } });
		const response = await api(path, { method: 'DELETE' });
		const text = await response.text();
		const log = await mock.requests();
		const asked = [ROLE_READ_ASK, { method: 'DELETE' as const, path, keys: [], status: 0 }];

		console.log(`[lane-b 2fa] MEASURE reset-cut ${witnessOf(path, response, text, log, [ROLE_READ, path])}`);

		expectRouteAnswer(
			asked,
			0,
			response,
			text,
			path,
			log,
			outage('The second factor could not be reset.', false),
			'the member reset with the delete cut'
		);
		expect(
			await mock.failures(),
			`a cut member reset was counted as a refusal, which would make every "was refused upstream" witness in ` +
				`this lane mean two things (${logOf(log)})`
		).toEqual([]);
	});

	test('DELETE …/users/[teammate id]: a cut permission read answers the same 502 and no reset is asked', async ({
		api,
		mock,
		ids
	}) => {
		const path = usersApp(ids);
		await mock.scenario({ drops: { [ROLE_READ]: 1 } });
		const response = await api(path, { method: 'DELETE' });
		const text = await response.text();
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE gate-cut ${witnessOf(path, response, text, log, [ROLE_READ])}`);

		expectRouteAnswer(
			[{ ...ROLE_READ_ASK, status: 0 }],
			0,
			response,
			text,
			path,
			log,
			outage('The second factor could not be reset.', false),
			'the member reset with the permission read cut'
		);
	});

	for (const item of FOREIGN_HEADERS) {
		test(`DELETE …/users/[teammate id] with ${item.label}: the site check answers before the permission is read`, async ({
			api,
			mock,
			ids
		}) => {
			await mock.scenario(GRANTED);
			const path = usersApp(ids);
			const response = await api(path, { method: 'DELETE', headers: item.headers });
			const text = await response.text();
			const log = await mock.requests();

			console.log(`[lane-b 2fa] MEASURE reset-foreign ${witnessOf(path, response, text, log, [])}`);

			expectRouteAnswer(
				[],
				200,
				response,
				text,
				path,
				log,
				FOREIGN_SITE_REFUSAL,
				`the member reset with ${item.label}`
			);
			expect(
				triples(log),
				`the member reset with ${item.label} reached the test backend (${logOf(log)}) — the permission was read or ` +
					'the reset was asked though the caller came from another site'
			).toEqual([]);
		});
	}

	test('DELETE …/users/[teammate id] with an Origin naming this very host: answered as its granted control', async ({
		api,
		mock,
		ids
	}) => {
		await mock.scenario(GRANTED);
		const path = usersApp(ids);
		const response = await api(path, { method: 'DELETE', headers: { origin: APP_ORIGIN } });
		const text = await response.text();
		const log = await mock.requests();
		const asked = [ROLE_READ_ASK, { method: 'DELETE' as const, path, keys: [] }];

		console.log(`[lane-b 2fa] MEASURE reset-own-origin ${witnessOf(path, response, text, log, [ROLE_READ, path])}`);

		expectRouteAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			ownJson(200, MOCK_DELETE, null),
			'the member reset with an own Origin'
		);
	});
});

/**
 * The mock addresses `fails` / `drops` as `<tenant>:<path>`, then `<tenant>`, then `<path>`
 * (`cypress/support/mock-gauzy-server.mjs:1065-1070` for `drops`, `:1090-1092` for `fails`), and the tenant it matches
 * is the `tenant-id` header
 * `serverFetch` writes from the session (`core/services/server/fetch.ts:95-97`). These routes send their payload in a
 * body or an id the log cannot show, so an arm that fires for the session tenant and not for the other one is the
 * witness that the session tenant travelled. Never armed on `/api/user/me`, never on a bare tenant key.
 *
 * `verify` is not in this list, because its arm cannot fire at all — pinned as its own case below.
 */
const TENANT_KEYED_ARMS: Array<{
	label: string;
	route: ContractRoute;
	askPath: (ids: Record<string, string>) => string;
	/** The member reset is not a row of `ROUTES`, so its calls and answers are named here. */
	reset?: boolean;
}> = [
	{ label: 'GET /api/auth/two-factor', route: statusRoute, askPath: () => UP },
	{ label: 'POST /api/auth/two-factor/enroll', route: enrollRoute, askPath: () => UP_ENROLL },
	{ label: 'POST /api/auth/two-factor/confirm', route: confirmRoute, askPath: () => UP_CONFIRM },
	{ label: 'POST /api/auth/two-factor/disable', route: disableRoute, askPath: () => UP_DISABLE },
	{ label: 'POST /api/auth/two-factor/recovery-codes', route: recoveryRoute, askPath: () => UP_RECOVERY },
	{ label: 'POST /api/auth/switch-workspace', route: switchRoute, askPath: () => UP_SWITCH },
	{
		label: 'DELETE /api/auth/two-factor/users/[userId]',
		route: statusRoute,
		askPath: (ids) => usersPathOf(ids.teammateUser),
		reset: true
	}
];

test.describe('lane-b · an arm addressed to the session tenant fires, the same arm on the other tenant does not', () => {
	for (const item of TENANT_KEYED_ARMS) {
		test(`${item.label}: armed as <tenant A>:<its path>, it is refused as its row says`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const askPath = item.askPath(ids);
			await mock.scenario({
				...(item.reset ? GRANTED : {}),
				fails: { [`${ids.tenantA}:${askPath}`]: 429 }
			});

			const { response, text, path } = await callRoute(
				api,
				cookies,
				item.route,
				ids,
				item.reset ? { path: askPath, method: 'DELETE' } : {}
			);
			const log = await mock.requests();
			const asked = item.reset
				? [ROLE_READ_ASK, { method: 'DELETE' as const, path: askPath, keys: [], status: 429 }]
				: [{ ...item.route.asks(ids)[0], status: 429 }];

			console.log(`[lane-b 2fa] MEASURE tenantA ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(
				asked,
				429,
				response,
				text,
				path,
				log,
				item.reset ? relayedByHandler(429, false) : item.route.refusal(429),
				`${item.label} armed 429 on ${ids.tenantA}:${askPath}`
			);
		});

		test(`${item.label}: armed as <tenant B>:<its path>, nothing of it applies`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const askPath = item.askPath(ids);
			await mock.scenario({
				...(item.reset ? GRANTED : {}),
				fails: { [`${ids.tenantB}:${askPath}`]: 429 }
			});

			const { response, text, path } = await callRoute(
				api,
				cookies,
				item.route,
				ids,
				item.reset ? { path: askPath, method: 'DELETE' } : {}
			);
			const log = await mock.requests();
			const asked = item.reset
				? [ROLE_READ_ASK, { method: 'DELETE' as const, path: askPath, keys: [] }]
				: item.route.asks(ids);

			console.log(`[lane-b 2fa] MEASURE tenantB ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				item.reset ? ownJson(200, MOCK_DELETE, null) : resolve(item.route.control, ids),
				`${item.label} armed 429 on ${ids.tenantB}:${askPath}, which this session never sends`
			);
			expect(
				await mock.failures(),
				`${item.label}: an arm for the other tenant fired anyway (${logOf(log)}), which would mean the tenant ` +
					'that travels is not the session tenant'
			).toEqual([]);
		});
	}

	test(`POST /api/auth/two-factor/verify: an arm addressed to the session tenant cannot fire — that call carries no tenant header${NOT_INTENDED}`, async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		// The arm above is written exactly as it is written for the seven routes it works on, and nothing fires: the
		// mock resolves the tenant of a call from its `tenant-id` header (`mock-gauzy-server.mjs:1090-1092`) and
		// `serverFetch` writes that header only when the caller named a tenant (`fetch.ts:95-97`), while
		// `verifyTwoFactorRequest` names none (`requests/two-factor.ts:83-90`) — it is a public call, and Gauzy decides
		// the tenant from the challenge. The same arm written as a bare path does fire, which is its row's armed 429
		// above, so this is the header, not the arming.
		await mock.scenario({ fails: { [`${ids.tenantA}:${UP_VERIFY}`]: 429 } });
		const { response, text, path } = await callRoute(api, cookies, verifyRoute, ids);
		const log = await mock.requests();
		const asked = verifyRoute.asks(ids);

		console.log(`[lane-b 2fa] MEASURE verify-no-tenant ${witnessOf(path, response, text, log, [UP_VERIFY])}`);

		expectRouteAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			resolve(verifyRoute.control, ids),
			`verify armed 429 on ${ids.tenantA}:${UP_VERIFY}`
		);
		expect(
			await mock.failures(),
			`verify armed 429 on ${ids.tenantA}:${UP_VERIFY}: something was refused upstream (${logOf(log)}) — the ` +
				'verify call sends no tenant header, so no tenant-addressed arm can reach it'
		).toEqual([]);
	});

	test(`POST /api/auth/switch-workspace: the tenant that travels is the session's, not the one the body names${NOT_INTENDED}`, async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		// The body asks for tenant B; `forward-to-gauzy.ts:97` reads the tenant off the session cookies and `:119`
		// sends it, so the arm keyed on the session's tenant A is the one that fires.
		await mock.scenario({ fails: { [`${ids.tenantA}:${UP_SWITCH}`]: 403 } });
		const { response, text, path } = await callRoute(api, cookies, switchRoute, ids);
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE switch-tenant ${witnessOf(path, response, text, log, [UP_SWITCH])}`);

		expectRouteAnswer(
			[{ method: 'POST', path: UP_SWITCH, keys: [] }],
			403,
			response,
			text,
			path,
			log,
			relayedByForward(403),
			`switch-workspace for ${ids.tenantB} armed 403 on ${ids.tenantA}:${UP_SWITCH}`
		);
	});
});

test.describe('lane-b · what these routes carry upstream, and what a caller cannot put into them', () => {
	test('GET /api/auth/two-factor: a caller-sent ?organizationId is not forwarded, the session one is', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const path = `${UP}?organizationId=${ids.organizationB}&laneB=1&code=999999`;
		const { response, text } = await callRoute(api, cookies, statusRoute, ids, { path });
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE status-query ${witnessOf(path, response, text, log, [UP])}`);

		expectRouteAnswer(
			[
				{
					method: 'GET',
					path: UP,
					keys: ['organizationId'],
					absent: ['laneB', 'code'],
					values: { organizationId: ids.organizationA }
				}
			],
			200,
			response,
			text,
			path,
			log,
			resolve(statusRoute.control, ids),
			`GET ${path}`
		);
	});

	test(`GET /api/auth/two-factor in the fixture's other workspace: the organizationId that travels is the cookie's`, async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const { response, text, path } = await callRoute(api, cookies, statusRoute, ids, { scope: 'B' });
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE status-scopeB ${witnessOf(path, response, text, log, [UP])}`);

		expectRouteAnswer(
			[{ method: 'GET', path: UP, keys: ['organizationId'], values: { organizationId: ids.organizationB } }],
			200,
			response,
			text,
			path,
			log,
			resolve(statusRoute.control, ids),
			'GET /api/auth/two-factor with the scope B cookies'
		);
	});

	test('POST /api/auth/two-factor/enroll: the issuer comes from the body; a ?issuer= is ignored', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const path = `${UP_ENROLL}?issuer=FromQuery`;
		const { response, text } = await callRoute(api, cookies, enrollRoute, ids, {
			path,
			body: { issuer: 'FromBody' }
		});
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE enroll-query ${witnessOf(path, response, text, log, [UP_ENROLL])}`);

		// The mock echoes what this app sent upstream, so the answer is the witness for the upstream body.
		expectRouteAnswer(
			[{ method: 'POST', path: UP_ENROLL, keys: [], absent: ['issuer'] }],
			200,
			response,
			text,
			path,
			log,
			ownJson(200, { issuer: 'FromBody' }, 'no-store'),
			`POST ${path}`
		);
	});

	test('POST /api/auth/two-factor/confirm: a caller-sent ?code is not forwarded; the body code is', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const path = `${UP_CONFIRM}?code=999999`;
		const { response, text } = await callRoute(api, cookies, confirmRoute, ids, { path, body: { code: '123456' } });
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE confirm-query ${witnessOf(path, response, text, log, [UP_CONFIRM])}`);

		expectRouteAnswer(
			[{ method: 'POST', path: UP_CONFIRM, keys: [], absent: ['code'] }],
			200,
			response,
			text,
			path,
			log,
			ownJson(200, { code: '123456' }, 'no-store'),
			`POST ${path}`
		);
	});

	test('POST /api/auth/two-factor/verify: a caller-sent ?code is not forwarded either', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const path = `${UP_VERIFY}?code=999999`;
		const { response, text } = await callRoute(api, cookies, verifyRoute, ids, {
			path,
			body: { challenge: 'lane-b.challenge', code: '123456' }
		});
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE verify-query ${witnessOf(path, response, text, log, [UP_VERIFY])}`);

		expectRouteAnswer(
			[{ method: 'POST', path: UP_VERIFY, keys: [], absent: ['code'] }],
			200,
			response,
			text,
			path,
			log,
			ownJson(400, NO_SESSION_BODY, null),
			`POST ${path}`
		);
	});

	test('POST /api/auth/switch-workspace: its one query string is handed on unchanged', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const path = `${UP_SWITCH}?laneB=1`;
		const { response, text } = await callRoute(api, cookies, switchRoute, ids, {
			path,
			body: { tenantId: ids.tenantB }
		});
		const log = await mock.requests();

		console.log(`[lane-b 2fa] MEASURE switch-query ${witnessOf(path, response, text, log, [UP_SWITCH])}`);

		// `forward-to-gauzy.ts:112` appends `new URL(req.url).search` to the path the route fixed.
		expectRouteAnswer(
			[{ method: 'POST', path: UP_SWITCH, keys: ['laneB'], values: { laneB: '1' } }],
			200,
			response,
			text,
			path,
			log,
			resolve(switchRoute.control, ids),
			`POST ${path}`
		);
	});
});

test.describe('lane-b · a verb a route file does not export never reaches these handlers', () => {
	const VERB_ROWS: Array<{ label: string; method: 'GET' | 'POST'; path: (ids: Record<string, string>) => string }> = [
		{ label: 'POST /api/auth/two-factor', method: 'POST', path: () => UP },
		{ label: 'GET /api/auth/two-factor/users/[id]', method: 'GET', path: (ids) => usersPathOf(ids.teammateUser) },
		{ label: 'GET /api/auth/switch-workspace', method: 'GET', path: () => UP_SWITCH }
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

			console.log(`[lane-b 2fa] MEASURE verb405 ${witnessOf(path, response, text, log, [])}`);

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

/** Every case above arms the mock or drops a session cookie; the next test must not inherit either. The `mock`
 * fixture is automatic and resets on its own, so this is the same reset one lane later — kept because it is also what
 * makes "the mock was asked nothing" a claim about this test and not about the previous one. */
test.afterEach(async () => {
	await mockReset();
});
