import type { APIResponse } from '@playwright/test';
import type { MockScenario, StubRequest } from '../../helpers';

import { expect, test, type ApiCall, type CookieComposer } from '../../api-fixtures';
import { mockReset } from '../../helpers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The contract of the 12 `app/api` **write** routes no spec names, pinned on lane-b (app 3032, mock 3996, control 3998)
 * in the two fully green runs `E:\Coding\.tmp\s2-lane-b-writes-4.log` and `-5.log` (407 tests each; `-1.log` is the run
 * that red-lined 40 rows whose expectation I had written instead of measured, and `-2.log`/`-3.log` are the runs that
 * proved the fix). Every status, body, key list, cookie list and header below is a measurement, taken first against the
 * live lane with `E:\Coding\.tmp\probe-writes\probe1.mjs` (the eight `forwardToGauzy` one-liners), `probe2.mjs` (the four
 * custom handlers), `probe3.mjs` (the gaps probe 2 left), `probe4.mjs` (the sibling `POST /api/invite/resend`),
 * `probe5.mjs` (the last refusal statuses), `probe6.mjs` (the exact invite answer bodies), `probe7.mjs` (the invite read's
 * recorded query values) and `probe8.mjs` (the cookie values a 201 writes, the echoed bodies, the tenant-keyed arms of the
 * workspace chain), readings in `measured1.txt` … `measured8.txt` beside them, and only then written down. Nothing here was
 * predicted from the source; the source lines are cited because the measurement names them.
 *
 * ## The 12 routes and which half of the server code answers them
 *
 * Eight are one-line `forwardToGauzy` proxies (`core/services/server/forward-to-gauzy.ts:80-132`):
 * `POST /api/auth/sessions/sign-out-others` (`app/api/auth/sessions/sign-out-others/route.ts:9`, the only one of the
 * twelve that passes an option at all — `{ noStore: true }`), `POST /api/chat/categories/reorder`
 * (`app/api/chat/categories/reorder/route.ts:5`), `POST /api/chat/read-all` (`app/api/chat/read-all/route.ts:5`),
 * `POST /api/chat/read-restore` (`app/api/chat/read-restore/route.ts:5`), `POST /api/plugins/docs/documents/reorder`
 * (`app/api/plugins/docs/documents/reorder/route.ts:5`), `PUT /api/task-automations/order`
 * (`app/api/task-automations/order/route.ts:5`) , `PATCH /api/task-statuses/reorder`
 * (`app/api/task-statuses/reorder/route.ts:8` — `PATCH`, not a re-export: `app/api/task-statuses/[id]/route.ts` exports
 * `PUT` at `:9` and `DELETE` at `:39` and no `PATCH`, which is what that route's own comment at `:3-6` says, and the verb
 * rows below pin it for this path) and `POST /api/tasks/bulk-update` (`app/api/tasks/bulk-update/route.ts:5`). What that
 * family does with a refusal, a cut, a media type and a foreign origin as a family is already pinned in
 * `suites/lane-b/forward-refusals.spec.ts`; the rows here pin what each of these routes does with **its own path, body,
 * query and answer headers**, which is where they differ from one another (and the twelve are also listed in the
 * generated manifests `suites/api/routes.generated.ts` and `suites/api/foreign-origin.generated.ts`, which say only
 * which verbs a file exports and which guard refuses it).
 *
 * Four run their own handler code: `PUT /api/employee/me/presence` (`app/api/employee/me/presence/route.ts:10-41`:
 * `refuseForeignOrigin` `:11`, `authenticatedGuard` `:14`, a `zod` body check `:8,:17-20`,
 * `updateEmployeePresenceRequest` (`core/services/server/requests/employee.ts:95-111`) inside a `try` `:22-29` and a
 * `catch` that passes Gauzy's status on `:30-40`); `POST /api/employee-placeholder/bulk`
 * (`app/api/employee-placeholder/bulk/route.ts:6-10` → `core/services/server/employee-placeholder-proxy.ts:82-92`, whose
 * shared path `:45-66` runs the guard, then `getMyRolePermissionsRequest` (`requests/role-permissions.ts:39-46`), then
 * `canManagePlaceholders` (`core/lib/utils/member-placeholder.ts:17-19`), then the forward, catching with
 * `gauzyErrorResponse` (`core/services/server/gauzy-error-response.ts:24-37)`); `POST /api/invite/emails`
 * (`app/api/invite/emails/route.ts:14-76`: origin check `:15`, guard `:18`, `inviteEmailsBodySchema`
 * (`core/lib/validation/invite.ts:13-24`) `:25-29`, an employee-role read `:33-40` (`requests/roles.ts:5-24`), the
 * invitation write `:45-62` (`requests/invite.ts:19-32`) and a final invitation-list read `:66-73`
 * (`requests/invite.ts:111-133`)); and `POST /api/auth/create-workspace` (`app/api/auth/create-workspace/route.ts:23-82`
 * → `core/services/server/create-workspace.ts:138-188` → `core/services/server/ever-id/provision.ts`), the only route
 * here that mints a session and the only one that reads its own mock's record of what it was asked.
 *
 * ## What every route was measured on
 *
 * A control (signed in as the fixture's tenant A, nothing armed, with the body that route's own client sends), the same
 * call signed out, an armed `fails` refusal (403 on the bare path, 429 on `<tenant A>:<path>`) and a `drops` cut on each
 * upstream path the route calls, its malformed-body cases (bodiless, form-encoded, `text/plain` JSON, JSON with no media
 * type declared, unparseable bytes under `application/json`, an unknown key, 200 KB), the cross-site trio (`Sec-Fetch-Site:
 * cross-site`, `Sec-Fetch-Site: same-site`, `Origin: https://evil.example`) plus two same-origin controls and a bodiless
 * cross-site write, the query keys and values that travel, the pair `fails["<tenant A>:<path>"]` (fires) /
 * `fails["<tenant B>:<path>"]` (never fires) plus `auth-tenant-id` removed, and `Cache-Control` + media type on every
 * answer. Each case reads the mock's request log (`playwright/api-fixtures.ts:56`; entries carry `method`, `path`,
 * `query`, `status` and nothing else — `cypress/support/mock-gauzy-server.mjs:1122-1130`), so an upstream **verb, path
 * and query-key list** is provable while a POST body is not: where a body is the only carrier, the witness is the mock's
 * echo of what it was given (`mock-gauzy-server.mjs:826`) or, for the two paths the mock really handles
 * (`/api/invite/emails` `:537-540`, the workspace chain `:391-541`), its own record read back through `mock.state()` as
 * `workspaceCreation` (`:992-999`, `:1185`). `GET /api/user/me` (the guard's own check,
 * `core/services/server/guards/authenticated-guard-app.ts:76`, shared per token by `sessionChecks` at `:29`) is excepted
 * from every log claim here, as in `suites/lane-b/integration-connect-routes.spec.ts`.
 *
 * ## The findings, stated up front (each one pinned on the row it names)
 *
 * 1. **`POST /api/invite/emails` answers every refusal and every outage of its own two upstream calls with this app's
 *    bare 500: no body, no media type, no `Cache-Control` — where its sibling `POST /api/invite/resend` relays Gauzy's
 *    status and sentence, and answers an outage with 502 and its own message.** `app/api/invite/emails/route.ts:34` (the
 *    employee-role read) and `:45` (the invitation write) are awaited with no `try`/`catch`, and `serverFetch` rejects a
 *    non-2xx answer with Gauzy's body inside a rejected promise (`core/services/server/fetch.ts:125-131`), so nothing
 *    unwraps it and the throw reaches Next. Measured for 400, 401, 403 and 429 on `POST /api/invite/emails` and on
 *    `GET /api/roles/options`, and for a cut of either: `500 ""` with `content-type` absent, the mock's own entry proving
 *    the refusal happened (`POST /api/invite/emails 403`, `GET /api/roles/options 429`, `… 0`). The sibling of the same
 *    folder — `app/api/invite/resend/route.ts:40-42`, `gauzyErrorResponse(error, 'The invitation could not be sent
 *    again.')` under the comment "A refusal of the API goes back with its status and reason, as in direct mode (#5726)" —
 *    was measured in the same run (`measured4.txt`): 403 came back 403 with `{"statusCode":403,"message":"Synthetic
 *    Gauzy refusal (403)"}`, 429 came back 429, and a cut answered 502 `{"message":"The invitation could not be sent
 *    again."}`. `app/api/invite/accept/route.ts:42` and `:119` catch too, and `employee-placeholder-proxy.ts:63-65` of a
 *    route pinned in this very file relays. `MEASURED, NOT INTENDED`: the client cannot tell a refused invitation from
 *    this app failing on a route whose whole answer is the invitation list.
 * 2. **A refusal or a cut of the follow-up invitation-list read is swallowed: the route answers 200 with an empty page
 *    after the write already went out.** Measured for 400, 401, 403, 429 and 500 on `GET /api/invite` and for a cut of it
 *    — 200 `{"items":[],"total":0}` every time, while the mock had logged `POST /api/invite/emails 200` and had recorded
 *    the addresses it was given in `state().workspaceCreation.invites` (`mock-gauzy-server.mjs:537-540`): the invitations
 *    were really sent. The swallow is the helper's own intent (`requests/invite.ts:115-132`, its comment "Fallback to
 *    empty result" at `:125`), so the row is pinned without `MEASURED, NOT INTENDED`; what it costs is the caller's read:
 *    an invitation list after an invite cannot tell "nobody is invited yet" from "the list read was refused".
 *    `POST /api/roles/options` of the same request family ends in the same helper
 *    (`app/api/roles/options/route.ts` → `getAllTeamInvitationsRequest`).
 * 3. **`POST /api/auth/create-workspace` relays no upstream status at all: every failure before the tenant exists is 502
 *    `{"code":"FAILED"}`, every failure after it is 502 `{"code":"CREATED_NOT_OPENED"}` — an upstream 500 included, which
 *    stays a 502 here.** Measured for 400, 401, 403, 429 and 500 armed on `POST /api/auth/workspaces` and on
 *    `POST /api/auth/signin.workspace`, and for a cut of either; and for 400 (plus cuts) on `POST /api/tenant`,
 *    `POST /api/organization`, `POST /api/employee`, `POST /api/organization-projects`, `POST /api/organization-team` and
 *    `POST /api/auth/refresh-token`. That is what the route's own doc block promises (`route.ts:17-21`) and what
 *    `refusalOf` does: only a 403 whose message matches one of two sentences becomes a code, "Anything else is a failure,
 *    never read as one of them" (`core/services/server/create-workspace.ts:67`, `:79-86`), and `hasTenant` decides which
 *    of the two 502s it is (`:183-186`). Pinned as measured-and-intended, with the mock's own state witness for how far
 *    the chain got (`workspaceCreation.organization === null` after a refused `POST /api/tenant`).
 * 4. **The 201 of that route hands the browser a whole new session — nine `Set-Cookie` headers — and `auth-timezone` is
 *    not among them, although the caller sent one and the route read it.** Measured names in order:
 *    `auth-token_totalChunks`, `auth-token`, `auth-refresh-token`, `auth-active-team`, `auth-tenant-id`,
 *    `auth-organization-id`, `auth-active-language`, `no-team-popup-show`, `auth-user-id`, all holding the **new**
 *    workspace's ids (team `50250000-…-…000000000005`, tenant `…000000000002`, organization `…000000000003`, user
 *    `…000000000001` — the mock's `NEW_WORKSPACE` at `mock-gauzy-server.mjs:374-382`), with `auth-active-language` the
 *    caller's own value. No `auth-timezone` cookie arrived even with `auth-timezone=Europe/Berlin` on the request, because
 *    `setAuthCookies` destructures `timezone` out at `core/lib/helpers/cookies/index.ts:239` and writes the others
 *    (`:250-266`), which is what `route.ts:60-62` copies onto the answer. Pinned with the two token values masked.
 *    Not labelled: the line is commented out on purpose (`// timezone,` at `:239`), and the browser keeps the
 *    `auth-timezone` cookie it already holds, so nothing is lost — pinned as measured-and-intended.
 * 5. **A failed invitation does not fail the workspace, and `invited` counts what was deduplicated, not what was typed.**
 *    An armed 400 or a cut on `GET /api/roles/options` or on `POST /api/invite/emails` answers 201
 *    `{"invited":0,"invitesFailed":true}` with the new session cookies (`create-workspace.ts:171-181`, `route.ts:53-63`).
 *    `invites` is `[…new Set(emails.map(email => email.trim().toLowerCase()))]` after `z.email()`
 *    (`core/lib/validation/workspace.ts:16-20`): `['Dup@Example.test','dup@example.test','other@example.test']` invited 2,
 *    while `[' other@example.test ']` — a space inside the array — is refused 400 `{"code":"INVALID"}` before anything is
 *    asked, because `z.email()` runs before that `trim`. `MEASURED, NOT INTENDED` for that one body: the same file's own
 *    reader of the invite field, `inviteAddressesOf` (`core/lib/validation/workspace.ts:35-51`), trims every part before it
 *    parses it (`z.email().safeParse(part)` at `:43`) and de-duplicates in lower case (`:44-45`), so the UI accepts an
 *    address the route's schema refuses. `invited` is `input.invites.length` of the parsed list
 *    (`create-workspace.ts:176`), so 2, not 3. `POST /api/invite/emails` is the opposite:
 *    `core/lib/validation/invite.ts:13-24` neither deduplicates nor lower-cases, and the mock recorded
 *    `["dup@example.test","dup@example.test","DUP@example.test"]` for exactly that body.
 * 6. **`POST /api/employee-placeholder/bulk` checks only that its body is an object, and forwards whatever is inside it.**
 *    `{}` answers 201 echoing `{}`; `{"members":null}` answers 201 echoing `{"members":null}`; a 200 KB filler is relayed
 *    whole (`employee-placeholder-proxy.ts:35-42` asks `typeof body === 'object' && body !== null && !Array.isArray(body)`
 *    and nothing else, `:61-62` forwards the object it was given). Pinned as measured, not as a defect: its own unit test
 *    pins the refusal it does make (`core/services/server/employee-placeholder-proxy.test.ts:108-117`, "refuses a body
 *    that is not an object").
 * 7. **`PUT /api/employee/me/presence` is the one route here that both relays a refusal's status and rebuilds its own
 *    body.** 400, 401, 403, 404, 429, 500 and 502 armed on `/api/employee/me/presence` each come back with that status and
 *    Gauzy's body (`route.ts:33-39`, under the comment "pass Gauzy's status on (404 on an API without the presence
 *    endpoint), so the heartbeat can stop asking, instead of a 500" at `:31-32`); a cut answers 502
 *    `{"message":"Presence heartbeat failed"}`; and what leaves is `{isIdle}` only — `tenantId` and `organizationId`
 *    injected into the body (which the client API service adds to every PUT, as the route's own comment at `:7` says) and a
 *    200 KB filler are dropped, proven by the mock echoing `{"isIdle":true}` for a 200 KB body
 *    (`core/services/server/requests/employee.ts:104-109` builds the body itself). Its `?isIdle=false&laneProbe=7` changes
 *    nothing: the path is built by the request builder, never from the caller's query.
 * 8. **Cache-Control, measured per route: only `sign-out-others` asked for `no-store`, and even there it marks only the
 *    answers that carry an upstream body.** `forwardToGauzy` writes the header only through `answerHeaders`
 *    (`forward-to-gauzy.ts:22-28`, applied at `:130`), so `sign-out-others` carries `no-store` on its 200 and on a relayed
 *    403/429/500, and carries none on the three answers the helper mints itself — 401 (`:96`), 415 (`:104`, `:107` through
 *    `:30-31`) and the outage 502 (`failedUpstreamAnswer` `:135-144`). The other seven forwarders pass no option and carry
 *    no `Cache-Control` on any answer, although the mock marks every answer it makes `cache-control: no-store`
 *    (`mock-gauzy-server.mjs:1024`, written at `:1149`). None of the four custom handlers writes the header either — only
 *    `refuseForeignOrigin`'s 403 does (`core/services/server/same-origin-request.ts:48-53`), on all twelve — and
 *    `create-workspace` writes it on every answer it mints (`route.ts:9`). This is the habit
 *    `suites/lane-b/forward-refusals.spec.ts` and `suites/lane-b/integration-connect-routes.spec.ts` pin for their
 *    families; it is repeated per route here because these twelve are pinned nowhere else, and it is **not** written as a
 *    finding: the only answer of these twelve whose response type this repo names is `IUserSessionSignOutOthersResponse`,
 *    a count of signed-out sessions (`core/lib/auth/user-sessions.ts:45-48`), and the proof of ownership travels in the
 *    request body, not in the answer (`:40-43`).
 * 9. **No route of these twelve hands the caller's `Origin` on, and the test backend proves it.** `forwardToGauzy`
 *    forwards only the header names a route lists (`forward-to-gauzy.ts:37-45`, `:110`) and none of the eight lists one;
 *    `origin: http://localhost:3032` on each of the eight answered 200 with the mock's echo, while that mock refuses any
 *    `Origin` outside its own two (127.0.0.1:3030 / localhost:3030, `mock-gauzy-server.mjs:17`, `:1012-1016`) — so the
 *    header stopped here. The four custom handlers are checked the same way (`same-origin-request.ts:16-34`), their own
 *    upstream calls carry no `Origin`, and their armed-while-cross-site rows never reached the mock at all.
 *
 * ## Mock limits — branches this lane cannot answer, stated instead of faked
 *
 * - The mock answers `GET /api/user/me` whatever arrives (`mock-gauzy-server.mjs:560` returns the fixture user; it reads
 *   no bearer) and `authenticatedGuard` delegates the decision to it
 *   (`core/services/server/guards/authenticated-guard-app.ts:44-53`, `:76-88`), so a **signed-out** caller of the four
 *   custom handlers looks signed in: `PUT /api/employee/me/presence`, `POST /api/employee-placeholder/bulk` and
 *   `POST /api/auth/create-workspace` were measured answering 200/201/201 with no session cookies, and
 *   `POST /api/invite/emails` answered 200 with its read missing `where[tenantId]` and `where[teams][id][0]` while
 *   `state().workspaceCreation.invites.teamIds` recorded `[null]`. Their own not-logged-in answers
 *   (`presence/route.ts:15`, `employee-placeholder-proxy.ts:53`, `invite/emails/route.ts:19`, `create-workspace/route.ts:28`)
 *   are `[mock limit]` rows. The eight forwarders refuse a cookie-less caller themselves (`forward-to-gauzy.ts:96`) and an
 *   empty log is the proof.
 * - `POST /api/employee-placeholder/bulk`'s own 403 `{"message":"You may not add, claim or merge members."}`
 *   (`employee-placeholder-proxy.ts:58-60`) is unreachable here: the fixture role already holds `ORG_EMPLOYEES_EDIT`
 *   (`core/lib/utils/member-placeholder.ts:11`, the permission `canManagePlaceholders` looks for) and
 *   `scenario.extraPermissions` only **adds** upper-case names (`playwright/helpers.ts` `MockScenario.extraPermissions`).
 *   `roleName: 'SUPER_ADMIN'`, `extraPermissions` and `manager: false` are pinned as no-ops, and the permission gate is
 *   pinned instead as armed refusals on `GET /api/role-permissions/me`.
 * - `invite/emails/route.ts:19` (`{ errors: 'Unauthorized' }`) is unreachable for the same reason; the `roleId: ''` branch
 *   is pinned (it asks the role read) and its empty-role-id consequence is not.
 * - `PUT /api/employee/me/presence`'s guard refusal (`route.ts:15` → `$res`, `authenticated-guard-app.ts:96-112`) cannot be
 *   pinned: arming `/api/user/me` races the 5 s session-check memo (`:29`), which is why that read is excepted from every
 *   log claim in this file.
 * - `POST /api/auth/create-workspace`'s 403 `{"code":"ADDRESS_UNCONFIRMED"}` (`route.ts:35-37`, `:65-66`) needs a session
 *   whose `isEmailVerified === false`, which this lane's fixture user is not; the mock switches that stand in for a
 *   refusing Gauzy (`tenantRegistrationClosed`, `workspacePaywall`, `newWorkspaceRefreshFails`,
 *   `playwright/helpers.ts:82-84`) are pinned instead.
 * - The 60 s upstream timeout (`forward-to-gauzy.ts:8`) and the 15 s invitations deadline (`create-workspace.ts:27`) are not
 *   reachable from a test: the caller's own budget is the same 60 000 ms (`playwright/api-fixtures.ts:101`), and 499 needs a
 *   cancelled caller.
 * - A verb a route file does not export never reaches these handlers: Next answers 405 with no body and no media type and
 *   the mock logs nothing. `next dev` is what the lane runs, so "500 with no body and no media type" (finding 1, and every
 *   armed row of `invite/emails`) is *this lane's* Next answer for a handler that threw; a production build answers the
 *   same throw with its own text. The pinned part is that this app wrote no answer and did not relay Gauzy's status.
 * - Payloads: nine of the twelve paths have no mock handler, so their payload is the mock's catch-all — a write echoes the
 *   body it was given or `{"success":true}` (`mock-gauzy-server.mjs:826`), a GET answers an empty page (`:827`). Only
 *   `/api/invite/emails` (`:537-540`), `/api/invite` (`:614-624`), `/api/roles/options` (`:625`),
 *   `/api/role-permissions/me` (`:627`) and the workspace chain (`:391-541`) answer their own fixtures. Where a payload is
 *   the echo, these rows pin **status, headers, media type, which upstream call was made with which keys, and the mock's
 *   own record of the body** — never Gauzy's payload.
 * - A `drops` cut and a `fails` refusal are not the same witness. A refusal replaces the payload before the mock's own
 *   handler ever runs (`mock-gauzy-server.mjs:1089-1106`), so it records nothing; a cut lets that handler run and write
 *   its record, and only then destroys the socket (`:1099-1106` then `:1141-1147`). That is why "an armed 400 on
 *   `POST /api/tenant`" leaves `workspaceCreation.organization` null while "a cut of `POST /api/tenant`" has the mock
 *   recording the tenant it was asked for, and why a cut of `POST /api/invite/emails` shows `invitesFailed: true` next to
 *   addresses the mock did record. `[mock limit]`, not an app behaviour.
 * - `createOrganizationTeamRequest`'s clean-up (`core/services/server/requests/organization-team.ts:43-50`) deletes the
 *   project only when the answer named one, and the catch-all echo of `POST /api/organization-projects` names none — so
 *   the armed-400-on-the-team row pins "no `DELETE /api/organization-projects/…` was asked" as a `[mock limit]`, not as
 *   proof that this app never cleans up.
 * - No row arms a tenant-keyed path at the same time as sending a caller `?tenantId=` or `?where[tenantId]=`, because the
 *   mock reads the tenant off the query before the header (`mock-gauzy-server.mjs:1034-1037`); the query rows here carry no
 *   arm, and the arm rows carry no query, so every "which tenant did this arm belong to" claim in this file comes from the
 *   `tenant-id` header alone (`forward-to-gauzy.ts:119`, `core/services/server/fetch.ts:95-97`).
 *
 * ## Cost
 *
 * 8 routes × (control + signed out + 403 + 429 + cut) = 40; 8 × 7 body/media-type cases = 56; 8 × 6 origin rows = 48; 8
 * query rows; 8 × 2 tenant-arm rows = 16 (the third of them — "without `auth-tenant-id` the tenant-keyed arm cannot
 * fire" — is a second call inside the tenant-A row, not a test of its own); 8 × 2 verb rows = 16; 7 `Cache-Control` rows
 * on `sign-out-others`; 3 proof-body rows; `presence` 39; `employee-placeholder/bulk` 40; `invite/emails` 46; the
 * `invite/resend` contrast 20; `create-workspace` 68. **407 cases**, collected as 407 tests, every one green in both runs
 * named above, none skipped, none flaky.
 */

/** The refusals every route here is pinned on: the four the brief names, plus the two that prove a status is relayed. */
const REFUSAL_STATUSES = [400, 401, 403, 429] as const;

/** The session check every guarded route runs first (`authenticated-guard-app.ts:76`), excepted from every log claim. */
const GUARD_CHECK = '/api/user/me';

/** The media type the mock writes on every answer it makes (`mock-gauzy-server.mjs:1149`), which `forwardToGauzy` copies. */
const UPSTREAM_MEDIA_TYPE = 'application/json; charset=utf-8';
/** The media type of an answer this app wrote itself (`NextResponse.json`). */
const OWN_MEDIA_TYPE = 'application/json';

/** The mock's refusal body (`mock-gauzy-server.mjs:1100`). */
const gauzyRefusal = (status: number) => ({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });
/** The mock's answer to a write whose body it cannot read (`:826`). */
const MOCK_SUCCESS = { success: true };
/** The mock's empty page for a GET it has no handler for (`:827`). */
const MOCK_PAGE = { items: [], total: 0 };

/** What `refuseForeignOrigin` / `refuseForeignWrite` answer (`same-origin-request.ts:48-53`). */
const FOREIGN_SITE_REFUSAL: Answer = ownJson(
	403,
	{ statusCode: 403, message: 'Cross-site request refused' },
	'no-store'
);
/** What `forwardToGauzy` answers a caller with no token cookie, before anything is asked (`:96`). */
const REFUSED_BY_THIS_APP: Answer = ownJson(401, { statusCode: 401, message: 'Unauthorized' }, null);
/** What it answers when the upstream gave no answer at all (`failedUpstreamAnswer`, `:135-144`). */
const UNREACHABLE: Answer = ownJson(502, { statusCode: 502, message: 'The Gauzy API is unreachable' }, null);
/** Its media-type refusal (`:30-31`, reached from `:104` or `:107`). */
const UNSUPPORTED_MEDIA: Answer = ownJson(415, { statusCode: 415, message: 'Unsupported Media Type' }, null);
/** What `next dev` answers a handler that threw — `POST /api/invite/emails` of finding 1. */
const HANDLER_CRASH: Answer = { status: 500, text: '', contentType: null, cacheControl: null };
/** What Next answers a verb the route file does not export. */
const VERB_NOT_EXPORTED: Answer = { status: 405, text: '', contentType: null, cacheControl: null };

const NOT_INTENDED = ' [MEASURED, NOT INTENDED]';
const MOCK_LIMIT = ' [mock limit]';

/** A 200 KB filler: no route here looks at a byte count, and two of them rewrite the body instead of forwarding it. */
const HUGE = 'x'.repeat(200_000);
/** The addresses `POST /api/invite/emails` is measured with, and the ones its schema refuses. */
const INVITE_EMAILS = ['lane-invited@example.test'];
const MANY_EMAILS = (count: number) => Array.from({ length: count }, (_, index) => `lane${index}@example.test`);

/** The upstream paths, spelled as the mock records them: `GAUZY_API_SERVER_URL` is the lane base plus `/api`. */
const UP_SIGN_OUT = '/api/auth/sessions/sign-out-others';
const UP_CHAT_CATEGORIES = '/api/chat/categories/reorder';
const UP_CHAT_READ_ALL = '/api/chat/read-all';
const UP_CHAT_READ_RESTORE = '/api/chat/read-restore';
const UP_DOCS_REORDER = '/api/plugins/docs/documents/reorder';
const UP_AUTOMATIONS_ORDER = '/api/task-automations/order';
const UP_STATUSES_REORDER = '/api/task-statuses/reorder';
const UP_TASKS_BULK = '/api/tasks/bulk-update';
const UP_PRESENCE = '/api/employee/me/presence';
const UP_BULK = '/api/employee-placeholder/bulk';
const UP_PERMISSIONS = '/api/role-permissions/me';
const UP_INVITE_WRITE = '/api/invite/emails';
const UP_INVITE_READ = '/api/invite';
const UP_ROLE_OPTIONS = '/api/roles/options';
const UP_RESEND = '/api/invite/resend';
const UP_WS_OPEN = '/api/auth/workspaces';
const UP_WS_SIGNIN = '/api/auth/signin.workspace';
const UP_TENANT = '/api/tenant';
const UP_ORGANIZATION = '/api/organization';
const UP_EMPLOYEE = '/api/employee';
const UP_PROJECTS = '/api/organization-projects';
const UP_TEAM = '/api/organization-team';
const UP_REFRESH = '/api/auth/refresh-token';

/** The workspace the mock creates for this route's chain (`mock-gauzy-server.mjs:374-382`). */
const NEW = {
	userId: '50250000-0000-4000-8000-000000000001',
	tenantId: '50250000-0000-4000-8000-000000000002',
	organizationId: '50250000-0000-4000-8000-000000000003',
	employeeId: '50250000-0000-4000-8000-000000000004',
	teamId: '50250000-0000-4000-8000-000000000005'
};

/** One upstream call a route makes, and what its query must look like. */
type Ask = {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH';
	path: string;
	/** The query keys the mock recorded, sorted — a renamed path or a lost/extra scoping key turns this red. */
	keys: string[];
	/** Keys that must NOT be there (a caller key a request builder drops). */
	absent?: string[];
	/** The values that must arrive under these keys, where the value is the point. */
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
	/** The `cache-control`, or `null` for "carries none" — which is the point of finding 8. */
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

/** A Gauzy refusal relayed by `forwardToGauzy`: Gauzy's status, body and media type (`:128-131`). */
const relayedByForward = (status: number, noStore: boolean): Answer => ({
	status,
	body: gauzyRefusal(status),
	contentType: UPSTREAM_MEDIA_TYPE,
	cacheControl: noStore ? 'no-store' : null
});

/** The mock's catch-all echo of a body, copied through the proxy with the upstream's media type. */
const echoedByUpstream = (body: unknown, noStore: boolean): Answer => ({
	status: 200,
	body,
	contentType: UPSTREAM_MEDIA_TYPE,
	cacheControl: noStore ? 'no-store' : null
});

/** One of the eight `forwardToGauzy` write one-liners. */
type ForwardRoute = {
	label: string;
	/** The verb the route file exports. */
	method: 'POST' | 'PUT' | 'PATCH';
	/** The app route, spelled as `api()` is called with it. */
	app: string;
	/** The path the route fixed for the helper (`forward-to-gauzy.ts:112` prepends `GAUZY_API_SERVER_URL`). */
	up: string;
	/** The route file and line that calls the helper, and whether it passed `{ noStore: true }`. */
	source: string;
	noStore: boolean;
	/** The body this route's own client sends. */
	body: (ids: Record<string, string>) => Record<string, unknown>;
	/** Two verbs the file does not export (`next dev` answers 405 for them). */
	unexported: ['POST' | 'PUT' | 'PATCH' | 'DELETE', 'POST' | 'PUT' | 'PATCH' | 'DELETE'];
};

const FORWARD_ROUTES: ForwardRoute[] = [
	{
		label: 'POST /api/auth/sessions/sign-out-others',
		method: 'POST',
		app: '/api/auth/sessions/sign-out-others',
		up: UP_SIGN_OUT,
		// The only one of the twelve that passes an option: `forwardToGauzy(req, path, { noStore: true })`.
		source: 'app/api/auth/sessions/sign-out-others/route.ts:9',
		noStore: true,
		body: () => ({ password: 'lane-b-proof' }),
		unexported: ['PUT', 'DELETE']
	},
	{
		label: 'POST /api/chat/categories/reorder',
		method: 'POST',
		app: '/api/chat/categories/reorder',
		up: UP_CHAT_CATEGORIES,
		source: 'app/api/chat/categories/reorder/route.ts:5',
		noStore: false,
		body: () => ({ categoryIds: ['lane-cat-1', 'lane-cat-2'], channels: [{ id: 'lane-ch-1', position: 0 }] }),
		unexported: ['PUT', 'DELETE']
	},
	{
		label: 'POST /api/chat/read-all',
		method: 'POST',
		app: '/api/chat/read-all',
		up: UP_CHAT_READ_ALL,
		source: 'app/api/chat/read-all/route.ts:5',
		noStore: false,
		body: () => ({}),
		unexported: ['PUT', 'DELETE']
	},
	{
		label: 'POST /api/chat/read-restore',
		method: 'POST',
		app: '/api/chat/read-restore',
		up: UP_CHAT_READ_RESTORE,
		source: 'app/api/chat/read-restore/route.ts:5',
		noStore: false,
		body: () => ({ snapshotId: 'lane-snapshot' }),
		unexported: ['PUT', 'DELETE']
	},
	{
		label: 'POST /api/plugins/docs/documents/reorder',
		method: 'POST',
		app: '/api/plugins/docs/documents/reorder',
		up: UP_DOCS_REORDER,
		source: 'app/api/plugins/docs/documents/reorder/route.ts:5',
		noStore: false,
		body: () => ({ parentId: null, orderedIds: ['lane-doc-1', 'lane-doc-2'] }),
		unexported: ['PUT', 'DELETE']
	},
	{
		label: 'PUT /api/task-automations/order',
		method: 'PUT',
		app: '/api/task-automations/order',
		up: UP_AUTOMATIONS_ORDER,
		source: 'app/api/task-automations/order/route.ts:5',
		noStore: false,
		body: (ids) => ({ ids: ['lane-rule-1', 'lane-rule-2'], organizationId: ids.organizationA }),
		unexported: ['POST', 'DELETE']
	},
	{
		label: 'PATCH /api/task-statuses/reorder',
		method: 'PATCH',
		app: '/api/task-statuses/reorder',
		up: UP_STATUSES_REORDER,
		// `export function PATCH`, not a re-export, and `task-statuses/[id]` has no PATCH at all.
		source: 'app/api/task-statuses/reorder/route.ts:8',
		noStore: false,
		body: (ids) => ({ organizationId: ids.organizationA, reorder: [{ id: 'lane-status-1', order: 1 }] }),
		unexported: ['POST', 'DELETE']
	},
	{
		label: 'POST /api/tasks/bulk-update',
		method: 'POST',
		app: '/api/tasks/bulk-update',
		up: UP_TASKS_BULK,
		source: 'app/api/tasks/bulk-update/route.ts:5',
		noStore: false,
		body: (ids) => ({
			organizationId: ids.organizationA,
			tenantId: ids.tenantA,
			taskIds: [ids.task],
			changes: { priority: 'HIGH' }
		}),
		unexported: ['PUT', 'DELETE']
	}
];

const bodyOf = (route: ForwardRoute, ids: Record<string, string>): Record<string, unknown> => route.body(ids);
const askOf = (route: ForwardRoute): Ask => ({ method: route.method, path: route.up, keys: [] });

/** The mock's entry for one path, or nothing when the mock was never asked. */
const asksFor = (requests: StubRequest[], path: string): StubRequest[] =>
	requests.filter((request) => request.path === path);

/** The query keys one recorded call carried, sorted and de-duplicated. */
const keysOf = (request: { query: string }): string[] =>
	[...new Set([...new URLSearchParams(request.query).keys()])].sort();

const valuesOf = (request: StubRequest, wanted: Record<string, string>) => {
	const params = new URLSearchParams(request.query);
	return Object.fromEntries(
		Object.keys(wanted)
			.sort((a, b) => a.localeCompare(b))
			.map((key) => [key, params.get(key) ?? null])
	);
};

const wantedValues = (wanted: Record<string, unknown>) =>
	Object.fromEntries(Object.entries(wanted).sort(([a], [b]) => a.localeCompare(b)));

/** One recorded call as the line a failure message quotes: `POST /api/x 200 keys=[a,b]`. */
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
	/** An object goes as JSON, a string as it arrived, a `Buffer` as raw bytes. */
	body?: unknown;
	/** Send no body at all. */
	noBody?: boolean;
	/** A `Content-Type` of its own; `''` declares none. */
	contentType?: string;
	headers?: Record<string, string>;
	anonymous?: boolean;
	scope?: 'A' | 'B';
	/** The session built from the fixture's cookies minus this one name. */
	cookieWithout?: string;
	/** A `Cookie:` pair the fixture does not carry, appended to the fixture's own session (`auth-timezone=…`). */
	cookieExtra?: string;
};

type RouteRef = { app: string; method: 'GET' | 'POST' | 'PUT' | 'PATCH' };

async function callApp(
	api: ApiCall,
	cookies: CookieComposer,
	route: RouteRef,
	ids: Record<string, string>,
	override: CallOverride = {}
): Promise<{ response: APIResponse; text: string; path: string }> {
	const path = override.path ?? route.app;
	const method = override.method ?? route.method;
	const headers: Record<string, string> = { ...(override.headers ?? {}) };
	if (override.contentType !== undefined) headers['content-type'] = override.contentType;
	if (override.cookieWithout || override.cookieExtra) {
		const session = cookies(override.scope ?? 'A', override.cookieWithout ? [override.cookieWithout] : []);
		headers.cookie = override.cookieExtra ? `${session}${override.cookieExtra}` : session;
	}

	const response = await api(path, {
		method,
		...(override.noBody || override.body === undefined ? {} : { body: override.body }),
		...(override.anonymous ? { anonymous: true } : {}),
		...(override.scope ? { scope: override.scope } : {}),
		...(Object.keys(headers).length ? { headers } : {})
	});
	return { response, text: await response.text(), path };
}

/** The assertions every case shares: the upstream asks and their scoping values, and the answer this route gave. */
function expectRouteAnswer(
	asked: Ask[],
	/** The status the mock recorded for every ask of this case that names none of its own: 200, an armed 4xx, or 0. */
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
		expect(mismatch, `${why}: the answer body no longer has the shape this route answers — ${witness}`).toBeNull();
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

	// Every expected ask, grouped by path, against what the mock recorded for that same path: verb, path, status and the
	// sorted query keys. A renamed path, a dropped verb, a lost scoping key or an extra ask all red.
	const expected = new Map<string, string[]>();
	for (const ask of asked)
		expected.set(ask.path, [...(expected.get(ask.path) ?? []), expectedLine(ask, ask.status ?? askedStatus)]);
	const recorded = new Map<string, string[]>();
	for (const askPath of expected.keys())
		recorded.set(
			askPath,
			asksFor(log, askPath).map((entry) => lineOf(entry))
		);
	expect(
		[...expected.keys()].map((askPath) => `${askPath} :: ${recorded.get(askPath)?.join(' + ') ?? 'nothing'}`),
		`${why}: the upstream calls are no longer the ones this route makes — ${witness}`
	).toEqual([...expected.keys()].map((askPath) => `${askPath} :: ${(expected.get(askPath) ?? []).join(' + ')}`));

	// Nothing else was asked. `GET /api/user/me` is excepted on purpose: the session check answers are reused per token for
	// `SESSION_CHECK_MEMO_TTL_MS` (`authenticated-guard-app.ts:29`, `guards/session-check-memo.ts`), so whether that read
	// lands in this log depends on what ran seconds earlier — never on the route under test.
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
				`${why}: ${ask.path} was asked with ${JSON.stringify(present)}, which this route is measured not to send — ` +
					`${witness}`
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

/** The two cookie names whose value is a session token: measured by name only, never printed. */
const TOKEN_COOKIES = new Set(['auth-token', 'auth-refresh-token']);

async function writtenCookies(response: APIResponse): Promise<string[]> {
	return (await response.headersArray())
		.filter((header) => header.name.toLowerCase() === 'set-cookie')
		.map((header) => header.value.split(';')[0]);
}

const maskCookies = (pairs: string[]): string[] =>
	pairs.map((pair) => {
		const [name, ...rest] = pair.split('=');
		return `${name}=${TOKEN_COOKIES.has(name) ? '[token, not printed]' : rest.join('=')}`;
	});

/** The `Set-Cookie` headers of an answer: the names in order, the values that are not a token, and what must be absent. */
async function expectWrittenCookies(
	response: APIResponse,
	expected: { names: string[]; values?: Record<string, string>; absent?: string[] },
	why: string
) {
	const written = await writtenCookies(response);
	expect(
		written.map((pair) => pair.split('=')[0]),
		`${why}: the cookies written moved off ${JSON.stringify(expected.names)} — ${JSON.stringify(maskCookies(written))}`
	).toEqual(expected.names);
	if (expected.values) {
		const seen = Object.fromEntries(
			Object.keys(expected.values)
				.sort((a, b) => a.localeCompare(b))
				.map((name) => {
					const pair = written.find((candidate) => candidate.split('=')[0] === name);
					return [name, pair ? pair.slice(name.length + 1) : null];
				})
		);
		expect(seen, `${why}: the cookie values moved — ${JSON.stringify(maskCookies(written))}`).toEqual(
			wantedValues(expected.values)
		);
	}
	if (expected.absent?.length) {
		const names = written.map((pair) => pair.split('=')[0]);
		expect(
			names.filter((name) => expected.absent?.includes(name)),
			`${why}: a cookie this route is measured not to write was written — ${JSON.stringify(maskCookies(written))}`
		).toEqual([]);
	}
	return written;
}

/** `state().workspaceCreation` as the mock left it (`mock-gauzy-server.mjs:992-999`, exposed at `:1185`). */
async function creationWitness(mock: {
	state: () => Promise<Record<string, unknown>>;
}): Promise<Record<string, unknown>> {
	return ((await mock.state()).workspaceCreation ?? {}) as Record<string, unknown>;
}

/** A value that may depend on the fixture ids. */
type WithIds<T> = T | ((ids: Record<string, string>) => T);
const resolve = <T>(value: WithIds<T>, ids: Record<string, string>): T =>
	typeof value === 'function' ? (value as (ids: Record<string, string>) => T)(ids) : value;

/** One pinned case of a custom handler: how to call it, what the mock is armed with, what it must answer. */
type Case = {
	label: string;
	/** ` [MEASURED, NOT INTENDED]` or ` [mock limit]`, appended to the test name. */
	note?: string;
	call?: WithIds<CallOverride>;
	arm?: WithIds<MockScenario>;
	/** The upstream calls this case causes, in the order the mock recorded them. */
	asks: WithIds<Ask[]>;
	/** The status the mock recorded for every ask that names none of its own. */
	askedStatus?: number;
	answer: WithIds<Answer>;
	/** Keys of `state().workspaceCreation` this case must leave behind — the body witness where the mock has a handler. */
	creation?: WithIds<Record<string, unknown>>;
	/** The `Set-Cookie` headers the answer must write (names, non-token values) and must not write. */
	writes?: WithIds<{ names: string[]; values?: Record<string, string>; absent?: string[] }>;
	/** The lines `mock.failures()` must hold: `[]` for a control, the armed call for an armed row. */
	failures?: WithIds<string[]>;
};

function pinCases(prefix: string, route: RouteRef, cases: Case[]) {
	for (const c of cases) {
		test(`${prefix}: ${c.label}${c.note ?? ''}`, async ({ api, mock, ids, cookies }) => {
			if (c.arm) await mock.scenario(resolve(c.arm, ids));
			const asked = resolve(c.asks, ids);
			const { response, text, path } = await callApp(api, cookies, route, ids, resolve(c.call ?? {}, ids));
			const log = await mock.requests();

			console.log(
				`[lane-b writes] MEASURE ${prefix} :: ${c.label} ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			expectRouteAnswer(
				asked,
				c.askedStatus ?? 200,
				response,
				text,
				path,
				log,
				resolve(c.answer, ids),
				`${prefix} ${c.label}`
			);

			if (c.failures) {
				expect(
					triples(await mock.failures()),
					`${prefix} ${c.label}: the calls the mock refused moved — ${logOf(await mock.requests())}`
				).toEqual(resolve(c.failures, ids));
			}
			if (c.creation) {
				const want = resolve(c.creation, ids);
				const got = await creationWitness(mock);
				expect(
					Object.fromEntries(
						Object.keys(want)
							.sort((a, b) => a.localeCompare(b))
							.map((key) => [key, got[key] ?? null])
					),
					`${prefix} ${c.label}: the mock's own record of what this route was asked moved — ` +
						`${JSON.stringify(got).slice(0, 400)}`
				).toEqual(wantedValues(want));
			}
			if (c.writes) await expectWrittenCookies(response, resolve(c.writes, ids), `${prefix} ${c.label}`);
		});
	}
}

/** The `?…` every forward row is measured with: three keys, two naming the fixture's other tenant and organization. */
const probeQuery = (ids: Record<string, string>) =>
	`?organizationId=${ids.organizationB}&laneProbe=7&where%5BtenantId%5D=${ids.tenantB}`;
const probeQueryKeys = ['laneProbe', 'organizationId', 'where[tenantId]'];

/** The two armed refusals each of the eight is pinned on: one written as a bare path, one on the session tenant. */
const FORWARD_ARMS = [
	{ label: 'an armed 403 on its own path', tenantScoped: false, status: 403 },
	{ label: 'an armed 429 on <tenant A>:<its path>', tenantScoped: true, status: 429 }
];

test.describe('lane-b · the eight forwardToGauzy write one-liners, each pinned on the path it fixed', () => {
	for (const route of FORWARD_ROUTES) {
		const routeRef: RouteRef = { app: route.app, method: route.method };

		test(`${route.label}: control — one call, on this path, with this body (${route.source})`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const asked = [askOf(route)];
			const { response, text, path } = await callApp(api, cookies, routeRef, ids, { body: bodyOf(route, ids) });
			const log = await mock.requests();

			console.log(`[lane-b writes] MEASURE control ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				echoedByUpstream(bodyOf(route, ids), route.noStore),
				`${route.label} control`
			);
			// A control is an answer, not a refusal: nothing in this log may carry a 4xx/5xx.
			expect(
				await mock.failures(),
				`${route.label}: the control caused a refused upstream call (${logOf(log)})`
			).toEqual([]);
		});

		test(`${route.label}: signed out — this app refuses it and asks nothing`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const { response, text, path } = await callApp(api, cookies, routeRef, ids, {
				body: bodyOf(route, ids),
				anonymous: true
			});
			const log = await mock.requests();

			console.log(`[lane-b writes] MEASURE signed-out ${witnessOf(path, response, text, log, [])}`);

			expectRouteAnswer([], 200, response, text, path, log, REFUSED_BY_THIS_APP, `${route.label} signed out`);
			// An empty log is the proof that this app, and not the platform, refused (`forward-to-gauzy.ts:96`).
			expect(
				triples(log),
				`${route.label}: a caller with no session cookie reached the test backend (${logOf(log)})`
			).toEqual([]);
		});

		for (const arm of FORWARD_ARMS) {
			test(`${route.label}: ${arm.label} is relayed as it arrived${route.noStore ? '' : ', with no Cache-Control'}`, async ({
				api,
				mock,
				ids,
				cookies
			}) => {
				const key = arm.tenantScoped ? `${ids.tenantA}:${route.up}` : route.up;
				await mock.scenario({ fails: { [key]: arm.status } });
				const asked = [{ ...askOf(route), status: arm.status }];
				const { response, text, path } = await callApp(api, cookies, routeRef, ids, {
					body: bodyOf(route, ids)
				});
				const log = await mock.requests();

				console.log(
					`[lane-b writes] MEASURE armed-${arm.status} ${witnessOf(path, response, text, log, pathsOf(asked))}`
				);

				expectRouteAnswer(
					asked,
					arm.status,
					response,
					text,
					path,
					log,
					relayedByForward(arm.status, route.noStore),
					`${route.label} with ${key} armed ${arm.status}`
				);
				expect(
					triples(await mock.failures()),
					`${route.label}: the armed ${arm.status} is missing from the failures view (${logOf(log)})`
				).toEqual([`${route.method} ${route.up} ${arm.status}`]);
			});
		}

		test(`${route.label}: a cut of its upstream call is this app's own 502 with its own media type`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			await mock.scenario({ drops: { [`${ids.tenantA}:${route.up}`]: 1 } });
			const asked = [{ ...askOf(route), status: 0 }];
			const { response, text, path } = await callApp(api, cookies, routeRef, ids, { body: bodyOf(route, ids) });
			const log = await mock.requests();

			console.log(`[lane-b writes] MEASURE cut ${witnessOf(path, response, text, log, pathsOf(asked))}`);

			expectRouteAnswer(
				asked,
				0,
				response,
				text,
				path,
				log,
				UNREACHABLE,
				`${route.label} with ${ids.tenantA}:${route.up} cut`
			);
			expect(
				await mock.failures(),
				`${route.label}: a cut call was counted as a refusal, which would make every "was refused upstream" witness in ` +
					`this lane mean two things (${logOf(log)})`
			).toEqual([]);
		});
	}
});

/** One measured body or media-type case for one of the eight forward writes. */
type ForwardBodyShape = {
	label: string;
	/** An object goes as JSON, a string as it arrived, a `Buffer` as raw bytes. */
	send?: (ids: Record<string, string>, route: ForwardRoute) => unknown;
	contentType?: string;
	noBody?: boolean;
	/** `false` pins "the mock was asked nothing at all". */
	asked: boolean;
	answer: (ids: Record<string, string>, route: ForwardRoute) => Answer;
	note?: string;
};

const FORWARD_BODY_SHAPES: ForwardBodyShape[] = [
	{
		label: 'no body at all — 200, the write went out',
		noBody: true,
		asked: true,
		// A write with neither a body nor a declared type is not a media-type problem (`forward-to-gauzy.ts:103-107`).
		answer: (ids, route) => echoedByUpstream(MOCK_SUCCESS, route.noStore)
	},
	{
		label: 'an application/x-www-form-urlencoded body — 415, nothing asked',
		send: (ids) => `organizationId=${ids.organizationA}`,
		contentType: 'application/x-www-form-urlencoded',
		asked: false,
		answer: () => UNSUPPORTED_MEDIA
	},
	{
		label: 'a JSON body declared as text/plain — 415, nothing asked',
		send: (ids, route) => JSON.stringify(bodyOf(route, ids)),
		contentType: 'text/plain',
		asked: false,
		answer: () => UNSUPPORTED_MEDIA
	},
	{
		label: 'a JSON body with no media type declared — 415, nothing asked',
		send: (ids, route) => JSON.stringify(bodyOf(route, ids)),
		contentType: '',
		asked: false,
		answer: () => UNSUPPORTED_MEDIA
	},
	{
		label: 'unparseable bytes under application/json — 200, relayed unread',
		send: () => Buffer.from('not json at all {'),
		contentType: 'application/json',
		asked: true,
		// The proxy hands the bytes on without parsing them (`:106`, `:121`); the mock could not read them and answered
		// its catch-all (`mock-gauzy-server.mjs:826`).
		answer: (ids, route) => echoedByUpstream(MOCK_SUCCESS, route.noStore)
	},
	{
		label: 'an unknown key is the whole body — 200, relayed',
		send: () => ({ nope: 1 }),
		asked: true,
		answer: (ids, route) => echoedByUpstream({ nope: 1 }, route.noStore)
	},
	{
		label: 'a 200 KB body is relayed whole — 200, no size cap on this family',
		send: (ids, route) => ({ ...bodyOf(route, ids), huge: HUGE }),
		asked: true,
		answer: (ids, route) => ({
			status: 200,
			shape: (body) => {
				const record = body as Record<string, unknown> | null;
				if (typeof record?.huge !== 'string') return 'the answer holds no "huge" string';
				if (record.huge.length !== HUGE.length)
					return `the "huge" string arrived ${record.huge.length} chars, not ${HUGE.length}`;
				return null;
			},
			contentType: UPSTREAM_MEDIA_TYPE,
			cacheControl: route.noStore ? 'no-store' : null
		})
	}
];

test.describe('lane-b · what the eight forward writes do with a body, and which bodies never leave this app', () => {
	for (const route of FORWARD_ROUTES) {
		for (const shape of FORWARD_BODY_SHAPES) {
			test(`${route.label}: ${shape.label}`, async ({ api, mock, ids, cookies }) => {
				const { response, text, path } = await callApp(
					api,
					cookies,
					{ app: route.app, method: route.method },
					ids,
					{
						...(shape.send === undefined ? {} : { body: shape.send(ids, route) }),
						...(shape.contentType === undefined ? {} : { contentType: shape.contentType }),
						...(shape.noBody ? { noBody: true } : {})
					}
				);
				const log = await mock.requests();
				const asked = shape.asked ? [askOf(route)] : [];

				console.log(
					`[lane-b writes] MEASURE body-shape ${witnessOf(path, response, text, log, pathsOf(asked))}`
				);

				expectRouteAnswer(
					asked,
					200,
					response,
					text,
					path,
					log,
					shape.answer(ids, route),
					`${route.label} with ${shape.label}`
				);
				if (!shape.asked)
					expect(
						triples(log),
						`${route.label}: ${shape.label} still reached the test backend (${logOf(log)})`
					).toEqual([]);
			});
		}
	}
});

/** The three headers that say "another site", and the two that say "this app's own page". */
const FOREIGN_HEADERS: { label: string; headers: Record<string, string> }[] = [
	{ label: 'Sec-Fetch-Site: cross-site', headers: { 'sec-fetch-site': 'cross-site' } },
	{ label: 'Sec-Fetch-Site: same-site', headers: { 'sec-fetch-site': 'same-site' } },
	{ label: 'Origin: https://evil.example', headers: { origin: 'https://evil.example' } }
];
const OWN_HEADERS: { label: string; headers: Record<string, string> }[] = [
	{ label: 'Origin: http://localhost:3032', headers: { origin: 'http://localhost:3032' } },
	{ label: 'Sec-Fetch-Site: same-origin', headers: { 'sec-fetch-site': 'same-origin' } }
];

test.describe('lane-b · every one of the eight refuses a caller that came from another site, before anything is read', () => {
	for (const route of FORWARD_ROUTES) {
		for (const foreign of FOREIGN_HEADERS) {
			test(`${route.label}: ${foreign.label} is 403 with no-store, and nothing was asked`, async ({
				api,
				mock,
				ids,
				cookies
			}) => {
				const { response, text, path } = await callApp(
					api,
					cookies,
					{ app: route.app, method: route.method },
					ids,
					{
						body: bodyOf(route, ids),
						headers: foreign.headers
					}
				);
				const log = await mock.requests();

				console.log(`[lane-b writes] MEASURE foreign ${witnessOf(path, response, text, log, [])}`);

				expectRouteAnswer(
					[],
					403,
					response,
					text,
					path,
					log,
					FOREIGN_SITE_REFUSAL,
					`${route.label} with ${foreign.label}`
				);
				expect(
					triples(log),
					`${route.label}: a foreign ${foreign.label} reached the test backend (${logOf(log)})`
				).toEqual([]);
			});
		}

		test(`${route.label}: a bodiless cross-site write is refused too — the check runs before the media-type check`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const { response, text, path } = await callApp(
				api,
				cookies,
				{ app: route.app, method: route.method },
				ids,
				{
					noBody: true,
					headers: { 'sec-fetch-site': 'cross-site' }
				}
			);
			const log = await mock.requests();

			console.log(`[lane-b writes] MEASURE foreign-bodiless ${witnessOf(path, response, text, log, [])}`);

			// `forward-to-gauzy.ts:89-90` runs before `:102-107`: the refusal is the site check's, not the 415's.
			expectRouteAnswer(
				[],
				403,
				response,
				text,
				path,
				log,
				FOREIGN_SITE_REFUSAL,
				`${route.label} cross-site and bodiless`
			);
			expect(
				triples(log),
				`${route.label}: a bodiless foreign write reached the test backend (${logOf(log)})`
			).toEqual([]);
		});

		for (const own of OWN_HEADERS) {
			test(`${route.label}: ${own.label} is the control answer, and the mock never saw the header`, async ({
				api,
				mock,
				ids,
				cookies
			}) => {
				const asked = [askOf(route)];
				const { response, text, path } = await callApp(
					api,
					cookies,
					{ app: route.app, method: route.method },
					ids,
					{
						body: bodyOf(route, ids),
						headers: own.headers
					}
				);
				const log = await mock.requests();

				console.log(
					`[lane-b writes] MEASURE own-origin ${witnessOf(path, response, text, log, pathsOf(asked))}`
				);

				expectRouteAnswer(
					asked,
					200,
					response,
					text,
					path,
					log,
					echoedByUpstream(bodyOf(route, ids), route.noStore),
					`${route.label} with ${own.label}`
				);
				// Finding 9: the mock refuses every Origin outside its own two (mock-gauzy-server.mjs:17, :1012-1016), so a
				// 200 echo proves `Origin: http://localhost:3032` was not forwarded (`forward-to-gauzy.ts:37-45`, `:110`).
			});
		}
	}
});

test.describe('lane-b · the query a caller puts on these eight paths travels unchanged', () => {
	for (const route of FORWARD_ROUTES) {
		test(`${route.label}: three keys travel, values and all, while the tenant header stays the session's`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			const asked: Ask[] = [
				{
					...askOf(route),
					path: route.up,
					keys: probeQueryKeys,
					values: {
						laneProbe: '7',
						organizationId: ids.organizationB,
						'where[tenantId]': ids.tenantB
					}
				}
			];
			const { response, text, path } = await callApp(
				api,
				cookies,
				{ app: route.app, method: route.method },
				ids,
				{
					path: `${route.app}${probeQuery(ids)}`,
					body: bodyOf(route, ids)
				}
			);
			const log = await mock.requests();

			console.log(
				`[lane-b writes] MEASURE query-travels ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			// `forward-to-gauzy.ts:112` appends `new URL(req.url).search` to the path the route fixed.
			expectRouteAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				echoedByUpstream(bodyOf(route, ids), route.noStore),
				`${route.label} with ${probeQuery(ids)}`
			);
		});
	}
});

test.describe('lane-b · an arm addressed to the session tenant fires on all eight; the same arm on the other tenant does not', () => {
	for (const route of FORWARD_ROUTES) {
		test(`${route.label}: fails["<tenant B>:<its path>"] never fires for a tenant A session`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			await mock.scenario({ fails: { [`${ids.tenantB}:${route.up}`]: 403 } });
			const asked = [askOf(route)];
			const { response, text, path } = await callApp(
				api,
				cookies,
				{ app: route.app, method: route.method },
				ids,
				{
					body: bodyOf(route, ids)
				}
			);
			const log = await mock.requests();

			console.log(
				`[lane-b writes] MEASURE arm-tenantB-nofire ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			expectRouteAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				echoedByUpstream(bodyOf(route, ids), route.noStore),
				`${route.label} with ${ids.tenantB}:${route.up} armed 403`
			);
		});

		test(`${route.label}: with auth-tenant-id gone the tenant-keyed arm cannot fire, while the same arm as a bare path does`, async ({
			api,
			mock,
			ids,
			cookies
		}) => {
			await mock.scenario({ fails: { [`${ids.tenantA}:${route.up}`]: 403 } });
			const asked = [askOf(route)];
			const { response, text, path } = await callApp(
				api,
				cookies,
				{ app: route.app, method: route.method },
				ids,
				{
					body: bodyOf(route, ids),
					cookieWithout: 'auth-tenant-id'
				}
			);
			const log = await mock.requests();

			console.log(
				`[lane-b writes] MEASURE arm-cannot-fire ${witnessOf(path, response, text, log, pathsOf(asked))}`
			);

			// `forward-to-gauzy.ts:119` writes the header only when a tenant cookie exists, and the mock keys the arm off it
			// (`mock-gauzy-server.mjs:1034-1037`, `:1089-1093`).
			expectRouteAnswer(
				asked,
				200,
				response,
				text,
				path,
				log,
				echoedByUpstream(bodyOf(route, ids), route.noStore),
				`${route.label} with no auth-tenant-id and ${ids.tenantA}:${route.up} armed`
			);

			await mockReset();
			await mock.scenario({ fails: { [route.up]: 403 } });
			const bare = await callApp(api, cookies, { app: route.app, method: route.method }, ids, {
				body: bodyOf(route, ids),
				cookieWithout: 'auth-tenant-id'
			});
			const bareLog = await mock.requests();

			console.log(
				`[lane-b writes] MEASURE arm-bare-fires ${witnessOf(bare.path, bare.response, bare.text, bareLog, pathsOf(asked))}`
			);

			expectRouteAnswer(
				[{ ...askOf(route), status: 403 }],
				403,
				bare.response,
				bare.text,
				bare.path,
				bareLog,
				relayedByForward(403, route.noStore),
				`${route.label} with the bare path armed and no auth-tenant-id`
			);
		});
	}
});

test.describe('lane-b · a verb these eight route files do not export never reaches their handlers', () => {
	for (const route of FORWARD_ROUTES) {
		for (const verb of route.unexported) {
			test(`${route.label}: ${verb} is 405 with no body, no media type and nothing asked`, async ({
				api,
				mock,
				ids,
				cookies
			}) => {
				const { response, text, path } = await callApp(
					api,
					cookies,
					{ app: route.app, method: route.method },
					ids,
					{
						method: verb,
						body: bodyOf(route, ids)
					}
				);
				const log = await mock.requests();

				console.log(`[lane-b writes] MEASURE verb-${verb} ${witnessOf(path, response, text, log, [])}`);

				expectRouteAnswer(
					[],
					405,
					response,
					text,
					path,
					log,
					VERB_NOT_EXPORTED,
					`${route.label} asked with ${verb}`
				);
				expect(triples(log), `${route.label}: ${verb} reached the test backend (${logOf(log)})`).toEqual([]);
			});
		}
	}
});

const SIGN_OUT: RouteRef = { app: '/api/auth/sessions/sign-out-others', method: 'POST' };
const SIGN_OUT_ASK: Ask = { method: 'POST', path: UP_SIGN_OUT, keys: [] };
const SIGN_OUT_PROOF = { password: 'lane-b-proof' };

/**
 * Finding 8, pinned on the one route of the twelve that asked for `no-store`: the option reaches `answerHeaders`
 * (`forward-to-gauzy.ts:22-28`, applied at `:130`), which only ever runs on an answer that carries the upstream's body.
 */
test.describe('lane-b · Cache-Control on POST /api/auth/sessions/sign-out-others: no-store on the relayed answers, none on its own', () => {
	pinCases('sign-out-others cache header', SIGN_OUT, [
		{
			label: 'the 200 carries no-store',
			call: { body: SIGN_OUT_PROOF },
			asks: [SIGN_OUT_ASK],
			answer: echoedByUpstream(SIGN_OUT_PROOF, true)
		},
		{
			label: 'a relayed 403 carries no-store',
			call: { body: SIGN_OUT_PROOF },
			arm: { fails: { [UP_SIGN_OUT]: 403 } },
			asks: [{ ...SIGN_OUT_ASK, status: 403 }],
			askedStatus: 403,
			answer: relayedByForward(403, true)
		},
		{
			label: 'a relayed 429 carries no-store',
			call: { body: SIGN_OUT_PROOF },
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_SIGN_OUT}`]: 429 } }),
			asks: [{ ...SIGN_OUT_ASK, status: 429 }],
			askedStatus: 429,
			answer: relayedByForward(429, true)
		},
		{
			label: 'a relayed 500 carries no-store — an upstream 500 is not turned into anything else',
			call: { body: SIGN_OUT_PROOF },
			arm: { fails: { [UP_SIGN_OUT]: 500 } },
			asks: [{ ...SIGN_OUT_ASK, status: 500 }],
			askedStatus: 500,
			answer: relayedByForward(500, true)
		},
		{
			label: 'the 401 this helper mints for a cookie-less caller carries none',
			call: { body: SIGN_OUT_PROOF, anonymous: true },
			asks: [],
			answer: REFUSED_BY_THIS_APP
		},
		{
			label: 'the 415 this helper mints for a form body carries none',
			call: { body: 'password=lane-b-proof', contentType: 'application/x-www-form-urlencoded' },
			asks: [],
			answer: UNSUPPORTED_MEDIA
		},
		{
			label: 'the 502 this helper mints for an outage carries none',
			call: { body: SIGN_OUT_PROOF },
			arm: (ids) => ({ drops: { [`${ids.tenantA}:${UP_SIGN_OUT}`]: 1 } }),
			asks: [{ ...SIGN_OUT_ASK, status: 0 }],
			askedStatus: 0,
			answer: UNREACHABLE
		}
	]);
});

/**
 * The proof of ownership of `sign-out-others` travels in the request (`IUserSessionSignOutOthersInput` at
 * `core/lib/auth/user-sessions.ts:40-43`); the answer type is a count (`:45-48`) and is what the route comment at
 * `route.ts:3-7` is about ("The body carries that proof, so no cache keeps the exchange").
 */
test.describe('lane-b · POST /api/auth/sessions/sign-out-others: the proof is in the body it forwards', () => {
	pinCases('sign-out-others proof', SIGN_OUT, [
		{
			label: 'a code instead of a password — 200',
			// [mock limit] the mock answers a write it has no handler for with its echo (`mock-gauzy-server.mjs:826`), so the
			// payload below is the caller's own body, not Gauzy's `{signedOut}`.
			note: MOCK_LIMIT,
			call: { body: { code: 'lane-code-proof' } },
			asks: [SIGN_OUT_ASK],
			answer: echoedByUpstream({ code: 'lane-code-proof' }, true)
		},
		{
			label: 'both proofs at once — 200, forwarded as it arrived',
			note: MOCK_LIMIT,
			call: { body: { password: 'p', code: 'c' } },
			asks: [SIGN_OUT_ASK],
			answer: echoedByUpstream({ password: 'p', code: 'c' }, true)
		},
		{
			label: 'an empty object — 200: this app checks nothing about the body',
			note: MOCK_LIMIT,
			call: { body: {} },
			asks: [SIGN_OUT_ASK],
			answer: echoedByUpstream({}, true)
		}
	]);
});

const PRESENCE: RouteRef = { app: '/api/employee/me/presence', method: 'PUT' };
const presenceAsk = (extra: Partial<Ask> = {}): Ask => ({ method: 'PUT', path: UP_PRESENCE, keys: [], ...extra });
/** What this route answers with something it wrote itself: `NextResponse.json`, so its own media type, no Cache-Control. */
const presenceAnswer = (status: number, body: unknown): Answer => ownJson(status, body, null);
const PRESENCE_BAD_BODY = presenceAnswer(400, { error: 'isIdle must be a boolean' });
const PRESENCE_OUTAGE = presenceAnswer(502, { message: 'Presence heartbeat failed' });

/**
 * Finding 7. Every 200 below is the mock's echo of `{isIdle}` — the whole body `updateEmployeePresenceRequest` sent
 * (`core/services/server/requests/employee.ts:104-109`), which is why an injected `tenantId` or a 200 KB filler is missing
 * from it. `PUT` is the only verb `app/api/employee/me/presence/route.ts:10` exports.
 */
test.describe('lane-b · PUT /api/employee/me/presence: it relays a refusal status and rebuilds its own body', () => {
	const cases: Case[] = [
		{
			label: 'control — one PUT on /employee/me/presence, no query, the echo is {isIdle:false}',
			call: { body: { isIdle: false } },
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: false }),
			failures: []
		},
		{
			label: 'control with isIdle true — the echo carries true',
			call: { body: { isIdle: true } },
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: true }),
			failures: []
		},
		{
			label: 'the tenantId and organizationId a client injects are accepted and then dropped',
			// The body check is not strict (`route.ts:7-8`), and the upstream body is built at `requests/employee.ts:109`.
			call: (ids) => ({
				body: { isIdle: false, tenantId: ids.tenantB, organizationId: ids.organizationB }
			}),
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: false })
		},
		{
			label: 'a 200 KB filler is dropped the same way — the echo is 15 characters',
			call: { body: { isIdle: true, huge: HUGE } },
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: true })
		},
		{
			label: 'signed out — 200: the mock answers the guard check whatever arrives',
			note: MOCK_LIMIT,
			call: { body: { isIdle: false }, anonymous: true },
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: false })
		},
		{
			label: 'with no auth-tenant-id cookie — 200, the PUT still went out',
			call: { body: { isIdle: false }, cookieWithout: 'auth-tenant-id' },
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: false })
		},
		{
			label: 'with no auth-active-team cookie — 200: this route never reads the team',
			call: { body: { isIdle: false }, cookieWithout: 'auth-active-team' },
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: false })
		},
		{
			label: 'the tenant B session — 200, same path, same echo',
			call: { body: { isIdle: true }, scope: 'B' },
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: true })
		},
		...([400, 401, 403, 404, 429, 500, 502] as const).map(
			(status): Case => ({
				label: `an armed ${status} on its own path is answered ${status} with Gauzy's body`,
				call: { body: { isIdle: false } },
				arm: { fails: { [UP_PRESENCE]: status } },
				asks: [presenceAsk({ status })],
				askedStatus: status,
				answer: presenceAnswer(status, gauzyRefusal(status)),
				failures: [`PUT ${UP_PRESENCE} ${status}`]
			})
		),
		{
			label: 'an armed 403 on <tenant A>:/employee/me/presence fires',
			call: { body: { isIdle: false } },
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_PRESENCE}`]: 403 } }),
			asks: [presenceAsk({ status: 403 })],
			askedStatus: 403,
			answer: presenceAnswer(403, gauzyRefusal(403))
		},
		{
			label: 'the same arm on <tenant B> never fires',
			call: { body: { isIdle: false } },
			arm: (ids) => ({ fails: { [`${ids.tenantB}:${UP_PRESENCE}`]: 403 } }),
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: false })
		},
		{
			label: 'without auth-tenant-id the tenant-keyed arm cannot fire',
			call: { body: { isIdle: false }, cookieWithout: 'auth-tenant-id' },
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_PRESENCE}`]: 403 } }),
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: false })
		},
		{
			label: 'while the same arm written as a bare path still fires without that cookie',
			call: { body: { isIdle: false }, cookieWithout: 'auth-tenant-id' },
			arm: { fails: { [UP_PRESENCE]: 403 } },
			asks: [presenceAsk({ status: 403 })],
			askedStatus: 403,
			answer: presenceAnswer(403, gauzyRefusal(403))
		},
		{
			label: 'a cut is 502 {"message":"Presence heartbeat failed"} — the catch at route.ts:30-40, logged status 0',
			call: { body: { isIdle: false } },
			arm: (ids) => ({ drops: { [`${ids.tenantA}:${UP_PRESENCE}`]: 1 } }),
			asks: [presenceAsk({ status: 0 })],
			askedStatus: 0,
			answer: PRESENCE_OUTAGE,
			// A cut is not a refusal, and `failures()` must not read it as one.
			failures: []
		},
		...(
			[
				{ label: 'no body at all', call: { noBody: true } },
				{
					label: 'unparseable bytes under application/json',
					call: { body: Buffer.from('not json at all {'), contentType: 'application/json' }
				},
				{ label: 'the body null', call: { body: 'null', contentType: 'application/json' } },
				{ label: 'a body that is an array', call: { body: '[1,2]', contentType: 'application/json' } },
				{
					label: 'a body that is a bare string',
					call: { body: '"lane-b-string"', contentType: 'application/json' }
				},
				{
					label: 'a form-encoded body',
					call: { body: 'isIdle=true', contentType: 'application/x-www-form-urlencoded' }
				},
				{ label: 'an empty object (isIdle missing)', call: { body: {} } },
				{ label: 'isIdle as the string "true"', call: { body: { isIdle: 'true' } } },
				{ label: 'isIdle null', call: { body: { isIdle: null } } },
				{ label: 'an unknown key and no isIdle', call: { body: { nope: 1 } } }
			] as const
		).map(
			(row): Case => ({
				label: `${row.label} — 400 {"error":"isIdle must be a boolean"}, nothing asked`,
				call: row.call,
				asks: [] as Ask[],
				answer: PRESENCE_BAD_BODY
			})
		),
		{
			label: 'a JSON body declared as text/plain is still parsed — 200, no 415 on this route',
			call: { body: JSON.stringify({ isIdle: true }), contentType: 'text/plain' },
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: true })
		},
		{
			label: 'a JSON body with no media type declared is still parsed — 200',
			call: { body: JSON.stringify({ isIdle: true }) },
			asks: [presenceAsk()],
			answer: presenceAnswer(200, { isIdle: true })
		},
		...FOREIGN_HEADERS.map(
			(foreign): Case => ({
				label: `${foreign.label} — 403 with no-store, nothing asked`,
				call: { body: { isIdle: true }, headers: foreign.headers },
				asks: [] as Ask[],
				answer: FOREIGN_SITE_REFUSAL
			})
		),
		{
			label: 'cross-site while its own upstream is armed — the site check answers first, nothing was asked',
			call: { body: { isIdle: true }, headers: { 'sec-fetch-site': 'cross-site' } },
			arm: { fails: { [UP_PRESENCE]: 403 } },
			asks: [] as Ask[],
			answer: FOREIGN_SITE_REFUSAL
		},
		{
			label: '?isIdle=false&laneProbe=7 changes nothing: the body decides and no key travels',
			call: { path: `/api/employee/me/presence?isIdle=false&laneProbe=7`, body: { isIdle: true } },
			asks: [presenceAsk({ absent: ['isIdle', 'laneProbe'] })],
			answer: presenceAnswer(200, { isIdle: true })
		},
		{
			label: 'POST is 405 with no body, no media type and nothing asked',
			call: { method: 'POST', body: { isIdle: true } },
			asks: [] as Ask[],
			answer: VERB_NOT_EXPORTED
		},
		{
			label: 'GET is 405 with nothing asked',
			call: { method: 'GET', noBody: true },
			asks: [] as Ask[],
			answer: VERB_NOT_EXPORTED
		}
	];

	pinCases('presence', PRESENCE, cases);
});

const BULK: RouteRef = { app: '/api/employee-placeholder/bulk', method: 'POST' };
const BULK_BODY = { members: [{ email: 'lane-imported@example.test', fullName: 'Lane Imported' }] };
const permissionsAsk = (extra: Partial<Ask> = {}): Ask => ({ method: 'GET', path: UP_PERMISSIONS, keys: [], ...extra });
const bulkAsk = (extra: Partial<Ask> = {}): Ask => ({ method: 'POST', path: UP_BULK, keys: [], ...extra });
/** `forwardAllowed` answers with `NextResponse.json(data, {status})` (`employee-placeholder-proxy.ts:62`). */
const bulkAnswer = (status: number, body: unknown): Answer => ownJson(status, body, null);
const BULK_BAD_BODY = bulkAnswer(400, { message: 'Members are required' });
const BULK_OUTAGE = bulkAnswer(502, { message: 'The members could not be added.' });

/**
 * Finding 6, and the two upstream calls every call of this route makes, in the order the mock recorded them: the
 * permission read (`employee-placeholder-proxy.ts:56`) and the forward (`:61` → `requests/employee-placeholder.ts:33-41`).
 * The 403 the proxy itself mints when the permission is missing (`:58-60`) is unreachable on this lane — the fixture role
 * holds `ORG_EMPLOYEES_EDIT` and `extraPermissions` only adds — so the gate is pinned as armed refusals on the read.
 */
test.describe('lane-b · POST /api/employee-placeholder/bulk: two upstream calls, and a body it only checks is an object', () => {
	const cases: Case[] = [
		{
			label: 'control — GET /role-permissions/me then POST /employee-placeholder/bulk; 201 echoes the body',
			call: { body: BULK_BODY },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY),
			failures: []
		},
		{
			label: 'the body {} — 201 echoing {}: only "is it an object" is checked',
			call: { body: {} },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, {})
		},
		{
			label: 'the body {"members":null} — 201 echoing it back',
			call: { body: { members: null } },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, { members: null })
		},
		{
			label: 'signed out — 201: the mock answers the guard check whatever arrives',
			note: MOCK_LIMIT,
			call: { body: BULK_BODY, anonymous: true },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY)
		},
		{
			label: 'with no auth-tenant-id cookie — 201, both calls still went out',
			call: { body: BULK_BODY, cookieWithout: 'auth-tenant-id' },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY)
		},
		{
			label: 'the tenant B session — 201, same two paths',
			call: { body: BULK_BODY, scope: 'B' },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY)
		},
		{
			label: "roleName SUPER_ADMIN with extraPermissions — a no-op: the gate is the permission read's",
			call: { body: BULK_BODY },
			arm: { roleName: 'SUPER_ADMIN', extraPermissions: ['ORG_EMPLOYEES_EDIT'] },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY)
		},
		{
			label: 'manager: false — a no-op too, the fixture role keeps ORG_EMPLOYEES_EDIT',
			call: { body: BULK_BODY },
			arm: { manager: false },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY)
		},
		...([400, 401, 403, 404, 409, 429] as const).map(
			(status): Case => ({
				label: `an armed ${status} on /employee-placeholder/bulk is answered ${status} with Gauzy's body, after the permission read`,
				call: { body: BULK_BODY },
				arm: { fails: { [UP_BULK]: status } },
				asks: [permissionsAsk(), bulkAsk({ status })],
				answer: bulkAnswer(status, gauzyRefusal(status)),
				failures: [`POST ${UP_BULK} ${status}`]
			})
		),
		...([400, 401, 403, 409, 429, 502] as const).map(
			(status): Case => ({
				label: `an armed ${status} on /role-permissions/me is answered ${status} and the bulk write is never asked`,
				call: { body: BULK_BODY },
				arm: { fails: { [UP_PERMISSIONS]: status } },
				asks: [permissionsAsk({ status })],
				askedStatus: status,
				answer: bulkAnswer(status, gauzyRefusal(status)),
				failures: [`GET ${UP_PERMISSIONS} ${status}`]
			})
		),
		{
			label: 'an armed 403 on <tenant A>:/employee-placeholder/bulk fires',
			call: { body: BULK_BODY },
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_BULK}`]: 403 } }),
			asks: [permissionsAsk(), bulkAsk({ status: 403 })],
			answer: bulkAnswer(403, gauzyRefusal(403))
		},
		{
			label: 'the same arm on <tenant B> never fires',
			call: { body: BULK_BODY },
			arm: (ids) => ({ fails: { [`${ids.tenantB}:${UP_BULK}`]: 403 } }),
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY)
		},
		{
			label: 'without auth-tenant-id the tenant-keyed arm cannot fire',
			call: { body: BULK_BODY, cookieWithout: 'auth-tenant-id' },
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_BULK}`]: 403 } }),
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY)
		},
		{
			label: 'a cut of the bulk write is 502 {"message":"The members could not be added."}',
			call: { body: BULK_BODY },
			arm: (ids) => ({ drops: { [`${ids.tenantA}:${UP_BULK}`]: 1 } }),
			asks: [permissionsAsk(), bulkAsk({ status: 0 })],
			answer: BULK_OUTAGE,
			failures: []
		},
		{
			label: 'a cut of the permission read is the same 502, and nothing was written',
			call: { body: BULK_BODY },
			arm: { drops: { [UP_PERMISSIONS]: 1 } },
			asks: [permissionsAsk({ status: 0 })],
			askedStatus: 0,
			answer: BULK_OUTAGE,
			failures: []
		},
		...(
			[
				{ label: 'no body at all', call: { noBody: true } },
				{
					label: 'unparseable bytes under application/json',
					call: { body: Buffer.from('not json at all {'), contentType: 'application/json' }
				},
				{ label: 'the body null', call: { body: 'null', contentType: 'application/json' } },
				{
					label: 'a body that is an array',
					call: { body: [{ email: 'a@example.test' }], contentType: 'application/json' }
				},
				{
					label: 'a body that is a bare string',
					call: { body: '"lane-b-string"', contentType: 'application/json' }
				},
				{
					label: 'a form-encoded body (which its own mock would have read)',
					call: { body: 'email=lane@example.test', contentType: 'application/x-www-form-urlencoded' }
				}
			] as const
		).map(
			(row): Case => ({
				label: `${row.label} — 400 {"message":"Members are required"}, nothing asked`,
				call: row.call,
				asks: [] as Ask[],
				answer: BULK_BAD_BODY
			})
		),
		{
			label: 'a JSON body declared as text/plain is still forwarded — 201, no 415 on this route',
			call: { body: JSON.stringify(BULK_BODY), contentType: 'text/plain' },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY)
		},
		{
			label: 'a JSON body with no media type declared is still forwarded — 201',
			call: { body: JSON.stringify(BULK_BODY) },
			asks: [permissionsAsk(), bulkAsk()],
			answer: bulkAnswer(201, BULK_BODY)
		},
		{
			label: 'a 200 KB body is relayed whole — 201, no size cap and no shape check',
			call: { body: { members: BULK_BODY.members, huge: HUGE } },
			asks: [permissionsAsk(), bulkAsk()],
			answer: {
				status: 201,
				shape: (body) => {
					const record = body as Record<string, unknown> | null;
					if (typeof record?.huge !== 'string') return 'the answer holds no "huge" string';
					if (record.huge.length !== HUGE.length)
						return `the "huge" string arrived ${record.huge.length} chars, not ${HUGE.length}`;
					return null;
				},
				contentType: OWN_MEDIA_TYPE,
				cacheControl: null
			}
		},
		...FOREIGN_HEADERS.map(
			(foreign): Case => ({
				label: `${foreign.label} — 403 with no-store, nothing asked`,
				call: { body: BULK_BODY, headers: foreign.headers },
				asks: [] as Ask[],
				answer: FOREIGN_SITE_REFUSAL
			})
		),
		{
			label: '?tenantId=<tenant B>&laneProbe=7 is ignored: neither upstream call carries a query key',
			call: (ids) => ({
				path: `/api/employee-placeholder/bulk?tenantId=${ids.tenantB}&laneProbe=7`,
				body: BULK_BODY
			}),
			asks: [
				permissionsAsk({ absent: ['tenantId', 'laneProbe'] }),
				bulkAsk({ absent: ['tenantId', 'laneProbe'] })
			],
			answer: bulkAnswer(201, BULK_BODY)
		},
		{
			label: 'PUT is 405 with no body, no media type and nothing asked',
			call: { method: 'PUT', body: BULK_BODY },
			asks: [] as Ask[],
			answer: VERB_NOT_EXPORTED
		},
		{
			label: 'GET is 405 with nothing asked',
			call: { method: 'GET', noBody: true },
			asks: [] as Ask[],
			answer: VERB_NOT_EXPORTED
		}
	];

	pinCases('employee-placeholder/bulk', BULK, cases);
});

const INVITE: RouteRef = { app: '/api/invite/emails', method: 'POST' };
const INVITE_MESSAGE = 'Send 1 to 50 valid email addresses, and a valid role id when a role is picked';
const roleAsk = (extra: Partial<Ask> = {}): Ask => ({ method: 'GET', path: UP_ROLE_OPTIONS, keys: ['name'], ...extra });
const inviteWriteAsk = (extra: Partial<Ask> = {}): Ask => ({
	method: 'POST',
	path: UP_INVITE_WRITE,
	keys: [],
	...extra
});
const INVITE_READ_KEYS = ['where[organizationId]', 'where[status]', 'where[teams][id][0]', 'where[tenantId]'];
const inviteReadAsk = (extra: Partial<Ask> = {}): Ask => ({
	method: 'GET',
	path: UP_INVITE_READ,
	keys: INVITE_READ_KEYS,
	...extra
});
/** The mock's own invitation page for `/api/invite` (`mock-gauzy-server.mjs:614-624`), not a catch-all echo. */
const invitePage = (ids: Record<string, string>, suffix: 'A' | 'B') => ({
	items: [
		{
			id: ids.invite,
			email: 'invited@example.test',
			status: 'INVITED',
			tenantId: ids[`tenant${suffix}`],
			organizationId: ids[`organization${suffix}`]
		}
	],
	total: 1
});
const inviteAnswer = (suffix: 'A' | 'B') => (ids: Record<string, string>) =>
	ownJson(200, invitePage(ids, suffix), null);
const INVITE_BAD_BODY: Answer = ownJson(400, { errors: { email: INVITE_MESSAGE } }, null);
/** Finding 2: the swallowed list read (`core/services/server/requests/invite.ts:115-132`). */
const INVITE_EMPTY_PAGE: Answer = ownJson(200, MOCK_PAGE, null);
/** Finding 1: what `next dev` answers for the throw this route lets through. */
const INVITE_CRASH: Answer = HANDLER_CRASH;
const INVITE_VALUES = (ids: Record<string, string>, suffix: 'A' | 'B') => ({
	'where[organizationId]': ids[`organization${suffix}`],
	'where[status]': 'INVITED',
	'where[teams][id][0]': ids[`team${suffix}`],
	'where[tenantId]': ids[`tenant${suffix}`]
});
/** The control's three calls, scoped to one fixture session. */
const inviteAsks = (ids: Record<string, string>, suffix: 'A' | 'B'): Ask[] => [
	roleAsk({ values: { name: 'EMPLOYEE' } }),
	inviteWriteAsk(),
	inviteReadAsk({ values: INVITE_VALUES(ids, suffix) })
];

/**
 * Findings 1, 2 and 5, pinned on `app/api/invite/emails/route.ts`. Three upstream calls in this order: the employee role
 * read (only when no role id was picked, `route.ts:33-40`), the invitation write (`:45-62`), and the list read whose page
 * becomes the answer (`:66-75`). Neither of the first two has a `catch`.
 */
test.describe('lane-b · POST /api/invite/emails: three upstream calls, two of them fatal, and a body it neither dedups nor lowers', () => {
	const badBodies: { label: string; body?: unknown; contentType?: string }[] = [
		{ label: '51 addresses', body: { emails: MANY_EMAILS(51) } },
		{ label: 'emails: []', body: { emails: [] } },
		{ label: 'an address that is not an address', body: { emails: ['nope'] } },
		{ label: 'a roleId that is not a guid', body: { emails: INVITE_EMAILS, roleId: 'not-a-guid' } },
		{ label: 'a body with neither emails nor email', body: { nope: 1 } },
		{ label: 'no body at all' },
		{
			label: 'unparseable bytes under application/json',
			body: Buffer.from('not json at all {'),
			contentType: 'application/json'
		},
		{ label: 'the body null', body: 'null', contentType: 'application/json' },
		{
			label: 'a form-encoded body',
			body: 'emails=lane@example.test',
			contentType: 'application/x-www-form-urlencoded'
		}
	];

	const cases: Case[] = [
		{
			label: 'control with no roleId — role read, invite write, list read; 200 is the list read answered',
			call: { body: { emails: INVITE_EMAILS } },
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A'),
			creation: (ids) => ({ invites: { emails: INVITE_EMAILS, teamIds: [ids.teamA] } }),
			failures: []
		},
		{
			label: 'control with a roleId — the role read is skipped, so its armed 403 could not fire',
			call: (ids) => ({ body: { emails: INVITE_EMAILS, roleId: ids.role } }),
			arm: { fails: { [UP_ROLE_OPTIONS]: 403 } },
			asks: (ids) => [inviteWriteAsk(), inviteReadAsk({ values: INVITE_VALUES(ids, 'A') })],
			answer: inviteAnswer('A')
		},
		{
			label: 'control with roleId "" — an older client means the employee role, so the role read runs',
			call: { body: { emails: INVITE_EMAILS, roleId: '' } },
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A')
		},
		{
			label: 'the single-email body an older client sends — read as a list of one',
			call: { body: { email: 'lane-single@example.test' } },
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A'),
			creation: (ids) => ({ invites: { emails: ['lane-single@example.test'], teamIds: [ids.teamA] } })
		},
		{
			label: 'three addresses travel exactly as sent',
			call: { body: { emails: ['a@example.test', 'b@example.test', 'c@example.test'] } },
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A'),
			creation: (ids) => ({
				invites: { emails: ['a@example.test', 'b@example.test', 'c@example.test'], teamIds: [ids.teamA] }
			})
		},
		{
			label: '50 addresses — the schema limit (core/lib/validation/invite.ts:4) — 200',
			call: { body: { emails: MANY_EMAILS(50) } },
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A')
		},
		{
			label: 'duplicates and upper case are forwarded untouched — 200 (finding 5)',
			note: NOT_INTENDED,
			call: { body: { emails: ['dup@example.test', 'dup@example.test', 'DUP@example.test'] } },
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A'),
			creation: (ids) => ({
				invites: { emails: ['dup@example.test', 'dup@example.test', 'DUP@example.test'], teamIds: [ids.teamA] }
			})
		},
		{
			label: 'emails and email in one body — the emails branch wins',
			call: { body: { emails: ['a@example.test'], email: 'b@example.test' } },
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A'),
			creation: (ids) => ({ invites: { emails: ['a@example.test'], teamIds: [ids.teamA] } })
		},
		{
			label: 'the tenant B session — the whole chain is scoped to tenant B, organization B, team B',
			call: { body: { emails: INVITE_EMAILS }, scope: 'B' },
			asks: (ids) => inviteAsks(ids, 'B'),
			answer: inviteAnswer('B'),
			creation: (ids) => ({ invites: { emails: INVITE_EMAILS, teamIds: [ids.teamB] } })
		},
		...REFUSAL_STATUSES.map(
			(status): Case => ({
				label: `an armed ${status} on the invitation write is this app's bare 500 (finding 1)`,
				note: NOT_INTENDED,
				call: { body: { emails: INVITE_EMAILS } },
				arm: { fails: { [UP_INVITE_WRITE]: status } },
				asks: [roleAsk({ values: { name: 'EMPLOYEE' } }), { ...inviteWriteAsk(), status }],
				answer: INVITE_CRASH,
				failures: [`POST ${UP_INVITE_WRITE} ${status}`]
			})
		),
		...REFUSAL_STATUSES.map(
			(status): Case => ({
				label: `an armed ${status} on the role read is the same bare 500, and no invitation was written (finding 1)`,
				note: NOT_INTENDED,
				call: { body: { emails: INVITE_EMAILS } },
				arm: { fails: { [UP_ROLE_OPTIONS]: status } },
				asks: [{ ...roleAsk(), status, values: { name: 'EMPLOYEE' } }],
				askedStatus: status,
				answer: INVITE_CRASH,
				failures: [`GET ${UP_ROLE_OPTIONS} ${status}`]
			})
		),
		...[400, 401, 403, 429, 500].map(
			(status): Case => ({
				label: `an armed ${status} on the list read is swallowed: 200 {"items":[],"total":0} after the write succeeded (finding 2)`,
				call: { body: { emails: INVITE_EMAILS } },
				arm: { fails: { [UP_INVITE_READ]: status } },
				asks: (ids: Record<string, string>) => [
					roleAsk({ values: { name: 'EMPLOYEE' } }),
					inviteWriteAsk(),
					{ ...inviteReadAsk({ values: INVITE_VALUES(ids, 'A') }), status }
				],
				answer: INVITE_EMPTY_PAGE,
				creation: (ids) => ({ invites: { emails: INVITE_EMAILS, teamIds: [ids.teamA] } })
			})
		),
		{
			label: 'an armed 403 on <tenant A>:/invite/emails fires',
			note: NOT_INTENDED,
			call: { body: { emails: INVITE_EMAILS } },
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_INVITE_WRITE}`]: 403 } }),
			asks: [roleAsk({ values: { name: 'EMPLOYEE' } }), { ...inviteWriteAsk(), status: 403 }],
			answer: INVITE_CRASH
		},
		{
			label: 'the same arm on <tenant B> never fires',
			call: { body: { emails: INVITE_EMAILS } },
			arm: (ids) => ({ fails: { [`${ids.tenantB}:${UP_INVITE_WRITE}`]: 403 } }),
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A')
		},
		{
			label: 'a cut of the invitation write is the bare 500 too, logged with status 0 (finding 1)',
			note: NOT_INTENDED,
			call: { body: { emails: INVITE_EMAILS } },
			arm: { drops: { [UP_INVITE_WRITE]: 1 } },
			asks: [roleAsk({ values: { name: 'EMPLOYEE' } }), { ...inviteWriteAsk(), status: 0 }],
			answer: INVITE_CRASH
		},
		{
			label: 'a cut of the role read is the bare 500 too',
			note: NOT_INTENDED,
			call: { body: { emails: INVITE_EMAILS } },
			arm: { drops: { [UP_ROLE_OPTIONS]: 1 } },
			asks: [{ ...roleAsk(), status: 0, values: { name: 'EMPLOYEE' } }],
			askedStatus: 0,
			answer: INVITE_CRASH
		},
		{
			label: 'a cut of the list read is swallowed the way a refusal is: 200 with an empty page',
			call: { body: { emails: INVITE_EMAILS } },
			arm: (ids) => ({ drops: { [`${ids.tenantA}:${UP_INVITE_READ}`]: 1 } }),
			asks: (ids: Record<string, string>) => [
				roleAsk({ values: { name: 'EMPLOYEE' } }),
				inviteWriteAsk(),
				{ ...inviteReadAsk({ values: INVITE_VALUES(ids, 'A') }), status: 0 }
			],
			answer: INVITE_EMPTY_PAGE,
			creation: (ids) => ({ invites: { emails: INVITE_EMAILS, teamIds: [ids.teamA] } })
		},
		...badBodies.map(
			(row): Case => ({
				label: `${row.label} — 400 {"errors":{"email":"…"}}, nothing asked`,
				call: {
					...(row.body === undefined ? { noBody: true } : { body: row.body }),
					...(row.contentType === undefined ? {} : { contentType: row.contentType })
				},
				asks: [] as Ask[],
				answer: INVITE_BAD_BODY
			})
		),
		{
			label: 'a JSON body declared as text/plain is still parsed — 200, no 415 on this route',
			call: { body: JSON.stringify({ emails: INVITE_EMAILS }), contentType: 'text/plain' },
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A')
		},
		{
			label: 'a JSON body with no media type declared is still parsed — 200',
			call: { body: JSON.stringify({ emails: INVITE_EMAILS }) },
			asks: (ids) => inviteAsks(ids, 'A'),
			answer: inviteAnswer('A')
		},
		{
			label: 'signed out — 200: the mock answers the guard check, and the list read lost tenant, organization and team',
			note: MOCK_LIMIT,
			call: { body: { emails: INVITE_EMAILS }, anonymous: true },
			asks: [
				roleAsk({ values: { name: 'EMPLOYEE' } }),
				inviteWriteAsk(),
				inviteReadAsk({
					keys: ['where[status]'],
					values: { 'where[status]': 'INVITED' },
					absent: ['where[tenantId]', 'where[organizationId]', 'where[teams][id][0]']
				})
			],
			answer: inviteAnswer('A'),
			creation: () => ({ invites: { emails: INVITE_EMAILS, teamIds: [null] } })
		},
		{
			label: 'no auth-tenant-id cookie — the read loses where[tenantId], and the tenant-keyed arm cannot fire',
			call: { body: { emails: INVITE_EMAILS }, cookieWithout: 'auth-tenant-id' },
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_INVITE_READ}`]: 403 } }),
			asks: (ids: Record<string, string>) => [
				roleAsk({ values: { name: 'EMPLOYEE' } }),
				inviteWriteAsk(),
				inviteReadAsk({
					keys: ['where[organizationId]', 'where[status]', 'where[teams][id][0]'],
					values: {
						'where[organizationId]': ids.organizationA,
						'where[status]': 'INVITED',
						'where[teams][id][0]': ids.teamA
					},
					absent: ['where[tenantId]']
				})
			],
			answer: inviteAnswer('A')
		},
		{
			label: 'no auth-active-team cookie — the read loses where[teams][id][0] and the mock recorded teamIds [null]',
			call: { body: { emails: INVITE_EMAILS }, cookieWithout: 'auth-active-team' },
			asks: (ids: Record<string, string>) => [
				roleAsk({ values: { name: 'EMPLOYEE' } }),
				inviteWriteAsk(),
				inviteReadAsk({
					keys: ['where[organizationId]', 'where[status]', 'where[tenantId]'],
					values: {
						'where[organizationId]': ids.organizationA,
						'where[status]': 'INVITED',
						'where[tenantId]': ids.tenantA
					},
					absent: ['where[teams][id][0]']
				})
			],
			answer: inviteAnswer('A'),
			creation: () => ({ invites: { emails: INVITE_EMAILS, teamIds: [null] } })
		},
		...FOREIGN_HEADERS.map(
			(foreign): Case => ({
				label: `${foreign.label} — 403 with no-store, nothing asked`,
				call: { body: { emails: INVITE_EMAILS }, headers: foreign.headers },
				asks: [] as Ask[],
				answer: FOREIGN_SITE_REFUSAL
			})
		),
		{
			label: 'a caller cannot re-scope it: ?teamId=, ?tenantId=, ?organizationId= and ?laneProbe= are all dropped',
			call: (ids) => ({
				path: `/api/invite/emails?teamId=${ids.teamB}&tenantId=${ids.tenantB}&organizationId=${ids.organizationB}&laneProbe=7`,
				body: { emails: INVITE_EMAILS }
			}),
			asks: (ids: Record<string, string>) => [
				roleAsk({
					values: { name: 'EMPLOYEE' },
					absent: ['laneProbe', 'teamId', 'tenantId', 'organizationId']
				}),
				inviteWriteAsk({ absent: ['laneProbe', 'teamId', 'tenantId', 'organizationId'] }),
				inviteReadAsk({
					values: INVITE_VALUES(ids, 'A'),
					absent: ['laneProbe', 'teamId', 'tenantId', 'organizationId']
				})
			],
			answer: inviteAnswer('A')
		},
		{
			label: 'GET is 405 with no body, no media type and nothing asked',
			call: { method: 'GET', noBody: true },
			asks: [] as Ask[],
			answer: VERB_NOT_EXPORTED
		}
	];

	pinCases('invite/emails', INVITE, cases);
});

const RESEND: RouteRef = { app: '/api/invite/resend', method: 'POST' };
const resendAsk = (extra: Partial<Ask> = {}): Ask => ({ method: 'POST', path: UP_RESEND, keys: [], ...extra });
/**
 * What `resendInvitationEmailRequest` sends (`core/services/server/requests/invite.ts:150-158`), read back through the
 * mock's echo of a path it has no handler for (`mock-gauzy-server.mjs:826`) — the only way this lane can show an
 * upstream body, and the reason the payload below is spelled out while `POST /api/invite/emails` rows pin keys only.
 */
const resendBody = (ids: Record<string, string>, suffix: 'A' | 'B') => ({
	tenantId: ids[`tenant${suffix}`],
	inviteId: ids.invite,
	inviteType: 'TEAM',
	organizationId: ids[`organization${suffix}`],
	callbackUrl: 'http://localhost:3032/auth/accept-invite'
});
const resendAnswer = (suffix: 'A' | 'B') => (ids: Record<string, string>) =>
	ownJson(200, resendBody(ids, suffix), null);
/** `gauzyErrorResponse(error, 'The invitation could not be sent again.')` — `app/api/invite/resend/route.ts:42`. */
const RESEND_OUTAGE = ownJson(502, { message: 'The invitation could not be sent again.' }, null);
const RESEND_BAD_BODY = ownJson(400, { errors: { inviteId: 'Please make sure to fill out this field' } }, null);

/**
 * Finding 1's contrast, pinned on the sibling of the same folder (`app/api/invite/resend/route.ts`): the same
 * `serverFetch` rejection that turns `POST /api/invite/emails` into a bare 500 is unwrapped here, because this route
 * awaits its one upstream call inside a `try` `:28-38` and answers the `catch` through `gauzyErrorResponse` `:40-42`.
 * A refusal keeps Gauzy's status and body; an outage becomes this app's own 502 sentence.
 */
test.describe('lane-b · POST /api/invite/resend: the sibling that does catch, and what its answer is when it does', () => {
	const cases: Case[] = [
		{
			label: 'control — the 200 is the mock echoing back the body this route built: tenant, invite, TEAM, organization, callback',
			note: MOCK_LIMIT,
			call: (ids) => ({ body: { inviteId: ids.invite } }),
			asks: [resendAsk()],
			answer: resendAnswer('A'),
			failures: []
		},
		{
			label: 'the tenant B session — the same call, scoped to tenant B and organization B',
			note: MOCK_LIMIT,
			call: (ids) => ({ body: { inviteId: ids.invite }, scope: 'B' }),
			asks: [resendAsk()],
			answer: resendAnswer('B')
		},
		...REFUSAL_STATUSES.map(
			(status): Case => ({
				label: `an armed ${status} comes back ${status} with Gauzy's body — this route caught it`,
				call: (ids) => ({ body: { inviteId: ids.invite } }),
				arm: { fails: { [UP_RESEND]: status } },
				asks: [resendAsk({ status })],
				askedStatus: status,
				answer: ownJson(status, gauzyRefusal(status), null),
				failures: [`POST ${UP_RESEND} ${status}`]
			})
		),
		{
			label: 'an armed 403 on <tenant A>:/invite/resend fires; the same arm on <tenant B> never does',
			call: (ids) => ({ body: { inviteId: ids.invite } }),
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_RESEND}`]: 403 } }),
			asks: [resendAsk({ status: 403 })],
			askedStatus: 403,
			answer: ownJson(403, gauzyRefusal(403), null)
		},
		{
			label: 'the same arm addressed to tenant B never fires',
			call: (ids) => ({ body: { inviteId: ids.invite } }),
			arm: (ids) => ({ fails: { [`${ids.tenantB}:${UP_RESEND}`]: 403 } }),
			asks: [resendAsk()],
			answer: resendAnswer('A')
		},
		{
			label: 'a cut is 502 {"message":"The invitation could not be sent again."} — the catch, not a relayed status',
			call: (ids) => ({ body: { inviteId: ids.invite } }),
			arm: (ids) => ({ drops: { [`${ids.tenantA}:${UP_RESEND}`]: 1 } }),
			asks: [resendAsk({ status: 0 })],
			askedStatus: 0,
			answer: RESEND_OUTAGE,
			failures: []
		},
		{
			label: 'no body at all — the throw is the same bare 500 as finding 1: req.json() at route.ts:20 runs before validateForm at :22',
			note: NOT_INTENDED,
			call: { noBody: true },
			asks: [] as Ask[],
			answer: HANDLER_CRASH
		},
		{
			label: 'the body {} — 400 {"errors":{"inviteId":"Please make sure to fill out this field"}}, nothing asked',
			call: { body: {} },
			asks: [] as Ask[],
			answer: RESEND_BAD_BODY
		},
		{
			label: 'a body with no inviteId — the same 400',
			call: { body: { nope: 1 } },
			asks: [] as Ask[],
			answer: RESEND_BAD_BODY
		},
		{
			label: 'unparseable bytes under application/json — the same bare 500 as a bodiless call',
			call: { body: Buffer.from('not json at all {'), contentType: 'application/json' },
			asks: [] as Ask[],
			answer: HANDLER_CRASH
		},
		{
			label: 'a JSON body declared as text/plain is still parsed — 200',
			call: (ids) => ({ body: JSON.stringify({ inviteId: ids.invite }), contentType: 'text/plain' }),
			asks: [resendAsk()],
			answer: resendAnswer('A')
		},
		...FOREIGN_HEADERS.map(
			(foreign): Case => ({
				label: `${foreign.label} — 403 with no-store, nothing asked (route.ts:10-11 runs before the guard)`,
				call: (ids) => ({ body: { inviteId: ids.invite }, headers: foreign.headers }),
				asks: [] as Ask[],
				answer: FOREIGN_SITE_REFUSAL
			})
		),
		{
			label: 'cross-site while its own upstream is armed — the site check answers first, nothing was asked',
			call: (ids) => ({ body: { inviteId: ids.invite }, headers: { 'sec-fetch-site': 'cross-site' } }),
			arm: { fails: { [UP_RESEND]: 403 } },
			asks: [] as Ask[],
			answer: FOREIGN_SITE_REFUSAL
		},
		{
			label: '?inviteId=<team B>&laneProbe=7 is dropped: the body names the invitation and no key travels',
			call: (ids) => ({
				path: `/api/invite/resend?inviteId=${ids.teamB}&laneProbe=7`,
				body: { inviteId: ids.invite }
			}),
			asks: [resendAsk({ absent: ['inviteId', 'laneProbe'] })],
			answer: resendAnswer('A')
		},
		{
			label: 'GET is 405 with no body, no media type and nothing asked',
			call: { method: 'GET', noBody: true },
			asks: [] as Ask[],
			answer: VERB_NOT_EXPORTED
		}
	];

	pinCases('invite/resend contrast', RESEND, cases);
});

const CREATE_WS: RouteRef = { app: '/api/auth/create-workspace', method: 'POST' };
const wsAsk = (method: Ask['method'], path: string, extra: Partial<Ask> = {}): Ask => ({
	method,
	path,
	keys: [],
	...extra
});
/** The eight calls every successful creation makes, in the order the mock recorded them. */
const WS_CHAIN: Ask[] = [
	wsAsk('POST', UP_WS_OPEN),
	wsAsk('POST', UP_WS_SIGNIN),
	wsAsk('POST', UP_TENANT),
	wsAsk('POST', UP_ORGANIZATION),
	wsAsk('POST', UP_EMPLOYEE),
	wsAsk('POST', UP_PROJECTS),
	wsAsk('POST', UP_TEAM),
	wsAsk('POST', UP_REFRESH)
];
/** `GET /api/roles/options?name=EMPLOYEE` (`core/services/server/create-workspace.ts:109-114` → `requests/roles.ts:5-24`). */
const wsRoleAsk = (extra: Partial<Ask> = {}): Ask =>
	wsAsk('GET', UP_ROLE_OPTIONS, { keys: ['name'], values: { name: 'EMPLOYEE' }, ...extra });
/** The chain plus the two calls that only run when the body named at least one address (`create-workspace.ts:171-181`). */
const WS_INVITE_CHAIN: Ask[] = [...WS_CHAIN, wsRoleAsk(), wsAsk('POST', UP_INVITE_WRITE)];
const WS_NAME = 'Lane B Workspace';
const WS_TEAM = 'Lane B Team';
const WS_EMAILS = ['lane-ws-invited@example.test'];
const WS_BODY = { name: WS_NAME, teamName: WS_TEAM, invites: WS_EMAILS };
/** Every answer this route mints carries `Cache-Control: no-store` (`app/api/auth/create-workspace/route.ts:9`). */
const wsAnswer = (status: number, body: unknown): Answer => ownJson(status, body, 'no-store');
const WS_CREATED = (invited: number, invitesFailed: boolean) => wsAnswer(201, { invited, invitesFailed });
const WS_INVALID = wsAnswer(400, { code: 'INVALID' });
const WS_FAILED = wsAnswer(502, { code: 'FAILED' });
const WS_UNOPENED = wsAnswer(502, { code: 'CREATED_NOT_OPENED' });
/** The nine `Set-Cookie` headers of a 201, with the two tokens masked and `auth-timezone` never among them. */
const WS_SESSION = {
	names: [
		'auth-token_totalChunks',
		'auth-token',
		'auth-refresh-token',
		'auth-active-team',
		'auth-tenant-id',
		'auth-organization-id',
		'auth-active-language',
		'no-team-popup-show',
		'auth-user-id'
	],
	values: {
		'auth-token_totalChunks': '',
		'auth-active-team': NEW.teamId,
		'auth-tenant-id': NEW.tenantId,
		'auth-organization-id': NEW.organizationId,
		'auth-active-language': 'en',
		'no-team-popup-show': '',
		'auth-user-id': NEW.userId
	},
	absent: ['auth-timezone']
};
/** The mock's own record of the chain (`mock-gauzy-server.mjs:391-541`, read back at `:992-999`). */
const wsState = (name: string, teamName: string, emails: string[] | null) => ({
	tenant: name,
	organization: name,
	employeeUserId: NEW.userId,
	team: { name: teamName, managerIds: [NEW.employeeId] },
	invites: emails === null ? null : { emails, teamIds: [NEW.teamId] }
});
const wsCall =
	(body: unknown): WithIds<CallOverride> =>
	() => ({ body });

/**
 * Findings 3, 4 and 5, pinned on `POST /api/auth/create-workspace`. The chain is `route.ts:41` →
 * `core/services/server/create-workspace.ts:138-188` → `core/services/server/ever-id/provision.ts:107-233`, and each of
 * its steps is armed and cut below on its own path. A cut is not the same witness as a refusal here: the mock runs its
 * own handler first and only then destroys the socket (`mock-gauzy-server.mjs:1099-1106` then `:1141-1147`), so a cut
 * leaves the mock's record of what it was asked while a refusal (`fails`, `:1089-1095`) never reaches it.
 */
test.describe('lane-b · POST /api/auth/create-workspace: ten upstream calls, two 502 codes, and a new session in the answer', () => {
	const cases: Case[] = [
		{
			label: 'control with one invite — 201 {"invited":1,"invitesFailed":false}, the chain of ten, nine cookies, no-store',
			call: wsCall(WS_BODY),
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION,
			creation: wsState(WS_NAME, WS_TEAM, WS_EMAILS),
			failures: []
		},
		{
			label: 'control with no invites key — 201 {"invited":0,…} and the two invitation calls are never made',
			call: wsCall({ name: WS_NAME }),
			asks: WS_CHAIN,
			answer: WS_CREATED(0, false),
			writes: WS_SESSION,
			creation: wsState(WS_NAME, WS_NAME, null)
		},
		{
			label: 'control with invites: [] — the same 8 calls, {"invited":0,"invitesFailed":false}',
			call: wsCall({ name: WS_NAME, invites: [] }),
			asks: WS_CHAIN,
			answer: WS_CREATED(0, false),
			creation: wsState(WS_NAME, WS_NAME, null)
		},
		{
			label: 'no teamName — the team is named after the workspace (route.ts:47)',
			call: wsCall({ name: 'Lane B Same Team' }),
			asks: WS_CHAIN,
			answer: WS_CREATED(0, false),
			creation: wsState('Lane B Same Team', 'Lane B Same Team', null)
		},
		{
			label: 'a name with spaces around it is trimmed before anything is asked (core/lib/validation/workspace.ts:13-15)',
			call: wsCall({ name: '  Lane B Trimmed  ' }),
			asks: WS_CHAIN,
			answer: WS_CREATED(0, false),
			creation: wsState('Lane B Trimmed', 'Lane B Trimmed', null)
		},
		{
			label: 'invites are lower-cased and de-duplicated before they are sent, and invited counts that list: 2 of 3',
			note: NOT_INTENDED,
			call: wsCall({
				name: 'Lane B Dedup',
				invites: ['Dup@Example.test', 'dup@example.test', 'other@example.test']
			}),
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(2, false),
			creation: wsState('Lane B Dedup', 'Lane B Dedup', ['dup@example.test', 'other@example.test'])
		},
		{
			label: 'the same three with one address padded by a space — 400 {"code":"INVALID"} before anything is asked (finding 5)',
			note: NOT_INTENDED,
			call: wsCall({ name: 'Lane B Padded', invites: [' other@example.test '] }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'invites as a string instead of an array — 400, nothing asked',
			call: wsCall({ name: 'Lane B Bad Invites', invites: 'a@example.test' }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'invites: ["nope"] — 400, nothing asked',
			call: wsCall({ name: 'Lane B Bad Invites', invites: ['nope'] }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: '51 addresses — past the schema limit (core/lib/validation/workspace.ts:16-20) — 400, nothing asked',
			call: wsCall({ name: 'Lane B Many', invites: MANY_EMAILS(51) }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'name "" — 400, nothing asked',
			call: wsCall({ name: '' }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'name of three spaces — 400, nothing asked',
			call: wsCall({ name: '   ' }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'name of 61 characters — 400, nothing asked',
			call: wsCall({ name: 'n'.repeat(61) }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'teamName of 61 characters — 400, nothing asked',
			call: wsCall({ name: 'Lane B Team Name', teamName: 't'.repeat(61) }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'no name at all (teamName only) — 400, nothing asked',
			call: wsCall({ teamName: 'x' }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'name of exactly 60 characters — 201, and the mock recorded that name',
			call: wsCall({ name: 'n'.repeat(60) }),
			asks: WS_CHAIN,
			answer: WS_CREATED(0, false),
			creation: wsState('n'.repeat(60), 'n'.repeat(60), null)
		},
		{
			label: 'no body at all — 400 {"code":"INVALID"}: req.json() is caught here (route.ts:30), unlike /invite/resend',
			call: { noBody: true },
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'unparseable bytes under application/json — 400, nothing asked',
			call: { body: Buffer.from('not json at all {'), contentType: 'application/json' },
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'the body null — 400, nothing asked',
			call: { body: 'null', contentType: 'application/json' },
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'a form-encoded body — 400, nothing asked',
			call: { body: 'name=Lane', contentType: 'application/x-www-form-urlencoded' },
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'a JSON body declared as text/plain is still parsed — 201, no 415 on this route',
			call: { body: JSON.stringify(WS_BODY), contentType: 'text/plain' },
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION
		},
		{
			label: 'a JSON body with no media type declared is still parsed — 201',
			call: { body: JSON.stringify(WS_BODY) },
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION
		},
		{
			label: 'a 200 KB name — 400 {"code":"INVALID"}: the schema cap answers before any size is looked at',
			call: wsCall({ name: HUGE }),
			asks: [] as Ask[],
			answer: WS_INVALID
		},
		{
			label: 'signed out — 201 with the new session: the mock answers the guard check whatever arrives',
			note: MOCK_LIMIT,
			call: { body: WS_BODY, anonymous: true },
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION
		},
		{
			label: 'with no auth-tenant-id cookie — 201: the chain is scoped by the opening token, not by that cookie',
			call: { body: WS_BODY, cookieWithout: 'auth-tenant-id' },
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION
		},
		{
			label: 'with no auth-active-language cookie — 201, the same nine names written',
			call: { body: WS_BODY, cookieWithout: 'auth-active-language' },
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: { names: WS_SESSION.names, absent: ['auth-timezone'] }
		},
		{
			label: 'auth-timezone sent on the request — 201, and no auth-timezone cookie comes back (finding 4)',
			call: { body: WS_BODY, cookieExtra: '; auth-timezone=Europe/Berlin' },
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION
		},
		{
			label: 'the tenant B session — the chain is the same ten calls and the answer holds the same new ids',
			call: () => ({ body: { name: 'Lane B Workspace B', teamName: 'Lane B Team B' }, scope: 'B' }),
			asks: WS_CHAIN,
			answer: WS_CREATED(0, false),
			writes: WS_SESSION,
			creation: wsState('Lane B Workspace B', 'Lane B Team B', null)
		},
		{
			label: 'scenario tenantRegistrationClosed — 403 {"code":"REGISTRATION_CLOSED"} after one call',
			call: wsCall(WS_BODY),
			arm: { tenantRegistrationClosed: true },
			asks: [wsAsk('POST', UP_WS_OPEN, { status: 403 })],
			askedStatus: 403,
			answer: wsAnswer(403, { code: 'REGISTRATION_CLOSED' }),
			failures: [`POST ${UP_WS_OPEN} 403`]
		},
		{
			label: 'scenario workspacePaywall — 403 {"code":"SUBSCRIPTION_REQUIRED","details":{"checkoutUrl":…}}',
			call: wsCall(WS_BODY),
			arm: { workspacePaywall: true },
			asks: [wsAsk('POST', UP_WS_OPEN, { status: 403 })],
			askedStatus: 403,
			answer: wsAnswer(403, {
				code: 'SUBSCRIPTION_REQUIRED',
				details: {
					checkoutUrl: 'https://checkout.example.test/?product=ever-teams&email=manager%40example.test'
				}
			}),
			failures: [`POST ${UP_WS_OPEN} 403`]
		},
		{
			label: 'scenario newWorkspaceRefreshFails — 502 {"code":"CREATED_NOT_OPENED"} with the whole chain except the invites',
			call: wsCall(WS_BODY),
			arm: { newWorkspaceRefreshFails: true },
			asks: [...WS_CHAIN.slice(0, 7), wsAsk('POST', UP_REFRESH, { status: 500 })],
			answer: WS_UNOPENED,
			creation: { team: wsState(WS_NAME, WS_TEAM, null).team, invites: null },
			failures: [`POST ${UP_REFRESH} 500`]
		},
		...[400, 401, 403, 429, 500].map(
			(status): Case => ({
				label: `an armed ${status} on POST /auth/workspaces is 502 {"code":"FAILED"} — no status of Gauzy's is relayed (finding 3)`,
				call: wsCall(WS_BODY),
				arm: { fails: { [UP_WS_OPEN]: status } },
				asks: [wsAsk('POST', UP_WS_OPEN, { status })],
				askedStatus: status,
				answer: WS_FAILED,
				failures: [`POST ${UP_WS_OPEN} ${status}`]
			})
		),
		{
			label: 'a cut of POST /auth/workspaces is the same 502 {"code":"FAILED"}, logged with status 0',
			call: wsCall(WS_BODY),
			arm: { drops: { [UP_WS_OPEN]: 1 } },
			asks: [wsAsk('POST', UP_WS_OPEN, { status: 0 })],
			askedStatus: 0,
			answer: WS_FAILED,
			failures: []
		},
		...[400, 401, 403, 429, 500].map(
			(status): Case => ({
				label: `an armed ${status} on POST /auth/signin.workspace is 502 {"code":"FAILED"} after the opening answered`,
				call: wsCall(WS_BODY),
				arm: { fails: { [UP_WS_SIGNIN]: status } },
				asks: [wsAsk('POST', UP_WS_OPEN), wsAsk('POST', UP_WS_SIGNIN, { status })],
				answer: WS_FAILED,
				failures: [`POST ${UP_WS_SIGNIN} ${status}`]
			})
		),
		{
			label: 'a cut of POST /auth/signin.workspace is 502 {"code":"FAILED"} too',
			call: wsCall(WS_BODY),
			arm: { drops: { [UP_WS_SIGNIN]: 1 } },
			asks: [wsAsk('POST', UP_WS_OPEN), wsAsk('POST', UP_WS_SIGNIN, { status: 0 })],
			answer: WS_FAILED,
			failures: []
		},
		{
			label: 'an armed 400 on POST /tenant is still 502 {"code":"FAILED"}: the tenant never existed',
			call: wsCall(WS_BODY),
			arm: { fails: { [UP_TENANT]: 400 } },
			asks: [wsAsk('POST', UP_WS_OPEN), wsAsk('POST', UP_WS_SIGNIN), wsAsk('POST', UP_TENANT, { status: 400 })],
			answer: WS_FAILED,
			creation: { organization: null, employeeUserId: null, team: null, invites: null },
			failures: [`POST ${UP_TENANT} 400`]
		},
		{
			label: 'a cut of POST /tenant is the same 502, and the mock had already recorded the tenant it was asked for',
			call: wsCall(WS_BODY),
			arm: { drops: { [UP_TENANT]: 1 } },
			asks: [wsAsk('POST', UP_WS_OPEN), wsAsk('POST', UP_WS_SIGNIN), wsAsk('POST', UP_TENANT, { status: 0 })],
			answer: WS_FAILED,
			creation: { tenant: WS_NAME, organization: null, employeeUserId: null, team: null, invites: null },
			failures: []
		},
		{
			label: 'an armed 400 on POST /organization turns into 502 {"code":"CREATED_NOT_OPENED"} — the tenant exists (create-workspace.ts:183-186)',
			call: wsCall(WS_BODY),
			arm: { fails: { [UP_ORGANIZATION]: 400 } },
			asks: [...WS_CHAIN.slice(0, 3), wsAsk('POST', UP_ORGANIZATION, { status: 400 })],
			answer: WS_UNOPENED,
			creation: { organization: null, employeeUserId: null, team: null, invites: null },
			failures: [`POST ${UP_ORGANIZATION} 400`]
		},
		{
			label: 'a cut of POST /organization is CREATED_NOT_OPENED too, with the organization still recorded',
			call: wsCall(WS_BODY),
			arm: { drops: { [UP_ORGANIZATION]: 1 } },
			asks: [...WS_CHAIN.slice(0, 3), wsAsk('POST', UP_ORGANIZATION, { status: 0 })],
			answer: WS_UNOPENED,
			creation: { organization: WS_NAME, employeeUserId: null, team: null, invites: null },
			failures: []
		},
		{
			label: 'an armed 400 on POST /employee is CREATED_NOT_OPENED, employeeUserId and team never recorded',
			call: wsCall(WS_BODY),
			arm: { fails: { [UP_EMPLOYEE]: 400 } },
			asks: [...WS_CHAIN.slice(0, 4), wsAsk('POST', UP_EMPLOYEE, { status: 400 })],
			answer: WS_UNOPENED,
			creation: { organization: WS_NAME, employeeUserId: null, team: null, invites: null },
			failures: [`POST ${UP_EMPLOYEE} 400`]
		},
		{
			label: 'an armed 400 on POST /organization-projects is CREATED_NOT_OPENED: the team call never ran (requests/organization-team.ts:16-23)',
			call: wsCall(WS_BODY),
			arm: { fails: { [UP_PROJECTS]: 400 } },
			asks: [...WS_CHAIN.slice(0, 5), wsAsk('POST', UP_PROJECTS, { status: 400 })],
			answer: WS_UNOPENED,
			creation: { employeeUserId: NEW.userId, team: null, invites: null },
			failures: [`POST ${UP_PROJECTS} 400`]
		},
		{
			label: 'an armed 400 on POST /organization-team is CREATED_NOT_OPENED, and no project clean-up was asked',
			// [mock limit] `requests/organization-team.ts:43-50` deletes the project only when the answer named one, and the
			// catch-all echo of `POST /api/organization-projects` (`mock-gauzy-server.mjs:826`) names no id.
			note: MOCK_LIMIT,
			call: wsCall(WS_BODY),
			arm: { fails: { [UP_TEAM]: 400 } },
			asks: [...WS_CHAIN.slice(0, 6), wsAsk('POST', UP_TEAM, { status: 400 })],
			answer: WS_UNOPENED,
			creation: { employeeUserId: NEW.userId, team: null, invites: null },
			failures: [`POST ${UP_TEAM} 400`]
		},
		{
			label: 'an armed 400 on POST /auth/refresh-token is CREATED_NOT_OPENED with the team already recorded',
			call: wsCall(WS_BODY),
			arm: { fails: { [UP_REFRESH]: 400 } },
			asks: [...WS_CHAIN.slice(0, 7), wsAsk('POST', UP_REFRESH, { status: 400 })],
			answer: WS_UNOPENED,
			creation: { team: wsState(WS_NAME, WS_TEAM, null).team, invites: null },
			failures: [`POST ${UP_REFRESH} 400`]
		},
		...[400, 429].map(
			(status): Case => ({
				label: `an armed ${status} on GET /roles/options still 201: {"invited":0,"invitesFailed":true} with the new session (finding 5)`,
				call: wsCall(WS_BODY),
				arm: { fails: { [UP_ROLE_OPTIONS]: status } },
				asks: [...WS_CHAIN, { ...wsRoleAsk(), status }],
				answer: WS_CREATED(0, true),
				writes: WS_SESSION,
				creation: { invites: null },
				failures: [`GET ${UP_ROLE_OPTIONS} ${status}`]
			})
		),
		{
			label: 'a cut of GET /roles/options is the same 201 {"invited":0,"invitesFailed":true}',
			call: wsCall(WS_BODY),
			arm: { drops: { [UP_ROLE_OPTIONS]: 1 } },
			asks: [...WS_CHAIN, { ...wsRoleAsk(), status: 0 }],
			answer: WS_CREATED(0, true),
			writes: WS_SESSION,
			creation: { invites: null },
			failures: []
		},
		...[400, 429].map(
			(status): Case => ({
				label: `an armed ${status} on POST /invite/emails is 201 {"invited":0,"invitesFailed":true}, not a failure of the workspace`,
				call: wsCall(WS_BODY),
				arm: { fails: { [UP_INVITE_WRITE]: status } },
				asks: [...WS_CHAIN, wsRoleAsk(), wsAsk('POST', UP_INVITE_WRITE, { status })],
				answer: WS_CREATED(0, true),
				writes: WS_SESSION,
				creation: { invites: null },
				failures: [`POST ${UP_INVITE_WRITE} ${status}`]
			})
		),
		{
			label: 'a cut of POST /invite/emails answers the same 201 — and the mock had already recorded the addresses',
			note: MOCK_LIMIT,
			call: wsCall(WS_BODY),
			arm: { drops: { [UP_INVITE_WRITE]: 1 } },
			asks: [...WS_CHAIN, wsRoleAsk(), wsAsk('POST', UP_INVITE_WRITE, { status: 0 })],
			answer: WS_CREATED(0, true),
			writes: WS_SESSION,
			creation: wsState(WS_NAME, WS_TEAM, WS_EMAILS),
			failures: []
		},
		{
			label: 'an armed 403 on <tenant A>:/auth/workspaces fires: that call carries the signed-in tenant',
			call: wsCall(WS_BODY),
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_WS_OPEN}`]: 403 } }),
			asks: [wsAsk('POST', UP_WS_OPEN, { status: 403 })],
			askedStatus: 403,
			answer: WS_FAILED
		},
		{
			label: 'the same arm on <tenant B> never fires',
			call: wsCall(WS_BODY),
			arm: (ids) => ({ fails: { [`${ids.tenantB}:${UP_WS_OPEN}`]: 403 } }),
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION
		},
		{
			label: 'without auth-tenant-id the tenant-keyed arm cannot fire, while the same arm as a bare path does',
			call: { body: WS_BODY, cookieWithout: 'auth-tenant-id' },
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_WS_OPEN}`]: 403 } }),
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION
		},
		{
			label: 'no arm of POST /tenant is tenant-keyed: that call creates the tenant and carries no tenant-id',
			call: wsCall(WS_BODY),
			arm: (ids) => ({ fails: { [`${ids.tenantA}:${UP_TENANT}`]: 403 } }),
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION
		},
		{
			label: 'and the same arm addressed to the other tenant does nothing either',
			call: wsCall(WS_BODY),
			arm: (ids) => ({ fails: { [`${ids.tenantB}:${UP_TENANT}`]: 403 } }),
			asks: WS_INVITE_CHAIN,
			answer: WS_CREATED(1, false),
			writes: WS_SESSION
		},
		...FOREIGN_HEADERS.map(
			(foreign): Case => ({
				label: `${foreign.label} — 403 with no-store, nothing asked (route.ts:24-25 runs before the guard)`,
				call: { body: WS_BODY, headers: foreign.headers },
				asks: [] as Ask[],
				answer: FOREIGN_SITE_REFUSAL
			})
		),
		{
			label: 'a caller cannot name the workspace: ?name=FromQuery&laneProbe=7 is dropped and the body decides',
			call: { path: '/api/auth/create-workspace?name=FromQuery&laneProbe=7', body: WS_BODY },
			asks: [
				...WS_CHAIN.map((ask) => ({ ...ask, absent: ['name', 'laneProbe'] })),
				{ ...wsRoleAsk(), absent: ['laneProbe'] },
				wsAsk('POST', UP_INVITE_WRITE, { absent: ['name', 'laneProbe'] })
			],
			answer: WS_CREATED(1, false),
			writes: WS_SESSION,
			creation: wsState(WS_NAME, WS_TEAM, WS_EMAILS)
		},
		{
			label: 'GET is 405 with no body, no media type and nothing asked',
			call: { method: 'GET', noBody: true },
			asks: [] as Ask[],
			answer: VERB_NOT_EXPORTED
		},
		{
			label: 'PUT is 405 with nothing asked — POST is the only verb this file exports',
			call: { method: 'PUT', body: WS_BODY },
			asks: [] as Ask[],
			answer: VERB_NOT_EXPORTED
		}
	];

	pinCases('create-workspace', CREATE_WS, cases);
});
