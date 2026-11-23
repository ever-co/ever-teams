import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { mockReset } from '../../helpers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * The other half of the 81 route files that catch a failed Gauzy call with
 * `gauzyErrorResponse(error, '<fallback sentence>')` (`grep -rln gauzyErrorResponse( apps/web/app/api --include=route.ts`).
 * `suites/lane-a/gauzy-refusals.spec.ts` pins 16 of those handlers; this file pins the remaining 86 — every
 * `app/api` route file × exported verb that reaches that `catch`, minus what is named under "What is not here" below.
 * Same shape as lane-a's file: one control (nothing armed), one test per armed upstream status, one test that the
 * route's own sentence stays out of a refusal, one test that the sentence IS the answer when the call is cut.
 *
 * ## The code this file measures (each line read out of its file before it is named)
 *
 * - `core/services/server/gauzy-error-response.ts`: `fallbackBody` is `{ message: fallbackMessage }` and nothing else
 *   (`:25`); a rejection that is not a Promise is answered with that body on a 502 (`:26-29`); a rejection that IS one
 *   is unwrapped (`:31`) and keeps its own status whenever that body carries a numeric `statusCode` of 400 or more
 *   (`errorStatusOf` `:4-17`, used at `:32-37`): `NextResponse.json(body, { status })` at `:37`, the body untouched. A
 *   body without such a status is the 502 branch again (`:33-35`).
 * - `core/services/server/fetch.ts:122-132`: a non-2xx upstream answer rejects with `Promise.reject(data)` (a marked
 *   handled rejection, `:129-131`), i.e. Gauzy's own body inside a rejected promise, and `:143-150` (`unwrapRejection`)
 *   is what pulls it back out. So an armed `fails` arm is exactly the branch at `gauzy-error-response.ts:31-37`, while a
 *   `drops` arm is the branch at `:26-29` (a cut connection rejects with a plain error, `fetch.ts:141-142`).
 * - The mock's switches: `scenario.fails` (`cypress/support/mock-gauzy-server.mjs:1082-1100`) is keyed
 *   `<tenant>:<path>`, then `<tenant>`, then `<path>` (`:1089-1093`), the tenant coming from `?tenantId`, then
 *   `where[tenantId]`, then the `tenant-id` header (`:1034-1037`), and only an integer 400-599 arms it (`:1095`). Its
 *   payload is `{ statusCode, message: 'Synthetic Gauzy refusal (<status>)' }` (`:1099-1100`), the fixture handler is
 *   skipped (`:1096-1098`) and the answer's status is the armed one (`:1115`). A `drops` arm (`:1065-1073`, cut at
 *   `:1141-1148` with `request.socket?.destroy()`) writes nothing and is logged with `status: 0` (`:1129`), so
 *   `mock.failures()` — which filters `status >= 400` (`playwright/api-fixtures.ts:61`) — never counts a drop.
 * - `core/services/server/guards/authenticated-guard-app.ts`: every route here authenticates through
 *   `authenticatedGuard` (`:55`), and it authenticates by asking the upstream `GET /user/me` (`:76`), shared per token
 *   for 5 s by `sessionChecks` (`:29`, used at `:80`) — which is why `fails` is never armed on `/api/user/me` and never
 *   keyed on a bare tenant here: both would refuse the guard instead of the route under test. Because the answer is
 *   cached, `/api/user/me` appears in some logs and not in others; no assertion below reads a log entry other than the
 *   one for the route's own upstream path.
 * - `core/services/server/same-origin-request.ts:16-33`: `refuseForeignOrigin`, which most of the writes here call
 *   first, refuses only a `sec-fetch-site: cross-site|same-site` or an `Origin` whose host is not this host. Playwright's
 *   `request` context sends neither header, so a write from this file reaches the handler, as in lane-a's file. It also
 *   means no arm here has to fight the mock's own browser-origin guard (`mock-gauzy-server.mjs:1012-1016`).
 * - What the mock answers an unarmed call of these paths: it has no handler for most of them, so its catch-all answers
 *   them — a DELETE as `{ affected: 1, raw: [] }` (`:825`), any other write as the body it was sent or
 *   `{ success: true }` (`:826`), a GET as an empty page (`:827`); `/api/currency` (`:718`), `/api/languages` (`:731`),
 *   `/api/favorite` (`:822`), `/api/organization-team-join` (`:823`), `/api/roles` (`:626`), `/api/role-permissions/me`
 *   (`:627`), `/api/employee-notification*` (`:657-680`) and `/api/user-api-tokens/config` (`:809`) have their own
 *   answers. That is why every control below is a real 2xx rather than a mock 404, and why an id this mock has no
 *   record of still gets answered: it never looks the record up.
 *
 * ## What was measured before any expectation was written down
 *
 * Probes against this lane on 2026-11-23, all read in full before this file was written:
 * `E:\Coding\.tmp\s2-lane-c-relay-probe-control.txt` (89 candidate controls, each with the mock log it produced),
 * `E:\Coding\.tmp\s2-lane-c-relay-probe-statuses.txt` (89 × 7 armed statuses),
 * `E:\Coding\.tmp\s2-lane-c-relay-probe-drops.txt` (the 89 `drops` arms),
 * `E:\Coding\.tmp\s2-lane-c-relay-probe-dailypost.txt` (the `POST /api/daily-plan/plan/[planId]` re-probe after its
 * upstream turned out to be `/api/daily-plan/<planId>/task`, `requests/daily-plan.ts:227`, not `/api/daily-plan/<planId>`)
 * and `E:\Coding\.tmp\s2-lane-c-relay-probe-variants.txt` (the two handlers whose control is not 2xx, tried with
 * `roleName` and `extraPermissions`). Every number, body and sentence below is one of those measurements.
 *
 * ## The finding, stated up front
 *
 * **None of these 86 routes remaps or swallows an upstream refusal.** For all 602 route-and-status pairs the app
 * answered the armed status, unchanged, with Gauzy's body verbatim and nothing added, and every `drops` arm was
 * answered 502 with exactly `{ message: <that route's own sentence> }`. So no armed case in this file is a
 * `measured, not intended` case; what the run adds is the witness that it happened upstream (the mock logged the armed
 * status) and that the route's own sentence stayed out of the refusal.
 *
 * Two things the measurements did turn up, both pinned where they are pinned:
 *
 * 1. **`POST /api/user-api-tokens` has no 2xx control** (`app/api/user-api-tokens/route.ts:77-80`): its control answer
 *    is a 502 with `NOT_CREATED_MESSAGE` because the mock's catch-all echoes the request body (`:826`) and
 *    `createdUserApiTokenSchema` refuses that echo. The refusal half is still the relay under test — the armed status
 *    arrives unchanged, and the control's `failures()` witness being empty is what proves the 502 was this app's own,
 *    with the upstream logged 200. Marked `measured, not intended` on its row.
 * 2. Two sentences name the wrong thing, and one pair of routes says the same thing four different ways. Named on
 *    their rows: `app/api/email-reset/verify-change-email/route.ts:27` reuses the *request* route's sentence
 *    ("could not be created") for a verification; `app/api/organization-team/teams/[id]/route.ts:32` says "the team
 *    could not be deleted" for a handler that removes one account's memberships (`requests/organization-team.ts:267-277`
 *    `removeUserFromAllTeam`); and `app/api/organization-team-employee/[id]/route.ts:37,74` versus
 *    `app/api/organization-team/employee/[id]/route.ts:33,67` are two spellings ('The team member could not be
 *    updated' with no full stop, 'The team member could not be updated.') of the same pair of upstream calls.
 *
 * ## What is not here, and why
 *
 * The arithmetic of the 106 `gauzyErrorResponse(...)` call sites in those 81 route files: 16 pinned by lane-a + 86 here
 * + 2 Board routes + 1 `PUT /api/user/[id]/role` + 1 `POST /api/auth/signin-email-password` = 106.
 *
 * - **The 16 handlers `suites/lane-a/gauzy-refusals.spec.ts` already pins**: the four daily-plan reads (`GET
 *   /api/daily-plan`, `/me`, `/employee/[employeeId]`, `/task/[taskId]`), `GET|POST /api/comment`,
 *   `PUT|DELETE /api/comment/[id]`, `PUT /api/employee-notification/[id]`, `POST /api/timer/start`,
 *   `POST /api/timer/discard`, `GET /api/organization-projects/[id]/rates`, `PUT /api/organization-projects/[id]/rate`,
 *   `PUT /api/organization-projects/[id]/members/[employeeId]/rate`, `POST /api/employee/rate-change-request` and
 *   `DELETE /api/user-api-tokens/[id]`.
 * - **`POST /api/auth/signin-email-password`** — lane-b owns the sign-in routes.
 * - **`GET /api/board/members` and `POST /api/board/notify`** (`app/api/board/members/route.ts:18-20`,
 *   `app/api/board/notify/route.ts:39-41`): both refuse a caller whose `Origin` is not the Board app before the session
 *   is even read, and this lane's app was started without `E2E_BOARD_APP_DOMAIN` (`playwright/test-servers.ts:145-152`),
 *   so `isTrustedBoardOrigin` refuses every origin. Measured: both answer 403 `{"message":"Forbidden"}` with an *empty*
 *   mock log, armed or not. Making them reachable means restarting the lane with a Board origin, which is not this file's
 *   to do; `suites/lane-b/board-preflight.spec.ts` is the lane that configured one.
 * - **`PUT /api/user/[id]/role`** (`app/api/user/[id]/role/route.ts:64-99`): its control is a 502 with
 *   `NOT_CHANGED_MESSAGE`, measured with nothing armed, with `roleName: 'SUPER_ADMIN'`, with
 *   `extraPermissions: ['ORG_USERS_EDIT']` and with both, for the fixture user and for a teammate. The reason is the
 *   mock, not the role: `readRoleChangeFacts` (`:26-41`) parses three reads with `roleChangeFactsSchema`, and the mock
 *   answers `GET /api/user/<id>` with its catch-all page `{"items":[],"total":0}` (`mock-gauzy-server.mjs:827`) — no
 *   account, so the facts never parse and `assignUserRoleRequest` (`requests/user.ts:44-54`, `PUT /api/user/<id>`) is
 *   never reached. Its refusal half does work (armed on `GET /api/role-permissions/me`, the first fact read, a 403 came
 *   back as `{"statusCode":403,"message":"Synthetic Gauzy refusal (403)"}` with all three reads in the log), but with no
 *   2xx control and with its write unreachable there is nothing honest for the control test to pin, so it is left out
 *   rather than faked. It also needs an arm keyed on a path its *read* uses, which no other row here does.
 * - Handlers of those 81 files that never reach `gauzyErrorResponse`: `POST /api/daily-plan` (no `try`,
 *   `app/api/daily-plan/route.ts:8-21`), `GET /api/tasks/employee/[employeeId]` (`route.ts:8-34`), `GET` and
 *   `DELETE /api/user/[id]` (`route.ts:10-30`, `:66-89`), `GET /api/plugins/docs/imports` (that one is
 *   `forwardToGauzy`, `route.ts:11-13`, pinned by lane-b's `forward-refusals.spec.ts`), and `OPTIONS` of the two Board
 *   routes (no Gauzy call at all). None of them can answer with a relayed status.
 * - No route here refuses the fixture role on a permission (`refuseUnlessPermitted` appears in none of these 81 files),
 *   so no row arms `extraPermissions`.
 *
 * ## Cost
 *
 * 86 handlers × (1 control + 7 armed statuses + 1 sentence-stays-out + 1 drop) = 860 cases, all browser-free, one
 * worker, one mock. A `drops` arm costs the mock one socket it opens and destroys (`mock-gauzy-server.mjs:1141-1148`)
 * and nothing else: the arm is `1` ms, the same bound lane-a's file uses, and the 89 arms the probes cut took ~11 s in
 * total.
 */

/** The statuses a test arms the mock with, in the order the tests arm them. */
const REFUSAL_STATUSES = [400, 401, 403, 404, 409, 500, 503];

/**
 * One status used when a case asks for "a refusal" rather than for a particular one. 403, because it is the refusal
 * these routes most often mean in production (a role that may not do the thing).
 */
const ONE_REFUSAL = 403;

/**
 * One multipart body, the way the two upload routes read it (`readCappedFormData`,
 * `core/lib/auth/ever-id/body.ts`). The mock's catch-all answers a write by echoing it (`mock-gauzy-server.mjs:826`),
 * so the control is a 2xx without the mock knowing anything about a file.
 */
const MULTIPART_BOUNDARY = 'lane-c-relay-5726';
const multipart = (part: { field: string; filename: string; value: string; type: string }) => ({
	body:
		`--${MULTIPART_BOUNDARY}\r\nContent-Disposition: form-data; name="${part.field}"; filename="${part.filename}"\r\n` +
		`Content-Type: ${part.type}\r\n\r\n${part.value}\r\n--${MULTIPART_BOUNDARY}--\r\n`,
	headers: { 'content-type': `multipart/form-data; boundary=${MULTIPART_BOUNDARY}` }
});

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
	/** A multipart body for the two routes that read a form instead of JSON. */
	multipart?: () => { body: string; headers: Record<string, string> };
	/** The status the same call answers with nothing armed. */
	control: number;
	/** The sentence this route hands `gauzyErrorResponse` — read from its `catch`, line named per route below. */
	fallback: string;
};

const ROUTES: RefusalRoute[] = [
	{
		label: 'the activity log read',
		method: 'GET',
		app: () => '/api/activity-log?page=1&limit=10',
		// requests/activity-log.ts:15 forwards the incoming query string as it is
		upstream: () => '/api/activity-log',
		control: 200,
		// app/api/activity-log/route.ts:20
		fallback: 'Activity log request failed'
	},
	{
		label: 'the currencies read',
		method: 'GET',
		app: () => '/api/currency',
		// requests/currency.ts:7
		upstream: () => '/api/currency',
		control: 200,
		// app/api/currency/route.ts:17
		fallback: 'The list of currencies could not be read.'
	},
	{
		label: 'the bulk removal of a task from plans',
		method: 'PUT',
		app: (ids) => `/api/daily-plan/${ids.task}/remove`,
		// requests/daily-plan.ts:273
		upstream: (ids) => `/api/daily-plan/${ids.task}/remove`,
		body: () => ({}),
		control: 200,
		// app/api/daily-plan/[id]/remove/route.ts:28
		fallback: 'The task could not be removed from the plans.'
	},
	{
		label: 'the one-plan read',
		method: 'GET',
		app: (ids) => `/api/daily-plan/${ids.plan}`,
		// requests/daily-plan.ts:169
		upstream: (ids) => `/api/daily-plan/${ids.plan}`,
		control: 200,
		// app/api/daily-plan/[id]/route.ts:28
		fallback: 'The plan could not be read.'
	},
	{
		label: 'the plan edit',
		method: 'PUT',
		app: (ids) => `/api/daily-plan/${ids.plan}`,
		// requests/daily-plan.ts:207
		upstream: (ids) => `/api/daily-plan/${ids.plan}`,
		body: () => ({ name: 'A pinned refusal probe plan' }),
		control: 200,
		// app/api/daily-plan/[id]/route.ts:55
		fallback: 'The plan could not be updated.'
	},
	{
		label: 'the plan delete',
		method: 'DELETE',
		app: (ids) => `/api/daily-plan/${ids.plan}`,
		// requests/daily-plan.ts:257
		upstream: (ids) => `/api/daily-plan/${ids.plan}`,
		control: 200,
		// app/api/daily-plan/[id]/route.ts:78
		fallback: 'The plan could not be deleted.'
	},
	{
		label: 'the plan task add',
		method: 'POST',
		app: (ids) => `/api/daily-plan/plan/${ids.plan}`,
		// requests/daily-plan.ts:227 — the same upstream path as the removal below, another verb
		upstream: (ids) => `/api/daily-plan/${ids.plan}/task`,
		body: () => ({ daysOff: [] }),
		control: 200,
		// app/api/daily-plan/plan/[planId]/route.ts:33
		fallback: 'The task could not be added to the plan.'
	},
	{
		label: 'the plan task removal',
		method: 'PUT',
		app: (ids) => `/api/daily-plan/plan/${ids.plan}`,
		// requests/daily-plan.ts:247
		upstream: (ids) => `/api/daily-plan/${ids.plan}/task`,
		body: () => ({ daysOff: [] }),
		control: 200,
		// app/api/daily-plan/plan/[planId]/route.ts:62
		fallback: 'The task could not be removed from the plan.'
	},
	{
		label: 'the e-mail change request',
		method: 'POST',
		app: () => '/api/email-reset/request-change-email',
		// requests/email-reset.ts:13
		upstream: () => '/api/email-reset/request-change-email',
		body: () => ({ email: 'manager@example.test' }),
		control: 200,
		// app/api/email-reset/request-change-email/route.ts:27
		fallback: 'The change of e-mail could not be created.'
	},
	{
		label: 'the e-mail change verification',
		method: 'POST',
		app: () => '/api/email-reset/verify-change-email',
		// requests/email-reset.ts:31
		upstream: () => '/api/email-reset/verify-change-email',
		body: () => ({ code: '12345678' }),
		control: 200,
		// app/api/email-reset/verify-change-email/route.ts:27 — the SAME sentence as the request route above, which is
		// what this one needs too; the sentence names a creation, this route verifies a change.
		fallback: 'The change of e-mail could not be created.'
	},
	{
		label: 'the notification settings read',
		method: 'GET',
		app: () => '/api/employee-notification-setting',
		// requests/employee-notification.ts:56
		upstream: () => '/api/employee-notification-setting',
		control: 200,
		// app/api/employee-notification-setting/route.ts:24
		fallback: 'Notification settings request failed'
	},
	{
		label: 'the notification settings create',
		method: 'POST',
		app: () => '/api/employee-notification-setting',
		// requests/employee-notification.ts:69
		upstream: () => '/api/employee-notification-setting',
		// core/lib/validation/employee-notification.ts, a strict object of switches
		body: () => ({ preferences: { TIME_TRACKING: true } }),
		control: 200,
		// app/api/employee-notification-setting/route.ts:49
		fallback: 'Notification settings save failed'
	},
	{
		label: 'the notification settings edit',
		method: 'PUT',
		app: (ids) => `/api/employee-notification-setting/${ids.plan}`,
		// requests/employee-notification.ts:84
		upstream: (ids) => `/api/employee-notification-setting/${ids.plan}`,
		body: () => ({ preferences: { TIME_TRACKING: true } }),
		control: 200,
		// app/api/employee-notification-setting/[id]/route.ts:41, the same sentence as the create above
		fallback: 'Notification settings save failed'
	},
	{
		label: 'the notifications read',
		method: 'GET',
		app: () => '/api/employee-notification',
		// requests/employee-notification.ts:18
		upstream: () => '/api/employee-notification',
		control: 200,
		// app/api/employee-notification/route.ts:20
		fallback: 'Notifications request failed'
	},
	{
		label: 'the mark-all-read write',
		method: 'PUT',
		app: () => '/api/employee-notification/mark-all-read',
		// requests/employee-notification.ts:42
		upstream: () => '/api/employee-notification/mark-all-read',
		body: () => ({}),
		control: 200,
		// app/api/employee-notification/mark-all-read/route.ts:19
		fallback: 'Marking notifications as read failed'
	},
	{
		label: "the member's pay-rate read",
		method: 'GET',
		app: (ids) => `/api/employee/${ids.employee}/pay-rate`,
		// requests/rates.ts:80
		upstream: (ids) => `/api/employee/${ids.employee}/pay-rate`,
		control: 200,
		// app/api/employee/[id]/pay-rate/route.ts:25
		fallback: 'The pay rate could not be read.'
	},
	{
		label: "the own profile's rates save",
		method: 'PUT',
		app: (ids) => `/api/employee/${ids.employee}/profile`,
		// requests/rates.ts:95
		upstream: (ids) => `/api/employee/${ids.employee}/profile`,
		// core/lib/validation/rates.ts ownProfileRatesBodySchema
		body: () => ({ billRateValue: 25 }),
		control: 200,
		// app/api/employee/[id]/profile/route.ts:35
		fallback: 'Your rates could not be saved.'
	},
	{
		label: 'the employee save',
		method: 'PUT',
		app: (ids) => `/api/employee/${ids.employee}`,
		// requests/employee.ts:88
		upstream: (ids) => `/api/employee/${ids.employee}`,
		body: () => ({ displayName: 'A pinned refusal probe employee' }),
		control: 200,
		// app/api/employee/[id]/route.ts:29
		fallback: 'The employee could not be saved.'
	},
	{
		label: 'the inactive members read',
		method: 'GET',
		app: () => '/api/employee/inactive?page=1',
		// requests/employee.ts:71, the paginated read this route answers from
		upstream: () => '/api/employee/pagination',
		control: 200,
		// app/api/employee/inactive/route.ts:37 gauzyErrorResponse(error, UNREADABLE_MESSAGE), the constant at :8
		fallback: 'The inactive members could not be read.'
	},
	{
		label: 'the members read',
		method: 'GET',
		app: () => '/api/employee/members',
		// requests/employee.ts:46
		upstream: () => '/api/employee/members',
		control: 200,
		// app/api/employee/members/route.ts:26
		fallback: 'The list of members could not be read.'
	},
	{
		label: 'the favorite create',
		method: 'POST',
		app: () => '/api/favorite',
		// requests/favorite.ts:15
		upstream: () => '/api/favorite',
		body: (ids) => ({ name: 'A pinned refusal probe favorite', entity: 'Task', entityId: ids.task }),
		control: 200,
		// app/api/favorite/route.ts:23
		fallback: 'The favorite could not be created.'
	},
	{
		label: 'the favorites read',
		method: 'GET',
		app: () => '/api/favorite/employee',
		// requests/favorite.ts:33
		upstream: () => '/api/favorite/employee',
		control: 200,
		// app/api/favorite/employee/route.ts:21
		fallback: 'The list of favorites could not be read.'
	},
	{
		label: 'the favorite delete',
		method: 'DELETE',
		app: (ids) => `/api/favorite/${ids.plan}`,
		// requests/favorite.ts:50
		upstream: (ids) => `/api/favorite/${ids.plan}`,
		control: 200,
		// app/api/favorite/[id]/route.ts:21
		fallback: 'The favorite could not be deleted.'
	},
	{
		label: 'the integration delete',
		method: 'DELETE',
		app: (ids) => `/api/integration-tenant/${ids.plan}`,
		// requests/integrations/integration-tenant.ts:36
		upstream: (ids) => `/api/integration-tenant/${ids.plan}`,
		control: 200,
		// app/api/integration-tenant/[id]/route.ts:25
		fallback: 'The integration could not be deleted.'
	},
	{
		label: 'the integrations read',
		method: 'GET',
		app: () => '/api/integration',
		// requests/integrations/index.ts:32
		upstream: () => '/api/integration',
		control: 200,
		// app/api/integration/route.ts:25
		fallback: 'The list of integrations could not be read.'
	},
	{
		label: 'the integration types read',
		method: 'GET',
		app: () => '/api/integration/types',
		// requests/integrations/types.ts:20
		upstream: () => '/api/integration/types',
		control: 200,
		// app/api/integration/types/route.ts:21
		fallback: 'The list of integration types could not be read.'
	},
	{
		label: 'the GitHub installation read',
		method: 'GET',
		app: (ids) => `/api/integration/github/metadata?integrationId=${ids.plan}`,
		// requests/integrations/github.ts:53
		upstream: (ids) => `/api/integration/github/${ids.plan}/metadata`,
		control: 200,
		// app/api/integration/github/metadata/route.ts:29
		fallback: 'The GitHub installation could not be read.'
	},
	{
		label: 'the GitHub connection create',
		method: 'POST',
		app: () => '/api/integration/github/oauth',
		// requests/integrations/github.ts:27
		upstream: () => '/api/integration/github/oauth',
		body: () => ({ installation_id: 1, setup_action: 'install', code: 'a pinned refusal probe code' }),
		control: 200,
		// app/api/integration/github/oauth/route.ts:30
		fallback: 'The GitHub connection could not be created.'
	},
	{
		label: 'the GitHub repositories read',
		method: 'GET',
		app: (ids) => `/api/integration/github/repositories?integrationId=${ids.plan}`,
		// requests/integrations/github.ts:78
		upstream: (ids) => `/api/integration/github/${ids.plan}/repositories`,
		control: 200,
		// app/api/integration/github/repositories/route.ts:29
		fallback: 'The list of GitHub repositories could not be read.'
	},
	{
		label: 'the GitHub repository sync create',
		method: 'POST',
		app: () => '/api/integration/github/repository/sync',
		// requests/integrations/github.ts:95
		upstream: () => '/api/integration/github/repository/sync',
		body: () => ({ repository: 'a-pinned-refusal-probe-repository' }),
		control: 200,
		// app/api/integration/github/repository/sync/route.ts:28
		fallback: 'The GitHub repository sync could not be created.'
	},
	{
		label: 'the invitation resend',
		method: 'POST',
		app: () => '/api/invite/resend',
		// requests/invite.ts:152
		upstream: () => '/api/invite/resend',
		body: (ids) => ({ inviteId: ids.invite }),
		control: 200,
		// app/api/invite/resend/route.ts:42
		fallback: 'The invitation could not be sent again.'
	},
	{
		label: 'the issue types read',
		method: 'GET',
		app: () => '/api/issue-types',
		// requests/issue-type.ts:74
		upstream: () => '/api/issue-types',
		control: 200,
		// app/api/issue-types/route.ts:22 — the sentence is singular for what is a list read
		fallback: 'The issue type could not be read.'
	},
	{
		label: 'the issue type create',
		method: 'POST',
		app: () => '/api/issue-types',
		// requests/issue-type.ts:7
		upstream: () => '/api/issue-types',
		body: () => ({ name: 'A pinned refusal probe issue type' }),
		control: 200,
		// app/api/issue-types/route.ts:41
		fallback: 'The issue type could not be created.'
	},
	{
		label: 'the issue type edit',
		method: 'PUT',
		app: (ids) => `/api/issue-types/${ids.plan}`,
		// requests/issue-type.ts:27
		upstream: (ids) => `/api/issue-types/${ids.plan}`,
		body: () => ({ name: 'A pinned refusal probe issue type' }),
		control: 200,
		// app/api/issue-types/[id]/route.ts:32
		fallback: 'The issue type could not be updated.'
	},
	{
		label: 'the issue type delete',
		method: 'DELETE',
		app: (ids) => `/api/issue-types/${ids.plan}`,
		// requests/issue-type.ts:45
		upstream: (ids) => `/api/issue-types/${ids.plan}`,
		control: 200,
		// app/api/issue-types/[id]/route.ts:58
		fallback: 'The issue type could not be deleted.'
	},
	{
		label: 'the languages read',
		method: 'GET',
		app: () => '/api/languages',
		// requests/languages.ts:11
		upstream: () => '/api/languages',
		control: 200,
		// app/api/languages/route.ts:22
		fallback: 'The list of languages could not be read.'
	},
	{
		label: 'the project setting edit',
		method: 'PUT',
		app: (ids) => `/api/organization-projects/setting/${ids.project}`,
		// requests/organization-projects.ts:18
		upstream: (ids) => `/api/organization-projects/setting/${ids.project}`,
		body: () => ({ showTaskEstimationGoals: true }),
		control: 200,
		// app/api/organization-projects/setting/[id]/route.ts:35
		fallback: 'The setting of the project could not be updated.'
	},
	{
		label: 'the member active-task edit',
		method: 'PUT',
		app: (ids) => `/api/organization-team-employee/${ids.member}/active-task`,
		// requests/organization-team-employee.ts:60
		upstream: (ids) => `/api/organization-team-employee/${ids.member}/active-task`,
		body: () => ({ isActive: true }),
		control: 200,
		// app/api/organization-team-employee/[id]/active-task/route.ts:34
		fallback: 'The active task of the member could not be updated.'
	},
	{
		label: 'the team membership edit',
		method: 'PUT',
		app: (ids) => `/api/organization-team-employee/${ids.member}`,
		// requests/organization-team-employee.ts:40
		upstream: (ids) => `/api/organization-team-employee/${ids.member}`,
		body: () => ({ isActive: true }),
		control: 200,
		// app/api/organization-team-employee/[id]/route.ts:37 — no full stop, unlike the sibling route below
		fallback: 'The team member could not be updated'
	},
	{
		label: 'the team membership removal',
		method: 'DELETE',
		app: (ids) =>
			`/api/organization-team-employee/${ids.member}?employeeId=${ids.employee}&organizationTeamId=${ids.teamA}`,
		// requests/organization-team-employee.ts:20
		upstream: (ids) => `/api/organization-team-employee/${ids.member}`,
		control: 200,
		// app/api/organization-team-employee/[id]/route.ts:74
		fallback: 'The team member could not be removed'
	},
	{
		label: 'the request to join decision',
		method: 'PUT',
		app: (ids) => `/api/organization-team-join/${ids.plan}/ACCEPTED`,
		// requests/request-to-join-team.ts:97
		upstream: (ids) => `/api/organization-team-join/${ids.plan}/ACCEPTED`,
		control: 200,
		// app/api/organization-team-join/[id]/[action]/route.ts:32
		fallback: 'The request to join could not be updated.'
	},
	{
		label: 'the team member delete by employee',
		method: 'DELETE',
		app: (ids) => `/api/organization-team/employee/${ids.employee}`,
		// requests/organization-team.ts:234 — the same upstream path as the membership removal above, another app route
		upstream: (ids) => `/api/organization-team-employee/${ids.employee}`,
		control: 200,
		// app/api/organization-team/employee/[id]/route.ts:33
		fallback: 'The team member could not be deleted.'
	},
	{
		label: 'the team member order edit',
		method: 'PUT',
		app: (ids) => `/api/organization-team/employee/${ids.employee}`,
		// requests/organization-team.ts:257
		upstream: (ids) => `/api/organization-team-employee/${ids.employee}`,
		body: (ids) => ({ order: 2, organizationTeamId: ids.teamA, organizationId: ids.organizationA }),
		control: 200,
		// app/api/organization-team/employee/[id]/route.ts:67 — 'The team member could not be updated.' with a full
		// stop, where the route above spells the same thing without one
		fallback: 'The team member could not be updated.'
	},
	{
		label: 'the user teams delete',
		method: 'DELETE',
		app: (ids) => `/api/organization-team/teams/${ids.user}`,
		// requests/organization-team.ts:277 removeUserFromAllTeam: the id is a USER and the write removes memberships
		upstream: (ids) => `/api/organization-team/teams/${ids.user}`,
		control: 200,
		// app/api/organization-team/teams/[id]/route.ts:32 — the sentence names a team, the handler deletes one
		// account's memberships, which is what its own requests module calls it
		fallback: 'The team could not be deleted.'
	},
	{
		label: 'the document download read',
		method: 'GET',
		app: (ids) => `/api/plugins/docs/documents/${ids.plan}/download`,
		// requests/entity-files.ts:81
		upstream: (ids) => `/api/plugins/docs/documents/${ids.plan}/download`,
		control: 200,
		// app/api/plugins/docs/documents/[id]/download/route.ts:25
		fallback: 'Download request failed'
	},
	{
		label: 'the document upload',
		method: 'POST',
		app: () => '/api/plugins/docs/documents/upload',
		// requests/entity-files.ts:71
		upstream: () => '/api/plugins/docs/documents/upload',
		multipart: () =>
			multipart({ field: 'files', filename: 'relay-probe.txt', value: 'relay probe file', type: 'text/plain' }),
		control: 200,
		// app/api/plugins/docs/documents/upload/route.ts:55
		fallback: 'Upload failed'
	},
	{
		label: 'the docs import',
		method: 'POST',
		app: () => '/api/plugins/docs/imports',
		// requests/docs-import.ts:12
		upstream: () => '/api/plugins/docs/imports',
		multipart: () =>
			multipart({
				field: 'file',
				filename: 'relay-probe.zip',
				value: 'PK0304relay probe zip',
				type: 'application/zip'
			}),
		control: 200,
		// app/api/plugins/docs/imports/route.ts:47
		fallback: 'Import failed'
	},
	{
		label: 'the file links read',
		method: 'GET',
		app: (ids) => `/api/plugins/docs/links?entity=Task&entityId=${ids.task}`,
		// requests/entity-files.ts:30
		upstream: () => '/api/plugins/docs/links',
		control: 200,
		// app/api/plugins/docs/links/route.ts:36
		fallback: 'Files request failed'
	},
	{
		label: 'the file link create',
		method: 'POST',
		app: () => '/api/plugins/docs/links',
		// requests/entity-files.ts:52
		upstream: () => '/api/plugins/docs/links',
		// core/types/schemas/documents/entity-file.schema.ts createEntityFileLinkSchema
		body: (ids) => ({ documentId: ids.plan, entity: 'Task', entityId: ids.task }),
		control: 200,
		// app/api/plugins/docs/links/route.ts:63
		fallback: 'File link failed'
	},
	{
		label: 'the file unlink',
		method: 'DELETE',
		app: (ids) => `/api/plugins/docs/links/${ids.plan}`,
		// requests/entity-files.ts:62
		upstream: (ids) => `/api/plugins/docs/links/${ids.plan}`,
		control: 200,
		// app/api/plugins/docs/links/[id]/route.ts:28
		fallback: 'File unlink failed'
	},
	{
		label: 'the role permissions read',
		method: 'GET',
		app: (ids) => `/api/role-permissions/${ids.role}`,
		// requests/role-permissions.ts:31 — the list read with the id in `where`, so the pathname carries no id
		upstream: () => '/api/role-permissions',
		control: 200,
		// app/api/role-permissions/[id]/route.ts:29
		fallback: 'The permission of the role could not be read.'
	},
	{
		label: 'the role permission edit',
		method: 'PUT',
		app: (ids) => `/api/role-permissions/${ids.role}`,
		// requests/role-permissions.ts:58, keyed on the body's id, not on the path parameter
		upstream: (ids) => `/api/role-permissions/${ids.role}`,
		body: (ids) => ({ id: ids.role, name: 'TIME_TRACKER', enabled: true }),
		control: 200,
		// app/api/role-permissions/[id]/route.ts:58
		fallback: 'The permission of the role could not be updated.'
	},
	{
		label: 'the roles read',
		method: 'GET',
		app: () => '/api/roles',
		// requests/roles.ts:28
		upstream: () => '/api/roles',
		control: 200,
		// app/api/roles/route.ts:22 — singular again, for a list read
		fallback: 'The role could not be read.'
	},
	{
		label: 'the role create',
		method: 'POST',
		app: () => '/api/roles',
		// requests/roles.ts:54
		upstream: () => '/api/roles',
		body: () => ({ name: 'A pinned refusal probe role' }),
		control: 200,
		// app/api/roles/route.ts:48
		fallback: 'The role could not be created.'
	},
	{
		label: 'the role edit',
		method: 'PUT',
		app: (ids) => `/api/roles/${ids.role}`,
		// requests/roles.ts:89, keyed on the body's id
		upstream: (ids) => `/api/roles/${ids.role}`,
		body: (ids) => ({ id: ids.role, name: 'A pinned refusal probe role' }),
		control: 200,
		// app/api/roles/[id]/route.ts:33
		fallback: 'The role could not be updated.'
	},
	{
		label: 'the role delete',
		method: 'DELETE',
		app: (ids) => `/api/roles/${ids.role}`,
		// requests/roles.ts:72
		upstream: (ids) => `/api/roles/${ids.role}`,
		control: 200,
		// app/api/roles/[id]/route.ts:60
		fallback: 'The role could not be deleted.'
	},
	{
		label: 'the label delete',
		method: 'DELETE',
		app: (ids) => `/api/tags/${ids.plan}`,
		// requests/task-labels.ts:29
		upstream: (ids) => `/api/tags/${ids.plan}`,
		control: 200,
		// app/api/tags/[id]/route.ts:34
		fallback: 'The label could not be deleted.'
	},
	{
		label: 'the label edit',
		method: 'PUT',
		app: (ids) => `/api/tags/${ids.plan}`,
		// requests/task-labels.ts:47
		upstream: (ids) => `/api/tags/${ids.plan}`,
		body: () => ({ name: 'A pinned refusal probe label' }),
		control: 200,
		// app/api/tags/[id]/route.ts:66
		fallback: 'The label could not be updated.'
	},
	{
		label: 'the labels read',
		method: 'GET',
		app: () => '/api/tags/level',
		// requests/task-labels.ts:69
		upstream: () => '/api/tags/level',
		control: 200,
		// app/api/tags/level/route.ts:27
		fallback: 'The list of labels could not be read.'
	},
	{
		label: 'the priority edit',
		method: 'PUT',
		app: (ids) => `/api/task-priorities/${ids.plan}`,
		// requests/task-priorities.ts:26
		upstream: (ids) => `/api/task-priorities/${ids.plan}`,
		body: () => ({ name: 'A pinned refusal probe priority' }),
		control: 200,
		// app/api/task-priorities/[id]/route.ts:35
		fallback: 'The priority could not be updated.'
	},
	{
		label: 'the priority delete',
		method: 'DELETE',
		app: (ids) => `/api/task-priorities/${ids.plan}`,
		// requests/task-priorities.ts:44
		upstream: (ids) => `/api/task-priorities/${ids.plan}`,
		control: 200,
		// app/api/task-priorities/[id]/route.ts:62
		fallback: 'The priority could not be deleted.'
	},
	{
		label: 'the related issue types read',
		method: 'GET',
		app: () => '/api/task-related-issue-types',
		// requests/task-related-issue-type.ts:78
		upstream: () => '/api/task-related-issue-types',
		control: 200,
		// app/api/task-related-issue-types/route.ts:25
		fallback: 'The related issue type could not be read.'
	},
	{
		label: 'the related issue type create',
		method: 'POST',
		app: () => '/api/task-related-issue-types',
		// requests/task-related-issue-type.ts:11
		upstream: () => '/api/task-related-issue-types',
		body: () => ({ name: 'A pinned refusal probe related type' }),
		control: 200,
		// app/api/task-related-issue-types/route.ts:44
		fallback: 'The related issue type could not be created.'
	},
	{
		label: 'the related issue type edit',
		method: 'PUT',
		app: (ids) => `/api/task-related-issue-types/${ids.plan}`,
		// requests/task-related-issue-type.ts:31
		upstream: (ids) => `/api/task-related-issue-types/${ids.plan}`,
		body: () => ({ name: 'A pinned refusal probe related type' }),
		control: 200,
		// app/api/task-related-issue-types/[id]/route.ts:40
		fallback: 'The related issue type could not be updated.'
	},
	{
		label: 'the related issue type delete',
		method: 'DELETE',
		app: (ids) => `/api/task-related-issue-types/${ids.plan}`,
		// requests/task-related-issue-type.ts:49
		upstream: (ids) => `/api/task-related-issue-types/${ids.plan}`,
		control: 200,
		// app/api/task-related-issue-types/[id]/route.ts:69
		fallback: 'The related issue type could not be deleted.'
	},
	{
		label: 'the size edit',
		method: 'PUT',
		app: (ids) => `/api/task-sizes/${ids.plan}`,
		// requests/task-sizes.ts:27
		upstream: (ids) => `/api/task-sizes/${ids.plan}`,
		body: () => ({ name: 'A pinned refusal probe size' }),
		control: 200,
		// app/api/task-sizes/[id]/route.ts:37
		fallback: 'The size could not be updated.'
	},
	{
		label: 'the size delete',
		method: 'DELETE',
		app: (ids) => `/api/task-sizes/${ids.plan}`,
		// requests/task-sizes.ts:45
		upstream: (ids) => `/api/task-sizes/${ids.plan}`,
		control: 200,
		// app/api/task-sizes/[id]/route.ts:64
		fallback: 'The size could not be deleted.'
	},
	{
		label: 'the task sizes read',
		method: 'GET',
		app: () => '/api/task-sizes',
		// requests/task-sizes.ts:74
		upstream: () => '/api/task-sizes',
		control: 200,
		// app/api/task-sizes/route.ts:22
		fallback: 'The task size could not be read.'
	},
	{
		label: 'the task size create',
		method: 'POST',
		app: () => '/api/task-sizes',
		// requests/task-sizes.ts:7
		upstream: () => '/api/task-sizes',
		body: () => ({ name: 'A pinned refusal probe size' }),
		control: 200,
		// app/api/task-sizes/route.ts:41
		fallback: 'The task size could not be created.'
	},
	{
		label: 'the status edit',
		method: 'PUT',
		app: (ids) => `/api/task-statuses/${ids.todoStatus}`,
		// requests/taskStatus.ts:27
		upstream: (ids) => `/api/task-statuses/${ids.todoStatus}`,
		body: () => ({ name: 'A pinned refusal probe status' }),
		control: 200,
		// app/api/task-statuses/[id]/route.ts:35 — no full stop, as in the team membership routes
		fallback: 'The status could not be updated'
	},
	{
		label: 'the status delete',
		method: 'DELETE',
		app: (ids) => `/api/task-statuses/${ids.todoStatus}`,
		// requests/taskStatus.ts:45
		upstream: (ids) => `/api/task-statuses/${ids.todoStatus}`,
		control: 200,
		// app/api/task-statuses/[id]/route.ts:63
		fallback: 'The status could not be deleted'
	},
	{
		label: 'the version edit',
		method: 'PUT',
		app: (ids) => `/api/task-versions/${ids.plan}`,
		// requests/task-version.ts:26
		upstream: (ids) => `/api/task-versions/${ids.plan}`,
		body: () => ({ name: 'A pinned refusal probe version' }),
		control: 200,
		// app/api/task-versions/[id]/route.ts:35
		fallback: 'The version could not be updated.'
	},
	{
		label: 'the version delete',
		method: 'DELETE',
		app: (ids) => `/api/task-versions/${ids.plan}`,
		// requests/task-version.ts:44
		upstream: (ids) => `/api/task-versions/${ids.plan}`,
		control: 200,
		// app/api/task-versions/[id]/route.ts:64
		fallback: 'The version could not be deleted.'
	},
	{
		label: 'the task versions read',
		method: 'GET',
		app: () => '/api/task-versions',
		// requests/task-version.ts:73
		upstream: () => '/api/task-versions',
		control: 200,
		// app/api/task-versions/route.ts:22
		fallback: 'The task version could not be read.'
	},
	{
		label: 'the task version create',
		method: 'POST',
		app: () => '/api/task-versions',
		// requests/task-version.ts:6
		upstream: () => '/api/task-versions',
		body: () => ({ name: 'A pinned refusal probe version' }),
		control: 200,
		// app/api/task-versions/route.ts:41
		fallback: 'The task version could not be created.'
	},
	{
		label: 'the unassignment of a member from tasks',
		method: 'DELETE',
		app: (ids) => `/api/tasks/employee/${ids.employee}?organizationTeamId=${ids.teamA}`,
		// requests/tasks.ts:202, the one call here that asks for `keepsStatusOnError` (fetch.ts:68-73): an answer with
		// no status in its body gets the HTTP status added before the caller sees it, so a mock refusal is unchanged
		upstream: (ids) => `/api/tasks/employee/${ids.employee}`,
		control: 200,
		// app/api/tasks/employee/[employeeId]/route.ts:70
		fallback: 'The tasks could not be unassigned'
	},
	{
		label: 'the linked issue create',
		method: 'POST',
		app: () => '/api/tasks/task-linked-issue',
		// requests/task-linked-issue.ts:6
		upstream: () => '/api/task-linked-issue',
		body: (ids) => ({ taskId: ids.task, issueUrl: 'https://example.test/issue/relay-probe' }),
		control: 200,
		// app/api/tasks/task-linked-issue/route.ts:21
		fallback: 'The linked issue could not be created.'
	},
	{
		label: 'the linked issue edit',
		method: 'PUT',
		app: () => '/api/tasks/task-linked-issue',
		// requests/task-linked-issue.ts:25, keyed on the body's id
		upstream: (ids) => `/api/task-linked-issue/${ids.plan}`,
		body: (ids) => ({ id: ids.plan, taskId: ids.task, issueUrl: 'https://example.test/issue/relay-probe' }),
		control: 200,
		// app/api/tasks/task-linked-issue/route.ts:38
		fallback: 'The linked issue could not be updated.'
	},
	{
		label: 'the linked issue removal',
		method: 'DELETE',
		app: (ids) => `/api/tasks/task-linked-issue/${ids.plan}`,
		// requests/task-linked-issue.ts:16, the soft delete
		upstream: (ids) => `/api/task-linked-issue/${ids.plan}/soft`,
		control: 200,
		// app/api/tasks/task-linked-issue/[id]/route.ts:31
		fallback: 'Linked issue removal failed'
	},
	{
		label: 'the workspace rename',
		method: 'PUT',
		app: () => '/api/tenant',
		// requests/tenant.ts:22
		upstream: () => '/api/tenant',
		// core/lib/validation/workspace.ts renameWorkspaceBodySchema
		body: () => ({ name: 'A pinned refusal probe workspace' }),
		control: 200,
		// app/api/tenant/route.ts:36
		fallback: 'The workspace could not be renamed.'
	},
	{
		label: 'the daily time-log report read',
		method: 'GET',
		app: (ids) =>
			`/api/timesheet/time-log/report/daily?tenantId=${ids.tenantA}&organizationId=${ids.organizationA}&startDate=2026-11-01&endDate=2026-11-02`,
		// requests/timesheet.ts:314
		upstream: () => '/api/timesheet/time-log/report/daily',
		control: 200,
		// app/api/timesheet/time-log/report/daily/route.ts:92
		fallback: 'The daily report could not be read'
	},
	{
		label: 'the API tokens switch read',
		method: 'GET',
		app: () => '/api/user-api-tokens/config',
		// requests/user-api-tokens.ts:15
		upstream: () => '/api/user-api-tokens/config',
		control: 200,
		// app/api/user-api-tokens/config/route.ts:25 gauzyErrorResponse(error, UNREADABLE_MESSAGE), the constant at :7
		fallback: 'Whether this server offers API tokens could not be read.'
	},
	{
		label: 'the API tokens read',
		method: 'GET',
		app: () => '/api/user-api-tokens',
		// requests/user-api-tokens.ts:25
		upstream: () => '/api/user-api-tokens',
		control: 200,
		// app/api/user-api-tokens/route.ts:44 gauzyErrorResponse(error, UNREADABLE_LIST_MESSAGE), the constant at :12
		fallback: 'Your API tokens could not be read.'
	},
	{
		label: 'the API token create',
		method: 'POST',
		app: () => '/api/user-api-tokens',
		// requests/user-api-tokens.ts:35
		upstream: () => '/api/user-api-tokens',
		// core/types/schemas/user/user-api-token.schema.ts createUserApiTokenInputSchema
		body: () => ({ name: 'A pinned refusal probe token', expiry: '90d' }),
		// MEASURED, NOT INTENDED: the control is 502, not a 2xx. The mock has no created-token answer, its catch-all
		// echoes the body back (mock-gauzy-server.mjs:826) and `createdUserApiTokenSchema` refuses that echo at
		// app/api/user-api-tokens/route.ts:77-80, which answers `NOT_CREATED_MESSAGE` there and never reaches the
		// `catch`. The armed cases below are unaffected — a refusal returns from the `catch` before that parse — and the
		// control's empty `failures()` witness, with the upstream logged 200, is what proves the 502 is this app's own.
		control: 502,
		// app/api/user-api-tokens/route.ts:83 gauzyErrorResponse(error, NOT_CREATED_MESSAGE), the constant at :13
		fallback: 'The API token could not be created.'
	},
	{
		label: 'the own profile write',
		method: 'PUT',
		app: (ids) => `/api/user/${ids.user}`,
		// requests/settings.ts:9, and the route fixes the id to the session's own user (app/api/user/[id]/route.ts:54)
		upstream: (ids) => `/api/user/${ids.user}`,
		body: () => ({ avatarUrl: 'https://example.test/relay-probe.png' }),
		control: 200,
		// app/api/user/[id]/route.ts:62
		fallback: 'The profile was not updated.'
	},
	{
		label: 'the account data delete',
		method: 'DELETE',
		app: () => '/api/user/reset',
		// requests/user.ts:94
		upstream: () => '/api/user/reset',
		control: 200,
		// app/api/user/reset/route.ts:23
		fallback: 'The data of the account could not be deleted.'
	}
];

/** The body the mock writes for an armed refusal (mock-gauzy-server.mjs:1099-1100), spelled the way the app passes it on. */
const gauzyRefusal = (status: number) => ({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });

const describeAnswer = (path: string, response: APIResponse, body: string) =>
	`${path} -> ${response.status()} · content-type ${response.headers()['content-type'] ?? 'absent'} · ` +
	`body(${body.length}) ${body.slice(0, 160)}`;

/** The mock's entries for one upstream pathname, exactly as it recorded them. */
const asksFor = (requests: Array<{ method: string; path: string; status: number }>, path: string) =>
	requests.filter((request) => request.path === path);

const callRoute = (
	api: (
		path: string,
		options?: { body?: unknown; headers?: Record<string, string>; method?: string }
	) => Promise<APIResponse>,
	route: RefusalRoute,
	path: string,
	ids: Record<string, string>
) =>
	api(path, {
		method: route.method,
		...(route.multipart
			? { body: route.multipart().body, headers: route.multipart().headers }
			: route.body
				? { body: route.body(ids) }
				: {})
	});

test.describe('lane-c · 86 proxy routes handing a Gauzy refusal straight to the caller', () => {
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
			expect(response.headers()['content-type'], `the control answer is no longer JSON: ${witness}`).toContain(
				'application/json'
			);

			// This is also the proof that `upstream` is the path this route really calls: an armed case below only
			// bites when it is named exactly. For the API token create it is also the proof that its 502 is this app's
			// own answer and not an upstream one.
			expect(
				triples(calls),
				`the ${route.label} is not exactly one upstream call to ${upstream}: ${JSON.stringify(
					triples(calls)
				)} — full log ${logOf(log)}`
			).toEqual([`${route.method} ${upstream} 200`]);
			expect(await mock.failures(), `the control caused a refused upstream call: ${witness}`).toEqual([]);
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
				// `<tenant>`, then `<path>` (mock-gauzy-server.mjs:1089-1093), and a tenant-wide arm would refuse the
				// guard's own `/api/user/me` check too (authenticated-guard-app.ts:76) — a different failure.
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
			// `:26-29` or `:33-35` would answer it, and a refusal takes the third branch (`:37`).
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
			// added (gauzy-error-response.ts:26-29), and the mock recorded the call it cut with status 0
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
// shallow-merges its payload (playwright/helpers.ts:138-139), so a payload that names neither `fails` nor `drops`
// leaves the previous arm armed. The `mock` fixture resets before each test (playwright/api-fixtures.ts:51-65); this
// afterEach is what keeps an arm from being seen by the next spec in this lane.
test.afterEach(async () => {
	await mockReset();
});
