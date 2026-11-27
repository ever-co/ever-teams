import type { APIResponse } from '@playwright/test';

import { expect, test } from '../../api-fixtures';
import { mockReset } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import { logOf, parseAnswer, triples } from '../api/log-helpers';

/**
 * What an upstream refusal looks like at this app's edge, pinned on lane-b (app 3032, mock 3996) on 2026-11-23 in the
 * runs `E:\Coding\.tmp\s2-lane-b-fwdref-*.log`; every number below is printed by the `MEASURE` lines those runs carry,
 * and the same numbers were taken by hand first, route by route, in `E:\Coding\.tmp\probe-fwdref-1.txt` and
 * `probe-fwdref-2.txt`.
 *
 * 216 route files are thin proxies over `core/services/server/forward-to-gauzy.ts` (`grep -rln "forwardToGauzy(" app/api
 * --include=route.ts` answers 216), and until this file the lane could only ask them for a *success*: the mock answered
 * every path it was given. It can now refuse, through `scenario.fails` (`cypress/support/mock-gauzy-server.mjs`, and
 * `MockScenario.fails` in `playwright/helpers.ts`), read at this checkout: the arm is looked up as `<tenant>:<path>`,
 * then `<tenant>`, then `<path>` (`:1069-1071`); only an integer 400..599 arms it (`:1074`); the route handler is then
 * skipped and the body is Gauzy's error shape `{ statusCode, message: 'Synthetic Gauzy refusal (<status>)' }`
 * (`:1078-1079`); the recorded status is that arm (`:1094`); the request-log entry carries it (`:1101-1109`), so
 * `mock.failures()` counts a refusal and never a drop; and the answer is written with
 * `content-type: application/json; charset=utf-8` (`:1128`).
 *
 * What the helper does with such an answer, `forward-to-gauzy.ts` read with `cat -n`:
 *
 *   - `:89-90` `refuseForeignWrite` first (this file sends no `Origin` and no `Sec-Fetch-Site`, so no write here is
 *     refused by it);
 *   - `:96` a caller with no token gets **this app's** `401 {"statusCode":401,"message":"Unauthorized"}` before any
 *     upstream call — so two 401 on one route mean two different things, and the anonymous case below is kept beside an
 *     armed path precisely to show that;
 *   - `:112` the upstream URL is `GAUZY_API_SERVER_URL + path + the caller's query string`, and that constant is the base
 *     plus `/api` (`core/constants/config/constants.tsx:227`), so every path below is spelled the way the mock records
 *     it, with the `/api` prefix;
 *   - `:126` an upstream that gave no answer at all goes to `failedUpstreamAnswer` (`:135-144`): this helper's own 502
 *     JSON (504 for a `TimeoutError`, 499 once the caller left);
 *   - `:128-131` every answer the upstream *did* give is `new NextResponse(upstream.body, { status, headers })` — the
 *     upstream status and the upstream body, with `answerHeaders` (`:22-28`) naming only `Content-Type` plus
 *     `Cache-Control: no-store` when the route passed `{ noStore: true }`.
 *
 * ## What 20 routes × 8 armed statuses measured (160 armed calls)
 *
 * Nothing remaps and nothing rewrites: the app status equals the armed status, the app body is the upstream body byte for
 * byte (`{"statusCode":<status>,"message":"Synthetic Gauzy refusal (<status>)"}`), `content-type` is the copied
 * `application/json; charset=utf-8`, and `cache-control` is `no-store` on exactly the 7 routes that passed
 * `noStore: true`. That is stated as a result rather than assumed: a route that turned an upstream 404 into a 400, or
 * replaced the body with its own message, would have had to show up in this table, and none did.
 *
 * The one behaviour `noStore` alone does not predict is pinned in its own test below. The mock marks **every** answer it
 * writes `Cache-Control: no-store` (`mock-gauzy-server.mjs:1003`, inside the CORS headers written at `:1128`), and a real
 * Gauzy marks its refusals the same way — while `answerHeaders` copies no header but `Content-Type`, so a route without
 * `noStore` hands the caller **no** `Cache-Control` at all although the upstream asked for `no-store`.
 * `forward-to-gauzy.ts:22-28` is the line that decides it; that test compares the app's answer with the same path asked
 * of the mock directly, so the contrast is measured in the same test instead of read off the source.
 *
 * The other contrast the switch makes visible — and the reason a 502 must never be read as a refusal — is that an answer
 * this helper writes itself is not decorated at all. Measured today on a `noStore` route (`GET /api/auth/sessions`): a
 * cut call (`drops`) answers 502 with `content-type: application/json` (no `charset`) and **no** `Cache-Control`, while an
 * armed 503 on the very same path answers 503 with `application/json; charset=utf-8` **and** `no-store`. The 401 at `:96`
 * is the undecorated shape too. (`504` is not reachable from a test: `UPSTREAM_TIMEOUT_MS` is 60 000 ms at `:8`, the same
 * budget `playwright/api-fixtures.ts` gives the client — see the header of `suites/lane-b/download-outage.spec.ts`.)
 *
 * ## Which 20 of the 216, and why the invoice routes are not among them
 *
 * 7 of them passed `{ noStore: true }` (`grep -rn "noStore: true" app/api --include=route.ts` answers 12 lines across 10
 * files, 7 of those 12 are here) and 13 did not; GET × 9, POST × 6, PATCH × 2, DELETE × 2, PUT × 1; the families auth/sessions, embed, inbox,
 * chat, comment, user and invoice-payments. Each `route.ts` was read with `cat -n`: all 20 are thin forwarders that hold
 * no validation of their own, so every answer below really is the upstream's.
 *
 * `POST/PUT/DELETE /api/invoices/...` are deliberately **not** in the table. They call `refuseUnlessPermitted` before
 * forwarding (`app/api/invoices/pagination/route.ts:10-14`, `app/api/invoices/[id]/route.ts:8-14`), which answers its own
 * `403 {"statusCode":403,"message":"Forbidden resource"}` (`core/services/server/refuse-without-permission.ts:56`) when
 * the session's role holds no `INVOICES_VIEW` — and this lane's fixture role holds TIME_TRACKER, ORG_TASK_ADD,
 * ORG_TASK_EDIT, ORG_INVITE_EDIT and ORG_EMPLOYEES_EDIT only (`mock-gauzy-server.mjs:50-56`), so `canViewInvoices`
 * (`core/lib/utils/invoice-access.ts:29-31`) refuses and the invoice path is never asked. A route that refuses before it
 * forwards cannot measure a refusal *behind* it, and nothing in `MockScenario` grants a permission, so the invoice family
 * is represented here by `invoice-payments/connection` and its `rotate-secret`: no permission guard, only
 * `refuseForeignOrigin`, which a header-free call passes (`core/services/server/same-origin-request.ts:20-32`).
 *
 * The guard is also why `fails` is never armed on `/api/user/me`, and never keyed by a bare tenant id:
 * `refuseUnlessPermitted` reads the permissions through the same helper on `/role-permissions/me`
 * (`refuse-without-permission.ts:42-47`), so an arm there refuses the guard rather than the route under test.
 * `GET /api/role-permissions/me` is in the table as a route in its own right, armed only inside its own test, on its own
 * path.
 *
 * A verb a route file does not export never reaches the helper at all (Next answers it itself, bodiless with 405, and
 * with 415 for a non-JSON body of one that does): pinned in `suites/lane-b/verify-status.spec.ts`, not repeated here.
 */

/** The statuses the passthrough is pinned on. */
const REFUSAL_STATUSES = [400, 401, 403, 404, 409, 422, 500, 503];

/** The mock's refusal body as bytes (`mock-gauzy-server.mjs:1078-1079`, stringified at `:1129`). */
const refusalBody = (status: number): string =>
	JSON.stringify({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });

/** The media type every mock answer carries (`mock-gauzy-server.mjs:1128`). */
const UPSTREAM_MEDIA_TYPE = 'application/json; charset=utf-8';

/**
 * Placeholder ids for the dynamic segments. No fixture id is needed: these routes only encode the segment into the
 * upstream path (`encodeURIComponent`, e.g. `app/api/embed-allowed-origins/[id]/route.ts:9`) and this mock holds no
 * handler keyed on an id of these families (`grep -n "'/api/chat\|/api/comment" cypress/support/mock-gauzy-server.mjs`
 * answers nothing), so the armed path is the whole witness. Measured with these exact values (`probe-fwdref-2.txt`).
 */
const PROBE_SESSION_ID = 'lane-b-probe-session';
const PROBE_ORIGIN_ID = 'lane-b-probe-origin';
const PROBE_ITEM_ID = 'lane-b-probe-item';
const PROBE_CONVERSATION_ID = 'lane-b-probe-conversation';
const PROBE_WEBHOOK_ID = 'lane-b-probe-webhook';
const PROBE_COMMENT_ID = 'lane-b-probe-comment';

type ForwardedRoute = {
	/** The app route, as the caller spells it. */
	app: string;
	/** The verb the route file exports; only such a verb reaches this app's handler at all. */
	method: string;
	/** `file:line` of that export (read with `cat -n`), so a failure names the line that owns the upstream path. */
	routeLine: string;
	/** The path `forwardToGauzy` is called with, spelled as the mock records it (`/api` from GAUZY_API_SERVER_URL). */
	up: string;
	/** Whether that call passed `{ noStore: true }`. */
	noStore: boolean;
	/** The JSON body sent with a write; `undefined` keeps the write bodiless, as some of these clients send them. */
	body?: unknown;
};

// The three routes the tests at the end single out; each of them is also one entry of the sweep table below.
/** The route the switch exists for: `app/api/auth/verify/status/route.ts:3-7` says Gauzy's 404 "is passed on as it is, since that answer is what tells the app to ask nobody for a code". */
const VERIFY_STATUS: ForwardedRoute = {
	app: '/api/auth/verify/status',
	method: 'GET',
	routeLine: 'app/api/auth/verify/status/route.ts:9',
	up: '/api/auth/email/verify/status',
	noStore: true
};
/** A `noStore` route, used where a refusal and a cut must be compared on one and the same path. */
const AUTH_SESSIONS: ForwardedRoute = {
	app: '/api/auth/sessions',
	method: 'GET',
	routeLine: 'app/api/auth/sessions/route.ts:8',
	up: '/api/auth/sessions',
	noStore: true
};
/** A plain route whose path this mock answers from a handler (`mock-gauzy-server.mjs:545`), so it is not an echo of this file's body. */
const AUTH_WORKSPACES: ForwardedRoute = {
	app: '/api/auth/workspaces',
	method: 'GET',
	routeLine: 'app/api/auth/workspaces/route.ts:8',
	up: '/api/auth/workspaces',
	noStore: false
};

const ROUTES: ForwardedRoute[] = [
	VERIFY_STATUS,
	AUTH_SESSIONS,
	AUTH_WORKSPACES,
	{
		app: `/api/auth/sessions/${PROBE_SESSION_ID}`,
		method: 'DELETE',
		routeLine: 'app/api/auth/sessions/[id]/route.ts:16',
		up: `/api/auth/sessions/${PROBE_SESSION_ID}`,
		noStore: false
	},
	{
		app: '/api/auth/switch-organization',
		method: 'POST',
		routeLine: 'app/api/auth/switch-organization/route.ts:8',
		up: '/api/auth/switch-organization',
		noStore: false,
		// The one body this file must get right for a *success*: the mock grants tokens only for an organization of the
		// request's own tenant (`mock-gauzy-server.mjs:554-561`), so any other id is the mock's own 401, not an arm.
		body: { organizationId: '22222222-2222-4222-8222-111111111111' }
	},
	{
		app: '/api/embed/authorize',
		method: 'POST',
		routeLine: 'app/api/embed/authorize/route.ts:8',
		up: '/api/embed/authorize',
		noStore: true,
		body: { name: 'lane-b embed probe' }
	},
	{
		app: '/api/embed-credentials',
		method: 'GET',
		routeLine: 'app/api/embed-credentials/route.ts:5',
		up: '/api/embed-credentials',
		noStore: false
	},
	{
		app: '/api/embed-credentials/config',
		method: 'GET',
		routeLine: 'app/api/embed-credentials/config/route.ts:5',
		up: '/api/embed-credentials/config',
		noStore: false
	},
	{
		app: `/api/embed-allowed-origins/${PROBE_ORIGIN_ID}`,
		method: 'PATCH',
		routeLine: 'app/api/embed-allowed-origins/[id]/route.ts:9',
		up: `/api/embed-allowed-origins/${PROBE_ORIGIN_ID}`,
		noStore: false,
		body: { allowSignin: true }
	},
	{
		app: '/api/inbox/items/counts',
		method: 'GET',
		routeLine: 'app/api/inbox/items/counts/route.ts:5',
		up: '/api/inbox/items/counts',
		noStore: false
	},
	{
		app: '/api/inbox/items/mark-all-read',
		method: 'POST',
		routeLine: 'app/api/inbox/items/mark-all-read/route.ts:5',
		up: '/api/inbox/items/mark-all-read',
		noStore: false,
		body: {}
	},
	{
		app: `/api/inbox/items/${PROBE_ITEM_ID}/state`,
		method: 'PATCH',
		routeLine: 'app/api/inbox/items/[id]/state/route.ts:8',
		up: `/api/inbox/items/${PROBE_ITEM_ID}/state`,
		noStore: false,
		body: { state: 'READ' }
	},
	{
		app: '/api/chat/people',
		method: 'GET',
		routeLine: 'app/api/chat/people/route.ts:5',
		up: '/api/chat/people',
		noStore: false
	},
	{
		app: `/api/chat/conversations/${PROBE_CONVERSATION_ID}/webhooks`,
		method: 'POST',
		routeLine: 'app/api/chat/conversations/[id]/webhooks/route.ts:21',
		up: `/api/chat/conversations/${PROBE_CONVERSATION_ID}/webhooks`,
		noStore: true,
		body: { name: 'lane-b webhook probe' }
	},
	{
		app: `/api/chat/webhooks/${PROBE_WEBHOOK_ID}/secret`,
		method: 'POST',
		routeLine: 'app/api/chat/webhooks/[id]/secret/route.ts:13',
		up: `/api/chat/webhooks/${PROBE_WEBHOOK_ID}/secret`,
		noStore: true
	},
	{
		app: `/api/comment/${PROBE_COMMENT_ID}/soft`,
		method: 'DELETE',
		routeLine: 'app/api/comment/[id]/soft/route.ts:13',
		up: `/api/comment/${PROBE_COMMENT_ID}/soft`,
		noStore: false
	},
	{
		app: '/api/user/ui-preferences',
		method: 'PUT',
		routeLine: 'app/api/user/ui-preferences/route.ts:5',
		up: '/api/user/ui-preferences',
		noStore: false,
		body: { theme: 'dark' }
	},
	{
		app: '/api/invoice-payments/connection',
		method: 'GET',
		routeLine: 'app/api/invoice-payments/connection/route.ts:13',
		up: '/api/invoice-payments/connection',
		noStore: true
	},
	{
		app: '/api/invoice-payments/connection/rotate-secret',
		method: 'POST',
		routeLine: 'app/api/invoice-payments/connection/rotate-secret/route.ts:12',
		up: '/api/invoice-payments/connection/rotate-secret',
		noStore: true
	},
	// The permission guard's own upstream, in this file as a route in its own right (see the header: never armed for
	// another route, and never `/api/user/me`).
	{
		app: '/api/role-permissions/me',
		method: 'GET',
		routeLine: 'app/api/role-permissions/me/route.ts:8',
		up: '/api/role-permissions/me',
		noStore: false
	}
];

const label = (route: ForwardedRoute): string => `${route.method} ${route.app}`;
const storeLabel = (route: ForwardedRoute): string => (route.noStore ? 'noStore route' : 'plain route');
const callOptions = (route: ForwardedRoute): { method: string; body?: unknown } => ({
	method: route.method,
	...(route.body === undefined ? {} : { body: route.body })
});

/** Keeps a synthetic token out of the run log: this lane mints unsigned fixture JWTs, and they stay unseen all the same. */
const redact = (text: string): string => text.replace(/[A-Za-z0-9_-]{24,}/g, '[redacted]');

/** Prints one measured answer, so the run log carries the numbers the assertions below are pinned on. */
function measure(labelText: string, response: APIResponse, text: string): string {
	const carried = Object.entries(response.headers())
		.filter(
			([name]) =>
				!['date', 'connection', 'keep-alive', 'vary', 'content-encoding', 'transfer-encoding'].includes(name)
		)
		.sort()
		.map(([name, value]) => `${name}=${JSON.stringify(value)}`)
		.join(' ');
	const witness = `${labelText} -> ${response.status()} | body(${text.length}B)=${JSON.stringify(
		redact(text.slice(0, 110))
	)} | ${carried}`;
	console.log(`[lane-b fwdref] MEASURE ${witness}`);
	return witness;
}

/**
 * The same upstream call, asked of the mock directly: the witness of what the route was handed. Sent with the headers
 * `forwardToGauzy` itself writes (`forward-to-gauzy.ts:114-120`) — the JSON media type, `Accept` and the session's
 * `tenant-id` — so it answers as the app's own call answers.
 */
async function directUpstream(
	route: ForwardedRoute,
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

test.describe('lane-b · an upstream refusal rides through forwardToGauzy unchanged', () => {
	for (const route of ROUTES) {
		// Control: the route answers with its upstream's own success, and the mock's log is what proves which path,
		// which verb and which status the app was answering.
		test(`lane-b · ${label(route)} hands on its upstream's answer (${storeLabel(route)})`, async ({
			api,
			mock,
			ids
		}) => {
			const response = await api(route.app, callOptions(route));
			const text = await response.text();
			const witness = measure(`control ${label(route)}`, response, text);
			const headers = response.headers();
			const log = await mock.requests();
			// Asked after the log was read, so the log below holds the app's own call and nothing else.
			const upstream = await directUpstream(route, ids.tenantA);

			expect(
				response.status(),
				`the mock answers ${route.up} with ${upstream.status} and this route no longer answers with it: ${witness} ` +
					`— ${route.routeLine} forwards, so its success is the upstream's`
			).toBe(200);
			expect(
				triples(log),
				`${label(route)} did not ask ${route.up} exactly once (${logOf(log)}): ${witness}`
			).toEqual([`${route.method} ${route.up} 200`]);
			expect(
				headers['content-type'],
				`answerHeaders (forward-to-gauzy.ts:24) copies the upstream media type, which the mock writes as ` +
					`${JSON.stringify(UPSTREAM_MEDIA_TYPE)} (mock-gauzy-server.mjs:1128); this answer says ` +
					`${JSON.stringify(headers['content-type'])}: ${witness}`
			).toBe(UPSTREAM_MEDIA_TYPE);
			if (route.noStore) {
				expect(
					headers['cache-control'],
					`${route.routeLine} passed { noStore: true }, which answerHeaders (forward-to-gauzy.ts:26) must write on ` +
						`the copied answer: ${witness}`
				).toBe('no-store');
			} else {
				expect(
					headers['cache-control'],
					`a route that passed no noStore now names Cache-Control=${JSON.stringify(headers['cache-control'])} — ` +
						`answerHeaders (forward-to-gauzy.ts:23-27) writes it for a noStore route only: ${witness}`
				).toBeUndefined();
			}
			expect(
				text,
				`the answer body is no longer the upstream body byte for byte (${redact(upstream.text).slice(0, 110)} vs ` +
					`${redact(text).slice(0, 110)}): ${witness}`
			).toBe(upstream.text);
		});

		for (const status of REFUSAL_STATUSES) {
			test(`lane-b · ${label(route)} with the upstream armed ${status} answers with it unchanged (${storeLabel(route)})`, async ({
				api,
				mock,
				ids
			}) => {
				await mock.scenario({ fails: { [route.up]: status } });
				// The same armed path, asked directly: the numbers the app is compared with, taken before any assertion.
				const upstream = await directUpstream(route, ids.tenantA);
				// The probe left a log entry and the mock keeps its arm, so: clear both, then arm once for the app's call.
				await mockReset();
				await mock.scenario({ fails: { [route.up]: status } });

				const response = await api(route.app, callOptions(route));
				const text = await response.text();
				const witness = measure(`${label(route)} armed ${status}`, response, text);
				const headers = response.headers();
				const log = await mock.requests();
				const entry = log.find((request) => request.path === route.up);

				expect(
					upstream.status,
					`${JSON.stringify(route.up)} was not armed to answer ${status} (the direct call answered ` +
						`${upstream.status}) — the scenario switch broke, so nothing below this line can be read: ${witness}`
				).toBe(status);
				expect(
					response.status(),
					`an upstream ${status} on ${route.up} no longer reaches the caller as ${status} (the mock itself answered ` +
						`${upstream.status}): ${witness} — forward-to-gauzy.ts:128-131 hands the upstream status on, so a ` +
						`different number here is this route remapping it`
				).toBe(status);
				expect(
					text,
					`the refusal body is no longer the upstream body byte for byte: app ${JSON.stringify(
						redact(text.slice(0, 110))
					)} vs mock ${JSON.stringify(redact(upstream.text.slice(0, 110)))} vs the shape ` +
						`${JSON.stringify(refusalBody(status))} (mock-gauzy-server.mjs:1078-1079): ${witness}`
				).toBe(upstream.text);
				expect(
					parseAnswer(text),
					`the body this caller got is not Gauzy's error shape any more (${redact(text).slice(0, 110)}): ${witness} ` +
						'— a rewritten body would mean the proxy stopped handing the upstream answer through'
				).toEqual({ statusCode: status, message: `Synthetic Gauzy refusal (${status})` });
				expect(
					headers['content-type'],
					`the copied media type moved off ${JSON.stringify(UPSTREAM_MEDIA_TYPE)} (mock-gauzy-server.mjs:1128): ` +
						`${JSON.stringify(headers['content-type'])} — ${witness}`
				).toBe(UPSTREAM_MEDIA_TYPE);
				if (route.noStore) {
					expect(
						headers['cache-control'],
						`${route.routeLine} passed { noStore: true }, so answerHeaders (forward-to-gauzy.ts:26) must write ` +
							`no-store on a copied refusal too: ${witness}`
					).toBe('no-store');
				} else {
					expect(
						headers['cache-control'],
						`a refusal on a route without noStore now names Cache-Control=` +
							`${JSON.stringify(headers['cache-control'])}; answerHeaders (forward-to-gauzy.ts:23-27) writes it ` +
							`only for a noStore route — see the test that pins the upstream's own no-store being dropped: ${witness}`
					).toBeUndefined();
				}

				// One call, on the route's own path, recorded with the armed status: the witness that the refusal really
				// came from the upstream this route names, and that nothing else was asked on the way.
				expect(
					triples(log),
					`${label(route)} did not ask ${route.up} exactly once (${logOf(log)}): ${witness}`
				).toEqual([`${route.method} ${route.up} ${status}`]);
				expect(
					entry?.status,
					`the refused call is not recorded with its status (${JSON.stringify(entry)}, full log ${logOf(log)}): ` +
						`${witness} — mock-gauzy-server.mjs:1094 records the arm, :1101-1109 logs it`
				).toBe(status);
				expect(
					await mock.failures(),
					`an upstream refusal is missing from the failures view (${logOf(log)}): ${witness}`
				).toHaveLength(1);
			});
		}
	}

	test('lane-b · the upstream’s own no-store does not ride through a route that did not ask for it, while the same body does', async ({
		api,
		mock,
		ids
	}) => {
		// A plain route (no `noStore`) whose path this mock answers from a handler, so the comparison is with a payload
		// the mock owns rather than with an echo of this file's own body.
		const route = AUTH_WORKSPACES;
		await mock.scenario({ fails: { [route.up]: 500 } });
		const upstream = await directUpstream(route, ids.tenantA);
		await mockReset();
		await mock.scenario({ fails: { [route.up]: 500 } });

		const response = await api(route.app, callOptions(route));
		const text = await response.text();
		const witness = measure(`${label(route)} armed 500`, response, text);
		const log = await mock.requests();

		expect(
			upstream.status,
			`the direct probe did not get the armed 500: ${JSON.stringify(upstream.status)} — ${witness}`
		).toBe(500);
		// The upstream asked for no-store on its own refusal ...
		expect(
			upstream.cacheControl,
			`the mock no longer marks its own answer no-store (${JSON.stringify(
				upstream.cacheControl
			)}) — mock-gauzy-server.mjs:1003 is the header written at :1128, and a real Gauzy marks a refusal too, so this ` +
				`comparison lost its subject: ${witness}`
		).toBe('no-store');
		// ... and the caller never sees that request.
		// measured, not intended: answerHeaders (forward-to-gauzy.ts:22-28) copies exactly one header, `Content-Type`,
		// so on a route without `noStore` an upstream's `Cache-Control: no-store` is dropped on the floor even though the
		// body behind it did arrive unchanged.
		expect(
			response.headers()['cache-control'],
			`the upstream's own Cache-Control=${JSON.stringify(upstream.cacheControl)} reached the caller as ` +
				`${JSON.stringify(response.headers()['cache-control'])} on a route that named no noStore: ${witness}`
		).toBeUndefined();
		expect(
			text,
			`the body still rode through while the header did not: app ${JSON.stringify(text.slice(0, 110))} vs mock ` +
				`${JSON.stringify(redact(upstream.text.slice(0, 110)))} — ${witness}`
		).toBe(upstream.text);
		expect(triples(log), `the two calls are no longer one armed upstream ask (${logOf(log)}): ${witness}`).toEqual([
			`${route.method} ${route.up} 500`
		]);
	});

	test('lane-b · GET /api/auth/verify/status with its upstream armed 404: Gauzy 404 rides through with its body and no-store, and this app’s own 401 is a different answer', async ({
		api,
		mock,
		ids
	}) => {
		// The case `app/api/auth/verify/status/route.ts:3-7` names as the point of the route: a deployment that verifies
		// no address answers 404, and that answer is what tells the app to ask nobody for a code.
		const up = '/api/auth/email/verify/status';
		await mock.scenario({ fails: { [up]: 404 } });
		const upstream = await directUpstream(VERIFY_STATUS, ids.tenantA);
		await mockReset();
		await mock.scenario({ fails: { [up]: 404 } });

		const response = await api('/api/auth/verify/status');
		const text = await response.text();
		const witness = measure('GET /api/auth/verify/status armed 404', response, text);
		const headers = response.headers();
		const log = await mock.requests();

		expect(upstream.status, `the upstream was not armed to 404: it answered ${upstream.status} — ${witness}`).toBe(
			404
		);
		expect(
			response.status(),
			`the 404 that this route exists to pass on was remapped to ${response.status()}: ${witness} — its own comment ` +
				'(app/api/auth/verify/status/route.ts:5-6) says Gauzy 404 is passed on as it is'
		).toBe(404);
		expect(
			text,
			`the caller no longer gets the upstream 404 body: app ${JSON.stringify(
				text.slice(0, 110)
			)} vs mock ${JSON.stringify(upstream.text.slice(0, 110))} — ${witness}`
		).toBe(refusalBody(404));
		expect(
			headers['cache-control'],
			`route.ts:9 passes { noStore: true }, and this is the answer the app acts on, so no-store must ride with it: ` +
				`${witness}`
		).toBe('no-store');
		expect(
			headers['content-type'],
			`the media type moved off the copied ${UPSTREAM_MEDIA_TYPE}: ${JSON.stringify(headers['content-type'])} — ${witness}`
		).toBe(UPSTREAM_MEDIA_TYPE);
		expect(triples(log), `the armed read did not ask ${up} exactly once (${logOf(log)}): ${witness}`).toEqual([
			`GET ${up} 404`
		]);
		expect(
			await mock.failures(),
			`the upstream 404 is missing from the failures view (${logOf(log)}): ${witness}`
		).toHaveLength(1);

		// The 401 this app writes for a caller with no token (`forward-to-gauzy.ts:96`) versus the 404 the armed upstream
		// writes: same route, same status family, two different answers, and only one of them ever asked the upstream.
		const anonymous = await api('/api/auth/verify/status', { anonymous: true });
		const anonymousText = await anonymous.text();
		const anonymousWitness = measure(
			'anonymous GET /api/auth/verify/status, upstream still armed 404',
			anonymous,
			anonymousText
		);
		expect(
			anonymous.status(),
			`an unauthenticated read no longer gets this app's own refusal: ${anonymous.status()} with the upstream armed ` +
				`404 — ${anonymousWitness}`
		).toBe(401);
		expect(
			parseAnswer(anonymousText),
			`the anonymous 401 is no longer the helper's own body (${redact(anonymousText).slice(0, 110)}) — a ` +
				`"Synthetic Gauzy refusal" body here would mean the token check at forward-to-gauzy.ts:96 stopped ` +
				`short-circuiting before the fetch at :112: ${anonymousWitness}`
		).toEqual({ statusCode: 401, message: 'Unauthorized' });
		expect(
			anonymous.headers()['content-type'],
			`an answer this helper wrote itself now names content-type=${JSON.stringify(
				anonymous.headers()['content-type']
			)}: ${anonymousWitness}`
		).toBe('application/json');
		expect(
			anonymous.headers()['cache-control'],
			`the 401 this helper wrote itself names Cache-Control=${JSON.stringify(
				anonymous.headers()['cache-control']
			)} — noStore reaches only answerHeaders, on the copied upstream answer: ${anonymousWitness}`
		).toBeUndefined();
		expect(
			triples(await mock.requests()),
			`the anonymous read reached the test backend, or the armed read left the log (${logOf(await mock.requests())}) — ` +
				'the token check at forward-to-gauzy.ts:96 is what keeps an unauthenticated caller off the upstream'
		).toEqual([`GET ${up} 404`]);
	});

	test('lane-b · a cut upstream is the helper’s own 502, not a passed-through refusal: same route, no charset, no no-store', async ({
		api,
		mock
	}) => {
		// A `noStore` route, so the difference cannot be explained by the option: an armed 503 on this path is decorated,
		// the helper's own 502 on the same path is not.
		const route = AUTH_SESSIONS;

		await mock.scenario({ fails: { [route.up]: 503 } });
		const refused = await api(route.app, callOptions(route));
		const refusedText = await refused.text();
		const refusedWitness = measure(`${label(route)} armed 503`, refused, refusedText);
		expect(refused.status(), `the armed refusal moved off 503: ${refusedWitness}`).toBe(503);
		expect(refusedText, `the refusal body moved (${redact(refusedText).slice(0, 110)}): ${refusedWitness}`).toBe(
			refusalBody(503)
		);
		expect(
			refused.headers()['content-type'],
			`a copied refusal no longer carries the upstream media type: ${JSON.stringify(
				refused.headers()['content-type']
			)} — ${refusedWitness}`
		).toBe(UPSTREAM_MEDIA_TYPE);
		expect(refused.headers()['cache-control'], `a copied refusal lost no-store: ${refusedWitness}`).toBe(
			'no-store'
		);

		// `mockReset()` clears the arm as well as the log (`playwright/helpers.ts` `mockReset`), so the drop below is the
		// only switch armed for the second call.
		await mockReset();
		await mock.scenario({ drops: { [route.up]: 1 } });
		const cut = await api(route.app, callOptions(route));
		const cutText = await cut.text();
		const cutWitness = measure(`${label(route)} with the upstream call cut`, cut, cutText);
		const cutLog = await mock.requests();
		const cutEntry = cutLog.find((request) => request.path === route.up);

		expect(
			cut.status(),
			`the outage answer moved off 502 (${cutWitness}) — failedUpstreamAnswer (forward-to-gauzy.ts:135-144) is the ` +
				'only branch a cut upstream can take with a 60 s client'
		).toBe(502);
		expect(
			parseAnswer(cutText),
			`the outage body is no longer this helper's own (${redact(cutText).slice(0, 110)}): ${cutWitness}`
		).toEqual({ statusCode: 502, message: 'The Gauzy API is unreachable' });
		// Re-measured today, as the header says: the helper writes this JSON itself (`:144`), so it carries Next's own
		// `application/json` — without the upstream's `charset` — and no `Cache-Control` at all, on a route that asked for
		// `no-store` on everything it copies.
		expect(
			cut.headers()['content-type'],
			`the outage answer now carries ${JSON.stringify(cut.headers()['content-type'])} — an answer this helper wrote ` +
				`itself is not the copied upstream media type: ${cutWitness}`
		).toBe('application/json');
		expect(
			cut.headers()['cache-control'],
			`the outage answer names Cache-Control=${JSON.stringify(
				cut.headers()['cache-control']
			)} — noStore is applied in answerHeaders (forward-to-gauzy.ts:22-28), which never sees an answer the helper ` +
				`wrote for itself: ${cutWitness}`
		).toBeUndefined();
		expect(
			cutEntry?.status,
			`the cut call is not recorded with the drop zero (${JSON.stringify(cutEntry)}, full log ${logOf(cutLog)}): ` +
				`${cutWitness}`
		).toBe(0);
		expect(
			await mock.failures(),
			`a drop was counted as a refusal, which would make every "was refused upstream" witness in this lane mean two ` +
				`things (${logOf(cutLog)}): ${cutWitness}`
		).toEqual([]);
	});
});
