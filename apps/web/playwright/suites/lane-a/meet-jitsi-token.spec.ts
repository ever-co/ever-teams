import type { Request as BrowserRequest, Response as BrowserResponse } from '@playwright/test';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { test as apiTest } from '../../api-fixtures';
import { expect, test as uiTest, type Page, type Shield } from '../../fixtures';
import { mockReset, signInAndVisit } from '../../helpers';
import { MEET_TEST } from '../../test-servers';

/**
 * The contract of **`GET /api/auth/meet/jwt`** (`app/api/auth/meet/jwt/route.ts`) and of the page that calls it,
 * **`/meet/jitsi`** (`app/[locale]/meet/jitsi/page.tsx` → `core/components/pages/meet/jitsi/page-component.tsx`),
 * measured on lane-a (app `http://localhost:3031`, mock `http://127.0.0.1:3992`, control `http://127.0.0.1:3994`,
 * `playwright/test-servers.ts:38`) on 2026-11-24. Every status, body, key list, header, claim, room string, attempt
 * count, copy string and request count below was measured first against the live lane and only then written down:
 *
 * - `E:\Coding\.tmp\probe-meet\probe1.mjs` … `probe3.mjs` → `E:\Coding\.tmp\s2-lane-a-meet-probe-1.log`, `-2.log`,
 *   `-3.log` (the control, the decoded claims, the name table, the refusals, signed out, cross-site, the repeated
 *   `room` key, the tenant experiment, an armed upstream refusal);
 * - `probe4.mjs` → `-probe-4.log` (what else the mock hears while a meet/jwt call runs — mock limit 3);
 * - `probe5.mjs` → `-probe-5.log` (the browser half: the room the page mints, the token request it sends, the pre-join,
 *   the error card at 500 / 401 / 403, the room stage behind a stubbed `external_api.js`, the refused host);
 * - `probe6.mjs` → `-probe-6.log` (the raw `%5F`, `%20`, `%C3%A9`, `%2F %3F %23` and `+` forms of a room name, the
 *   HS256 signature and its tamper check, the memo contrast on tokens no earlier request used, the header set);
 * - `probe7.mjs` → `-probe-7.log` (the whole name table in one pass, the rejection table, signed out, the
 *   `Cache-Control` contrast with `/api/auth/sessions`, the token clock, a second signature proof);
 * - `probe8.mjs` → `-probe-8.log` and `-probe-8b.log` (the three ways a base64 `+` arrives, and the `roomName`/`jwt`
 *   the Jitsi API was really constructed with, matched against the token answer by hash — in `-8.log` the page-side
 *   stub threw inside the SDK, so the room rows were re-measured in `-8b.log`);
 * - `probe9.mjs` → `-probe-9.log` (the retry paths: armed retry 5 → 9 attempts, unarmed retry 5 → 6 and the pre-join
 *   back, and the room reached after the meeting server was refused).
 *
 * This file's own lane runs are `E:\Coding\.tmp\s2-lane-a-meet-1.log` … `-7.log`; every test prints one
 * `[lane-a meet-jwt] MEASURE …` line carrying what its page showed and what its browser or its request really got, so
 * any assertion here can be re-read against a run log. **No token is ever printed**: a MEASURE line carries lengths,
 * per-segment lengths and hashes only. Two of those runs are kept because each caught a real trap: `-1` the minted-room
 * canonicalisation (finding 14), and `-3` the order answers land in — `page.on('response')` records an answer when its
 * body finished reading, not in send order, so every row that counts answers waits for the count (`waitForTokenAnswer`)
 * and then reads the whole set instead of "the last answer".
 *
 * ## What the lane has to be configured for, and what the mock cannot do
 *
 * `MEET_TEST` (`playwright/test-servers.ts:76-80`) is the secret, the app id and the domain the lane starts the app
 * with: `MEET_JWT_APP_SECRET`, `MEET_JWT_APP_ID` and `NEXT_PUBLIC_MEET_DOMAIN` are set only when the lane runs with
 * `E2E_MEET=1` (`test-servers.ts:153-155`, `:170`), which is why these cases live in the lane that does. Off, the
 * route answers 500 `{ error: 'Server misconfigured' }` (`route.ts:74-77`) and every number below would be measuring
 * something else; the lane check (`playwright/scripts/lane-servers.mjs check lane-a`) is run before any of them.
 *
 * **Mock limit 1 — this mock answers `/api/user/me` whatever arrives** (`cypress/support/mock-gauzy-server.mjs:478`,
 * `:607`), cookie or no cookie, bearer or no bearer. "Signed out" cannot be measured through it: the guard gets a user
 * back and `route.ts:62` never fires. A refusal *is* armable (`mock.scenario({ fails: { '/api/user/me': 401 } })`) and
 * both armed rows are pinned; the cookie-less row is pinned as what the mock really did and marked `[mock limit]`.
 *
 * **Mock limit 2 — the mock ignores cookies** (it reads a `tenant-id` header and a `tenantId` query only,
 * `mock-gauzy-server.mjs:39-43`, `:1181`), so the tenant rows are driven by the `scope` scenario, which changes the
 * user the mock answers (`:100-118`, its `tenantId` at `:110`).
 *
 * **Mock limit 3 — while a lane is idle the mock also hears other people's browsers.** A live shell sends
 * `organization-team`, `tasks/team`, `task-metadata/bootstrap`, `timesheet/timer/status`, `languages`, `time-goals`,
 * `auth/workspaces` and a 404 `embed/grants` of its own (`-probe-4.log`). Every count claimed here comes from a
 * filtered view (`mock.calls('/api/user/me')`, or this file's own watch of the meet/jwt path) and from a run whose
 * lane was free.
 *
 * ## The findings, stated up front (none is tagged `MEASURED, NOT INTENDED`: no code here states an intent that a
 * measurement contradicts; 1 is a hardening gap, 7 is a dev-only double mount, 9 and 10 are console wording)
 *
 * 1. **No answer of this route carries `Cache-Control` at all — not the 200 with the minted token, not a 400.**
 *    Measured on the control and on all six rejected names: `cache-control` absent, media type `application/json`. The
 *    contrast was taken in the same pass: `app/api/auth/sessions/route.ts:8`
 *    (`forwardToGauzy(req, '/auth/sessions', { noStore: true })`) answers `Cache-Control: no-store` as
 *    `application/json; charset=utf-8` (the option's own meaning: `core/services/server/forward-to-gauzy.ts:54-58`),
 *    while this route answers through plain `NextResponse.json` (`route.ts:71`, `:76`, `:92`) and asks for nothing. The
 *    200 body is a bearer token a meeting server accepts, so anything on the way is allowed to keep it. Not tagged:
 *    nothing in `route.ts` states an intent either way — a hardening gap (`noStore` is opt-in per route), not a
 *    contradiction, and worth a `Cache-Control: no-store` on a token answer.
 * 2. **A cross-site call is answered with a token, and no CORS header is written on any answer.** `Origin:
 *    https://evil.example` alone, `Sec-Fetch-Site: cross-site` alone, and both together each give 200 `{ token, room }`
 *    (`-probe-6.log` D rows). This route has no `refuseForeignOrigin` at all (compare
 *    `app/api/integration/github/install/route.ts:7`), and no `access-control-*` header appears — which is the only
 *    thing keeping a foreign page from *reading* the token it was allowed to ask for. Pinned as measured; the boundary
 *    is the absent CORS answer, not a check of the caller's site.
 * 3. **The room follows the session the guard checked, never the `auth-tenant-id` cookie** — as `route.ts:64-69`
 *    means. Measured: scope-B cookies with nothing armed → the tenant A room; the `auth-tenant-id` cookie removed →
 *    still 200 and still the tenant A room; `mock.scenario({ scope: 'B' })` with scope-A cookies → the tenant B room.
 *    The session check names no tenant, so it sends no `tenant-id` header at all
 *    (`core/services/server/requests/auth.ts`, `core/services/server/fetch.ts:95-97` writes that header only when a
 *    tenant was named): the tenant is the one inside the user the upstream answered.
 * 4. **`fresh: true` really does its own session check, every call.** With a token no earlier request of the run used:
 *    two `GET /api/auth/meet/jwt` → **2** `GET /api/user/me`; the same pair on `GET /api/daily-plan/me` (the guard with
 *    no options, `app/api/daily-plan/me/route.ts:16`) → **1** check for two calls. That is
 *    `core/services/server/guards/authenticated-guard-app.ts:78-80` taking `withDeadline(check)` instead of
 *    `sessionChecks.answer(…)`, whose reuse window is `guards/session-check-memo.ts:7`, `:111-124`. Intended, and the
 *    option's doc block names this route for it (`authenticated-guard-app.ts:33-41`).
 * 5. **And the check it makes is not left behind for the next route to reuse.** Meet/jwt first, then a non-`fresh`
 *    route, one token: **2** checks (`-probe-6.log` C3). The non-`fresh` pair first, then meet/jwt: **2** checks for
 *    the three calls (C4) — only the non-`fresh` path stores (`session-check-memo.ts:128-133`).
 * 6. **A name with nothing left after normalization is a 400, and a cross-tenant suffix inside a link name is folded
 *    into the session tenant's room instead of being refused.** `日本語` → 400 (`-probe-7.log`);
 *    `x_<tenant B id>` → `x-<tenant B id>_<tenant A id>`, because `tenantRoomName` turns every `_` of the *name* into
 *    `-` before adding `_<tenant>` (`route.ts:47-56`), which is what makes the first `_` unambiguous. Both are what the
 *    code means (its doc block at `:41-46`) and what its unit test expects (`app/api/auth/meet/jwt/route.test.ts`).
 * 7. **In a dev run the page asks for the token twice** when a room is already on the link — two identical
 *    `GET /api/auth/meet/jwt?room=…`, both 200 with the same room (`-probe-8b.log` P0-P2, P4) — and only **once** when
 *    it had to mint the room itself (P3, `-probe-5.log` 8). `core/hooks/common/use-meet-jwt-token.ts:33-69` runs its
 *    effect per mount and `next dev` mounts each effect twice; `playwright/helpers.ts:37-43` documents the same double
 *    mount for this repo's query reads. So "one token request per meeting page" is not what a dev run measures. Not
 *    tagged: React Strict Mode mounts twice only in development, so a production build is expected to ask once — which
 *    a `next dev` lane cannot measure.
 * 8. **A refused token is retried 1 + 3 times a second apart per mount, and `Try again` starts a whole new 1 + 3.**
 *    Measured: 5 requests before the card appears at 500, 401 and 403 alike (`use-meet-jwt-token.ts:8-9`, `:51-58`);
 *    9 after `Try again` with the refusal still armed (`:71-75`); 6 — one new attempt — with the route handed back,
 *    after which the pre-join is on screen again. 5 is `1 + 3` plus the Strict-Mode mount of finding 7; 9 is
 *    `5 + 1 + 3`; 6 is `5 + 1`.
 * 9. **The console names a different HTTP status from the one the card acts on.** For a stubbed 401 or 403 the page
 *    logs `Failed to fetch JWT token: ApiError: Error (Invalid Request) – The request sent is invalid. (HTTP 404)`
 *    while its card says `toasts.REASONS.SESSION` ("Your session has ended…") or `toasts.REASONS.PERMISSION` ("Your
 *    role does not allow this change."); for a 500 it logs `Error (Option Value is invalid) – … (HTTP 500)` and says
 *    `toasts.REASONS.SERVER`. `core/services/client/api-error.service.ts:273-278` rewrites the *message* from Axios's
 *    own `AxiosErrorDetails` (`ERR_BAD_REQUEST.httpCode = 404`), while the status kept on the error is the real one
 *    (`:292-294`), and `core/lib/utils/error-feedback.ts:58-70` → `:153-180` reads the status, not the message. The
 *    person is told the right thing; the developer's console line is not. Those lines are the only console output this
 *    file exempts from the shield (`TOKEN_REFUSAL_NOISE`).
 * 10. **`[JWT] Failed to decode token: InvalidTokenError: Invalid token specified: missing part #2`** is logged, four
 *    times per attempt, in the 401 row only: the app's own JWT reader is handed the `{ error: 'stubbed refusal' }` body
 *    this file wrote. Exempted as noise of that stub, not as anything the route does.
 * 11. **The room the meeting server is constructed with is the token answer's room, not the link's room**
 *    (`page-component.tsx:123-127` passes `meeting.room` and `meeting.token`). Measured: a link whose decoded room is
 *    `Team Standup` builds `new JitsiMeetExternalAPI('127.0.0.1:4119', { roomName: 'team-standup_<tenant A>', jwt:
 *    <the token the route answered>, … })` — the recorded `jwt` hashes to the same value as the answer's token, and the
 *    recorded `roomName` equals the answer's `room` (`-probe-8b.log` P4). Intended; the comment at `:122` says it.
 * 12. **A link room whose base64 holds a `+` survives all three ways it can arrive** — written raw in the query
 *    (`?room=Um9vbSA+…`, which `useSearchParams` hands over as a space), written `%2B`, and written as a space: each
 *    decodes back to `Room > Sync` and to the same tenant room (`-probe-8b.log` P0, P1, P2). That is
 *    `page-component.tsx:37` (`params.get('room')?.replace(/ /g, '+')`) doing what `core/lib/utils/meetings.ts:32-33`
 *    documents. Intended.
 * 13. **A `room` parameter that is not base64 is not an error: the page mints a fresh room over it**
 *    (`page-component.tsx:35-40`, `:78-91`). Measured for `?room=%%%`, `?room=a.b` and `?room=` — each lands on
 *    `?room=<base64 of a 15-character nanoid>` with exactly one token request (`-probe-5.log` 9b, 9c, 9d). Intended,
 *    pinned so the difference from the API half stays visible: the *route* refuses a name it cannot use (finding 6),
 *    the *page* replaces it.
 * 14. **The name on the address is not the name the token is signed for: the route canonicalises a minted room like any
 *    other name.** The page mints `nanoid(15)` (`core/hooks/common/use-collaborative.ts:29`, put on the address by
 *    `page-component.tsx:83`), whose alphabet is `A-Za-z0-9_-`, and `tenantRoomName` (`route.ts:47-56`) lower-cases,
 *    folds every run of characters outside `a-z0-9-` into `-` and trims the edges. Measured for a minted
 *    `XusAXyc2RLhx9n_`: the request carried that name and the answer's `room` was
 *    `xusaxyc2rlhx9n_<tenant A id>` — the trailing `_` folded into `-` and trimmed, so the name part is 14 characters
 *    here (`s2-lane-a-meet-1.log` row 15). Intended (it is the same folding that keeps the tenant suffix unambiguous,
 *    finding 6) and pinned because a random name is never used verbatim, and can therefore be shorter than the minted
 *    one.
 *
 * ## The stubs this file writes, and what it does not
 *
 * Only two things are ever stubbed, both declared where they are used.
 *
 * - **`page.route` on the token path** (`JWT_ROUTE` below: every request whose path is the route's, with any query),
 *   in the three refusal rows and the two retry rows, answering
 *   `{ error: 'stubbed refusal' }` with 500, 401 or 403. Those answers are this file's invention, standing in for what
 *   an upstream or this route's own 500 (`route.ts:74-77`) looks like to the client; the *statuses* are the ones
 *   `ApiErrorService` and `error-feedback.ts` are keyed on. In every stubbed row the mock is asserted to have logged
 *   nothing on the meet/jwt path, which is the proof the page acted on this file's answer rather than the lane's.
 * - **`page.route('https://127.0.0.1:4119/external_api.js', …)`**, in the two room rows, answering a small stub
 *   `window.JitsiMeetExternalAPI` class that records its constructor arguments into `window.__jitsi`. `MEET_TEST.domain`
 *   is `127.0.0.1:4119` and nothing listens there, so without this stub the room stage cannot be reached at all. The
 *   stub implements the four methods `core/components/integration/meet/index.tsx:35-40` uses **plus `on`, `off` and
 *   `removeListener`**, because `@jitsi/react-sdk@1.4.4` itself calls `apiRef.current.on('readyToClose', …)`
 *   (`node_modules/@jitsi/react-sdk/lib/components/JitsiMeeting.js:53`, straight after constructing at `:38`); a stub
 *   without `on` throws inside the SDK and the page lands on the app's global error boundary (that is exactly what
 *   `-probe-8.log` caught, and why `P4` is read from `-probe-8b.log`). Every method the app calls is a no-op: these
 *   rows prove *what the room was given*, never what a Jitsi server would make of it. The token in those rows comes
 *   from the real route, never from a stub, and is compared by hash only.
 *
 * The script itself is loaded from `https://<domain>/external_api.js` by `core/lib/utils/jitsi-external-api.ts`
 * (`loadJitsiExternalApi`, `JITSI_API_LOAD_TIMEOUT_MS` 15 000) through `core/hooks/common/use-jitsi-external-api.ts`;
 * `127.0.0.1` is a local host for `playwright/fixtures.ts:37`, so the refused-host row is a real refused request and
 * `net::ERR_CONNECTION_REFUSED` is already shield noise (`playwright/helpers.ts:30-44`).
 */

const TOKEN_PATH = '/api/auth/meet/jwt';
const SESSIONS_PATH = '/api/auth/sessions';
const SESSION_CHECK_PATH = '/api/user/me';
const DAILY_PLAN_PATH = '/api/daily-plan/me';
const JITSI_SCRIPT = `https://${MEET_TEST.domain}/external_api.js`;
const JWT_ROUTE = '**/api/auth/meet/jwt*';
const MEET_PAGE = '/meet/jitsi';
const MOCK_LIMIT = ' [mock limit]';

/** `base64("Team Standup")`: the link form a meeting page is opened with. */
const STANDUP_PARAM = Buffer.from('Team Standup', 'utf8').toString('base64');
/** A room name whose base64 holds a `+`, for the three ways such a link can arrive. */
const PLUS_ROOM_NAME = 'Room > Sync';
const PLUS_ROOM_PARAM = Buffer.from(PLUS_ROOM_NAME, 'utf8').toString('base64');

/** `tenantRoomName` ends every room with `_` and the session tenant, lower-cased (`route.ts:55`). */
const roomFor = (name: string, tenantId: string): string => `${name}_${tenantId.toLowerCase()}`;

/**
 * `tenantRoomName`'s whole body (`route.ts:47-56`), for a name this file did not choose — the 15-character nanoid the
 * page mints itself, which can carry upper-case letters and `_`/`-` (finding 14). The rows that name a room write it
 * in its already-canonical form and use `roomFor` above.
 */
const canonicalRoomOf = (name: string, tenantId: string): string => {
	const canonical = name
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, '-')
		.replace(/^-+|-+$/g, '');

	return roomFor(canonical, tenantId);
};

/** The English every copy assertion below is written from, read out of the locale file when this file loads. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as Record<string, unknown>;
const copyOf = (key: string): string => {
	const value = key
		.split('.')
		.reduce<unknown>(
			(node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
			EN
		);
	if (typeof value !== 'string') {
		throw new Error(`locales/en.json holds no string at ${key}`);
	}
	return value;
};

const report = (label: string, value: Record<string, unknown>): void => {
	console.log(`[lane-a meet-jwt] MEASURE ${label} ${JSON.stringify(value)}`);
};

/** A token's parts, decoded: the claims are what this file prints, never the token itself. */
type TokenClaims = {
	aud: string;
	iss: string;
	sub: string;
	room: string;
	iat: number;
	exp: number;
	context: { user: { id: string; avatar: string | null; name: string; email: string } };
};
type JwtHeader = { alg: string; typ: string };
const decodePart = <T>(part: string): T => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
const headerOf = (token: string): JwtHeader => decodePart<JwtHeader>(token.split('.')[0]);
const claimsOf = (token: string): TokenClaims => decodePart<TokenClaims>(token.split('.')[1]);
/** What a token is made of, without what it is: its length and the three segment lengths. */
const shapeOf = (token: string): { length: number; segments: number[] } => ({
	length: token.length,
	segments: token.split('.').map((part) => part.length)
});

/** `jwt.sign(payload, MEET_JWT_APP_SECRET, { algorithm: 'HS256' })` (`route.ts:38`), proven from the outside. */
const signatureValidFor = (token: string, secret: string): boolean => {
	const [header, payload, signature] = token.split('.');
	return createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url') === signature;
};
const withRoomClaim = (token: string, room: string): string => {
	const [header, , signature] = token.split('.');
	const claims = { ...claimsOf(token), room };
	return `${header}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.${signature}`;
};

/**
 * The 53-bit hash the page-side Jitsi stub runs too (`JITSI_STUB` below), so a token can be *proved* to be the one the
 * page was handed without that token ever leaving the page or reaching a log.
 */
const hash53 = (value: string): string => {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c8beef;
	for (let index = 0; index < value.length; index += 1) {
		const char = value.charCodeAt(index);
		h1 = Math.imul(h1 ^ char, 2654435761);
		h2 = Math.imul(h2 ^ char, 1597334677);
	}
	return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

/** The stub `external_api.js` these rows answer for the room stage. See the header: `on` is not optional. */
const JITSI_STUB = `
window.__hash53 = function (str) {
	let h1 = 0xdeadbeef, h2 = 0x41c8beef;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};
window.__jitsi = { calls: [] };
window.JitsiMeetExternalAPI = class {
	constructor(domain, opts) {
		const jwt = opts.jwt || '';
		window.__jitsi.calls.push({
			domain: domain,
			optionKeys: Object.keys(opts).sort(),
			roomName: opts.roomName,
			jwtLength: jwt.length,
			jwtSegments: jwt.split('.').map((p) => p.length),
			jwtHash53: window.__hash53(jwt),
			userInfo: opts.userInfo,
			devices: opts.devices,
			prejoinConfig: opts.configOverwrite && opts.configOverwrite.prejoinConfig,
			resolution: opts.configOverwrite && opts.configOverwrite.resolution
		});
	}
	addListener() { return this; }
	on() { return this; }
	off() { return this; }
	removeListener() { return this; }
	executeCommand() { return this; }
	dispose() { return this; }
	getNumberOfParticipants() { return 1; }
};
`;

type RecordedRoom = {
	domain: string;
	optionKeys: string[];
	roomName: string;
	jwtLength: number;
	jwtSegments: number[];
	jwtHash53: string;
	userInfo: { displayName: string; email: string };
	devices: Record<string, string>;
	prejoinConfig: { enabled: boolean };
	resolution: number;
};

/** The room stage only exists once the SDK has constructed its API instance. */
const waitForRoomApi = async (page: Page): Promise<RecordedRoom[]> => {
	await page.waitForFunction(
		() => {
			const jitsi = (window as unknown as { __jitsi?: { calls: unknown[] } }).__jitsi;
			return Boolean(jitsi && jitsi.calls.length > 0);
		},
		undefined,
		{ timeout: 30_000 }
	);
	return page.evaluate(() => (window as unknown as { __jitsi: { calls: RecordedRoom[] } }).__jitsi.calls);
};

/**
 * The shell's own dev-mode store warning (`suites/lane-a/security-two-factor-ui.spec.ts:389-392` names it the same
 * way; `playwright/helpers.ts:30-44` already keeps `Failed to load resource` and `net::ERR_…` out of the shield), plus
 * the four lines a stubbed token refusal is certain to produce — printed in every MEASURE line of the rows that use
 * them, and exempted from the silence assertions for these exact fragments only.
 */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
const TOKEN_REFUSAL_NOISE = [
	'Failed to fetch JWT token:',
	'[HttpClient] HTTP Error: GET /auth/meet/jwt',
	'[HttpClient] 🚨 CRITICAL: HTTP',
	'[JWT] Failed to decode token'
];
const consoleFindings = (shield: Shield, stubbedRefusal = false): string[] =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !stubbedRefusal || !TOKEN_REFUSAL_NOISE.some((fragment) => line.includes(fragment)));

type TokenRequest = { method: string; room: string | null; query: string };
type TokenAnswer = {
	status: number;
	room: string | null;
	tokenLength: number;
	tokenSegments: number[];
	tokenHash53: string | null;
};

/** What one page sent and got on the token route, and nothing else (mock limit 3). */
const watchTokenRoute = (page: Page) => {
	const requests: TokenRequest[] = [];
	const answers: TokenAnswer[] = [];
	const onRequest = (request: BrowserRequest): void => {
		if (!request.url().includes(TOKEN_PATH)) return;
		requests.push({
			method: request.method(),
			room: new URL(request.url()).searchParams.get('room'),
			query: new URL(request.url()).search
		});
	};
	const onResponse = (response: BrowserResponse): void => {
		if (!response.url().includes(TOKEN_PATH)) return;
		void (async () => {
			let body: { token?: string; room?: string; error?: string } | null = null;
			try {
				body = (await response.json()) as { token?: string; room?: string; error?: string };
			} catch {
				body = null;
			}
			const token = typeof body?.token === 'string' ? body.token : null;
			answers.push({
				status: response.status(),
				room: body?.room ?? null,
				tokenLength: token?.length ?? 0,
				tokenSegments: token ? token.split('.').map((part) => part.length) : [],
				tokenHash53: token ? hash53(token) : null
			});
		})();
	};
	page.on('request', onRequest);
	page.on('response', onResponse);
	return {
		requests,
		answers,
		detach: (): void => {
			page.off('request', onRequest);
			page.off('response', onResponse);
		}
	};
};

/** The card every failed step of a meeting page lands on (`core/components/pages/meet/meet-room-error.tsx:14-45`). */
const errorCardTitle = (): string => copyOf('collaborate.MEETING_UNAVAILABLE');
const expectErrorCard = async (page: Page, description: string): Promise<void> => {
	await expect(page.getByText(errorCardTitle(), { exact: true })).toBeVisible({ timeout: 45_000 });
	await expect(page.getByText(description, { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: copyOf('collaborate.BACK_HOME'), exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: copyOf('collaborate.TRY_AGAIN'), exact: true })).toBeVisible();
};
const preJoinIsOnScreen = async (page: Page): Promise<void> => {
	await expect(page.getByTestId('meet-join-now')).toBeVisible({ timeout: 45_000 });
};
/** The `room=` value as the address really carries it — a `+` stays a `+` here, where `searchParams.get` would hand back a space. */
const rawRoomParamOf = (page: Page): string => {
	const match = /[?&]room=([^&]*)/.exec(page.url());
	if (match === null) return '';
	try {
		return decodeURIComponent(match[1]);
	} catch {
		return match[1];
	}
};
/**
 * The link room the way the page reads it: `params.get('room')?.replace(/ /g, '+')` then `atob`
 * (`page-component.tsx:37`, `:44-51`), so a base64 that arrives as `+`, as `%2B` or as a space all decode to the same
 * name (finding 12). `''` when nothing decodes to a name — a parameter the page will replace.
 */
const linkRoomOf = (page: Page): string =>
	Buffer.from(rawRoomParamOf(page).replace(/ /g, '+'), 'base64').toString('utf8');
/** Waits until the page has sent `count` token requests, so a count can then be pinned exactly. */
const waitForTokenRequests = async (watch: ReturnType<typeof watchTokenRoute>, count: number): Promise<void> => {
	await expect.poll(() => watch.requests.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(count);
};
/** The same for the answers, which land one round-trip after their requests. */
const waitForTokenAnswer = async (watch: ReturnType<typeof watchTokenRoute>, count: number): Promise<void> => {
	await expect.poll(() => watch.answers.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(count);
};

// ======================================================================================
// 1. The route: the answer, the token inside it, the room it names, and its refusals
// ======================================================================================

apiTest.describe('lane-a · GET /api/auth/meet/jwt: the room a meeting token is minted for', () => {
	apiTest(
		'the control: 200 and exactly { token, room }, the link name with the session tenant on the end',
		async ({ api, ids }) => {
			const answer = await api(`${TOKEN_PATH}?room=probe`);
			const body = (await answer.json()) as { token: string; room: string };

			expect(answer.status(), 'the signed-in control').toBe(200);
			expect(Object.keys(body), 'the body of this route is a token and the room it opens, nothing else').toEqual([
				'token',
				'room'
			]);
			expect(body.room).toBe(roomFor('probe', ids.tenantA));
			expect(typeof body.token).toBe('string');
			expect(answer.headers()['content-type'], 'media type of the answer').toBe('application/json');

			report('1 control', {
				status: answer.status(),
				bodyKeys: Object.keys(body),
				room: body.room,
				contentType: answer.headers()['content-type'],
				cacheControl: answer.headers()['cache-control'] ?? 'ABSENT',
				tokenShape: shapeOf(body.token)
			});
		}
	);

	apiTest(
		'the token decodes to what route.ts:22-39 writes: HS256, aud jitsi, iss the app id, sub the meet domain, the person and the room inside',
		async ({ api, ids, names }) => {
			const body = (await (await api(`${TOKEN_PATH}?room=Weekly%20Sync`)).json()) as {
				token: string;
				room: string;
			};
			const header = headerOf(body.token);
			const claims = claimsOf(body.token);

			expect(header, 'the JWT header').toEqual({ alg: 'HS256', typ: 'JWT' });
			expect(Object.keys(claims).sort(), 'the claim set').toEqual([
				'aud',
				'context',
				'exp',
				'iat',
				'iss',
				'room',
				'sub'
			]);
			expect(claims.aud).toBe('jitsi');
			expect(claims.iss, 'iss is MEET_JWT_APP_ID, which the lane sets to MEET_TEST.appId').toBe(MEET_TEST.appId);
			expect(claims.sub, 'sub is NEXT_PUBLIC_MEET_DOMAIN, which the lane sets to MEET_TEST.domain').toBe(
				MEET_TEST.domain
			);
			expect(claims.room, 'the room claim is the room the body names').toBe(body.room);
			expect(claims.room).toBe(roomFor('weekly-sync', ids.tenantA));
			// baseUser carries no imageUrl (`mock-gauzy-server.mjs:100-118`), so `avatar: user.imageUrl || null` is null
			expect(claims.context.user, 'context.user is the person the session check answered').toEqual({
				id: ids.user,
				avatar: null,
				name: names.user,
				email: 'manager@example.test'
			});

			report('2 claims', {
				header,
				claimKeys: Object.keys(claims).sort(),
				aud: claims.aud,
				iss: claims.iss,
				sub: claims.sub,
				room: claims.room,
				contextUser: claims.context.user,
				tokenShape: shapeOf(body.token)
			});
		}
	);

	apiTest(
		'the signature is HMAC-SHA256 over "<header>.<payload>" with MEET_TEST.secret, and a room claim changed by one word breaks it',
		async ({ api }) => {
			const body = (await (await api(`${TOKEN_PATH}?room=Signature%20Probe`)).json()) as { token: string };
			const original = body.token;
			const tampered = withRoomClaim(original, 'tampered-room');

			expect(signatureValidFor(original, MEET_TEST.secret), 'the lane secret signs this token').toBe(true);
			expect(signatureValidFor(original, 'not-the-meet-secret'), 'no other secret does').toBe(false);
			expect(claimsOf(tampered).room, 'the tampered copy does name another room').not.toBe(
				claimsOf(original).room
			);
			expect(signatureValidFor(tampered, MEET_TEST.secret), 'and the minted signature no longer matches it').toBe(
				false
			);

			report('3 signature', {
				originalShape: shapeOf(original),
				tamperedShape: shapeOf(tampered),
				validForMeetSecret: signatureValidFor(original, MEET_TEST.secret),
				validForWrongSecret: signatureValidFor(original, 'not-the-meet-secret'),
				tamperedStillValid: signatureValidFor(tampered, MEET_TEST.secret)
			});
		}
	);

	apiTest('the token clock: exp − iat is exactly 3600 and iat is the moment of the request', async ({ api }) => {
		const body = (await (await api(`${TOKEN_PATH}?room=Clock%20Probe`)).json()) as { token: string };
		const claims = claimsOf(body.token);
		const drift = Math.abs(claims.iat - Math.floor(Date.now() / 1000));

		expect(claims.exp - claims.iat, "TOKEN_TTL '1h' (route.ts:8), as the two claims").toBe(3600);
		expect(drift, 'iat is this request, within a minute').toBeLessThanOrEqual(60);

		report('4 clock', { iat: claims.iat, exp: claims.exp, ttl: claims.exp - claims.iat, driftSeconds: drift });
	});

	apiTest(
		`no Cache-Control on any answer of this route, where app/api/auth/sessions/route.ts:8 marks its answer no-store`,
		async ({ api }) => {
			const token = await api(`${TOKEN_PATH}?room=probe`);
			const refused = await api(`${TOKEN_PATH}?room=!!!`);
			const sessions = await api(SESSIONS_PATH);

			expect(token.headers()['cache-control'], 'the answer that carries a token').toBeUndefined();
			expect(refused.headers()['cache-control'], 'and the 400 beside it').toBeUndefined();
			expect(sessions.headers()['cache-control'], 'the route that did ask for noStore').toBe('no-store');
			expect(sessions.headers()['content-type'], 'and answers as JSON with a charset').toBe(
				'application/json; charset=utf-8'
			);

			report('5 cache-control', {
				tokenRoute: {
					status: token.status(),
					cacheControl: token.headers()['cache-control'] ?? 'ABSENT',
					contentType: token.headers()['content-type']
				},
				tokenRefusal: {
					status: refused.status(),
					cacheControl: refused.headers()['cache-control'] ?? 'ABSENT'
				},
				sessionsRoute: {
					status: sessions.status(),
					cacheControl: sessions.headers()['cache-control'],
					contentType: sessions.headers()['content-type']
				}
			});
		}
	);

	apiTest(
		'the name table: every room is the link name normalized, ends with _<session tenant> and holds no other underscore',
		async ({ api, ids }) => {
			const tenantA = ids.tenantA.toLowerCase();
			const tenantB = ids.tenantB.toLowerCase();
			const rows: Array<{ label: string; query: string; name: string }> = [
				{ label: 'Café Meeting', query: 'Caf%C3%A9%20Meeting', name: 'cafe-meeting' },
				{ label: 'Été Meeting', query: '%C3%89t%C3%A9%20Meeting', name: 'ete-meeting' },
				{ label: 'UPPER', query: 'UPPER', name: 'upper' },
				{ label: 'a__b', query: 'a__b', name: 'a-b' },
				{ label: '--edge--', query: '--edge--', name: 'edge' },
				{ label: 'a/b?c#d written raw', query: 'a%2Fb%3Fc%23d', name: 'a-b-c-d' },
				{ label: 'a+b written raw (a space, to a query)', query: 'a+b', name: 'a-b' },
				{ label: 'plain underscore', query: 'x_y', name: 'x-y' },
				{ label: '%5F encoded underscore', query: 'x%5Fy', name: 'x-y' },
				{ label: '%5F twice', query: 'x%5Fy%5Fz', name: 'x-y-z' },
				{ label: 'dots', query: 'a.b.c', name: 'a-b-c' },
				{ label: 'digits and dashes kept', query: 'room-42-v2', name: 'room-42-v2' },
				{ label: '300 characters', query: 'x'.repeat(300), name: 'x'.repeat(300) },
				{ label: 'a name carrying the other tenant id', query: `x_${ids.tenantB}`, name: `x-${tenantB}` },
				{ label: 'a name carrying this tenant id', query: `x_${ids.tenantA}`, name: `x-${tenantA}` }
			];

			const measured: Array<Record<string, unknown>> = [];
			for (const row of rows) {
				const body = (await (await api(`${TOKEN_PATH}?room=${row.query}`)).json()) as {
					token: string;
					room: string;
				};
				const expected = roomFor(row.name, ids.tenantA);
				expect(body.room, `the room this row got (${row.label})`).toBe(expected);
				expect(claimsOf(body.token).room, `${row.label}: the room claim is the room in the body`).toBe(
					body.room
				);
				expect(expected.endsWith(`_${tenantA}`), `${row.label}: the suffix is the session tenant`).toBe(true);
				const namePart = expected.slice(0, expected.length - tenantA.length - 1);
				expect(namePart.includes('_'), `${row.label}: the name part holds no "_" of its own`).toBe(false);
				measured.push({ label: row.label, query: row.query, room: body.room, roomLength: body.room.length });
			}

			report('6 name table', { tenantA, rows: measured });
		}
	);

	apiTest(
		'the refusals a room name can get: 400 with exactly one error key, for missing, empty, !!!, ___ and whitespace only',
		async ({ api }) => {
			const cases: Array<{ label: string; path: string }> = [
				{ label: 'no room key at all', path: TOKEN_PATH },
				{ label: 'room=', path: `${TOKEN_PATH}?room=` },
				{ label: 'room=!!!', path: `${TOKEN_PATH}?room=!!!` },
				{ label: 'room=___', path: `${TOKEN_PATH}?room=___` },
				{ label: 'room=%20%09%20', path: `${TOKEN_PATH}?room=%20%09%20` },
				{ label: 'room=日本語', path: `${TOKEN_PATH}?room=%E6%97%A5%E6%9C%AC%E8%AA%9E` }
			];

			const measured: Array<Record<string, unknown>> = [];
			for (const item of cases) {
				const answer = await api(item.path);
				const body = (await answer.json()) as Record<string, unknown>;
				expect(answer.status(), item.label).toBe(400);
				expect(Object.keys(body), `${item.label}: the body is the one error sentence`).toEqual(['error']);
				expect(body.error).toBe('Missing or invalid "room" query parameter');
				expect(answer.headers()['cache-control'], `${item.label}: no cache mark either`).toBeUndefined();
				measured.push({ label: item.label, status: answer.status(), body });
			}

			report('7 refusals', { cases: measured });
		}
	);

	apiTest(
		'a caller that repeats the room key gets the first one: ?room=first&room=second mints the first',
		async ({ api, ids }) => {
			const body = (await (await api(`${TOKEN_PATH}?room=first&room=second`)).json()) as {
				token: string;
				room: string;
			};

			expect(body.room).toBe(roomFor('first', ids.tenantA));
			expect(claimsOf(body.token).room).toBe(body.room);

			report('8 repeated room keys', { room: body.room });
		}
	);

	apiTest(
		'the tenant is the session the guard checked, never the auth-tenant-id cookie the browser wrote',
		async ({ api, ids, cookies, mock }) => {
			const cookiesA = (await (await api(`${TOKEN_PATH}?room=probe`)).json()) as { room: string };
			const cookiesB = (await (await api(`${TOKEN_PATH}?room=probe`, { scope: 'B' })).json()) as { room: string };
			const noTenantCookie = (await (
				await api(`${TOKEN_PATH}?room=probe`, { headers: { cookie: cookies('A', ['auth-tenant-id']) } })
			).json()) as { room: string };
			await mock.scenario({ scope: 'B' });
			const sessionMoved = (await (await api(`${TOKEN_PATH}?room=probe`)).json()) as { room: string };

			expect(cookiesA.room).toBe(roomFor('probe', ids.tenantA));
			expect(
				noTenantCookie.room,
				'a session missing its tenant cookie still gets this tenant: the tenant is read from the answered user (route.ts:65-69)'
			).toBe(roomFor('probe', ids.tenantA));
			expect(
				cookiesB.room,
				'the scope-B cookies change nothing on their own — the mock answers the same session user'
			).toBe(roomFor('probe', ids.tenantA));
			expect(sessionMoved.room, 'the session the mock answers does change the room').toBe(
				roomFor('probe', ids.tenantB)
			);

			report('9 tenant source', {
				tenantA: ids.tenantA,
				tenantB: ids.tenantB,
				cookiesScopeA: cookiesA.room,
				cookiesScopeB: cookiesB.room,
				noTenantCookie: noTenantCookie.room,
				scenarioScopeB: sessionMoved.room
			});
		}
	);

	apiTest(
		'fresh: true — every call of this route checks the session again, where the same pair on a route without it shares one check',
		async ({ api, ids, cookies, mock }) => {
			// A token no earlier request of this run used, so the server-side check memo cannot already hold an answer for
			// it (`guards/session-check-memo.ts:111-124` keys by the token).
			const pinnedCookie = (jti: string): string => {
				const now = Math.floor(Date.now() / 1000);
				const token = [
					Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
					Buffer.from(
						JSON.stringify({
							sub: ids.user,
							organizationId: ids.organizationA,
							iat: now,
							exp: now + 86_400,
							jti
						})
					).toString('base64url'),
					'fixture'
				].join('.');
				return cookies('A').replace(/auth-token=[^;]+/, `auth-token=${token}`);
			};

			const meetCookie = pinnedCookie(`meet-fresh-${Date.now()}`);
			await api(`${TOKEN_PATH}?room=probe`, { headers: { cookie: meetCookie } });
			await api(`${TOKEN_PATH}?room=probe`, { headers: { cookie: meetCookie } });
			const meetChecks = await mock.calls(SESSION_CHECK_PATH);

			// The log is one queue per test, so the contrast pair is measured from a cleared one.
			await mockReset();
			const planCookie = pinnedCookie(`plan-fresh-${Date.now()}`);
			await api(DAILY_PLAN_PATH, { headers: { cookie: planCookie } });
			await api(DAILY_PLAN_PATH, { headers: { cookie: planCookie } });
			const planChecks = await mock.calls(SESSION_CHECK_PATH);

			expect(planChecks.length, 'two calls on a route without `fresh` share one session check').toBe(1);
			expect(meetChecks.length, 'two calls of this route each ran their own check').toBe(2);
			expect(
				meetChecks.map((call) => `${call.method} ${call.path} ${call.status}`),
				"both were the guard's own read"
			).toEqual([`GET ${SESSION_CHECK_PATH} 200`, `GET ${SESSION_CHECK_PATH} 200`]);

			report('10 fresh', {
				meetCalls: 2,
				meetChecks: meetChecks.map((call) => `${call.method} ${call.path} ${call.status}`),
				dailyPlanCalls: 2,
				dailyPlanChecks: planChecks.map((call) => `${call.method} ${call.path} ${call.status}`)
			});
		}
	);

	apiTest(
		`signed out: 200 with a token, because this mock answers the session check whatever arrives${MOCK_LIMIT}`,
		async ({ api, mock }) => {
			const answer = await api(`${TOKEN_PATH}?room=probe`, { anonymous: true });
			const body = (await answer.json()) as { token?: string; room?: string; error?: string };
			const checks = await mock.calls(SESSION_CHECK_PATH);

			expect(answer.status(), 'the guard got a user back from the mock, so route.ts:62 was never reached').toBe(
				200
			);
			expect(Object.keys(body)).toEqual(['token', 'room']);
			expect(checks.map((call) => `${call.method} ${call.path} ${call.status}`)).toEqual([
				`GET ${SESSION_CHECK_PATH} 200`
			]);

			report('11 signed out', {
				status: answer.status(),
				bodyKeys: Object.keys(body),
				room: body.room ?? null,
				mockLog: checks.map((call) => `${call.method} ${call.path} ${call.status}`)
			});
		}
	);

	apiTest(
		"an armed refusal of the session check comes back with that status and Gauzy's own body shape",
		async ({ api, mock }) => {
			await mock.scenario({ fails: { [SESSION_CHECK_PATH]: 401 } });
			const answer = await api(`${TOKEN_PATH}?room=probe`);
			const body = (await answer.json()) as Record<string, unknown>;
			const log = await mock.calls(SESSION_CHECK_PATH);

			expect(answer.status(), 'the guard passes the upstream status through').toBe(401);
			expect(body).toEqual({ statusCode: 401, message: 'Unauthorized' });
			expect(log.map((call) => `${call.method} ${call.path} ${call.status}`)).toEqual([
				`GET ${SESSION_CHECK_PATH} 401`
			]);

			report('12 armed refusal of the session check', { status: answer.status(), body });
		}
	);

	apiTest('an upstream that answers 503 is a 503, not an expired session', async ({ api, mock }) => {
		await mock.scenario({ fails: { [SESSION_CHECK_PATH]: 503 } });
		const answer = await api(`${TOKEN_PATH}?room=probe`);
		const body = (await answer.json()) as Record<string, unknown>;

		expect(answer.status()).toBe(503);
		expect(body).toEqual({ statusCode: 503, message: 'Unauthorized' });

		report('13 armed 503 on the session check', { status: answer.status(), body });
	});

	apiTest('cross-site is answered, and no CORS header is written on any answer of this route', async ({ api }) => {
		const cases: Array<{ label: string; headers: Record<string, string> }> = [
			{ label: 'Origin only', headers: { origin: 'https://evil.example' } },
			{ label: 'Sec-Fetch-Site cross-site only', headers: { 'sec-fetch-site': 'cross-site' } },
			{ label: 'both together', headers: { origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' } },
			{ label: 'nothing sent (the control)', headers: {} }
		];

		const measured: Array<Record<string, unknown>> = [];
		for (const item of cases) {
			const answer = await api(`${TOKEN_PATH}?room=probe`, { headers: item.headers });
			const body = (await answer.json()) as { token?: string; room?: string };
			const cors = Object.keys(answer.headers()).filter((name) =>
				name.toLowerCase().startsWith('access-control')
			);
			expect(answer.status(), item.label).toBe(200);
			expect(typeof body.token, `${item.label}: it minted a token`).toBe('string');
			expect(cors, `${item.label}: and wrote no CORS header`).toEqual([]);
			measured.push({ label: item.label, status: answer.status(), room: body.room ?? null, corsHeaders: cors });
		}

		report('14 cross-site', { cases: measured });
	});
});

// ======================================================================================
// 2. The page: the room it asks a token for, what it shows while it fails, the room it joins
// ======================================================================================

uiTest.describe('lane-a · /meet/jitsi: the room the page asks a token for, and the room it opens with it', () => {
	uiTest(
		'with no room in the address the page mints one itself: base64 of a 15-character nanoid, and one token request',
		async ({ page, fixture, shield }) => {
			const watch = watchTokenRoute(page);
			await signInAndVisit(page, fixture, MEET_PAGE);

			await page.waitForURL(/room=/, { timeout: 30_000 });
			const roomParam = rawRoomParamOf(page);
			expect(roomParam, 'the page put a room on the address').not.toBe('');
			expect(roomParam, 'it is base64, as `btoa(randomMeetName())` writes it').toMatch(/^[A-Za-z0-9+/=]+$/);
			const decoded = linkRoomOf(page);
			expect(decoded, 'decoded, it is the 15-character nanoid alphabet, "_" and "-" included').toMatch(
				/^[A-Za-z0-9_-]{15}$/
			);

			await preJoinIsOnScreen(page);
			await waitForTokenAnswer(watch, 1);
			await page.waitForTimeout(1500);
			expect(
				watch.requests.map((call) => call.room),
				'the token was asked for once, for the decoded name'
			).toEqual([decoded]);
			expect(watch.answers[0].status).toBe(200);
			// The route canonicalises the name the page minted: finding 14.
			expect(watch.answers[0].room).toBe(canonicalRoomOf(decoded, fixture.ids.tenantA));

			expect(consoleFindings(shield), 'the minted-room page logged a console error').toEqual([]);
			report('15 no room', {
				url: page.url(),
				roomParamLength: (roomParam as string).length,
				decoded,
				decodedCanonical: canonicalRoomOf(decoded, fixture.ids.tenantA),
				requests: watch.requests,
				answers: watch.answers,
				consoleErrors: shield.consoleErrors()
			});
		}
	);

	uiTest(
		`a room on the link: the pre-join shows no title and the display name, and in a dev run the token is asked for twice`,
		async ({ page, fixture, shield }) => {
			const watch = watchTokenRoute(page);
			await signInAndVisit(page, fixture, `${MEET_PAGE}?room=${STANDUP_PARAM}`);

			await expect(page.getByRole('heading', { level: 1, name: copyOf('meetings.UNTITLED') })).toBeVisible({
				timeout: 45_000
			});
			await expect(page.getByText(copyOf('meetings.READY_TO_JOIN'), { exact: true })).toBeVisible();
			await expect(
				page.getByText(`${copyOf('meetings.JOINING_AS').replace('{name}', fixture.names.user)}`, {
					exact: true
				})
			).toBeVisible();
			await preJoinIsOnScreen(page);

			await waitForTokenAnswer(watch, 2);
			await page.waitForTimeout(1500);
			expect(
				watch.requests.map((call) => `${call.method} ${call.room}`),
				'two identical requests, one per mount'
			).toEqual(['GET Team Standup', 'GET Team Standup']);
			expect(watch.answers.map((answer) => answer.room)).toEqual([
				roomFor('team-standup', fixture.ids.tenantA),
				roomFor('team-standup', fixture.ids.tenantA)
			]);
			expect(watch.answers.length, 'two answers, one per request').toBe(2);
			expect([...new Set(watch.answers.map((answer) => answer.room))], 'both for the same room').toEqual([
				roomFor('team-standup', fixture.ids.tenantA)
			]);

			expect(consoleFindings(shield), 'the pre-join logged a console error').toEqual([]);
			report('16 room on the link', {
				url: page.url(),
				roomParam: STANDUP_PARAM,
				decoded: Buffer.from(STANDUP_PARAM, 'base64').toString('utf8'),
				titleShown: copyOf('meetings.UNTITLED'),
				requests: watch.requests,
				answers: watch.answers,
				consoleErrors: shield.consoleErrors()
			});
		}
	);

	for (const form of [
		{ label: 'the "+" written raw in the query', write: (value: string) => value },
		{ label: 'the "+" written as %2B', write: (value: string) => value.replace(/\+/g, '%2B') },
		{ label: 'the "+" written as a space', write: (value: string) => value.replace(/\+/g, ' ') }
	]) {
		uiTest(
			`a link room whose base64 holds a "+" reaches the same tenant room whichever way it arrives — ${form.label}`,
			async ({ page, fixture }) => {
				const watch = watchTokenRoute(page);
				await signInAndVisit(page, fixture, `${MEET_PAGE}?room=${form.write(PLUS_ROOM_PARAM)}`);

				await preJoinIsOnScreen(page);
				await waitForTokenAnswer(watch, 1);
				await page.waitForTimeout(1500);

				expect(
					[...new Set(watch.requests.map((call) => call.room))],
					'the page decoded the link back to the same name'
				).toEqual([PLUS_ROOM_NAME]);
				expect(
					[...new Set(watch.answers.map((answer) => answer.room))],
					'and the token is minted for one room'
				).toEqual([roomFor('room-sync', fixture.ids.tenantA)]);

				report('17 plus form', {
					form: form.label,
					requestedRooms: [...new Set(watch.requests.map((call) => call.room))],
					answers: watch.answers,
					url: page.url()
				});
				watch.detach();
			}
		);
	}

	for (const bad of [
		{ label: 'room=%%%', path: 'room=%%%' },
		{ label: 'room=a.b', path: 'room=a.b' },
		{ label: 'room=', path: 'room=' }
	]) {
		uiTest(
			`a room parameter that is not base64 is replaced by a fresh random room, not refused — ${bad.label}`,
			async ({ page, fixture }) => {
				const watch = watchTokenRoute(page);
				await signInAndVisit(page, fixture, `${MEET_PAGE}?${bad.path}`);

				await preJoinIsOnScreen(page);
				// The page rewrites the address after its first render, so the new room is waited for, not read once.
				await expect
					.poll(() => linkRoomOf(page), {
						timeout: 45_000,
						message: `${bad.label}: the address was replaced`
					})
					.toMatch(/^[A-Za-z0-9_-]{15}$/);
				const roomParam = rawRoomParamOf(page);
				const decoded = linkRoomOf(page);

				await waitForTokenAnswer(watch, 1);
				await page.waitForTimeout(1500);
				expect(
					watch.requests.map((call) => call.room),
					`${bad.label}: one token request, for the new name`
				).toEqual([decoded]);
				expect(watch.answers[0].room).toBe(canonicalRoomOf(decoded, fixture.ids.tenantA));

				report('18 replaced parameter', {
					case: bad.label,
					roomParam,
					decoded,
					decodedCanonical: canonicalRoomOf(decoded, fixture.ids.tenantA),
					requests: watch.requests,
					answers: watch.answers
				});
				watch.detach();
			}
		);
	}

	for (const refusal of [
		{ status: 500, reasonKey: 'toasts.REASONS.SERVER' },
		{ status: 401, reasonKey: 'toasts.REASONS.SESSION' },
		{ status: 403, reasonKey: 'toasts.REASONS.PERMISSION' }
	]) {
		uiTest(
			`a token refused with ${refusal.status}: 1 + 3 attempts 1 s apart, then the card with the reason that status maps to`,
			async ({ page, fixture, mock, shield }) => {
				const watch = watchTokenRoute(page);
				// This file's own answer: the app's route is stubbed so the client sees exactly one status.
				await page.route(JWT_ROUTE, (route) =>
					route.fulfill({
						status: refusal.status,
						contentType: 'application/json',
						body: JSON.stringify({ error: 'stubbed refusal' })
					})
				);
				await signInAndVisit(page, fixture, `${MEET_PAGE}?room=${STANDUP_PARAM}`);

				await expectErrorCard(page, copyOf(refusal.reasonKey));
				expect(
					watch.requests.length,
					`${refusal.status}: 1 + 3 attempts on the mount Strict Mode left running`
				).toBe(5);
				expect(
					watch.requests.map((call) => call.room),
					'every attempt asked for the same room'
				).toEqual(Array.from({ length: 5 }, () => 'Team Standup'));
				expect(await mock.calls(TOKEN_PATH), 'the stubbed route never reached the mock').toEqual([]);

				expect(
					consoleFindings(shield, true),
					"a console error that is not one of this stub's own lines"
				).toEqual([]);
				report('19 refusal card', {
					status: refusal.status,
					attempts: watch.requests.length,
					reasonKey: refusal.reasonKey,
					titleShown: errorCardTitle(),
					descriptionShown: copyOf(refusal.reasonKey),
					consoleErrors: shield.consoleErrors()
				});
				watch.detach();
				await page.unroute(JWT_ROUTE);
			}
		);
	}

	uiTest(
		'Try again with the refusal still armed: a whole new 1 + 3, and the same card again',
		async ({ page, fixture, shield }) => {
			const watch = watchTokenRoute(page);
			await page.route(JWT_ROUTE, (route) =>
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'stubbed refusal' })
				})
			);
			await signInAndVisit(page, fixture, `${MEET_PAGE}?room=${STANDUP_PARAM}`);

			const card = page.getByText(errorCardTitle(), { exact: true });
			await expectErrorCard(page, copyOf('toasts.REASONS.SERVER'));
			const firstAttempts = watch.requests.length;

			await page.getByRole('button', { name: copyOf('collaborate.TRY_AGAIN'), exact: true }).click();
			await expect(card, 'the card goes away while the new attempts run').toBeHidden({ timeout: 30_000 });
			await expect(card, 'and comes back once the new 1 + 3 is spent').toBeVisible({ timeout: 45_000 });

			expect(firstAttempts, 'the mount that was refused first').toBe(5);
			expect(watch.requests.length, 'and 1 + 3 more after Try again').toBe(9);

			report('20 armed retry', {
				firstAttempts,
				totalAttempts: watch.requests.length,
				consoleErrorCount: shield.consoleErrors().length
			});
			watch.detach();
			await page.unroute(JWT_ROUTE);
		}
	);

	uiTest(
		'Try again with the route handed back: one new attempt, its token, and the pre-join again',
		async ({ page, fixture }) => {
			const watch = watchTokenRoute(page);
			await page.route(JWT_ROUTE, (route) =>
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({ error: 'stubbed refusal' })
				})
			);
			await signInAndVisit(page, fixture, `${MEET_PAGE}?room=${STANDUP_PARAM}`);
			await expectErrorCard(page, copyOf('toasts.REASONS.SERVER'));
			const firstAttempts = watch.requests.length;

			await page.unroute(JWT_ROUTE);
			await page.getByRole('button', { name: copyOf('collaborate.TRY_AGAIN'), exact: true }).click();
			await expect(page.getByText(errorCardTitle(), { exact: true })).toBeHidden({ timeout: 30_000 });
			await preJoinIsOnScreen(page);

			// An answer is recorded when its body finished reading, not in send order, so the count is waited for and the
			// claim is then made about the whole set: five stubs, and one answer that went through the real route.
			await waitForTokenAnswer(watch, 6);
			expect(firstAttempts, 'the mount that was refused').toBe(5);
			expect(watch.requests.length, 'one attempt answered this time').toBe(6);
			expect(watch.answers.length, 'one answer per request').toBe(6);
			expect(
				watch.answers.filter((answer) => answer.status === 500),
				"five of them were this file's stub"
			).toHaveLength(5);
			const answered = watch.answers.filter((answer) => answer.status === 200);
			expect(answered, 'and exactly one reached the real route').toHaveLength(1);
			expect(answered[0].room).toBe(roomFor('team-standup', fixture.ids.tenantA));
			await expect(
				page.getByText(`${copyOf('meetings.JOINING_AS').replace('{name}', fixture.names.user)}`, {
					exact: true
				})
			).toBeVisible();

			report('21 unarmed retry', {
				firstAttempts,
				totalAttempts: watch.requests.length,
				answers: watch.answers,
				url: page.url()
			});
			watch.detach();
		}
	);

	uiTest(
		"the room stage: the roomName and the jwt the meeting server is constructed with are the token answer's room and its token",
		async ({ page, fixture, shield }) => {
			const watch = watchTokenRoute(page);
			await page.route(JITSI_SCRIPT, (route) =>
				route.fulfill({ status: 200, contentType: 'application/javascript', body: JITSI_STUB })
			);
			await signInAndVisit(page, fixture, `${MEET_PAGE}?room=${STANDUP_PARAM}`);
			await preJoinIsOnScreen(page);

			await expect.poll(() => watch.answers.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
			await page.getByTestId('meet-join-now').click();
			const calls = await waitForRoomApi(page);

			expect(calls.length, 'the room built exactly one meeting API instance').toBe(1);
			const recorded = calls[0];
			expect(
				recorded.domain,
				'the domain is NEXT_PUBLIC_MEET_DOMAIN, which the lane sets to MEET_TEST.domain'
			).toBe(MEET_TEST.domain);
			expect(
				recorded.roomName,
				"the room asked for is the token answer's room, not the name written in the link"
			).toBe(roomFor('team-standup', fixture.ids.tenantA));
			// Which of the two Strict-Mode answers won the race into `issued` is not knowable from outside, so the room's
			// token is matched against the answers this page got — by hash, never by the token itself.
			expect(
				watch.answers.some((answer) => answer.tokenHash53 === recorded.jwtHash53),
				'the jwt handed over is one of the tokens this route answered'
			).toBe(true);
			expect(
				watch.answers.some((answer) => answer.tokenSegments.join('.') === recorded.jwtSegments.join('.')),
				'and it is the same token, segment for segment'
			).toBe(true);
			expect(recorded.jwtLength, 'with the length the answer carried too').toBe(
				watch.answers.find((answer) => answer.tokenHash53 === recorded.jwtHash53)?.tokenLength
			);
			expect(recorded.userInfo, 'the person the room is introduced as').toEqual({
				displayName: fixture.names.user,
				email: ''
			});
			expect(
				recorded.prejoinConfig,
				"the room is opened straight through: the pre-join above it is the app's"
			).toEqual({ enabled: false });
			expect(recorded.resolution, 'and at the height the room asks for').toBe(720);
			expect(recorded.devices, 'with no device named, because this browser refused both').toEqual({});
			await expect(page.getByTestId('meet-room-bar')).toBeVisible();
			await expect(page.getByText(copyOf('meetings.CONNECTING'), { exact: true })).toBeVisible();

			expect(consoleFindings(shield), 'the room stage logged a console error').toEqual([]);
			report('22 room stage', {
				domain: recorded.domain,
				optionKeys: recorded.optionKeys,
				roomName: recorded.roomName,
				jwtShape: { length: recorded.jwtLength, segments: recorded.jwtSegments, hash53: recorded.jwtHash53 },
				answerShape: watch.answers.map((answer) => ({
					room: answer.room,
					tokenLength: answer.tokenLength,
					tokenSegments: answer.tokenSegments,
					tokenHash53: answer.tokenHash53
				})),
				userInfo: recorded.userInfo,
				devices: recorded.devices,
				consoleErrors: shield.consoleErrors()
			});
			watch.detach();
		}
	);

	uiTest(
		'the meeting server unanswered: the room says the server could not be reached, and Try again opens the room',
		async ({ page, fixture, shield }) => {
			const watch = watchTokenRoute(page);
			await page.route(JITSI_SCRIPT, (route) => route.abort('connectionrefused'));
			await signInAndVisit(page, fixture, `${MEET_PAGE}?room=${STANDUP_PARAM}`);
			await preJoinIsOnScreen(page);
			await waitForTokenRequests(watch, 2);
			const attemptsBeforeJoin = watch.requests.length;

			await page.getByTestId('meet-join-now').click();
			await expectErrorCard(
				page,
				copyOf('collaborate.MEETING_SERVER_UNREACHABLE').replace('{domain}', MEET_TEST.domain)
			);
			expect(consoleFindings(shield), 'a refused local request is shield noise; nothing else was logged').toEqual(
				[]
			);

			await page.unroute(JITSI_SCRIPT);
			await page.route(JITSI_SCRIPT, (route) =>
				route.fulfill({ status: 200, contentType: 'application/javascript', body: JITSI_STUB })
			);
			await page.getByRole('button', { name: copyOf('collaborate.TRY_AGAIN'), exact: true }).click();
			const calls = await waitForRoomApi(page);

			expect(calls.length, 'the room reloaded the script and built its API instance').toBe(1);
			expect(calls[0].roomName).toBe(roomFor('team-standup', fixture.ids.tenantA));
			expect(watch.requests.length, 'and asked for no new token to do it').toBe(attemptsBeforeJoin);

			report('23 host refused', {
				tokenAttemptsBeforeJoin: attemptsBeforeJoin,
				tokenAttemptsAfterRetry: watch.requests.length,
				cardTitle: errorCardTitle(),
				cardDescription: copyOf('collaborate.MEETING_SERVER_UNREACHABLE').replace('{domain}', MEET_TEST.domain),
				roomNameAfterRetry: calls[0].roomName,
				consoleErrors: shield.consoleErrors()
			});
			watch.detach();
		}
	);
});
