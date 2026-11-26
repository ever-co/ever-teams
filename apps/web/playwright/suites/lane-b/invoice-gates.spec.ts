import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { MOCK_ORIGIN } from '../../test-servers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * Who may get past the invoice routes' permission gate, pinned on lane-b (app 3032, mock 3996) on 2026-11-23; every
 * number below is printed by the `MEASURE` lines of the runs `E:\Coding\.tmp\s2-lane-b-invoice-*.log`, and the same
 * numbers were taken by hand first against the live lane in `E:\Coding\.tmp\s2-probe-invoice-2.log` (routes ×
 * permission sets), `s2-probe-invoice-3.log` (arms, order of calls, anonymous) and `s2-probe-invoice-6.log` (the whole
 * header set of the PDF route).
 *
 * ## The gate, read with `cat -n`
 *
 * Every route under `app/api/invoices` calls `refuseUnlessPermitted(req, <check>)` before it forwards
 * (`core/services/server/refuse-without-permission.ts:34-57`), and that helper, in this order:
 *
 *   - `:38-41` `refuseForeignWrite(req)` first (`core/services/server/same-origin-request.ts:43-46`): a write of another
 *     site is refused with its own `403 {"statusCode":403,"message":"Cross-site request refused"}` and
 *     `Cache-Control: no-store` (`same-origin-request.ts:48-53`), before any permission is read;
 *   - `:42-47` the role's permissions, read through `forwardToGauzy` itself on `/role-permissions/me`;
 *   - `:48-50` a refusal of *that read* is handed straight back as this route's answer;
 *   - `:56` otherwise its own `403 {"statusCode":403,"message":"Forbidden resource"}`.
 *
 * The three checks (`core/lib/utils/invoice-access.ts`, with the rate-admin half at `core/lib/utils/rates.ts:11` and
 * `holdsRateAdminPermission` at `:258-260`):
 *
 *   - `canViewInvoices` (`invoice-access.ts:29-31`) = `INVOICES_VIEW` and one of `ORG_EMPLOYEES_EDIT` /
 *     `CHANGE_SELECTED_EMPLOYEE` (`:20-22`);
 *   - `canEditInvoices` (`:38-42`) = `canViewInvoices` and `INVOICES_EDIT`;
 *   - `canCreateInvoices` (`:33-35`) = `canViewInvoices` and `INVOICES_EDIT` and `CHANGE_SELECTED_EMPLOYEE` (`:23-26`).
 *
 * The lane's fixture role holds TIME_TRACKER, ORG_TASK_ADD, ORG_TASK_EDIT, ORG_INVITE_EDIT and ORG_EMPLOYEES_EDIT
 * (`cypress/support/mock-gauzy-server.mjs:50`), so the rate-admin half is satisfied on every call here and
 * `INVOICES_VIEW` is the half a test has to add. `scenario.extraPermissions` (`mock-gauzy-server.mjs:51-62`,
 * `MockScenario` in `playwright/helpers.ts:107-113`) appends enabled permissions to the role served at
 * `/api/role-permissions/me`, and `scenario.fails` (`mock-gauzy-server.mjs:1075-1086`, recorded with that status at
 * `:1101-1116`, written as `application/json; charset=utf-8` at `:1135`) refuses one path with
 * `{ statusCode, message: 'Synthetic Gauzy refusal (<status>)' }`. Both switches are armed per test: the mock resets
 * before every test (`playwright/api-fixtures.ts:51-64`).
 *
 * ## What 13 route verbs × 4 permission sets measured
 *
 * All 13 verbs answer exactly what the check their own file names says they should — no gate here is looser or stricter
 * than its check, and the one surprise is a route with no gate at all:
 *
 *   - the 4 reads (`GET` pagination / highest / `[id]` / `download/[id]`, all `canViewInvoices`): 403 with no extra
 *     permission, 200 forwarded from `INVOICES_VIEW` up;
 *   - the 3 edit writes (`DELETE /api/invoices/[id]`, `PUT /api/invoices/[id]/action`, `PUT /api/invoices/email/[email]`,
 *     all `canEditInvoices`): 403 with none and with `INVOICES_VIEW` alone, 200 once `INVOICES_EDIT` is added;
 *   - the 3 create writes (`POST /api/invoices`, `PUT /api/invoices/[id]`, `PUT /api/invoices/[id]/with-items`, all
 *     `canCreateInvoices`): 403 until `CHANGE_SELECTED_EMPLOYEE` is added on top of `INVOICES_EDIT`, 200 then;
 *   - `app/api/invoice-payments/connection` (GET and PUT) and `.../rotate-secret` (POST) name **no** permission check:
 *     `refuseForeignOrigin` only (`app/api/invoice-payments/connection/route.ts:11-13`,
 *     `app/api/invoice-payments/connection/rotate-secret/route.ts:10-12`), so all four permission sets answer the same
 *     200 and `/api/role-permissions/me` is never asked for them at all. That is this app's gate only: the caller's own
 *     token is forwarded, so a real Gauzy still decides who reads the connector or rotates its secret, and this mock
 *     (which checks no permission on any path) cannot show what Gauzy answers. The invoice routes gate here because the
 *     API's default member role reads invoices too (`invoice-access.ts:15-18`); whether the payment connector needs the
 *     same stricter gate is the owner's question, not a measured defect.
 *
 * A refused call is pinned by the mock's own log, which also settles the order: for a gated route the log is
 * `GET /api/role-permissions/me 200` first and then the invoice call, or that read alone when the gate refused. A
 * cross-site write leaves the log **empty** — not one entry, so it was refused before the permission read, and the
 * `fails` arm on its invoice path is never touched (`403 Forbidden resource` wins over an armed `404` upstream). With no
 * session cookie at all the answer is this app's own `401 {"statusCode":401,"message":"Unauthorized"}`
 * (`forward-to-gauzy.ts:96`, inside the permission read) and again nothing reaches the test backend.
 *
 * ## What the mock can and cannot answer for an invoice
 *
 * This mock holds no invoice handler: the only invoice-shaped path it owns is
 * `GET /api/invoice-payments/connection` (`mock-gauzy-server.mjs:805-807`). `app/api/invoices/...` therefore lands on its
 * fallback for an unknown path (`mock-gauzy-server.mjs:811-813`): a GET answers the default pagination
 * `{"items":[],"total":0}`, a write answers the body it was handed (or `{"success":true}` when it got none) and a DELETE
 * answers `{"affected":1,"raw":[]}`. So the control answers below prove *which* upstream was asked and *what body*
 * arrived, never invoice contents; and `GET /api/invoices/download/[id]`, whose whole point is a PDF
 * (`app/api/invoices/download/[id]/route.ts:5`), can only ever be measured as JSON here — no PDF bytes and no
 * `Content-Disposition` filename exist, and that limit is stated in its test instead of faked.
 *
 * `GAUZY_API_SERVER_URL` is the mock base plus `/api` (`core/constants/config/constants.tsx:227`), so each upstream path
 * below is spelled the way the mock records it, with the `/api` prefix (`forward-to-gauzy.ts:112` hands on the caller's
 * query string unchanged, which the log's own `query` field then shows).
 */

/** The permission read every gated route asks first (`refuse-without-permission.ts:42-47`). */
const ROLE_READ = '/api/role-permissions/me';

/** This helper's own refusal (`refuse-without-permission.ts:56`). */
const GATE_BODY = { statusCode: 403, message: 'Forbidden resource' };
/** `refuseForeignOrigin`'s refusal (`same-origin-request.ts:48-53`). */
const FOREIGN_BODY = { statusCode: 403, message: 'Cross-site request refused' };
/** The 401 `forwardToGauzy` writes for a caller with no token (`forward-to-gauzy.ts:96`). */
const NO_SESSION_BODY = { statusCode: 401, message: 'Unauthorized' };
/** The 415 `forwardToGauzy` writes for a body of a media type it will not forward (`forward-to-gauzy.ts:30-31,104,107`). */
const WRONG_MEDIA_TYPE_BODY = { statusCode: 415, message: 'Unsupported Media Type' };

/** The mock's refusal body as bytes (`mock-gauzy-server.mjs:1085-1086`, stringified at `:1136`). */
const refusalBody = (status: number): string =>
	JSON.stringify({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });

/** The media type of every answer that came from the mock (`mock-gauzy-server.mjs:1135`). */
const UPSTREAM_MEDIA_TYPE = 'application/json; charset=utf-8';
/** The media type of every answer this app wrote itself (`NextResponse.json`, no `charset`). */
const OWN_MEDIA_TYPE = 'application/json';

const FOREIGN_ORIGIN = 'https://some-other-site.example';

/**
 * Placeholder ids and payloads. No fixture invoice exists in this mock, and it needs none: these routes only encode the
 * dynamic segment (`encodeURIComponent`, e.g. `app/api/invoices/[id]/route.ts:13`) and hand the body on, so the mock's
 * echo of exactly this payload is the witness that this verb reached this upstream with this body. Measured with these
 * exact values.
 */
const PROBE_INVOICE_ID = 'lane-b-probe-invoice';
const PROBE_EMAIL = 'billing@acme.test';
const PROBE_EMAIL_SEGMENT = encodeURIComponent(PROBE_EMAIL);

const READ_QUERY = {
	pagination: 'take=20&skip=0',
	one: 'relations%5B0%5D=invoiceItems'
} as const;

type GateRoute = {
	/** The app route, as the caller spells it, with the query this case sends. */
	app: string;
	/** The verb the route file exports; only such a verb reaches this app's handler at all. */
	method: string;
	/** `file:line` of that export (read with `cat -n`), so a failure names the line that owns the gate and the upstream. */
	routeLine: string;
	/** The check that route names, and where that check is defined. */
	check: string;
	checkLine: string;
	/** Whether the route asks for permissions at all. */
	gated: boolean;
	/** The path `forwardToGauzy` is called with, spelled as the mock records it (`/api` from GAUZY_API_SERVER_URL). */
	up: string;
	/** The query string the mock records for that call (`''` when the route was called without one). */
	query: string;
	/** The JSON body sent with a write; `undefined` keeps the write bodiless, as this client sends its DELETEs. */
	body?: unknown;
	/**
	 * The status measured today for each set of `PERMISSION_SETS`, in that order, and nothing inferred: a row whose
	 * numbers disagree with `check` is a finding this file would have to name.
	 */
	answers: readonly [number, number, number, number];
};

const INVOICE_ROUTES: GateRoute[] = [
	{
		app: `/api/invoices/pagination?${READ_QUERY.pagination}`,
		method: 'GET',
		routeLine: 'app/api/invoices/pagination/route.ts:9-14',
		check: 'canViewInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:29-31',
		gated: true,
		up: '/api/invoices/pagination',
		query: READ_QUERY.pagination,
		answers: [403, 200, 200, 200]
	},
	{
		app: '/api/invoices/highest',
		method: 'GET',
		routeLine: 'app/api/invoices/highest/route.ts:6-11',
		check: 'canViewInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:29-31',
		gated: true,
		up: '/api/invoices/highest',
		query: '',
		answers: [403, 200, 200, 200]
	},
	{
		app: `/api/invoices/${PROBE_INVOICE_ID}?${READ_QUERY.one}`,
		method: 'GET',
		routeLine: 'app/api/invoices/[id]/route.ts:6-15',
		check: 'canViewInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:29-31',
		gated: true,
		up: `/api/invoices/${PROBE_INVOICE_ID}`,
		query: READ_QUERY.one,
		answers: [403, 200, 200, 200]
	},
	{
		app: `/api/invoices/download/${PROBE_INVOICE_ID}`,
		method: 'GET',
		routeLine: 'app/api/invoices/download/[id]/route.ts:6-14',
		check: 'canViewInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:29-31',
		gated: true,
		up: `/api/invoices/download/${PROBE_INVOICE_ID}`,
		query: '',
		answers: [403, 200, 200, 200]
	},
	{
		app: '/api/invoices',
		method: 'POST',
		routeLine: 'app/api/invoices/route.ts:6-11',
		check: 'canCreateInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:33-35',
		gated: true,
		up: '/api/invoices',
		query: '',
		body: {
			id: PROBE_INVOICE_ID,
			invoiceNumber: 42,
			currency: 'USD',
			status: 'DRAFT',
			organizationId: 'lane-b-probe-organization',
			tenantId: 'lane-b-probe-tenant'
		},
		answers: [403, 403, 403, 200]
	},
	{
		app: `/api/invoices/${PROBE_INVOICE_ID}`,
		method: 'PUT',
		routeLine: 'app/api/invoices/[id]/route.ts:21-29',
		check: 'canCreateInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:33-35',
		gated: true,
		up: `/api/invoices/${PROBE_INVOICE_ID}`,
		query: '',
		body: { invoiceNumber: 42, status: 'SENT', totalValue: 1080, currency: 'USD' },
		answers: [403, 403, 403, 200]
	},
	{
		app: `/api/invoices/${PROBE_INVOICE_ID}/with-items`,
		method: 'PUT',
		routeLine: 'app/api/invoices/[id]/with-items/route.ts:11-19',
		check: 'canCreateInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:33-35',
		gated: true,
		up: `/api/invoices/${PROBE_INVOICE_ID}/with-items`,
		query: '',
		body: {
			invoiceNumber: 42,
			status: 'SENT',
			totalValue: 1080,
			invoiceItems: [{ description: 'lane-b probe line', price: 90, quantity: 12, totalValue: 1080 }],
			expectedUpdatedAt: '2026-11-16T10:20:30.456Z'
		},
		answers: [403, 403, 403, 200]
	},
	{
		app: `/api/invoices/${PROBE_INVOICE_ID}`,
		method: 'DELETE',
		routeLine: 'app/api/invoices/[id]/route.ts:32-41',
		check: 'canEditInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:38-42',
		gated: true,
		up: `/api/invoices/${PROBE_INVOICE_ID}`,
		query: '',
		answers: [403, 403, 200, 200]
	},
	{
		app: `/api/invoices/${PROBE_INVOICE_ID}/action`,
		method: 'PUT',
		routeLine: 'app/api/invoices/[id]/action/route.ts:6-14',
		check: 'canEditInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:38-42',
		gated: true,
		up: `/api/invoices/${PROBE_INVOICE_ID}/action`,
		query: '',
		body: { status: 'FULLY_PAID', paid: true, alreadyPaid: 1080, amountDue: 0 },
		answers: [403, 403, 200, 200]
	},
	{
		app: `/api/invoices/email/${PROBE_EMAIL_SEGMENT}`,
		method: 'PUT',
		routeLine: 'app/api/invoices/email/[email]/route.ts:6-16',
		check: 'canEditInvoices',
		checkLine: 'core/lib/utils/invoice-access.ts:38-42',
		gated: true,
		up: `/api/invoices/email/${PROBE_EMAIL_SEGMENT}`,
		query: '',
		body: { params: { invoiceId: PROBE_INVOICE_ID, invoiceNumber: 42, isEstimate: false } },
		answers: [403, 403, 200, 200]
	}
];

/**
 * The payment connector family: no permission check at all, only `refuseForeignOrigin`. Pinned here because a route
 * with no gate must not be mistaken for a gate that is merely loose — the permission sets change nothing, and the
 * permission read is never asked.
 */
const UNGATED_ROUTES: GateRoute[] = [
	{
		app: '/api/invoice-payments/connection',
		method: 'GET',
		routeLine: 'app/api/invoice-payments/connection/route.ts:10-16',
		check: 'none (refuseForeignOrigin only)',
		checkLine: 'app/api/invoice-payments/connection/route.ts:11',
		gated: false,
		up: '/api/invoice-payments/connection',
		query: '',
		answers: [200, 200, 200, 200]
	},
	{
		app: '/api/invoice-payments/connection',
		method: 'PUT',
		routeLine: 'app/api/invoice-payments/connection/route.ts:10-17',
		check: 'none (refuseForeignOrigin only)',
		checkLine: 'app/api/invoice-payments/connection/route.ts:11',
		gated: false,
		up: '/api/invoice-payments/connection',
		query: '',
		body: { isEnabled: true },
		answers: [200, 200, 200, 200]
	},
	{
		app: '/api/invoice-payments/connection/rotate-secret',
		method: 'POST',
		routeLine: 'app/api/invoice-payments/connection/rotate-secret/route.ts:9-12',
		check: 'none (refuseForeignOrigin only)',
		checkLine: 'app/api/invoice-payments/connection/rotate-secret/route.ts:10',
		gated: false,
		up: '/api/invoice-payments/connection/rotate-secret',
		query: '',
		answers: [200, 200, 200, 200]
	}
];

const ROUTES: GateRoute[] = [...INVOICE_ROUTES, ...UNGATED_ROUTES];

/** Every write verb these routes export: the ones `refuseForeignWrite` and `refuseForeignOrigin` can refuse. */
const WRITE_ROUTES = ROUTES.filter((route) => route.method !== 'GET');
/** The routes whose gate is `canCreateInvoices`: the only ones `INVOICES_EDIT` alone does not open. */
const CREATE_ROUTES = INVOICE_ROUTES.filter((route) => route.check === 'canCreateInvoices');

const PERMISSION_SETS = [
	{ name: 'no extra permission', granted: [] as string[] },
	{ name: 'INVOICES_VIEW', granted: ['INVOICES_VIEW'] },
	{ name: 'INVOICES_VIEW + INVOICES_EDIT', granted: ['INVOICES_VIEW', 'INVOICES_EDIT'] },
	{
		name: 'INVOICES_VIEW + INVOICES_EDIT + CHANGE_SELECTED_EMPLOYEE',
		granted: ['INVOICES_VIEW', 'INVOICES_EDIT', 'CHANGE_SELECTED_EMPLOYEE']
	}
] as const;

/** The set every "past the gate" case arms: it opens all 13 verbs (`PERMISSION_SETS[3]`). */
const FULL_SET = PERMISSION_SETS[3].granted;

const label = (route: GateRoute): string => `${route.method} ${route.app}`;
const gateLabel = (route: GateRoute): string => (route.gated ? route.check : 'no permission check');
const callOptions = (route: GateRoute): { method: string; body?: unknown } => ({
	method: route.method,
	...(route.body === undefined ? {} : { body: route.body })
});

/** The upstream call the route under test is expected to make, as the mock's log spells it. */
const upstreamTriple = (route: GateRoute, status: number): string => `${route.method} ${route.up} ${status}`;

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
	console.log(`[lane-b invoice-gates] MEASURE ${witness}`);
	return witness;
}

/**
 * The same upstream call, asked of the mock directly: the witness of what the route was handed. Sent with the headers
 * `forwardToGauzy` itself writes (`forward-to-gauzy.ts:114-120`) — the JSON media type, `Accept` and the session's
 * `tenant-id` — so it answers as the app's own call answers.
 */
async function directUpstream(
	route: GateRoute,
	tenantId: string
): Promise<{ status: number; text: string; cacheControl: string | null }> {
	const response = await fetch(`${MOCK_ORIGIN}${route.up}`, {
		method: route.method,
		headers: { 'content-type': 'application/json', accept: 'application/json', 'tenant-id': tenantId },
		body: route.body === undefined ? undefined : JSON.stringify(route.body)
	});
	return {
		status: response.status,
		text: await response.text(),
		cacheControl: response.headers.get('cache-control')
	};
}

test.describe('lane-b · the invoice routes answer their own permission gate, and only then forward', () => {
	for (const route of ROUTES) {
		for (const [index, set] of PERMISSION_SETS.entries()) {
			const expected = route.answers[index];
			const passed = expected === 200;

			test(`lane-b · ${label(route)} with ${set.name} answers ${expected} (${gateLabel(route)})`, async ({
				api,
				mock
			}) => {
				await mock.scenario({ extraPermissions: [...set.granted] });

				const response = await api(route.app, callOptions(route));
				const text = await response.text();
				const log = await mock.requests();
				const witness = measure(`${label(route)} [${set.name}]`, response, text, triples(log));
				const headers = carriedHeaders(response);

				expect(
					response.status(),
					`${label(route)} with ${set.name} no longer answers ${expected} (${
						route.routeLine
					} asks ${route.check}, ${route.checkLine}): ${witness}`
				).toBe(expected);

				// The order the gate works in, as the test backend recorded it.
				expect(
					triples(log),
					`${label(route)} with ${set.name} did not ask ${
						route.gated
							? `${ROLE_READ}${passed ? ` and then ${route.up}` : ' and nothing else'}`
							: `only ${route.up}`
					} (${logOf(log)}): ${witness}`
				).toEqual(
					route.gated
						? passed
							? [`GET ${ROLE_READ} 200`, upstreamTriple(route, 200)]
							: [`GET ${ROLE_READ} 200`]
						: [upstreamTriple(route, expected)]
				);

				if (passed) {
					expect(
						headers['content-type'],
						`the forwarded answer no longer carries the copied upstream media type ${JSON.stringify(
							UPSTREAM_MEDIA_TYPE
						)} (mock-gauzy-server.mjs:1135), it says ${JSON.stringify(headers['content-type'])}: ${witness} — ` +
							'answerHeaders (forward-to-gauzy.ts:22-28) copies Content-Type and nothing else'
					).toBe(UPSTREAM_MEDIA_TYPE);
					expect(
						parseAnswer(text),
						`the answer behind the gate is not this mock's fallback payload for ${route.up} any more ` +
							`(${redact(text).slice(0, 110)}) — mock-gauzy-server.mjs:811-813 is what answers an invoice path: ${witness}`
					).toBeTruthy();
				} else {
					expect(
						parseAnswer(text),
						`the refusal of ${label(route)} is no longer this helper's own body ${JSON.stringify(
							GATE_BODY
						)} (${redact(text).slice(0, 110)}) — refuse-without-permission.ts:56 is the line that writes it: ${witness}`
					).toEqual(GATE_BODY);
					expect(
						headers['content-type'],
						`an answer this helper wrote itself now carries ${JSON.stringify(
							headers['content-type']
						)} instead of ${JSON.stringify(OWN_MEDIA_TYPE)}: ${witness}`
					).toBe(OWN_MEDIA_TYPE);
					// measured, not intended: unlike `refuseForeignOrigin` (same-origin-request.ts:51) this 403 carries no
					// `Cache-Control` at all, so a gate refusal of an invoice read is cacheable by default.
					expect(
						headers['cache-control'],
						`the gate refusal of ${label(route)} now names Cache-Control=${JSON.stringify(
							headers['cache-control']
						)}: ${witness} — refuse-without-permission.ts:56 writes no header, only refuseForeignOrigin does`
					).toBeUndefined();
				}

				expect(
					await mock.failures(),
					`the log of ${label(route)} with ${set.name} holds a refused call, although every entry the gate left ` +
						`behind answered 200 (${logOf(log)}): ${witness}`
				).toEqual([]);
			});
		}
	}

	for (const route of ROUTES) {
		test(`lane-b · past its gate: ${label(route)} hands on its upstream's control answer, on ${route.up}${
			route.query ? `?${route.query}` : ''
		}`, async ({ api, mock, ids }) => {
			await mock.scenario({ extraPermissions: [...FULL_SET] });

			const response = await api(route.app, callOptions(route));
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`control ${label(route)}`, response, text, triples(log));
			// Asked after the log was read, so the log above holds the app's own call and nothing else.
			const upstream = await directUpstream(route, ids.tenantA);
			const entry = log.find((request) => request.path === route.up);

			expect(
				response.status(),
				`${label(route)} past its gate no longer answers 200 (${route.routeLine} forwards once its gate passes): ` +
					`${witness}`
			).toBe(200);
			expect(
				triples(log),
				`${label(route)} did not ask exactly ${route.up}${
					route.gated ? `, after one read of ${ROLE_READ}` : ', and never read any permission'
				} (${logOf(log)}): ${witness}`
			).toEqual(
				route.gated ? [`GET ${ROLE_READ} 200`, upstreamTriple(route, 200)] : [upstreamTriple(route, 200)]
			);
			expect(
				entry?.query,
				`the query this route handed on changed shape: sent ${JSON.stringify(
					new URL(`http://localhost${route.app}`).search.slice(1)
				)}, recorded ${JSON.stringify(entry?.query)} — forward-to-gauzy.ts:112 appends new URL(req.url).search ` +
					`to the path the route fixed: ${witness}`
			).toBe(route.query);
			expect(
				text,
				`the answer is no longer the upstream's own byte for byte: app ${JSON.stringify(
					redact(text.slice(0, 110))
				)} vs mock ${JSON.stringify(redact(upstream.text.slice(0, 110)))} — mock-gauzy-server.mjs:811-813 answers an ` +
					`invoice path with its fallback, and for a write that fallback is the body it was handed: ${witness}`
			).toBe(upstream.text);
			expect(
				upstream.status,
				`the direct probe of ${route.up} answered ${upstream.status} instead of 200, so the comparison above lost ` +
					`its subject: ${witness}`
			).toBe(200);
		});

		for (const status of [403, 404, 500]) {
			test(`lane-b · ${label(route)} past its gate, upstream armed ${status}: status and body ride through unchanged`, async ({
				api,
				mock
			}) => {
				await mock.scenario({ extraPermissions: [...FULL_SET], fails: { [route.up]: status } });

				const response = await api(route.app, callOptions(route));
				const text = await response.text();
				const log = await mock.requests();
				const witness = measure(`${label(route)} armed ${status}`, response, text, triples(log));
				const headers = carriedHeaders(response);
				const entry = log.find((request) => request.path === route.up);

				expect(
					response.status(),
					`an upstream ${status} on ${route.up} no longer reaches the caller as ${status}: the app answered ` +
						`${response.status()} — ${witness} — forward-to-gauzy.ts:128-131 hands the upstream status on, so a ` +
						'different number here is this route remapping it'
				).toBe(status);
				expect(
					text,
					`the refusal body is no longer the upstream body byte for byte: app ${JSON.stringify(
						redact(text.slice(0, 110))
					)} vs the shape ${JSON.stringify(refusalBody(status))} (mock-gauzy-server.mjs:1085-1086): ${witness}`
				).toBe(refusalBody(status));
				expect(
					parseAnswer(text),
					`the body this caller got is not Gauzy's error shape any more (${redact(text).slice(0, 110)}): ${witness}`
				).toEqual({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });
				expect(
					headers['content-type'],
					`the copied media type moved off ${JSON.stringify(UPSTREAM_MEDIA_TYPE)} (mock-gauzy-server.mjs:1135): ` +
						`${JSON.stringify(headers['content-type'])} — ${witness}`
				).toBe(UPSTREAM_MEDIA_TYPE);
				expect(
					triples(log),
					`${label(route)} did not ask ${route.up} exactly once${
						route.gated ? ` after ${ROLE_READ} answered 200` : ', and read no permission on the way'
					} (${logOf(log)}): ${witness}`
				).toEqual(
					route.gated
						? [`GET ${ROLE_READ} 200`, upstreamTriple(route, status)]
						: [upstreamTriple(route, status)]
				);
				expect(
					entry?.status,
					`the refused call is not recorded with the armed status (${JSON.stringify(entry)}, full log ` +
						`${logOf(log)}): ${witness} — mock-gauzy-server.mjs:1101-1116 records it`
				).toBe(status);
				expect(
					await mock.failures(),
					`an upstream refusal of ${label(route)} is missing from the failures view (${logOf(log)}): ${witness}`
				).toHaveLength(1);
			});
		}
	}

	/**
	 * The gate is asked before anything is forwarded, so a route that refuses never reaches the armed path: an armed
	 * `404` upstream is no answer at all for a role the gate turned away, and the mock records nothing but the
	 * permission read. That is what makes `403 Forbidden resource` (refuse-without-permission.ts:56) tellable apart from
	 * an upstream `403` of the same number.
	 */
	for (const route of CREATE_ROUTES) {
		test(`lane-b · ${label(route)} with INVOICES_VIEW + INVOICES_EDIT refuses at the gate even with its upstream armed 404`, async ({
			api,
			mock
		}) => {
			await mock.scenario({
				extraPermissions: ['INVOICES_VIEW', 'INVOICES_EDIT'],
				fails: { [route.up]: 404 }
			});

			const response = await api(route.app, callOptions(route));
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route)} gate first, upstream armed 404`, response, text, triples(log));

			expect(
				response.status(),
				`the armed upstream ${label(route)} could not reach, was answered instead of the gate's 403: ` +
					`${witness} — ${route.routeLine} returns the refusal from refuseUnlessPermitted before forwarding`
			).toBe(403);
			expect(
				parseAnswer(text),
				`the answer is no longer this helper's own refusal ${JSON.stringify(GATE_BODY)} (${redact(
					text.slice(0, 110)
				)}): ${witness} — a "Synthetic Gauzy refusal" body here would mean the gate stopped short-circuiting`
			).toEqual(GATE_BODY);
			expect(
				triples(log),
				`the armed ${route.up} was asked, or something else was asked on the way (${logOf(log)}): ${witness} — an ` +
					'armed path this route never reached must stay out of the log'
			).toEqual([`GET ${ROLE_READ} 200`]);
			expect(
				await mock.failures(),
				`an upstream that was never asked is counted as a refusal (${logOf(log)}): ${witness}`
			).toEqual([]);
		});
	}

	/**
	 * The order inside `forwardToGauzy`, measured at a gated route: origin check (`:89-90`), then the permission read
	 * (`refuse-without-permission.ts:42-47`), then the media type check (`:102-107`), then the fetch (`:112`). A body of
	 * a type this proxy will not forward is therefore refused *after* the session's permissions were read, and a role
	 * the gate refuses is refused before its body is ever looked at.
	 */
	test('lane-b · POST /api/invoices past its gate with a text/plain body: the permission read happened, then 415 here', async ({
		api,
		mock
	}) => {
		const route = CREATE_ROUTES[0];
		await mock.scenario({ extraPermissions: [...FULL_SET] });

		const response = await api(route.app, {
			method: 'POST',
			body: JSON.stringify({ invoiceNumber: 42 }),
			headers: { 'content-type': 'text/plain' }
		});
		const text = await response.text();
		const log = await mock.requests();
		const witness = measure(`${label(route)} text/plain body past the gate`, response, text, triples(log));

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
			`the permission read is no longer the only thing asked on the way to the 415 (${logOf(log)}): ${witness} — ` +
				'the read comes first (refuse-without-permission.ts:42-47), the media type check after it'
		).toEqual([`GET ${ROLE_READ} 200`]);
	});

	test('lane-b · POST /api/invoices with a text/plain body and no permission is refused by the gate, not by the media type', async ({
		api,
		mock
	}) => {
		const route = CREATE_ROUTES[0];
		await mock.scenario({ extraPermissions: [] });

		const response = await api(route.app, {
			method: 'POST',
			body: JSON.stringify({ invoiceNumber: 42 }),
			headers: { 'content-type': 'text/plain' }
		});
		const text = await response.text();
		const log = await mock.requests();
		const witness = measure(`${label(route)} text/plain body, no permission`, response, text, triples(log));

		expect(
			response.status(),
			`the gate no longer wins over the media type check: ${witness} — canCreateInvoices is asked at ` +
				`${route.routeLine} before forwardToGauzy is called at all`
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

	/**
	 * A write of another site is refused before the permission is read: `refuseUnlessPermitted` asks
	 * `refuseForeignWrite` first (`refuse-without-permission.ts:38-41`), so the test backend records **nothing** for the
	 * whole call — no `/api/role-permissions/me`, no invoice path. The same refusal stands whether the role holds every
	 * invoice permission or none, which is what makes it a check on where the request came from rather than on who sent
	 * it. A read is left alone (`same-origin-request.ts:43-46`): only a method other than GET / HEAD is refused.
	 */
	for (const route of WRITE_ROUTES) {
		test(`lane-b · ${label(route)} from ${FOREIGN_ORIGIN} is refused before the permission read, with nothing asked`, async ({
			api,
			mock
		}) => {
			await mock.scenario({ extraPermissions: [...FULL_SET] });

			const response = await api(route.app, {
				...callOptions(route),
				headers: { origin: FOREIGN_ORIGIN }
			});
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route)} foreign origin`, response, text, triples(log));
			const headers = carriedHeaders(response);

			expect(
				response.status(),
				`a cross-site write of ${label(route)} no longer answers 403: ${witness} — ` +
					'refuseForeignWrite (same-origin-request.ts:43-46) is asked at refuse-without-permission.ts:38'
			).toBe(403);
			expect(
				parseAnswer(text),
				`the cross-site refusal is no longer ${JSON.stringify(FOREIGN_BODY)} (${redact(
					text.slice(0, 110)
				)}) — that body names the reason, and a "Forbidden resource" body would mean the permission read ran first: ` +
					`${witness}`
			).toEqual(FOREIGN_BODY);
			expect(
				headers['cache-control'],
				`the cross-site refusal lost its Cache-Control=${JSON.stringify(
					headers['cache-control']
				)} (same-origin-request.ts:48-53 writes no-store, the gate's own 403 does not): ${witness}`
			).toBe('no-store');
			expect(
				triples(log),
				`a cross-site write of ${label(route)} left a call in the test backend's log (${logOf(
					log
				)}): ${witness} — the whole point of asking refuseForeignWrite first is that nothing is read with the ` +
					"session's cookies"
			).toEqual([]);
			expect(
				await mock.failures(),
				`the refused cross-site write was counted as a test-backend call (${logOf(log)}): ${witness}`
			).toEqual([]);
		});
	}

	test('lane-b · a cross-site write of an invoice route is refused just as hard with no invoice permission at all', async ({
		api,
		mock
	}) => {
		const routes = [CREATE_ROUTES[0], WRITE_ROUTES.find((route) => route.method === 'DELETE')!, UNGATED_ROUTES[1]];
		await mock.scenario({ extraPermissions: [] });

		for (const route of routes) {
			const response = await api(route.app, { ...callOptions(route), headers: { origin: FOREIGN_ORIGIN } });
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route)} foreign origin, no permission`, response, text, triples(log));

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

	test('lane-b · a cross-site GET of an invoice read is no cross-site case at all: its gate is permissions only', async ({
		api,
		mock
	}) => {
		const route = INVOICE_ROUTES[0];
		await mock.scenario({ extraPermissions: [...FULL_SET] });

		const response = await api(route.app, { method: 'GET', headers: { origin: FOREIGN_ORIGIN } });
		const text = await response.text();
		const log = await mock.requests();
		const witness = measure(`${label(route)} foreign origin, read`, response, text, triples(log));

		expect(
			response.status(),
			`a GET from ${FOREIGN_ORIGIN} was refused, or the gate stopped gating it: ${witness} — refuseForeignWrite ` +
				'short-circuits GET and HEAD (same-origin-request.ts:44)'
		).toBe(200);
		expect(
			triples(log),
			`the cross-site read is no longer gated by permissions alone (${logOf(log)}): ${witness}`
		).toEqual([`GET ${ROLE_READ} 200`, upstreamTriple(route, 200)]);
		expect(
			parseAnswer(text),
			`the read of another site's page stopped getting its upstream's answer (${redact(text.slice(0, 110))}): ${witness}`
		).toBeTruthy();
	});

	/**
	 * The PDF route, on both sides of its gate, with every header it answered. `answerHeaders` (forward-to-gauzy.ts:22-28)
	 * copies exactly one header, `Content-Type`, and this route passed no `noStore` (app/api/invoices/download/[id]/route.ts:14
	 * is the bare call), so the app's own answer carries `Content-Type` and nothing else of its own — everything else in
	 * the `all …` column of the MEASURE line is Next's transport framing (`vary`, `content-encoding`, `transfer-encoding`,
	 * `date`, `connection`, `keep-alive`).
	 *
	 * What cannot be measured here, and is not faked: this mock has no handler for `/api/invoices/download/...`
	 * (mock-gauzy-server.mjs:811-813), so the "PDF" is its JSON fallback — no `application/pdf`, no bytes of a document,
	 * no `Content-Disposition` filename. The `Cache-Control: no-store` the mock marks its own answer with is dropped on
	 * the floor, exactly as `answerHeaders` predicts, which is the header a real Gauzy's PDF would also ask for.
	 */
	test('lane-b · GET /api/invoices/download/[id] past its gate: only Content-Type is copied, no Cache-Control, no Content-Disposition, and no PDF', async ({
		api,
		mock,
		ids
	}) => {
		const route = INVOICE_ROUTES[3];
		await mock.scenario({ extraPermissions: [...FULL_SET] });

		const response = await api(route.app, { method: 'GET' });
		const text = await response.text();
		const log = await mock.requests();
		const witness = measure(`GET download past its gate`, response, text, triples(log));
		const all = response.headers();
		const named = Object.keys(carriedHeaders(response)).sort();
		// Asked after the log was read, so the log above holds the app's own call and nothing else.
		const upstream = await directUpstream(route, ids.tenantA);

		expect(
			response.status(),
			`the PDF route no longer answers its upstream's status past its gate: ${witness}`
		).toBe(200);
		expect(
			named,
			`the answer of ${label(route)} now names headers beyond Next's own framing: ${JSON.stringify(
				named
			)} — answerHeaders (forward-to-gauzy.ts:22-28) writes Content-Type, plus Cache-Control only for a route that ` +
				`passed { noStore: true }, which ${route.routeLine} did not: ${witness}`
		).toEqual(['content-type']);
		expect(
			all['content-type'],
			`the copied media type moved off ${JSON.stringify(UPSTREAM_MEDIA_TYPE)}: ${JSON.stringify(
				all['content-type']
			)} — ${witness}`
		).toBe(UPSTREAM_MEDIA_TYPE);
		// The upstream asked for no-store on the very same path ...
		expect(
			upstream.cacheControl,
			`the mock no longer marks its own answer no-store (${JSON.stringify(
				upstream.cacheControl
			)}) — mock-gauzy-server.mjs:1004-1013 writes it on every answer, so this comparison lost its subject: ${witness}`
		).toBe('no-store');
		// ... and the caller never sees it.
		expect(
			all['cache-control'],
			`the upstream's own Cache-Control=${JSON.stringify(
				upstream.cacheControl
			)} reached the caller as ${JSON.stringify(all['cache-control'])} on a route that named no noStore: ${witness}`
		).toBeUndefined();
		// measured, not intended, and stated as a limit rather than simulated: this mock answers the download path with
		// JSON (mock-gauzy-server.mjs:811-813), so no PDF media type and no filename can ever appear here even though a
		// real Gauzy sends both (app/api/invoices/download/[id]/route.ts:5).
		expect(
			all['content-disposition'],
			`the answer names Content-Disposition=${JSON.stringify(
				all['content-disposition']
			)} where none was expected: ${witness} — answerHeaders copies no header but Content-Type, so even a real ` +
				"Gauzy's filename would be dropped here"
		).toBeUndefined();
		expect(
			text.startsWith('%PDF'),
			`the mock answered a PDF for ${route.up}, which would mean it gained an invoice handler and this file's ` +
				`"no PDF here" limit is no longer true: ${witness}`
		).toBe(false);
		expect(
			triples(log),
			`the PDF read is no longer one permission read and then one invoice call (${logOf(log)}): ${witness}`
		).toEqual([`GET ${ROLE_READ} 200`, upstreamTriple(route, 200)]);
	});

	/**
	 * The permission read itself refused: `refuseUnlessPermitted` hands that answer straight back
	 * (`refuse-without-permission.ts:48-50`, `!answer.ok` → the same Response the read got), so an outage of
	 * `/role-permissions/me` is what the caller sees — the armed status and the armed body, with the copied media type —
	 * and the route's own invoice upstream is never asked. This is the case a `403` from a real Gauzy and a `403` from
	 * this app have to be told apart on: the body says which.
	 */
	for (const route of INVOICE_ROUTES) {
		for (const status of [500, 401]) {
			test(`lane-b · ${label(route)} when the permission read answers ${status}: that refusal is the answer, the invoice upstream is never asked`, async ({
				api,
				mock
			}) => {
				await mock.scenario({ extraPermissions: [...FULL_SET], fails: { [ROLE_READ]: status } });

				const response = await api(route.app, callOptions(route));
				const text = await response.text();
				const log = await mock.requests();
				const witness = measure(
					`${label(route)} permission read armed ${status}`,
					response,
					text,
					triples(log)
				);
				const headers = carriedHeaders(response);

				expect(
					response.status(),
					`the refusal of the permission read no longer reaches the caller as ${status}: the route answered ` +
						`${response.status()} — ${witness} — refuse-without-permission.ts:48-50 returns the read's own answer`
				).toBe(status);
				expect(
					text,
					`the body is no longer the read's own refusal byte for byte: app ${JSON.stringify(
						redact(text.slice(0, 110))
					)} vs ${JSON.stringify(refusalBody(status))} (mock-gauzy-server.mjs:1085-1086): ${witness} — a ` +
						`${JSON.stringify(GATE_BODY)} body here would mean a refused read was read as "no permission"`
				).toBe(refusalBody(status));
				expect(
					headers['content-type'],
					`a copied refusal no longer carries the upstream media type ${JSON.stringify(UPSTREAM_MEDIA_TYPE)}: ` +
						`${JSON.stringify(headers['content-type'])} — ${witness}`
				).toBe(UPSTREAM_MEDIA_TYPE);
				expect(
					triples(log),
					`${label(route)} asked its invoice upstream although the permission read failed, or asked something ` +
						`else (${logOf(log)}): ${witness}`
				).toEqual([`GET ${ROLE_READ} ${status}`]);
				expect(
					await mock.failures(),
					`the refused permission read is missing from the failures view (${logOf(log)}): ${witness}`
				).toHaveLength(1);
			});
		}
	}

	for (const route of UNGATED_ROUTES) {
		test(`lane-b · ${label(route)} answers normally even with the permission read armed 500: it reads no permission at all`, async ({
			api,
			mock
		}) => {
			await mock.scenario({ extraPermissions: [...FULL_SET], fails: { [ROLE_READ]: 500 } });

			const response = await api(route.app, callOptions(route));
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route)} permission read armed 500`, response, text, triples(log));

			expect(
				response.status(),
				`${label(route)} started depending on a permission read it does not make (${route.checkLine}): ${witness}`
			).toBe(200);
			expect(
				triples(log),
				`${label(route)} asked ${ROLE_READ}, which ${route.routeLine} never does (${logOf(log)}): ${witness}`
			).toEqual([upstreamTriple(route, 200)]);
			expect(
				parseAnswer(text),
				`the payment connector answer moved (${redact(text.slice(0, 110))}): ${witness}`
			).toBeTruthy();
		});
	}

	/**
	 * No session at all: `refuseUnlessPermitted` reads the permissions through `forwardToGauzy` itself
	 * (`refuse-without-permission.ts:43-47`), and that helper gives up on a caller with no token before it fetches
	 * (`forward-to-gauzy.ts:96`), so the answer is this app's own 401 and the test backend records nothing — not even the
	 * permission read. On this lane a cookie-less request still reaches the route handler; this is what answers it.
	 */
	for (const route of [INVOICE_ROUTES[0], CREATE_ROUTES[0], INVOICE_ROUTES[3]]) {
		test(`lane-b · ${label(route)} with no session answers this app's own 401 and asks nothing at all`, async ({
			api,
			mock
		}) => {
			const response = await api(route.app, { ...callOptions(route), anonymous: true });
			const text = await response.text();
			const log = await mock.requests();
			const witness = measure(`${label(route)} anonymous`, response, text, triples(log));
			const headers = carriedHeaders(response);

			expect(response.status(), `an unauthenticated ${label(route)} no longer answers 401 here: ${witness}`).toBe(
				401
			);
			expect(
				parseAnswer(text),
				`the 401 is no longer this helper's own body ${JSON.stringify(NO_SESSION_BODY)} (${redact(
					text.slice(0, 110)
				)}) — a "Synthetic Gauzy refusal" body here would mean the read at refuse-without-permission.ts:43-47 ` +
					'reached the upstream: ' +
					`${witness}`
			).toEqual(NO_SESSION_BODY);
			expect(
				headers['content-type'],
				`an answer this helper wrote itself now names content-type=${JSON.stringify(
					headers['content-type']
				)}: ${witness}`
			).toBe(OWN_MEDIA_TYPE);
			expect(
				triples(log),
				`the unauthenticated call reached the test backend, or the mock was asked for the permissions of a caller ` +
					`that has none (${logOf(log)}): ${witness}`
			).toEqual([]);
		});
	}
});
