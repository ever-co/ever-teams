import { expect, test, type ApiCall } from '../../api-fixtures';
import { mockRequests, mockReset, mockScenario, receivedTokens } from '../../helpers';
import type { StubRequest } from '../../helpers';
import { apiRoutes } from '../api/routes.generated';
import { logOf } from '../api/log-helpers';

/**
 * lane-b · does a crafted path segment stay inside its own segment, on the way to the lane's mock Gauzy?
 *
 * `suites/lane-d/path-segment-traversal.spec.ts` proved the mechanism on 15 hand-picked route-verbs: Next decodes a
 * dynamic segment before the handler sees it (`..%2Femployee` arrives as `../employee`, `x%3Fy%3D1` as `x?y=1`), some
 * server request builders then write that id into the upstream path without `encodeURIComponent`, and `fetch`
 * (`core/services/server/fetch.ts:110`, `core/services/server/forward-to-gauzy.ts:112`) resolves the `..`, splits at
 * the `?` or drops everything from the `#`. This file measures the same question on the rest of the app: every dynamic
 * segment route of `apps/web/app/api` that lane-d did not already cover. It is a sweep, not a proof about one family —
 * the only thing assumed about a route is the shape of its URL.
 *
 * Run it on this lane:
 *
 *   export PATH="/e/nvm/.nodejs:$PATH" NODE_OPTIONS=--no-warnings
 *   E2E_LANE=lane-b E2E_REUSE_SERVERS=1 npx playwright test --config playwright/playwright.lane.config.ts path-segment-sweep
 *
 * Measured on lane-b (app 3032, mock 3996) on 2026-11-23, against the live lane, twice
 * (`E:\Coding\.tmp\s2-lane-b-path-sweep-1.log` and `-2.log`, after the probe pass
 * `E:\Coding\.tmp\s2-lane-b-path-sweep-probe-3.log` / `-7.log` that every number below was read from).
 *
 * ## What is in scope, and what is not
 *
 * `routes.generated.ts` lists 415 route handlers; 199 of them have a dynamic segment. Of those:
 *
 *   - 3 are catch-alls, where the segment is not one segment: `/api/auth/[...nextauth]`, `/api/ever-connect/[...path]`
 *     and `/api/public-assets/[...path]`. A `..` in a rest param is a different question (and `ever-connect` is the
 *     one route that builds a path from a caller-supplied rest), so they are out;
 *   - 15 route-verbs are already pinned by lane-d's `ROUTES` table. Three route files are covered whole
 *     (`organization-projects/setting/[id]`, `organization-team-employee/[id]`, `plugins/docs/links/[id]`); eight more
 *     are covered for some verbs only, and every verb lane-d did not measure is in this sweep:
 *     `PUT`+`DELETE /api/daily-plan/[id]`, `PUT /api/daily-plan/[id]/task`, `DELETE /api/issue-types/[id]`,
 *     `DELETE /api/organization-projects/[id]`, `PUT /api/organization-team/[id]`, `PUT /api/roles/[id]`,
 *     `PUT /api/tags/[id]`, `PUT /api/tasks/[id]`;
 *   - 6 have no id-like segment to craft at all — `GET /api/favicons/[host]`, `POST /api/image-assets/upload/[folder]`,
 *     `PUT /api/invoices/email/[email]`, `GET /api/placeholder/[size]/[background]`,
 *     `GET /api/public/saved-reports/[token]` and `GET /api/tasks/built-in/[key]`. Their only segment is one of the
 *     values this file never crafts (below), so nothing here could travel through it. `GET /api/favicons/[host]` is
 *     also the one route whose upstream is not the Gauzy API at all: `core/services/server/favicons.ts` fetches the
 *     host the segment names, which is exactly why `host` is never crafted.
 *
 * That leaves **239 route-verbs, 271 route-verb-param groups and 813 pinned form-rows** (271 × 3 forms).
 *
 * Nothing in this sweep may reach the public internet. Checked two ways: `grep -rlE "https?://" apps/web/app/api
 * --include=route.ts` returns only `app/api/subscribe/route.ts` (Mailchimp, `:92`, no dynamic segment, so not in
 * scope) and the `public-assets` catch-all; and every `fetch(` under `core/services/server` is either
 * `GAUZY_API_SERVER_URL` (the lane mock) or a helper no measured route reaches (`favicons.ts`, `recaptcha.ts`, used
 * only by `POST /api/auth/register`). The mock's log below is the proof of where each call actually went.
 *
 * ## Which params get crafted, and what the others hold
 *
 * Only id-like segments are crafted. These hold their `suites/api/sweep.spec.ts` `PARAMS` value on every call here and
 * are never crafted, because they decide *where* or *what* a handler fetches rather than *which record*:
 * `host`, `folder`, `token`, `email`, `size`, `background`, `profileLink`, `key`, `action`. A group with two id-like
 * params (32 groups: `…/[id]/mappings/[mappingId]`, `…/versions/[versionId]`, `…/members/[employeeId]/rate` and the
 * rest) is measured once per param, the other param at its `PARAMS` value.
 *
 * The crafted slot takes one of three forms: the control UUID `2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d`, `..%2Femployee`
 * and `x%3Fy%3D1`. A param with no `PARAMS` entry (`[boardId]`, the only one) holds a **second** fixed UUID
 * `5b8a1c9d-7e2f-4a6b-8c3d-0e9f2a7b6c51` whenever it is not the crafted slot: `GET
 * /api/integration/trello/[id]/boards/[boardId]/lists` carries two UUIDs in one upstream path, and reusing the control
 * UUID there would make the containment diff replace the wrong occurrence. `INVENTED_CONTROL_SEGMENT_NOT_THE_CRAFTED_
 * ONE` is asserted apart from the control UUID, and no `PARAMS` value equals the control UUID, so the diff below can
 * only touch the crafted slot.
 *
 * `POST`/`PUT`/`PATCH`/`DELETE` send `{}`, as `suites/api/sweep.spec.ts` does. No case sends an `Origin`:
 * `refuseForeignOrigin` / `refuseForeignWrite` (`core/services/server/same-origin-request.ts:16-34`) refuse only a
 * header that names another host, which lane-d pinned on this same family (`PUT /api/tags/<id>` answers 403 with
 * `origin: http://example.com` and 200 with none), so a bodiless same-origin write reaches the builder.
 *
 * ## Opening every permission gate first
 *
 * Some routes refuse this fixture role before forwarding anything (`refuseUnlessPermitted`,
 * `core/services/server/refuse-without-permission.ts:34-57`), and a refusal would hide whether the segment travelled.
 * Every call here is preceded by `mock.scenario({ extraPermissions: [...] })` with the nine permissions that open the
 * gates `suites/lane-b/permission-gates-granted.spec.ts` mapped (`INVOICES_VIEW`, `INVOICES_EDIT`,
 * `CHANGE_SELECTED_EMPLOYEE`, `ORG_CONTACT_ADD`, `ORG_CONTACT_EDIT`, `ORG_CONTACT_DELETE`, `ALL_ORG_EDIT`,
 * `EXPORT_ADD`, `ALLOW_MODIFY_TIME`). The `mock` fixture is `auto: true` and calls `mockReset()` before each test
 * (`playwright/api-fixtures.ts:51-65`), which also clears `extraPermissions`; that is not enough for this file,
 * because a row runs three requests inside one test, so `probe()` resets the mock itself before each of them and
 * re-arms the scenario. Each request therefore gets its own empty log.
 *
 * ## The four classes, decided only by diffing against the control
 *
 * The mock records every call as `{ method, path, query, status }`; `resourceCalls` drops the guard's own reads
 * (`GET /api/user/me` from `core/services/server/guards/authenticated-guard-app.ts:76`, `GET /api/role-permissions/me`
 * from `refuse-without-permission.ts:42-47`) and reduces a query to its key names, as lane-d does. Nothing about a
 * route's family is assumed: the control run (the crafted slot at the control UUID) is what the crafted run is
 * compared with.
 *
 *   - **CONTAINED** — the crafted run's calls are exactly the control run's calls with the control UUID replaced by
 *     the crafted segment still percent-encoded the way the mock recorded it (`..%2Femployee`, `x%3Fy%3D1`), which is
 *     what `encodeURIComponent` produces;
 *   - **ESCAPED** — a call was made and it is not that: `fetch` resolved the `..` and another endpoint was addressed,
 *     or the id stopped where a `?` began (which also moved part of the id into the query: the pinned `keys` carry
 *     that, and show a crafted `?` swallowing the session filter that followed it, e.g. `organizationId`);
 *   - **REFUSED** — the control made a resource call and the crafted run made none: a zod schema or an `is.guid()`
 *     check in the route answered first. The app's own status and body are pinned;
 *   - **NO-CALL** — the control run itself made no resource call, because the handler answered 400/403 for a `{}`
 *     body or an unfit fixture value before reaching any builder. **Those rows prove nothing about escaping**, and
 *     they are listed so the reader is not told otherwise.
 *
 * One limit of the witness: the mock re-encodes a query with `URLSearchParams` (`cypress/support/mock-gauzy-server.mjs:1116`),
 * so an id that lands raw in a *query value* reads the same as an encoded one — the pinned key list is what such a
 * row can prove. `GET /api/role-permissions/[id]` is the only row whose id travels in a query value (inside a JSON
 * `data=` blob) and it reads CONTAINED.
 *
 * ## What 813 form-rows measured
 *
 * | class | rows | groups of route-verb-param |
 * | --- | --- | --- |
 * | CONTAINED | 687 | 213 groups contained on all three forms; 12 of the rows are the `DROPPED_ROWS` flavour below |
 * | ESCAPED | 66 | 33 groups, both crafted forms escaped in every one of them |
 * | REFUSED | 30 | 15 groups, both crafted forms refused |
 * | NO-CALL | 30 | 10 groups, the control made no call either |
 *
 * ### The 33 groups where a crafted segment reached another endpoint (26 on routes no earlier spec measured)
 *
 * Every recorded call below is what the mock was really asked for, with this caller's bearer (pinned per case by
 * `receivedTokens`). `…/x (1 keys)` is the `x%3Fy%3D1` form: the recorded path ends where the `?` began and the query
 * holds the injected `y` — lane-d's second finding, reproduced here. `n keys` counts the query keys the mock recorded;
 * their names are pinned in `ESCAPED_ROWS`.
 *
 * | app route (under /api) | crafted param | `..%2Femployee` recorded | `x%3Fy%3D1` recorded | the line that interpolates the id raw |
 * | --- | --- | --- | --- | --- |
 * | PUT daily-plan/[id]/remove | [id] | PUT /api/employee/remove 200 | PUT /api/daily-plan/x (1 keys) 200 | core/services/server/requests/daily-plan.ts:273 | NEW |
 * | PUT daily-plan/[id] | [id] | PUT /api/employee 200 | PUT /api/daily-plan/x (1 keys) 200 | core/services/server/requests/daily-plan.ts:207 | same route as a lane-d row |
 * | DELETE daily-plan/[id] | [id] | DELETE /api/employee 200 | DELETE /api/daily-plan/x (1 keys) 200 | core/services/server/requests/daily-plan.ts:257 | same route as a lane-d row |
 * | PUT daily-plan/[id]/task | [id] | PUT /api/employee/task 200 | PUT /api/daily-plan/x (1 keys) 200 | core/services/server/requests/daily-plan.ts:247 | same route as a lane-d row |
 * | GET daily-plan/employee/[employeeId] | [employeeId] | GET /api/daily-plan/employee (8 keys) 200 | GET /api/daily-plan/employee/x (8 keys) 200 | core/services/server/requests/daily-plan.ts:123 | NEW |
 * | POST daily-plan/plan/[planId] | [planId] | POST /api/employee/task 200 | POST /api/daily-plan/x (1 keys) 200 | core/services/server/requests/daily-plan.ts:227 | NEW |
 * | PUT daily-plan/plan/[planId] | [planId] | PUT /api/employee/task 200 | PUT /api/daily-plan/x (1 keys) 200 | core/services/server/requests/daily-plan.ts:247 | NEW |
 * | GET daily-plan/task/[taskId] | [taskId] | GET /api/daily-plan/employee (3 keys) 200 | GET /api/daily-plan/task/x (3 keys) 200 | core/services/server/requests/daily-plan.ts:152 | NEW |
 * | PUT employee/[id] | [id] | PUT /api/employee 200 | PUT /api/employee/x (1 keys) 200 | core/services/server/requests/employee.ts:88 | NEW |
 * | DELETE integration-tenant/[id] | [id] | DELETE /api/employee (2 keys) 200 | DELETE /api/integration-tenant/x (2 keys) 200 | core/services/server/requests/integrations/integration-tenant.ts:36 | NEW |
 * | DELETE invite/[id] | [id] | DELETE /api/employee 200, GET /api/invite (4 keys) 200 | DELETE /api/invite/x (1 keys) 200, GET /api/invite (4 keys) 200 | core/services/server/requests/invite.ts:50 | NEW |
 * | DELETE issue-types/[id] | [id] | DELETE /api/employee 200 | DELETE /api/issue-types/x (1 keys) 200 | core/services/server/requests/issue-type.ts:45 | same route as a lane-d row |
 * | PUT organization-team-employee/[id]/active-task | [id] | PUT /api/employee/active-task 200 | PUT /api/organization-team-employee/x (1 keys) 200 | core/services/server/requests/organization-team-employee.ts:60 | NEW |
 * | PUT organization-team-join/[id]/[action] | [id] | PUT /api/employee/accept 200 | PUT /api/organization-team-join/x (1 keys) 200 | core/services/server/requests/request-to-join-team.ts:97 | NEW |
 * | PUT organization-team/[id] | [id] | PUT /api/employee 200, GET /api/employee (14 keys) 200 | PUT /api/organization-team/x (1 keys) 200, GET /api/organization-team/x (14 keys) 200 | core/services/server/requests/organization-team.ts:99 and :168 | same route as a lane-d row |
 * | PUT organization-team/employee/[id] | [id] | PUT /api/employee 200 | PUT /api/organization-team-employee/x (1 keys) 200 | core/services/server/requests/organization-team.ts:257 | NEW |
 * | DELETE organization-team/employee/[id] | [id] | DELETE /api/employee 200 | DELETE /api/organization-team-employee/x (1 keys) 200 | core/services/server/requests/organization-team.ts:234 | NEW |
 * | DELETE organization-team/teams/[id] | [id] | DELETE /api/organization-team/employee 200 | DELETE /api/organization-team/teams/x (1 keys) 200 | core/services/server/requests/organization-team.ts:277 | NEW |
 * | PUT tags/[id] | [id] | PUT /api/employee 200 | PUT /api/tags/x (1 keys) 200 | core/services/server/requests/task-labels.ts:29 | same route as a lane-d row |
 * | PUT task-priorities/[id] | [id] | PUT /api/employee 200 | PUT /api/task-priorities/x (1 keys) 200 | core/services/server/requests/task-priorities.ts:26 | NEW |
 * | DELETE task-priorities/[id] | [id] | DELETE /api/employee 200 | DELETE /api/task-priorities/x (1 keys) 200 | core/services/server/requests/task-priorities.ts:44 | NEW |
 * | PUT task-related-issue-types/[id] | [id] | PUT /api/employee 200 | PUT /api/task-related-issue-types/x (1 keys) 200 | core/services/server/requests/task-related-issue-type.ts:31 | NEW |
 * | DELETE task-related-issue-types/[id] | [id] | DELETE /api/employee 200 | DELETE /api/task-related-issue-types/x (1 keys) 200 | core/services/server/requests/task-related-issue-type.ts:49 | NEW |
 * | PUT task-sizes/[id] | [id] | PUT /api/employee 200 | PUT /api/task-sizes/x (1 keys) 200 | core/services/server/requests/task-sizes.ts:27 | NEW |
 * | DELETE task-sizes/[id] | [id] | DELETE /api/employee 200 | DELETE /api/task-sizes/x (1 keys) 200 | core/services/server/requests/task-sizes.ts:45 | NEW |
 * | PUT task-statuses/[id] | [id] | PUT /api/employee 200 | PUT /api/task-statuses/x (1 keys) 200 | core/services/server/requests/taskStatus.ts:27 | NEW |
 * | DELETE task-statuses/[id] | [id] | DELETE /api/employee 200 | DELETE /api/task-statuses/x (1 keys) 200 | core/services/server/requests/taskStatus.ts:45 | NEW |
 * | PUT task-versions/[id] | [id] | PUT /api/employee 200 | PUT /api/task-versions/x (1 keys) 200 | core/services/server/requests/task-version.ts:26 | NEW |
 * | DELETE task-versions/[id] | [id] | DELETE /api/employee 200 | DELETE /api/task-versions/x (1 keys) 200 | core/services/server/requests/task-version.ts:44 | NEW |
 * | PUT tasks/[id] | [id] | PUT /api/employee 200 | PUT /api/tasks/x (1 keys) 200 | core/services/server/requests/tasks.ts:162 | same route as a lane-d row |
 * | GET tasks/employee/[employeeId] | [employeeId] | GET /api/tasks/employee (1 keys) 200 | GET /api/tasks/employee/x (1 keys) 200 | core/services/server/requests/tasks.ts:202 | NEW |
 * | DELETE tasks/employee/[employeeId] | [employeeId] | DELETE /api/tasks/employee (1 keys) 200 | DELETE /api/tasks/employee/x (1 keys) 200 | core/services/server/requests/tasks.ts:181 | NEW |
 * | GET user/[id] | [id] | GET /api/employee 200 | GET /api/user/x (1 keys) 200 | core/services/server/requests/tasks.ts:145 | NEW |
 *
 * 26 of the 33 are routes no earlier spec measured at all. The other 7 are a **new verb** on a route lane-d already
 * wrote down: `PUT` and `DELETE /api/daily-plan/[id]`, `PUT /api/daily-plan/[id]/task`, `DELETE
 * /api/issue-types/[id]`, `PUT /api/organization-team/[id]`, `PUT /api/tags/[id]` and `PUT /api/tasks/[id]`. The
 * routes lane-d found escaping keep escaping on their other verbs too, which is what those 7 rows add.
 *
 * ### Six groups where the crafted segment never reached the upstream at all (CONTAINED, and worth naming)
 *
 * These are CONTAINED by the rule above — no crafted run asked an endpoint the control run did not — but not because a
 * builder encoded the id: the route simply did not put the caller's segment on the upstream path. Each is pinned with
 * the call the mock recorded, so the day one of them starts forwarding the raw segment this file says so.
 *
 *   - `GET /api/invite/[id]` → `GET /api/invite/me`: `app/api/invite/[id]/route.ts:23` calls
 *     `getMyInvitationsRequest` (`core/services/server/requests/invite.ts:215-221`), which writes `/invite/me`;
 *   - `PUT /api/role-permissions/[id]` → `PUT /api/role-permissions/undefined`: `app/api/role-permissions/[id]/route.ts:50-53`
 *     hands only `{ data: body }`, and `core/services/server/requests/role-permissions.ts:58` writes
 *     `/role-permissions/${data.id}`;
 *   - `PUT /api/roles/[id]` → `PUT /api/roles/undefined`: `app/api/roles/[id]/route.ts:25-28`, same shape,
 *     `core/services/server/requests/roles.ts:89`;
 *   - `PUT /api/timer/timesheet/time-log/[id]` → `PUT /api/timesheet/time-log/null`: `app/api/timer/timesheet/time-log/[id]/route.ts:16`
 *     reads the id from the query string, never from the segment; `core/services/server/requests/timesheet.ts:120`;
 *   - `PUT /api/user/[id]` and `DELETE /api/user/[id]` → `/api/user/<the session person>`: `app/api/user/[id]/route.ts:51-54`
 *     and `:82-83` pass `id: user.id`, so `core/services/server/requests/settings.ts:9` and
 *     `core/services/server/requests/user.ts:31` write the session's own id. That is the safe shape: the caller's
 *     segment decides nothing.
 *
 * ### The 15 groups that refused the crafted segment before any builder ran (both forms, all 400)
 *
 * `PUT`/`DELETE /api/comment/[id]`, `PUT /api/employee-notification-setting/[id]`, `PUT /api/employee-notification/[id]`,
 * `POST /api/employee-placeholder/[id]/claim`, `GET /api/employee-placeholder/[id]/merge-preview`,
 * `POST /api/employee-placeholder/[id]/merge`, `GET /api/employee/[id]/pay-rate`, `PUT /api/employee/[id]/profile`,
 * `GET /api/organization-projects/[id]/rates`, `GET /api/plugins/docs/documents/[id]/download`,
 * `GET /api/plugins/docs/documents/[id]/export.pdf`, `GET /api/plugins/docs/imports/[id]`,
 * `DELETE /api/tasks/task-linked-issue/[id]`, `DELETE /api/user-api-tokens/[id]` — each pinned with its own refusal
 * body in `REFUSED_ROWS`, e.g. `{"error":"A comment id is required"}`. `GET /api/role-permissions/[id]` is not among
 * them: its id goes into a `data=` JSON blob rather than the path, so a crafted id is not refused there.
 *
 * ### The 10 groups that made no upstream call even at the control (NO-CALL, pinned, and proving nothing)
 *
 * `DELETE /api/auth/two-factor/users/[userId]` (403 for this fixture role), `PUT /api/invite/[id]` (400, `{}` carries
 * no invite action), `PUT /api/organization-projects/[id]/rate` (400, `{}` carries no rate),
 * `PUT /api/organization-projects/[id]/members/[employeeId]/rate` (400 for both params: the validation wants a guid
 * employee id and a rate), `PUT /api/user/[id]/role` (400, `{}` carries no role id), and the four shared-invoice
 * public routes (400 `{"message":"Invalid link"}`: the fixture `token` is not a link token). Whether a crafted
 * segment escapes on those routes is unmeasured here; the reason is pinned per row in `NO_CALL_ROWS`.
 *
 * ## Limits of this harness, stated rather than hidden
 *
 *   - the mock answers 2xx for a path it holds no route for (`mock-gauzy-server.mjs:816-818`), so an escaped call that
 *     does not exist upstream still reads 200 here; what is pinned is *which* path and verb the mock was asked for,
 *     never real content;
 *   - every case is signed in as the lane's fixture role, so an unauthenticated path is not measured (as in lane-d);
 *   - the guard's `GET /api/user/me` appears in some logs and not in others (`SessionCheckMemo`,
 *     `core/services/server/guards/authenticated-guard-app.ts:29-31`); it is filtered out and is never a call on the
 *     crafted id;
 *   - statuses are pinned as this lane answered them today. `GET /api/tasks/employee/[employeeId]` and its DELETE
 *     carry `organizationTeamId=undefined` / `=null` because the route reads a query this sweep does not send
 *     (`app/api/tasks/employee/[employeeId]/route.ts:22-28`); that is the route's own behaviour, pinned as measured.
 */

/** REFUSED / CONTAINED / ESCAPED / NO-CALL, as `classify` decides one and `PINNED` pins it. */
type Class = 'CONTAINED' | 'ESCAPED' | 'REFUSED' | 'NO-CALL';

/** What the mock proved about one call: which endpoint, with which query keys, at which status. */
type Call = { method: string; path: string; keys: string[]; status: number };

/** One of the three spellings of the crafted segment. */
type FormKey = 'control' | 'slash' | 'query';

/** One route-verb-param group: the status and the class of each of its three form-rows. */
type PinnedRow = {
	/** `VERB /api/…/[id]`, exactly as `routes.generated.ts` spells the pattern; the stable name of the row. */
	route: string;
	param: string;
	/** The app's answer for `control`, `slash` and `query`, in that order. */
	status: [number, number, number];
	/** The class of those three rows; omitted when all three were CONTAINED. */
	cls?: [Class, Class, Class];
};

/** A row that reached another upstream endpoint: the recorded calls are the witness, `line` is the builder. */
type EscapedRow = {
	route: string;
	param: string;
	/** `file:line` of the template that writes the id into the upstream path with nothing done to it. */
	line: string;
	calls: { slash: Call[]; query: Call[] };
};

/** A row the route refused before any builder ran; `body` is this app's own answer. */
type RefusedRow = { route: string; param: string; status: number; body: string };

/** A row whose control run made no resource call at all; `reason` says why, and the row proves nothing else. */
type NoCallRow = { route: string; param: string; status: [number, number, number]; reason: string };

/** A CONTAINED row whose crafted segment never reached the upstream: `line` names the line that put its own value there. */
type DroppedRow = { route: string; param: string; line: string; calls: Call[] };

/** The control id, as in lane-d: a guid so a route that validates one does not answer for the wrong reason. */
const CONTROL_SEGMENT = '2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d';

/**
 * A second fixed UUID, for a param that has no `PARAMS` entry and is *not* the crafted slot. It must never equal
 * `CONTROL_SEGMENT`: the containment diff below replaces the control UUID in the recorded path, and a route with two
 * UUID-shaped segments (`GET /api/integration/trello/[id]/boards/[boardId]/lists`) would otherwise have both replaced.
 *
 * That second UUID is a fixed literal, not a fixture id; `OTHER_SEGMENT_IS_NOT_THE_CRAFTED_CONTROL` below asserts it
 * apart from `CONTROL_SEGMENT`, and `NO_PARAM_VALUE_CAN_LOOK_LIKE_THE_CRAFTED_CONTROL` asserts no `PARAMS` value
 * equals it either, which is what makes the diff provably touch only the crafted slot.
 */
const OTHER_SEGMENT = '5b8a1c9d-7e2f-4a6b-8c3d-0e9f2a7b6c51';

/** Three of lane-d's five forms: the control, one that carries a slash, one that carries a question mark. */
const FORMS: Array<{ key: FormKey; segment: string }> = [
	{ key: 'control', segment: CONTROL_SEGMENT },
	{ key: 'slash', segment: '..%2Femployee' },
	{ key: 'query', segment: 'x%3Fy%3D1' }
];

/** The values `suites/api/sweep.spec.ts` fills each dynamic param with; the crafted slot ignores them. */
const PARAMS: Record<string, string> = {
	id: 'task',
	userId: 'user',
	employeeId: 'employee',
	teammateId: 'teammateEmployee',
	teamId: 'teamA',
	taskId: 'task',
	projectId: 'project',
	planId: 'plan',
	versionId: 'version',
	invoiceId: 'invoice',
	documentId: 'document',
	commentId: 'comment',
	mappingId: 'mapping',
	conflictId: 'conflict',
	emoji: 'thumbs-up',
	workspaceGid: 'workspace-gid-1',
	projectGid: 'project-gid-1',
	// Never crafted: they decide where or what a handler fetches, not which record it acts on.
	host: '127.0.0.1:3030',
	folder: 'playwright-artifacts',
	token: 'synthetic-token',
	email: 'manager@example.test',
	size: '128x128',
	background: 'ffffff',
	action: 'accept',
	key: 'general',
	profileLink: 'profileLink'
};

/** Param names this file never crafts, and therefore never measures. */
const NEVER_CRAFTED = ['host', 'folder', 'token', 'email', 'size', 'background', 'profileLink', 'key', 'action'];

/** The 15 route-verbs `suites/lane-d/path-segment-traversal.spec.ts` already pins; this sweep measures the rest. */
const LANE_D_ROUTE_VERBS = [
	'PUT /api/organization-projects/setting/[id]',
	'PUT /api/organization-projects/[id]',
	'GET /api/organization-projects/[id]',
	'GET /api/organization-team/[id]',
	'DELETE /api/organization-team/[id]',
	'PUT /api/organization-team-employee/[id]',
	'DELETE /api/organization-team-employee/[id]',
	'PUT /api/issue-types/[id]',
	'DELETE /api/tags/[id]',
	'GET /api/daily-plan/[id]',
	'POST /api/daily-plan/[id]/task',
	'DELETE /api/roles/[id]',
	'GET /api/tasks/[id]',
	'DELETE /api/tasks/[id]',
	'DELETE /api/plugins/docs/links/[id]'
];

/** The reads the guards make for themselves; neither is ever a call on the crafted id. */
const GUARD_CALLS = ['/api/user/me', '/api/role-permissions/me'];

/** The permissions that open every gate `suites/lane-b/permission-gates-granted.spec.ts` mapped. */
const EXTRA_PERMISSIONS = [
	'INVOICES_VIEW',
	'INVOICES_EDIT',
	'CHANGE_SELECTED_EMPLOYEE',
	'ORG_CONTACT_ADD',
	'ORG_CONTACT_EDIT',
	'ORG_CONTACT_DELETE',
	'ALL_ORG_EDIT',
	'EXPORT_ADD',
	'ALLOW_MODIFY_TIME'
];

/** A write always carries the smallest JSON body; a GET never carries one. */
const MUTATING = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** One measured route-verb-param group, read out of the generated manifest rather than typed by hand. */
type ScopeRow = {
	/** `VERB /api/…/[id]`, the key `PINNED` is matched against. */
	route: string;
	verb: string;
	/** The route pattern with its brackets, exactly as it is written on disk. */
	pattern: string;
	/** The param this group crafts. */
	param: string;
	/** Every id-like param of the route; the ones not crafted hold their `PARAMS` value. */
	params: string[];
};

/** `[id]`, `[employeeId]` … — the param names of a route pattern, without their brackets. */
const paramNames = (pattern: string): string[] => [...pattern.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]);

/** A `[...path]` or `[[...path]]` segment is not one segment, and is out of this sweep. */
const isCatchAll = (pattern: string): boolean => /\[\[?\.\.\./.test(pattern);

const craftedParams = (pattern: string): string[] =>
	paramNames(pattern).filter((name) => !NEVER_CRAFTED.includes(name));

/** Every route-verb-param this sweep must measure, derived from the manifest so a new route cannot slide past. */
const scopeOfApp = (): ScopeRow[] => {
	const rows: ScopeRow[] = [];
	for (const route of apiRoutes) {
		if (!/\[[^\]]+\]/.test(route.path) || isCatchAll(route.path)) continue;
		const params = craftedParams(route.path);
		if (params.length === 0) continue;
		for (const verb of route.verbs) {
			if (LANE_D_ROUTE_VERBS.includes(`${verb} ${route.path}`)) continue;
			for (const param of params) {
				rows.push({ route: `${verb} ${route.path}`, verb, pattern: route.path, param, params });
			}
		}
	}
	return rows;
};

const SCOPE = scopeOfApp();

/** Every route-verb-param in scope, pinned to the status and class each of the three forms measured. */
export const PINNED: PinnedRow[] = [
	{ route: 'DELETE /api/auth/sessions/[id]', param: 'id', status: [200, 200, 200] },
	{
		route: 'DELETE /api/auth/two-factor/users/[userId]',
		param: 'userId',
		status: [403, 400, 400],
		cls: ['NO-CALL', 'NO-CALL', 'NO-CALL']
	},
	{ route: 'DELETE /api/chat/attachments/[documentId]', param: 'documentId', status: [200, 200, 200] },
	{ route: 'PATCH /api/chat/categories/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/chat/categories/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/conversations/[id]/archive', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/chat/conversations/[id]/files', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/conversations/[id]/join', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/conversations/[id]/leave', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/chat/conversations/[id]/members/[employeeId]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/chat/conversations/[id]/members/[employeeId]', param: 'employeeId', status: [200, 200, 200] },
	{ route: 'GET /api/chat/conversations/[id]/members', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/conversations/[id]/members', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/chat/conversations/[id]/messages', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/conversations/[id]/messages', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/chat/conversations/[id]/pins', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/conversations/[id]/read', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/chat/conversations/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PATCH /api/chat/conversations/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PATCH /api/chat/conversations/[id]/state', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/conversations/[id]/typing', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/conversations/[id]/unarchive', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/chat/conversations/[id]/webhooks', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/conversations/[id]/webhooks', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/chat/interactions/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/messages/[id]/create-task', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/messages/[id]/follow', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/messages/[id]/interactions', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/messages/[id]/pin', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/messages/[id]/reactions/[emoji]', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/messages/[id]/reactions/[emoji]', param: 'emoji', status: [200, 200, 200] },
	{ route: 'DELETE /api/chat/messages/[id]/reactions/[emoji]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/chat/messages/[id]/reactions/[emoji]', param: 'emoji', status: [200, 200, 200] },
	{ route: 'PATCH /api/chat/messages/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/chat/messages/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PATCH /api/chat/messages/[id]/tasks/[taskId]', param: 'id', status: [200, 200, 200] },
	{ route: 'PATCH /api/chat/messages/[id]/tasks/[taskId]', param: 'taskId', status: [200, 200, 200] },
	{ route: 'GET /api/chat/messages/[id]/thread', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/messages/[id]/unfollow', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/messages/[id]/unpin', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/messages/[id]/unread', param: 'id', status: [200, 200, 200] },
	{ route: 'PATCH /api/chat/webhooks/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/chat/webhooks/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/chat/webhooks/[id]/secret', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/comment/[id]/recover', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/comment/[id]', param: 'id', status: [200, 400, 400], cls: ['CONTAINED', 'REFUSED', 'REFUSED'] },
	{
		route: 'DELETE /api/comment/[id]',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{ route: 'DELETE /api/comment/[id]/soft', param: 'id', status: [200, 200, 200] },
	{
		route: 'PUT /api/daily-plan/[id]/remove',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/daily-plan/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/daily-plan/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/daily-plan/[id]/task',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'GET /api/daily-plan/employee/[employeeId]',
		param: 'employeeId',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'POST /api/daily-plan/plan/[planId]',
		param: 'planId',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/daily-plan/plan/[planId]',
		param: 'planId',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'GET /api/daily-plan/task/[taskId]',
		param: 'taskId',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{ route: 'PATCH /api/embed-allowed-origins/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/embed-allowed-origins/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/embed-credentials/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/employee-appointment/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/employee-appointment/[id]', param: 'id', status: [200, 200, 200] },
	{
		route: 'PUT /api/employee-notification-setting/[id]',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{
		route: 'PUT /api/employee-notification/[id]',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{
		route: 'POST /api/employee-placeholder/[id]/claim',
		param: 'id',
		status: [201, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{
		route: 'GET /api/employee-placeholder/[id]/merge-preview',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{
		route: 'POST /api/employee-placeholder/[id]/merge',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{
		route: 'GET /api/employee/[id]/pay-rate',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{
		route: 'PUT /api/employee/[id]/profile',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{ route: 'PUT /api/employee/[id]', param: 'id', status: [200, 200, 200], cls: ['CONTAINED', 'ESCAPED', 'ESCAPED'] },
	{ route: 'DELETE /api/favorite/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/inbox/items/[id]/reply', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/inbox/items/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PATCH /api/inbox/items/[id]/state', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/inbox/push-subscriptions/[id]', param: 'id', status: [200, 200, 200] },
	{
		route: 'DELETE /api/integration-tenant/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{ route: 'POST /api/integration/asana/[id]/conflicts/[conflictId]/resolve', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/asana/[id]/conflicts/[conflictId]/resolve',
		param: 'conflictId',
		status: [200, 200, 200]
	},
	{ route: 'GET /api/integration/asana/[id]/conflicts', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/asana/[id]/mappings/[mappingId]/import', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/asana/[id]/mappings/[mappingId]/import',
		param: 'mappingId',
		status: [200, 200, 200]
	},
	{ route: 'PUT /api/integration/asana/[id]/mappings/[mappingId]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/integration/asana/[id]/mappings/[mappingId]', param: 'mappingId', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/asana/[id]/mappings/[mappingId]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/asana/[id]/mappings/[mappingId]', param: 'mappingId', status: [200, 200, 200] },
	{ route: 'POST /api/integration/asana/[id]/mappings/[mappingId]/webhook', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/asana/[id]/mappings/[mappingId]/webhook',
		param: 'mappingId',
		status: [200, 200, 200]
	},
	{ route: 'GET /api/integration/asana/[id]/mappings', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/asana/[id]/mappings', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/asana/[id]/metadata', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/asana/[id]/projects/[projectGid]/sections', param: 'id', status: [200, 200, 200] },
	{
		route: 'GET /api/integration/asana/[id]/projects/[projectGid]/sections',
		param: 'projectGid',
		status: [200, 200, 200]
	},
	{ route: 'GET /api/integration/asana/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/asana/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/asana/[id]/runs', param: 'id', status: [200, 200, 200] },
	{
		route: 'GET /api/integration/asana/[id]/workspaces/[workspaceGid]/projects',
		param: 'id',
		status: [200, 200, 200]
	},
	{
		route: 'GET /api/integration/asana/[id]/workspaces/[workspaceGid]/projects',
		param: 'workspaceGid',
		status: [200, 200, 200]
	},
	{ route: 'POST /api/integration/jira/[id]/conflicts/[conflictId]/resolve', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/jira/[id]/conflicts/[conflictId]/resolve',
		param: 'conflictId',
		status: [200, 200, 200]
	},
	{ route: 'GET /api/integration/jira/[id]/conflicts', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/jira/[id]/mappings/[mappingId]/import', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/jira/[id]/mappings/[mappingId]/import',
		param: 'mappingId',
		status: [200, 200, 200]
	},
	{ route: 'PUT /api/integration/jira/[id]/mappings/[mappingId]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/integration/jira/[id]/mappings/[mappingId]', param: 'mappingId', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/jira/[id]/mappings/[mappingId]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/jira/[id]/mappings/[mappingId]', param: 'mappingId', status: [200, 200, 200] },
	{ route: 'GET /api/integration/jira/[id]/mappings', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/jira/[id]/mappings', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/jira/[id]/projects/[projectId]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/jira/[id]/projects/[projectId]', param: 'projectId', status: [200, 200, 200] },
	{ route: 'GET /api/integration/jira/[id]/projects', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/jira/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/jira/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/jira/[id]/runs', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/integration/jira/[id]/site', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/jira/[id]/sites', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/jira/[id]/webhook', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/linear/[id]/conflicts/[conflictId]/resolve', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/linear/[id]/conflicts/[conflictId]/resolve',
		param: 'conflictId',
		status: [200, 200, 200]
	},
	{ route: 'GET /api/integration/linear/[id]/conflicts', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/linear/[id]/mappings/[mappingId]/import', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/linear/[id]/mappings/[mappingId]/import',
		param: 'mappingId',
		status: [200, 200, 200]
	},
	{ route: 'PUT /api/integration/linear/[id]/mappings/[mappingId]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/integration/linear/[id]/mappings/[mappingId]', param: 'mappingId', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/linear/[id]/mappings/[mappingId]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/linear/[id]/mappings/[mappingId]', param: 'mappingId', status: [200, 200, 200] },
	{ route: 'GET /api/integration/linear/[id]/mappings', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/linear/[id]/mappings', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/linear/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/linear/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/linear/[id]/runs', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/linear/[id]/teams/[teamId]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/linear/[id]/teams/[teamId]', param: 'teamId', status: [200, 200, 200] },
	{ route: 'GET /api/integration/linear/[id]/teams', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/trello/[id]/boards/[boardId]/lists', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/trello/[id]/boards/[boardId]/lists', param: 'boardId', status: [200, 200, 200] },
	{ route: 'POST /api/integration/trello/[id]/conflicts/[conflictId]/resolve', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/trello/[id]/conflicts/[conflictId]/resolve',
		param: 'conflictId',
		status: [200, 200, 200]
	},
	{ route: 'GET /api/integration/trello/[id]/conflicts', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/trello/[id]/mappings/[mappingId]/import', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/trello/[id]/mappings/[mappingId]/import',
		param: 'mappingId',
		status: [200, 200, 200]
	},
	{ route: 'PUT /api/integration/trello/[id]/mappings/[mappingId]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/integration/trello/[id]/mappings/[mappingId]', param: 'mappingId', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/trello/[id]/mappings/[mappingId]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/trello/[id]/mappings/[mappingId]', param: 'mappingId', status: [200, 200, 200] },
	{ route: 'POST /api/integration/trello/[id]/mappings/[mappingId]/webhook', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/integration/trello/[id]/mappings/[mappingId]/webhook',
		param: 'mappingId',
		status: [200, 200, 200]
	},
	{ route: 'GET /api/integration/trello/[id]/mappings', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/integration/trello/[id]/mappings', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/trello/[id]/metadata', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/trello/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/integration/trello/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/integration/trello/[id]/runs', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/invite/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/invite/[id]', param: 'id', status: [400, 400, 400], cls: ['NO-CALL', 'NO-CALL', 'NO-CALL'] },
	{
		route: 'DELETE /api/invite/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{ route: 'POST /api/invoice-item/bulk/[invoiceId]', param: 'invoiceId', status: [200, 200, 200] },
	{ route: 'PUT /api/invoice-schedules/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/invoice-schedules/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/invoice-schedules/[id]/runs', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/invoices/[id]/action', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/invoices/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/invoices/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/invoices/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/invoices/[id]/with-items', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/invoices/download/[id]', param: 'id', status: [200, 200, 200] },
	{
		route: 'DELETE /api/issue-types/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{ route: 'PUT /api/organization-contact/[id]/recover', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/organization-contact/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/organization-contact/[id]/soft', param: 'id', status: [200, 200, 200] },
	{
		route: 'PUT /api/organization-projects/[id]/members/[employeeId]/rate',
		param: 'id',
		status: [400, 400, 400],
		cls: ['NO-CALL', 'NO-CALL', 'NO-CALL']
	},
	{
		route: 'PUT /api/organization-projects/[id]/members/[employeeId]/rate',
		param: 'employeeId',
		status: [400, 400, 400],
		cls: ['NO-CALL', 'NO-CALL', 'NO-CALL']
	},
	{
		route: 'PUT /api/organization-projects/[id]/rate',
		param: 'id',
		status: [400, 400, 400],
		cls: ['NO-CALL', 'NO-CALL', 'NO-CALL']
	},
	{
		route: 'GET /api/organization-projects/[id]/rates',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{ route: 'DELETE /api/organization-projects/[id]', param: 'id', status: [200, 200, 200] },
	{
		route: 'PUT /api/organization-team-employee/[id]/active-task',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/organization-team-join/[id]/[action]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/organization-team/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/organization-team/employee/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/organization-team/employee/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/organization-team/teams/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{ route: 'GET /api/organization/[id]/counts', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/organization/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/organization/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/organization/[id]/soft', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/archive', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/plugins/docs/documents/[id]/comment-anchors', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/plugins/docs/documents/[id]/comments/[commentId]/anchor', param: 'id', status: [200, 200, 200] },
	{
		route: 'PUT /api/plugins/docs/documents/[id]/comments/[commentId]/anchor',
		param: 'commentId',
		status: [200, 200, 200]
	},
	{
		route: 'DELETE /api/plugins/docs/documents/[id]/comments/[commentId]/anchor',
		param: 'id',
		status: [200, 200, 200]
	},
	{
		route: 'DELETE /api/plugins/docs/documents/[id]/comments/[commentId]/anchor',
		param: 'commentId',
		status: [200, 200, 200]
	},
	{ route: 'PUT /api/plugins/docs/documents/[id]/content', param: 'id', status: [200, 200, 200] },
	{
		route: 'GET /api/plugins/docs/documents/[id]/download',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{ route: 'POST /api/plugins/docs/documents/[id]/duplicate', param: 'id', status: [200, 200, 200] },
	{
		route: 'GET /api/plugins/docs/documents/[id]/export.pdf',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{ route: 'GET /api/plugins/docs/documents/[id]/export/markdown', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/plugins/docs/documents/[id]/follow', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/follow', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/plugins/docs/documents/[id]/links', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/live/awareness', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/live/updates', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/move', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/mute', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/plugins/docs/documents/[id]/path', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/recover', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/plugins/docs/documents/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/plugins/docs/documents/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/plugins/docs/documents/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/space', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/unarchive', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/unfollow', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/plugins/docs/documents/[id]/unmute', param: 'id', status: [200, 200, 200] },
	{
		route: 'POST /api/plugins/docs/documents/[id]/versions/[versionId]/restore',
		param: 'id',
		status: [200, 200, 200]
	},
	{
		route: 'POST /api/plugins/docs/documents/[id]/versions/[versionId]/restore',
		param: 'versionId',
		status: [200, 200, 200]
	},
	{ route: 'GET /api/plugins/docs/documents/[id]/versions/[versionId]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/plugins/docs/documents/[id]/versions/[versionId]', param: 'versionId', status: [200, 200, 200] },
	{ route: 'GET /api/plugins/docs/documents/[id]/versions', param: 'id', status: [200, 200, 200] },
	{
		route: 'GET /api/plugins/docs/imports/[id]',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{
		route: 'POST /api/public/invoice-payments/invoice/[id]/[token]/checkout',
		param: 'id',
		status: [400, 400, 400],
		cls: ['NO-CALL', 'NO-CALL', 'NO-CALL']
	},
	{
		route: 'GET /api/public/invoice-payments/invoice/[id]/[token]',
		param: 'id',
		status: [400, 400, 400],
		cls: ['NO-CALL', 'NO-CALL', 'NO-CALL']
	},
	{
		route: 'GET /api/public/invoice/[id]/[token]/download',
		param: 'id',
		status: [400, 400, 400],
		cls: ['NO-CALL', 'NO-CALL', 'NO-CALL']
	},
	{
		route: 'GET /api/public/invoice/[id]/[token]',
		param: 'id',
		status: [400, 400, 400],
		cls: ['NO-CALL', 'NO-CALL', 'NO-CALL']
	},
	{ route: 'GET /api/public/team/[profileLink]/[teamId]', param: 'teamId', status: [200, 200, 200] },
	{ route: 'GET /api/role-permissions/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/role-permissions/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/roles/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/saved-reports/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/saved-reports/[id]', param: 'id', status: [204, 204, 204] },
	{ route: 'POST /api/saved-reports/[id]/share', param: 'id', status: [201, 201, 201] },
	{ route: 'DELETE /api/saved-reports/[id]/share', param: 'id', status: [204, 204, 204] },
	{ route: 'PUT /api/tags/[id]', param: 'id', status: [200, 200, 200], cls: ['CONTAINED', 'ESCAPED', 'ESCAPED'] },
	{ route: 'GET /api/task-automations/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/task-automations/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/task-automations/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/task-automations/[id]/runs', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/task-automations/[id]/test', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/task-estimation/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/task-estimation/[id]', param: 'id', status: [200, 200, 200] },
	{
		route: 'PUT /api/task-priorities/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/task-priorities/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/task-related-issue-types/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/task-related-issue-types/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/task-sizes/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/task-sizes/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/task-statuses/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/task-statuses/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'PUT /api/task-versions/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/task-versions/[id]',
		param: 'id',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{ route: 'PUT /api/task-views/[id]/order', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/task-views/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/task-views/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/task-views/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/tasks/[id]/recover', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/tasks/[id]', param: 'id', status: [200, 200, 200], cls: ['CONTAINED', 'ESCAPED', 'ESCAPED'] },
	{ route: 'DELETE /api/tasks/[id]/soft', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/tasks/[id]/trashed', param: 'id', status: [200, 200, 200] },
	{
		route: 'GET /api/tasks/employee/[employeeId]',
		param: 'employeeId',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/tasks/employee/[employeeId]',
		param: 'employeeId',
		status: [200, 200, 200],
		cls: ['CONTAINED', 'ESCAPED', 'ESCAPED']
	},
	{
		route: 'DELETE /api/tasks/task-linked-issue/[id]',
		param: 'id',
		status: [200, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{ route: 'PUT /api/time-goals/[id]/archive', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/time-goals/[id]/restore', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/time-goals/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/timer/timesheet/time-log/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'GET /api/timesheet/time-log/[id]/history', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/timesheet/time-log/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'POST /api/timesheet/time-log/[id]/split', param: 'id', status: [200, 200, 200] },
	{ route: 'PUT /api/timesheet/time-log/[id]/tags', param: 'id', status: [200, 200, 200] },
	{
		route: 'DELETE /api/user-api-tokens/[id]',
		param: 'id',
		status: [204, 400, 400],
		cls: ['CONTAINED', 'REFUSED', 'REFUSED']
	},
	{ route: 'PUT /api/user/[id]/role', param: 'id', status: [400, 400, 400], cls: ['NO-CALL', 'NO-CALL', 'NO-CALL'] },
	{ route: 'GET /api/user/[id]', param: 'id', status: [200, 200, 200], cls: ['CONTAINED', 'ESCAPED', 'ESCAPED'] },
	{ route: 'PUT /api/user/[id]', param: 'id', status: [200, 200, 200] },
	{ route: 'DELETE /api/user/[id]', param: 'id', status: [200, 200, 200] }
];

/** Rows where the crafted segment reached another upstream endpoint: the recorded call is the witness. */
export const ESCAPED_ROWS: EscapedRow[] = [
	{
		route: 'PUT /api/daily-plan/[id]/remove',
		param: 'id',
		line: 'core/services/server/requests/daily-plan.ts:273',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee/remove', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/daily-plan/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/daily-plan/[id]',
		param: 'id',
		line: 'core/services/server/requests/daily-plan.ts:207',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/daily-plan/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/daily-plan/[id]',
		param: 'id',
		line: 'core/services/server/requests/daily-plan.ts:257',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/daily-plan/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/daily-plan/[id]/task',
		param: 'id',
		line: 'core/services/server/requests/daily-plan.ts:247',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee/task', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/daily-plan/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'GET /api/daily-plan/employee/[employeeId]',
		param: 'employeeId',
		line: 'core/services/server/requests/daily-plan.ts:123',
		calls: {
			slash: [
				{
					method: 'GET',
					path: '/api/daily-plan/employee',
					keys: [
						'relations[0]',
						'relations[1]',
						'relations[2]',
						'relations[3]',
						'relations[4]',
						'where[organizationId]',
						'where[organizationTeamId]',
						'where[tenantId]'
					],
					status: 200
				}
			],
			query: [
				{
					method: 'GET',
					path: '/api/daily-plan/employee/x',
					keys: [
						'relations[0]',
						'relations[1]',
						'relations[2]',
						'relations[3]',
						'relations[4]',
						'where[organizationTeamId]',
						'where[tenantId]',
						'y'
					],
					status: 200
				}
			]
		}
	},
	{
		route: 'POST /api/daily-plan/plan/[planId]',
		param: 'planId',
		line: 'core/services/server/requests/daily-plan.ts:227',
		calls: {
			slash: [{ method: 'POST', path: '/api/employee/task', keys: [], status: 200 }],
			query: [{ method: 'POST', path: '/api/daily-plan/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/daily-plan/plan/[planId]',
		param: 'planId',
		line: 'core/services/server/requests/daily-plan.ts:247',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee/task', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/daily-plan/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'GET /api/daily-plan/task/[taskId]',
		param: 'taskId',
		line: 'core/services/server/requests/daily-plan.ts:152',
		calls: {
			slash: [
				{
					method: 'GET',
					path: '/api/daily-plan/employee',
					keys: ['where[organizationId]', 'where[organizationTeamId]', 'where[tenantId]'],
					status: 200
				}
			],
			query: [
				{
					method: 'GET',
					path: '/api/daily-plan/task/x',
					keys: ['where[organizationTeamId]', 'where[tenantId]', 'y'],
					status: 200
				}
			]
		}
	},
	{
		route: 'PUT /api/employee/[id]',
		param: 'id',
		line: 'core/services/server/requests/employee.ts:88',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/employee/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/integration-tenant/[id]',
		param: 'id',
		line: 'core/services/server/requests/integrations/integration-tenant.ts:36',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/employee', keys: ['organizationId', 'tenantId'], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/integration-tenant/x', keys: ['tenantId', 'y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/invite/[id]',
		param: 'id',
		line: 'core/services/server/requests/invite.ts:50',
		calls: {
			slash: [
				{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 },
				{
					method: 'GET',
					path: '/api/invite',
					keys: ['where[organizationId]', 'where[status]', 'where[teams][id][0]', 'where[tenantId]'],
					status: 200
				}
			],
			query: [
				{ method: 'DELETE', path: '/api/invite/x', keys: ['y'], status: 200 },
				{
					method: 'GET',
					path: '/api/invite',
					keys: ['where[organizationId]', 'where[status]', 'where[teams][id][0]', 'where[tenantId]'],
					status: 200
				}
			]
		}
	},
	{
		route: 'DELETE /api/issue-types/[id]',
		param: 'id',
		line: 'core/services/server/requests/issue-type.ts:45',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/issue-types/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/organization-team-employee/[id]/active-task',
		param: 'id',
		line: 'core/services/server/requests/organization-team-employee.ts:60',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee/active-task', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/organization-team-employee/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/organization-team-join/[id]/[action]',
		param: 'id',
		line: 'core/services/server/requests/request-to-join-team.ts:97',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee/accept', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/organization-team-join/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/organization-team/[id]',
		param: 'id',
		line: 'core/services/server/requests/organization-team.ts:99 and :168',
		calls: {
			slash: [
				{ method: 'PUT', path: '/api/employee', keys: [], status: 200 },
				{
					method: 'GET',
					path: '/api/employee',
					keys: [
						'endDate',
						'includeOrganizationTeamId',
						'organizationId',
						'relations[0]',
						'relations[1]',
						'relations[2]',
						'relations[3]',
						'relations[4]',
						'relations[5]',
						'relations[6]',
						'relations[7]',
						'startDate',
						'tenantId',
						'withLastWorkedTask'
					],
					status: 200
				}
			],
			query: [
				{ method: 'PUT', path: '/api/organization-team/x', keys: ['y'], status: 200 },
				{
					method: 'GET',
					path: '/api/organization-team/x',
					keys: [
						'endDate',
						'includeOrganizationTeamId',
						'relations[0]',
						'relations[1]',
						'relations[2]',
						'relations[3]',
						'relations[4]',
						'relations[5]',
						'relations[6]',
						'relations[7]',
						'startDate',
						'tenantId',
						'withLastWorkedTask',
						'y'
					],
					status: 200
				}
			]
		}
	},
	{
		route: 'PUT /api/organization-team/employee/[id]',
		param: 'id',
		line: 'core/services/server/requests/organization-team.ts:257',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/organization-team-employee/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/organization-team/employee/[id]',
		param: 'id',
		line: 'core/services/server/requests/organization-team.ts:234',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/organization-team-employee/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/organization-team/teams/[id]',
		param: 'id',
		line: 'core/services/server/requests/organization-team.ts:277',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/organization-team/employee', keys: [], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/organization-team/teams/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/tags/[id]',
		param: 'id',
		line: 'core/services/server/requests/task-labels.ts:29',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/tags/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/task-priorities/[id]',
		param: 'id',
		line: 'core/services/server/requests/task-priorities.ts:26',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/task-priorities/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/task-priorities/[id]',
		param: 'id',
		line: 'core/services/server/requests/task-priorities.ts:44',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/task-priorities/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/task-related-issue-types/[id]',
		param: 'id',
		line: 'core/services/server/requests/task-related-issue-type.ts:31',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/task-related-issue-types/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/task-related-issue-types/[id]',
		param: 'id',
		line: 'core/services/server/requests/task-related-issue-type.ts:49',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/task-related-issue-types/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/task-sizes/[id]',
		param: 'id',
		line: 'core/services/server/requests/task-sizes.ts:27',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/task-sizes/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/task-sizes/[id]',
		param: 'id',
		line: 'core/services/server/requests/task-sizes.ts:45',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/task-sizes/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/task-statuses/[id]',
		param: 'id',
		line: 'core/services/server/requests/taskStatus.ts:27',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/task-statuses/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/task-statuses/[id]',
		param: 'id',
		line: 'core/services/server/requests/taskStatus.ts:45',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/task-statuses/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/task-versions/[id]',
		param: 'id',
		line: 'core/services/server/requests/task-version.ts:26',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/task-versions/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/task-versions/[id]',
		param: 'id',
		line: 'core/services/server/requests/task-version.ts:44',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/task-versions/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'PUT /api/tasks/[id]',
		param: 'id',
		line: 'core/services/server/requests/tasks.ts:162',
		calls: {
			slash: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'PUT', path: '/api/tasks/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'GET /api/tasks/employee/[employeeId]',
		param: 'employeeId',
		line: 'core/services/server/requests/tasks.ts:202',
		calls: {
			slash: [{ method: 'GET', path: '/api/tasks/employee', keys: ['organizationTeamId'], status: 200 }],
			query: [{ method: 'GET', path: '/api/tasks/employee/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'DELETE /api/tasks/employee/[employeeId]',
		param: 'employeeId',
		line: 'core/services/server/requests/tasks.ts:181',
		calls: {
			slash: [{ method: 'DELETE', path: '/api/tasks/employee', keys: ['organizationTeamId'], status: 200 }],
			query: [{ method: 'DELETE', path: '/api/tasks/employee/x', keys: ['y'], status: 200 }]
		}
	},
	{
		route: 'GET /api/user/[id]',
		param: 'id',
		line: 'core/services/server/requests/tasks.ts:145',
		calls: {
			slash: [{ method: 'GET', path: '/api/employee', keys: [], status: 200 }],
			query: [{ method: 'GET', path: '/api/user/x', keys: ['y'], status: 200 }]
		}
	}
];

/** Rows where the handler refused the crafted segment before it reached any builder. */
export const REFUSED_ROWS: RefusedRow[] = [
	{ route: 'PUT /api/comment/[id]', param: 'id', status: 400, body: '{"error":"A comment id is required"}' },
	{ route: 'DELETE /api/comment/[id]', param: 'id', status: 400, body: '{"error":"A comment id is required"}' },
	{
		route: 'PUT /api/employee-notification-setting/[id]',
		param: 'id',
		status: 400,
		body: '{"error":"A notification setting id is required"}'
	},
	{
		route: 'PUT /api/employee-notification/[id]',
		param: 'id',
		status: 400,
		body: '{"error":"A notification id is required"}'
	},
	{
		route: 'POST /api/employee-placeholder/[id]/claim',
		param: 'id',
		status: 400,
		body: '{"message":"A member id is required"}'
	},
	{
		route: 'GET /api/employee-placeholder/[id]/merge-preview',
		param: 'id',
		status: 400,
		body: '{"message":"A member id is required"}'
	},
	{
		route: 'POST /api/employee-placeholder/[id]/merge',
		param: 'id',
		status: 400,
		body: '{"message":"A member id is required"}'
	},
	{
		route: 'GET /api/employee/[id]/pay-rate',
		param: 'id',
		status: 400,
		body: '{"message":"An employee id is required"}'
	},
	{
		route: 'PUT /api/employee/[id]/profile',
		param: 'id',
		status: 400,
		body: '{"message":"An employee id is required"}'
	},
	{
		route: 'GET /api/organization-projects/[id]/rates',
		param: 'id',
		status: 400,
		body: '{"message":"A project id is required"}'
	},
	{
		route: 'GET /api/plugins/docs/documents/[id]/download',
		param: 'id',
		status: 400,
		body: '{"error":"A document id is required"}'
	},
	{
		route: 'GET /api/plugins/docs/documents/[id]/export.pdf',
		param: 'id',
		status: 400,
		body: '{"error":"A document id is required"}'
	},
	{
		route: 'GET /api/plugins/docs/imports/[id]',
		param: 'id',
		status: 400,
		body: '{"error":"An import id is required"}'
	},
	{
		route: 'DELETE /api/tasks/task-linked-issue/[id]',
		param: 'id',
		status: 400,
		body: '{"error":"Invalid linked issue ID"}'
	},
	{
		route: 'DELETE /api/user-api-tokens/[id]',
		param: 'id',
		status: 400,
		body: '{"message":"A token id is required"}'
	}
];

/** Rows where the control run itself asked the platform nothing: these prove nothing about escaping. */
export const NO_CALL_ROWS: NoCallRow[] = [
	{
		route: 'DELETE /api/auth/two-factor/users/[userId]',
		param: 'userId',
		status: [403, 400, 400],
		reason: 'the route answers 403 for this fixture role before any upstream call (two-factor-proxy.ts)'
	},
	{
		route: 'PUT /api/invite/[id]',
		param: 'id',
		status: [400, 400, 400],
		reason: 'the route answers 400 for a body {} that carries no invite action'
	},
	{
		route: 'PUT /api/organization-projects/[id]/members/[employeeId]/rate',
		param: 'id',
		status: [400, 400, 400],
		reason: 'the route answers 400: a rate body is required (rates.ts validation)'
	},
	{
		route: 'PUT /api/organization-projects/[id]/members/[employeeId]/rate',
		param: 'employeeId',
		status: [400, 400, 400],
		reason: 'the route answers 400: the PARAMS employee id is not a guid'
	},
	{
		route: 'PUT /api/organization-projects/[id]/rate',
		param: 'id',
		status: [400, 400, 400],
		reason: 'the route answers 400: {} carries no rate'
	},
	{
		route: 'POST /api/public/invoice-payments/invoice/[id]/[token]/checkout',
		param: 'id',
		status: [400, 400, 400],
		reason: 'the route answers 400 "Invalid link": the fixture token is not a shared-invoice link token'
	},
	{
		route: 'GET /api/public/invoice-payments/invoice/[id]/[token]',
		param: 'id',
		status: [400, 400, 400],
		reason: 'the route answers 400 "Invalid link" for the fixture token'
	},
	{
		route: 'GET /api/public/invoice/[id]/[token]/download',
		param: 'id',
		status: [400, 400, 400],
		reason: 'the route answers 400 "Invalid link" for the fixture token'
	},
	{
		route: 'GET /api/public/invoice/[id]/[token]',
		param: 'id',
		status: [400, 400, 400],
		reason: 'the route answers 400 "Invalid link" for the fixture token'
	},
	{
		route: 'PUT /api/user/[id]/role',
		param: 'id',
		status: [400, 400, 400],
		reason: 'the route answers 400: {} carries no role id'
	}
];

/** CONTAINED rows whose crafted segment never reached the upstream at all: the route put its own value in that position. */
export const DROPPED_ROWS: DroppedRow[] = [
	{
		route: 'GET /api/invite/[id]',
		param: 'id',
		line: 'app/api/invite/[id]/route.ts:23 calls getMyInvitationsRequest (core/services/server/requests/invite.ts:215-221), which writes /invite/me',
		calls: [{ method: 'GET', path: '/api/invite/me', keys: [], status: 200 }]
	},
	{
		route: 'PUT /api/role-permissions/[id]',
		param: 'id',
		line: 'app/api/role-permissions/[id]/route.ts:50-53 hands only { data: body } to updateRolePermissionRequest; core/services/server/requests/role-permissions.ts:58 writes /role-permissions/${data.id}',
		calls: [{ method: 'PUT', path: '/api/role-permissions/undefined', keys: [], status: 200 }]
	},
	{
		route: 'PUT /api/roles/[id]',
		param: 'id',
		line: 'app/api/roles/[id]/route.ts:25-28 hands only { data: body } to updateRoleRequest; core/services/server/requests/roles.ts:89 writes /roles/${data.id}',
		calls: [{ method: 'PUT', path: '/api/roles/undefined', keys: [], status: 200 }]
	},
	{
		route: 'PUT /api/timer/timesheet/time-log/[id]',
		param: 'id',
		line: 'app/api/timer/timesheet/time-log/[id]/route.ts:16 reads the id from the query, never from the segment; core/services/server/requests/timesheet.ts:120 writes /timesheet/time-log/${params.id}',
		calls: [{ method: 'PUT', path: '/api/timesheet/time-log/null', keys: [], status: 200 }]
	},
	{
		route: 'PUT /api/user/[id]',
		param: 'id',
		line: 'app/api/user/[id]/route.ts:51-54 passes id: user.id (the session person); core/services/server/requests/settings.ts:9 writes /user/${id}',
		calls: [{ method: 'PUT', path: '/api/user/44444444-4444-4444-8444-111111111111', keys: [], status: 200 }]
	},
	{
		route: 'DELETE /api/user/[id]',
		param: 'id',
		line: 'app/api/user/[id]/route.ts:82-83 passes id: user.id (the session person); core/services/server/requests/user.ts:31 writes /user/${id}',
		calls: [{ method: 'DELETE', path: '/api/user/44444444-4444-4444-8444-111111111111', keys: [], status: 200 }]
	}
];

/** `app/api/…/[id]/route.ts` for a route pattern: a failure message names the file that owns the handler. */
const routeFileOf = (pattern: string): string => `app/api/${pattern.replace(/^\/api\//, '')}/route.ts`;

/** The stable key of a group, shared by `PINNED` and the four detail tables. */
const rowKey = (route: string, param: string): string => `${route} #${param}`;

const keyOf = (row: { route: string; param: string }): string => rowKey(row.route, row.param);

/** The mock's log as this file reads it: the guards' own reads dropped, each query reduced to its key names. */
const resourceCalls = (log: StubRequest[]): Call[] =>
	log
		.filter((entry) => !GUARD_CALLS.includes(entry.path))
		.map((entry) => ({
			method: entry.method,
			path: entry.path,
			keys: Array.from(new Set(new URLSearchParams(entry.query).keys())).sort(),
			status: entry.status
		}));

/** The way `encodeURIComponent(id)` in the safe builders writes a decoded segment into an upstream path. */
const encodeSegment = (segment: string): string => encodeURIComponent(decodeURIComponent(segment));

/** The control run's calls, with the control slot holding the crafted segment, percent-encoded. */
const containedCalls = (control: Call[], segment: string): Call[] =>
	control.map((call) => ({ ...call, path: call.path.split(CONTROL_SEGMENT).join(encodeSegment(segment)) }));

const sameCall = (left: Call, right: Call): boolean =>
	left.method === right.method &&
	left.path === right.path &&
	left.status === right.status &&
	JSON.stringify(left.keys) === JSON.stringify(right.keys);

/** The class of one form-row, decided from the control run's calls and this run's calls and nothing else. */
function classify(control: Call[], segment: string, calls: Call[]): Class {
	if (control.length === 0) {
		return 'NO-CALL';
	}
	if (calls.length === 0) {
		return 'REFUSED';
	}
	const wanted = containedCalls(control, segment);
	return calls.length === wanted.length && calls.every((call, index) => sameCall(call, wanted[index]))
		? 'CONTAINED'
		: 'ESCAPED';
}

const segmentOf = (form: FormKey): string => {
	const found = FORMS.find((entry) => entry.key === form);
	if (!found) {
		throw new Error(`this file measures no form called ${form}`);
	}
	return found.segment;
};

/** The app URL for one group: its crafted param holds `segment`, every other param its control value. */
const appPathOf = (row: ScopeRow, segment: string): string =>
	row.pattern.replace(/\[([^\]]+)\]/g, (_raw, name: string) =>
		name === row.param ? segment : (PARAMS[name] ?? OTHER_SEGMENT)
	);

type ProbeRun = { path: string; status: number; answer: string; calls: Call[]; log: StubRequest[] };

/**
 * One request, on a mock that was just reset and re-armed with the permissions that open every gate. The `mock`
 * fixture does reset before each test (`playwright/api-fixtures.ts:51-65`), but a row here runs three requests, so
 * each one resets again: without that, the second and third run would read the first one's log.
 */
async function probe(api: ApiCall, row: ScopeRow, form: FormKey): Promise<ProbeRun> {
	const path = appPathOf(row, segmentOf(form));
	await mockReset();
	await mockScenario({ extraPermissions: [...EXTRA_PERMISSIONS] });
	const response = await api(path, {
		method: row.verb,
		...(MUTATING.includes(row.verb) ? { body: {} } : {})
	});
	const answer = await response.text();
	const log = await mockRequests();
	return { path, status: response.status(), answer, calls: resourceCalls(log), log };
}

const scopeRowOf = (pinned: PinnedRow): ScopeRow => {
	const found = SCOPE.find((row) => row.route === pinned.route && row.param === pinned.param);
	if (!found) {
		throw new Error(
			`${pinned.route} [${pinned.param}] is pinned but is not in scope: it is not a dynamic-segment route the ` +
				'manifest lists with this verb, its param is one this file never crafts, or lane-d already pins it'
		);
	}
	return found;
};

const escapedOf = (pinned: PinnedRow): EscapedRow => {
	const found = ESCAPED_ROWS.find((row) => keyOf(row) === keyOf(pinned));
	if (!found) {
		throw new Error(
			`${pinned.route} [${pinned.param}] is pinned as ESCAPED with no ESCAPED_ROWS entry: the recorded call and ` +
				'the builder line that interpolates the id raw have to be pinned before the class can be claimed'
		);
	}
	return found;
};

const refusedOf = (pinned: PinnedRow): RefusedRow => {
	const found = REFUSED_ROWS.find((row) => keyOf(row) === keyOf(pinned));
	if (!found) {
		throw new Error(
			`${pinned.route} [${pinned.param}] is pinned as REFUSED with no REFUSED_ROWS entry pinning its status and body`
		);
	}
	return found;
};

const droppedOf = (pinned: PinnedRow): DroppedRow | undefined =>
	DROPPED_ROWS.find((row) => keyOf(row) === keyOf(pinned));

const classesOf = (pinned: PinnedRow): [Class, Class, Class] => pinned.cls ?? ['CONTAINED', 'CONTAINED', 'CONTAINED'];

test.describe('lane-b · a crafted path segment against every dynamic-segment route the app has', () => {
	test('the control values cannot be mistaken for each other, so the diff can only touch the crafted slot', () => {
		// `containedCalls` replaces the control UUID wherever it appears in a recorded path. That is only sound while
		// no other slot of the same URL can hold that string.
		expect(
			OTHER_SEGMENT,
			'the value a param with no PARAMS entry holds must not be the crafted control, or a route with two ' +
				'UUID-shaped segments would have both replaced by one diff'
		).not.toBe(CONTROL_SEGMENT);

		const colliding = Object.entries(PARAMS)
			.filter(([, value]) => value === CONTROL_SEGMENT || value === OTHER_SEGMENT)
			.map(([name]) => name);
		expect(
			colliding,
			`these PARAMS values equal a control segment, so the containment diff could replace the wrong occurrence ` +
				`of an id in a recorded path: ${colliding.join(', ')}`
		).toEqual([]);

		const unpinned = [
			...new Set(SCOPE.flatMap((row) => row.params.map((name) => (PARAMS[name] === undefined ? name : null))))
		].filter((name): name is string => name !== null);
		expect(
			unpinned,
			'only [boardId] has no PARAMS entry in this app; a new one needs a value here before it can be swept'
		).toEqual(['boardId']);
	});

	test('every route-verb-param in scope has exactly one pinned row, and every pinned row is in scope', () => {
		const scoped = SCOPE.map(keyOf).sort();
		const pinned = PINNED.map(keyOf).sort();
		const missing = scoped.filter((key) => !pinned.includes(key));
		const extra = pinned.filter((key) => !scoped.includes(key));
		expect(
			missing,
			`${missing.length} dynamic-segment route-verb-param group(s) have no measured row here: ${missing.join(', ')}. ` +
				'A route cannot join this app without being swept; only catch-alls, the 15 lane-d verbs and the routes ' +
				'whose only segment is a never-crafted value are excluded, and the header names each one'
		).toEqual([]);
		expect(
			extra,
			`${extra.length} pinned group(s) are no longer in scope: ${extra.join(', ')}. Either the route went away, ` +
				'its verb changed, or lane-d pinned it — drop the row rather than keep a claim nothing measures'
		).toEqual([]);
	});

	test('the four detail tables name exactly the rows PINNED calls non-CONTAINED', () => {
		const keysOfClass = (cls: Class) =>
			PINNED.filter((row) => classesOf(row).includes(cls))
				.map(keyOf)
				.sort();
		const keysOfTable = (rows: Array<{ route: string; param: string }>) => rows.map(keyOf).sort();

		expect(
			keysOfTable(ESCAPED_ROWS),
			'ESCAPED_ROWS must name exactly the groups PINNED marks ESCAPED, with a recorded call each'
		).toEqual(keysOfClass('ESCAPED'));
		expect(
			keysOfTable(REFUSED_ROWS),
			'REFUSED_ROWS must name exactly the groups PINNED marks REFUSED, with the app status and body each refused'
		).toEqual(keysOfClass('REFUSED'));
		expect(
			keysOfTable(NO_CALL_ROWS),
			'NO_CALL_ROWS must name exactly the groups PINNED marks NO-CALL, each with the reason the control asked nothing'
		).toEqual(keysOfClass('NO-CALL'));

		const nonContained = PINNED.filter((row) => classesOf(row).some((cls) => cls !== 'CONTAINED')).map(keyOf);
		const doublyPinned = DROPPED_ROWS.map(keyOf).filter((key) => nonContained.includes(key));
		expect(
			doublyPinned,
			`these groups are pinned both as not CONTAINED and as routes whose segment never reached the upstream: ${doublyPinned.join(', ')}`
		).toEqual([]);

		const statusDrift = REFUSED_ROWS.filter((refused) => {
			const pinned = PINNED.find((row) => keyOf(row) === keyOf(refused));
			return !pinned || !pinned.status.slice(1).every((status) => status === refused.status);
		}).map(keyOf);
		expect(
			statusDrift,
			`these REFUSED_ROWS entries do not repeat the status PINNED pins for both crafted forms: ${statusDrift.join(', ')}`
		).toEqual([]);

		const fileAndLine = /^[^\s]+\.[a-z]+:\d+( and :\d+)?$/;
		const uncited = ESCAPED_ROWS.filter((row) => !fileAndLine.test(row.line)).map(keyOf);
		expect(
			uncited,
			`an ESCAPED row without a file:line for the line that interpolates the id raw is a claim without a witness: ${uncited.join(', ')}`
		).toEqual([]);
	});

	for (const pinned of PINNED) {
		const row = scopeRowOf(pinned);
		const classes = classesOf(pinned);
		const file = routeFileOf(row.pattern);
		const dropped = droppedOf(pinned);
		// The line a failure message cites: the builder for an escaped group, the route's own line otherwise.
		const cited = ESCAPED_ROWS.find((entry) => keyOf(entry) === keyOf(pinned)) ?? dropped;

		test(`lane-b · ${pinned.route} · craft [${pinned.param}]`, async ({ api }) => {
			const citation = cited ? `${file}, ${cited.line}` : file;
			// The three requests run one after the other, each on a mock that was just reset, and every reading —
			// the log, the bearer records — is taken while this run's own calls are all the mock still holds.
			let controlCalls: Call[] = [];
			const measured: string[] = [];

			for (const [index, form] of FORMS.entries()) {
				const run = await probe(api, row, form.key);
				if (form.key === 'control') {
					controlCalls = run.calls;
				}
				measured.push(`${form.key} ${run.status} ${logOf(run.log)}`);
				const witness =
					`${row.verb} ${run.path} · app ${run.status} ` +
					`body(${run.answer.length}) ${run.answer.slice(0, 60)} · mock ${logOf(run.log)}`;

				expect(
					run.status,
					`${pinned.route} [${pinned.param}] with ${form.key} no longer answers ${pinned.status[index]} (${citation}): ${witness}`
				).toBe(pinned.status[index]);

				const cls = classify(controlCalls, form.segment, run.calls);
				expect(
					cls,
					`${pinned.route} [${pinned.param}] with ${form.key} is no longer ${classes[index]} (${citation}): ${witness}`
				).toBe(classes[index]);

				if (classes[index] === 'CONTAINED') {
					expect(
						run.calls,
						`the crafted segment no longer stays inside its own segment on the way upstream (${citation}): ${witness}`
					).toEqual(containedCalls(controlCalls, form.segment));

					if (dropped) {
						// Pinned because the control run cannot compute it: the crafted value is absent from the
						// recorded calls, and that absence is the finding about this route.
						expect(
							run.calls,
							`${pinned.route} no longer drops the caller's segment the way it was measured (${dropped.line}): ${witness}`
						).toEqual(dropped.calls);
						expect(
							run.calls.some((call) => call.path.includes(encodeSegment(form.segment))),
							`the crafted segment now appears in an upstream path of ${pinned.route}, where this route wrote ` +
								`its own value instead (${dropped.line}): ${witness}`
						).toBe(false);
					}
				}

				if (classes[index] === 'ESCAPED') {
					const escapedRow = escapedOf(pinned);
					const pinnedCalls = form.key === 'slash' ? escapedRow.calls.slash : escapedRow.calls.query;
					expect(
						run.calls,
						`the platform was asked for something else than the pinned escaped call (${escapedRow.line}): ${witness}`
					).toEqual(pinnedCalls);
					// An escaped call matters because it left with this caller's own session: the mock hashed a
					// bearer for the endpoint this case really reached.
					for (const call of pinnedCalls) {
						const bearers = await receivedTokens(call.path);
						expect(
							bearers.length,
							`the escaped call reached ${call.path} without this case's bearer (${escapedRow.line}): ${witness}`
						).toBeGreaterThan(0);
					}
				}

				if (classes[index] === 'REFUSED') {
					const refusedRow = refusedOf(pinned);
					expect(
						run.calls,
						`${pinned.route} no longer refuses the crafted segment before its builder runs (${file}): ${witness}`
					).toEqual([]);
					if (form.key !== 'control') {
						expect(
							run.answer,
							`the refusal of ${pinned.route} is no longer this app's own body ${JSON.stringify(refusedRow.body)} (${file}): ${witness}`
						).toBe(refusedRow.body);
					}
				}

				if (classes[index] === 'NO-CALL') {
					expect(
						run.calls,
						`${pinned.route} asked the platform something although the control run asked nothing (${file}): ${witness}`
					).toEqual([]);
				}
			}

			console.log(
				`[lane-b path-segment-sweep] MEASURE ${pinned.route} [${pinned.param}] ${classes.join('/')} ` +
					`status ${pinned.status.join('/')} · ${measured.join(' | ')}`
			);
		});
	}
});
