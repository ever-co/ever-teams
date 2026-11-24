import type { APIResponse } from '@playwright/test';
import type { StubRequest } from '../../helpers';

import { test, expect, type ApiCall, type CookieComposer } from '../../api-fixtures';
import { mockReset } from '../../helpers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The contract of the 11 `app/api` routes no other spec names, pinned on lane-c (app 3033, mock 4002, mock control
 * 4004). Every status, body, key list and header below is a measurement, taken first against the live lane with
 * `E:\Coding\.tmp\probe-reads\probe.mjs` (phases A–H, readings in `measured-A.txt` … `measured-H.txt` beside it),
 * `probe-roles.mjs` / `probe-roles2.mjs` / `probe-roles3.mjs` (the tenant pairing), `probe-extra.mjs` (verbs,
 * `desktop-server`, arms that must not fire), `probe-body.mjs` / `probe-post.mjs` (the two POSTs) and
 * `probe-final.mjs` / `probe-final2.mjs` / `probe-final3.mjs` / `probe-scopeb.mjs` (`measured-final.txt`,
 * `measured-final2.txt`, `measured-final3.txt`: the body matrices, the cookie removals, the control queries, the
 * scope-B calls, the role switches) — and only then written down. Nothing here was predicted from the source.
 *
 * ## The 11 routes, and which half of the server code answered them
 *
 * - **Three one-line `forwardToGauzy` proxies**, each called with no options at all: `GET /api/chat/states`
 *   (`app/api/chat/states/route.ts:5`), `GET /api/reaction/comments` (`app/api/reaction/comments/route.ts:5`) and
 *   `GET /api/time-goals/progress` (`app/api/time-goals/progress/route.ts:8`). The helper as a family is pinned in
 *   `suites/lane-b/forward-refusals.spec.ts` and its cache habit in `suites/lane-c/cache-directive.spec.ts`; the rows
 *   here pin these three paths, their own queries and their own answers.
 * - **Four reads that build the upstream call themselves** on `serverFetch` (`core/services/server/fetch.ts:52`):
 *   `GET /api/employee-appointment/invited` (`app/api/employee-appointment/invited/route.ts:16-20` →
 *   `core/services/server/requests/employee-appointment.ts:86-102`), `GET /api/favorite/type`
 *   (`app/api/favorite/type/route.ts:21-25` → `requests/favorite.ts:58-71`), `GET /api/roles/team-assignable`
 *   (`app/api/roles/team-assignable/route.ts:10-16` → `requests/roles.ts:35-42`) and `GET /api/roles/options`
 *   (`app/api/roles/options/route.ts:17-21` → `requests/roles.ts:5-24`). Only two of the four `catch`.
 * - **One read that runs two upstream calls** and composes its own answer: `GET /api/organization-team/organizations`
 *   (`app/api/organization-team/organizations/route.ts:25-37` → `requests/organization.ts:25-66`, then
 *   `requests/organization-team.ts:184-215`) through `core/lib/utils/team-menu-organizations.ts:115-139`.
 * - **One public read with its own key check and its own cache header**: `GET /api/changelog`
 *   (`app/api/changelog/route.ts:12-29`) — no session, and the only route here that writes `Cache-Control` (`:26`).
 * - **One route that asks nothing at all**: `GET /api/desktop-server` (`app/api/desktop-server/route.ts:4-6` →
 *   `core/services/server/requests/desktop-source.ts:4-12`).
 * - **One pair that would call an AI provider, and one that reads a role and writes an invitation**:
 *   `GET|POST /api/editor-assist` (`app/api/editor-assist/route.ts:132-173`) and `GET|POST /api/roles/options`
 *   (`app/api/roles/options/route.ts:12-86`).
 *
 * None of them is named by another spec. `grep -rn` over `apps/web/playwright` for these eleven paths answers only
 * `suites/api/routes.generated.ts` (the verb manifest `suites/api/sweep.spec.ts` walks),
 * `suites/api/foreign-origin.generated.ts:385-389` and `:1255-1258` (the two writes' origin guard, listed generically),
 * `suites/api/empty-body-blockers.generated.ts:137-139` (`POST /api/roles/options` with no body, pinned as a blocker),
 * and, for neighbouring paths only, `suites/lane-c/session-guard.spec.ts:36-37`, `suites/lane-c/media-type.spec.ts:41`,
 * `suites/lane-c/method-and-preflight.spec.ts:170-171` and `suites/lane-b/path-segment-sweep.spec.ts:507-508`. No spec
 * pinned these routes' answers, upstream calls, query keys or tenant scoping.
 *
 * ## What every route was measured on
 *
 * A control (signed in, nothing armed, with the query that route's own client sends — `chat.service.ts:79`,
 * `comment-reaction.service.ts:20-26`, `scheduled-meeting.service.ts:49-51`, `favorite.service.ts:109-115`,
 * `role.service.ts:36`, `invite.service.ts:44`), the same call signed out, the four armed upstream refusals
 * 400/401/403/429 **and a cut (`drops`) on every upstream path the route calls** — `/api/changelog`,
 * `/api/chat/states`, `/api/reaction/comments`, `/api/time-goals/progress`, `/api/employee-appointment/invited`,
 * `/api/favorite/type`, `/api/user-organization`, `/api/organization-team`, `/api/roles/team-assignable`,
 * `/api/roles/options`, `/api/invite/emails`, `/api/invite` — the query keys that travel, `Cache-Control` and the media
 * type of every answer, and on every tenant-bearing read the pair `fails["<tenant A>:<path>"]` (fires) /
 * `fails["<tenant B>:<path>"]` (never fires). Each case reads the mock's request log (`playwright/api-fixtures.ts:56`;
 * an entry is `method`, `path`, `query`, `startMs`, `endMs`, `status` and nothing else —
 * `cypress/support/mock-gauzy-server.mjs:1122-1130`, with `status: 0` for a cut), so an upstream **verb, path and query
 * key list** is provable while a POST body is not: where a body is the only carrier, the witness is the mock's own
 * record of what it was given (`mock-gauzy-server.mjs:537-540`, read back through `mock.state()` as
 * `workspaceCreation.invites`) or the sha256 list of the bearer tokens it received (`mock-gauzy-server.mjs:1133-1141`,
 * `state.receivedTokens`). `GET /api/user/me` — the guard's own check (`authenticated-guard-app.ts:76`), memoised per
 * token for 5 s by `sessionChecks` (`:29`) — is excepted from every log claim here, as in
 * `suites/lane-c/gauzy-refusals-relayed.spec.ts:33-38`: whether it lands in a given log depends on what ran seconds
 * earlier in the same worker, never on the route under test (measured both ways in `measured-final2.txt`).
 *
 * ## The findings, stated up front (each pinned on the row it names)
 *
 * 1. **Three of the four `serverFetch` reads answer an upstream refusal, and two of them a cut, with a bare 500: no
 *    body, no media type, no `Cache-Control`.** `GET /api/favorite/type` (`app/api/favorite/type/route.ts:21-25`: no
 *    `try`, no `catch`) and `GET /api/roles/options` (`app/api/roles/options/route.ts:17-21`) answered all four armed
 *    statuses *and* the cut with `500` + empty body + `content-type` absent; `GET /api/employee-appointment/invited`
 *    relays all four refusals with Gauzy's own status and body but rethrows the cut (`:25`,
 *    `if (apiStatus === undefined) throw error;`) and is answered the same bare 500. Witnessed by the mock's own entry
 *    for that path (`GET /api/favorite/type 403`, `GET /api/employee-appointment/invited 0`, in `measured-final2.txt`).
 *    `MEASURED, NOT INTENDED`: `app/api/employee-appointment/invited/route.ts:8` says "Gauzy's refusal goes back with
 *    its status", the `catch` at `:22-27` exists to do exactly that, and its siblings in this same set answer a cut
 *    with a real answer — `app/api/roles/team-assignable/route.ts:18-23` (502 `{message:'Roles request failed'}`, whose
 *    comment at `:18-19` is "pass Gauzy's status on … instead of a 500 with a stack trace") and
 *    `app/api/organization-team/organizations/route.ts:39-41` (502 `{error:'Failed to read the organizations'}`).
 *    `app/api/favorite/type/route.test.ts` has no upstream-failure test at all (`:44-71`); `app/api/roles/options` has
 *    no route test. The client consequence is measurable: `core/services/client/api/favorites/favorite.service.ts:115`
 *    and `core/services/client/api/meetings/scheduled-meeting.service.ts:50` route on the HTTP status, and a 500 is
 *    neither Gauzy's refusal nor an outage this app named.
 * 2. **A refusal of the invitation *list* read at the end of `POST /api/roles/options` is swallowed into a 200 with an
 *    empty list**, while a refusal of either of that POST's other two calls is the bare 500 of finding 1. Measured with
 *    `fails["<tenant A>:/api/invite"]` armed 403, and with that path cut: the app answered 200 `{items:[],total:0}`
 *    although the mock had recorded `POST /api/invite/emails 200` — the invitation was really written — and
 *    `GET /api/invite 403` (`measured-final.txt`). The swallow is `core/services/server/requests/invite.ts:119-128`
 *    (`getAllTeamInvitationsRequest`'s own `catch` at `:123`, "Fallback to empty result" at `:125`), so it is that
 *    helper's
 *    stated intent and is pinned without `MEASURED, NOT INTENDED`. What it costs is the caller's read: the team's
 *    invitation list right after an invite
 *    (`core/services/client/api/organizations/teams/invites/invite.service.ts:44`) cannot tell "no invitations" from
 *    "the list was refused", while the same POST answers 500 for its two other paths.
 * 3. **Which query keys travel is per route, and on six routes a caller's `?organizationId=` / `?tenantId=` wins over
 *    the session's.** The three forwarders append the caller's whole search string (`core/services/server/forward-to-gauzy.ts:112`),
 *    `employee-appointment/invited` re-serialises the caller's `searchParams` (`route.ts:17` →
 *    `requests/employee-appointment.ts:96`) and `favorite/type` re-serialises its own (`route.ts:22` →
 *    `requests/favorite.ts:68`): measured with `?organizationId=<organization B>&tenantId=<tenant B>&laneProbe=7`, every
 *    key travels with its value, and the armed arm that fires is the one keyed on the **caller's** tenant, because the
 *    mock reads the tenant off `?tenantId` before the header (`mock-gauzy-server.mjs:1034-1037`).
 *    `roles/team-assignable`, `roles/options` and `organization-team/organizations` send no caller key at all
 *    (`requests/roles.ts:18`, `:37`; `route.ts:25` → `requests/organization.ts:41-45`), and `changelog` sends only
 *    `platform` and `isFeature` (`route.ts:20-25`, promised by its comment at `:9-10` and pinned by its own unit test
 *    `app/api/changelog/route.test.ts:29-33`). This is the documented division — `authenticated-guard-app.ts:46-53`: the
 *    guard authorises nothing and the Gauzy API decides what a token may read — so these rows are pinned as measured
 *    **and** intended; they are the proof of which side each route sits on.
 * 4. **The tenant that travels is the session's cookie on every read that sends one**, proven by
 *    `<tenant A>:<path>` firing / `<tenant B>:<path>` never firing, and by a scope-B session (whose cookies name the
 *    other tenant, `playwright/helpers.ts:171-186`) making the `<tenant B>:<path>` arm fire instead.
 *    `GET /api/changelog` proves the rule from the other side: its upstream query carries no `tenantId` and no
 *    `tenant-id` header travels (`core/services/server/fetch.ts:91-97`, fed only when a caller of `serverFetch` passes a
 *    tenant — `app/api/changelog/route.ts:20-25` passes none), so **neither** tenant-keyed arm fires there and only the
 *    bare-path arm does. `GET /api/desktop-server` is untouched by any arm because it asks nothing.
 *    One measurement could not be reproduced and is disclosed rather than pinned: in one phase-C run
 *    (`measured-C.txt`) a scope-A `GET /api/roles/options?…` was followed by a scope-B call whose answer named tenant A's
 *    permissions. Four reruns (`probe-roles.mjs`, `probe-roles2.mjs`, `probe-roles3.mjs`, `probe-final.mjs`) all named
 *    tenant B, so the only tenant read out of a body anywhere in this file is the `roles/options` role row, which
 *    `probe-final.mjs` measured on both scopes and signed out.
 * 5. **`GET /api/editor-assist` reports `{"server":false}` on this lane** (`route.ts:132-138` →
 *    `core/lib/chat/server-ai-provider.ts:15-17` → `core/lib/ai/server-providers.ts:166-169`, which admits a provider to
 *    the chain only when its key is in the server env: `GROQ_API_KEY` `:86`, `CLOUDFLARE_AI_ACCOUNT_ID` +
 *    `CLOUDFLARE_AI_API_TOKEN` `:100-101`, `OPENROUTER_API_KEY` `:151`, `OPENAI_API_KEY` `:157` — none of which the lane
 *    sets, `playwright/test-servers.ts:106-171`). That is the only reason this file POSTs to the route at all, and only
 *    on branches that cannot reach a provider. See "Safety" below.
 * 6. **`GET /api/changelog` is public, and its 200 is the only answer in this file that carries `Cache-Control`** —
 *    `public, max-age=300` (`route.ts:26`) — while its own 400 (`:15-17`) and its own 502 (`:27-29`) carry neither that
 *    directive nor `no-store`; all three measured side by side. Signed out it is the same call with the same log, which
 *    is what its comment at `:9-10` claims ("No session is needed, as on the Gauzy side").
 * 7. **`POST /api/roles/options` rebuilds the invitation from the session**, so nothing a caller names in the body or on
 *    the URL decides the target: with a body carrying the *other* tenant's `organizationId`, `tenantId`, `teamIds`,
 *    `roleId` and `callbackUrl`, the three upstream calls were still the session's (`where[tenantId]` /
 *    `where[organizationId]` / `where[teams][id][0]` = tenant A / organization A / team A) and the mock recorded the
 *    session's team (`route.ts:55-73` → `requests/invite.ts:19-32`). A padded `email`/`name` is trimmed before it is
 *    used (`core/lib/helpers/validations.ts:61-62`; the mock recorded `padded@example.test`).
 *
 * ## Safety on `/api/editor-assist`
 *
 * `GET` first, always: it reported `{"server":false}` (finding 5), and only then were POSTs made. Every POST body in
 * this file is either refused by the schema (`route.ts:150-153`) or carries **no** `config` key, so the one branch that
 * could call a provider (`route.ts:117-129`, `createChatProvider` → `generateText`) is never entered: with no server
 * keys (`:157`) and no `config` the handler answers `not_configured` at `:165-166`. No body in this file names a
 * `config`, a `baseURL`, an `apiKey` or a provider. The `config` branches (`invalid_base_url` `:167`, `empty_result`
 * `:168`, the `provider_*` codes of `providerFailure` `:60-72`) and the rate limit (`EDITOR_ASSIST_RATE_LIMIT`
 * `:25-30`, `takeAiCall` `core/lib/ai/rate-limit.ts:48-58`, reached only under `usesServerKeys` `:157-160`) are **not
 * pinned at all**: writing them would need a server key this lane does not have, or a body that points the app at a
 * model. The safety witness is printed with every editor-assist case and asserted in each row — its mock log is empty
 * or a single `GET /api/user/me`, i.e. no provider call and no upstream call.
 *
 * ## Mock limits — branches this lane cannot answer, stated instead of faked
 *
 * - The mock has no handler for `/api/changelog`, `/api/chat/states`, `/api/reaction/comments`,
 *   `/api/employee-appointment/invited`, `/api/favorite/type`, `/api/user-organization` or `/api/roles/team-assignable`,
 *   so those payloads are its catch-all: a GET `{items:[],total:0}` (`mock-gauzy-server.mjs:827`), a write its own body
 *   or `{success:true}` (`:826`). `/api/time-goals/progress` does answer, with a plain `[]` (`:770`), and
 *   `/api/roles/options` answers the fixture role whatever `?name=` arrives with (`:625`, no method or query check) — so
 *   "the EMPLOYEE role" is pinned only as the `?name=EMPLOYEE` this app sent, never as the role the answer names (that
 *   one is the mock's own record, whose `name` follows the `roleName` switch, `:74-79`). What is pinned is this app's
 *   handling — status, cache header, media type, which upstream call with which keys — not Gauzy's payload.
 * - `GET /api/organization-team/organizations`: the mock answers `GET /api/user-organization` with the catch-all page
 *   (`:827`), so this person has **no** memberships here. The composed answer is `{current:null,others:[]}` for every
 *   role, the admin half (`listsTeams`, `route.ts:29` → `core/lib/utils/roles.ts:3-11`) never reads any team
 *   (`core/lib/utils/team-menu-organizations.ts:127`, which needs `others.length > 0`), and `fails["<tenant A>:/api/organization-team"]`
 *   can therefore never fire — measured 200 with only the memberships read in the log. `roleName`, `manager` and
 *   `extraPermissions` are pinned as no-ops here for the same reason, and `extraPermissions` only adds upper-case names
 *   (`:54-62`). No route here calls `refuseUnlessPermitted`: `grep -rn refuseUnlessPermitted` over these eleven route
 *   files answers nothing.
 * - A signed-out caller is answered by the six guarded routes **as if they knew who they were**, because this mock
 *   answers `GET /api/user/me` whatever arrives (`:560`) and `authenticated-guard-app.ts:88-113` delegates the decision
 *   to the API. Their signed-out rows are pinned as what this app then did — including the 502 of
 *   `organization-team/organizations`, which is that delegation plus `requests/organization.ts:37-39` refusing to build
 *   a read with an empty tenant or token — together with the proof that the reads went out with **no bearer**
 *   (`state.receivedTokens` empty, asserted). Their guards' own refusals (`favorite/type/route.ts:14`,
 *   `roles/options/route.ts:15` and `:31`, `organization-team/organizations/route.ts:17-19`, `editor-assist/route.ts:134`
 *   and `:149`) are unreachable rows here, named and not asserted. The three forwarders do refuse a cookie-less caller
 *   themselves (`core/services/server/forward-to-gauzy.ts:96`), with an empty log as proof. Same delegation as
 *   `suites/lane-c/session-check.spec.ts`.
 * - The 60 s upstream timeout (`core/services/server/forward-to-gauzy.ts:8`) is unreachable from a test (the caller's own budget is the same
 *   60 000 ms, `api-fixtures.ts:101`), and `499` (`:135-144`) needs a cancelled caller.
 * - A verb a route file does not export never reaches these handlers: Next answers 405 with no body, no media type and
 *   no `Cache-Control`, and the mock logs nothing (`suites/lane-b/verify-status.spec.ts` pins the family). The lane runs
 *   `next dev`, so "500, no body, no media type" is **this lane's** answer for a handler that threw; the pinned part is
 *   that this app wrote no answer of its own and did not relay the upstream status.
 *
 * ## Cost
 *
 * 72 rows for the 9 Gauzy-reading routes (control + signed out + 4 armed refusals + a cut + the other tenant's arm),
 * 10 query-key rows, 16 tenant rows (4 scope-B armed refusals, 1 caller-`?tenantId=` arm, 2 bare-path arms, 1
 * `favorite/type` tenant-source row, 6 cookie removals, 2 scope-B controls), 12 `changelog` rows (11 product keys +
 * the cache trio), 6 `favorite/type` rows (5 kinds + filters), 6 organizations rows, 5 `desktop-server` rows, 39
 * `POST /api/roles/options` rows (1 control + 3 trio + 1 own origin + 1 cross-site bodiless + 14 bodies + 1 trimming
 * + 1 foreign body + 1 caller query + 1 scope-B + 15 arms and cuts on its three paths), 29 editor-assist rows (3 GET
 * + 3 origin + 1 own origin + 21 bodies + 1 signed out), 5 "no gate here" rows and 15 verb rows: **215 cases**, all
 * green in both runs named in the acceptance note (`E:\Coding\.tmp\s2-lane-c-reads-1.log` and `-2.log`), none skipped,
 * none flaky.
 */

/** The four upstream refusals every route here is pinned on. */
const REFUSAL_STATUSES = [400, 401, 403, 429] as const;

/** The upstream paths, spelled as the mock records them: `GAUZY_API_SERVER_URL` is the app's base plus `/api`. */
const UP_CHANGELOG = '/api/changelog';
const UP_CHAT_STATES = '/api/chat/states';
const UP_REACTION_COMMENTS = '/api/reaction/comments';
const UP_TIME_GOALS_PROGRESS = '/api/time-goals/progress';
const UP_INVITED = '/api/employee-appointment/invited';
const UP_FAVORITE_TYPE = '/api/favorite/type';
const UP_USER_ORGANIZATIONS = '/api/user-organization';
const UP_ORGANIZATION_TEAMS = '/api/organization-team';
const UP_TEAM_ASSIGNABLE = '/api/roles/team-assignable';
const UP_ROLES_OPTIONS = '/api/roles/options';
const UP_INVITE_EMAILS = '/api/invite/emails';
const UP_INVITE_LIST = '/api/invite';
/** The guard's own session check (`authenticated-guard-app.ts:76`, memoised at `:29`), excepted from every log claim. */
const GUARD_CHECK = '/api/user/me';

/** The media type the mock writes on every answer it makes (`mock-gauzy-server.mjs:1149`), which `forwardToGauzy` copies. */
const UPSTREAM_MEDIA_TYPE = 'application/json; charset=utf-8';
/** The media type of an answer this app wrote itself (`NextResponse.json`). */
const OWN_MEDIA_TYPE = 'application/json';

/** The mock's refusal body (`mock-gauzy-server.mjs:1099-1101`). */
const gauzyRefusal = (status: number) => ({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });
/** The mock's answer to a GET it has no handler for (`mock-gauzy-server.mjs:827`). */
const MOCK_PAGE = { items: [], total: 0 };
/** The mock's own answer to `/api/time-goals/progress` (`mock-gauzy-server.mjs:770`): a plain list. */
const MOCK_PROGRESS_LIST: unknown[] = [];
/** The mock's team-invitation page it answers `/api/invite` with (`mock-gauzy-server.mjs:614-624`), for one scope. */
const mockInviteList = (ids: Record<string, string>, scope: 'A' | 'B' = 'A') => ({
	items: [
		{
			id: ids.invite,
			email: 'invited@example.test',
			status: 'INVITED',
			tenantId: ids[`tenant${scope}`],
			organizationId: ids[`organization${scope}`]
		}
	],
	total: 1
});

/** A measured answer. `body`, `text` and `shape` are alternatives; `contentType` / `cacheControl` are measured too. */
type Answer = {
	status: number;
	body?: unknown;
	text?: string;
	/** A shape check instead of a fixed body: the parts of a payload the mock cannot be trusted for are left out. */
	shape?: (body: unknown) => string | null;
	/** The `content-type`, or `null` for "carries none at all". */
	contentType?: string | null;
	cacheControl?: string | null;
};

/** An answer this app wrote itself: JSON on `status`, with this app's own media type. */
function ownJson(status: number, body: unknown, cacheControl?: string | null): Answer {
	return {
		status,
		body,
		contentType: OWN_MEDIA_TYPE,
		...(cacheControl === undefined ? {} : { cacheControl })
	};
}

/** A refusal relayed by `forwardToGauzy`: Gauzy's status, body **and media type**, no `Cache-Control` (`:128-131`). */
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
/** What `forwardToGauzy` answers a caller with no token cookie, before anything is asked (`core/services/server/forward-to-gauzy.ts:96`). */
const REFUSED_BY_THIS_APP: Answer = ownJson(401, { statusCode: 401, message: 'Unauthorized' }, null);
/** What `forwardToGauzy` answers when the upstream gave no answer at all (`:135-144`). */
const UNREACHABLE: Answer = ownJson(502, { statusCode: 502, message: 'The Gauzy API is unreachable' }, null);
/** What this lane answers a handler that threw — the routes of finding 1. */
const HANDLER_CRASH: Answer = { status: 500, text: '', contentType: null, cacheControl: null };
/** `app/api/organization-team/organizations/route.ts:39-41`. */
const ORGANIZATIONS_FAILURE: Answer = ownJson(502, { error: 'Failed to read the organizations' }, null);
/** `app/api/roles/team-assignable/route.ts:23`, on a 502. */
const TEAM_ASSIGNABLE_FALLBACK: Answer = ownJson(502, { message: 'Roles request failed' }, null);
/** `app/api/changelog/route.ts:15-17`. */
const CHANGELOG_KEY_REFUSAL: Answer = ownJson(
	400,
	{ error: 'A product key is required, such as platform=ever-teams.' },
	null
);
/** `app/api/changelog/route.ts:27-29` — the empty listing on a 502, with no caching header at all. */
const CHANGELOG_OUTAGE: Answer = ownJson(502, MOCK_PAGE, null);
/** `app/api/changelog/route.ts:26`, the only caching header in this file. */
const CHANGELOG_CONTROL: Answer = ownJson(200, MOCK_PAGE, 'public, max-age=300');
/** `app/api/favorite/type/route.ts:16-19`. */
const FAVORITE_KIND_REFUSAL: Answer = ownJson(400, { error: 'Only favourite tasks are read here' }, null);
/** `app/api/editor-assist/route.ts:150-153` and `:165-166`. */
const EDITOR_INVALID: Answer = ownJson(400, { error: 'invalid_request' }, null);
const EDITOR_NOT_CONFIGURED: Answer = ownJson(400, { error: 'not_configured' }, null);
/** `app/api/editor-assist/route.ts:132-138` as this lane measures it. */
const EDITOR_AVAILABILITY: Answer = ownJson(200, { server: false }, null);
/** `app/api/desktop-server/route.ts:4-6` with `IS_DESKTOP_APP` unset (`requests/desktop-source.ts:6`, `:11`). */
const DESKTOP_CONFIG: Answer = ownJson(200, {}, null);
/** `core/lib/helpers/validations.ts:82-84` and `:67`, the two messages `validateForm` writes. */
const FIELD_EMPTY = 'Please make sure to fill out this field';
const EMAIL_INVALID = 'Please provide a valid email address';

const NOT_INTENDED = ' [MEASURED, NOT INTENDED]';
const MOCK_LIMIT = ' [mock limit]';

/** The `?startDate=` the meetings client asks with (`scheduled-meeting.service.ts:49-50`). */
const INVITED_QUERY = 'startDate=2026-01-01T00:00:00.000Z';
/** The `GET /favorite/type` query the favourites client sends (`favorite.service.ts:109-114`). */
const favoriteQuery = (ids: Record<string, string>) =>
	`where[entity]=Task&where[employeeId]=${ids.employee}&where[organizationId]=${ids.organizationA}&where[tenantId]=${ids.tenantA}`;
/** The `GET /reaction/comments` query the reactions client sends (`comment-reaction.service.ts:20-26`). */
const reactionQuery = (ids: Record<string, string>) =>
	`entity=Task&entityId=${ids.task}&tenantId=${ids.tenantA}&organizationId=${ids.organizationA}`;
/** A caller-sent query naming the other tenant and organization, plus a key no route here needs. */
const foreignQuery = (ids: Record<string, string>) =>
	`organizationId=${ids.organizationB}&tenantId=${ids.tenantB}&laneProbe=7&where[organizationId]=${ids.organizationB}&where[tenantId]=${ids.tenantB}`;
/** The keys `foreignQuery` carries, as the mock records them. */
const FOREIGN_KEYS = ['laneProbe', 'organizationId', 'tenantId', 'where[organizationId]', 'where[tenantId]'];
/** A body the team-invite dialog posts (`invite.service.ts:21-35`, reduced to what `validateForm` requires). */
const INVITE_BODY = { email: 'lane-c-invitee@example.test', name: 'Lane C Invitee' };
/** A body that names the *other* tenant's organization, team and role, to see whether any of it survives. */
const foreignInviteBody = (ids: Record<string, string>) => ({
	...INVITE_BODY,
	organizationId: ids.organizationB,
	tenantId: ids.tenantB,
	teamIds: [ids.teamB],
	roleId: 'lane-c-role-from-another-tenant',
	callbackUrl: 'https://evil.example/callback',
	invitationExpirationPeriod: '1 Day'
});
/** The editor-assist body the editor posts, never with a `config` (see "Safety"). */
const EDITOR_BODY = { mode: 'improve', context: 'task', text: 'The lane-c paragraph.' };

/** One upstream call a route makes, and what its query must look like. */
type Ask = {
	method: 'GET' | 'POST';
	path: string;
	/** The query keys the mock recorded, sorted — a dropped session key or a renamed path turns this red. */
	keys: string[];
	/** Keys that must NOT be there (a caller key this route drops). */
	absent?: string[];
	/** The values that must arrive under these keys, where the value is the point (the session's tenant). */
	values?: Record<string, string>;
	/** The status the mock recorded for this one call, when it differs from the case's other calls. */
	status?: number;
};

const askChatStates = (): Ask => ({ method: 'GET', path: UP_CHAT_STATES, keys: [] });
const askReaction = (ids: Record<string, string>): Ask => ({
	method: 'GET',
	path: UP_REACTION_COMMENTS,
	keys: ['entity', 'entityId', 'organizationId', 'tenantId'],
	values: { entity: 'Task', entityId: ids.task, tenantId: ids.tenantA, organizationId: ids.organizationA }
});
const askProgress = (): Ask => ({ method: 'GET', path: UP_TIME_GOALS_PROGRESS, keys: [] });
const askInvited = (): Ask => ({
	method: 'GET',
	path: UP_INVITED,
	keys: ['startDate'],
	values: { startDate: '2026-01-01T00:00:00.000Z' }
});
const askFavorite = (ids: Record<string, string>): Ask => ({
	method: 'GET',
	path: UP_FAVORITE_TYPE,
	keys: ['where[employeeId]', 'where[entity]', 'where[organizationId]', 'where[tenantId]'],
	values: {
		'where[entity]': 'Task',
		'where[employeeId]': ids.employee,
		'where[organizationId]': ids.organizationA,
		'where[tenantId]': ids.tenantA
	}
});
const askOrganizations = (ids: Record<string, string>): Ask => ({
	method: 'GET',
	path: UP_USER_ORGANIZATIONS,
	keys: ['relations[0]', 'relations[1]', 'where[tenantId]', 'where[userId]'],
	values: {
		'relations[0]': 'organization',
		'relations[1]': 'organization.contact',
		'where[tenantId]': ids.tenantA,
		'where[userId]': ids.user
	}
});
const askTeamAssignable = (): Ask => ({ method: 'GET', path: UP_TEAM_ASSIGNABLE, keys: [] });
/** `requests/roles.ts:18`: the route names the role it wants and hands on nothing the caller sent. */
const askRolesOptions = (): Ask => ({
	method: 'GET',
	path: UP_ROLES_OPTIONS,
	keys: ['name'],
	values: { name: 'EMPLOYEE' }
});
const askChangelog = (): Ask => ({
	method: 'GET',
	path: UP_CHANGELOG,
	keys: ['isFeature', 'platform'],
	values: { platform: 'ever-teams', isFeature: 'false' }
});

/** The answer `GET /api/roles/options` gives on this lane, of the session's tenant ([mock limit] on its *name*). */
function roleAnswerOfTenant(scope: 'A' | 'B') {
	return (ids: Record<string, string>): Answer => ({
		status: 200,
		contentType: OWN_MEDIA_TYPE,
		cacheControl: null,
		shape: (body) => {
			const role = body as { id?: unknown; tenantId?: unknown; rolePermissions?: unknown };
			if (!role || typeof role !== 'object' || Array.isArray(role))
				return `the answer is no longer a role object (${JSON.stringify(body).slice(0, 120)})`;
			if (role.id !== ids.role)
				return `the role id is ${JSON.stringify(role.id)}, not the fixture role ${ids.role}`;
			if (role.tenantId !== ids[`tenant${scope}`])
				return `the role names ${JSON.stringify(role.tenantId)}, not tenant ${scope}`;
			if (!Array.isArray(role.rolePermissions)) return 'rolePermissions is no longer a list';
			const foreign = role.rolePermissions.filter(
				(permission) => (permission as { tenantId?: unknown }).tenantId !== ids[`tenant${scope}`]
			);
			if (foreign.length)
				return `${foreign.length} of ${role.rolePermissions.length} permissions name another tenant`;
			return null;
		}
	});
}

type ContractRoute = {
	label: string;
	/** The app route, spelled as `api()` is called with it. */
	app: (ids: Record<string, string>) => string;
	/** Which half of the server code answered it, which is what the media type of the answer proves. */
	half: 'forwardToGauzy' | 'serverFetch' | 'composed' | 'changelog';
	/** The upstream path an arm is keyed on. */
	armPath: string;
	/**
	 * `tenant`: armed as `<session tenant>:<path>`, which is how the mock reads the tenant this app sent
	 * (`mock-gauzy-server.mjs:1034-1037`); `bare`: armed as the path alone, because this app sends no tenant at all.
	 */
	armStyle: 'tenant' | 'bare';
	/** The upstream calls the control causes, in the order the mock recorded them. */
	asks: (ids: Record<string, string>) => Ask[];
	control: (ids: Record<string, string>) => Answer;
	/** The same call with no session cookies; `asks` is what survived it. */
	signedOut: (ids: Record<string, string>) => { answer: Answer; asks: Ask[] };
	/** The answer to an armed refusal of the route's own upstream path. */
	refusal: (status: number) => Answer;
	/** The answer to a `drops` cut of that same path. */
	drop: Answer;
	/** Set when the row pins what was measured rather than what the code means to do. */
	notIntended?: string;
};

const ROUTES: ContractRoute[] = [
	{
		label: 'GET /api/chat/states',
		app: () => '/api/chat/states',
		half: 'forwardToGauzy',
		armPath: UP_CHAT_STATES,
		armStyle: 'tenant',
		asks: () => [askChatStates()],
		// [mock limit] no handler here, so this is the mock's catch-all page, not the platform's chat states.
		control: () => ({ status: 200, body: MOCK_PAGE, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null }),
		// `core/services/server/forward-to-gauzy.ts:96` short-circuits on the cookie before the fetch at `core/services/server/forward-to-gauzy.ts:112`; the empty log is the proof.
		signedOut: () => ({ answer: REFUSED_BY_THIS_APP, asks: [] }),
		refusal: (status) => relayedByForward(status),
		drop: UNREACHABLE
	},
	{
		label: 'GET /api/reaction/comments',
		app: (ids) => `/api/reaction/comments?${reactionQuery(ids)}`,
		half: 'forwardToGauzy',
		armPath: UP_REACTION_COMMENTS,
		armStyle: 'tenant',
		asks: (ids) => [askReaction(ids)],
		control: () => ({ status: 200, body: MOCK_PAGE, contentType: UPSTREAM_MEDIA_TYPE, cacheControl: null }),
		signedOut: () => ({ answer: REFUSED_BY_THIS_APP, asks: [] }),
		refusal: (status) => relayedByForward(status),
		drop: UNREACHABLE
	},
	{
		label: 'GET /api/time-goals/progress',
		app: () => '/api/time-goals/progress',
		half: 'forwardToGauzy',
		armPath: UP_TIME_GOALS_PROGRESS,
		armStyle: 'tenant',
		asks: () => [askProgress()],
		// The mock does answer this one (`mock-gauzy-server.mjs:770`), and the proxy hands a plain `[]` on.
		control: () => ({
			status: 200,
			body: MOCK_PROGRESS_LIST,
			contentType: UPSTREAM_MEDIA_TYPE,
			cacheControl: null
		}),
		signedOut: () => ({ answer: REFUSED_BY_THIS_APP, asks: [] }),
		refusal: (status) => relayedByForward(status),
		drop: UNREACHABLE
	},
	{
		label: 'GET /api/employee-appointment/invited',
		app: () => `/api/employee-appointment/invited?${INVITED_QUERY}`,
		half: 'serverFetch',
		armPath: UP_INVITED,
		armStyle: 'tenant',
		asks: () => [askInvited()],
		// [mock limit] no handler, so the catch-all page; Gauzy answers this route with a plain list.
		control: () => ownJson(200, MOCK_PAGE, null),
		// [mock limit] the guard delegated (`mock-gauzy-server.mjs:560`), so the read went out — with no bearer, which the
		// row asserts from `state.receivedTokens`.
		signedOut: () => ({ answer: ownJson(200, MOCK_PAGE, null), asks: [askInvited()] }),
		refusal: (status) => ownJson(status, gauzyRefusal(status), null),
		drop: HANDLER_CRASH,
		notIntended: "a cut upstream call is rethrown (`route.ts:25`) and answered as this app's bare 500"
	},
	{
		label: 'GET /api/favorite/type',
		app: (ids) => `/api/favorite/type?${favoriteQuery(ids)}`,
		half: 'serverFetch',
		armPath: UP_FAVORITE_TYPE,
		armStyle: 'tenant',
		asks: (ids) => [askFavorite(ids)],
		control: () => ownJson(200, MOCK_PAGE, null),
		signedOut: (ids) => ({ answer: ownJson(200, MOCK_PAGE, null), asks: [askFavorite(ids)] }),
		refusal: () => HANDLER_CRASH,
		drop: HANDLER_CRASH,
		notIntended: "an upstream refusal and a cut are both this app's bare 500 (`route.ts:21-25`, no catch)"
	},
	{
		label: 'GET /api/organization-team/organizations',
		app: () => '/api/organization-team/organizations',
		half: 'composed',
		armPath: UP_USER_ORGANIZATIONS,
		armStyle: 'tenant',
		// One read, built entirely from the session (`route.ts:25` → `requests/organization.ts:41-62`). The second
		// (`requests/organization-team.ts:184-215`) is never reached, because this mock answers no memberships.
		asks: (ids) => [askOrganizations(ids)],
		// [mock limit] no memberships here at all, so the menu answers "no current organization, no others".
		control: () => ownJson(200, { current: null, others: [] }, null),
		// [mock limit] the guard delegated; what the read lost is the session itself — `requests/organization.ts:37-39`
		// refuses to build it without a tenant, a user id and a token, and `route.ts:39-41` turns that into this 502.
		signedOut: () => ({ answer: ORGANIZATIONS_FAILURE, asks: [] }),
		// Every armed status, and the cut, answer the same composed failure (`route.ts:39-41`).
		refusal: () => ORGANIZATIONS_FAILURE,
		drop: ORGANIZATIONS_FAILURE
	},
	{
		label: 'GET /api/roles/team-assignable',
		app: () => '/api/roles/team-assignable',
		half: 'serverFetch',
		armPath: UP_TEAM_ASSIGNABLE,
		armStyle: 'tenant',
		asks: () => [askTeamAssignable()],
		control: () => ownJson(200, MOCK_PAGE, null),
		signedOut: () => ({ answer: ownJson(200, MOCK_PAGE, null), asks: [askTeamAssignable()] }),
		refusal: (status) => ownJson(status, gauzyRefusal(status), null),
		drop: TEAM_ASSIGNABLE_FALLBACK
	},
	{
		label: 'GET /api/roles/options',
		app: () => '/api/roles/options',
		half: 'serverFetch',
		armPath: UP_ROLES_OPTIONS,
		armStyle: 'tenant',
		asks: () => [askRolesOptions()],
		// [mock limit] `mock-gauzy-server.mjs:625` answers the fixture role whatever `?name=` arrives with, so the row
		// pins the *asked* name and the tenant the answer names — never that the role is the EMPLOYEE one.
		control: roleAnswerOfTenant('A'),
		// [mock limit] the guard delegated, and the read went out with no bearer at all: the mock then answers its own
		// fixture role, of its own default tenant (`measured-final.mjs` reading `roles/options signed-out`).
		signedOut: (ids) => ({ answer: roleAnswerOfTenant('A')(ids), asks: [askRolesOptions()] }),
		refusal: () => HANDLER_CRASH,
		drop: HANDLER_CRASH,
		notIntended: "an upstream refusal and a cut are both this app's bare 500 (`route.ts:17-21`, no catch)"
	},
	{
		label: 'GET /api/changelog',
		app: () => '/api/changelog?platform=ever-teams&isFeature=false',
		half: 'changelog',
		armPath: UP_CHANGELOG,
		// No tenant travels on this read (`app/api/changelog/route.ts:20-25` passes no tenant to `serverFetch`, so `core/services/server/fetch.ts:91-97` writes
		// no header and the path carries no `tenantId`), hence the bare-path arm.
		armStyle: 'bare',
		asks: () => [askChangelog()],
		control: () => CHANGELOG_CONTROL,
		// Public: the signed-out call is the control call, key for key (`route.ts:9-10`).
		signedOut: () => ({ answer: CHANGELOG_CONTROL, asks: [askChangelog()] }),
		// Any failure — an armed refusal or a cut — is the empty listing on a 502 with no caching header (`:27-29`).
		refusal: () => CHANGELOG_OUTAGE,
		drop: CHANGELOG_OUTAGE
	}
];

const routeByLabel = (label: string): ContractRoute => {
	const route = ROUTES.find((candidate) => candidate.label === label);
	if (!route) throw new Error(`no contract route is labelled ${label}`);
	return route;
};

/** One recorded call as the line a failure message quotes: `GET /api/x 200 keys=[a,b]`. */
function lineOf(request: { method: string; path: string; status: number; query: string }): string {
	return `${request.method} ${request.path} ${request.status} keys=[${keysOf(request).join(',')}]`;
}

const keysOf = (request: { query: string }): string[] =>
	[...new Set([...new URLSearchParams(request.query).keys()])].sort();

const valuesOf = (request: { query: string }, wanted: Record<string, string>) => {
	const params = new URLSearchParams(request.query);
	return Object.fromEntries(
		Object.keys(wanted)
			.sort((a, b) => a.localeCompare(b))
			.map((key) => [key, params.get(key) ?? null])
	);
};

const wantedValues = (wanted: Record<string, string>) =>
	Object.fromEntries(Object.entries(wanted).sort(([a], [b]) => a.localeCompare(b)));

const pathsOf = (asks: Ask[]): string[] => asks.map((ask) => ask.path);

const expectedLine = (ask: Ask, status: number): string =>
	`${ask.method} ${ask.path} ${status} keys=[${[...ask.keys].sort().join(',')}]`;

/** The answer half of a witness line: status, media type, cache directive and the body itself. */
const describeAnswer = (path: string, response: APIResponse, body: string): string =>
	`${path} -> ${response.status()} · content-type ${JSON.stringify(
		response.headers()['content-type'] ?? null
	)} · cache-control ${JSON.stringify(response.headers()['cache-control'] ?? null)} · body(${body.length}) ` +
	`${JSON.stringify(body.slice(0, 200))}`;

/** The witness every case prints before it asserts, and the one every failure message quotes. */
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

/** One `api()` call, with the overrides the extra cases need. */
type CallOverride = {
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
	/** An object goes as JSON, a string goes as it arrived under the media type named below. */
	body?: unknown;
	/** Send no body at all, even when the row carries one. */
	noBody?: boolean;
	/** A `Content-Type` of its own, for a case that sends something other than JSON; `''` declares none. */
	contentType?: string;
	headers?: Record<string, string>;
	anonymous?: boolean;
	scope?: 'A' | 'B';
	/** Build the session from the fixture's cookies minus exactly this one name. */
	cookieWithout?: string;
};

async function callApi(
	api: ApiCall,
	cookies: CookieComposer,
	path: string,
	options: CallOverride = {}
): Promise<{ response: APIResponse; text: string; path: string }> {
	const headers: Record<string, string> = { ...(options.headers ?? {}) };
	if (options.contentType !== undefined) headers['content-type'] = options.contentType;
	if (options.cookieWithout) headers.cookie = cookies(options.scope ?? 'A', [options.cookieWithout]);

	const response = await api(path, {
		method: options.method ?? 'GET',
		...(options.noBody || options.body === undefined ? {} : { body: options.body }),
		...(options.anonymous ? { anonymous: true } : {}),
		...(options.scope ? { scope: options.scope } : {}),
		...(Object.keys(headers).length ? { headers } : {})
	});
	return { response, text: await response.text(), path };
}

/** The assertions every case shares: the upstream asks, their scoping values, and the answer this route gave. */
function expectAnswer(
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
				`${JSON.stringify((parsed as { unparsed?: string } | null)?.unparsed ?? parsed).slice(0, 220)}) — ${witness}`
		).toEqual(answer.body);
	}
	if (answer.text !== undefined) {
		expect(
			text,
			`${why}: the answer is no longer ${JSON.stringify(answer.text)} (${JSON.stringify(text.slice(0, 180))}) — ${witness}`
		).toBe(answer.text);
	}
	if (answer.shape) {
		const mismatch = answer.shape(parsed);
		expect(
			mismatch,
			`${why}: the answer body no longer has the shape this route answers (${mismatch ?? ''}) — ${witness}`
		).toBeNull();
	}
	if (answer.contentType !== undefined) {
		expect(
			response.headers()['content-type'] ?? null,
			`${why}: the media type moved off ${JSON.stringify(answer.contentType)} — ${witness}. It is what says which half ` +
				'answered: an answer this app wrote carries application/json, a copied upstream answer carries the mock media type'
		).toBe(answer.contentType);
	}
	if (answer.cacheControl !== undefined) {
		expect(
			response.headers()['cache-control'] ?? null,
			`${why}: Cache-Control moved off ${JSON.stringify(answer.cacheControl)} — ${witness}`
		).toBe(answer.cacheControl);
	}

	const expected = new Map<string, string[]>();
	for (const ask of asked)
		expected.set(ask.path, [...(expected.get(ask.path) ?? []), expectedLine(ask, ask.status ?? askedStatus)]);
	const recorded = new Map<string, string[]>();
	for (const askPath of expected.keys())
		recorded.set(askPath, log.filter((request) => request.path === askPath).map(lineOf));
	expect(
		[...expected.keys()].map((askPath) => `${askPath} :: ${recorded.get(askPath)?.join(' + ') ?? 'nothing'}`),
		`${why}: the upstream calls are no longer the ones this route makes — ${witness}`
	).toEqual([...expected.keys()].map((askPath) => `${askPath} :: ${(expected.get(askPath) ?? []).join(' + ')}`));

	// Nothing else was asked. `GET /api/user/me` is excepted: the session checks are shared per token for
	// `SESSION_CHECK_MEMO_TTL_MS` (`authenticated-guard-app.ts:29`, `:79-85`), so whether it lands in this log depends on
	// what ran seconds earlier in the same worker, never on the route under test.
	const stray = log.filter((request) => request.path !== GUARD_CHECK && !expected.has(request.path));
	expect(
		triples(stray),
		`${why}: the case asked something besides the calls this route is pinned on — ${witness}`
	).toEqual([]);

	for (const ask of asked) {
		const entry = log.find((request) => request.path === ask.path);
		if (!entry) continue;
		if (ask.absent?.length) {
			const present = keysOf(entry).filter((key) => ask.absent?.includes(key));
			expect(
				present,
				`${why}: ${ask.path} was asked with ${JSON.stringify(present)}, which this route is measured not to send — ${witness}`
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

/** The arm that refuses this route's own upstream read, spelled as the mock reads it. */
const armFor = (route: ContractRoute, ids: Record<string, string>, scope: 'A' | 'B' = 'A') =>
	route.armStyle === 'tenant' ? `${ids[`tenant${scope}`]}:${route.armPath}` : route.armPath;

/**
 * The arms that must NOT fire for a scope-A session: another tenant's key for a route that sends a tenant, and both
 * tenant keys for the route that sends none (`armStyle: 'bare'`).
 */
const otherTenantArms = (route: ContractRoute, ids: Record<string, string>) =>
	route.armStyle === 'tenant'
		? { [`${ids.tenantB}:${route.armPath}`]: 403 }
		: { [`${ids.tenantA}:${route.armPath}`]: 403, [`${ids.tenantB}:${route.armPath}`]: 403 };

/** The bearer tokens the mock saw, as the paths that carried one (`helpers.ts` `ReceivedToken`, mock `:1133-1141`). */
async function bearerPaths(mock: { state: () => Promise<Record<string, unknown>> }): Promise<string[]> {
	const state = await mock.state();
	return ((state.receivedTokens ?? []) as { path: string }[]).map((token) => token.path);
}

/** What the mock recorded of the invitation it was asked to create (`mock-gauzy-server.mjs:537-540`). */
async function recordedInvites(mock: {
	state: () => Promise<Record<string, unknown>>;
}): Promise<{ emails?: string[]; teamIds?: string[] } | undefined> {
	const state = await mock.state();
	return (state.workspaceCreation as { invites?: { emails?: string[]; teamIds?: string[] } } | undefined)?.invites;
}

/* ---------------------------------------------------------------------- 1 */

test.describe('lane-c · the 9 routes that read the Gauzy API, each pinned on its own upstream call', () => {
	for (const route of ROUTES) {
		test(`${route.label}: control — one call, on this path, with these keys`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const asked = route.asks(ids);
			const { response, text, path } = await callApi(api, cookies, route.app(ids));
			const log = await mock.requests();

			console.log(`[lane-c reads] MEASURE control ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectAnswer(asked, 200, response, text, path, log, route.control(ids), `${route.label} control`);
			expect(
				await mock.failures(),
				`${route.label}: the control caused a refused upstream call (${logOf(log)}) — a control is an answer, not a refusal`
			).toEqual([]);
		});

		test(`${route.label}: signed out — ${
			route.half === 'forwardToGauzy'
				? 'this app refuses, and the mock was asked nothing'
				: 'the guard delegates, so the read went out with no bearer [mock limit]'
		}`, async ({ api, mock, ids, cookies }) => {
			const { answer, asks } = route.signedOut(ids);
			const { response, text, path } = await callApi(api, cookies, route.app(ids), { anonymous: true });
			const log = await mock.requests();

			console.log(`[lane-c reads] MEASURE signed-out ${witnessOf(path, response, text, log, pathsOf(asks))}`);

			expectAnswer(asks, 200, response, text, path, log, answer, `${route.label} signed out`);

			if (route.half === 'forwardToGauzy') {
				// An empty log is the proof that this app, and not the platform, refused (`core/services/server/forward-to-gauzy.ts:96`).
				expect(
					triples(log),
					`${route.label}: a caller with no session cookie reached the test backend at all (${logOf(log)}) — the refusal ` +
						'comes from this app, before the fetch'
				).toEqual([]);
			} else {
				// [mock limit] the delegation, proven the other way: the read went out, and it went out with no bearer.
				expect(
					await bearerPaths(mock),
					`${route.label}: a signed-out read carried a bearer token (${logOf(log)}) — the mock answered the guard check ` +
						'with none, and this app then sent the read with none'
				).toEqual([]);
			}
		});

		for (const status of REFUSAL_STATUSES) {
			test(`${route.label}: an armed upstream ${status} on ${route.armPath} is ${
				route.half === 'forwardToGauzy'
					? 'relayed as it arrived'
					: route.half === 'changelog'
						? 'turned into the empty listing on a 502'
						: route.half === 'composed'
							? "turned into this app's composed failure"
							: "relayed, or turned into this app's bare 500"
			}${route.notIntended ? NOT_INTENDED : ''}`, async ({ api, mock, ids, cookies }) => {
				const arm = armFor(route, ids);
				await mock.scenario({ fails: { [arm]: status } });

				const { response, text, path } = await callApi(api, cookies, route.app(ids));
				const log = await mock.requests();
				const asked = route.asks(ids).map((ask) => ({ ...ask, status }));

				console.log(
					`[lane-c reads] MEASURE armed-${status} ${witnessOf(path, response, text, log, pathsOf(asked))}`
				);

				expectAnswer(
					asked,
					status,
					response,
					text,
					path,
					log,
					route.refusal(status),
					`${route.label} with ${arm} armed ${status}`
				);
				expect(
					triples(await mock.failures()),
					`${route.label}: the armed ${status} is missing from the failures view (${logOf(log)})`
				).toEqual([`${asked[0].method} ${route.armPath} ${status}`]);
			});
		}

		test(`${route.label}: a cut of ${route.armPath} is answered${route.notIntended ? NOT_INTENDED : ''}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const arm = armFor(route, ids);
			await mock.scenario({ drops: { [arm]: 1 } });

			const { response, text, path } = await callApi(api, cookies, route.app(ids));
			const log = await mock.requests();
			const asked = route.asks(ids).map((ask) => ({ ...ask, status: 0 }));

			console.log(`[lane-c reads] MEASURE cut ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectAnswer(asked, 0, response, text, path, log, route.drop, `${route.label} with ${arm} cut`);
			expect(
				await mock.failures(),
				`${route.label}: a cut call was counted as a refusal (${logOf(log)}), which would make every "refused upstream" ` +
					'witness in this lane mean two things'
			).toEqual([]);
		});

		test(`${route.label}: ${
			route.armStyle === 'tenant'
				? "the other tenant's arm never fires, so the tenant that travelled was the session's"
				: 'no tenant travels, so no tenant-keyed arm can fire and only the path alone can'
		}`, async ({ api, mock, ids, cookies }) => {
			const arms = otherTenantArms(route, ids);
			await mock.scenario({ fails: arms });

			const { response, text, path } = await callApi(api, cookies, route.app(ids));
			const log = await mock.requests();
			const asked = route.asks(ids);

			console.log(
				`[lane-c reads] MEASURE other-tenant-arm ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			expectAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				route.control(ids),
				`${route.label} with ${Object.keys(arms).join(' and ')} armed 403`
			);
		});
	}
});

/* ---------------------------------------------------------------------- 2 */

/** One measured query row: what the caller sent, and what the upstream was asked with. */
const QUERY_ROWS: Array<{
	label: string;
	path: (ids: Record<string, string>) => string;
	/** The upstream path, and the keys that survived this route. */
	up: string;
	keys: string[];
	/** Keys the caller sent that this route drops. */
	dropped: string[];
	values?: (ids: Record<string, string>) => Record<string, string>;
}> = [
	{
		label: 'GET /api/chat/states hands on the whole query',
		path: (ids) => `/api/chat/states?${foreignQuery(ids)}`,
		up: UP_CHAT_STATES,
		keys: FOREIGN_KEYS,
		dropped: []
	},
	{
		label: 'GET /api/reaction/comments hands on the whole query',
		path: (ids) => `/api/reaction/comments?${foreignQuery(ids)}`,
		up: UP_REACTION_COMMENTS,
		keys: FOREIGN_KEYS,
		dropped: []
	},
	{
		label: 'GET /api/time-goals/progress hands on the whole query',
		path: (ids) => `/api/time-goals/progress?${foreignQuery(ids)}`,
		up: UP_TIME_GOALS_PROGRESS,
		keys: FOREIGN_KEYS,
		dropped: []
	},
	{
		label: 'GET /api/employee-appointment/invited hands on the whole query, its own startDate first',
		path: (ids) => `/api/employee-appointment/invited?${INVITED_QUERY}&${foreignQuery(ids)}`,
		up: UP_INVITED,
		keys: [...FOREIGN_KEYS, 'startDate'].sort(),
		dropped: []
	},
	{
		label: 'GET /api/favorite/type hands on the whole query, its own filter first',
		path: (ids) => `/api/favorite/type?where[entity]=Task&${foreignQuery(ids)}`,
		up: UP_FAVORITE_TYPE,
		keys: [...FOREIGN_KEYS, 'where[entity]'].sort(),
		dropped: []
	},
	{
		label: 'GET /api/roles/team-assignable drops every caller key: the request builder names its own path',
		path: (ids) => `/api/roles/team-assignable?${foreignQuery(ids)}`,
		up: UP_TEAM_ASSIGNABLE,
		keys: [],
		dropped: FOREIGN_KEYS
	},
	{
		label: 'GET /api/roles/options sends only the role name it named',
		path: (ids) => `/api/roles/options?${foreignQuery(ids)}`,
		up: UP_ROLES_OPTIONS,
		keys: ['name'],
		dropped: FOREIGN_KEYS,
		values: () => ({ name: 'EMPLOYEE' })
	},
	{
		label: 'GET /api/changelog sends only platform and isFeature, which its own unit test promises (app/api/changelog/route.test.ts:29-33)',
		path: (ids) => `/api/changelog?platform=ever-teams&${foreignQuery(ids)}`,
		up: UP_CHANGELOG,
		keys: ['isFeature', 'platform'],
		dropped: FOREIGN_KEYS,
		values: () => ({ platform: 'ever-teams', isFeature: 'false' })
	},
	{
		label: 'GET /api/organization-team/organizations takes nothing from the caller: the session built the read (route.ts:25)',
		path: (ids) => `/api/organization-team/organizations?${foreignQuery(ids)}`,
		up: UP_USER_ORGANIZATIONS,
		keys: ['relations[0]', 'relations[1]', 'where[tenantId]', 'where[userId]'],
		dropped: FOREIGN_KEYS,
		values: (ids) => ({
			'relations[0]': 'organization',
			'relations[1]': 'organization.contact',
			'where[tenantId]': ids.tenantA,
			'where[userId]': ids.user
		})
	},
	{
		label: 'a caller-sent ?tenantId= travels as sent, so it decides which tenant the mock arms',
		path: (ids) => `/api/employee-appointment/invited?${INVITED_QUERY}&tenantId=${ids.tenantB}`,
		up: UP_INVITED,
		keys: ['startDate', 'tenantId'],
		dropped: [],
		values: (ids) => ({ startDate: '2026-01-01T00:00:00.000Z', tenantId: ids.tenantB })
	}
];

test.describe('lane-c · which query keys travel upstream, and which key each route drops', () => {
	for (const row of QUERY_ROWS) {
		test(`${row.label} — checked on ${row.up}`, async ({ api, mock, ids, cookies }) => {
			const path = row.path(ids);
			const { response, text } = await callApi(api, cookies, path);
			const log = await mock.requests();
			const entry = log.find((request) => request.path === row.up);

			console.log(`[lane-c reads] MEASURE query ${witnessOf(path, response, text, log, [row.up])}`);

			expect(
				entry ? keysOf(entry) : null,
				`${row.label}: the mock was never asked for ${row.up} (${logOf(log)})`
			).not.toBeNull();
			const asked = entry as StubRequest;
			expect(
				keysOf(asked),
				`${row.label}: ${row.up} was asked with the keys ${JSON.stringify(keysOf(asked))} — ${witnessOf(
					path,
					response,
					text,
					log,
					[row.up]
				)}`
			).toEqual(row.keys);
			// A caller key this route is measured not to send, except where the route legitimately asks the same key from
			// the session — there the value check below is the real claim (the session's value arrived, not the caller's).
			const droppedKeys = row.dropped.filter((key) => !row.keys.includes(key));
			const droppedPresent = keysOf(asked).filter((key) => droppedKeys.includes(key));
			expect(
				droppedPresent,
				`${row.label}: ${row.up} carried ${JSON.stringify(droppedPresent)}, which this route is measured not to send — ` +
					`${witnessOf(path, response, text, log, [row.up])}`
			).toEqual([]);
			if (row.values) {
				expect(
					valuesOf(asked, row.values(ids)),
					`${row.label}: the values that reached ${row.up} moved — ${witnessOf(path, response, text, log, [row.up])}`
				).toEqual(wantedValues(row.values(ids)));
			}
		});
	}
});

/* ---------------------------------------------------------------------- 3 */

/**
 * A read whose session cookies name the other tenant, and the arm that must fire for it. Where the route's own query
 * carries a `tenantId`, the mock reads the tenant off the query before the header (`mock-gauzy-server.mjs:1034-1037`),
 * so the row spells the query it sends and the arm that fires against it.
 */
const SCOPE_B_ARMS: Array<{
	label: string;
	armPath: string;
	path: (ids: Record<string, string>) => string;
	asks: (ids: Record<string, string>) => Ask[];
}> = [
	{
		label: 'GET /api/chat/states',
		armPath: UP_CHAT_STATES,
		path: () => '/api/chat/states',
		asks: () => [askChatStates()]
	},
	{
		label: 'GET /api/employee-appointment/invited',
		armPath: UP_INVITED,
		path: () => `/api/employee-appointment/invited?${INVITED_QUERY}`,
		asks: () => [askInvited()]
	},
	{
		label: 'GET /api/roles/team-assignable',
		armPath: UP_TEAM_ASSIGNABLE,
		path: () => '/api/roles/team-assignable',
		asks: () => [askTeamAssignable()]
	},
	{
		label: 'GET /api/organization-team/organizations',
		armPath: UP_USER_ORGANIZATIONS,
		path: () => '/api/organization-team/organizations',
		asks: (ids) => [organizationsAskScoped(ids, 'B')]
	}
];

/** The memberships read as one scope's session makes it: the route builds it from the cookies, so the tenant is theirs. */
function organizationsAskScoped(ids: Record<string, string>, scope: 'A' | 'B'): Ask {
	return {
		method: 'GET',
		path: UP_USER_ORGANIZATIONS,
		keys: ['relations[0]', 'relations[1]', 'where[tenantId]', 'where[userId]'],
		values: {
			'relations[0]': 'organization',
			'relations[1]': 'organization.contact',
			'where[tenantId]': ids[`tenant${scope}`],
			'where[userId]': ids.user
		}
	};
}

test.describe("lane-c · the tenant that travels is the session's cookie, on every read that sends one", () => {
	for (const item of SCOPE_B_ARMS) {
		test(`${item.label}: as a scope-B session the other tenant's arm fires instead`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const route = routeByLabel(item.label);
			const arm = `${ids.tenantB}:${item.armPath}`;
			await mock.scenario({ fails: { [arm]: 403 } });

			const { response, text, path } = await callApi(api, cookies, item.path(ids), { scope: 'B' });
			const log = await mock.requests();
			const asked = item.asks(ids).map((ask) => ({ ...ask, status: 403 }));

			console.log(`[lane-c reads] MEASURE scope-B-armed ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectAnswer(
				asked,
				403,
				response,
				text,
				path,
				log,
				route.refusal(403),
				`${item.label} as scope B with ${arm} armed 403`
			);
		});
	}

	test("GET /api/organization-team/organizations: a caller's ?tenantId= cannot move the read to the other tenant, and that tenant's arm does not fire", async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const route = routeByLabel('GET /api/organization-team/organizations');
		const arm = `${ids.tenantB}:${UP_USER_ORGANIZATIONS}`;
		await mock.scenario({ fails: { [arm]: 403 } });

		const path = `/api/organization-team/organizations?tenantId=${ids.tenantB}&organizationId=${ids.organizationB}`;
		const { response, text } = await callApi(api, cookies, path);
		const log = await mock.requests();
		// The route ignores the caller entirely (`route.ts:25` → `requests/organization.ts:41-45`), so the read is built
		// with the session's tenant even though the mock would resolve the caller's (`mock-gauzy-server.mjs:1034-1037`).
		const asked = [organizationsAskScoped(ids, 'A')];

		console.log(
			`[lane-c reads] MEASURE caller-tenant-ignored ${witnessOf(path, response, text, log, pathsOf(asked))}`
		);

		expectAnswer(asked, 200, response, text, path, log, route.control(ids), `${path} with ${arm} armed 403`);
	});

	for (const label of ['GET /api/employee-appointment/invited', 'GET /api/organization-team/organizations']) {
		test(`${label}: an arm keyed on the path alone fires too, so an armed refusal does not need a tenant named`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const route = routeByLabel(label);
			await mock.scenario({ fails: { [route.armPath]: 403 } });

			const { response, text, path } = await callApi(api, cookies, route.app(ids));
			const log = await mock.requests();
			const asked = route.asks(ids).map((ask) => ({ ...ask, status: 403 }));

			console.log(
				`[lane-c reads] MEASURE bare-arm-${label} ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			expectAnswer(
				asked,
				403,
				response,
				text,
				path,
				log,
				route.refusal(403),
				`${label} with the bare ${route.armPath} armed 403`
			);
		});
	}

	test('GET /api/favorite/type: the tenant the mock arms on is the one its own query names, not the cookie it was sent with', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const label = 'GET /api/favorite/type';
		const route = routeByLabel(label);
		// A scope-B session (cookies name tenant B) asking a query that names tenant A: the mock resolves the tenant off
		// `?tenantId` then `where[tenantId]` before the header (`mock-gauzy-server.mjs:1034-1037`), so the arm keyed on
		// the *cookie's* tenant does not fire and the one keyed on the query's tenant does.
		const path = `/api/favorite/type?where[entity]=Task&where[employeeId]=${ids.employee}&where[organizationId]=${ids.organizationB}&where[tenantId]=${ids.tenantA}`;
		const asked = [
			{
				method: 'GET' as const,
				path: UP_FAVORITE_TYPE,
				keys: ['where[employeeId]', 'where[entity]', 'where[organizationId]', 'where[tenantId]'],
				values: {
					'where[entity]': 'Task',
					'where[employeeId]': ids.employee,
					'where[organizationId]': ids.organizationB,
					'where[tenantId]': ids.tenantA
				}
			}
		];

		await mock.scenario({ fails: { [`${ids.tenantB}:${UP_FAVORITE_TYPE}`]: 403 } });
		const cookieArm = await callApi(api, cookies, path, { scope: 'B' });
		const cookieLog = await mock.requests();
		expectAnswer(
			asked,
			200,
			cookieArm.response,
			cookieArm.text,
			cookieArm.path,
			cookieLog,
			route.control(ids),
			`${label} with ${ids.tenantB}:${UP_FAVORITE_TYPE} armed 403`
		);

		await mockReset();
		await mock.scenario({ fails: { [`${ids.tenantA}:${UP_FAVORITE_TYPE}`]: 403 } });
		const queryArm = await callApi(api, cookies, path, { scope: 'B' });
		const queryLog = await mock.requests();

		console.log(
			`[lane-c reads] MEASURE favorite-tenant-source cookie-arm ${witnessOf(cookieArm.path, cookieArm.response, cookieArm.text, cookieLog, pathsOf(asked))} · ` +
				`query-arm ${witnessOf(queryArm.path, queryArm.response, queryArm.text, queryLog, pathsOf(asked))}`
		);

		expectAnswer(
			asked.map((ask) => ({ ...ask, status: 403 })),
			403,
			queryArm.response,
			queryArm.text,
			queryArm.path,
			queryLog,
			HANDLER_CRASH,
			`${label} with ${ids.tenantA}:${UP_FAVORITE_TYPE} armed 403`
		);
	});

	const COOKIE_ROWS: Array<{
		cookie: string;
		label: string;
		/** A measured answer that is not this route's control answer. */
		forced?: Answer;
		why: string;
	}> = [
		{
			cookie: 'auth-tenant-id',
			label: 'GET /api/organization-team/organizations',
			forced: ORGANIZATIONS_FAILURE,
			why: 'the read that needs a tenant cannot be built, and this app says so with its own 502 [mock limit]'
		},
		{
			cookie: 'auth-tenant-id',
			label: 'GET /api/employee-appointment/invited',
			why: 'the read still goes out, and the tenant header is simply absent'
		},
		{
			cookie: 'auth-tenant-id',
			label: 'GET /api/roles/team-assignable',
			why: 'the read still goes out, and the tenant header is simply absent'
		},
		{ cookie: 'auth-tenant-id', label: 'GET /api/changelog', why: 'the public read is untouched' },
		{
			cookie: 'auth-organization-id',
			label: 'GET /api/organization-team/organizations',
			why: 'the memberships read is built from the tenant and the user, not from this cookie'
		},
		{ cookie: 'auth-organization-id', label: 'GET /api/roles/team-assignable', why: 'nothing changes' }
	];

	for (const row of COOKIE_ROWS) {
		test(`${row.label}: a session missing exactly the ${row.cookie} cookie — ${row.why}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const route = routeByLabel(row.label);
			const { response, text, path } = await callApi(api, cookies, route.app(ids), { cookieWithout: row.cookie });
			const log = await mock.requests();
			const asked = row.forced ? [] : route.asks(ids);

			console.log(
				`[lane-c reads] MEASURE cookie-without-${row.cookie} ${row.label} ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			expectAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				row.forced ?? route.control(ids),
				`${row.label} with the ${row.cookie} cookie removed`
			);
		});
	}

	test('a scope-B session is a different tenant to the API: the memberships read is built with the other tenant', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const route = routeByLabel('GET /api/organization-team/organizations');
		const { response, text, path } = await callApi(api, cookies, route.app(ids), { scope: 'B' });
		const log = await mock.requests();
		const asked = [
			{
				...askOrganizations(ids),
				values: {
					'relations[0]': 'organization',
					'relations[1]': 'organization.contact',
					'where[tenantId]': ids.tenantB,
					'where[userId]': ids.user
				}
			}
		];

		console.log(
			`[lane-c reads] MEASURE scope-B-organizations ${witnessOf(path, response, text, log, pathsOf(asked))}`
		);

		expectAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			route.control(ids),
			'GET /api/organization-team/organizations as scope B'
		);
	});

	test('a scope-B session gets the role of the tenant its cookies name', async ({ api, mock, ids, cookies }) => {
		const route = routeByLabel('GET /api/roles/options');
		const { response, text, path } = await callApi(api, cookies, route.app(ids), { scope: 'B' });
		const log = await mock.requests();
		const asked = route.asks(ids);

		console.log(`[lane-c reads] MEASURE scope-B-role ${witnessOf(path, response, text, log, pathsOf(asked))}`);

		expectAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			roleAnswerOfTenant('B')(ids),
			'GET /api/roles/options as scope B'
		);
	});
});

/* ---------------------------------------------------------------------- 4 */

/** `feature` is what the upstream was asked with, for the rows that got an answer. */
const CHANGELOG_KEY_CASES: Array<{
	label: string;
	query: string;
	status: 200 | 400;
	upstream?: string;
	feature?: 'true' | 'false';
}> = [
	{ label: 'no query at all', query: '', status: 400 },
	{ label: 'an empty product key', query: '?platform=', status: 400 },
	{ label: 'a key with a space in it', query: '?platform=ever teams', status: 400 },
	{ label: 'a key that looks like a path', query: '?platform=../tenant', status: 400 },
	{
		label: 'a 51-character key, one past the cap of 50 (route.ts:15)',
		query: `?platform=${'x'.repeat(51)}`,
		status: 400
	},
	{
		label: 'an upper-case key, where the pattern is lower-case (route.ts:5)',
		query: '?platform=Ever-Teams',
		status: 400
	},
	{ label: 'isFeature with no product key', query: '?isFeature=true', status: 400 },
	{
		label: 'a valid key with no isFeature: the route writes isFeature=false itself (route.ts:18)',
		query: '?platform=ever-teams',
		status: 200,
		upstream: 'platform=ever-teams&isFeature=false',
		feature: 'false'
	},
	{
		label: 'a repeated key: only the first value leaves (`searchParams.get`, route.ts:14)',
		query: '?platform=ever-teams&platform=other',
		status: 200,
		upstream: 'platform=ever-teams&isFeature=false',
		feature: 'false'
	},
	{
		label: 'isFeature=1 is not the string "true", so it is written as false (route.ts:18)',
		query: '?platform=ever-teams&isFeature=1',
		status: 200,
		upstream: 'platform=ever-teams&isFeature=false',
		feature: 'false'
	},
	{
		label: 'isFeature=true is the only value that travels as true',
		query: '?platform=ever-teams&isFeature=true',
		status: 200,
		upstream: 'platform=ever-teams&isFeature=true',
		feature: 'true'
	}
];

test.describe('lane-c · GET /api/changelog: the product key is the only gate, and it is checked before anything is asked', () => {
	for (const item of CHANGELOG_KEY_CASES) {
		test(`GET /api/changelog${item.query}: ${item.label}`, async ({ api, mock, cookies }) => {
			const path = `/api/changelog${item.query}`;
			const { response, text } = await callApi(api, cookies, path);
			const log = await mock.requests();
			const asked =
				item.status === 200
					? [{ ...askChangelog(), values: { platform: 'ever-teams', isFeature: item.feature ?? 'false' } }]
					: ([] as Ask[]);

			console.log(`[lane-c reads] MEASURE changelog-key ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			if (item.status === 400) {
				expectAnswer(asked, 200, response, text, path, log, CHANGELOG_KEY_REFUSAL, `${path} — ${item.label}`);
				expect(
					triples(log),
					`${path}: a refused product key still reached the API (${logOf(log)}) — route.ts:15-17 refuses before the call`
				).toEqual([]);
			} else {
				expectAnswer(asked, 200, response, text, path, log, CHANGELOG_CONTROL, `${path} — ${item.label}`);
				const entry = log.find((request) => request.path === UP_CHANGELOG);
				expect(
					entry?.query ?? null,
					`${path}: the upstream query is no longer ${JSON.stringify(item.upstream)} (${logOf(log)})`
				).toBe(item.upstream);
			}
		});
	}

	test('GET /api/changelog: the 200 carries public, max-age=300 while its own 400 and its own 502 carry nothing', async ({
		api,
		mock,
		cookies
	}) => {
		const ok = await callApi(api, cookies, '/api/changelog?platform=ever-teams');
		const refused = await callApi(api, cookies, '/api/changelog?platform=');
		await mock.scenario({ drops: { [UP_CHANGELOG]: 1 } });
		const outaged = await callApi(api, cookies, '/api/changelog?platform=ever-teams');
		const log = await mock.requests();

		console.log(
			`[lane-c reads] MEASURE changelog-cache 200 cc=${JSON.stringify(ok.response.headers()['cache-control'] ?? null)} · ` +
				`400 cc=${JSON.stringify(refused.response.headers()['cache-control'] ?? null)} · ` +
				`502 cc=${JSON.stringify(outaged.response.headers()['cache-control'] ?? null)} · log ${logOf(log)}`
		);

		expect(
			ok.response.headers()['cache-control'] ?? null,
			`the marked 200 lost its directive (${ok.text.slice(0, 120)})`
		).toBe('public, max-age=300');
		expect(
			refused.response.headers()['cache-control'] ?? null,
			`the 400 of route.ts:15-17 now carries a directive it did not carry when measured (${refused.text.slice(0, 120)})`
		).toBeNull();
		expect(
			outaged.response.status(),
			`the cut changelog call is no longer the 502 branch (${outaged.text.slice(0, 120)})`
		).toBe(502);
		expect(
			outaged.response.headers()['cache-control'] ?? null,
			`the 502 of route.ts:27-29 now carries a directive it did not carry when measured (${outaged.text.slice(0, 120)})`
		).toBeNull();
	});
});

/* ---------------------------------------------------------------------- 5 */

const FAVORITE_KINDS: Array<{ label: string; entity: string; status: 200 | 400 }> = [
	{ label: 'Task, the one kind the route names (route.ts:7)', entity: 'Task', status: 200 },
	{ label: 'Document, the kind this route exists to keep out', entity: 'Document', status: 400 },
	{ label: 'Project', entity: 'Project', status: 400 },
	{ label: 'the same kind in lower case, which is not the enum value', entity: 'task', status: 400 },
	{ label: 'no where[entity] at all', entity: '', status: 400 }
];

test.describe('lane-c · GET /api/favorite/type reads favourite tasks and nothing else, whoever the caller is', () => {
	for (const kind of FAVORITE_KINDS) {
		test(`GET /api/favorite/type?where[entity]=${kind.entity || '<missing>'}: ${kind.label}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const path = `/api/favorite/type?where[entity]=${kind.entity}&where[employeeId]=${ids.employee}`;
			const { response, text } = await callApi(api, cookies, path);
			const log = await mock.requests();
			const asked =
				kind.status === 200
					? [
							{
								method: 'GET' as const,
								path: UP_FAVORITE_TYPE,
								keys: ['where[employeeId]', 'where[entity]'],
								status: 200
							}
						]
					: ([] as Ask[]);

			console.log(`[lane-c reads] MEASURE favorite-kind ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				kind.status === 200 ? ownJson(200, MOCK_PAGE, null) : FAVORITE_KIND_REFUSAL,
				`${path} — ${kind.label}`
			);
			if (kind.status === 400)
				expect(
					log.filter((request) => request.path === UP_FAVORITE_TYPE).map(lineOf),
					`${path}: a kind this route refuses still reached the API (${logOf(log)}) — route.ts:16-19 refuses before the read`
				).toEqual([]);
		});
	}

	test('GET /api/favorite/type forwards filters it never looks at, once the kind is right', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const path = `/api/favorite/type?where[entity]=Task&where[employeeId]=${ids.employee}&limit=10&orderBy[createdDate]=DESC`;
		const { response, text } = await callApi(api, cookies, path);
		const log = await mock.requests();
		const asked = [
			{
				method: 'GET' as const,
				path: UP_FAVORITE_TYPE,
				keys: ['limit', 'orderBy[createdDate]', 'where[employeeId]', 'where[entity]']
			}
		];

		console.log(`[lane-c reads] MEASURE favorite-filters ${witnessOf(path, response, text, log, pathsOf(asked))}`);

		expectAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			ownJson(200, MOCK_PAGE, null),
			`${path} — filters handed on`
		);
	});
});

/* ---------------------------------------------------------------------- 6 */

test.describe('lane-c · GET /api/organization-team/organizations: one session-built read, and a second read this lane cannot reach', () => {
	test('the memberships read is asked with the caller of the session, and the menu answers with no memberships at all', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const route = routeByLabel('GET /api/organization-team/organizations');
		const { response, text, path } = await callApi(api, cookies, route.app(ids));
		const log = await mock.requests();
		const asked = route.asks(ids);

		console.log(
			`[lane-c reads] MEASURE organizations-asks ${witnessOf(path, response, text, log, pathsOf(asked))}`
		);

		expectAnswer(asked, 200, response, text, path, log, route.control(ids), `${path} control`);
	});

	for (const scenario of [
		{ label: 'roleName ADMIN, the mock default', scenario: { roleName: 'ADMIN' } },
		{ label: 'roleName SUPER_ADMIN, the workspace owner', scenario: { roleName: 'SUPER_ADMIN' } },
		{ label: 'roleName EMPLOYEE, a plain member', scenario: { roleName: 'EMPLOYEE' } },
		{
			label: 'extraPermissions ALL_ORG_VIEW, the permission the request builder knows',
			scenario: { extraPermissions: ['ALL_ORG_VIEW'] }
		}
	]) {
		test(`${scenario.label}: the answer and the reads are the same${MOCK_LIMIT}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			await mock.scenario(scenario.scenario);

			const route = routeByLabel('GET /api/organization-team/organizations');
			const { response, text, path } = await callApi(api, cookies, route.app(ids));
			const log = await mock.requests();
			// [mock limit] the mock answers `GET /api/user-organization` with its catch-all page
			// (`mock-gauzy-server.mjs:827`), so this person has no memberships: `listsTeams` (`route.ts:29`,
			// `isTenantAdminRole` at `core/lib/utils/roles.ts:3-11`) has no other organization to read teams for
			// (`core/lib/utils/team-menu-organizations.ts:127`), and `ALL_ORG_VIEW` cannot extend the relation list
			// either — `requests/organization.ts:48-58` only grows for a caller that passes `userPermissions`, which
			// `route.ts:25` does not.
			const asked = route.asks(ids);

			console.log(
				`[lane-c reads] MEASURE organizations-role ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			expectAnswer(asked, 200, response, text, path, log, route.control(ids), `${path} with ${scenario.label}`);
		});
	}

	test('the teams half of the read is unreachable on this mock: arming /api/organization-team changes nothing and nothing is asked', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const route = routeByLabel('GET /api/organization-team/organizations');
		const arm = `${ids.tenantA}:${UP_ORGANIZATION_TEAMS}`;
		await mock.scenario({ fails: { [arm]: 403 } });

		const { response, text, path } = await callApi(api, cookies, route.app(ids));
		const log = await mock.requests();
		const asked = route.asks(ids);

		console.log(
			`[lane-c reads] MEASURE organizations-teams-unreachable ${witnessOf(path, response, text, log, pathsOf(asked))}`
		);

		expectAnswer(asked, 200, response, text, path, log, route.control(ids), `${path} with ${arm} armed 403`);
		expect(
			log.filter((request) => request.path === UP_ORGANIZATION_TEAMS).map(lineOf),
			`${path}: the team read was asked, which this lane measured that it never is (${logOf(log)})${MOCK_LIMIT}`
		).toEqual([]);
	});
});

/* ---------------------------------------------------------------------- 7 */

test.describe('lane-c · GET /api/desktop-server: it asks nothing, and a caller cannot make it say anything', () => {
	test('control: an empty object, no upstream call, no caching header', async ({ api, mock, cookies }) => {
		const { response, text, path } = await callApi(api, cookies, '/api/desktop-server');
		const log = await mock.requests();

		console.log(`[lane-c reads] MEASURE desktop-control ${witnessOf(path, response, text, log, [])}`);

		// Not a secret: the one key this route can ever write is `GAUZY_API_SERVER_URL`
		// (`requests/desktop-source.ts:4-12`), typed `IServerRuntimeConfig` in
		// `core/types/interfaces/common/runtime-server-config.ts:1-5`, and the same value is handed to the browser as the
		// public `NEXT_PUBLIC_GAUZY_API_SERVER_URL` (`core/services/server/runtime-env.ts:39-46`, read back in `env-config.ts:196-205`).
		// With `IS_DESKTOP_APP` unset (`core/constants/config/constants.tsx:151`) the route answers `{}` here.
		expectAnswer([], 200, response, text, path, log, DESKTOP_CONFIG, 'GET /api/desktop-server control');
	});

	test('signed out: the same empty object — the route has no guard at all', async ({ api, mock, cookies }) => {
		const { response, text, path } = await callApi(api, cookies, '/api/desktop-server', { anonymous: true });
		const log = await mock.requests();

		console.log(`[lane-c reads] MEASURE desktop-signed-out ${witnessOf(path, response, text, log, [])}`);

		expectAnswer([], 200, response, text, path, log, DESKTOP_CONFIG, 'GET /api/desktop-server signed out');
	});

	test('a caller cannot inject a key: ?GAUZY_API_SERVER_URL=<other> is not read, and no upstream call is ever made', async ({
		api,
		mock,
		cookies
	}) => {
		const path =
			'/api/desktop-server?GAUZY_API_SERVER_URL=https://evil.example&NEXT_PUBLIC_GAUZY_API_SERVER_URL=https://evil.example';
		const { response, text } = await callApi(api, cookies, path);
		const log = await mock.requests();

		console.log(`[lane-c reads] MEASURE desktop-inject ${witnessOf(path, response, text, log, [])}`);

		expectAnswer([], 200, response, text, path, log, DESKTOP_CONFIG, `${path} — a caller-named key`);
	});

	for (const arm of [
		{ label: 'the path alone', key: '/api/desktop-server' },
		{ label: 'a tenant-keyed path', key: 'tenant' }
	]) {
		test(`no arm can touch it (${arm.label}): armed and cut, it answers the same and the mock was asked nothing`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const key = arm.key === 'tenant' ? `${ids.tenantA}:/api/desktop-server` : '/api/desktop-server';
			await mock.scenario({ fails: { [key]: 403 }, drops: { [key]: 1 } });

			const { response, text, path } = await callApi(api, cookies, '/api/desktop-server');
			const log = await mock.requests();

			console.log(`[lane-c reads] MEASURE desktop-armed ${witnessOf(path, response, text, log, [])}`);

			expectAnswer(
				[],
				200,
				response,
				text,
				path,
				log,
				DESKTOP_CONFIG,
				`GET /api/desktop-server with ${key} armed`
			);
		});
	}
});

/* ---------------------------------------------------------------------- 8 */

/** The three upstream calls `POST /api/roles/options` makes, in the order the mock recorded them. */
const POST_FLOW = (ids: Record<string, string>): Ask[] => [
	askRolesOptions(),
	{ method: 'POST', path: UP_INVITE_EMAILS, keys: [] },
	{
		method: 'GET',
		path: UP_INVITE_LIST,
		keys: ['where[organizationId]', 'where[status]', 'where[teams][id][0]', 'where[tenantId]'],
		values: {
			'where[tenantId]': ids.tenantA,
			'where[organizationId]': ids.organizationA,
			'where[teams][id][0]': ids.teamA,
			'where[status]': 'INVITED'
		}
	}
];

/** The calls that actually happened once the flow is refused part-way through it. */
const postFlowUpTo = (ids: Record<string, string>, armedPath: string, status: number): Ask[] => {
	const flow = POST_FLOW(ids);
	const index = flow.findIndex((ask) => ask.path === armedPath);
	return flow.slice(0, index + 1).map((ask) => ({ ...ask, status: ask.path === armedPath ? status : 200 }));
};

const postControl = (ids: Record<string, string>): Answer => ownJson(200, mockInviteList(ids), null);

test.describe('lane-c · POST /api/roles/options: the origin trio, the body it rebuilds, and its three upstream paths', () => {
	test("control: the role read, the invite write, then the team's invitations", async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
			method: 'POST',
			body: INVITE_BODY
		});
		const log = await mock.requests();
		const asked = POST_FLOW(ids);
		const invites = await recordedInvites(mock);

		console.log(
			`[lane-c reads] MEASURE invite-control ${witnessOf(path, response, text, log, pathsOf(asked))} · mock recorded ` +
				`${JSON.stringify(invites)}`
		);

		expectAnswer(asked, 200, response, text, path, log, postControl(ids), 'POST /api/roles/options control');

		// The mock keeps what it was posted (`mock-gauzy-server.mjs:537-540`), which is the only witness a POST body has.
		expect(
			invites,
			`the invite the mock recorded is no longer the caller's email in the session's team (${JSON.stringify(invites)}) — ` +
				`${witnessOf(path, response, text, log, pathsOf(asked))}`
		).toEqual({ emails: [INVITE_BODY.email], teamIds: [ids.teamA] });
	});

	for (const trio of <Array<{ label: string; headers: Record<string, string> }>>[
		{ label: 'Sec-Fetch-Site: cross-site', headers: { 'sec-fetch-site': 'cross-site' } },
		{ label: 'Sec-Fetch-Site: same-site', headers: { 'sec-fetch-site': 'same-site' } },
		{ label: 'Origin: https://evil.example', headers: { origin: 'https://evil.example' } }
	]) {
		test(`POST /api/roles/options from ${trio.label}: 403 with no-store, before the guard and before any read`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			// Armed on the role read too, to prove the refusal happens before the route reaches it (`route.ts:27-28`).
			await mock.scenario({ fails: { [`${ids.tenantA}:${UP_ROLES_OPTIONS}`]: 403 } });

			const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
				method: 'POST',
				body: INVITE_BODY,
				headers: trio.headers
			});
			const log = await mock.requests();

			console.log(
				`[lane-c reads] MEASURE invite-foreign ${witnessOf(path, response, text, log, pathsOf(POST_FLOW(ids)))}`
			);

			expectAnswer(
				[],
				200,
				response,
				text,
				path,
				log,
				FOREIGN_SITE_REFUSAL,
				`POST /api/roles/options with ${trio.label}`
			);
		});
	}

	test("POST /api/roles/options from this app's own origin is the control call", async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
			method: 'POST',
			body: INVITE_BODY,
			headers: { origin: 'http://localhost:3033' }
		});
		const log = await mock.requests();
		const asked = POST_FLOW(ids);

		console.log(`[lane-c reads] MEASURE invite-own-origin ${witnessOf(path, response, text, log, pathsOf(asked))}`);

		expectAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			postControl(ids),
			'POST /api/roles/options with Origin of this app'
		);
	});

	test('POST /api/roles/options with no body at all is refused by the origin guard before its body is read (Sec-Fetch-Site: cross-site)', async ({
		api,
		mock,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
			method: 'POST',
			headers: { 'sec-fetch-site': 'cross-site' }
		});
		const log = await mock.requests();

		console.log(`[lane-c reads] MEASURE invite-foreign-bodiless ${witnessOf(path, response, text, log, [])}`);

		expectAnswer(
			[],
			200,
			response,
			text,
			path,
			log,
			FOREIGN_SITE_REFUSAL,
			'POST /api/roles/options, cross-site and with no body'
		);
	});

	const BODY_CASES: Array<{
		label: string;
		body?: unknown;
		contentType?: string;
		noBody?: boolean;
		/** `true` for "the answer is the control's, which needs the fixture ids". */
		control?: boolean;
		answer?: Answer;
	}> = [
		{
			label: 'a body with no name',
			body: { email: INVITE_BODY.email },
			answer: ownJson(400, { errors: { name: FIELD_EMPTY } }, null)
		},
		{
			label: 'a body with no email',
			body: { name: INVITE_BODY.name },
			answer: ownJson(400, { errors: { email: FIELD_EMPTY } }, null)
		},
		{
			label: 'an email that is not an email',
			body: { email: 'lane-c-not-an-email', name: INVITE_BODY.name },
			answer: ownJson(400, { errors: { email: EMAIL_INVALID } }, null)
		},
		{
			label: 'both fields empty (validations.ts:82-84)',
			body: { email: '', name: '' },
			answer: ownJson(400, { errors: { email: FIELD_EMPTY, name: FIELD_EMPTY } }, null)
		},
		{
			label: 'both fields one character, where two are wanted (validations.ts:82-84)',
			body: { email: 'a', name: 'b' },
			answer: ownJson(400, { errors: { email: FIELD_EMPTY, name: FIELD_EMPTY } }, null)
		},
		{
			label: 'unknown keys only',
			body: { nope: 1 },
			answer: ownJson(400, { errors: { email: FIELD_EMPTY, name: FIELD_EMPTY } }, null)
		},
		{
			label: 'a body that is an empty JSON array',
			body: [],
			answer: ownJson(400, { errors: { email: FIELD_EMPTY, name: FIELD_EMPTY } }, null)
		},
		{ label: 'a body that is JSON null', body: 'null', contentType: 'application/json', answer: HANDLER_CRASH },
		{
			label: 'a body that is a JSON string',
			body: '"lane-c-string"',
			contentType: 'application/json',
			answer: HANDLER_CRASH
		},
		{ label: 'no body at all', noBody: true, answer: HANDLER_CRASH },
		{
			label: 'a form-encoded body',
			body: 'email=lane-c@example.test&name=Lane%20C',
			contentType: 'application/x-www-form-urlencoded',
			answer: HANDLER_CRASH
		},
		{
			label: 'unparseable bytes under application/json',
			body: 'not json at all {',
			contentType: 'application/json',
			answer: HANDLER_CRASH
		},
		{
			label: 'a valid JSON body declared as text/plain — the media type is never looked at',
			body: JSON.stringify(INVITE_BODY),
			contentType: 'text/plain',
			control: true
		},
		{
			label: 'a valid JSON body with no media type declared at all',
			body: JSON.stringify(INVITE_BODY),
			contentType: '',
			control: true
		}
	];

	for (const item of BODY_CASES) {
		test(`POST /api/roles/options with ${item.label}${item.answer === HANDLER_CRASH ? NOT_INTENDED : ''}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
				method: 'POST',
				...(item.noBody ? { noBody: true } : {}),
				...(item.body === undefined ? {} : { body: item.body }),
				...(item.contentType === undefined ? {} : { contentType: item.contentType })
			});
			const log = await mock.requests();
			const crashed = item.answer === HANDLER_CRASH;
			const answer = item.control ? postControl(ids) : (item.answer as Answer);
			const asked = crashed || answer.status === 400 ? ([] as Ask[]) : POST_FLOW(ids);

			console.log(`[lane-c reads] MEASURE invite-body ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectAnswer(asked, 200, response, text, path, log, answer, `POST /api/roles/options with ${item.label}`);

			if (crashed) {
				// `route.ts:37` is a bare `await req.json()` with nothing around it, so a body it cannot read is a throw
				// this app never answers. `suites/api/empty-body-blockers.generated.ts:137-139` already calls the bodiless
				// one a blocker; the JSON-null, JSON-string, form-encoded and unparseable rows measured here are its
				// siblings, and none of them asked the API first.
				const stray = log.filter((request) => request.path !== GUARD_CHECK);
				expect(
					triples(stray),
					`POST /api/roles/options with ${item.label} asked the API before failing (${logOf(log)}) — the throw is at route.ts:37`
				).toEqual([]);
			}
		});
	}

	test('POST /api/roles/options trims the two fields it validates before it uses them', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
			method: 'POST',
			body: { email: '  padded@example.test  ', name: '  Padded  ' }
		});
		const log = await mock.requests();
		const asked = POST_FLOW(ids);
		const invites = await recordedInvites(mock);

		console.log(
			`[lane-c reads] MEASURE invite-trim ${witnessOf(path, response, text, log, pathsOf(asked))} · mock recorded ` +
				`${JSON.stringify(invites)}`
		);

		expectAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			postControl(ids),
			'POST /api/roles/options with padded fields'
		);
		// The trimmed value is the only one the mock can witness: it records the emails it was given, not the name
		// (`mock-gauzy-server.mjs:537-540`); the trim itself is `core/lib/helpers/validations.ts:61-62`.
		expect(
			invites?.emails,
			`the email the mock recorded is no longer the trimmed one (${JSON.stringify(invites)}) — ${witnessOf(
				path,
				response,
				text,
				log,
				pathsOf(asked)
			)}`
		).toEqual(['padded@example.test']);
	});

	test('POST /api/roles/options rebuilds the invitation from the session, so a body naming another organization, tenant, team or role is ignored', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
			method: 'POST',
			body: foreignInviteBody(ids)
		});
		const log = await mock.requests();
		const asked = POST_FLOW(ids);
		const invites = await recordedInvites(mock);

		console.log(
			`[lane-c reads] MEASURE invite-body-scoping ${witnessOf(path, response, text, log, pathsOf(asked))} · mock recorded ` +
				`${JSON.stringify(invites)}`
		);

		expectAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			postControl(ids),
			'POST /api/roles/options with a body naming the other tenant'
		);
		// The two witnesses: the invitation *list* query the app built from the session (`route.ts:76-83` →
		// `requests/invite.ts:71-103`, asserted in `asked`), and what the mock recorded of the write
		// (`mock-gauzy-server.mjs:537-540`): the caller's email, the session's team, and nothing the body named.
		expect(
			invites,
			`the invite the mock recorded is no longer the session's team (${JSON.stringify(invites)}) — ${witnessOf(
				path,
				response,
				text,
				log,
				pathsOf(asked)
			)}`
		).toEqual({ emails: [INVITE_BODY.email], teamIds: [ids.teamA] });
	});

	test('POST /api/roles/options reads nothing from the caller query either: the session built all three calls', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const path = `/api/roles/options?organizationId=${ids.organizationB}&tenantId=${ids.tenantB}`;
		const { response, text } = await callApi(api, cookies, path, { method: 'POST', body: INVITE_BODY });
		const log = await mock.requests();
		const asked = POST_FLOW(ids);

		console.log(
			`[lane-c reads] MEASURE invite-query-ignored ${witnessOf(path, response, text, log, pathsOf(asked))}`
		);

		expectAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			postControl(ids),
			`${path} — a caller query naming the other tenant`
		);
	});

	test("POST /api/roles/options as a scope-B session invites into the other tenant's organization and team", async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
			method: 'POST',
			body: INVITE_BODY,
			scope: 'B'
		});
		const log = await mock.requests();
		const asked = POST_FLOW(ids).map((ask) =>
			ask.path === UP_INVITE_LIST
				? {
						...ask,
						values: {
							'where[tenantId]': ids.tenantB,
							'where[organizationId]': ids.organizationB,
							'where[teams][id][0]': ids.teamB,
							'where[status]': 'INVITED'
						}
					}
				: ask
		);

		console.log(`[lane-c reads] MEASURE invite-scope-B ${witnessOf(path, response, text, log, pathsOf(asked))}`);

		expectAnswer(
			asked,
			200,
			response,
			text,
			path,
			log,
			ownJson(200, mockInviteList(ids, 'B'), null),
			`${path} as scope B`
		);
	});

	for (const [label, armedPath] of [
		['role read', UP_ROLES_OPTIONS],
		['invite write', UP_INVITE_EMAILS],
		['invitation list read', UP_INVITE_LIST]
	] as const) {
		const swallowed = armedPath === UP_INVITE_LIST;

		for (const status of REFUSAL_STATUSES) {
			test(`POST /api/roles/options with the ${label} refused ${status} upstream${swallowed ? '' : NOT_INTENDED}`, async ({
				api,
				mock,
				ids,
				cookies
			}) => {
				const arm = `${ids.tenantA}:${armedPath}`;
				await mock.scenario({ fails: { [arm]: status } });

				const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
					method: 'POST',
					body: INVITE_BODY
				});
				const log = await mock.requests();
				const asked = postFlowUpTo(ids, armedPath, status);
				const answer = swallowed ? ownJson(200, MOCK_PAGE, null) : HANDLER_CRASH;

				console.log(
					`[lane-c reads] MEASURE invite-armed-${status}-${label} ${witnessOf(path, response, text, log, pathsOf(asked))}`
				);

				expectAnswer(
					asked,
					status,
					response,
					text,
					path,
					log,
					answer,
					`POST /api/roles/options with ${arm} armed ${status}`
				);
			});
		}

		test(`POST /api/roles/options with the ${label} cut upstream${swallowed ? '' : NOT_INTENDED}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const arm = `${ids.tenantA}:${armedPath}`;
			await mock.scenario({ drops: { [arm]: 1 } });

			const { response, text, path } = await callApi(api, cookies, '/api/roles/options', {
				method: 'POST',
				body: INVITE_BODY
			});
			const log = await mock.requests();
			const asked = postFlowUpTo(ids, armedPath, 0);
			const answer = swallowed ? ownJson(200, MOCK_PAGE, null) : HANDLER_CRASH;

			console.log(
				`[lane-c reads] MEASURE invite-cut-${label} ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			expectAnswer(asked, 0, response, text, path, log, answer, `POST /api/roles/options with ${arm} cut`);
		});
	}
});

/* ---------------------------------------------------------------------- 9 */

test.describe('lane-c · /api/editor-assist with no provider on this deployment (GET first, and no body that could reach one)', () => {
	test('GET /api/editor-assist: the availability the editor reads is {"server":false} on this lane', async ({
		api,
		mock,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/editor-assist');
		const log = await mock.requests();
		// The guard's check is the only thing this route can ask, and it is excepted (`route.ts:133`).
		const stray = log.filter((request) => request.path !== GUARD_CHECK);

		console.log(`[lane-c reads] MEASURE editor-availability ${witnessOf(path, response, text, log, [])}`);

		expect(
			response.status(),
			`the availability read moved off 200 — ${witnessOf(path, response, text, log, [])}`
		).toBe(200);
		expect(
			parseAnswer(text),
			`the availability is no longer what this lane measured — ${witnessOf(path, response, text, log, [])}`
		).toEqual({ server: false });
		expect(
			response.headers()['content-type'] ?? null,
			`the availability media type moved — ${witnessOf(path, response, text, log, [])}`
		).toBe(OWN_MEDIA_TYPE);
		expect(
			response.headers()['cache-control'] ?? null,
			`the availability now carries a caching directive it did not carry when measured — ${witnessOf(path, response, text, log, [])}`
		).toBeNull();
		expect(
			triples(stray),
			`the availability read asked something upstream (${logOf(log)}) — it calls no API, and a provider key would show ` +
				'here as a different answer'
		).toEqual([]);
	});

	test('GET /api/editor-assist is a read: the cross-site headers change nothing', async ({ api, mock, cookies }) => {
		const { response, text, path } = await callApi(api, cookies, '/api/editor-assist', {
			headers: { 'sec-fetch-site': 'cross-site', origin: 'https://evil.example' }
		});
		const log = await mock.requests();

		console.log(`[lane-c reads] MEASURE editor-get-foreign ${witnessOf(path, response, text, log, [])}`);

		// `route.ts:132-138` runs no origin check on the read, unlike the write at `:146-147`.
		expectAnswer(
			[],
			200,
			response,
			text,
			path,
			log,
			EDITOR_AVAILABILITY,
			'GET /api/editor-assist with cross-site headers'
		);
	});

	test('GET /api/editor-assist signed out is answered too, because the guard delegated [mock limit]', async ({
		api,
		mock,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/editor-assist', { anonymous: true });
		const log = await mock.requests();

		console.log(`[lane-c reads] MEASURE editor-get-signed-out ${witnessOf(path, response, text, log, [])}`);

		// [mock limit] `route.ts:134` (`if (!guard.user) return guard.deny()`) is unreachable here: the mock answers
		// `/api/user/me` with no bearer (`mock-gauzy-server.mjs:560`), so the guard found a user.
		expectAnswer(
			[],
			200,
			response,
			text,
			path,
			log,
			EDITOR_AVAILABILITY,
			'GET /api/editor-assist signed out [mock limit]'
		);
	});

	const ORIGIN_CASES: Array<{ label: string; headers: Record<string, string> }> = [
		{ label: 'Sec-Fetch-Site: cross-site', headers: { 'sec-fetch-site': 'cross-site' } },
		{ label: 'Sec-Fetch-Site: same-site', headers: { 'sec-fetch-site': 'same-site' } },
		{ label: 'Origin: https://evil.example', headers: { origin: 'https://evil.example' } }
	];

	for (const item of ORIGIN_CASES) {
		test(`POST /api/editor-assist from ${item.label}: 403 with no-store, before the guard and before any body is read`, async ({
			api,
			mock,
			cookies
		}) => {
			const { response, text, path } = await callApi(api, cookies, '/api/editor-assist', {
				method: 'POST',
				headers: item.headers,
				body: EDITOR_BODY
			});
			const log = await mock.requests();

			console.log(`[lane-c reads] MEASURE editor-foreign ${witnessOf(path, response, text, log, [])}`);

			// `route.ts:146-147` runs `refuseForeignOrigin` first, so nothing was asked, the guard check included.
			expect(
				triples(log),
				`the cross-site write reached the session check or an API (${logOf(log)}) — route.ts:146 comes first`
			).toEqual([]);
			expectAnswer(
				[],
				200,
				response,
				text,
				path,
				log,
				FOREIGN_SITE_REFUSAL,
				`POST /api/editor-assist with ${item.label}`
			);
		});
	}

	test("POST /api/editor-assist from this app's own origin answers not_configured, and asked no API", async ({
		api,
		mock,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/editor-assist', {
			method: 'POST',
			headers: { origin: 'http://localhost:3033' },
			body: EDITOR_BODY
		});
		const log = await mock.requests();
		const stray = log.filter((request) => request.path !== GUARD_CHECK);

		console.log(`[lane-c reads] MEASURE editor-own-origin ${witnessOf(path, response, text, log, [])}`);

		expectAnswer(
			[],
			200,
			response,
			text,
			path,
			log,
			EDITOR_NOT_CONFIGURED,
			'POST /api/editor-assist with Origin of this app'
		);
		expect(
			triples(stray),
			`a body with no config asked an API (${logOf(log)}) — route.ts:165-166 answers before any provider exists`
		).toEqual([]);
	});

	const EDITOR_POST_CASES: Array<{
		label: string;
		body?: unknown;
		contentType?: string;
		noBody?: boolean;
		answer: Answer;
	}> = [
		{
			label: 'a valid request with no config — the no-provider branch',
			body: EDITOR_BODY,
			answer: EDITOR_NOT_CONFIGURED
		},
		{
			label: 'a custom mode with its instruction, still with no config',
			body: { mode: 'custom', context: 'task', text: 'The lane-c paragraph.', instruction: 'Make it shorter.' },
			answer: EDITOR_NOT_CONFIGURED
		},
		{
			label: 'a JSON body declared as text/plain — this route never looks at a media type, unlike forwardToGauzy',
			body: JSON.stringify(EDITOR_BODY),
			contentType: 'text/plain',
			answer: EDITOR_NOT_CONFIGURED
		},
		{
			label: 'a JSON body with no media type declared at all',
			body: JSON.stringify(EDITOR_BODY),
			contentType: '',
			answer: EDITOR_NOT_CONFIGURED
		},
		{
			label: 'an unknown key, which the schema drops rather than refusing',
			body: { ...EDITOR_BODY, nope: 1 },
			answer: EDITOR_NOT_CONFIGURED
		},
		{
			label: 'a mode that is not one of the eleven (editor-assist.schema.ts:3-15)',
			body: { mode: 'shrink', context: 'task', text: 'Some lane-c text.' },
			answer: EDITOR_INVALID
		},
		{ label: 'no mode', body: { context: 'task', text: 'Some lane-c text.' }, answer: EDITOR_INVALID },
		{
			label: 'a context that is not task or project (editor-assist.schema.ts:19)',
			body: { mode: 'improve', context: 'wiki', text: 'Some lane-c text.' },
			answer: EDITOR_INVALID
		},
		{
			label: 'text below the 3-character floor (editor-assist.schema.ts:28)',
			body: { mode: 'improve', context: 'task', text: 'ab' },
			answer: EDITOR_INVALID
		},
		{ label: 'no text', body: { mode: 'improve', context: 'task' }, answer: EDITOR_INVALID },
		{
			label: 'text above the 10 000-character ceiling (editor-assist.schema.ts:25)',
			body: { mode: 'improve', context: 'task', text: 'x'.repeat(10_001) },
			answer: EDITOR_INVALID
		},
		{
			label: 'custom without an instruction (editor-assist.schema.ts:41-47)',
			body: { mode: 'custom', context: 'task', text: 'Some lane-c text.' },
			answer: EDITOR_INVALID
		},
		{
			label: 'an instruction above 300 characters (editor-assist.schema.ts:30)',
			body: { mode: 'custom', context: 'task', text: 'Some lane-c text.', instruction: 'y'.repeat(301) },
			answer: EDITOR_INVALID
		},
		{
			label: 'a title above 200 characters (editor-assist.schema.ts:32)',
			body: { mode: 'improve', context: 'task', text: 'Some lane-c text.', title: 'z'.repeat(201) },
			answer: EDITOR_INVALID
		},
		{ label: 'a body that is JSON null', body: 'null', contentType: 'application/json', answer: EDITOR_INVALID },
		{
			label: 'a body that is a JSON string',
			body: '"lane-c-string"',
			contentType: 'application/json',
			answer: EDITOR_INVALID
		},
		{
			label: 'a body that is an empty JSON array',
			body: '[]',
			contentType: 'application/json',
			answer: EDITOR_INVALID
		},
		{ label: 'an empty JSON object', body: {}, answer: EDITOR_INVALID },
		{
			label: 'no body at all — readJson returns null and the schema refuses it',
			noBody: true,
			answer: EDITOR_INVALID
		},
		{
			label: 'a form-encoded body',
			body: 'mode=improve&context=task&text=lane-c',
			contentType: 'application/x-www-form-urlencoded',
			answer: EDITOR_INVALID
		},
		{
			label: 'unparseable bytes under application/json',
			body: 'not json at all {',
			contentType: 'application/json',
			answer: EDITOR_INVALID
		}
	];

	for (const item of EDITOR_POST_CASES) {
		test(`POST /api/editor-assist with ${item.label}`, async ({ api, mock, cookies }) => {
			const { response, text, path } = await callApi(api, cookies, '/api/editor-assist', {
				method: 'POST',
				...(item.noBody ? { noBody: true } : {}),
				...(item.body === undefined ? {} : { body: item.body }),
				...(item.contentType === undefined ? {} : { contentType: item.contentType })
			});
			const log = await mock.requests();
			const stray = log.filter((request) => request.path !== GUARD_CHECK);

			console.log(`[lane-c reads] MEASURE editor-post ${witnessOf(path, response, text, log, [])}`);

			expectAnswer([], 200, response, text, path, log, item.answer, `POST /api/editor-assist with ${item.label}`);
			// The safety reading every one of these rows carries: no provider call was possible, and no body here carries
			// a `config`, so `route.ts:117-129` was never reached.
			expect(
				triples(stray),
				`POST /api/editor-assist with ${item.label} asked an upstream API (${logOf(log)}) — no body here carries a config, ` +
					'and with no server provider route.ts:157 never enters the provider chain'
			).toEqual([]);
		});
	}

	test('POST /api/editor-assist signed out answers not_configured, because the guard delegated [mock limit]', async ({
		api,
		mock,
		cookies
	}) => {
		const { response, text, path } = await callApi(api, cookies, '/api/editor-assist', {
			method: 'POST',
			body: EDITOR_BODY,
			anonymous: true
		});
		const log = await mock.requests();

		console.log(`[lane-c reads] MEASURE editor-signed-out ${witnessOf(path, response, text, log, [])}`);

		expectAnswer(
			[],
			200,
			response,
			text,
			path,
			log,
			EDITOR_NOT_CONFIGURED,
			'POST /api/editor-assist signed out [mock limit]'
		);
	});
});

/* --------------------------------------------------------------------- 10 */

test.describe('lane-c · no permission gate on any of these reads, so the role switches change nothing', () => {
	for (const label of [
		'GET /api/roles/team-assignable',
		'GET /api/employee-appointment/invited',
		'GET /api/favorite/type',
		'GET /api/chat/states'
	]) {
		test(`${label}: the fixture role's name is never looked at — ADMIN, EMPLOYEE and SUPER_ADMIN are answered the same${MOCK_LIMIT}`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const route = routeByLabel(label);
			const answers: string[] = [];
			for (const roleName of ['ADMIN', 'EMPLOYEE', 'SUPER_ADMIN']) {
				await mock.scenario({ roleName });
				const { response, text } = await callApi(api, cookies, route.app(ids));
				answers.push(`${response.status()} ${JSON.stringify(parseAnswer(text)).slice(0, 60)}`);
			}

			const log = await mock.requests();
			console.log(
				`[lane-c reads] MEASURE no-role-gate ${label} answers=${JSON.stringify(answers)} log=${logOf(log)}`
			);

			expect(
				answers,
				`${label}: the three roles were answered differently, which no line of this route does (${JSON.stringify(answers)})`
			).toEqual([answers[0], answers[0], answers[0]]);
		});
	}

	test('no route here refuses a permission: an armed extraPermissions changes no answer and refuses nothing', async ({
		api,
		mock,
		ids,
		cookies
	}) => {
		await mock.scenario({ extraPermissions: ['ORG_TASK_VIEW', 'ALL_ORG_VIEW'] });
		const answers: string[] = [];
		for (const label of [
			'GET /api/roles/team-assignable',
			'GET /api/chat/states',
			'GET /api/time-goals/progress'
		]) {
			const route = routeByLabel(label);
			const { response } = await callApi(api, cookies, route.app(ids));
			answers.push(`${label} ${response.status()}`);
		}

		console.log(
			`[lane-c reads] MEASURE no-permission-gate answers=${JSON.stringify(answers)} log=${logOf(await mock.requests())}`
		);

		expect(answers, 'a permission refusal appeared on routes that call no permission check').toEqual([
			'GET /api/roles/team-assignable 200',
			'GET /api/chat/states 200',
			'GET /api/time-goals/progress 200'
		]);
	});
});

/* --------------------------------------------------------------------- 11 */

test.describe('lane-c · a verb a route file does not export never reaches these handlers', () => {
	const VERBS: Array<{ verb: 'POST' | 'PUT' | 'DELETE'; path: string }> = [
		{ verb: 'POST', path: '/api/chat/states' },
		{ verb: 'POST', path: '/api/reaction/comments' },
		{ verb: 'POST', path: '/api/time-goals/progress' },
		{ verb: 'POST', path: '/api/favorite/type' },
		{ verb: 'POST', path: '/api/organization-team/organizations' },
		{ verb: 'DELETE', path: '/api/organization-team/organizations' },
		{ verb: 'POST', path: '/api/roles/team-assignable' },
		{ verb: 'DELETE', path: '/api/roles/team-assignable' },
		{ verb: 'POST', path: '/api/employee-appointment/invited' },
		{ verb: 'PUT', path: '/api/employee-appointment/invited' },
		{ verb: 'POST', path: '/api/changelog' },
		{ verb: 'PUT', path: '/api/changelog' },
		{ verb: 'PUT', path: '/api/roles/options' },
		{ verb: 'PUT', path: '/api/desktop-server' },
		{ verb: 'PUT', path: '/api/editor-assist' }
	];

	for (const item of VERBS) {
		test(`${item.verb} ${item.path}: 405 with no body, no media type and no upstream call`, async ({
			api,
			mock,
			cookies
		}) => {
			const { response, text, path } = await callApi(api, cookies, item.path, {
				method: item.verb,
				body: { probe: 1 }
			});
			const log = await mock.requests();

			console.log(`[lane-c reads] MEASURE verb-not-exported ${witnessOf(path, response, text, log, [])}`);

			expect(
				response.status(),
				`${item.verb} ${item.path} is no longer the 405 Next gives an unexported verb (${text})`
			).toBe(405);
			expect(
				text,
				`${item.verb} ${item.path} answered a body where it answered none: ${text.slice(0, 120)}`
			).toBe('');
			expect(
				response.headers()['content-type'] ?? null,
				`${item.verb} ${item.path} now carries a media type it did not carry when measured`
			).toBeNull();
			expect(
				response.headers()['cache-control'] ?? null,
				`${item.verb} ${item.path} now carries a caching directive it did not carry when measured`
			).toBeNull();
			expect(
				triples(log),
				`${item.verb} ${item.path} reached a handler (${logOf(log)}) — the route file exports no ${item.verb}`
			).toEqual([]);
		});
	}
});
