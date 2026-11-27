import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { MOCK_ORIGIN } from '../../test-servers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * Who gets **past** the permission gates of the proxy routes (everything `refuseUnlessPermitted` /
 * `refuseWithoutPermission` guards, except `app/api/invoices/…`, which `suites/lane-b/invoice-gates.spec.ts` owns),
 * and what reaches the upstream once they do. Measured on lane-b (app 3032, mock 3996) on 2026-11-23; every number
 * below is printed by the `MEASURE` lines of the runs `E:\Coding\.tmp\s2-lane-b-granted-1.log` and `-2.log`, and was
 * taken by hand against the live lane first, in `E:\Coding\.tmp\s2-probe-granted-1.log` (route × permission set),
 * `s2-probe-granted-2.log` (controls, upstream arms, cross-site writes, permission-read outage),
 * `s2-probe-granted-3.log` (media type, bodiless writes, the ungated sibling read) and
 * `s2-probe-granted-4.log` (which half of the invoice check opens which verb).
 *
 * `suites/lane-c/permission-guard.spec.ts` already pins that each of these routes **refuses** the fixture role, and
 * says out loud that it cannot show the guard letting anybody through. This file is that other half: the lane mock now
 * takes `scenario.extraPermissions` (`cypress/support/mock-gauzy-server.mjs:51-69`, `MockScenario` in
 * `playwright/helpers.ts:107-113`), so a test can hand the role the permission a route asks for and pin what changes.
 *
 * ## The two gate families, read with `cat -n`
 *
 * `refuseUnlessPermitted` (`core/services/server/refuse-without-permission.ts:34-57`), in this order:
 *
 *   - `:38-41` `refuseForeignWrite(req)` first (`core/services/server/same-origin-request.ts:43-46`): a write of
 *     another site answers `403 {"statusCode":403,"message":"Cross-site request refused"}` with
 *     `Cache-Control: no-store` (`same-origin-request.ts:48-53`), before any permission is read; a GET or HEAD is left
 *     alone;
 *   - `:42-47` the role's permissions, read through `forwardToGauzy` itself on `/role-permissions/me`;
 *   - `:48-50` a refusal of *that read* is handed straight back as this route's answer;
 *   - `:56` otherwise its own `403 {"statusCode":403,"message":"Forbidden resource"}`, with **no** `Cache-Control`.
 *
 * `refuseWithoutPermission` (`:59-62`) is the same helper with an "any of this list" predicate. Three of the routes
 * here also call `refuseForeignOrigin` themselves before the gate (`app/api/invoice-schedules/route.ts:21-22`,
 * `app/api/invoice-schedules/[id]/route.ts:12-13`, `app/api/organization/[id]/soft/route.ts:12-13`); measured, that
 * is the same 403 body, the same `no-store` and the same empty log as the helper's own check, so it changes nothing
 * observable (see the cross-site cases).
 *
 * ## The checks these routes name
 *
 *   - `canViewInvoices` (`core/lib/utils/invoice-access.ts:29-31`) = `INVOICES_VIEW` **and** one of `ORG_EMPLOYEES_EDIT`
 *     / `CHANGE_SELECTED_EMPLOYEE` (`:19-27`, `core/lib/utils/rates.ts:11` with `holdsRateAdminPermission` at
 *     `:258-260`);
 *   - `canCreateInvoices` (`invoice-access.ts:33-35`) = that, plus `INVOICES_EDIT` **and** `CHANGE_SELECTED_EMPLOYEE`;
 *   - `CLIENT_CREATE_PERMISSIONS` = any of `ORG_CONTACT_ADD` / `ORG_CONTACT_EDIT`, `CLIENT_EDIT_PERMISSIONS` =
 *     `ORG_CONTACT_EDIT` alone, `CLIENT_ARCHIVE_PERMISSIONS` = any of `ORG_CONTACT_DELETE` / `ORG_CONTACT_EDIT`
 *     (`core/lib/utils/clients.ts:7-9`), matched by `holdsAnyPermission` (`:41-43`);
 *   - `ORGANIZATION_DELETE_PERMISSIONS` = `ALL_ORG_EDIT` alone (`core/lib/utils/organization-deletion.ts:5-9`);
 *   - `holdsWorkspaceExportPermission` = `EXPORT_ADD` alone (`core/lib/utils/workspace-data-export.ts:26-27`, the
 *     permission named at `:4-8`);
 *   - `holdsTimerStartMovePermissions` = `TIME_TRACKER` **and** `ALLOW_MODIFY_TIME`
 *     (`core/lib/utils/timer/timer-start-move.ts:168-172`, the two permissions at `:4` and `:7`).
 *
 * This lane's fixture role always holds TIME_TRACKER, ORG_TASK_ADD, ORG_TASK_EDIT, ORG_INVITE_EDIT and
 * ORG_EMPLOYEES_EDIT (`mock-gauzy-server.mjs:50`), and `extraPermissions` **cannot take one of those away**
 * (`:54-62` filters the base five out). Two consequences, both measured: the rate-admin half of every invoice check is
 * satisfied on every call here, and the `TIME_TRACKER` half of the timer check is satisfied on every call here — so on
 * this lane those two halves can only be observed as "already true", never as "the missing half". What a test *can*
 * show is which single extra permission opens which verb, and which extra permission in the same util does **not**
 * (`ALLOW_MANUAL_TIME`, `ALL_ORG_VIEW`, `ORG_CONTACT_DELETE` on a create, `ORG_CONTACT_ADD` on an edit).
 *
 * ## What 14 gated verbs + 1 ungated sibling × their permission sets measured
 *
 * Every gate answers its own check; the one verb in this family with no gate at all is a read:
 *
 *   - the 4 invoice-shaped reads (`GET /api/invoice-schedules`, `GET .../runs`, and the `canViewInvoices` pair) answer
 *     403 with nothing added and 200 from `INVOICES_VIEW` up;
 *   - the 5 invoice-shaped writes answer 403 until `CHANGE_SELECTED_EMPLOYEE` is added on top of `INVOICES_VIEW` and
 *     `INVOICES_EDIT`;
 *   - `POST /api/organization-contact` and `PUT .../recover` / `DELETE .../soft` open on **either** half of their
 *     "any of" pair — and `ORG_CONTACT_DELETE` alone does not open the create, `ORG_CONTACT_ADD` alone does not open
 *     the edit or the archive pair;
 *   - `PUT /api/organization-contact/[id]` opens on `ORG_CONTACT_EDIT` only;
 *   - `GET /api/organization/[id]/counts` and `DELETE .../soft` open on `ALL_ORG_EDIT` only: `ALL_ORG_VIEW` is
 *     refused, exactly as `organization-deletion.ts:5` says Gauzy does it;
 *   - `GET /api/export` opens on `EXPORT_ADD` only — `ALL_ORG_VIEW`, which Gauzy itself accepts there
 *     (`app/api/export/route.ts:8-11`, `workspace-data-export.ts:4-8`), is refused here;
 *   - `PUT /api/timer/started-at` opens on `ALLOW_MODIFY_TIME` alone (the `TIME_TRACKER` half this role already
 *     holds), and `ALLOW_MANUAL_TIME` — the third permission of the same util, `timer-start-move.ts:10` — opens nothing;
 *   - `GET /api/organization-contact/pagination` (`app/api/organization-contact/pagination/route.ts:4-6`) names **no**
 *     check and no origin guard: every permission set answers the same 200 and `/api/role-permissions/me` is never
 *     asked for it, not even when armed 500. That is this app's gate only — the caller's token is forwarded, so a real
 *     Gauzy still decides who reads the client list.
 *
 * `refuseWithoutPermission` is documented as "Refuses a write unless …" (`refuse-without-permission.ts:59`), and
 * `GET /api/organization/[id]/counts` (`app/api/organization/[id]/counts/route.ts:8`) uses it on a GET. Measured: the
 * read really is gated (403 with no `ALL_ORG_EDIT`, 200 with it), so the wording understates the helper; the gate
 * itself agrees with the list it names.
 *
 * ## What the mock can and cannot answer here
 *
 * This mock has **no handler** for any of these paths (the only ones it owns near them are
 * `GET /api/role-permissions/me` at `mock-gauzy-server.mjs:618` and the timer *status* / start / stop paths). Every
 * call therefore lands on its fall-through for an unknown path (`:816-818`): a GET answers the default pagination
 * `{"items":[],"total":0}` (`pagination` at `:9`), a write answers the body it was handed (or `{"success":true}` when
 * it got none) and a DELETE answers `{"affected":1,"raw":[]}`. A pass-through proves *which* upstream path, verb,
 * query and body arrived, never real content — and `scenario.fails` (`:1073-1091`, recorded with that status at
 * `:1113-1121`, written as `application/json; charset=utf-8` at `:1140`) is what answers an armed path. Each log entry
 * is `{ method, path, query, startMs, endMs, status }` with `query` re-encoded by `URLSearchParams`
 * (`mock-gauzy-server.mjs:1116`), which is why the bracketed `where[...]` keys of the client-list read are recorded as
 * `where%5B…%5D`. The mock also keeps its own `Origin` allow list (`:17-19`), so a test's synthetic cross-site `Origin`
 * is aimed at the app, never at the mock.
 *
 * `GAUZY_API_SERVER_URL` is the mock base plus `/api` (`core/constants/config/constants.tsx:227`), so every upstream
 * path below is spelled as the mock records it. One route forwards a path that is *not* its own: `PUT
 * /api/timer/started-at` asks `/api/timesheet/timer/started-at` (`app/api/timer/started-at/route.ts:14`), and the log
 * is what shows it.
 */

/** The permission read every gated route asks first (`refuse-without-permission.ts:42-47`). */
const ROLE_READ = '/api/role-permissions/me';

/** The helper's own refusal (`refuse-without-permission.ts:56`). */
const GATE_BODY = { statusCode: 403, message: 'Forbidden resource' };
/** `refuseForeignOrigin`'s refusal (`same-origin-request.ts:48-53`). */
const FOREIGN_BODY = { statusCode: 403, message: 'Cross-site request refused' };
/** The 415 `forwardToGauzy` writes for a body of a media type it will not forward (`forward-to-gauzy.ts:30-31,104,107`). */
const WRONG_MEDIA_TYPE_BODY = { statusCode: 415, message: 'Unsupported Media Type' };
/** The mock's pagination fall-through for an unknown GET (`mock-gauzy-server.mjs:9,818`). */
const EMPTY_PAGE = { items: [], total: 0 };
/** The mock's fall-through for an unknown DELETE (`mock-gauzy-server.mjs:816`). */
const AFFECTED = { affected: 1, raw: [] };

/** The mock's refusal body as bytes (`mock-gauzy-server.mjs:1091`, stringified at `:1140`). */
const refusalBody = (status: number): string =>
	JSON.stringify({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });

/** The media type of every answer that came from the mock (`mock-gauzy-server.mjs:1140`). */
const UPSTREAM_MEDIA_TYPE = 'application/json; charset=utf-8';
/** The media type of every answer this app wrote itself (`NextResponse.json`, no `charset`). */
const OWN_MEDIA_TYPE = 'application/json';

const FOREIGN_ORIGIN = 'https://some-other-site.example';
/** This app's own origin: `refuseForeignOrigin` compares hosts, not the presence of an `Origin` (`same-origin-request.ts:20-31`). */
const OWN_ORIGIN = 'http://localhost:3032';

/**
 * Placeholder ids. No fixture schedule, invoice or client exists in this mock and none is needed: these routes only
 * encode the dynamic segment (`encodeURIComponent`, e.g. `app/api/invoice-schedules/[id]/route.ts:20`) and hand the
 * body on, so the mock's echo of exactly this payload is the witness that this verb reached this upstream with this
 * body. Measured with these exact values; the organization and client ids come from the `ids` fixture.
 */
const PROBE_SCHEDULE_ID = 'lane-b-probe-schedule';
const PROBE_INVOICE_ID = 'lane-b-probe-invoice';

const PROBE_SCHEDULE_BODY = {
	organizationContactId: 'lane-b-probe-client',
	frequency: 'MONTHLY',
	day: 1,
	startDate: '2026-11-01T00:00:00.000Z'
};
const PROBE_LINES = [
	{ id: PROBE_INVOICE_ID, description: 'lane-b probe line', price: 90, quantity: 12, totalValue: 1080 },
	{ id: `${PROBE_INVOICE_ID}-2`, description: 'lane-b probe line two', price: 15, quantity: 4, totalValue: 60 }
];
const PROBE_CLIENT_BODY = {
	name: 'Lane B probe client',
	primaryEmail: 'lane-b-probe@acme.test',
	contactType: 'CLIENT',
	paymentTerms: 14
};
const PROBE_TIMER_BODY = { startedAt: '2026-11-23T08:00:00.000Z', reason: 'lane-b probe move' };

type PermissionSet = { name: string; granted: readonly string[] };

const NO_EXTRA: PermissionSet = { name: 'no extra permission', granted: [] };
const INVOICES_VIEW: PermissionSet = { name: 'INVOICES_VIEW', granted: ['INVOICES_VIEW'] };
const INVOICES_VIEW_EDIT: PermissionSet = {
	name: 'INVOICES_VIEW + INVOICES_EDIT',
	granted: ['INVOICES_VIEW', 'INVOICES_EDIT']
};
const INVOICE_FULL: PermissionSet = {
	name: 'INVOICES_VIEW + INVOICES_EDIT + CHANGE_SELECTED_EMPLOYEE',
	granted: ['INVOICES_VIEW', 'INVOICES_EDIT', 'CHANGE_SELECTED_EMPLOYEE']
};
const INVOICE_SETS: readonly PermissionSet[] = [NO_EXTRA, INVOICES_VIEW, INVOICES_VIEW_EDIT, INVOICE_FULL];

const CONTACT_ADD: PermissionSet = { name: 'ORG_CONTACT_ADD', granted: ['ORG_CONTACT_ADD'] };
const CONTACT_EDIT: PermissionSet = { name: 'ORG_CONTACT_EDIT', granted: ['ORG_CONTACT_EDIT'] };
const CONTACT_DELETE: PermissionSet = { name: 'ORG_CONTACT_DELETE', granted: ['ORG_CONTACT_DELETE'] };
/** The two orders the "any of" lists are measured in: which listed permission opens the gate, on its own. */
const CREATE_SETS: readonly PermissionSet[] = [NO_EXTRA, CONTACT_ADD, CONTACT_EDIT, CONTACT_DELETE];
const ARCHIVE_SETS: readonly PermissionSet[] = [NO_EXTRA, CONTACT_DELETE, CONTACT_EDIT, CONTACT_ADD];
const EDIT_SETS: readonly PermissionSet[] = [NO_EXTRA, CONTACT_ADD, CONTACT_EDIT];

const ORG_VIEW: PermissionSet = { name: 'ALL_ORG_VIEW', granted: ['ALL_ORG_VIEW'] };
const ORG_EDIT: PermissionSet = { name: 'ALL_ORG_EDIT', granted: ['ALL_ORG_EDIT'] };
const ORG_SETS: readonly PermissionSet[] = [NO_EXTRA, ORG_VIEW, ORG_EDIT];

const EXPORT_ADD: PermissionSet = { name: 'EXPORT_ADD', granted: ['EXPORT_ADD'] };
const EXPORT_SETS: readonly PermissionSet[] = [NO_EXTRA, EXPORT_ADD, ORG_VIEW, ORG_EDIT];

const MODIFY_TIME: PermissionSet = { name: 'ALLOW_MODIFY_TIME', granted: ['ALLOW_MODIFY_TIME'] };
const MANUAL_TIME: PermissionSet = { name: 'ALLOW_MANUAL_TIME', granted: ['ALLOW_MANUAL_TIME'] };
const BOTH_TIME: PermissionSet = {
	name: 'ALLOW_MODIFY_TIME + ALLOW_MANUAL_TIME',
	granted: ['ALLOW_MODIFY_TIME', 'ALLOW_MANUAL_TIME']
};
const TIMER_SETS: readonly PermissionSet[] = [NO_EXTRA, MODIFY_TIME, MANUAL_TIME, BOTH_TIME];

const CLIENT_VIEW: PermissionSet = { name: 'ORG_CONTACT_VIEW', granted: ['ORG_CONTACT_VIEW'] };

type GateRoute = {
	/** The route as it is written on disk, dynamic segments in brackets: the stable name of the row. */
	pattern: string;
	/** The app route, as the caller spells it, with the query this case sends. */
	app: (ids: Record<string, string>) => string;
	/** The verb the route file exports; only such a verb reaches this app's handler at all. */
	method: string;
	/** `file:line` of that export, so a failure names the line that owns the gate and the upstream. */
	routeLine: string;
	/** The check that route names, and where that check is defined. */
	check: string;
	checkLine: string;
	/** Whether the route asks for permissions at all. */
	gated: boolean;
	/** The path `forwardToGauzy` is called with, spelled as the mock records it (`/api` from GAUZY_API_SERVER_URL). */
	up: (ids: Record<string, string>) => string;
	/** The query string the mock records for that call (`''` when the route was called without one). */
	query: (ids: Record<string, string>) => string;
	/** The JSON body sent with a write; `undefined` keeps the write bodiless, as this client sends its DELETEs. */
	body?: unknown;
	/** The permission sets this row is measured over, and the status each one answered, in that order. */
	sets: readonly PermissionSet[];
	answers: readonly number[];
	/** The set the "past the gate" cases arm for this row. */
	open: readonly string[];
	/**
	 * Whether the route's own answer carries the upstream's `Cache-Control: no-store`, which the mock marks every
	 * answer with (`mock-gauzy-server.mjs:1015`, written at `:1140`).
	 * Only `forwardDownloadToGauzy` copies it (`forward-download-to-gauzy.ts:10-16,70-74`); `forwardToGauzy`'s
	 * `answerHeaders` writes Cache-Control only for a route that passed `{ noStore: true }` (`forward-to-gauzy.ts:22-28`),
	 * and none of these routes does. Measured row by row.
	 */
	carriesUpstreamCacheControl: boolean;
	/** The mock's fall-through payload for this path (`mock-gauzy-server.mjs:816-818`), as the object it should parse to. */
	fallback: unknown;
};

const GATED_ROUTES: GateRoute[] = [
	{
		pattern: 'GET /api/export',
		app: () => '/api/export',
		method: 'GET',
		routeLine: 'app/api/export/route.ts:13-18',
		check: 'holdsWorkspaceExportPermission (EXPORT_ADD, stricter than Gauzy’s ALL_ORG_VIEW)',
		checkLine: 'core/lib/utils/workspace-data-export.ts:26-27',
		gated: true,
		up: () => '/api/export',
		query: () => '',
		sets: EXPORT_SETS,
		answers: [403, 200, 403, 403],
		open: EXPORT_ADD.granted,
		carriesUpstreamCacheControl: true,
		fallback: EMPTY_PAGE
	},
	{
		pattern: 'POST /api/invoice-item/bulk/[invoiceId]',
		app: () => `/api/invoice-item/bulk/${PROBE_INVOICE_ID}`,
		method: 'POST',
		routeLine: 'app/api/invoice-item/bulk/[invoiceId]/route.ts:10-18',
		check: 'canCreateInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:33-35',
		gated: true,
		up: () => `/api/invoice-item/bulk/${PROBE_INVOICE_ID}`,
		query: () => '',
		body: PROBE_LINES,
		sets: INVOICE_SETS,
		answers: [403, 403, 403, 200],
		open: INVOICE_FULL.granted,
		carriesUpstreamCacheControl: false,
		fallback: PROBE_LINES
	},
	{
		pattern: 'GET /api/invoice-schedules',
		app: (ids) => `/api/invoice-schedules?organizationId=${ids.organizationA}`,
		method: 'GET',
		routeLine: 'app/api/invoice-schedules/route.ts:7-13',
		check: 'canViewInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:29-31',
		gated: true,
		up: () => '/api/invoice-schedules',
		query: (ids) => `organizationId=${ids.organizationA}`,
		sets: INVOICE_SETS,
		answers: [403, 200, 200, 200],
		open: INVOICE_FULL.granted,
		carriesUpstreamCacheControl: false,
		fallback: EMPTY_PAGE
	},
	{
		pattern: 'POST /api/invoice-schedules',
		app: () => '/api/invoice-schedules',
		method: 'POST',
		routeLine: 'app/api/invoice-schedules/route.ts:20-27',
		check: 'canCreateInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:33-35',
		gated: true,
		up: () => '/api/invoice-schedules',
		query: () => '',
		body: PROBE_SCHEDULE_BODY,
		sets: INVOICE_SETS,
		answers: [403, 403, 403, 200],
		open: INVOICE_FULL.granted,
		carriesUpstreamCacheControl: false,
		fallback: PROBE_SCHEDULE_BODY
	},
	{
		pattern: 'PUT /api/invoice-schedules/[id]',
		app: () => `/api/invoice-schedules/${PROBE_SCHEDULE_ID}`,
		method: 'PUT',
		routeLine: 'app/api/invoice-schedules/[id]/route.ts:23 (forwardScheduleChange, :11-21)',
		check: 'canCreateInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:33-35',
		gated: true,
		up: () => `/api/invoice-schedules/${PROBE_SCHEDULE_ID}`,
		query: () => '',
		body: { paused: true, frequency: 'MONTHLY' },
		sets: INVOICE_SETS,
		answers: [403, 403, 403, 200],
		open: INVOICE_FULL.granted,
		carriesUpstreamCacheControl: false,
		fallback: { paused: true, frequency: 'MONTHLY' }
	},
	{
		pattern: 'DELETE /api/invoice-schedules/[id]',
		app: (ids) => `/api/invoice-schedules/${PROBE_SCHEDULE_ID}?organizationId=${ids.organizationA}`,
		method: 'DELETE',
		routeLine: 'app/api/invoice-schedules/[id]/route.ts:24 (forwardScheduleChange, :11-21)',
		check: 'canCreateInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:33-35',
		gated: true,
		up: () => `/api/invoice-schedules/${PROBE_SCHEDULE_ID}`,
		query: (ids) => `organizationId=${ids.organizationA}`,
		sets: INVOICE_SETS,
		answers: [403, 403, 403, 200],
		open: INVOICE_FULL.granted,
		carriesUpstreamCacheControl: false,
		fallback: AFFECTED
	},
	{
		pattern: 'GET /api/invoice-schedules/[id]/runs',
		app: (ids) => `/api/invoice-schedules/${PROBE_SCHEDULE_ID}/runs?organizationId=${ids.organizationA}&take=5`,
		method: 'GET',
		routeLine: 'app/api/invoice-schedules/[id]/runs/route.ts:6-12',
		check: 'canViewInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:29-31',
		gated: true,
		up: () => `/api/invoice-schedules/${PROBE_SCHEDULE_ID}/runs`,
		query: (ids) => `organizationId=${ids.organizationA}&take=5`,
		sets: INVOICE_SETS,
		answers: [403, 200, 200, 200],
		open: INVOICE_FULL.granted,
		carriesUpstreamCacheControl: false,
		fallback: EMPTY_PAGE
	},
	{
		pattern: 'POST /api/organization-contact',
		app: () => '/api/organization-contact',
		method: 'POST',
		routeLine: 'app/api/organization-contact/route.ts:6-11',
		check: 'any of CLIENT_CREATE_PERMISSIONS',
		checkLine: 'core/lib/utils/clients.ts:7 with holdsAnyPermission at :41-43',
		gated: true,
		up: () => '/api/organization-contact',
		query: () => '',
		body: PROBE_CLIENT_BODY,
		sets: CREATE_SETS,
		answers: [403, 200, 200, 403],
		open: CONTACT_ADD.granted,
		carriesUpstreamCacheControl: false,
		fallback: PROBE_CLIENT_BODY
	},
	{
		pattern: 'PUT /api/organization-contact/[id]',
		app: (ids) => `/api/organization-contact/${ids.teammateEmployee}`,
		method: 'PUT',
		routeLine: 'app/api/organization-contact/[id]/route.ts:6-14',
		check: 'any of CLIENT_EDIT_PERMISSIONS (one name only)',
		checkLine: 'core/lib/utils/clients.ts:8 with holdsAnyPermission at :41-43',
		gated: true,
		up: (ids) => `/api/organization-contact/${ids.teammateEmployee}`,
		query: () => '',
		body: { name: 'Lane B probe client renamed' },
		sets: EDIT_SETS,
		answers: [403, 403, 200],
		open: CONTACT_EDIT.granted,
		carriesUpstreamCacheControl: false,
		fallback: { name: 'Lane B probe client renamed' }
	},
	{
		pattern: 'PUT /api/organization-contact/[id]/recover',
		app: (ids) =>
			`/api/organization-contact/${ids.teammateEmployee}/recover?organizationId=${ids.organizationA}&tenantId=${ids.tenantA}`,
		method: 'PUT',
		routeLine: 'app/api/organization-contact/[id]/recover/route.ts:6-14',
		check: 'any of CLIENT_ARCHIVE_PERMISSIONS',
		checkLine: 'core/lib/utils/clients.ts:9 with holdsAnyPermission at :41-43',
		gated: true,
		up: (ids) => `/api/organization-contact/${ids.teammateEmployee}/recover`,
		query: (ids) => `organizationId=${ids.organizationA}&tenantId=${ids.tenantA}`,
		body: {},
		sets: ARCHIVE_SETS,
		answers: [403, 200, 200, 403],
		open: CONTACT_DELETE.granted,
		carriesUpstreamCacheControl: false,
		fallback: {}
	},
	{
		pattern: 'DELETE /api/organization-contact/[id]/soft',
		app: (ids) =>
			`/api/organization-contact/${ids.teammateEmployee}/soft?organizationId=${ids.organizationA}&tenantId=${ids.tenantA}`,
		method: 'DELETE',
		routeLine: 'app/api/organization-contact/[id]/soft/route.ts:6-14',
		check: 'any of CLIENT_ARCHIVE_PERMISSIONS',
		checkLine: 'core/lib/utils/clients.ts:9 with holdsAnyPermission at :41-43',
		gated: true,
		up: (ids) => `/api/organization-contact/${ids.teammateEmployee}/soft`,
		query: (ids) => `organizationId=${ids.organizationA}&tenantId=${ids.tenantA}`,
		sets: ARCHIVE_SETS,
		answers: [403, 200, 200, 403],
		open: CONTACT_EDIT.granted,
		carriesUpstreamCacheControl: false,
		fallback: AFFECTED
	},
	{
		pattern: 'GET /api/organization/[id]/counts',
		app: (ids) => `/api/organization/${ids.organizationA}/counts`,
		method: 'GET',
		routeLine: 'app/api/organization/[id]/counts/route.ts:6-14',
		check: 'any of ORGANIZATION_DELETE_PERMISSIONS (ALL_ORG_EDIT only, and on a GET)',
		checkLine: 'core/lib/utils/organization-deletion.ts:5-9',
		gated: true,
		up: (ids) => `/api/organization/${ids.organizationA}/counts`,
		query: () => '',
		sets: ORG_SETS,
		answers: [403, 403, 200],
		open: ORG_EDIT.granted,
		carriesUpstreamCacheControl: false,
		fallback: EMPTY_PAGE
	},
	{
		pattern: 'DELETE /api/organization/[id]/soft',
		app: (ids) => `/api/organization/${ids.organizationA}/soft`,
		method: 'DELETE',
		routeLine: 'app/api/organization/[id]/soft/route.ts:11-21',
		check: 'any of ORGANIZATION_DELETE_PERMISSIONS (ALL_ORG_EDIT only)',
		checkLine: 'core/lib/utils/organization-deletion.ts:5-9',
		gated: true,
		up: (ids) => `/api/organization/${ids.organizationA}/soft`,
		query: () => '',
		sets: ORG_SETS,
		answers: [403, 403, 200],
		open: ORG_EDIT.granted,
		carriesUpstreamCacheControl: false,
		fallback: AFFECTED
	},
	{
		pattern: 'PUT /api/timer/started-at',
		app: () => '/api/timer/started-at',
		method: 'PUT',
		routeLine: 'app/api/timer/started-at/route.ts:9-14',
		check: 'holdsTimerStartMovePermissions (TIME_TRACKER and ALLOW_MODIFY_TIME)',
		checkLine: 'core/lib/utils/timer/timer-start-move.ts:168-172',
		gated: true,
		// The one route of this family whose upstream path is not its own app path.
		up: () => '/api/timesheet/timer/started-at',
		query: () => '',
		body: PROBE_TIMER_BODY,
		sets: TIMER_SETS,
		answers: [403, 200, 403, 200],
		open: MODIFY_TIME.granted,
		carriesUpstreamCacheControl: false,
		fallback: PROBE_TIMER_BODY
	}
];

/**
 * The family's ungated sibling read, pinned the way `invoice-gates.spec.ts` pins its `UNGATED_ROUTES`: a route with no
 * gate must not be mistaken for a gate that is merely loose. The permission sets change nothing and the permission read
 * is never asked for it, while all four client writes of the same folder are gated.
 */
const UNGATED_ROUTES: GateRoute[] = [
	{
		pattern: 'GET /api/organization-contact/pagination',
		app: (ids) =>
			`/api/organization-contact/pagination?where%5BorganizationId%5D=${ids.organizationA}&where%5BtenantId%5D=${ids.tenantA}&where%5BcontactType%5D=CLIENT&order%5Bname%5D=ASC&take=25&skip=0`,
		method: 'GET',
		routeLine: 'app/api/organization-contact/pagination/route.ts:4-6',
		check: 'none (forwardToGauzy only, no permission and no origin check)',
		checkLine: 'app/api/organization-contact/pagination/route.ts:5',
		gated: false,
		up: () => '/api/organization-contact/pagination',
		query: (ids) =>
			`where%5BorganizationId%5D=${ids.organizationA}&where%5BtenantId%5D=${ids.tenantA}&where%5BcontactType%5D=CLIENT&order%5Bname%5D=ASC&take=25&skip=0`,
		sets: [NO_EXTRA, CLIENT_VIEW],
		answers: [200, 200],
		open: [],
		carriesUpstreamCacheControl: false,
		fallback: EMPTY_PAGE
	}
];

const ROUTES: GateRoute[] = [...GATED_ROUTES, ...UNGATED_ROUTES];
/** The write verbs of the gated routes: the ones `refuseForeignWrite` and `refuseForeignOrigin` can refuse. */
const GATED_WRITE_ROUTES = GATED_ROUTES.filter((route) => route.method !== 'GET');

/** A row the table no longer holds must fail as a missing row, not as `undefined` inside a call. */
function row(pattern: string): GateRoute {
	const found = ROUTES.find((route) => route.pattern === pattern);
	if (!found) throw new Error(`this file's table no longer holds the row ${pattern}`);
	return found;
}

const label = (route: GateRoute, ids: Record<string, string>): string => `${route.method} ${route.app(ids)}`;
const gateLabel = (route: GateRoute): string => (route.gated ? route.check : 'no permission check');
const callOptions = (route: GateRoute): { method: string; body?: unknown } => ({
	method: route.method,
	...(route.body === undefined ? {} : { body: route.body })
});

/** The upstream call the route under test is expected to make, as the mock's log spells it. */
const upstreamTriple = (route: GateRoute, ids: Record<string, string>, status: number): string =>
	`${route.method} ${route.up(ids)} ${status}`;

/** Keeps a synthetic token out of the run log: this lane mints unsigned fixture JWTs, and they stay unseen all the same. */
const redact = (text: string): string => text.replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]');

/** Headers a route (or this app's transport) wrote, in one sorted string, with Next's own framing left out. */
const FRAMING_HEADERS = [
	'connection',
	'date',
	'keep-alive',
	'vary',
	'content-encoding',
	'transfer-encoding',
	'content-length'
];

const carriedHeaders = (response: APIResponse): Record<string, string> =>
	Object.fromEntries(
		Object.entries(response.headers())
			.filter(([name]) => !FRAMING_HEADERS.includes(name))
			.sort()
	);

/** Prints one measured answer, so the run log carries the numbers the assertions below are pinned on. */
function measure(labelText: string, response: APIResponse, text: string, log: string[]): string {
	const carried = Object.entries(carriedHeaders(response))
		.map(([name, value]) => `${name}=${JSON.stringify(value)}`)
		.join(' ');
	const all = Object.entries(response.headers())
		.sort(([first], [second]) => first.localeCompare(second))
		.map(([name, value]) => `${name}=${JSON.stringify(value)}`)
		.join(' ');
	const witness =
		`${labelText} -> ${response.status()} | body(${text.length}B)=${JSON.stringify(redact(text.slice(0, 110)))} | ` +
		`headers ${carried} | all ${all} | log [${log.join(' , ')}]`;
	console.log(`[lane-b permission-gates] MEASURE ${witness}`);
	return witness;
}

/**
 * The same upstream call, asked of the mock directly: the witness of what the route was handed. Sent with the headers
 * `forwardToGauzy` itself writes (`forward-to-gauzy.ts:114-120`) — the JSON media type, `Accept` and the session's
 * `tenant-id` — so it answers as the app's own call answers.
 */
async function directUpstream(
	route: GateRoute,
	ids: Record<string, string>
): Promise<{ status: number; text: string; cacheControl: string | null }> {
	const url = new URL(`${MOCK_ORIGIN}${route.up(ids)}`);
	url.search = new URL(`http://localhost${route.app(ids)}`).search;
	const response = await fetch(url, {
		method: route.method,
		headers: { 'content-type': 'application/json', accept: 'application/json', 'tenant-id': ids.tenantA },
		body: route.body === undefined ? undefined : JSON.stringify(route.body)
	});
	return {
		status: response.status,
		text: await response.text(),
		cacheControl: response.headers.get('cache-control')
	};
}

test.describe('lane-b · the permission gates let a role through, and only then forward', () => {
	/** A table typo (a set with no answer, or an answer that is neither the refusal nor the forward) would otherwise hide a case. */
	test('the table names one measured status per permission set, for every route', () => {
		const broken = ROUTES.filter(
			(route) =>
				route.answers.length !== route.sets.length ||
				route.answers.some((answer) => answer !== 200 && answer !== 403) ||
				route.sets.some((set) => set.granted.some((permission) => !/^[A-Z][A-Z_]*$/.test(permission)))
		).map((route) => route.pattern);
		expect(
			broken,
			'these rows do not line a permission set up with a measured status, or name a permission the mock would ' +
				'drop (mock-gauzy-server.mjs:54-62 keeps only /^[A-Z][A-Z_]*$/ and not the base five)'
		).toEqual([]);
	});

	/**
	 * The permission matrix: the status, and the mock's own log as the witness of *where* the call stopped. A refused
	 * call leaves exactly one entry — the permission read — and an allowed call adds its own upstream.
	 */
	for (const route of ROUTES) {
		for (const [index, set] of route.sets.entries()) {
			const expected = route.answers[index];
			const passed = expected === 200;

			test(`lane-b · ${route.pattern} (${gateLabel(route)}) with ${set.name} answers ${expected}`, async ({
				api,
				mock,
				ids
			}) => {
				await mock.scenario({ extraPermissions: [...set.granted] });

				const response = await api(route.app(ids), callOptions(route));
				const text = await response.text();
				const log = await mock.requests();
				const witness = measure(`${label(route, ids)} [${set.name}]`, response, text, triples(log));
				const headers = carriedHeaders(response);

				expect(
					response.status(),
					`${label(route, ids)} with ${set.name} no longer answers ${expected} (${route.routeLine} asks ` +
						`${route.check}, ${route.checkLine}): ${witness}`
				).toBe(expected);

				expect(
					triples(log),
					`${label(route, ids)} with ${set.name} did not ask ${
						route.gated
							? passed
								? `${ROLE_READ} and then ${route.up(ids)}`
								: `${ROLE_READ} and nothing else`
							: `only ${route.up(ids)}`
					} (${logOf(log)}): ${witness}`
				).toEqual(
					route.gated
						? passed
							? [`GET ${ROLE_READ} 200`, upstreamTriple(route, ids, 200)]
							: [`GET ${ROLE_READ} 200`]
						: [upstreamTriple(route, ids, expected)]
				);

				if (passed) {
					expect(
						headers['content-type'],
						`the forwarded answer no longer carries the copied upstream media type ${JSON.stringify(
							UPSTREAM_MEDIA_TYPE
						)} (mock-gauzy-server.mjs:1140), it says ${JSON.stringify(headers['content-type'])} — ` +
							'answerHeaders (forward-to-gauzy.ts:22-28) copies Content-Type and nothing else: ' +
							`${witness}`
					).toBe(UPSTREAM_MEDIA_TYPE);
					// Not real content: this mock answers these paths with its fall-through, so what is pinned is which
					// fall-through payload arrived (mock-gauzy-server.mjs:816-818).
					expect(
						parseAnswer(text),
						`the answer behind the gate is no longer this mock's fall-through payload for ${route.up(ids)} ` +
							`(${redact(text).slice(0, 110)}) — mock-gauzy-server.mjs:816-818 is what answers an unknown path, ` +
							`and for a write that fall-through is the body it was handed: ${witness}`
					).toEqual(route.fallback);
					expect(
						headers['cache-control'],
						`the forwarded answer of ${label(route, ids)} now carries Cache-Control=${JSON.stringify(
							headers['cache-control']
						)} where the route copies ${route.carriesUpstreamCacheControl ? "the upstream's own" : 'no Cache-Control'}: ` +
							`${witness} — forward-download-to-gauzy.ts:10-16,70-74 copies it, forward-to-gauzy.ts:22-28 does ` +
							'not write it for a route that passed no { noStore: true }'
					).toBe(route.carriesUpstreamCacheControl ? 'no-store' : undefined);
				} else {
					expect(
						parseAnswer(text),
						`the refusal of ${label(route, ids)} is no longer this helper's own body ${JSON.stringify(
							GATE_BODY
						)} (${redact(text).slice(0, 110)}) — refuse-without-permission.ts:56 is the line that writes it: ` +
							`${witness}`
					).toEqual(GATE_BODY);
					expect(
						headers['content-type'],
						`an answer this helper wrote itself now carries ${JSON.stringify(
							headers['content-type']
						)} instead of ${JSON.stringify(OWN_MEDIA_TYPE)}: ${witness}`
					).toBe(OWN_MEDIA_TYPE);
					// measured, not intended: unlike `refuseForeignOrigin` (same-origin-request.ts:48-53) this 403 names no
					// Cache-Control at all, so a gate refusal of a read is cacheable by default.
					expect(
						headers['cache-control'],
						`the gate refusal of ${label(route, ids)} now names Cache-Control=${JSON.stringify(
							headers['cache-control']
						)}: ${witness} — refuse-without-permission.ts:56 writes no header, only refuseForeignOrigin does`
					).toBeUndefined();
				}

				expect(
					await mock.failures(),
					`the log of ${label(route, ids)} with ${set.name} holds a refused call, although every entry the gate ` +
						`left behind answered 200 (${logOf(log)}): ${witness}`
				).toEqual([]);
			});
		}
	}

	/**
	 * Which half of the invoice check opens which verb. `invoiceAccessOf` (`core/lib/utils/invoice-access.ts:19-27`)
	 * splits it four ways: `canView` = `INVOICES_VIEW` (`:20`) **and** a rate-admin permission (`:21`,
	 * `holdsRateAdminPermission` at `core/lib/utils/rates.ts:258-260`, the list `ORG_EMPLOYEES_EDIT` /
	 * `CHANGE_SELECTED_EMPLOYEE` at `rates.ts:11`); `canWrite` = `INVOICES_EDIT` (`:23`) **and**
	 * `CHANGE_SELECTED_EMPLOYEE` **by name** (`:24`, `EVERYONE_TIME_PERMISSION` at `:8`) — the rate-admin alternative
	 * does not count there; and `canCreate` = both (`:26`). Measured one half at a time
	 * (`E:\Coding\.tmp\s2-probe-granted-4.log`):
	 *
	 *   - `CHANGE_SELECTED_EMPLOYEE` alone answers 403 — the rate-admin half is now satisfied from the added permission
	 *     instead of from the role's own `ORG_EMPLOYEES_EDIT`, and `INVOICES_VIEW` (`:20`) is the half still missing;
	 *   - `INVOICES_VIEW + CHANGE_SELECTED_EMPLOYEE` answers 200 on the read, which shows the rate-admin half really can
	 *     come from an added permission and not only from the base five;
	 *   - the same pair answers 403 on the write: `INVOICES_EDIT` (`:23`) is the half missing there;
	 *   - `INVOICES_EDIT + CHANGE_SELECTED_EMPLOYEE` answers 403 on the write too, because `canCreate` is `canView` and
	 *     `canWrite` together (`:26`) and `INVOICES_VIEW` is missing.
	 */
	for (const arm of [
		{ granted: ['CHANGE_SELECTED_EMPLOYEE'], pattern: 'GET /api/invoice-schedules', status: 403 },
		{ granted: ['INVOICES_VIEW', 'CHANGE_SELECTED_EMPLOYEE'], pattern: 'GET /api/invoice-schedules', status: 200 },
		{ granted: ['INVOICES_VIEW', 'CHANGE_SELECTED_EMPLOYEE'], pattern: 'POST /api/invoice-schedules', status: 403 },
		{ granted: ['INVOICES_EDIT', 'CHANGE_SELECTED_EMPLOYEE'], pattern: 'POST /api/invoice-schedules', status: 403 }
	]) {
		test(`lane-b · ${arm.pattern} with ${arm.granted.join(' + ')} only answers ${arm.status} (core/lib/utils/invoice-access.ts:19-27)`, async ({
			api,
			mock,
			ids
		}) => {
			const route = row(arm.pattern);
			await mock.scenario({ extraPermissions: [...arm.granted] });

			const response = await api(route.app(ids), callOptions(route));
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route, ids)} [${arm.granted.join(' + ')}]`, response, text, triples(log));

			expect(
				response.status(),
				`${label(route, ids)} with ${arm.granted.join(' + ')} does not answer the measured ${arm.status} ` +
					`(s2-probe-granted-4.log): ${witness} — ${route.routeLine} asks ${route.check}, defined at ${route.checkLine}`
			).toBe(arm.status);
			expect(
				triples(log),
				`${label(route, ids)} with ${arm.granted.join(' + ')} did not ask ${
					arm.status === 200 ? `${ROLE_READ} and then ${route.up(ids)}` : `${ROLE_READ} and nothing else`
				} (${logOf(log)}): ${witness}`
			).toEqual(
				arm.status === 200
					? [`GET ${ROLE_READ} 200`, upstreamTriple(route, ids, 200)]
					: [`GET ${ROLE_READ} 200`]
			);
			expect(
				parseAnswer(text),
				arm.status === 200
					? `the answer behind this gate is not the mock's fall-through for ${route.up(ids)} (${redact(
							text.slice(0, 110)
						)}): ${witness}`
					: `the refusal is not ${JSON.stringify(GATE_BODY)} (${redact(text.slice(0, 110))}) — ` +
							`refuse-without-permission.ts:56 writes it: ${witness}`
			).toEqual(arm.status === 200 ? route.fallback : GATE_BODY);
		});
	}

	/**
	 * Past the gate: the app's answer is its upstream's answer byte for byte, on the path, verb and query the route
	 * fixed — never on anything the caller supplied. The direct probe is asked after the log was read, so the log holds
	 * the app's own call and nothing else.
	 */
	for (const route of ROUTES) {
		test(`lane-b · past its gate: ${route.pattern} hands on its upstream's control answer, byte for byte, on the path the route fixed`, async ({
			api,
			mock,
			ids
		}) => {
			await mock.scenario({ extraPermissions: [...route.open] });

			const response = await api(route.app(ids), callOptions(route));
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`control ${label(route, ids)}`, response, text, triples(log));
			const headers = carriedHeaders(response);
			// Asked after the log was read, so the log above holds the app's own call and nothing else.
			const upstream = await directUpstream(route, ids);
			const entry = log.find((request) => request.path === route.up(ids));

			expect(
				response.status(),
				`${label(route, ids)} past its gate no longer answers 200 (${route.routeLine} forwards once ${
					route.check
				} passes): ${witness}`
			).toBe(200);
			expect(
				triples(log),
				`${label(route, ids)} did not ask exactly ${route.up(ids)}${
					route.gated ? `, after one read of ${ROLE_READ}` : ', and never read any permission'
				} (${logOf(log)}): ${witness}`
			).toEqual(
				route.gated
					? [`GET ${ROLE_READ} 200`, upstreamTriple(route, ids, 200)]
					: [upstreamTriple(route, ids, 200)]
			);
			expect(
				entry?.query,
				`the query this route handed on changed shape: sent ${JSON.stringify(
					new URL(`http://localhost${route.app(ids)}`).search.slice(1)
				)}, recorded ${JSON.stringify(entry?.query)} — forward-to-gauzy.ts:112 appends new URL(req.url).search to ` +
					`the path the route fixed, and mock-gauzy-server.mjs:1116 records it via URLSearchParams: ${witness}`
			).toBe(route.query(ids));
			expect(
				text,
				`the answer is no longer the upstream's own byte for byte: app ${JSON.stringify(
					redact(text.slice(0, 110))
				)} vs mock ${JSON.stringify(redact(upstream.text.slice(0, 110)))} — mock-gauzy-server.mjs:816-818 answers ` +
					`these paths with its fall-through, and for a write that fall-through is the body it was handed: ` +
					`${witness}`
			).toBe(upstream.text);
			expect(
				upstream.status,
				`the direct probe of ${route.up(ids)} answered ${upstream.status} instead of 200, so the comparison above ` +
					`lost its subject: ${witness}`
			).toBe(200);
			expect(
				headers['content-type'],
				`the copied media type moved off ${JSON.stringify(UPSTREAM_MEDIA_TYPE)}: ${JSON.stringify(
					headers['content-type']
				)} — ${witness}`
			).toBe(UPSTREAM_MEDIA_TYPE);
			// The upstream marks its own answer no-store on the very same path ...
			expect(
				upstream.cacheControl,
				`the mock no longer marks its own answer no-store (${JSON.stringify(
					upstream.cacheControl
				)}) — mock-gauzy-server.mjs:1015,1140 mark every answer the mock writes no-store, so this comparison lost ` +
					`its subject: ` +
					`${witness}`
			).toBe('no-store');
			// ... and only the download route passes it on.
			expect(
				headers['cache-control'],
				`the upstream's own Cache-Control=${JSON.stringify(upstream.cacheControl)} reached the caller as ${JSON.stringify(
					headers['cache-control']
				)} on a route that copies ${route.carriesUpstreamCacheControl ? "the upstream's Cache-Control" : 'none'}: ` +
					`${witness} — forward-download-to-gauzy.ts:10-16,70-74 versus forward-to-gauzy.ts:22-28`
			).toBe(route.carriesUpstreamCacheControl ? 'no-store' : undefined);
			// measured: no Content-Disposition anywhere, because this mock sends none — the filename half of
			// forward-download-to-gauzy.ts:10-16 is unreachable while the mock owns no handler for these paths.
			expect(
				headers['content-disposition'],
				`${label(route, ids)} now names Content-Disposition=${JSON.stringify(
					headers['content-disposition']
				)}, which would mean this mock gained a handler for ${route.up(ids)} and the "no file here" limit of this ` +
					`file is no longer true: ${witness}`
			).toBeUndefined();
		});
	}

	/**
	 * An upstream refusal past the gate: the status and the body ride through unchanged (`forward-to-gauzy.ts:128-131`
	 * hands the upstream status and body on), and the mock records the call with the armed status, which is what
	 * `mock.failures()` counts. An upstream 403 is told apart from this helper's 403 by its body.
	 */
	for (const route of GATED_ROUTES) {
		for (const status of [403, 404, 500]) {
			test(`lane-b · ${route.pattern} past its gate, upstream armed ${status}: status and body ride through unchanged`, async ({
				api,
				mock,
				ids
			}) => {
				await mock.scenario({ extraPermissions: [...route.open], fails: { [route.up(ids)]: status } });

				const response = await api(route.app(ids), callOptions(route));
				const text = await response.text();
				const log = await mock.requests();
				const witness = measure(`${label(route, ids)} armed ${status}`, response, text, triples(log));
				const headers = carriedHeaders(response);
				const entry = log.find((request) => request.path === route.up(ids));

				expect(
					response.status(),
					`an upstream ${status} on ${route.up(ids)} no longer reaches the caller as ${status}: the app answered ` +
						`${response.status()} — ${witness} — forward-to-gauzy.ts:128-131 hands the upstream status on, so a ` +
						'different number here is this route remapping it'
				).toBe(status);
				expect(
					text,
					`the refusal body is no longer the upstream body byte for byte: app ${JSON.stringify(
						redact(text.slice(0, 110))
					)} vs the shape ${JSON.stringify(refusalBody(status))} (mock-gauzy-server.mjs:1091): ${witness} — a ${JSON.stringify(
						GATE_BODY
					)} body here would mean the gate, not the upstream, answered`
				).toBe(refusalBody(status));
				expect(
					parseAnswer(text),
					`the body this caller got is not Gauzy's error shape any more (${redact(text).slice(0, 110)}): ` +
						`${witness}`
				).toEqual({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });
				expect(
					headers['content-type'],
					`the copied media type moved off ${JSON.stringify(UPSTREAM_MEDIA_TYPE)} (mock-gauzy-server.mjs:1140): ` +
						`${JSON.stringify(headers['content-type'])} — ${witness}`
				).toBe(UPSTREAM_MEDIA_TYPE);
				expect(
					triples(log),
					`${label(route, ids)} did not ask ${route.up(ids)} exactly once${
						route.gated ? ` after ${ROLE_READ} answered 200` : ', and read no permission on the way'
					} (${logOf(log)}): ${witness}`
				).toEqual([`GET ${ROLE_READ} 200`, upstreamTriple(route, ids, status)]);
				expect(
					entry?.status,
					`the refused call is not recorded with the armed status (${JSON.stringify(entry)}, full log ` +
						`${logOf(log)}): ${witness} — mock-gauzy-server.mjs:1113-1121 records it`
				).toBe(status);
				expect(
					headers['cache-control'],
					`the armed answer of ${label(route, ids)} carries Cache-Control=${JSON.stringify(
						headers['cache-control']
					)} where the route copies ${route.carriesUpstreamCacheControl ? "the upstream's own" : 'none'}: ` +
						`${witness}`
				).toBe(route.carriesUpstreamCacheControl ? 'no-store' : undefined);
				expect(
					await mock.failures(),
					`an upstream refusal of ${label(route, ids)} is missing from the failures view (${logOf(log)}): ` +
						`${witness}`
				).toHaveLength(1);
			});
		}
	}

	/**
	 * The gate is asked before anything is forwarded, so a route that refuses never reaches the armed path: an armed
	 * `500` upstream is no answer at all for a role the gate turned away, and the mock records nothing but the
	 * permission read. That is what makes `403 Forbidden resource` tellable apart from an upstream 403.
	 */
	for (const route of GATED_ROUTES) {
		test(`lane-b · ${route.pattern} with no permission refuses at the gate even with its upstream armed 500`, async ({
			api,
			mock,
			ids
		}) => {
			await mock.scenario({ extraPermissions: [], fails: { [route.up(ids)]: 500 } });

			const response = await api(route.app(ids), callOptions(route));
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(
				`${label(route, ids)} gate first, upstream armed 500`,
				response,
				text,
				triples(log)
			);

			expect(
				response.status(),
				`the armed upstream ${label(route, ids)} could not reach, was answered instead of the gate's 403: ` +
					`${witness} — ${route.routeLine} returns the refusal from ${route.check} before forwarding`
			).toBe(403);
			expect(
				parseAnswer(text),
				`the answer is no longer this helper's own refusal ${JSON.stringify(GATE_BODY)} (${redact(
					text.slice(0, 110)
				)}): ${witness} — a "Synthetic Gauzy refusal" body here would mean the gate stopped short-circuiting`
			).toEqual(GATE_BODY);
			expect(
				triples(log),
				`the armed ${route.up(ids)} was asked, or something else was asked on the way (${logOf(log)}): ${witness} ` +
					'— an armed path this route never reached must stay out of the log'
			).toEqual([`GET ${ROLE_READ} 200`]);
			expect(
				await mock.failures(),
				`an upstream that was never asked is counted as a refusal (${logOf(log)}): ${witness}`
			).toEqual([]);
		});
	}

	/**
	 * A cross-site write is refused before the permission is read, whichever way the route asks for the origin: three
	 * of them call `refuseForeignOrigin` themselves (`app/api/invoice-schedules/route.ts:21-22`,
	 * `app/api/invoice-schedules/[id]/route.ts:12-13`, `app/api/organization/[id]/soft/route.ts:12-13`), the rest get it
	 * from inside `refuseUnlessPermitted` (`refuse-without-permission.ts:38-41`). Measured: the same body, the same
	 * `Cache-Control: no-store`, and the same **empty** log — so the two spellings are not tellable from the outside,
	 * and the grant that opens the gate cannot save a write that came from another page.
	 */
	for (const route of GATED_WRITE_ROUTES) {
		test(`lane-b · ${route.pattern} from ${FOREIGN_ORIGIN} is refused before the permission read, with nothing asked`, async ({
			api,
			mock,
			ids
		}) => {
			await mock.scenario({ extraPermissions: [...route.open] });

			const response = await api(route.app(ids), {
				...callOptions(route),
				headers: { origin: FOREIGN_ORIGIN }
			});
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route, ids)} foreign origin`, response, text, triples(log));
			const headers = carriedHeaders(response);

			expect(
				response.status(),
				`a cross-site write of ${label(route, ids)} no longer answers 403: ${witness} — refuseForeignWrite ` +
					'(same-origin-request.ts:43-46), reached either by the route itself or by refuse-without-permission.ts:38'
			).toBe(403);
			expect(
				parseAnswer(text),
				`the cross-site refusal is no longer ${JSON.stringify(
					FOREIGN_BODY
				)} (${redact(text.slice(0, 110))}) — that body names the reason, and a "Forbidden resource" body would ` +
					`mean the permission read ran first: ${witness}`
			).toEqual(FOREIGN_BODY);
			expect(
				headers['cache-control'],
				`the cross-site refusal lost its Cache-Control=${JSON.stringify(
					headers['cache-control']
				)} (same-origin-request.ts:48-53 writes no-store, the gate's own 403 does not): ${witness}`
			).toBe('no-store');
			expect(
				triples(log),
				`a cross-site write of ${label(route, ids)} left a call in the test backend's log (${logOf(log)}): ` +
					`${witness} — the point of asking refuseForeignWrite first is that nothing is read with the session's ` +
					'cookies, not even the permissions'
			).toEqual([]);
			expect(
				await mock.failures(),
				`the refused cross-site write was counted as a test-backend call (${logOf(log)}): ${witness}`
			).toEqual([]);
		});
	}

	test('lane-b · a cross-site write is refused just as hard with no permission, in both gate families', async ({
		api,
		mock,
		ids
	}) => {
		const routes = [
			row('POST /api/invoice-item/bulk/[invoiceId]'),
			row('POST /api/invoice-schedules'),
			row('POST /api/organization-contact'),
			row('PUT /api/timer/started-at')
		];
		await mock.scenario({ extraPermissions: [] });

		for (const route of routes) {
			const response = await api(route.app(ids), { ...callOptions(route), headers: { origin: FOREIGN_ORIGIN } });
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route, ids)} foreign origin, no permission`, response, text, triples(log));

			expect(
				response.status(),
				`a cross-site write with no permission answered ${response.status()} instead of 403: ${witness}`
			).toBe(403);
			expect(
				parseAnswer(text),
				`the refusal body is not ${JSON.stringify(FOREIGN_BODY)} (${redact(text.slice(0, 110))}): ${witness}`
			).toEqual(FOREIGN_BODY);
			expect(
				triples(log),
				`the origin check no longer runs before everything else (${logOf(log)}): ${witness}`
			).toEqual([]);
		}
	});

	/**
	 * An `Origin` that names this app is not a cross-site case at all (`same-origin-request.ts:20-31` compares hosts),
	 * and a GET is never a cross-site case for these helpers at all (`:43-46`): a foreign read is gated by permissions
	 * alone, and answers the same permission refusal a local one gets.
	 */
	for (const pattern of ['POST /api/organization-contact', 'DELETE /api/organization/[id]/soft']) {
		test(`lane-b · ${pattern} whose Origin names this app passes the origin check and is gated by permission only`, async ({
			api,
			mock,
			ids
		}) => {
			const route = row(pattern);
			await mock.scenario({ extraPermissions: [...route.open] });

			const response = await api(route.app(ids), { ...callOptions(route), headers: { origin: OWN_ORIGIN } });
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route, ids)} own origin`, response, text, triples(log));

			expect(
				response.status(),
				`a write from ${OWN_ORIGIN} stopped being this app's own request: ${witness} — refuseForeignOrigin ` +
					'compares the Origin host with this host (same-origin-request.ts:20-31)'
			).toBe(200);
			expect(
				triples(log),
				`${label(route, ids)} no longer reads the permissions and then forwards (${logOf(log)}): ${witness}`
			).toEqual([`GET ${ROLE_READ} 200`, upstreamTriple(route, ids, 200)]);
			expect(
				parseAnswer(text),
				`the answer of ${label(route, ids)} moved off the mock's fall-through (${redact(text.slice(0, 110))}): ` +
					`${witness}`
			).toEqual(route.fallback);
		});
	}

	for (const arm of ['no permission', 'permitted']) {
		test(`lane-b · a cross-site GET of /api/organization/[id]/counts is answered by the permission gate alone, with ${arm}`, async ({
			api,
			mock,
			ids
		}) => {
			const route = row('GET /api/organization/[id]/counts');
			await mock.scenario({ extraPermissions: arm === 'permitted' ? [...route.open] : [] });

			const response = await api(route.app(ids), { method: 'GET', headers: { origin: FOREIGN_ORIGIN } });
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route, ids)} foreign origin, ${arm}`, response, text, triples(log));

			// `refuseForeignWrite` short-circuits GET and HEAD (same-origin-request.ts:44), so the origin never answers
			// a read here: what a foreign page gets is the permission answer, 403 or 200, exactly like a local one.
			expect(
				response.status(),
				`a cross-site read with ${arm} no longer answers the permission answer a local read gets (403 or 200): ` +
					`${witness}`
			).toBe(arm === 'permitted' ? 200 : 403);
			expect(
				parseAnswer(text),
				arm === 'permitted'
					? `the permitted foreign read stopped getting its upstream's answer (${redact(text.slice(0, 110))}): ` +
							`${witness}`
					: `the foreign read's refusal is not ${JSON.stringify(GATE_BODY)} (${redact(text.slice(0, 110))}): ` +
							`${witness} — a "Cross-site request refused" body here would mean the origin guard answered a GET`
			).toEqual(arm === 'permitted' ? route.fallback : GATE_BODY);
			expect(
				triples(log),
				`the cross-site read is no longer gated by permissions alone (${logOf(log)}): ${witness}`
			).toEqual(
				arm === 'permitted'
					? [`GET ${ROLE_READ} 200`, upstreamTriple(route, ids, 200)]
					: [`GET ${ROLE_READ} 200`]
			);
		});
	}

	/**
	 * The order inside `forwardToGauzy`, measured at a gated route past its gate: origin check (`:89-90`), then the
	 * permission read (`refuse-without-permission.ts:42-47`), then the media type check (`:102-107`), then the fetch
	 * (`:112`). So a body of a type this proxy will not forward is refused *after* the session's permissions were read,
	 * and a role the gate refuses is refused before its body is ever looked at. A bodiless write with no declared type
	 * is forwarded as it is (`:106-107`), which is how this client sends its archives and DELETEs.
	 */
	for (const pattern of [
		'POST /api/invoice-item/bulk/[invoiceId]',
		'POST /api/invoice-schedules',
		'POST /api/organization-contact',
		'PUT /api/timer/started-at'
	]) {
		const route = row(pattern);

		test(`lane-b · ${pattern} past its gate with a text/plain body: the permission read happened, then 415 here`, async ({
			api,
			mock,
			ids
		}) => {
			await mock.scenario({ extraPermissions: [...route.open] });

			const response = await api(route.app(ids), {
				method: route.method,
				body: JSON.stringify(route.body ?? {}),
				headers: { 'content-type': 'text/plain' }
			});
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route, ids)} text/plain body past the gate`, response, text, triples(log));

			expect(
				response.status(),
				`a write declared as a media type forwardToGauzy will not forward no longer answers 415: ${witness} — ` +
					'forward-to-gauzy.ts:104 refuses a declared type before reading the body'
			).toBe(415);
			expect(
				parseAnswer(text),
				`the 415 is no longer this helper's own body ${JSON.stringify(WRONG_MEDIA_TYPE_BODY)} (${redact(
					text.slice(0, 110)
				)}): ${witness}`
			).toEqual(WRONG_MEDIA_TYPE_BODY);
			expect(
				triples(log),
				`the permission read is no longer the only thing asked on the way to the 415 (${logOf(log)}): ${witness} ` +
					'— the read comes first (refuse-without-permission.ts:42-47), the media type check after it'
			).toEqual([`GET ${ROLE_READ} 200`]);
		});
	}

	test('lane-b · a gated write with a text/plain body and no permission is refused by the gate, not by the media type', async ({
		api,
		mock,
		ids
	}) => {
		const route = row('POST /api/organization-contact');
		await mock.scenario({ extraPermissions: [] });

		const response = await api(route.app(ids), {
			method: 'POST',
			body: JSON.stringify(PROBE_CLIENT_BODY),
			headers: { 'content-type': 'text/plain' }
		});
		const text = await response.text();
		const log = await mock.requests();
		const witness = measure(`${label(route, ids)} text/plain body, no permission`, response, text, triples(log));

		expect(
			response.status(),
			`the gate no longer wins over the media type check: ${witness} — ${route.check} is asked at ${
				route.routeLine
			} before forwardToGauzy is called at all`
		).toBe(403);
		expect(
			parseAnswer(text),
			`the answer is ${JSON.stringify(parseAnswer(text))} instead of ${JSON.stringify(
				GATE_BODY
			)}: ${witness} — a 415 here would mean the body was looked at before the permission was read`
		).toEqual(GATE_BODY);
		expect(triples(log), `the refusal reached the test backend (${logOf(log)}): ${witness}`).toEqual([
			`GET ${ROLE_READ} 200`
		]);
	});

	test('lane-b · a bodiless write past its gate is forwarded as it is, with no media type to check', async ({
		api,
		mock,
		ids
	}) => {
		const route = row('PUT /api/organization-contact/[id]/recover');
		await mock.scenario({ extraPermissions: [...route.open] });

		const response = await api(route.app(ids), { method: 'PUT' });
		const text = await response.text();
		const log = await mock.requests();
		const witness = measure(`${label(route, ids)} bodiless write`, response, text, triples(log));
		const entry = log.find((request) => request.path === route.up(ids));

		expect(
			response.status(),
			`a bodiless PUT past its gate no longer reaches the upstream: ${witness} — forward-to-gauzy.ts:106-107 keeps ` +
				'an empty body as no body, and only a body with no declared type is a 415'
		).toBe(200);
		expect(
			parseAnswer(text),
			`the upstream was answered something other than this mock's {"success":true} for a write it got no body for ` +
				`(${redact(text.slice(0, 110))}) — mock-gauzy-server.mjs:817 is that line: ${witness}`
		).toEqual({ success: true });
		expect(
			triples(log),
			`the bodiless write is no longer one permission read and then one upstream call (${logOf(log)}): ${witness}`
		).toEqual([`GET ${ROLE_READ} 200`, upstreamTriple(route, ids, 200)]);
		expect(
			entry?.query,
			`the bodiless write lost or changed the query this route was called with: recorded ${JSON.stringify(
				entry?.query
			)}: ${witness} — forward-to-gauzy.ts:112 appends the caller's query to the path the route fixed, whether or ` +
				'not the write carries a body'
		).toBe(route.query(ids));
	});

	/**
	 * The permission read itself refused: `refuseUnlessPermitted` hands that answer straight back
	 * (`refuse-without-permission.ts:48-50`, `!answer.ok` → the same Response the read got), so an outage of
	 * `/role-permissions/me` is what the caller sees — the armed status and the armed body, with the copied media type
	 * — and the route's own upstream is never asked. This is how a 403 from a real Gauzy and a 403 from this app are
	 * told apart: the body says which. Pinned on one route per gate family (`refuseUnlessPermitted` with a predicate,
	 * `refuseWithoutPermission` with a list, and the download route that forwards after its gate).
	 */
	for (const pattern of ['GET /api/export', 'POST /api/organization-contact', 'PUT /api/timer/started-at']) {
		const route = row(pattern);

		for (const status of [500, 401]) {
			test(`lane-b · ${pattern} when the permission read answers ${status}: that refusal is the answer, the route's own upstream is never asked`, async ({
				api,
				mock,
				ids
			}) => {
				await mock.scenario({ extraPermissions: [...route.open], fails: { [ROLE_READ]: status } });

				const response = await api(route.app(ids), callOptions(route));
				const text = await response.text();
				const log = await mock.requests();
				const witness = measure(
					`${label(route, ids)} permission read armed ${status}`,
					response,
					text,
					triples(log)
				);
				const headers = carriedHeaders(response);

				expect(
					response.status(),
					`the refusal of the permission read no longer reaches the caller as ${status}: the route answered ` +
						`${response.status()} — ${witness} — refuse-without-permission.ts:48-50 returns the read's own ` +
						'answer'
				).toBe(status);
				expect(
					text,
					`the body is no longer the read's own refusal byte for byte: app ${JSON.stringify(
						redact(text.slice(0, 110))
					)} vs ${JSON.stringify(refusalBody(status))} (mock-gauzy-server.mjs:1091): ${witness} — a ${JSON.stringify(
						GATE_BODY
					)} body here would mean a refused read was read as "no permission"`
				).toBe(refusalBody(status));
				expect(
					headers['content-type'],
					`a copied refusal no longer carries the upstream media type ${JSON.stringify(
						UPSTREAM_MEDIA_TYPE
					)}: ${JSON.stringify(headers['content-type'])} — ${witness}`
				).toBe(UPSTREAM_MEDIA_TYPE);
				expect(
					triples(log),
					`${label(route, ids)} asked ${route.up(ids)} although the permission read failed, or asked something ` +
						`else (${logOf(log)}): ${witness}`
				).toEqual([`GET ${ROLE_READ} ${status}`]);
				expect(
					await mock.failures(),
					`the refused permission read is missing from the failures view (${logOf(log)}): ${witness}`
				).toHaveLength(1);
			});
		}
	}

	/**
	 * The ungated sibling read, pinned as ungated: a permission read it does not make, armed and unarmed, and an Origin
	 * it never looks at. `forwardToGauzy`'s own origin check answers writes only
	 * (`same-origin-request.ts:43-46`), so this route answers the same thing to every caller that has a session.
	 */
	test('lane-b · GET /api/organization-contact/pagination answers normally even with the permission read armed 500: it reads no permission at all', async ({
		api,
		mock,
		ids
	}) => {
		const route = UNGATED_ROUTES[0];
		await mock.scenario({ extraPermissions: [...CLIENT_VIEW.granted], fails: { [ROLE_READ]: 500 } });

		const response = await api(route.app(ids), { method: 'GET' });
		const text = await response.text();
		const log = await mock.requests();
		const witness = measure(`${label(route, ids)} permission read armed 500`, response, text, triples(log));

		expect(
			response.status(),
			`${label(route, ids)} started depending on a permission read it does not make (${route.routeLine}): ` +
				`${witness}`
		).toBe(200);
		expect(
			triples(log),
			`${label(route, ids)} asked ${ROLE_READ}, which ${route.routeLine} never does (${logOf(log)}): ${witness}`
		).toEqual([upstreamTriple(route, ids, 200)]);
		expect(
			parseAnswer(text),
			`the client list's page answer moved (${redact(text.slice(0, 110))}): ${witness}`
		).toEqual(EMPTY_PAGE);
	});

	test('lane-b · GET /api/organization-contact/pagination forwards a cross-site read too: no guard of either kind reads it', async ({
		api,
		mock,
		ids
	}) => {
		const route = UNGATED_ROUTES[0];
		await mock.scenario({ extraPermissions: [...CLIENT_VIEW.granted] });

		const response = await api(route.app(ids), { method: 'GET', headers: { origin: FOREIGN_ORIGIN } });
		const text = await response.text();
		const log = await mock.requests();
		const witness = measure(`${label(route, ids)} foreign origin`, response, text, triples(log));

		expect(
			response.status(),
			`the ungated client read ${label(route, ids)} now refuses a request because of where it came from, which ` +
				`nothing in ${route.routeLine} does (${witness}) — refuseForeignWrite answers writes only ` +
				'(same-origin-request.ts:43-46), and this route calls neither guard'
		).toBe(200);
		expect(
			triples(log),
			`${label(route, ids)} asked ${ROLE_READ}, which ${route.routeLine} never does (${logOf(log)}): ${witness}`
		).toEqual([upstreamTriple(route, ids, 200)]);
		expect(
			parseAnswer(text),
			`the client list's page answer moved (${redact(text.slice(0, 110))}): ${witness}`
		).toEqual(EMPTY_PAGE);
	});
});
