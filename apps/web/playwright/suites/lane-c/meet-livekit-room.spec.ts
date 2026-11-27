import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test, type BootstrapFixture, type MockControl, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInWithFixture } from '../../helpers';
import { LIVEKIT_TEST } from '../../test-servers';

// Without E2E_LIVEKIT=1 the lane app has no LiveKit key, and /api/livekit answers 500 "Server misconfigured": skip, do not fail.
test.skip(process.env.E2E_LIVEKIT !== '1', 'needs a lane started with E2E_LIVEKIT=1 (test-servers.ts LIVEKIT_TEST)');

/**
 * What a signed-in person sees on **`/meet/livekit?roomName=…`**, and what **`GET /api/livekit`** really answers,
 * measured on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, stats `4003`, control `4004`, issuer
 * `4005` — `playwright/test-servers.ts:40`) on 2026-11-24. Nothing in the repo covered this route before: the only
 * e2e rows that touch `/api/livekit` are `suites/lane-c/session-check.spec.ts:191-210` (this route pays its own fresh
 * session check, and 400s when the room is missing) and `suites/mock/meetings.spec.ts`, which *stubs* `/api/livekit`
 * to pin that room names reach the page in base64. `app/api/livekit/route.test.ts` mocks both
 * `authenticatedGuard` and `livekit-server-sdk`'s `AccessToken`, so it pins the **arguments** the route hands the SDK;
 * rows 1-7 below pin the **artifact the real SDK signs** — the header, an HS256 signature checked here with
 * `node:crypto`, the claims as the SDK writes them (`nbf: 0`, an `exp` 3600 s out) and the grant as it lands — plus
 * what the browser does with a LiveKit server that is not there.
 *
 * ## Where every number came from
 *
 * Measuring probes `E:\Coding\.tmp\probe-livekit\probe{1..10}.mjs` → logs `E:\Coding\.tmp\s2-lane-c-livekit-probe-{2..10}.log`
 * (`-1.log` is unusable: a missing paren in that probe's `page.on('response')` handler made it throw before printing;
 * `probe10.mjs` was written to pin the Leave-with-the-socket-held-open screen but its run was cut short by a PC reboot,
 * so the **screen copy** of that state is not pinned here — its structural half is, in row 11; see OPEN). Every value
 * asserted below is one a `MEASURE` line printed in one of
 * those logs, and every `file:line` was re-read from the source after that run.
 *
 * **Green on the lane:** two consecutive whole-file runs, 18 passed each, on 2026-11-24
 * (`.tmp/s2-lead-livekit-5.log` and `-6.log` under the Coding root), with
 * `E2E_LANE=lane-c E2E_REUSE_SERVERS=1 E2E_EVER_ID=1 E2E_DOCS=1 E2E_LIVEKIT=1 E2E_BROWSER_CHANNEL=chrome npx playwright test --config playwright/playwright.lane.config.ts meet-livekit-room`.
 * Each test prints a `[lane-c livekit] MEASURE …` line with what its page showed and what its request really got, so a
 * run can be compared against the probe logs row by row. `test.use({ navigationTimeout })` is raised because a cold
 * `next dev` compile of this route measured longer than Playwright's 30 s default (`…probe-1` first `page.goto`, and
 * `lane-servers.mjs check lane-c` said the lane was healthy at the same moment).
 *
 * ## Which components this drives
 *
 * - `app/[locale]/meet/livekit/page.tsx` → `core/components/pages/meet/livekit/page-component.tsx` (144 lines):
 *   `flow = useMeetingRoomFlow(roomNameOfParam(roomName))` :29, the params effect that writes
 *   `localStorage['current-room-live-kit']` :45-52, `onLeave` (its `requestedRoom` guard :32-35, then
 *   `removeItem` :36 and `leave()` :37), `useTokenLiveKit({roomName})` :54-56, `rejoin` :58-63, `join` :65-71 with
 *   `isRoomTokenStale` :68, `canJoin = hasToken && hasRoomName` :73-75, the no-room error :78-85 (no `onRetry`), the
 *   error branch :87-95, `prejoin` :102-111, `left` :112, `room && !canJoin` :113, `LazyLiveKit` :114-135, and
 *   `withAuthentication(…, {skeleton: LiveKitMeetPageSkeleton})` :140-144.
 * - `app/api/livekit/route.ts` (51 lines): `authenticatedGuard(req, res, {fresh: true})` :9, `if (!guard.user) return guard.deny()` :11,
 *   `if (!user?.tenantId) → 401 {"error":"Unauthorized"}` :14-17, the `roomName` trim gate :19-23, the env gate
 *   :25-33, `new AccessToken(apiKey, apiSecret, {identity: user.email || user.id, ttl: '1h'})` :36-38,
 *   `addGrant({room: \`${user.tenantId}:${room}\`, roomJoin, canPublish, canSubscribe, canPublishData})` :39-44,
 *   `{token}` :46.
 * - `core/services/server/livekitroom.ts` (`fetch('/api/livekit?roomName=…')`, and the `Error` with a `status` it
 *   throws on `!response.ok`), `core/hooks/common/use-live-kit.ts` (the fetch effect :23-55 with its
 *   `console.error('Failed to fetch token:', error)` :43, `retry` :57-60, `refresh` :66-70),
 *   `core/lib/utils/meetings.ts` (`roomNameOfParam` :31-45, base64 with `+` restored from spaces; `meetingTitleOf`
 *   :126-141, which is where the "Team · First" title comes from; `TOKEN_FRESH_MINUTES` :20 / `isRoomTokenStale` :26-28),
 *   `core/hooks/meetings/use-meeting-room-flow.ts` (stages, `attempt`, `title`).
 * - The copy it renders, all read from `locales/en.json` at load: `core/components/pages/meet/meet-room-error.tsx`
 *   (`collaborate.MEETING_UNAVAILABLE` + the description + `collaborate.BACK_HOME`, and `collaborate.TRY_AGAIN` only
 *   when an `onRetry` was passed) on `core/components/common/notice.tsx` (a `<output>`, title in a `<p>`, description
 *   in a `<div>` — so an error card has **no `<h1>`**, which row 8 pins);
 *   `core/components/pages/meet/pre-join/meet-pre-join.tsx` (`section aria-label={meetings.PREVIEW}` :85,
 *   `data-testid="meet-preview-video"` :93, `meetings.CAMERA_OFF` :101, the mic/camera toggles :107-123 with
 *   `aria-label` `meetings.TURN_MIC_OFF` / `meetings.TURN_CAMERA_OFF` and `aria-pressed={!enabled}`,
 *   `DeviceAccessNotices` :155, `DeviceField`s only when `canChooseDevices` :79,159-176,
 *   `data-testid="meet-join-now"` :189-190); `core/components/pages/meet/pre-join/device-fields.tsx` (`access === 'denied'`
 *   → `meetings.DEVICES_BLOCKED` + `DEVICES_BLOCKED_HINT` + a Try-again button), its `LevelMeter`
 *   (`role="meter" aria-label={meetings.MIC_LEVEL}`); `core/components/integration/livekit/index.tsx`
 *   (`onError` :172-183 → `console.error('LiveKit connection error:', err)` :173, `onConnected` :184,
 *   `onDisconnected={onLeave}` :202, `LiveKitRoomBar` :204, `joinedAt === null && <MeetRoomSkeleton/>` :206);
 *   `core/components/pages/meet/room/meet-room-bar.tsx` (`header data-testid="meet-room-bar"`, `meetings.CONNECTING`
 *   while `joinedAt === null`); `core/components/pages/meet/room/meet-left.tsx` (`div role="status"`,
 *   `meetings.YOU_LEFT`, `meetings.YOU_LEFT_HINT`, `data-testid="meet-rejoin"`);
 *   `core/components/pages/meet/meet-room-skeleton.tsx` (`role="status" aria-busy="true"`,
 *   `collaborate.PREPARING_MEETING`); `core/lib/utils/error-feedback.ts` (`errorReasonKeyOf` :203-205 →
 *   `toasts.REASONS.*` through `reasonOfStatus` :153-178); `core/services/server/guards/authenticated-guard-app.ts`
 *   (`fresh` :9, `authenticated()` :15-23, the cookie/tab session :61-72, the memo and its `withDeadline` bypass :79-85,
 *   the refusal shape and `deny()` :88-113).
 *
 * ## Console rule as it was applied here
 *
 * **This file adds no console exclusion of its own** — no `SHELL_STORE_NOISE`-style list. The only error lines the runs
 * produced beyond what the shield keeps are ones `playwright/helpers.ts:30-44` `CONSOLE_NOISE` already carries by exact
 * text (`/Failed to load resource/i`, `/net::ERR_/`), and they are named here because they matter to a LiveKit
 * meeting: Chrome's own `WebSocket connection to 'ws://127.0.0.1:4120/rtc/v1?access_token=…' failed: …
 * net::ERR_CONNECTION_REFUSED` **names the room token**, and it is exactly that `/net::ERR_/` entry that keeps it out
 * of `shield.consoleErrors()`; the paired `Failed to load resource: net::ERR_CONNECTION_REFUSED` from the SDK's
 * http-`/rtc/v1/validate` fallback is kept out by the other entry. Every other error the app logged is asserted on,
 * not excluded: rows 10 and 12 pin the app's own `LiveKit connection error:` (`index.tsx:173`) and
 * `Failed to fetch token:` (`use-live-kit.ts:43`) lines, and assert that the shield's kept set contains **nothing
 * else** and never contains `access_token`.
 *
 * ## Media
 *
 * `getUserMedia` is **scripted on every page row** (`scriptMedia`), because Chrome's own fake capture device was
 * measured not to be dependable on this runner: granted, a second open in the same browser was answered
 * `NotFoundError` for the camera in 2 of 4 repeats; not granted, the answer was `NotAllowedError` in 2 of 4 and
 * `NotFoundError` in the other 2 (a wrapper around `getUserMedia` logged every call). Rows 9-11 get a stream of a
 * painted canvas and an oscillator; rows 15-18 get one answer each: `NotAllowedError` (blocked: a warning, its hint
 * and a retry), `NotFoundError` (missing: an info line and no retry), `NotReadableError` (busy: a warning and a
 * retry), and the mixed answers Chrome itself once gave (row 18, finding 6). `--use-fake-device-for-media-stream`
 * stays, so `enumerateDevices` lists a camera, a microphone and a speaker on a runner with none; the camera and
 * microphone permissions are granted only in the 9-11 describe. In every refusal row the token request and the Join
 * button stay exactly as they are with devices. No meter level, device label list or elapsed-time value is asserted
 * anywhere.
 *
 * ## Findings
 *
 * 1. **[MEASURED, NOT INTENDED] the document title is the route segment's, not the meeting's.**
 *    `page-component.tsx:101` renders `<Meta title={flow.title ?? t('meetings.TITLE')} />`, and `Meta`
 *    (`core/components/common/meta.tsx:16`) writes `<title>{title | siteName}</title>` with `siteName = APP_NAME`
 *    (`core/constants/config/constants.tsx:326`) — so the intended title for this page is `Team · First | Ever Teams`.
 *    Measured (`…probe-9.log` M): the SSR `<title>` and the browser's `document.title` 2.5 s after load are both
 *    **`Meet | Livekit`**, with exactly one `<title>` element, i.e. `next/head`'s element never arrives — which is what
 *    `withAuthentication(…, {skeleton: …})` (`page-component.tsx:140-144`) predicts, since the skeleton is what the
 *    server renders and nothing re-runs the head after hydration. Beside it, `/meet` hydrates to
 *    `Meetings | Ever Teams` and `/calendar` to `Calendar | Ever Teams`, so the mechanism works on pages that are not
 *    behind the auth skeleton. Row 9 pins the measured title and the `<h1>` that *is* the meeting title.
 * 2. **A refusal from the session read is answered with that refusal's own status and body, not a blanket 401.**
 *    Armed `fails: {'/api/user/me': 401 | 500 | 429}` → the route answers 401 / 500 / 429 with
 *    `{"message":"Synthetic Gauzy refusal (401|500|429)"}`; armed `drops: {'/api/user/me': 1}` → 503
 *    `{"message":"Session check unavailable, retry later"}` (`authenticated-guard-app.ts:88-113`: the status is the
 *    upstream's when it is ≥ 400, else 503, and `deny()`'s message is the upstream message unless 503). Rows 5 and 6 pin
 *    all four, and rows 12-13 pin what the *page* then shows: `toasts.REASONS.SESSION` copy for 401 and
 *    `toasts.REASONS.SERVER` copy for ≥ 500 (`error-feedback.ts:153-178`), each with a Try-again button that really
 *    sends another request. Neutral: this is the guard's documented shape, and the page's mapping is its own.
 * 3. **The room prefix follows the tenant the session read returned, not the `auth-tenant-id` cookie.**
 *    `route.ts:14` says the tenant comes from the guard's user, and rows 7 prove it both ways: cookies of tenant B
 *    with the mock answering tenant A → grant `…/…` prefixed **tenant A**; cookies of tenant A with
 *    `scenario: {scope: 'B'}` → prefixed **tenant B**. Not a defect — it is the intent written in that comment, pinned
 *    so a later refactor cannot quietly switch to the cookie.
 * 4. **`roomName` is not required to be base64 on the route, only on the page.** `roomNameOfParam`
 *    (`meetings.ts:31-45`) decodes the link's base64, but `route.ts:19-23` only trims: `plain-name` and `a/b/c` are
 *    answered 200 with the grant room `<tenantId>:plain-name` and `<tenantId>:a/b/c` verbatim (row 4). The route also
 *    400s `roomName=`, `%20%20` and `%09%0a` — the trim, not an emptiness check on the raw string.
 * 5. **The LiveKit stage settles on `left`, not on an error card, when the server refuses.** With the token in hand and
 *    nothing listening on `ws://127.0.0.1:4120`, the browser makes one WebSocket attempt (`/rtc/v1`, query
 *    `access_token` + `join_request`) and one http fallback `GET http://127.0.0.1:4120/rtc/v1/validate`, LiveKit
 *    reports the failure through `onError` (`index.tsx:172-183`, which logs it) and reaches `onDisconnected`
 *    (`:202`) → the page's `onLeave` → stage `left` with a **Rejoin** button, and `current-room-live-kit` is gone
 *    (`page-component.tsx:36`). Rows 10-11 pin that whole chain. The room stage itself is only reachable stably by
 *    holding the socket open (row 11's `page.routeWebSocket` interception, never answered): unintercepted, the bar is
 *    visible for a moment mid-transition and then gone.
 * 6. **A refused microphone beside a missing camera reads as "nothing found".** `openDevices`
 *    (`use-media-preview.ts:150-175`) tries each device alone only when the joint call says `NotFoundError`, and
 *    when both single calls fail it rethrows the **joint** error. So when the camera is missing and the browser refused
 *    the microphone (`NotAllowedError`), the page shows `meetings.DEVICES_MISSING` ("No camera or microphone found.
 *    You can still join and listen.") with no retry, and never `DEVICES_BLOCKED` with its hint to allow the
 *    microphone. Chrome gave exactly these three answers on this runner once, and row 18 replays them. Not tagged: no
 *    comment, unit test or copy says what a mixed refusal should show (`meet-pre-join.test.tsx` covers one device
 *    missing while the other works, both missing, and both blocked); it is a gap in what the person is told.
 *
 * ## Lane limits, stated rather than worked around
 *
 * - **The mock never checks a session** (`cypress/support/mock-gauzy-server.mjs`, and `suites/lane-c/PLAN.md`: "`/api/user/me`
 *   is answered with the fixture user whatever arrives"). So "no session → 401" is **not measurable** on a lane: a
 *   caller with no cookies at all gets 200 and a valid token for the fixture tenant (row 8 pins exactly that, with the
 *   mock's own `GET /api/user/me 200` log entry as the reason). Every refusal row here is armed through
 *   `mock.scenario({fails|drops})`, which is how a refusal *can* be produced on this lane.
 * - **There is no LiveKit server on a lane.** `E2E_LIVEKIT=1` starts the app with `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
 *   and `NEXT_PUBLIC_LIVEKIT_URL = ws://127.0.0.1:4120` (`test-servers.ts:162-167`) and nothing listens on 4120. A real
 *   connected room — media tracks, participants, a rejoin after a genuine disconnect, the `left` stage after `Leave`
 *   on a working server — cannot be measured here. Row 11 pins the room stage as far as an unanswered socket allows
 *   and stops there; the brief's "leave / rejoin" is pinned through the refused path only (row 10-11), not faked.
 * - `auth-tenant-id` and the token cookie are what the app's `InitState` reads; the mock reads a `tenant-id` header /
 *   `tenantId` query only. Tenant rows are therefore driven by `scenario: {scope}` and by the cookies, and both are
 *   pinned in row 7.
 * - Each test gets its own context, so `localStorage` starts empty: that is what makes the `null` pins in rows 8 and 10
 *   mean "the app removed it" rather than "nobody wrote it".
 *
 * ## OPEN — measured, deliberately not pinned here
 *
 * - **Leave while the socket is held open and unanswered**: `probe4.mjs` (and `…probe-4.log`) measured that the bar
 *   disappears, no `left` stage appears (`meet-rejoin` count 0), `current-room-live-kit` is **not** cleared, and the
 *   console gains `LiveKit connection error: ConnectionError: Client initiated disconnect`. The screen's own copy —
 *   `index.tsx:162-181` renders hard-coded English there (`'Failed to connect to video conference'` at :181), which is
 *   the app's own text rather than `locales/en.json` — was never printed, and `probe10.mjs` (written to print it) was
 *   cut off by a reboot. Row 11 therefore pins only the structural half (bar gone, no `meet-rejoin`, the stored room
 *   still there, the `Client initiated disconnect` console line) and says nothing about the copy on screen. The `onDisconnected={onLeave}` prop
 *   (`index.tsx:202`) plus `page-component.tsx:32-38` is what one would expect to run instead.
 * - **Who briefly strips `roomName` from `page.url()` in the refused-token branch** (`…probe-6.log` K, and `probe9.mjs`
 *   case P never printed): rows 12-13 therefore pin the copy, the statuses and the buttons, and assert nothing about
 *   the address. `core/lib/auth/handle-unauthorized.ts` was ruled out (it would navigate to `/auth/passcode`).
 * - **A `roomName` that is not base64, through the page**: the route side is pinned (row 4); the page side (whether the
 *   h1 falls back to `meetings.UNTITLED`, `meetings.ts:126-141` vs `page-component.tsx:29`) was probed
 *   (`probe9.mjs` case O) but that probe aborted before printing, so it is not asserted.
 * - The `aria-pressed` values of the mic/camera toggles, the `LevelMeter`'s level, the device label list and the bar's
 *   elapsed `<time>` text were seen but are not asserted: they are browser-state values, not app contracts.
 */

const LOG = '[lane-c livekit]';

const report = (label: string, value: Record<string, unknown>): void => {
	console.log(`${LOG} MEASURE ${label} ${JSON.stringify(value)}`);
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

/**
 * The room every row uses, in the form the app's own links carry it: `roomName` is base64
 * (`suites/mock/meetings.spec.ts` pins that the links are built that way, `meetings.ts:31-45` reads it back).
 * `meetingTitleOf` (`meetings.ts:126-141`) turns `Team-First-<10 chars>` into "Team · First" — a code-derived title,
 * not locale copy, so it is written here as the format that produces it rather than looked up.
 */
const ROOM_NAME = 'Team-First-abcdef1234';
const ROOM_PARAM = Buffer.from(ROOM_NAME, 'utf8').toString('base64');
const MEET_PATH = `/meet/livekit?roomName=${ROOM_PARAM}`;
const MEETING_TITLE = 'Team · First';

const TOKEN_PATH = '/api/livekit';
const LIVEKIT_HOST = new URL(LIVEKIT_TEST.url).host;

/** The fixture user's email, which is what `route.ts:38` prefers as the token identity (`user.email || user.id`);
 * the mock serves it at `cypress/support/mock-gauzy-server.mjs:105`. A fixture identity, not app copy. */
const FIXTURE_EMAIL = 'manager@example.test';

// ======================================================================================
// Helpers: the token's parts, and what the browser really tried
// ======================================================================================

type LiveKitClaims = {
	iss: string;
	sub: string;
	exp: number;
	nbf: number;
	note?: string;
	metadata?: string;
	name?: string;
	video?: Record<string, unknown>;
};

const decodePart = <T>(part: string): T => JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
const headerOf = (token: string): { alg: string } => decodePart<{ alg: string }>(token.split('.')[0]);
const claimsOf = (token: string): LiveKitClaims => decodePart<LiveKitClaims>(token.split('.')[1]);

/** What a token is made of, without what it is: its length and the three segment lengths. */
const shapeOf = (token: string): { length: number; segments: number[] } => ({
	length: token.length,
	segments: token.split('.').map((part) => part.length)
});

/** `livekit-server-sdk`'s own `AccessToken.toJwt()` signing, proven from the outside. */
const signatureValidFor = (token: string, secret: string): boolean => {
	const [header, payload, signature] = token.split('.');
	return createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url') === signature;
};

const grantRoomOf = (token: string): string => String(claimsOf(token).video?.room ?? '');

type TokenWatch = {
	requests: Array<{ method: string; roomName: string | null }>;
	answers: Array<{ status: number; roomName: string | null }>;
	detach: () => void;
};

/** `/api/livekit` calls this page made, in the order their bodies finished. Answers land one round-trip after
 * requests, so anything that counts answers waits for the count first (`waitForAnswers`). */
const watchTokenRoute = (page: Page): TokenWatch => {
	const requests: TokenWatch['requests'] = [];
	const answers: TokenWatch['answers'] = [];
	const onRequest = (request: { method: () => string; url: () => string }) => {
		const url = new URL(request.url());
		if (url.origin === APP_ORIGIN && url.pathname === TOKEN_PATH) {
			requests.push({ method: request.method(), roomName: url.searchParams.get('roomName') });
		}
	};
	const onResponse = (response: { status: () => number; url: () => string }) => {
		const url = new URL(response.url());
		if (url.origin === APP_ORIGIN && url.pathname === TOKEN_PATH) {
			answers.push({ status: response.status(), roomName: url.searchParams.get('roomName') });
		}
	};
	page.on('request', onRequest);
	page.on('response', onResponse);
	return {
		requests,
		answers,
		detach: () => {
			page.off('request', onRequest);
			page.off('response', onResponse);
		}
	};
};

/** Everything the browser aimed at the LiveKit host: the WebSocket attempts (query **key names** and the token's
 * length only — the token itself is never read out of a URL) and the http fallbacks. */
type LiveKitWatch = {
	sockets: Array<{ target: string; queryKeys: string[]; tokenLength: number }>;
	http: string[];
	detach: () => void;
};
const watchLiveKitHost = (page: Page): LiveKitWatch => {
	const sockets: LiveKitWatch['sockets'] = [];
	const http: string[] = [];
	const livekitHost = new URL(LIVEKIT_TEST.url).host;
	const onSocket = (socket: { url: () => string }) => {
		const url = new URL(socket.url());
		// Only the LiveKit host: the dev server's own `ws://localhost:<app>/_next/hmr` socket sometimes opens inside
		// the window this watch is attached for (measured once on a whole-file run), and it is not the room's.
		if (url.host !== livekitHost) return;
		sockets.push({
			target: `${url.protocol}//${url.host}${url.pathname}`,
			queryKeys: [...url.searchParams.keys()].sort(),
			tokenLength: (url.searchParams.get('access_token') ?? '').length
		});
	};
	const onRequest = (request: { method: () => string; url: () => string }) => {
		const url = new URL(request.url());
		if (url.host === livekitHost) {
			http.push(`${request.method()} ${url.protocol}//${url.host}${url.pathname}`);
		}
	};
	page.on('websocket', onSocket);
	page.on('request', onRequest);
	return {
		sockets,
		http,
		detach: () => {
			page.off('websocket', onSocket);
			page.off('request', onRequest);
		}
	};
};

const waitForAnswers = async (watch: TokenWatch, count: number): Promise<void> => {
	await expect.poll(() => watch.answers.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(count);
};

const liveKitErrorLines = (shield: Shield): string[] =>
	shield.consoleErrors().filter((line) => /LiveKit connection error:/.test(line));

/** `GET /api/livekit<query>` as the signed-in person's own browser session makes it (the jar `signInWithFixture` wrote). */
const askTokenRoute = async (page: Page, query: string) => {
	const requestedAt = Math.floor(Date.now() / 1000);
	const response = await page.request.get(`${APP_ORIGIN}${TOKEN_PATH}${query}`);
	const body = await response.text();
	let json: Record<string, unknown> | null = null;
	try {
		json = JSON.parse(body) as Record<string, unknown>;
	} catch {
		/* the answer was not JSON */
	}
	return { response, body, json, requestedAt, contentType: response.headers()['content-type'] ?? '<none>' };
};

/** Signs a fixture person in the way `commands.ts` does — cookies only, no sign-in flow — and loads this page.
 * `hardVisit` is deliberately not used: it first loads `APP_ORIGIN`, which mounts the whole dashboard and its reads,
 * and every measurement below was taken on a page that went straight to `/meet/livekit`. */
const signedInJar = async (page: Page, fixture: BootstrapFixture, scope: 'A' | 'B' = 'A'): Promise<void> => {
	await signInWithFixture(page.context(), fixture, scope);
};

/** Signs the fixture person in (cookies only, no sign-in flow) and goes straight to the meet page.
 * `hardVisit` is not used: it first loads `APP_ORIGIN`, which mounts the whole dashboard and its reads, and every
 * measurement in this file was taken on a page that went straight to `/meet/livekit`. */
const openMeetPage = async (page: Page, fixture: BootstrapFixture, path: string): Promise<void> => {
	await signedInJar(page, fixture);
	await page.goto(`${APP_ORIGIN}${path}`, { waitUntil: 'domcontentloaded' });
};

const joinNow = async (page: Page): Promise<void> => {
	await expect(page.getByTestId('meet-join-now')).toBeVisible({ timeout: 45_000 });
	await page.getByTestId('meet-join-now').click();
};

/** What `navigator.mediaDevices.getUserMedia` answers, per what it was asked for (both, the microphone alone, or the
 * camera alone: the three calls `openDevices` can make, `use-media-preview.ts:150-175`). */
type MediaAnswer = 'stream' | 'NotAllowedError' | 'NotFoundError' | 'NotReadableError';
type MediaScript = { both: MediaAnswer; audio: MediaAnswer; video: MediaAnswer };
const EVERY_DEVICE: MediaScript = { both: 'stream', audio: 'stream', video: 'stream' };

/**
 * Scripts the browser's media answer before the page loads. Chrome's own fake capture device was measured not to be
 * dependable on this runner: with camera and microphone granted, a second `getUserMedia` in the same browser (the dev
 * Strict Mode remount, or the next test's page) was answered `NotFoundError` for the camera in 2 of 4 repeats, and
 * with nothing granted the answer was `NotAllowedError` in 2 of 4 and `NotFoundError` in the other 2 (a
 * `getUserMedia` wrapper logged every call). So every page row here states the answer itself, and pins what the
 * **page** does with it. A granted stream is a painted canvas plus an oscillator: real tracks, one of each kind,
 * nothing read from a device.
 */
const scriptMedia = async (page: Page, script: MediaScript): Promise<void> => {
	await page.addInitScript((answers: MediaScript) => {
		const devices = navigator.mediaDevices;
		if (!devices) {
			return;
		}
		const streamOf = (audio: boolean, video: boolean): MediaStream => {
			const tracks: MediaStreamTrack[] = [];
			if (video) {
				const canvas = document.createElement('canvas');
				canvas.width = 320;
				canvas.height = 180;
				const context = canvas.getContext('2d');
				const paint = () => {
					if (context) {
						context.fillStyle = '#1f2937';
						context.fillRect(0, 0, canvas.width, canvas.height);
					}
				};
				paint();
				window.setInterval(paint, 200);
				tracks.push(...canvas.captureStream(5).getVideoTracks());
			}
			if (audio) {
				const audioContext = new AudioContext();
				const destination = audioContext.createMediaStreamDestination();
				const oscillator = audioContext.createOscillator();
				oscillator.connect(destination);
				oscillator.start();
				tracks.push(...destination.stream.getAudioTracks());
			}
			return new MediaStream(tracks);
		};
		devices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
			const audio = Boolean(constraints?.audio);
			const video = Boolean(constraints?.video);
			let answer = answers.video;
			if (audio && video) {
				answer = answers.both;
			} else if (audio) {
				answer = answers.audio;
			}
			if (answer !== 'stream') {
				throw new DOMException(`scripted by meet-livekit-room.spec.ts: ${answer}`, answer);
			}
			return streamOf(audio, video);
		};
	}, script);
};

// The only file in this suite that asks the browser for media. `getUserMedia` itself is scripted per row (`scriptMedia`);
// the fake device flag stays so `enumerateDevices` has a camera, a microphone and a speaker to list on a runner with
// none. Playwright allows `launchOptions` only at the top of a file (it forces a new worker).
test.use({ navigationTimeout: 120_000, launchOptions: { args: ['--use-fake-device-for-media-stream'] } });

test.afterEach(mockReset);

// ======================================================================================
// 1-7. The route, through the signed-in browser's own request API
// ======================================================================================

test.describe('lane-c · GET /api/livekit: the token it signs, the room it names, what refuses it', () => {
	test('the control: 200, one key, a token whose HS256 signature this file can recompute', async ({
		page,
		fixture
	}) => {
		await signedInJar(page, fixture);

		const answer = await askTokenRoute(page, `?roomName=${ROOM_PARAM}`);
		const token = String(answer.json?.token ?? '');

		expect(answer.response.status(), 'the signed-in control').toBe(200);
		expect(answer.contentType).toBe('application/json');
		expect(Object.keys(answer.json ?? {}), 'the body of this route is a token and nothing else').toEqual(['token']);
		expect(typeof token, 'a string').toBe('string');
		expect(token.split('.').length, 'three JWS segments').toBe(3);
		expect(headerOf(token).alg, 'the SDK signs it HS256').toBe('HS256');
		expect(signatureValidFor(token, LIVEKIT_TEST.apiSecret), 'the signature matches the lane secret').toBe(true);
		expect(
			signatureValidFor(token, 'a-different-secret-on-purpose'),
			'and only that secret: the check is not a tautology'
		).toBe(false);

		const claims = claimsOf(token);
		expect(claims.iss, 'iss is the lane API key').toBe(LIVEKIT_TEST.apiKey);
		expect(claims.sub, 'the identity is the email the route preferred over the id (route.ts:38)').toBe(
			FIXTURE_EMAIL
		);
		expect(claims.sub, '…which is why it is not the user id').not.toBe(fixture.ids.user);
		expect(claims.nbf, 'the SDK writes nbf 0, so ttl cannot be read as exp - nbf').toBe(0);
		expect(claims.name, 'no name claim').toBeUndefined();
		expect(claims.metadata, 'no metadata claim').toBeUndefined();

		report('1 control', {
			status: answer.response.status(),
			bodyKeys: Object.keys(answer.json ?? {}),
			token: shapeOf(token),
			alg: headerOf(token).alg,
			signatureOk: signatureValidFor(token, LIVEKIT_TEST.apiSecret),
			iss: claims.iss,
			subLength: claims.sub.length,
			nbf: claims.nbf,
			expMinusRequestSecond: claims.exp - answer.requestedAt,
			grantRoom: grantRoomOf(token)
		});
	});

	test('ttl: exp is 3600 s past the second the request was made (`ttl: "1h"`, route.ts:36-38)', async ({
		page,
		fixture
	}) => {
		await signedInJar(page, fixture);

		const first = await askTokenRoute(page, `?roomName=${ROOM_PARAM}`);
		const second = await askTokenRoute(page, `?roomName=${ROOM_PARAM}`);

		const spans = [first, second].map((call, index) => {
			expect(call.response.status(), `call ${index + 1}`).toBe(200);
			return claimsOf(String(call.json?.token ?? '')).exp - call.requestedAt;
		});

		// Measured 3600 twice and 3601 once, when the request and the claim straddled a whole second
		// (`…probe-5.log` I8/I9): the ttl itself is 3600, the extra 1 s is the clock, not a longer token.
		for (const span of spans) {
			expect([3600, 3601], `exp minus the second the request was made, measured ${span}`).toContain(span);
		}

		report('2 ttl', { spans, tokenShapes: [first, second].map((call) => shapeOf(String(call.json?.token ?? ''))) });
	});

	test('the grant the room gets: `<session tenant>:<roomName verbatim>`, join and publish, nothing else measured', async ({
		page,
		fixture
	}) => {
		await signedInJar(page, fixture);

		const answer = await askTokenRoute(page, `?roomName=${ROOM_PARAM}`);
		const token = String(answer.json?.token ?? '');
		const grant = claimsOf(token).video ?? {};

		expect(answer.response.status()).toBe(200);
		expect(grant.room, 'the tenant of the session read, then the room the query named').toBe(
			`${fixture.ids.tenantA}:${ROOM_PARAM}`
		);
		expect(grant.roomJoin, 'this person may join it').toBe(true);
		expect(grant.canPublish).toBe(true);
		expect(grant.canSubscribe).toBe(true);
		expect(grant.canPublishData).toBe(true);

		report('3 grant', { room: grant.room, keys: Object.keys(grant).sort(), grant });
	});

	test('the roomName gate: absent, empty, blank and whitespace all 400; a name that is not base64 is answered verbatim', async ({
		page,
		fixture
	}) => {
		await signedInJar(page, fixture);

		const refused = ['', '?roomName=', '?roomName=%20%20', '?roomName=%09%0a'];
		const measured: Array<Record<string, unknown>> = [];
		for (const query of refused) {
			const answer = await askTokenRoute(page, query);
			expect(answer.response.status(), `query ${JSON.stringify(query)}`).toBe(400);
			expect(answer.json, 'the route owns this refusal, so its own body arrives').toEqual({
				error: 'Missing or invalid "roomName" query parameter'
			});
			measured.push({ query, status: answer.response.status(), body: answer.body });
		}

		const plain = await askTokenRoute(page, '?roomName=plain-name');
		const slashes = await askTokenRoute(page, `?roomName=${encodeURIComponent('a/b/c')}`);
		for (const [label, call] of [
			['plain-name', plain],
			['a/b/c', slashes]
		] as const) {
			expect(call.response.status(), `${label}: the route only trims (route.ts:19-23)`).toBe(200);
			expect(grantRoomOf(String(call.json?.token ?? '')), `${label}: the name reached the grant unchanged`).toBe(
				`${fixture.ids.tenantA}:${label}`
			);
		}

		report('4 roomName gate', {
			refused: measured,
			plainGrant: grantRoomOf(String(plain.json?.token ?? '')),
			slashesGrant: grantRoomOf(String(slashes.json?.token ?? ''))
		});
	});

	test("an armed 401 / 500 / 429 on the session read is answered with that status and the guard's own message", async ({
		page,
		fixture,
		mock
	}) => {
		await signedInJar(page, fixture);

		const measured: Array<Record<string, unknown>> = [];
		for (const status of [401, 500, 429]) {
			await mock.scenario({ fails: { '/api/user/me': status } });
			const answer = await askTokenRoute(page, `?roomName=${ROOM_PARAM}`);
			expect(answer.response.status(), `armed ${status}`).toBe(status);
			expect(answer.json, `armed ${status}: deny() passes the upstream message through`).toEqual({
				message: `Synthetic Gauzy refusal (${status})`
			});
			measured.push({ armed: status, status: answer.response.status(), body: answer.body });
		}

		report('5 armed refusals', {
			cases: measured,
			mockLog: (await mock.requests()).map((r) => `${r.method} ${r.path} ${r.status}`)
		});
	});

	test('a dropped session read is 503 "Session check unavailable, retry later", and the mock logs that call as status 0', async ({
		page,
		fixture,
		mock
	}) => {
		await signedInJar(page, fixture);
		await mock.scenario({ drops: { '/api/user/me': 1 } });

		const answer = await askTokenRoute(page, `?roomName=${ROOM_PARAM}`);
		expect(answer.response.status(), 'no upstream status to copy, so 503 (authenticated-guard-app.ts:88-113)').toBe(
			503
		);
		expect(answer.json).toEqual({ message: 'Session check unavailable, retry later' });

		const sessionCalls = (await mock.calls('/api/user/me')).map(
			(call) => `${call.method} ${call.path} ${call.status}`
		);
		expect(
			sessionCalls.some((line) => line.endsWith(' 0')),
			'the cut-off call is recorded as 0, neither a refusal nor an answer'
		).toBe(true);

		report('6 dropped session read', { status: answer.response.status(), body: answer.body, sessionCalls });
	});

	test('the grant follows the tenant the session read answered, in both directions (route.ts:14)', async ({
		page,
		fixture,
		mock
	}) => {
		await signedInJar(page, fixture);

		// Cookies of tenant A, and the mock answering tenant B.
		await mock.scenario({ scope: 'B' });
		const cookieA = await askTokenRoute(page, `?roomName=${ROOM_PARAM}`);
		expect(cookieA.response.status()).toBe(200);
		expect(grantRoomOf(String(cookieA.json?.token ?? '')), 'the session tenant won over the cookie').toBe(
			`${fixture.ids.tenantB}:${ROOM_PARAM}`
		);

		// Cookies of tenant B, and the mock answering tenant A.
		await mockReset();
		await signInWithFixture(page.context(), fixture, 'B');
		const cookieB = await askTokenRoute(page, `?roomName=${ROOM_PARAM}`);
		expect(cookieB.response.status()).toBe(200);
		expect(grantRoomOf(String(cookieB.json?.token ?? '')), '…and the same the other way round').toBe(
			`${fixture.ids.tenantA}:${ROOM_PARAM}`
		);

		report('7 tenant scope', {
			cookieA_tenantBSession: grantRoomOf(String(cookieA.json?.token ?? '')),
			cookieB_tenantASession: grantRoomOf(String(cookieB.json?.token ?? ''))
		});
	});

	test('[lane limit] a caller with no cookies at all is answered with a fixture-tenant token, because this mock answers the session read for anyone', async ({
		page,
		fixture,
		mock
	}) => {
		await page.context().clearCookies();

		const answer = await askTokenRoute(page, '?roomName=anything');
		const token = String(answer.json?.token ?? '');

		expect(answer.response.status(), 'the guard got a user back, so route.ts:11 never fired').toBe(200);
		expect(token.length > 0, 'and a real token was minted for it').toBe(true);
		expect(signatureValidFor(token, LIVEKIT_TEST.apiSecret), 'signed with the lane secret like any other').toBe(
			true
		);
		expect(claimsOf(token).sub).toBe(FIXTURE_EMAIL);
		expect(grantRoomOf(token), "for the fixture tenant, with the caller's room appended").toBe(
			`${fixture.ids.tenantA}:anything`
		);

		const sessionCalls = (await mock.calls('/api/user/me')).map(
			(call) => `${call.method} ${call.path} ${call.status}`
		);
		expect(
			sessionCalls.length,
			'the reason it was answered: the guard asked the mock, and the mock answered'
		).toBeGreaterThan(0);
		expect(
			sessionCalls.some((line) => line.endsWith(' 200')),
			'a 200 session read, cookie-less'
		).toBe(true);

		report('8 cookie-less caller', {
			status: answer.response.status(),
			token: shapeOf(token),
			grantRoom: grantRoomOf(token),
			sessionCalls,
			note: 'a mock limit (suites/lane-c/PLAN.md), not an app defect: authenticated-guard-app.ts:88-113 defers to the API'
		});
	});
});

// ======================================================================================
// 9-11. The page, with camera and microphone granted
// ======================================================================================

test.describe('lane-c · /meet/livekit with camera and microphone granted', () => {
	// The fake device comes from the file-level launchOptions above; this group only grants the two permissions.
	test.use({ permissions: ['camera', 'microphone'] });

	test('9 the pre-join a room link opens, the token it already has, and the title the browser really shows', async ({
		page,
		fixture,
		shield
	}) => {
		const watch = watchTokenRoute(page);
		await scriptMedia(page, EVERY_DEVICE);
		await openMeetPage(page, fixture, MEET_PATH);

		await expect(page.getByRole('region', { name: copyOf('meetings.PREVIEW') })).toBeVisible({ timeout: 45_000 });
		await expect(page.getByTestId('meet-preview-video')).toBeVisible();
		await expect(page.getByText(copyOf('meetings.READY_TO_JOIN'), { exact: true })).toBeVisible();
		await expect(
			page.getByText(`${copyOf('meetings.JOINING_AS').replace('{name}', fixture.names.user)}`, { exact: true })
		).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('meetings.TURN_MIC_OFF'), exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('meetings.TURN_CAMERA_OFF'), exact: true })).toBeVisible();
		for (const field of ['meetings.CAMERA', 'meetings.MICROPHONE', 'meetings.SPEAKER']) {
			await expect(page.getByRole('combobox', { name: copyOf(field) })).toBeVisible();
		}
		await expect(page.getByText(copyOf('meetings.DEVICE_DEFAULT'), { exact: true }).first()).toBeVisible();
		await expect(page.getByRole('meter', { name: copyOf('meetings.MIC_LEVEL') })).toBeVisible();
		await expect(page.getByTestId('meet-join-now')).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('meetings.COPY_LINK'), exact: true })).toBeVisible();
		await expect(
			page.getByRole('button', { name: copyOf('meetings.BACK_TO_MEETINGS'), exact: true })
		).toBeVisible();

		// The meeting title comes from the room name (`meetingTitleOf`, meetings.ts:126-141) and is the page's only h1,
		// while the document title is the route segment's instead — finding 1.
		await expect(page.getByRole('heading', { level: 1, name: MEETING_TITLE })).toBeVisible();
		await expect(page).toHaveTitle('Meet | Livekit');
		const titleElements = await page.evaluate(() =>
			Array.from(document.querySelectorAll('title')).map((n) => n.textContent)
		);
		expect(titleElements, 'one <title>, the server side one: the Meta this page renders never arrives').toEqual([
			'Meet | Livekit'
		]);

		// What the page stores is the **parameter** as `params.get('roomName')` hands it over (page-component.tsx:45-52);
		// the base64 is decoded later, in `roomNameOfParam` — which is also why the grant's room is the base64 form.
		const stored = await page.evaluate(() => window.localStorage.getItem('current-room-live-kit'));
		expect(stored, 'the room this link opened, in the base64 form the link carries').toBe(ROOM_PARAM);

		await waitForAnswers(watch, 1);
		await page.waitForTimeout(1_500); // a settle window, not an assertion: a Strict Mode remount would fetch again
		expect(
			watch.requests.map((call) => `${call.method} ${call.roomName}`),
			'asked once, for the parameter'
		).toEqual([`GET ${ROOM_PARAM}`]);
		expect(
			watch.answers.map((answer) => answer.status),
			'answered once'
		).toEqual([200]);
		expect(liveKitErrorLines(shield), 'the pre-join logged no LiveKit error').toEqual([]);

		report('9 pre-join', {
			url: page.url(),
			h1: await page.locator('h1').allInnerTexts(),
			title: await page.title(),
			stored,
			requests: watch.requests,
			answers: watch.answers,
			consoleErrors: shield.consoleErrors()
		});
		watch.detach();
	});

	test('10 joining a LiveKit server that is not there: one socket attempt, one http fallback, one app error, then the left stage', async ({
		page,
		fixture,
		shield
	}) => {
		const watch = watchTokenRoute(page);
		const host = watchLiveKitHost(page);
		await scriptMedia(page, EVERY_DEVICE);
		await openMeetPage(page, fixture, MEET_PATH);
		await joinNow(page);

		await expect(page.getByTestId('meet-rejoin')).toBeVisible({ timeout: 60_000 });

		expect(
			host.sockets.map((socket) => socket.target),
			'the socket was aimed at the lane LiveKit url'
		).toEqual([`${LIVEKIT_TEST.url}/rtc/v1`]);
		expect(host.sockets[0].queryKeys, 'the room token travels in that query').toEqual([
			'access_token',
			'join_request'
		]);
		expect(host.sockets[0].tokenLength, 'a token was in it; its length is all this file prints').toBeGreaterThan(
			100
		);
		expect(host.http, 'and the SDK tried its http fallback on the same host').toEqual([
			`GET http://${LIVEKIT_HOST}/rtc/v1/validate`
		]);

		// The stage it settles on (`meet-left.tsx`): what was left, the hint, and the way back in.
		await expect(page.getByRole('heading', { level: 1, name: copyOf('meetings.YOU_LEFT') })).toBeVisible();
		await expect(
			page
				.getByRole('status')
				.filter({ hasText: copyOf('meetings.YOU_LEFT') })
				.filter({ hasText: MEETING_TITLE })
		).toBeVisible();
		await expect(page.getByText(copyOf('meetings.YOU_LEFT_HINT'), { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('meetings.REJOIN'), exact: true })).toBeVisible();
		await expect(
			page.getByRole('button', { name: copyOf('meetings.BACK_TO_MEETINGS'), exact: true })
		).toBeVisible();
		await expect(page.getByTestId('meet-room-bar')).toHaveCount(0);
		expect(new URL(page.url()).pathname + new URL(page.url()).search, 'the address still names the room').toBe(
			MEET_PATH
		);
		expect(
			await page.evaluate(() => window.localStorage.getItem('current-room-live-kit')),
			'onLeave removed it (page-component.tsx:36)'
		).toBeNull();

		const kept = shield.consoleErrors();
		expect(liveKitErrorLines(shield).length, 'the app logged the failure once (index.tsx:173)').toBe(1);
		expect(
			kept.every((line) => /LiveKit connection error:/.test(line)),
			'and logged nothing else as an error'
		).toBe(true);
		expect(
			kept.some((line) => line.includes('access_token')),
			'no kept line names the room token'
		).toBe(false);
		expect(shield.pageErrors(), 'no uncaught exception').toEqual([]);

		// Rejoin, the measured path: a second token, a second socket, the same left stage again.
		await page.getByTestId('meet-rejoin').click();
		await expect(page.getByTestId('meet-rejoin')).toBeVisible({ timeout: 60_000 });
		await waitForAnswers(watch, 2);
		expect(
			watch.answers.map((answer) => answer.status),
			'Rejoin asked for a second token and got it'
		).toEqual([200, 200]);
		expect(host.sockets.length, 'and tried the server a second time').toBe(2);
		expect(
			await page.evaluate(() => window.localStorage.getItem('current-room-live-kit')),
			'removed again'
		).toBeNull();

		report('10 refused server', {
			sockets: host.sockets,
			http: host.http,
			tokenAnswers: watch.answers.map((answer) => answer.status),
			keptConsole: kept.map((line) => line.slice(0, 80)),
			pageErrors: shield.pageErrors(),
			h1AfterLeft: await page.locator('h1').allInnerTexts()
		});
		watch.detach();
		host.detach();
	});

	test('11 the room stage, held by intercepting that socket and never answering it, and what its own Leave does in that state', async ({
		page,
		fixture,
		shield
	}) => {
		const watch = watchTokenRoute(page);
		const held: Array<{ target: string; queryKeys: string[]; tokenLength: number; messages: number }> = [];
		await page.routeWebSocket(`${LIVEKIT_TEST.url}/**`, (route) => {
			const url = new URL(route.url());
			const row = {
				target: `${url.protocol}//${url.host}${url.pathname}`,
				queryKeys: [...url.searchParams.keys()].sort(),
				tokenLength: (url.searchParams.get('access_token') ?? '').length,
				messages: 0
			};
			held.push(row);
			route.onMessage(() => {
				row.messages += 1;
			});
			// deliberately never answered and never closed: that is what holds the `room` stage open
		});

		await scriptMedia(page, EVERY_DEVICE);
		await openMeetPage(page, fixture, MEET_PATH);
		await joinNow(page);

		await expect(page.getByTestId('meet-room-bar')).toBeVisible({ timeout: 45_000 });
		await expect(page.getByRole('heading', { level: 1, name: MEETING_TITLE })).toBeVisible();
		await expect(page.getByText(copyOf('meetings.CONNECTING'), { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('meetings.COPY_LINK'), exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('meetings.LEAVE'), exact: true })).toBeVisible();
		await expect(
			page.getByRole('status').filter({ hasText: copyOf('collaborate.PREPARING_MEETING') })
		).toBeVisible();
		expect(
			await page.evaluate(() => window.localStorage.getItem('current-room-live-kit')),
			'in the room, the stored room stays'
		).toBe(ROOM_PARAM);
		expect(
			held.map((row) => row.target),
			'the interception saw the connection attempt'
		).toEqual([`${LIVEKIT_TEST.url}/rtc/v1`]);
		await waitForAnswers(watch, 1);
		expect(
			watch.answers.map((answer) => answer.status),
			'one token, 200'
		).toEqual([200]);

		// Leave, from the room's own bar, while nothing is on the other end of that socket (measured in `…probe-4.log`):
		// the bar goes, the `left` stage does **not** appear, and the stored room is not removed. The screen the app
		// shows instead is `index.tsx:162-181`'s own hard-coded text, whose exact wording was never measured — the
		// header's OPEN list keeps that claim off this file.
		await page.getByRole('button', { name: copyOf('meetings.LEAVE'), exact: true }).click();
		await expect(page.getByTestId('meet-room-bar')).toHaveCount(0, { timeout: 30_000 });
		await expect(page.getByTestId('meet-rejoin')).toHaveCount(0);
		expect(
			await page.evaluate(() => window.localStorage.getItem('current-room-live-kit')),
			'no onLeave ran, so the stored room is still there'
		).toBe(ROOM_PARAM);
		expect(
			shield.logMatching(/Client initiated disconnect/).length,
			'LiveKit reported the disconnect as an error'
		).toBeGreaterThanOrEqual(1);

		report('11 room stage held open', {
			held,
			tokenAnswers: watch.answers.map((answer) => answer.status),
			barShown: true,
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 80)),
			storedAfterLeave: await page.evaluate(() => window.localStorage.getItem('current-room-live-kit'))
		});
		watch.detach();
	});
});

// ======================================================================================
// 12-15. The page when the token request is refused, and when the browser has no devices to offer
// ======================================================================================

test.describe('lane-c · /meet/livekit when the token route refuses, or the browser blocks the devices', () => {
	const refuseSession = async (
		page: Page,
		fixture: BootstrapFixture,
		mock: MockControl,
		status: number
	): Promise<void> => {
		await openMeetPage(page, fixture, MEET_PATH);
		await joinNow(page);
		await expect(page.getByTestId('meet-rejoin')).toBeVisible({ timeout: 60_000 });
		await mock.scenario({ fails: { '/api/user/me': status } });
		await page.getByTestId('meet-rejoin').click();
	};

	test('12 a 401 from the session read: the card names the session, logs its own error, and Try again really asks again', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const watch = watchTokenRoute(page);
		await refuseSession(page, fixture, mock, 401);

		await expect(page.getByText(copyOf('collaborate.MEETING_UNAVAILABLE'), { exact: true })).toBeVisible({
			timeout: 45_000
		});
		await expect(page.getByText(copyOf('toasts.REASONS.SESSION'), { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('collaborate.BACK_HOME'), exact: true })).toBeVisible();
		const tryAgain = page.getByRole('button', { name: copyOf('collaborate.TRY_AGAIN'), exact: true });
		await expect(tryAgain).toHaveCount(1);
		await expect(page.getByTestId('meet-room-bar')).toHaveCount(0);
		await expect(page.getByTestId('meet-rejoin')).toHaveCount(0);

		await waitForAnswers(watch, 2);
		expect(
			watch.answers.map((answer) => answer.status),
			'the mount asked (200), the rejoin asked and was refused (401)'
		).toEqual([200, 401]);

		const kept = shield.consoleErrors();
		expect(
			kept.filter((line) => /Failed to fetch token: Error: The LiveKit token request failed \(401\)/.test(line))
				.length,
			'use-live-kit.ts:43 logged the failure'
		).toBe(1);
		expect(
			kept.every((line) => /Failed to fetch token:|LiveKit connection error:/.test(line)),
			'and nothing else was kept'
		).toBe(true);
		expect(
			kept.some((line) => line.includes('access_token')),
			'no kept line names a token'
		).toBe(false);
		expect(shield.pageErrors(), 'no uncaught exception').toEqual([]);

		await tryAgain.click();
		await waitForAnswers(watch, 3);
		expect(watch.answers[2].status, 'Try again sent a third request, and it was refused too').toBe(401);

		report('12 refused 401 on rejoin', {
			tokenAnswers: watch.answers.map((answer) => answer.status),
			card: await page.locator('output').allInnerTexts(),
			keptConsole: kept.map((line) => line.slice(0, 90)),
			tryAgainButtons: await tryAgain.count()
		});
		watch.detach();
	});

	test('13 a 503 from the session read: the same card with the server copy, because errorReasonKeyOf maps it', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const watch = watchTokenRoute(page);
		await refuseSession(page, fixture, mock, 503);

		await expect(page.getByText(copyOf('collaborate.MEETING_UNAVAILABLE'), { exact: true })).toBeVisible({
			timeout: 45_000
		});
		await expect(page.getByText(copyOf('toasts.REASONS.SERVER'), { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('collaborate.TRY_AGAIN'), exact: true })).toHaveCount(1);
		await waitForAnswers(watch, 2);
		expect(
			watch.answers.map((answer) => answer.status),
			'the refused answer the card is describing'
		).toEqual([200, 503]);

		report('13 refused 503 on rejoin', {
			tokenAnswers: watch.answers.map((answer) => answer.status),
			card: await page.locator('output').allInnerTexts(),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 90))
		});
		watch.detach();
	});

	test('14 a link with no room: the card says the link is broken, asks for no token, and offers no retry', async ({
		page,
		fixture,
		shield
	}) => {
		const watch = watchTokenRoute(page);
		await openMeetPage(page, fixture, '/meet/livekit');

		await expect(page.getByText(copyOf('collaborate.MEETING_UNAVAILABLE'), { exact: true })).toBeVisible({
			timeout: 45_000
		});
		await expect(page.getByText(copyOf('collaborate.MEETING_LINK_INVALID'), { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('collaborate.BACK_HOME'), exact: true })).toBeVisible();
		// `page-component.tsx:78-85` passes no `onRetry`, so `meet-room-error.tsx` renders no Try-again button.
		await expect(page.getByRole('button', { name: copyOf('collaborate.TRY_AGAIN'), exact: true })).toHaveCount(0);
		await expect(page.getByTestId('meet-join-now')).toHaveCount(0);
		expect(
			await page.evaluate(() => window.localStorage.getItem('current-room-live-kit')),
			'nothing was written for a room that was never named'
		).toBeNull();
		expect(
			watch.requests.length,
			'the token route was never asked (page-component.tsx:54-56 gets an empty roomName)'
		).toBe(0);
		expect(shield.consoleErrors(), 'no console error on this card').toEqual([]);

		report('14 no roomName', {
			url: page.url(),
			card: await page.locator('output').allInnerTexts(),
			h1Count: await page.locator('h1').count(),
			tokenRequests: watch.requests.length,
			consoleErrors: shield.consoleErrors()
		});
		watch.detach();
	});

	test('15 the browser refuses camera and microphone: the pre-join says so, and the token and the Join button are unchanged', async ({
		page,
		fixture,
		shield
	}) => {
		const watch = watchTokenRoute(page);
		await scriptMedia(page, { both: 'NotAllowedError', audio: 'NotAllowedError', video: 'NotAllowedError' });
		await openMeetPage(page, fixture, MEET_PATH);

		await expect(page.getByText(copyOf('meetings.READY_TO_JOIN'), { exact: true })).toBeVisible({
			timeout: 45_000
		});
		await expect(page.getByTestId('meet-join-now')).toBeVisible();
		// `use-media-preview.ts` maps the rejected `getUserMedia` to `access: 'denied'`, which `device-fields.tsx` renders
		// as a warning notice with its own hint and its own retry button.
		await expect(page.getByText(copyOf('meetings.DEVICES_BLOCKED'), { exact: true })).toBeVisible();
		await expect(page.getByText(copyOf('meetings.DEVICES_BLOCKED_HINT'), { exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: copyOf('collaborate.TRY_AGAIN'), exact: true })).toBeVisible();
		await expect(page.getByText(copyOf('meetings.CAMERA_OFF'), { exact: true })).toBeVisible();
		expect(
			await page.getByRole('combobox').count(),
			'no device pickers: they need a stream to list (meet-pre-join.tsx:79)'
		).toBe(0);
		expect(
			await page.evaluate(() => window.localStorage.getItem('current-room-live-kit')),
			'the room is stored exactly as it is with devices'
		).toBe(ROOM_PARAM);
		await waitForAnswers(watch, 1);
		expect(
			watch.answers.map((answer) => answer.status),
			'the token arrived anyway'
		).toEqual([200]);
		expect(shield.consoleErrors(), 'a refused getUserMedia is not a console error here').toEqual([]);

		report('15 devices blocked', {
			h1: await page.locator('h1').allInnerTexts(),
			outputs: await page.locator('output').allInnerTexts(),
			comboboxes: 0,
			tokenAnswers: watch.answers.map((answer) => answer.status),
			consoleErrors: shield.consoleErrors()
		});
		watch.detach();
	});

	// accessOfError (use-media-preview.ts:119-128) → DeviceAccessNotices (device-fields.tsx:93-131)
	const otherAnswers: Array<{ row: string; script: MediaScript; shows: string; hides: string[]; retry: number }> = [
		{
			row: '16 no camera and no microphone at all: an info line, no retry, and the Join button stays',
			script: { both: 'NotFoundError', audio: 'NotFoundError', video: 'NotFoundError' },
			shows: 'meetings.DEVICES_MISSING',
			hides: ['meetings.DEVICES_BLOCKED', 'meetings.DEVICES_BUSY'],
			retry: 0
		},
		{
			row: '17 camera or microphone held by another app: the busy line and its own retry',
			script: { both: 'NotReadableError', audio: 'NotReadableError', video: 'NotReadableError' },
			shows: 'meetings.DEVICES_BUSY',
			hides: ['meetings.DEVICES_BLOCKED', 'meetings.DEVICES_MISSING'],
			retry: 1
		},
		{
			row: '18 [finding 6] no camera and a refused microphone reads as "nothing found": the refusal is not shown',
			// the answers Chrome itself gave on this runner once (see scriptMedia), replayed
			script: { both: 'NotFoundError', audio: 'NotAllowedError', video: 'NotFoundError' },
			shows: 'meetings.DEVICES_MISSING',
			hides: ['meetings.DEVICES_BLOCKED', 'meetings.DEVICES_BUSY', 'meetings.CAMERA_MISSING'],
			retry: 0
		}
	];
	for (const item of otherAnswers) {
		test(item.row, async ({ page, fixture, shield }) => {
			const watch = watchTokenRoute(page);
			await scriptMedia(page, item.script);
			await openMeetPage(page, fixture, MEET_PATH);

			await expect(page.getByText(copyOf('meetings.READY_TO_JOIN'), { exact: true })).toBeVisible({
				timeout: 45_000
			});
			await expect(page.getByText(copyOf(item.shows), { exact: true })).toBeVisible();
			for (const key of item.hides) {
				await expect(page.getByText(copyOf(key), { exact: true }), `${key} was shown too`).toHaveCount(0);
			}
			await expect(page.getByRole('button', { name: copyOf('collaborate.TRY_AGAIN'), exact: true })).toHaveCount(
				item.retry
			);
			await expect(page.getByText(copyOf('meetings.CAMERA_OFF'), { exact: true })).toBeVisible();
			await expect(page.getByTestId('meet-join-now')).toBeVisible();
			await waitForAnswers(watch, 1);
			expect(
				watch.answers.map((answer) => answer.status),
				'the token arrived anyway'
			).toEqual([200]);
			expect(shield.consoleErrors(), 'a refused getUserMedia is not a console error here').toEqual([]);

			report(`${item.row.split(' ')[0]} devices`, {
				script: item.script,
				outputs: await page.locator('output').allInnerTexts(),
				tokenAnswers: watch.answers.map((answer) => answer.status),
				consoleErrors: shield.consoleErrors()
			});
			watch.detach();
		});
	}
});
