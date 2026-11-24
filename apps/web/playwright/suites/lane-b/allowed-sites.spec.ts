import type { APIRequestContext, APIResponse } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { test as apiTest, type ApiCall } from '../../api-fixtures';
import { expect, test as uiTest, type Page, type Shield } from '../../fixtures';
import {
	APP_ORIGIN,
	authCookieHeader,
	hardVisit,
	mockReset,
	signInAndVisit,
	type BootstrapFixture,
	type StubRequest
} from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The contract of "Sites you signed in from" (develop #5595), both halves, pinned on lane-b (app 3032, mock 3996,
 * control 3998) in this file's own runs `E:\Coding\.tmp\s2-lane-b-sites-1.log` and `-2.log`. Every status, body, media
 * type, `Cache-Control`, path, row, label, date and read count below was measured first against the live lane with
 * throwaway probes and only then written down:
 *
 * - `E:\Coding\.tmp\probe-sites\api.mjs` → `s2-lane-b-sites-probe-api-1.log` (both routes: the control, signed out, the
 *   armed refusals, a cut, the cross-site trio, the hostile ids, every verb, and what the mock itself answers of those
 *   same paths);
 * - `E:\Coding\.tmp\probe-sites\api2.mjs` → `-probe-api-2.log` (dot-segment ids with and without following the fold,
 *   whether an arm reaches the neighbouring path, and what the control's `/state` actually carries);
 * - `E:\Coding\.tmp\probe-sites\api3.mjs`, `api4.mjs` and `api5.mjs` → `-probe-api-3.log`, `-probe-api-4.log`,
 *   `-probe-api-5.log` (the same rows through a Playwright `APIRequestContext`, which is what the `api()` fixture is:
 *   `maxRedirects: 0`, the twelve percent-encoded ids, and the four DELETE body shapes);
 * - `E:\Coding\.tmp\probe-sites\sites-browser.mjs` and `sites-browser2.mjs` → `-probe-ui-1.log` … `-probe-ui-5.log`
 *   (a real Chrome page on `/settings/personal/security` with the scenario armed: the rows, the dialog, the confirm, an
 *   end that was already gone, a refused end, a refused list, the empty list, and the read counts around "Try again");
 * - `E:\Coding\.tmp\probe-sites\sites-browser3stub.mjs` and `sites-browser4.mjs` → `-probe-ui-6.log`, `-probe-ui-7.log`
 *   (a `page.route` stub of the grants list, for the order, the hosts and the dates the mock's own fixture cannot show,
 *   and the loading placeholder held 6 000 ms, measured twice).
 *
 * ## The two halves, and which one the browser actually reaches
 *
 * Server half: `GET /api/embed/grants` is a one-line `forwardToGauzy` proxy called **with `{ noStore: true }`**
 * (`app/api/embed/grants/route.ts:8`) and `DELETE /api/embed/grants/[id]` is the same helper **with no options at all**,
 * on a path the route builds itself out of the decoded segment (`app/api/embed/grants/[id]/route.ts:9-13`). Neither is
 * guarded, so the only gates in front of them are the helper's own: the site check (`forward-to-gauzy.ts:89-90` →
 * `core/services/server/same-origin-request.ts:43-46`), the token cookie (`:92-96`) and the media type (`:102-107`).
 *
 * Browser half: `core/components/settings/pages/security/allowed-sites-section.tsx` over
 * `core/hooks/settings/use-embed-site-grants.ts`, whose reads and writes go through
 * `core/services/client/api/embeds/embeds.service.ts:179-187`, with `core/lib/utils/embed-site-grants.ts` deciding the
 * order, the date, the host and the two meanings of a 404.
 *
 * **On a lane the browser half never touches those two route files.** `playwright/test-servers.ts` gives the served
 * document `NEXT_PUBLIC_GAUZY_API_SERVER_URL = <mock origin>`, `core/constants/config/constants.tsx` turns that into
 * `GAUZY_API_BASE_SERVER_URL`, and `core/services/client/axios.ts:108-112` makes the axios base `<mock origin>/api` —
 * measured: every grants call a page made went to `http://127.0.0.1:3996/api/embed/grants…`, never to
 * `http://localhost:3032/api/…` (`-probe-ui-4.log`). So the UI rows pin the hook, the helpers and the component against
 * the mock, and the `api()` rows are what pins the two route files and the proxy helper. The one place this file joins
 * them is the pre-clean of the empty-list and already-gone cases, which ends a grant through **this app's own**
 * `DELETE /api/embed/grants/<id>` (`request.fetch`, cookies from the fixture — measured 204) before the page acts.
 *
 * ## The findings, stated up front
 *
 * 1. **`Cache-Control: no-store` reaches only the answers that came from Gauzy; the answers this app writes itself are
 *    unmarked, on both routes.** The GET route asks for it (`route.ts:8`, whose comment says the answer is personal "so
 *    no cache keeps it", `:4-5`) and `answerHeaders` writes it onto a relayed answer (`forward-to-gauzy.ts:22-28`,
 *    `:128-131`), so a relayed 200 / 404 / 401 / 403 / 429 / 500 / 504 carries it. Measured on that same route: its own
 *    cookie-less 401 (`:96`), its own media-type 415 (`:31`, `:104`, `:107`) and its own outage 502
 *    (`failedUpstreamAnswer`, `:135-144`) carry **no** `Cache-Control` at all. The DELETE route never asks —
 *    `route.ts:12` passes no options — so its relayed 204 and 404 are unmarked too, although the mock marks those very
 *    paths `no-store` (measured by asking the mock directly, `-probe-api-4.log`). Pinned as measured, **not** as a
 *    defect (lead's review): what the route's comment protects is the personal list, and every answer that can carry
 *    it — a relayed 200, and the relayed refusals — is marked. The unmarked ones hold nothing personal and no shared
 *    cache may keep them anyway: a 401, 415 or 502 is not heuristically cacheable (RFC 9110 §15.1), and no answer to a
 *    DELETE is cacheable at all (RFC 9110 §9.3.5). Unlike finding 1 of `suites/lane-b/integration-connect-routes.spec.ts`,
 *    where the unmarked answers are the minted secrets themselves.
 * 2. **A granted end answers 204 with the upstream media type on a bodiless answer.** `new NextResponse(upstream.body,
 *    { status, headers })` copies `content-type: application/json; charset=utf-8` (`:24`, `:128-131`) onto an answer the
 *    mock really sends with no body (measured through the route *and* directly: 204, `""`, that media type, and
 *    `no-store` on the mock / none on this app). So "an end that worked" is a bodiless 204 that declares JSON. The client
 *    is indifferent (`embeds.service.ts:185-187` ignores the body) and every relayed status of this helper looks like
 *    this, so it is pinned as measured *and* intended rather than as a defect.
 * 3. **`encodeURIComponent(id)` does its job; a raw dot segment is Next's business, not the route's.** Encoded ids reach
 *    the mock exactly as encoded and nothing else was asked (`-probe-api-4.log`): `..%2Femployee` →
 *    `DELETE /api/embed/grants/..%2Femployee`; `x%3Fy%3D1` → one segment with an **empty** recorded query, so the `?`
 *    never became one; `%2e%2e%2femployee` → `..%2Femployee`, which proves the id was decoded and re-encoded rather than
 *    handed on; `..%2F..%2Fuser%2Fme` → no `/api/user/me` call; and `%2F`, `&`, a space, `#`, a newline and `<script>`
 *    all stay inside one segment, each answered 404 by the mock and leaving the fixture list intact. Ids written with
 *    **real** dot segments are folded before the handler runs (`-probe-api-3.log`): `/api/embed/grants/.` and `/%2E`
 *    answer `308` with the folded path as their `Location` and the mock asked nothing, `/..` and `/%2e%2e` fold to
 *    `/api/embed`, and `grant-notes/../grant-wiki` arrives as the plain id `grant-wiki` and really ended **that** grant
 *    (`-probe-api-2.log`). Nothing escaped `/api/embed/grants/`: a followed fold lands either on another grant of the
 *    same list or on a path with no handler (Next's own 405 with no body and no media type, or Next's own 404 HTML page).
 *    Pinned as measured and **not** a defect (lead's review): removing dot segments is standard URL resolution (RFC 3986
 *    §5.2.4, which a browser applies before it even sends), so `grant-notes/../grant-wiki` *is* a request for
 *    `grant-wiki`, which the caller could ask for directly; the client never sends a raw dot segment (it encodes the id,
 *    `embeds.service.ts:185-187`), and Gauzy ends only the signed-in person's own grants (the route's doc, `:5-8`). The
 *    route's comment promises the id "stays one path segment", and for an id it was given it is exactly right.
 * 4. **A read is not a write, on both routes.** `Sec-Fetch-Site: cross-site` / `same-site` and an `Origin` of another
 *    site change nothing on the GET (`same-origin-request.ts:43-46` returns null for GET/HEAD), while on the DELETE the
 *    same trio is `403 {"statusCode":403,"message":"Cross-site request refused"}` **with `Cache-Control: no-store`**
 *    (`:48-53`) and an empty mock log — even with that grant's own upstream armed 500, because the site check runs
 *    before the fetch (`forward-to-gauzy.ts:85-90`). A cookie-less caller is refused by the helper itself (`:96`), and an
 *    empty log is what proves this app refused rather than Gauzy.
 * 5. **The hook's retry rule is visible as a read count.** `shouldRetryList` retries a failure only while
 *    `failureCount < LIST_RETRIES` (2) and never retries a 4xx (`use-embed-site-grants.ts:15,22-26`). Measured through the
 *    page: an armed 500 produced exactly **3** upstream reads before the failure row, and the click on `Try again` after
 *    the arm was removed was the **4th** read and the first 200; an armed 400, 401 or 403 produced exactly **1** read
 *    each (`-probe-ui-5.log`). A 404 is no failure row at all: `isSiteGrantsUnavailable` (`embed-site-grants.ts:51-53`)
 *    makes `isUnavailable` true and the component returns null (`allowed-sites-section.tsx:86-88`), measured as
 *    `#allowed-sites` count 0 and the heading count 0 with the rest of the page intact.
 * 6. **A 404 on the end is a success, and the row afterwards depends on what the re-read found.** `confirmEnd` swallows
 *    an error `isSiteGrantAlreadyEnded` recognises (`allowed-sites-section.tsx:110-121`, `embed-site-grants.ts:59-61`)
 *    and toasts `ENDED`; `onSettled` re-reads the list either way (`use-embed-site-grants.ts:57-59,66`). Measured with
 *    the grant really gone (ended through this app's own DELETE route before the click): DELETE 404, `ENDED` toast,
 *    dialog closed, and the row gone because the re-read no longer listed it. Measured with the 404 *armed* instead: the
 *    same toast and closed dialog, but the row came back — an armed refusal changes no mock state, so the list still holds
 *    that grant. The second is labelled `mock limit`: what is pinned is the app treating it as ended, not the row going.
 * 7. **A refused end keeps the dialog and its own sentence; the app's global mutation toast never speaks here.** Armed
 *    500, 403 and 502 on the grant's own path each left the dialog open with its title, `The sign-in was not ended. Try
 *    again.` as a `role="alert"` under it (`allowed-sites-section.tsx:120-121,171`, rendered by `danger.tsx:166`), both
 *    rows still listed, the confirm button still enabled, and no `ENDED` toast (`meta.handlesOwnError: true`,
 *    `use-embed-site-grants.ts:67`, keeps `mutation-error-toaster.tsx` silent). Beside them, in these dev-mode runs only,
 *    sits a `DEV Mutation failed useEmbedSiteGrants.useMutation[endMutation] …` toast, and a failed **list** read raises
 *    the matching `DEV Query failed ["embeds","site-grants",…]` instead (`core/components/common/dev-error-toaster.tsx`);
 *    both are pinned as the dev diagnostics they are.
 * 8. **The list the section shows is this app's sort of whatever Gauzy returned, and the mock's own fixture is already in
 *    that order.** `siteGrantsInOrder` sorts a copy by `expiresAt` descending (`embed-site-grants.ts:21-23`) over a list
 *    the mock hands over in that same order (`cypress/support/mock-gauzy-server.mjs:367-371`), so the fixture alone cannot
 *    tell "sorted" from "as delivered". The stubbed row therefore hands the page a list in the **wrong** order — wiki
 *    2030-01-05, then an unreadable date, then notes 2030-01-20, then a 2031 host with a port — and the page renders
 *    port-host, notes, wiki, then the scheme-less host with no date line at all (`-probe-ui-6.log`), which is
 *    `siteGrantsInOrder`, `renewalEndOf`'s null (`:26-32`) and `siteHostOf`'s host-with-port plus its "an origin that does
 *    not parse stays whole" (`:35-45`) doing their work.
 *
 * ## Mock limits — branches this lane cannot answer, stated instead of faked
 *
 * - Both paths default to **"a Gauzy without the route"**: unless the `siteGrants` scenario is exactly `true` the mock
 *   answers `GET /api/embed/grants` *and* `DELETE /api/embed/grants/<id>` with `404 {statusCode:404,message:'Not Found'}`
 *   (`mock-gauzy-server.mjs:855-861`); with it on, GET answers the fixture list and DELETE of a listed id answers 204
 *   after removing it, of an unlisted id 404 (`:862-873`). The list is remade at every `/reset` (`:1281`), which is why
 *   each test arms what it needs and never inherits a previous test's grants.
 * - `fails` and `drops` are handled **before** the route handler and change no state (`:1158-1163`, `:1218-1226`): an
 *   armed 404 on a DELETE leaves the grant in the mock's list, an armed 500 leaves it too. That is why finding 6 is
 *   pinned twice, once with a real end and once with an arm.
 * - The control's `/state` does not carry `siteGrants` at all (measured keys: `scenario, mutationProof, everPlatform,
 *   everIdLogouts, receivedTokens, notificationSetting, workspaceCreation, requests`), so a mock list change is only ever
 *   witnessed through the next GET or through the DELETE's own status.
 * - A `fails` arm is addressed by exact path: an arm on `/api/embed/grants` never reaches `/api/embed/grants/<id>` and the
 *   other way round (measured both ways), which is what makes a per-grant arm usable in the UI rows. Both a `tenant:path`
 *   key and a bare `path` key fire for the mock call this app makes (`-probe-api-2.log`).
 * - The mock answers `GET /api/user/me` whatever arrives, so a signed-out *guarded* call would still look signed in. These
 *   two routes are unguarded and refuse a cookie-less caller themselves, so **no `/api/user/me` exception is needed in
 *   this file**: an entry for it in one of these logs would itself be the finding. An armed 401 on a grants read is the
 *   one refusal the client logs no `[HttpClient]` line for, measured twice: `EmbedsService.handleUnauthorized`
 *   intercepts it and reaches for a new token pair first, and this lane's fixture token is an unsigned synthetic one, so
 *   the console carries only `[JWT] Failed to decode token …` — the lane's line, not the feature's. The 401 row pins
 *   that absence; a 400 or a 500 does get its `[HttpClient] HTTP Error: GET /embed/grants <status>` line, and a 403 the
 *   app's `🚨 CRITICAL: HTTP 403 Forbidden …` variant of it.
 * - `next dev` is what the lane runs: React Strict Mode mounts the section twice and TanStack Query aborts the first read
 *   of a query whose signal reached axios (`playwright/helpers.ts:37-43`, `CONSOLE_NOISE`), and a handler that throws
 *   would answer Next's own page rather than this app's JSON. Neither showed in the grants log here: one page load made
 *   exactly one `GET /api/embed/grants` (`-probe-ui-4.log`).
 * - Playwright's `APIRequestContext` does not carry the hand-written `Cookie:` header across a redirect hop, so a
 *   *followed* fold that lands on the collection reads as this app's 401 through `api()` (`-probe-api-3.log`) while the
 *   same call through Node's `fetch` reads as 200 with the list (`-probe-api-2.log`). That difference is the fixture's,
 *   not the route's, so this file pins only the fold itself (the `308` and its `Location`) and the followed answers that
 *   do not depend on a session at all (405, Next's 404 page).
 * - 499 (`req.signal.aborted`, `forward-to-gauzy.ts:138`) and the 60 000 ms upstream timeout (`:8`) are not reachable from
 *   a test whose own caller budget is the same 60 000 ms (`playwright/api-fixtures.ts:101`).
 * - A verb a route file does not export never reaches these handlers: Next answers 405 with no body and no media type, and
 *   the mock was asked nothing (`POST /api/embed/grants`, `PUT /api/embed/grants`, `GET /api/embed/grants/<id>`).
 * - The stubbed row answers from `page.route`, so nothing of it reaches the mock, and its list is this file's invention
 *   shaped after `embedSiteGrantListSchema` (`core/types/schemas/embeds/embed.schema.ts:75-81`). It is the only way this
 *   lane can show a list that arrives unsorted, a host with a port, a host without a scheme and an `expiresAt` that does
 *   not read — and an unparseable date passes that schema, which is why the component needs `renewalEndOf` at all.
 *
 * ## Cost
 *
 * API half 58: GET 14 (control, no-route, signed out, 4 armed refusals, cut, 2 arm-isolation rows, caller query, 3
 * cross-site reads) + DELETE 17 (listed, then-read, unlisted, twice, no-route, 12 hostile ids) + fold 7 (4 dot segments
 * unfollowed, 2 followed answers, 1 fold into a sibling) + gates 18 (3 cross-site, cross-site-with-arm, 2 own header sets,
 * signed out, 3 armed, cut, 4 body shapes, 3 verbs) + Cache-Control 2. UI half 16: absent, rows, stubbed order,
 * placeholder, dialog + Cancel, confirm, already gone (real), already gone (armed 404), 3 refused ends, refused list 500
 * with its retry, 3 refused lists (403, 401, 400), empty list. **74 tests**, green in both runs named at the top.
 */

/** Both routes proxy into `<mock>/api`, so the upstream path the mock records is the app route's own pathname. */
const GRANTS = '/api/embed/grants';
const grantPath = (id: string) => `${GRANTS}/${id}`;
const SECURITY_PATH = '/settings/personal/security';

/** The media type the mock writes on every answer it makes, copied onto it by the proxy (`forward-to-gauzy.ts:24`). */
const UPSTREAM_MEDIA_TYPE = 'application/json; charset=utf-8';
/** The media type of an answer this app wrote itself (`NextResponse.json`). */
const OWN_MEDIA_TYPE = 'application/json';
const NO_STORE = 'no-store';

/** The mock's two fixture grants, in the order the mock hands them over (`mock-gauzy-server.mjs:367-371`). */
const GRANT_NOTES = { id: 'grant-notes', origin: 'https://notes.example.com', expiresAt: '2030-01-20T10:00:00.000Z' };
const GRANT_WIKI = { id: 'grant-wiki', origin: 'https://wiki.example.com', expiresAt: '2030-01-05T10:00:00.000Z' };
const MOCK_LIST = [GRANT_NOTES, GRANT_WIKI];

/** The mock's own refusal body (`mock-gauzy-server.mjs:1168-1169`), and its "there is no such route" body (`:859-860`). */
const gauzyRefusal = (status: number) => ({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });
const NO_SUCH_ROUTE_BODY = { statusCode: 404, message: 'Not Found' };

const MOCK_LIMIT = ' [mock limit]';

/** A measured answer. `body` and `text` are alternatives; `contentType` / `cacheControl` were measured too. */
type Answer = {
	status: number;
	body?: unknown;
	text?: string;
	/** The `content-type`, or `null` for "carries none at all". */
	contentType?: string | null;
	/** The `cache-control`, or `null` for "carries none" — which is the whole point of finding 1. */
	cacheControl?: string | null;
};

/** An answer this app wrote itself: this app's status and media type, and no `Cache-Control` unless it says so. */
function ownJson(status: number, body: unknown, cacheControl: string | null = null): Answer {
	return { status, body, contentType: OWN_MEDIA_TYPE, cacheControl };
}

/** A Gauzy answer relayed by `forwardToGauzy`: its status, body **and media type** (`:128-131`), plus the
 *  `Cache-Control` of the route that asked for it (`:22-28`) — `null` on the [id] route, which passes no options. */
const relayed = (status: number, cacheControl: string | null, body: unknown = gauzyRefusal(status)): Answer => ({
	status,
	body,
	contentType: UPSTREAM_MEDIA_TYPE,
	cacheControl
});

/** The same with no body at all, which is what a granted end is (finding 2). */
const relayedNoBody = (status: number, cacheControl: string | null): Answer => ({
	status,
	text: '',
	contentType: UPSTREAM_MEDIA_TYPE,
	cacheControl
});

/** Refusals the mock can be armed with and this helper relays unchanged. */
const REFUSAL_STATUSES = [401, 403, 429, 500] as const;

/** What `refuseForeignWrite` answers (`same-origin-request.ts:48-53`) — the one refusal that does mark its answer. */
const FOREIGN_SITE_REFUSAL = ownJson(403, { statusCode: 403, message: 'Cross-site request refused' }, NO_STORE);
/** What `forwardToGauzy` answers a caller with no token cookie, before it asks anything (`:96`). */
const REFUSED_BY_THIS_APP = ownJson(401, { statusCode: 401, message: 'Unauthorized' });
/** What it answers when Gauzy gave no answer at all (`failedUpstreamAnswer`, `:135-144`). */
const UNREACHABLE = ownJson(502, { statusCode: 502, message: 'The Gauzy API is unreachable' });
/** Its media-type refusal (`:30-31`, `:104`, `:107`). */
const UNSUPPORTED_MEDIA = ownJson(415, { statusCode: 415, message: 'Unsupported Media Type' });
/** What Next answers a verb a route file does not export: nothing, and not even a media type. */
const NO_HANDLER: Answer = { status: 405, text: '', contentType: null, cacheControl: null };
/** Next's own not-found page, for a folded id that lands on a path with no route file. */
const NEXT_404_PAGE: Answer = { status: 404, contentType: 'text/html; charset=utf-8', cacheControl: NO_STORE };

/** Header sets a browser sends when the request came from another site — or a forged caller sends on its own. */
const FOREIGN_HEADERS: Array<{ label: string; headers: Record<string, string> }> = [
	{ label: 'Sec-Fetch-Site: cross-site', headers: { 'sec-fetch-site': 'cross-site' } },
	{ label: 'Sec-Fetch-Site: same-site', headers: { 'sec-fetch-site': 'same-site' } },
	{ label: 'an Origin of another site', headers: { origin: 'https://evil.example' } }
];
/** Header sets this app's own pages send on a write; if any of these were refused the section would be broken. */
const OWN_HEADERS: Array<{ label: string; headers: Record<string, string> }> = [
	{ label: 'an Origin naming this very host', headers: { origin: APP_ORIGIN } },
	{ label: 'Sec-Fetch-Site: same-origin', headers: { 'sec-fetch-site': 'same-origin' } }
];

/**
 * Ids a caller can write into the path segment; `app/api/embed/grants/[id]/route.ts:9-12` decodes the segment and
 * re-encodes it. `upstream` is the path the mock recorded, measured in `-probe-api-4.log`, and it is the whole point of
 * each row: an id that was meant to open another path stayed inside this one.
 */
const HOSTILE_IDS: Array<{ id: string; upstream: string; note: string }> = [
	{
		id: '..%2Femployee',
		upstream: '/api/embed/grants/..%2Femployee',
		note: 'an encoded slash stayed inside the segment'
	},
	{ id: 'x%3Fy%3D1', upstream: '/api/embed/grants/x%3Fy%3D1', note: 'an encoded ? opened no query' },
	{
		id: '..%2F..%2Fuser%2Fme',
		upstream: '/api/embed/grants/..%2F..%2Fuser%2Fme',
		note: 'no other route was reached'
	},
	{ id: '%2e%2e%2femployee', upstream: '/api/embed/grants/..%2Femployee', note: 'decoded once and re-encoded once' },
	{
		id: 'grant-notes%2Fextra',
		upstream: '/api/embed/grants/grant-notes%2Fextra',
		note: 'the encoded slash did not split the id'
	},
	{ id: '%2Femployee', upstream: '/api/embed/grants/%2Femployee', note: 'a leading encoded slash is not a path' },
	{ id: 'a%26b', upstream: '/api/embed/grants/a%26b', note: 'an encoded & opened no extra parameter' },
	{ id: 'grant-notes%20x', upstream: '/api/embed/grants/grant-notes%20x', note: 'a space is part of the id' },
	{
		id: 'grant-notes%23frag',
		upstream: '/api/embed/grants/grant-notes%23frag',
		note: 'an encoded # is not a fragment'
	},
	{ id: 'grant-notes%0A', upstream: '/api/embed/grants/grant-notes%0A', note: 'a newline is part of the id' },
	{
		id: '%22%3E%3Cscript%3E',
		upstream: '/api/embed/grants/%22%3E%3Cscript%3E',
		note: 'quotes and markup are one segment'
	},
	{ id: '%20', upstream: '/api/embed/grants/%20', note: 'a lone space is one segment' }
];

/** An upstream call one case caused, spelled the way the mock records it. */
type Ask = {
	method: 'GET' | 'DELETE' | 'POST' | 'PUT';
	path: string;
	status?: number;
	/** The query the mock recorded, when the case sent one; `''` is what every other call of these routes carries. */
	query?: string;
};

/** One `api()` call, with the overrides these rows need. */
type CallOverride = {
	method?: Ask['method'];
	body?: unknown;
	headers?: Record<string, string>;
	anonymous?: boolean;
	/** `0` keeps a redirect as the answer under test, as `api-fixtures.ts:99-100` spells it. */
	maxRedirects?: number;
};

async function callRoute(
	api: ApiCall,
	path: string,
	override: CallOverride = {}
): Promise<{ response: APIResponse; text: string; path: string }> {
	const response = await api(path, {
		method: override.method ?? 'GET',
		...(override.body === undefined ? {} : { body: override.body }),
		...(override.anonymous ? { anonymous: true } : {}),
		...(override.headers ? { headers: override.headers } : {}),
		...(override.maxRedirects === undefined ? {} : { maxRedirects: override.maxRedirects })
	});
	return { response, text: await response.text(), path };
}

/** One recorded call as the line a failure message quotes, query included because these routes forward it. */
const lineOf = (request: StubRequest): string =>
	`${request.method} ${request.path} ${request.status} query=${JSON.stringify(request.query)}`;

const describeAnswer = (path: string, response: APIResponse, body: string): string =>
	`${path} -> ${response.status()} · content-type ${JSON.stringify(
		response.headers()['content-type'] ?? null
	)} · cache-control ${JSON.stringify(response.headers()['cache-control'] ?? null)} · body(${body.length}) ` +
	`${JSON.stringify(body.slice(0, 180))}`;

/** The witness every assertion below ends with, and the line every case prints before it asserts. */
const witnessOf = (
	path: string,
	response: APIResponse,
	body: string,
	log: StubRequest[],
	askedPaths: string[]
): string => {
	const asked = log.filter((request) => askedPaths.includes(request.path));
	return `${describeAnswer(path, response, body)} · asked ${JSON.stringify(asked.map(lineOf))} · full log ${logOf(log)}`;
};

const pathsOf = (asks: Ask[]): string[] => asks.map((ask) => ask.path);

/**
 * The assertions every API case shares: the answer (status, body, media type, Cache-Control), the upstream calls it
 * caused (verb, path, status and the query exactly as recorded), and that nothing else was asked. These two routes run
 * no guard and no session check (`forward-to-gauzy.ts:89-96` only reads cookies), so unlike every guarded family in
 * this lane **no `/api/user/me` exception is needed here**.
 */
function expectApiAnswer(
	asked: Ask[],
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
			`${why}: the answer body is no longer what this route answers (${JSON.stringify(answer.body).slice(0, 200)} vs ` +
				`${JSON.stringify((parsed as { unparsed?: string } | null)?.unparsed ?? parsed).slice(0, 200)}) — ${witness}`
		).toEqual(answer.body);
	}
	if (answer.text !== undefined) {
		expect(
			text,
			`${why}: the answer is no longer ${JSON.stringify(answer.text)} (${JSON.stringify(text.slice(0, 180))}) — ${witness}`
		).toBe(answer.text);
	}
	if (answer.contentType !== undefined) {
		expect(
			response.headers()['content-type'] ?? null,
			`${why}: the media type moved off ${JSON.stringify(answer.contentType)} — ${witness}. It says which half ` +
				'answered: an answer this app wrote carries application/json, a copied upstream answer carries the mock media type'
		).toBe(answer.contentType);
	}
	if (answer.cacheControl !== undefined) {
		expect(
			response.headers()['cache-control'] ?? null,
			`${why}: Cache-Control moved off ${JSON.stringify(answer.cacheControl)} — ${witness}`
		).toBe(answer.cacheControl);
	}

	// Every expected call, in the order this case made it, against the entries the mock recorded for those same paths.
	const expectedLines = asked.map(
		(ask) => `${ask.method} ${ask.path} ${ask.status ?? 200} query=${JSON.stringify(ask.query ?? '')}`
	);
	const recordedLines = log
		.filter((request) => asked.some((ask) => ask.path === request.path && ask.method === request.method))
		.map(lineOf);
	expect(
		recordedLines,
		`${why}: the upstream calls are no longer the ones this route makes (expected ${JSON.stringify(
			expectedLines
		)}) — ${witness}`
	).toEqual(expectedLines);

	expect(
		triples(log),
		`${why}: the case asked something besides the calls this route is pinned on — ${witness}`
	).toEqual(asked.map((ask) => `${ask.method} ${ask.path} ${ask.status ?? 200}`));
}

// ==========================================================================================
// A. GET /api/embed/grants
// ==========================================================================================

apiTest.describe('lane-b · GET /api/embed/grants: the list, the refusals, and the header this route asked for', () => {
	apiTest.afterEach(async () => {
		await mockReset();
	});

	apiTest(
		"control, siteGrants on — the mock's own list, its media type, and Cache-Control: no-store",
		async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const { response, text, path } = await callRoute(api, GRANTS);
			const log = await mock.requests();

			console.log(`[lane-b sites] MEASURE get-control ${witnessOf(path, response, text, log, [GRANTS])}`);

			expectApiAnswer(
				[{ method: 'GET', path: GRANTS }],
				response,
				text,
				path,
				log,
				relayed(200, NO_STORE, MOCK_LIST),
				'GET /api/embed/grants control'
			);
			expect(await mock.failures(), `the control caused a refused upstream call (${logOf(log)})`).toEqual([]);
		}
	);

	apiTest('siteGrants off — a Gauzy without the route, relayed as a 404 with no-store', async ({ api, mock }) => {
		const { response, text, path } = await callRoute(api, GRANTS);
		const log = await mock.requests();

		console.log(`[lane-b sites] MEASURE get-no-route ${witnessOf(path, response, text, log, [GRANTS])}`);

		expectApiAnswer(
			[{ method: 'GET', path: GRANTS, status: 404 }],
			response,
			text,
			path,
			log,
			relayed(404, NO_STORE, NO_SUCH_ROUTE_BODY),
			'GET /api/embed/grants with the scenario off'
		);
	});

	apiTest('signed out — this app refuses, and the mock was asked nothing at all', async ({ api, mock }) => {
		await mock.scenario({ siteGrants: true });
		const { response, text, path } = await callRoute(api, GRANTS, { anonymous: true });
		const log = await mock.requests();

		console.log(`[lane-b sites] MEASURE get-signed-out ${witnessOf(path, response, text, log, [])}`);

		// `forward-to-gauzy.ts:96` short-circuits on the cookie, before the fetch at `:112`.
		expectApiAnswer([], response, text, path, log, REFUSED_BY_THIS_APP, 'GET /api/embed/grants signed out');
		expect(
			triples(log),
			'a caller with no session cookie reached the test backend at all — the refusal must come from this app'
		).toEqual([]);
	});

	for (const status of REFUSAL_STATUSES) {
		apiTest(
			`an armed upstream ${status} on its own path is relayed as it arrived, with no-store`,
			async ({ api, mock, ids }) => {
				await mock.scenario({ siteGrants: true, fails: { [`${ids.tenantA}:${GRANTS}`]: status } });
				const { response, text, path } = await callRoute(api, GRANTS);
				const log = await mock.requests();

				console.log(
					`[lane-b sites] MEASURE get-armed-${status} ${witnessOf(path, response, text, log, [GRANTS])}`
				);

				expectApiAnswer(
					[{ method: 'GET', path: GRANTS, status }],
					response,
					text,
					path,
					log,
					relayed(status, NO_STORE),
					`GET /api/embed/grants armed ${status} on ${ids.tenantA}:${GRANTS}`
				);
				expect(
					triples(await mock.failures()),
					`the armed ${status} is missing from the refused-calls view (${logOf(log)})`
				).toEqual([`GET ${GRANTS} ${status}`]);
			}
		);
	}

	apiTest(
		"a cut upstream call is this app's own 502 — and it carries no Cache-Control, although this route asked for no-store",
		async ({ api, mock, ids }) => {
			await mock.scenario({ siteGrants: true, drops: { [`${ids.tenantA}:${GRANTS}`]: 1 } });
			const { response, text, path } = await callRoute(api, GRANTS);
			const log = await mock.requests();

			console.log(`[lane-b sites] MEASURE get-cut ${witnessOf(path, response, text, log, [GRANTS])}`);

			// `failedUpstreamAnswer` (`forward-to-gauzy.ts:135-144`) builds its own `NextResponse.json`; the `noStore`
			// option is only ever applied by `answerHeaders` to a relayed answer (`:22-28`, `:130`).
			expectApiAnswer(
				[{ method: 'GET', path: GRANTS, status: 0 }],
				response,
				text,
				path,
				log,
				UNREACHABLE,
				`GET /api/embed/grants with ${ids.tenantA}:${GRANTS} cut`
			);
			expect(
				await mock.failures(),
				`a cut call was counted as a refusal, which would make every "was refused upstream" witness in this lane ` +
					'mean two different things'
			).toEqual([]);
		}
	);

	apiTest('an arm addressed to the collection path does not reach the [id] route', async ({ api, mock }) => {
		await mock.scenario({ siteGrants: true, fails: { [GRANTS]: 503 } });
		const del = await callRoute(api, grantPath(GRANT_WIKI.id), { method: 'DELETE' });
		const delLog = await mock.requests();
		console.log(
			`[lane-b sites] MEASURE arm-collection-delete ${witnessOf(del.path, del.response, del.text, delLog, [grantPath(GRANT_WIKI.id)])}`
		);
		expectApiAnswer(
			[{ method: 'DELETE', path: grantPath(GRANT_WIKI.id), status: 204 }],
			del.response,
			del.text,
			del.path,
			delLog,
			relayedNoBody(204, null),
			`DELETE ${grantPath(GRANT_WIKI.id)} while the collection path was armed 503`
		);

		const get = await callRoute(api, GRANTS);
		const log = await mock.requests();
		console.log(
			`[lane-b sites] MEASURE arm-collection-get ${witnessOf(get.path, get.response, get.text, log, [GRANTS])}`
		);
		expectApiAnswer(
			[
				{ method: 'DELETE', path: grantPath(GRANT_WIKI.id), status: 204 },
				{ method: 'GET', path: GRANTS, status: 503 }
			],
			get.response,
			get.text,
			get.path,
			log,
			relayed(503, NO_STORE),
			`GET ${GRANTS} with the same arm on its own path`
		);
	});

	apiTest('an arm addressed to a grant id does not reach the collection read', async ({ api, mock }) => {
		await mock.scenario({ siteGrants: true, fails: { [grantPath(GRANT_WIKI.id)]: 503 } });
		const { response, text, path } = await callRoute(api, GRANTS);
		const log = await mock.requests();

		console.log(`[lane-b sites] MEASURE arm-id-only ${witnessOf(path, response, text, log, [GRANTS])}`);

		expectApiAnswer(
			[{ method: 'GET', path: GRANTS }],
			response,
			text,
			path,
			log,
			relayed(200, NO_STORE, MOCK_LIST),
			`GET ${GRANTS} while only ${grantPath(GRANT_WIKI.id)} was armed`
		);
		expect(await mock.failures(), 'an arm on another path fired on this one').toEqual([]);
	});

	apiTest('a caller query is handed on whole, because the route fixes only the path', async ({ api, mock, ids }) => {
		await mock.scenario({ siteGrants: true });
		const path = `${GRANTS}?laneProbe=7&organizationId=${ids.organizationB}`;
		const { response, text } = await callRoute(api, path);
		const log = await mock.requests();
		const witness = witnessOf(path, response, text, log, [GRANTS]);

		console.log(`[lane-b sites] MEASURE get-query ${witness}`);

		// `forward-to-gauzy.ts:112` appends `new URL(req.url).search` to the path the route fixed at `route.ts:8`.
		const recordedQuery = log.filter((request) => request.path === GRANTS).map((request) => request.query);
		expect(recordedQuery, `the caller's query is no longer forwarded as written — ${witness}`).toEqual([
			`laneProbe=7&organizationId=${ids.organizationB}`
		]);
		expectApiAnswer(
			[{ method: 'GET', path: GRANTS, query: `laneProbe=7&organizationId=${ids.organizationB}` }],
			response,
			text,
			path,
			log,
			relayed(200, NO_STORE, MOCK_LIST),
			`GET ${path}`
		);
	});

	for (const item of FOREIGN_HEADERS) {
		apiTest(
			`the same read with ${item.label} is answered as always, because a read is not a write`,
			async ({ api, mock }) => {
				await mock.scenario({ siteGrants: true });
				const { response, text, path } = await callRoute(api, GRANTS, { headers: item.headers });
				const log = await mock.requests();

				console.log(
					`[lane-b sites] MEASURE get-foreign-read ${witnessOf(path, response, text, log, [GRANTS])}`
				);

				expectApiAnswer(
					[{ method: 'GET', path: GRANTS }],
					response,
					text,
					path,
					log,
					relayed(200, NO_STORE, MOCK_LIST),
					`GET /api/embed/grants with ${item.label} (same-origin-request.ts:43-46 refuses only a write)`
				);
			}
		);
	}
});

// ==========================================================================================
// B. DELETE /api/embed/grants/[id]
// ==========================================================================================

apiTest.describe('lane-b · DELETE /api/embed/grants/[id]: ending one sign-in', () => {
	apiTest.afterEach(async () => {
		await mockReset();
	});

	apiTest(
		'a listed id answers 204 with the upstream media type on a bodiless answer, and no Cache-Control at all',
		async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const { response, text, path } = await callRoute(api, grantPath(GRANT_NOTES.id), { method: 'DELETE' });
			const log = await mock.requests();

			console.log(
				`[lane-b sites] MEASURE delete-listed ${witnessOf(path, response, text, log, [grantPath(GRANT_NOTES.id)])}`
			);

			// `route.ts:12` hands the helper no options, so `answerHeaders` copies only the media type (`:128-131`).
			expectApiAnswer(
				[{ method: 'DELETE', path: grantPath(GRANT_NOTES.id), status: 204 }],
				response,
				text,
				path,
				log,
				relayedNoBody(204, null),
				`DELETE ${path}`
			);
		}
	);

	apiTest('the next read no longer lists what was just ended', async ({ api, mock }) => {
		await mock.scenario({ siteGrants: true });
		const del = await callRoute(api, grantPath(GRANT_NOTES.id), { method: 'DELETE' });
		const get = await callRoute(api, GRANTS);
		const log = await mock.requests();

		console.log(
			`[lane-b sites] MEASURE delete-then-read ${witnessOf(get.path, get.response, get.text, log, [GRANTS])}`
		);

		expectApiAnswer(
			[
				{ method: 'DELETE', path: grantPath(GRANT_NOTES.id), status: 204 },
				{ method: 'GET', path: GRANTS }
			],
			get.response,
			get.text,
			get.path,
			log,
			relayed(200, NO_STORE, [GRANT_WIKI]),
			`GET ${GRANTS} after DELETE ${del.path}`
		);
	});

	apiTest("an unlisted id is Gauzy's own 404, relayed as it arrived", async ({ api, mock }) => {
		await mock.scenario({ siteGrants: true });
		const { response, text, path } = await callRoute(api, grantPath('grant-nope'), { method: 'DELETE' });
		const log = await mock.requests();

		console.log(
			`[lane-b sites] MEASURE delete-unlisted ${witnessOf(path, response, text, log, [grantPath('grant-nope')])}`
		);

		expectApiAnswer(
			[{ method: 'DELETE', path: grantPath('grant-nope'), status: 404 }],
			response,
			text,
			path,
			log,
			relayed(404, null, NO_SUCH_ROUTE_BODY),
			`DELETE ${path}`
		);
	});

	apiTest('the same id twice: 204 the first time, 404 the second', async ({ api, mock }) => {
		await mock.scenario({ siteGrants: true });
		const first = await callRoute(api, grantPath(GRANT_WIKI.id), { method: 'DELETE' });
		const second = await callRoute(api, grantPath(GRANT_WIKI.id), { method: 'DELETE' });
		const log = await mock.requests();

		console.log(
			`[lane-b sites] MEASURE delete-twice ${witnessOf(second.path, second.response, second.text, log, [grantPath(GRANT_WIKI.id)])}`
		);

		expect(first.response.status(), `the first DELETE of ${GRANT_WIKI.id} is no longer 204 — ${logOf(log)}`).toBe(
			204
		);
		expectApiAnswer(
			[
				{ method: 'DELETE', path: grantPath(GRANT_WIKI.id), status: 204 },
				{ method: 'DELETE', path: grantPath(GRANT_WIKI.id), status: 404 }
			],
			second.response,
			second.text,
			second.path,
			log,
			relayed(404, null, NO_SUCH_ROUTE_BODY),
			`DELETE ${second.path} a second time`
		);
	});

	apiTest('with the scenario off, ending a grant is the same "no such route" 404', async ({ api, mock }) => {
		const { response, text, path } = await callRoute(api, grantPath(GRANT_NOTES.id), { method: 'DELETE' });
		const log = await mock.requests();

		console.log(
			`[lane-b sites] MEASURE delete-no-route ${witnessOf(path, response, text, log, [grantPath(GRANT_NOTES.id)])}`
		);

		expectApiAnswer(
			[{ method: 'DELETE', path: grantPath(GRANT_NOTES.id), status: 404 }],
			response,
			text,
			path,
			log,
			relayed(404, null, NO_SUCH_ROUTE_BODY),
			`DELETE ${path} with the scenario off`
		);
	});
});

apiTest.describe('lane-b · an id a caller invents, and the path the mock was really asked for', () => {
	apiTest.afterEach(async () => {
		await mockReset();
	});

	for (const hostile of HOSTILE_IDS) {
		apiTest(
			`an id written as ${JSON.stringify(hostile.id)} reaches the mock as ${hostile.upstream}: ${hostile.note}`,
			async ({ api, mock }) => {
				await mock.scenario({ siteGrants: true });
				const del = await callRoute(api, `${GRANTS}/${hostile.id}`, { method: 'DELETE' });
				const delLog = await mock.requests();
				console.log(
					`[lane-b sites] MEASURE hostile-${hostile.id} ${witnessOf(del.path, del.response, del.text, delLog, [hostile.upstream])}`
				);

				expectApiAnswer(
					[{ method: 'DELETE', path: hostile.upstream, status: 404 }],
					del.response,
					del.text,
					del.path,
					delLog,
					relayed(404, null, NO_SUCH_ROUTE_BODY),
					`DELETE ${GRANTS}/${hostile.id}`
				);

				// And nothing else moved: the list is still the fixture's two grants.
				const after = await callRoute(api, GRANTS);
				const log = await mock.requests();
				console.log(
					`[lane-b sites] MEASURE hostile-${hostile.id}-after ${witnessOf(after.path, after.response, after.text, log, [GRANTS])}`
				);
				expectApiAnswer(
					[
						{ method: 'DELETE', path: hostile.upstream, status: 404 },
						{ method: 'GET', path: GRANTS }
					],
					after.response,
					after.text,
					after.path,
					log,
					relayed(200, NO_STORE, MOCK_LIST),
					`GET ${GRANTS} after DELETE ${GRANTS}/${hostile.id}`
				);
			}
		);
	}
});

apiTest.describe('lane-b · an id written with real dot segments is folded before the route runs', () => {
	apiTest.afterEach(async () => {
		await mockReset();
	});

	for (const [segment, location] of [
		['.', '/api/embed/grants'],
		['%2E', '/api/embed/grants'],
		['..', '/api/embed'],
		['%2e%2e', '/api/embed']
	] as const) {
		apiTest(
			`DELETE /api/embed/grants/${segment} answers 308 with ${location} as its Location, and the mock asked nothing`,
			async ({ api, mock }) => {
				await mock.scenario({ siteGrants: true });
				const { response, text, path } = await callRoute(api, `${GRANTS}/${segment}`, {
					method: 'DELETE',
					maxRedirects: 0
				});
				const log = await mock.requests();
				const witness = witnessOf(path, response, text, log, []);

				console.log(`[lane-b sites] MEASURE fold-${segment} ${witness}`);

				expect(response.status(), `DELETE ${path} is no longer the fold answer — ${witness}`).toBe(308);
				expect(
					response.headers()['location'] ?? null,
					`DELETE ${path} no longer folds onto ${location} — ${witness}`
				).toBe(location);
				expect(text, `the fold answer no longer carries the path it points at — ${witness}`).toBe(location);
				expect(
					[response.headers()['content-type'] ?? null, response.headers()['cache-control'] ?? null],
					`the fold answer grew headers of its own — ${witness}`
				).toEqual([null, null]);
				expect(triples(log), `the fold of ${path} reached the test backend (${logOf(log)})`).toEqual([]);
			}
		);
	}

	apiTest(
		'followed, /api/embed/grants/. reaches no handler: 405 with no body and no media type',
		async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const { response, text } = await callRoute(api, `${GRANTS}/.`, { method: 'DELETE' });
			const log = await mock.requests();

			console.log(
				`[lane-b sites] MEASURE fold-followed-collection ${witnessOf(`${GRANTS}/.`, response, text, log, [])}`
			);

			expectApiAnswer(
				[],
				response,
				text,
				`${GRANTS}/.`,
				log,
				NO_HANDLER,
				`DELETE ${GRANTS}/. followed onto the collection`
			);
		}
	);

	apiTest(
		"followed, /api/embed/grants/.. reaches Next's own 404 page — not this app's JSON",
		async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const { response, text } = await callRoute(api, `${GRANTS}/..`, { method: 'DELETE' });
			const log = await mock.requests();

			console.log(
				`[lane-b sites] MEASURE fold-followed-above ${witnessOf(`${GRANTS}/..`, response, text, log, [])}`
			);

			expectApiAnswer(
				[],
				response,
				text,
				`${GRANTS}/..`,
				log,
				NEXT_404_PAGE,
				`DELETE ${GRANTS}/.. followed onto /api/embed`
			);
			expect(
				parseAnswer(text),
				`the fold onto /api/embed is no longer answered by a page rather than by this app — ${witnessOf(
					`${GRANTS}/..`,
					response,
					text,
					log,
					[]
				)}`
			).toEqual(expect.objectContaining({ unparsed: expect.stringContaining('<!DOCTYPE html>') }));
		}
	);

	apiTest(
		'DELETE /api/embed/grants/grant-notes/../grant-wiki arrives as the plain id grant-wiki and ends that grant',
		async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const path = `${GRANTS}/grant-notes/../grant-wiki`;
			const del = await callRoute(api, path, { method: 'DELETE' });
			const get = await callRoute(api, GRANTS);
			const log = await mock.requests();

			console.log(
				`[lane-b sites] MEASURE fold-into-sibling ${witnessOf(get.path, get.response, get.text, log, [grantPath(GRANT_WIKI.id)])}`
			);

			expect(
				del.response.status(),
				`the folded DELETE no longer answers 204 — ${witnessOf(del.path, del.response, del.text, log, [grantPath(GRANT_WIKI.id)])}`
			).toBe(204);
			expectApiAnswer(
				[
					{ method: 'DELETE', path: grantPath(GRANT_WIKI.id), status: 204 },
					{ method: 'GET', path: GRANTS }
				],
				get.response,
				get.text,
				get.path,
				log,
				relayed(200, NO_STORE, [GRANT_NOTES]),
				`DELETE ${path}: Next folded it onto a sibling grant of the same list`
			);
		}
	);
});

apiTest.describe('lane-b · who may end a sign-in: the site check, the token cookie, the media type, the verbs', () => {
	apiTest.afterEach(async () => {
		await mockReset();
	});

	for (const item of FOREIGN_HEADERS) {
		apiTest(
			`DELETE with ${item.label} is refused here, with no-store, and the platform was asked nothing`,
			async ({ api, mock }) => {
				await mock.scenario({ siteGrants: true });
				const { response, text, path } = await callRoute(api, grantPath(GRANT_NOTES.id), {
					method: 'DELETE',
					headers: item.headers
				});
				const log = await mock.requests();

				console.log(`[lane-b sites] MEASURE delete-foreign ${witnessOf(path, response, text, log, [])}`);

				expectApiAnswer(
					[],
					response,
					text,
					path,
					log,
					FOREIGN_SITE_REFUSAL,
					`DELETE ${path} with ${item.label}`
				);
				expect(
					triples(log),
					`${path} sent with ${item.label} still reached the test backend (${logOf(log)}) — the end went through even ` +
						'though the caller came from another site'
				).toEqual([]);
			}
		);
	}

	apiTest(
		"DELETE cross-site with that grant's own upstream armed 500: the site check answers before the upstream",
		async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true, fails: { [grantPath(GRANT_NOTES.id)]: 500 } });
			const { response, text, path } = await callRoute(api, grantPath(GRANT_NOTES.id), {
				method: 'DELETE',
				headers: { 'sec-fetch-site': 'cross-site' }
			});
			const log = await mock.requests();

			console.log(`[lane-b sites] MEASURE delete-foreign-armed ${witnessOf(path, response, text, log, [])}`);

			expectApiAnswer(
				[],
				response,
				text,
				path,
				log,
				FOREIGN_SITE_REFUSAL,
				`DELETE ${path} cross-site with 500 armed`
			);
			expect(triples(log), `an armed upstream refusal replaced the site check (${logOf(log)})`).toEqual([]);
		}
	);

	for (const item of OWN_HEADERS) {
		apiTest(`DELETE is answered as always with ${item.label}`, async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const { response, text, path } = await callRoute(api, grantPath(GRANT_NOTES.id), {
				method: 'DELETE',
				headers: item.headers
			});
			const log = await mock.requests();

			console.log(
				`[lane-b sites] MEASURE delete-own ${witnessOf(path, response, text, log, [grantPath(GRANT_NOTES.id)])}`
			);

			expectApiAnswer(
				[{ method: 'DELETE', path: grantPath(GRANT_NOTES.id), status: 204 }],
				response,
				text,
				path,
				log,
				relayedNoBody(204, null),
				`DELETE ${path} with ${item.label} — the section's own End would break if this were refused`
			);
		});
	}

	apiTest('DELETE with no session cookie is refused by this app, and nothing was asked', async ({ api, mock }) => {
		await mock.scenario({ siteGrants: true });
		const { response, text, path } = await callRoute(api, grantPath(GRANT_WIKI.id), {
			method: 'DELETE',
			anonymous: true
		});
		const log = await mock.requests();

		console.log(`[lane-b sites] MEASURE delete-signed-out ${witnessOf(path, response, text, log, [])}`);

		expectApiAnswer([], response, text, path, log, REFUSED_BY_THIS_APP, `DELETE ${path} signed out`);
	});

	for (const status of [500, 403, 404]) {
		apiTest(
			`an armed upstream ${status} on the grant's own path is relayed as it arrived, with no Cache-Control`,
			async ({ api, mock }) => {
				await mock.scenario({ siteGrants: true, fails: { [grantPath(GRANT_NOTES.id)]: status } });
				const { response, text, path } = await callRoute(api, grantPath(GRANT_NOTES.id), { method: 'DELETE' });
				const log = await mock.requests();

				console.log(
					`[lane-b sites] MEASURE delete-armed-${status} ${witnessOf(path, response, text, log, [grantPath(GRANT_NOTES.id)])}`
				);

				expectApiAnswer(
					[{ method: 'DELETE', path: grantPath(GRANT_NOTES.id), status }],
					response,
					text,
					path,
					log,
					relayed(status, null),
					`DELETE ${path} armed ${status} on its own path`
				);
			}
		);
	}

	apiTest("a cut DELETE is this app's own 502, with no Cache-Control", async ({ api, mock, ids }) => {
		await mock.scenario({ siteGrants: true, drops: { [`${ids.tenantA}:${grantPath(GRANT_WIKI.id)}`]: 1 } });
		const { response, text, path } = await callRoute(api, grantPath(GRANT_WIKI.id), { method: 'DELETE' });
		const log = await mock.requests();

		console.log(
			`[lane-b sites] MEASURE delete-cut ${witnessOf(path, response, text, log, [grantPath(GRANT_WIKI.id)])}`
		);

		expectApiAnswer(
			[{ method: 'DELETE', path: grantPath(GRANT_WIKI.id), status: 0 }],
			response,
			text,
			path,
			log,
			UNREACHABLE,
			`DELETE ${path} cut`
		);
	});

	apiTest(
		'a JSON body on a DELETE is forwarded, and the mock ignored it — the grant still ended',
		async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const { response, text, path } = await callRoute(api, grantPath(GRANT_WIKI.id), {
				method: 'DELETE',
				body: { nope: 1 }
			});
			const log = await mock.requests();

			console.log(
				`[lane-b sites] MEASURE delete-json-body ${witnessOf(path, response, text, log, [grantPath(GRANT_WIKI.id)])}`
			);

			expectApiAnswer(
				[{ method: 'DELETE', path: grantPath(GRANT_WIKI.id), status: 204 }],
				response,
				text,
				path,
				log,
				relayedNoBody(204, null),
				`DELETE ${path} with a JSON body`
			);
		}
	);

	for (const [label, headers] of [
		['with no media type named', undefined],
		['as text/plain', { 'content-type': 'text/plain' }],
		['as application/x-www-form-urlencoded', { 'content-type': 'application/x-www-form-urlencoded' }]
	] as const) {
		apiTest(`a DELETE body sent ${label} is 415 here, and nothing was asked`, async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const { response, text } = await callRoute(api, grantPath(GRANT_WIKI.id), {
				method: 'DELETE',
				body: 'nope=1',
				...(headers ? { headers } : {})
			});
			const log = await mock.requests();

			console.log(
				`[lane-b sites] MEASURE delete-bad-type ${witnessOf(grantPath(GRANT_WIKI.id), response, text, log, [])}`
			);

			// `forwardToGauzy` refuses a declared non-JSON media type (`:102-104`) and an untyped body alike (`:107`).
			expectApiAnswer(
				[],
				response,
				text,
				grantPath(GRANT_WIKI.id),
				log,
				UNSUPPORTED_MEDIA,
				`DELETE ${grantPath(GRANT_WIKI.id)} sent ${label}`
			);
			expect(triples(log), `a refused media type still reached the test backend (${logOf(log)})`).toEqual([]);
		});
	}

	for (const [label, method, path] of [
		['POST /api/embed/grants', 'POST', GRANTS],
		['PUT /api/embed/grants', 'PUT', GRANTS],
		[`GET /api/embed/grants/${GRANT_NOTES.id}`, 'GET', grantPath(GRANT_NOTES.id)]
	] as const) {
		apiTest(
			`${label}: 405 from Next with no body and no media type, and the mock was asked nothing`,
			async ({ api, mock }) => {
				const { response, text } = await callRoute(api, path, {
					method,
					...(method === 'POST' || method === 'PUT' ? { body: { origin: 'https://evil.example' } } : {})
				});
				const log = await mock.requests();

				console.log(`[lane-b sites] MEASURE verb405 ${witnessOf(path, response, text, log, [])}`);

				// Neither route file exports this verb, so no handler of this app ever ran.
				expectApiAnswer([], response, text, path, log, NO_HANDLER, `${label} (${method})`);
				expect(triples(log), `${label}: the mock was asked (${logOf(log)})`).toEqual([]);
			}
		);
	}
});

apiTest.describe('lane-b · Cache-Control on these answers, against the mock that marks the same paths no-store', () => {
	apiTest.afterEach(async () => {
		await mockReset();
	});

	apiTest(
		"GET: a relayed answer is marked, this app's own 401 is not, and the mock marks the very same path",
		async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const list = await callRoute(api, GRANTS);
			const listLog = await mock.requests();
			const listWitness = witnessOf(list.path, list.response, list.text, listLog, [GRANTS]);
			console.log(`[lane-b sites] MEASURE cache-list ${listWitness}`);
			expect(
				list.response.headers()['cache-control'] ?? null,
				`the relayed list no longer carries the no-store this route asked for (route.ts:8) — ${listWitness}`
			).toBe(NO_STORE);

			const signedOut = await callRoute(api, GRANTS, { anonymous: true });
			const signedOutLog = await mock.requests();
			const signedOutWitness = witnessOf(signedOut.path, signedOut.response, signedOut.text, signedOutLog, []);
			console.log(`[lane-b sites] MEASURE cache-own-401 ${signedOutWitness}`);
			expect(
				signedOut.response.headers()['cache-control'] ?? null,
				`this app's own 401 (forward-to-gauzy.ts:96) now carries a Cache-Control, which is what route.ts:4-5 promises ` +
					`for a personal answer — ${signedOutWitness}`
			).toBeNull();

			const upstream = await fetch(`${MOCK_ORIGIN}${GRANTS}`, { headers: { accept: 'application/json' } });
			const upstreamText = await upstream.text();
			console.log(
				`[lane-b sites] MEASURE cache-mock GET ${GRANTS} -> ${upstream.status} cache-control ` +
					`${JSON.stringify(upstream.headers.get('cache-control'))} content-type ${JSON.stringify(
						upstream.headers.get('content-type')
					)} body(${upstreamText.length})`
			);
			expect(
				upstream.headers.get('cache-control'),
				'the mock no longer marks /api/embed/grants no-store (mock-gauzy-server.mjs:1218), so the contrast this row ' +
					'pins is gone'
			).toBe(NO_STORE);
		}
	);

	apiTest(
		'DELETE: neither this app nor the mock marks its answer, because the route passes no options (route.ts:12)',
		async ({ api, mock }) => {
			await mock.scenario({ siteGrants: true });
			const del = await callRoute(api, grantPath(GRANT_WIKI.id), { method: 'DELETE' });
			const log = await mock.requests();
			const witness = witnessOf(del.path, del.response, del.text, log, [grantPath(GRANT_WIKI.id)]);
			console.log(`[lane-b sites] MEASURE cache-delete ${witness}`);
			expect(
				del.response.headers()['cache-control'] ?? null,
				`this app now marks a DELETE answer, which ${del.path}'s route never asks for (route.ts:12) — ${witness}`
			).toBeNull();

			const upstream = await fetch(`${MOCK_ORIGIN}${grantPath('grant-upstream-probe')}`, { method: 'DELETE' });
			const upstreamText = await upstream.text();
			console.log(
				`[lane-b sites] MEASURE cache-delete-mock DELETE ${grantPath('grant-upstream-probe')} -> ${upstream.status} ` +
					`cache-control ${JSON.stringify(upstream.headers.get('cache-control'))} content-type ${JSON.stringify(
						upstream.headers.get('content-type')
					)} body(${upstreamText.length})`
			);
			expect(
				upstream.headers.get('cache-control'),
				'the mock no longer marks its own DELETE answer no-store, so this contrast is gone'
			).toBe(NO_STORE);
			expect(
				upstream.headers.get('content-type'),
				'the mock no longer declares its media type even for a bodiless 204, which is what finding 2 pins — ' +
					JSON.stringify(upstream.headers.get('content-type'))
			).toBe(UPSTREAM_MEDIA_TYPE);
		}
	);
});

// ==========================================================================================
// C. the section on /settings/personal/security
// ==========================================================================================

/** The copy the page itself renders, read from the locale file the way `lane-c/docs-page-write-access-ui.spec.ts` does
 *  it, so not one English sentence below is typed by hand: each is a template from this file with this file's values. */
const LOCALE = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	settings: { allowedSites: Record<string, string> };
	common: { CANCEL: string; CLOSE: string };
};
const COPY = LOCALE.settings.allowedSites;
/** `danger.tsx:117,178` names the dialog's close and cancel buttons from the top-level `common` keys. */
const CANCEL_LABEL = LOCALE.common.CANCEL;
const CLOSE_LABEL = LOCALE.common.CLOSE;

/** A `{site}` / `{date}` / `{appName}` template from that copy, with this file's own values in it. */
const fill = (template: string, values: Record<string, string>) =>
	template.replace(/\{(\w+)\}/g, (whole: string, key: string) => values[key] ?? whole);

const copyWith = (appName: string) => ({
	TITLE: COPY.TITLE,
	DESCRIPTION: fill(COPY.DESCRIPTION, { appName }),
	EMPTY: COPY.EMPTY,
	LOAD_FAILED: COPY.LOAD_FAILED,
	RETRY: COPY.RETRY,
	END: COPY.END,
	END_FAILED: COPY.END_FAILED,
	ENDED: (site: string) => fill(COPY.ENDED, { site }),
	END_TITLE: (site: string) => fill(COPY.END_TITLE, { site }),
	END_DESCRIPTION: fill(COPY.END_DESCRIPTION, { appName }),
	RENEWS_UNTIL: (date: string) => fill(COPY.RENEWS_UNTIL, { date })
});

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** `RENEWS_UNTIL` with its `{date}` slot opened as a capture group, so a rendered line can be matched and its date read. */
const renewLinePattern = () => new RegExp(`^${COPY.RENEWS_UNTIL.split('{date}').map(escapeRegExp).join('(.+)')}$`);

/** The app name the served document carries; measured `Ever Teams` on this lane, in `data-ever-teams-runtime-env`. */
const APP_NAME_MEASURED = 'Ever Teams';
/** What `format.dateTime(…, { dateStyle: 'medium' })` rendered for the fixture grants (`allowed-sites-section.tsx:33-37`). */
const DATE_NOTES = 'Jan 20, 2030'; // 2030-01-20T10:00:00.000Z, measured in the page's own Europe/Madrid
const DATE_WIKI = 'Jan 5, 2030'; // 2030-01-05T10:00:00.000Z, same page
const DATE_PORT = 'Feb 3, 2031'; // 2031-02-03T10:00:00.000Z, the stubbed row (`-probe-ui-6.log`)

/** React's own dev-mode store warning, in the shell rather than on any grants path — the same single-string exception
 *  the lane-a Security spec carries (`suites/lane-a/security-two-factor-ui.spec.ts:383`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
const consoleFindings = (shield: Shield) => shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE));
/** Only the client's own HTTP log lines about these two paths, so an unrelated failure on the page cannot move a row. */
const grantConsoleErrors = (shield: Shield) =>
	consoleFindings(shield).filter((line) => line.includes('[HttpClient]') && line.includes('/embed/grants'));

const section = (page: Page) => page.locator('#allowed-sites');
const exactText = (page: Page, value: string) => page.getByText(value, { exact: true });
const endButton = (page: Page, label: string, host: string) =>
	page.getByRole('button', { name: `${label}: ${host}`, exact: true });
const dialogBox = (page: Page) => page.getByRole('dialog');
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
const toastTexts = async (page: Page) => (await page.locator('[data-sonner-toast]').allInnerTexts()).map(flat);
const alertTexts = async (page: Page) => (await page.getByRole('alert').allInnerTexts()).map(flat);
/** Each row's origin, read off the `title` attribute of its label span (`allowed-sites-section.tsx:39-41`). */
const rowHosts = async (page: Page) =>
	section(page)
		.locator('[title]')
		.evaluateAll((els) => els.map((el) => el.getAttribute('title') ?? ''));
const rowButtons = async (page: Page) =>
	section(page)
		.locator('button')
		.evaluateAll((els) =>
			els.map((el) => {
				const button = el as HTMLButtonElement;
				return `${JSON.stringify(button.getAttribute('aria-label'))} text=${JSON.stringify(
					(button.textContent ?? '').replace(/\s+/g, ' ').trim()
				)} disabled=${button.disabled}`;
			})
		);
/** The dates the rows rendered, in row order — a row whose `expiresAt` does not read contributes none. */
const renewDates = async (page: Page) =>
	(await section(page).locator('span').allInnerTexts())
		.map(flat)
		.map((line) => line.match(renewLinePattern()))
		.filter((match) => match !== null)
		.map((match) => match[1] ?? '');
const sectionText = async (page: Page) =>
	flat(
		await section(page)
			.innerText()
			.catch(() => '<no #allowed-sites>')
	);

/** The app name this very page was served with, read out of the document that carries it, so every `{appName}`
 *  template below is filled with what the page itself was configured with — and pinned against the measured value. */
async function appNameOf(page: Page): Promise<string> {
	const raw = await page.evaluate(() => document.documentElement.getAttribute('data-ever-teams-runtime-env'));
	if (!raw) throw new Error('the served document carried no data-ever-teams-runtime-env attribute');
	const appName = ((JSON.parse(raw) as { APP_NAME?: string }).APP_NAME ?? '').trim();
	expect(
		appName,
		`the served document's APP_NAME moved off the measured one, so every {appName} sentence here is filled wrong ` +
			`(data-ever-teams-runtime-env=${raw.slice(0, 160)})`
	).toBe(APP_NAME_MEASURED);
	return appName;
}

/** The grants calls the browser caused, as `METHOD path status`, straight from the mock's own log. */
const grantCalls = async (mock: { calls: (fragment: string) => Promise<StubRequest[]> }) =>
	(await mock.calls('/embed/grants')).map((call) => `${call.method} ${call.path} ${call.status}`);

/** Ends a grant the way the person's page would not, but this app's server half does: the route, with the session cookies. */
async function endThroughThisApp(request: APIRequestContext, fixture: BootstrapFixture, id: string): Promise<number> {
	const response = await request.fetch(grantPath(id), {
		method: 'DELETE',
		headers: { accept: 'application/json', cookie: authCookieHeader(fixture) }
	});
	return response.status();
}

/** The mock's CORS answer, restated for a `page.route` stub (copied from `mock-gauzy-server.mjs:1018-1032`, as
 *  `suites/lane-a/security-two-factor-ui.spec.ts:311-318` does): the page is on `localhost:3032` and the grants API on
 *  `127.0.0.1:3996`, so a stub without these headers turns into a connection error instead of an answer. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

const GRANTS_ROUTE = (url: URL) => url.origin === MOCK_ORIGIN && url.pathname.startsWith('/api/embed/grants');

/** A stub of the grants list on the page, so a row can be shown something the mock's fixture cannot: an unsorted list,
 *  a host with a port, a host without a scheme, an `expiresAt` that does not read. */
async function stubGrants(page: Page, list: unknown[]): Promise<Array<{ method: string; url: string }>> {
	const seen: Array<{ method: string; url: string }> = [];
	await page.route(GRANTS_ROUTE, (route) => {
		const method = route.request().method();
		seen.push({ method, url: route.request().url() });
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		if (method === 'DELETE') {
			return route.fulfill({ status: 204, headers: { ...CORS_HEADERS }, body: '' });
		}
		return route.fulfill({
			status: 200,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: JSON.stringify(list)
		});
	});
	return seen;
}

uiTest.describe('lane-b · Settings › Personal › Security: the "Sites you signed in from" section', () => {
	uiTest.afterEach(async () => {
		await mockReset();
	});

	uiTest(
		'a Gauzy without the route shows no section at all, and the page says nothing about it',
		async ({ page, fixture, mock, shield }) => {
			// No `siteGrants` in the scenario, which is the mock's own default for both paths (mock-gauzy-server.mjs:855-861).
			await signInAndVisit(page, fixture, SECURITY_PATH);
			const copy = copyWith(await appNameOf(page));

			await expect(
				page.getByRole('heading', { level: 2, name: 'Two-factor authentication' }),
				'the Security page never rendered, so "no section here" would prove nothing'
			).toBeVisible({ timeout: 25_000 });
			await expect(section(page), 'the section appeared although the API answered 404').toHaveCount(0);
			await expect(exactText(page, copy.TITLE), 'the section heading appeared').toHaveCount(0);
			await expect(exactText(page, copy.DESCRIPTION), 'the section description appeared').toHaveCount(0);
			await expect(exactText(page, copy.EMPTY), 'the empty note appeared instead of nothing').toHaveCount(0);
			await expect(exactText(page, copy.LOAD_FAILED), 'a 404 was shown as a failed read').toHaveCount(0);
			await expect(page.locator('#two-factor'), 'the rest of the page went with it').toHaveCount(1);

			const calls = await grantCalls(mock);
			console.log(
				`[lane-b sites] MEASURE ui-absent ${JSON.stringify({
					url: new URL(page.url()).pathname,
					allowedSitesCount: await section(page).count(),
					grantCalls: calls,
					consoleErrors: shield.consoleErrors(),
					pageErrors: shield.pageErrors()
				})}`
			);
			expect(calls, 'the section did not ask, or asked more than the one read that answered 404').toEqual([
				`GET ${GRANTS} 404`
			]);
			expect(
				grantConsoleErrors(shield),
				'the client logged nothing about the 404 it was answered — a server without embeds is a read that found no ' +
					'route (isSiteGrantsUnavailable, embed-site-grants.ts:51-53), not a silence'
			).toEqual([expect.stringContaining('GET /embed/grants 404')]);
		}
	);

	uiTest(
		'siteGrants on: two rows, longest renewal first, each with its date line and its own End button',
		async ({ page, fixture, mock, shield }) => {
			await signInAndVisit(page, fixture, SECURITY_PATH, { scenario: { siteGrants: true } });
			const copy = copyWith(await appNameOf(page));
			await expect(
				endButton(page, copy.END, 'notes.example.com'),
				'the two fixture grants never rendered as rows'
			).toBeVisible({ timeout: 25_000 });

			await expect(section(page)).toHaveCount(1);
			await expect(
				page.getByRole('heading', { level: 2, name: copy.TITLE }),
				'the section heading is not settings.allowedSites.TITLE'
			).toHaveCount(1);
			await expect(
				exactText(page, copy.DESCRIPTION),
				'the description is not the locale sentence with {appName} filled'
			).toHaveCount(1);
			await expect(
				section(page).locator('h2'),
				'the section is not named by its own heading (SettingsSection, settings-page.tsx:68-79)'
			).toHaveCount(1);

			// `siteGrantsInOrder` (embed-site-grants.ts:21-23): 2030-01-20 before 2030-01-05.
			expect(await rowHosts(page), 'the rows are not in order of expiresAt, latest first').toEqual([
				GRANT_NOTES.origin,
				GRANT_WIKI.origin
			]);
			await expect(exactText(page, GRANT_NOTES.origin), 'no row carries the whole origin').toHaveCount(1);
			await expect(
				exactText(page, copy.RENEWS_UNTIL(DATE_NOTES)),
				'the notes date line is not the measured rendering'
			).toHaveCount(1);
			await expect(
				exactText(page, copy.RENEWS_UNTIL(DATE_WIKI)),
				'the wiki date line is not the measured rendering'
			).toHaveCount(1);
			expect(await renewDates(page), 'the dates the rows rendered moved').toEqual([DATE_NOTES, DATE_WIKI]);

			const buttons = await rowButtons(page);
			console.log(
				`[lane-b sites] MEASURE ui-rows ${JSON.stringify({
					section: await sectionText(page),
					rows: await rowHosts(page),
					buttons,
					grantCalls: await grantCalls(mock),
					timeZone: await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
					consoleErrors: shield.consoleErrors(),
					pageErrors: shield.pageErrors()
				})}`
			);
			expect(
				buttons,
				'a row is no longer one enabled button named `End: <host>` (allowed-sites-section.tsx:49-58, siteHostOf)'
			).toEqual([
				`"End: notes.example.com" text="End" disabled=false`,
				`"End: wiki.example.com" text="End" disabled=false`
			]);
			expect(await grantCalls(mock), 'one page load did not make exactly one read').toEqual([
				`GET ${GRANTS} 200`
			]);
			expect(consoleFindings(shield), 'the section logged a console error on a list it read').toEqual([]);
			expect(shield.pageErrors(), 'reading the list threw in the page').toEqual([]);
		}
	);

	uiTest(
		'a list delivered unsorted, with a port, a host without a scheme and a date that does not read' + MOCK_LIMIT,
		async ({ page, fixture, mock, shield }) => {
			// The mock's own fixture list is already in sorted order (finding 8), so the sort can only be measured against a
			// list this file hands the page itself.
			const stubList = [
				{ id: 'grant-wiki', origin: 'https://wiki.example.com', expiresAt: '2030-01-05T10:00:00.000Z' },
				{ id: 'grant-none', origin: 'bare-host.example.test', expiresAt: 'not-a-date' },
				{ id: 'grant-notes', origin: 'https://notes.example.com', expiresAt: '2030-01-20T10:00:00.000Z' },
				{ id: 'grant-port', origin: 'http://timer.example.test:8443', expiresAt: '2031-02-03T10:00:00.000Z' }
			];
			const seen = await stubGrants(page, stubList);

			await signInAndVisit(page, fixture, SECURITY_PATH, { scenario: { siteGrants: true } });
			await expect(
				endButton(page, COPY.END, 'timer.example.test:8443'),
				'the stubbed list never rendered'
			).toBeVisible({
				timeout: 25_000
			});

			expect(
				await rowHosts(page),
				'siteGrantsInOrder (embed-site-grants.ts:21-23) did not sort the stubbed list'
			).toEqual([
				'http://timer.example.test:8443',
				'https://notes.example.com',
				'https://wiki.example.com',
				'bare-host.example.test'
			]);
			expect(
				await rowButtons(page),
				'siteHostOf (embed-site-grants.ts:35-44) is not what names the buttons: a port belongs to the host, and an ' +
					'origin that does not parse stays whole'
			).toEqual([
				`"End: timer.example.test:8443" text="End" disabled=false`,
				`"End: notes.example.com" text="End" disabled=false`,
				`"End: wiki.example.com" text="End" disabled=false`,
				`"End: bare-host.example.test" text="End" disabled=false`
			]);
			// `renewalEndOf` (`:26-32`) answers null for `not-a-date`, so that row carries no date line at all.
			expect(await renewDates(page), 'the date lines the stubbed rows rendered moved').toEqual([
				DATE_PORT,
				DATE_NOTES,
				DATE_WIKI
			]);

			console.log(
				`[lane-b sites] MEASURE ui-stub-order ${JSON.stringify({
					section: await sectionText(page),
					rows: await rowHosts(page),
					buttons: await rowButtons(page),
					renewDates: await renewDates(page),
					stubSaw: seen.map((call) => `${call.method} ${new URL(call.url).pathname}`),
					mockGrantCalls: await grantCalls(mock),
					consoleErrors: shield.consoleErrors()
				})}`
			);
			expect(await grantCalls(mock), 'a stubbed read reached the mock').toEqual([]);
			expect(consoleFindings(shield), 'the stubbed list logged a console error').toEqual([]);
		}
	);

	uiTest('while the read is held, the section shows its placeholder and no rows', async ({ page, fixture, mock }) => {
		await signInAndVisit(page, fixture, SECURITY_PATH, {
			scenario: { siteGrants: true, delays: { [GRANTS]: 6_000 } }
		});
		const copy = copyWith(await appNameOf(page));

		const busy = section(page).locator('[aria-busy="true"]');
		await expect(busy, 'the held read showed no placeholder (allowed-sites-section.tsx:63-74)').toHaveCount(1);
		await expect(busy, 'the placeholder is not named by the section title').toHaveAttribute(
			'aria-label',
			copy.TITLE
		);
		await expect(
			section(page).locator('[aria-hidden="true"]'),
			'the placeholder is not PLACEHOLDER_ROWS skeleton rows'
		).toHaveCount(2);
		expect(await rowHosts(page), 'a row appeared while the read was still held').toEqual([]);
		await expect(
			section(page).locator('button'),
			'an End button appeared while the read was still held'
		).toHaveCount(0);

		console.log(
			`[lane-b sites] MEASURE ui-placeholder ${JSON.stringify({
				section: await sectionText(page),
				grantCalls: await grantCalls(mock)
			})}`
		);

		// The hold ending is what proves the placeholder was a state and not a broken section.
		await expect(
			endButton(page, copy.END, 'notes.example.com'),
			'the rows never came when the held read answered'
		).toBeVisible({ timeout: 20_000 });
		expect(await grantCalls(mock), 'the held read is no longer the single read it was').toEqual([
			`GET ${GRANTS} 200`
		]);
	});

	uiTest(
		'End opens the confirmation with its own title and description; Cancel closes it and sends nothing',
		async ({ page, fixture, mock, shield }) => {
			await signInAndVisit(page, fixture, SECURITY_PATH, { scenario: { siteGrants: true } });
			const copy = copyWith(await appNameOf(page));
			await endButton(page, copy.END, 'wiki.example.com').waitFor({ timeout: 25_000 });
			await endButton(page, copy.END, 'wiki.example.com').click();

			await expect(dialogBox(page), 'the confirmation never opened').toBeVisible({ timeout: 10_000 });
			await expect(
				dialogBox(page).getByRole('heading', { level: 2, name: copy.END_TITLE('wiki.example.com') }),
				'the dialog title is not settings.allowedSites.END_TITLE filled with the row host'
			).toHaveCount(1);
			await expect(
				dialogBox(page).getByText(copy.END_DESCRIPTION, { exact: true }),
				'the dialog description is not the locale sentence'
			).toHaveCount(1);
			await expect(
				dialogBox(page).getByRole('button', { name: copy.END, exact: true }),
				"the confirm button is not the section's own End"
			).toHaveCount(1);
			await expect(
				dialogBox(page).getByRole('button', { name: CANCEL_LABEL, exact: true }),
				'the dialog has no Cancel'
			).toHaveCount(1);
			await expect(
				dialogBox(page).getByRole('button', { name: CLOSE_LABEL, exact: true }),
				'the dialog has no close button named common.CLOSE'
			).toHaveCount(1);

			console.log(
				`[lane-b sites] MEASURE ui-dialog ${JSON.stringify({
					headings: (await dialogBox(page).getByRole('heading').allInnerTexts()).map(flat),
					body: await dialogBox(page).innerText().then(flat),
					alerts: await alertTexts(page)
				})}`
			);
			expect(await alertTexts(page), 'the confirmation raised an alert before anything had failed').toEqual([]);

			await dialogBox(page).getByRole('button', { name: CANCEL_LABEL, exact: true }).click();
			await expect(dialogBox(page), 'Cancel left the dialog open').toHaveCount(0);
			await page.waitForTimeout(1000);
			expect(await grantCalls(mock), 'Cancel still ended something').toEqual([`GET ${GRANTS} 200`]);
			expect(await rowHosts(page), 'Cancel changed the list').toEqual([GRANT_NOTES.origin, GRANT_WIKI.origin]);
			expect(consoleFindings(shield), 'opening and closing the dialog logged a console error').toEqual([]);
		}
	);

	uiTest(
		'confirming ends the sign-in: the DELETE the mock really saw, the re-read, the toast, the row gone',
		async ({ page, fixture, mock, shield }) => {
			await signInAndVisit(page, fixture, SECURITY_PATH, { scenario: { siteGrants: true } });
			const copy = copyWith(await appNameOf(page));
			await endButton(page, copy.END, 'notes.example.com').waitFor({ timeout: 25_000 });
			await endButton(page, copy.END, 'notes.example.com').click();
			await dialogBox(page).getByRole('button', { name: copy.END, exact: true }).click();

			await expect(
				exactText(page, copy.ENDED('notes.example.com')),
				'the success toast never appeared'
			).toBeVisible({
				timeout: 15_000
			});
			await expect(
				section(page).locator('[title="https://notes.example.com"]'),
				'the ended row is still listed'
			).toHaveCount(0);
			await expect(exactText(page, GRANT_WIKI.origin), 'the other row went with it').toHaveCount(1);
			await expect(dialogBox(page), 'the dialog stayed open after it worked').toHaveCount(0);
			expect(await toastTexts(page), 'the end said more than once, or something else too').toEqual([
				copy.ENDED('notes.example.com')
			]);

			const calls = await grantCalls(mock);
			console.log(
				`[lane-b sites] MEASURE ui-confirm ${JSON.stringify({
					grantCalls: calls,
					toasts: await toastTexts(page),
					section: await sectionText(page),
					rows: await rowHosts(page),
					consoleErrors: shield.consoleErrors(),
					pageErrors: shield.pageErrors()
				})}`
			);
			// One read to show the list, the end itself, then `onSettled`'s re-read (use-embed-site-grants.ts:57-59,66).
			expect(calls).toEqual([
				`GET ${GRANTS} 200`,
				`DELETE ${grantPath(GRANT_NOTES.id)} 204`,
				`GET ${GRANTS} 200`
			]);
			expect(consoleFindings(shield), 'a successful end logged a console error').toEqual([]);
			expect(shield.pageErrors(), 'a successful end threw in the page').toEqual([]);
		}
	);

	uiTest(
		'a grant that is really gone is ended without complaint, and the re-read drops the row',
		async ({ page, fixture, mock, shield, request }) => {
			await signInAndVisit(page, fixture, SECURITY_PATH, { scenario: { siteGrants: true } });
			const copy = copyWith(await appNameOf(page));
			await endButton(page, copy.END, 'wiki.example.com').waitFor({ timeout: 25_000 });

			// Gone for good first, through this app's own DELETE route, so the mock answers 404 on its own from here on.
			const preDelete = await endThroughThisApp(request, fixture, GRANT_WIKI.id);
			console.log(`[lane-b sites] MEASURE ui-already-gone-predelete ${grantPath(GRANT_WIKI.id)} ${preDelete}`);
			expect(preDelete, 'the pre-clean did not end the grant through this app route').toBe(204);

			await endButton(page, copy.END, 'wiki.example.com').click();
			await dialogBox(page).getByRole('button', { name: copy.END, exact: true }).click();

			await expect(
				exactText(page, copy.ENDED('wiki.example.com')),
				'an already-gone grant was not treated as ended (isSiteGrantAlreadyEnded, embed-site-grants.ts:59-61)'
			).toBeVisible({ timeout: 15_000 });
			await expect(dialogBox(page), 'the dialog stayed on a grant that is gone').toHaveCount(0);
			await expect(
				exactText(page, copy.END_FAILED),
				'an already-gone grant was shown as a failed end'
			).toHaveCount(0);
			await expect(
				section(page).locator('[title="https://wiki.example.com"]'),
				'the gone row came back'
			).toHaveCount(0);

			const calls = await grantCalls(mock);
			console.log(
				`[lane-b sites] MEASURE ui-already-gone ${JSON.stringify({
					grantCalls: calls,
					toasts: await toastTexts(page),
					section: await sectionText(page),
					consoleErrors: shield.consoleErrors()
				})}`
			);
			expect(calls).toEqual([
				`GET ${GRANTS} 200`,
				`DELETE ${grantPath(GRANT_WIKI.id)} 204`,
				`DELETE ${grantPath(GRANT_WIKI.id)} 404`,
				`GET ${GRANTS} 200`
			]);
			// The component's own toast plus the dev-mode mutation diagnostic; nothing else spoke about the swallowed 404.
			expect(await toastTexts(page)).toEqual([
				copy.ENDED('wiki.example.com'),
				expect.stringMatching(/^DEV Mutation failed useEmbedSiteGrants\.useMutation\[endMutation\] 404/)
			]);
			expect(grantConsoleErrors(shield), 'the client stayed silent about a 404 it really received').toEqual([
				expect.stringContaining(`DELETE ${grantPath(GRANT_WIKI.id).slice('/api'.length)} 404`)
			]);
		}
	);

	uiTest(
		"a 404 armed instead of a real end is still success, and the mock's own list brings the row back" + MOCK_LIMIT,
		async ({ page, fixture, mock, shield }) => {
			await signInAndVisit(page, fixture, SECURITY_PATH, {
				scenario: { siteGrants: true, fails: { [grantPath(GRANT_WIKI.id)]: 404 } }
			});
			const copy = copyWith(await appNameOf(page));
			await endButton(page, copy.END, 'wiki.example.com').waitFor({ timeout: 25_000 });
			await endButton(page, copy.END, 'wiki.example.com').click();
			await dialogBox(page).getByRole('button', { name: copy.END, exact: true }).click();

			await expect(
				exactText(page, copy.ENDED('wiki.example.com')),
				'an armed 404 was not read as already ended'
			).toBeVisible({ timeout: 15_000 });
			await expect(dialogBox(page), 'the dialog stayed open on an armed 404').toHaveCount(0);
			await expect(exactText(page, copy.END_FAILED), 'an armed 404 was shown as a failed end').toHaveCount(0);
			// `fails` skips the mock's handler, so its list still holds that grant (mock-gauzy-server.mjs:1158-1163): the
			// app behaved exactly as it does for a grant that is really gone, and only the mock's state differs.
			await expect(
				section(page).locator('[title="https://wiki.example.com"]'),
				'the armed 404 dropped the mock row, which no refusal is allowed to do'
			).toHaveCount(1);

			const calls = await grantCalls(mock);
			console.log(
				`[lane-b sites] MEASURE ui-armed-404 ${JSON.stringify({
					grantCalls: calls,
					toasts: await toastTexts(page),
					section: await sectionText(page),
					consoleErrors: shield.consoleErrors()
				})}`
			);
			expect(calls).toEqual([`GET ${GRANTS} 200`, `DELETE ${grantPath(GRANT_WIKI.id)} 404`, `GET ${GRANTS} 200`]);
			expect(
				await toastTexts(page),
				'an armed 404 raised a failure toast rather than the dev diagnostic and the success toast'
			).toEqual([
				copy.ENDED('wiki.example.com'),
				expect.stringMatching(/^DEV Mutation failed useEmbedSiteGrants\.useMutation\[endMutation\] 404/)
			]);
		}
	);

	for (const status of [500, 403, 502]) {
		uiTest(
			`an end refused ${status} keeps the dialog open with its own failure sentence, and the rows as they were`,
			async ({ page, fixture, mock, shield }) => {
				await signInAndVisit(page, fixture, SECURITY_PATH, {
					scenario: { siteGrants: true, fails: { [grantPath(GRANT_NOTES.id)]: status } }
				});
				const copy = copyWith(await appNameOf(page));
				await endButton(page, copy.END, 'notes.example.com').waitFor({ timeout: 25_000 });
				await endButton(page, copy.END, 'notes.example.com').click();
				await dialogBox(page).getByRole('button', { name: copy.END, exact: true }).click();

				await expect(exactText(page, copy.END_FAILED), 'the refusal said nothing in the dialog').toBeVisible({
					timeout: 15_000
				});
				await expect(dialogBox(page), 'the dialog closed on a refused end').toHaveCount(1);
				await expect(
					dialogBox(page).getByRole('heading', { level: 2, name: copy.END_TITLE('notes.example.com') }),
					'the dialog lost its title after the refusal'
				).toHaveCount(1);
				expect(
					await alertTexts(page),
					'the failure is not a role=alert under the dialog (danger.tsx:166)'
				).toEqual([copy.END_FAILED]);
				await expect(
					dialogBox(page).getByRole('button', { name: copy.END, exact: true }),
					'the confirm button was left disabled after a refusal'
				).toBeEnabled();
				expect(await rowHosts(page), 'a refused end changed the list').toEqual([
					GRANT_NOTES.origin,
					GRANT_WIKI.origin
				]);
				expect(
					await toastTexts(page),
					'a refused end raised a success toast, or the global mutation fallback that handlesOwnError suppresses ' +
						'(use-embed-site-grants.ts:67)'
				).toEqual([
					expect.stringMatching(
						new RegExp(`^DEV Mutation failed useEmbedSiteGrants\\.useMutation\\[endMutation\\] ${status}`)
					)
				]);

				const calls = await grantCalls(mock);
				console.log(
					`[lane-b sites] MEASURE ui-end-refused-${status} ${JSON.stringify({
						grantCalls: calls,
						dialog: await dialogBox(page).innerText().then(flat),
						toasts: await toastTexts(page),
						consoleErrors: shield.consoleErrors()
					})}`
				);
				expect(calls).toEqual([
					`GET ${GRANTS} 200`,
					`DELETE ${grantPath(GRANT_NOTES.id)} ${status}`,
					`GET ${GRANTS} 200`
				]);
				expect(
					grantConsoleErrors(shield).some((line) => line.includes(String(status))),
					`the client logged nothing naming the ${status} it was answered — ${JSON.stringify(
						grantConsoleErrors(shield)
					)}`
				).toBe(true);
			}
		);
	}

	uiTest(
		'a list read that failed is retried twice, then says so with a Try again that works',
		async ({ page, fixture, mock, shield }) => {
			await signInAndVisit(page, fixture, SECURITY_PATH, {
				scenario: { siteGrants: true, fails: { [GRANTS]: 500 } }
			});
			const copy = copyWith(await appNameOf(page));

			await expect(exactText(page, copy.LOAD_FAILED), 'a failed list read said nothing').toBeVisible({
				timeout: 30_000
			});
			await expect(exactText(page, copy.TITLE), 'the section lost its own heading').toHaveCount(1);
			await expect(
				section(page).getByRole('button', { name: copy.RETRY, exact: true }),
				'the failure row offers no Try again'
			).toHaveCount(1);
			await expect(exactText(page, copy.EMPTY), 'a failed read was shown as an empty list').toHaveCount(0);
			expect(await rowHosts(page), 'rows appeared beside the failure row').toEqual([]);
			const failingToasts = await toastTexts(page);

			const failing = await grantCalls(mock);
			console.log(
				`[lane-b sites] MEASURE ui-list-failed ${JSON.stringify({ grantCalls: failing, toasts: failingToasts })}`
			);
			// The read itself plus `LIST_RETRIES` 2 attempts, and nothing after them (use-embed-site-grants.ts:15,22-26).
			expect(failing, 'a 500 was not retried exactly twice').toEqual([
				`GET ${GRANTS} 500`,
				`GET ${GRANTS} 500`,
				`GET ${GRANTS} 500`
			]);
			expect(failingToasts).toEqual([expect.stringMatching(/^DEV Query failed \["embeds",\s*"site-grants"/)]);

			await mock.scenario({ fails: {} });
			await section(page).getByRole('button', { name: copy.RETRY, exact: true }).click();
			await expect(
				endButton(page, copy.END, 'notes.example.com'),
				'Try again did not bring the rows back'
			).toBeVisible({ timeout: 20_000 });
			console.log(
				`[lane-b sites] MEASURE ui-list-retry ${JSON.stringify({
					grantCalls: await grantCalls(mock),
					section: await sectionText(page),
					rows: await rowHosts(page),
					consoleErrors: shield.consoleErrors()
				})}`
			);
			expect(
				await grantCalls(mock),
				'the read Try again made is no longer the fourth call, or no longer the first 200'
			).toEqual([`GET ${GRANTS} 500`, `GET ${GRANTS} 500`, `GET ${GRANTS} 500`, `GET ${GRANTS} 200`]);
			expect(
				await rowHosts(page),
				'the rows that came back are not the fixture two in the measured order'
			).toEqual([GRANT_NOTES.origin, GRANT_WIKI.origin]);
		}
	);

	for (const status of [403, 401, 400]) {
		uiTest(
			`a list read refused ${status} is never retried, and still says so with a Try again`,
			async ({ page, fixture, mock, shield }) => {
				await signInAndVisit(page, fixture, SECURITY_PATH, {
					scenario: { siteGrants: true, fails: { [GRANTS]: status } }
				});
				const copy = copyWith(await appNameOf(page));

				await expect(exactText(page, copy.LOAD_FAILED), `a ${status} refusal said nothing`).toBeVisible({
					timeout: 30_000
				});
				await expect(
					section(page).getByRole('button', { name: copy.RETRY, exact: true }),
					'the refusal row offers no Try again'
				).toHaveCount(1);
				expect(await rowHosts(page), 'rows appeared beside a refused read').toEqual([]);
				await expect(exactText(page, copy.EMPTY), 'a refused read was shown as an empty list').toHaveCount(0);

				const failing = await grantCalls(mock);
				console.log(
					`[lane-b sites] MEASURE ui-list-refused-${status} ${JSON.stringify({
						grantCalls: failing,
						section: await sectionText(page),
						toasts: await toastTexts(page),
						consoleErrors: shield.consoleErrors()
					})}`
				);
				// `shouldRetryList` never retries a 4xx (use-embed-site-grants.ts:22-26); a 404 would not be a failure row
				// at all, which the absent-section test above pins.
				expect(failing, `a ${status} refusal was retried`).toEqual([`GET ${GRANTS} ${status}`]);

				const httpClientLines = grantConsoleErrors(shield);
				if (status === 401) {
					// Measured (`-probe-ui-4.log`, `-s2-lane-b-sites-1.log`): a 401 on this read is the one refusal the
					// client logs no `[HttpClient]` line for — `EmbedsService.handleUnauthorized` intercepts it and reaches
					// for a new token pair first, and this lane's fixture token is an unsigned synthetic one, so all the
					// console reports is its own `[JWT] Failed to decode token …`. That line is the lane's, not the
					// feature's, which is why this row pins its absence rather than pretending it names the refusal.
					expect(httpClientLines, 'a 401 on the read is now logged as an HTTP error line as well').toEqual(
						[]
					);
					expect(
						shield.logMatching(/\[JWT\] Failed to decode token/).length,
						'the token refresh a 401 triggered no longer logs its own failure, so this row witness is stale'
					).toBeGreaterThan(0);
				} else {
					expect(
						httpClientLines.some((line) => line.includes(String(status))),
						`the client logged nothing naming the ${status} — ${JSON.stringify(httpClientLines)}`
					).toBe(true);
				}
			}
		);
	}

	uiTest(
		'every sign-in ended leaves the empty note and no buttons',
		async ({ page, fixture, mock, shield, request }) => {
			await signInAndVisit(page, fixture, SECURITY_PATH, { scenario: { siteGrants: true } });
			for (const id of [GRANT_NOTES.id, GRANT_WIKI.id]) {
				const status = await endThroughThisApp(request, fixture, id);
				console.log(`[lane-b sites] MEASURE ui-empty-predelete ${grantPath(id)} ${status}`);
				expect(status, `the pre-clean of ${id} did not end through this app route`).toBe(204);
			}

			await hardVisit(page, SECURITY_PATH);
			const copy = copyWith(await appNameOf(page));
			await expect(exactText(page, copy.EMPTY), 'the empty note is not settings.allowedSites.EMPTY').toBeVisible({
				timeout: 25_000
			});
			await expect(exactText(page, copy.TITLE), 'the section lost its heading over an empty list').toHaveCount(1);
			expect(await rowHosts(page), 'a row survived an empty list').toEqual([]);
			await expect(section(page).locator('button'), 'a button survived an empty list').toHaveCount(0);
			await expect(exactText(page, copy.LOAD_FAILED), 'an empty list was shown as a failure').toHaveCount(0);

			console.log(
				`[lane-b sites] MEASURE ui-empty ${JSON.stringify({
					section: await sectionText(page),
					grantCalls: await grantCalls(mock),
					consoleErrors: shield.consoleErrors(),
					pageErrors: shield.pageErrors()
				})}`
			);
			expect(consoleFindings(shield), 'the empty state logged a console error').toEqual([]);
			expect(shield.pageErrors(), 'the empty state threw in the page').toEqual([]);
		}
	);
});
