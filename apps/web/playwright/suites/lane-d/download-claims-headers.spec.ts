import { test, expect } from '../../api-fixtures';
import { mockReset, mockRequests, mockScenario, receivedTokens } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import { logOf, parseAnswer } from '../api/log-helpers';
import { mintAccessToken, sha256 } from './lane-d-session';

/**
 * Independent re-measurement of lane-b's download statements, half 1: the headers of a forwarded download answer,
 * and whose tenant-id reaches the platform. Nothing here reuses a lane-b number, log or wording — every value below
 * was measured against lane-d's own app (3034) and lane-d's own mock (4006), after the probes
 * `E:\Coding\.tmp\lane-d-claims-probe-1.txt`. `suites/lane-b/download-forwarding.spec.ts` owns its own claims; this
 * file exists because four of them are candidates for the owner's report and had only been measured on one lane.
 *
 * ## The code this file measures (each line read out of the file before being named)
 *
 * - `core/services/server/forward-to-gauzy.ts` — `SESSION_HEADERS` (`:11-19`), `answerHeaders(upstream, noStore)`
 *   (`:22-28`: `Content-Type` from the upstream or `application/json`, plus `Cache-Control: no-store` when the route
 *   asked), `forwardedHeaders` (`:37-45`), the session order foreign-write refusal → cookie token → 401
 *   (`:89-96`), the upstream `tenant-id` taken from the `auth-tenant-id` cookie (`:97`, `:119`), and the answer built
 *   with `answerHeaders` only (`:128-131`).
 * - `core/services/server/forward-download-to-gauzy.ts` — `PASSED_HEADERS` (`:10-16`, five names, `content-disposition`
 *   among them), cookies → tab bearer → 401 (`:36-40`), `tenant-id` from the same cookie (`:41`, `:48`), and
 *   `downloadHeadersOf` (`:66-77`).
 * - `app/api/invoices/download/[id]/route.ts` (`:6-14`): `refuseUnlessPermitted(req, canViewInvoices)` first, then
 *   `forwardToGauzy(req, '/invoices/download/<encodeURIComponent(id)>')`.
 * - `app/api/plugins/docs/documents/[id]/export.pdf/route.ts` (`:5`, `:11-14`): `z.guid()` then `forwardDownloadToGauzy`.
 * - `core/services/server/refuse-without-permission.ts` (`:42-56`): the permission read is
 *   `forwardToGauzy(permissionsRequest, '/role-permissions/me')`, and a role that fails the check gets
 *   `NextResponse.json({ statusCode: 403, message: 'Forbidden resource' })` (`:56`) with no header of its own.
 * - `core/lib/utils/invoice-access.ts` (`:19-31`): `canView = INVOICES_VIEW && (ORG_EMPLOYEES_EDIT or
 *   CHANGE_SELECTED_EMPLOYEE)`; the rate half is `core/lib/utils/rates.ts:11`.
 * - `cypress/support/mock-gauzy-server.mjs`: the fixture role's permissions (`:50-62`),
 *   `if (pathname === '/api/role-permissions/me') return data.rolePermissions` (`:611`), the unknown-GET fall-through
 *   `return pagination([])` (`:806`, `pagination` at `:9`), the single `writeHead` every graded call goes out with
 *   (`:1109`), the request log (`:1082-1090`, `status: 0` for a cut call), the bearer hash list (`:1094-1099`), the
 *   `drops` addressing (`:1044-1049`, keyed on the upstream `tenant-id` read at `:1013-1016`) and its socket cut
 *   (`:1101-1106`), and the origin guard (`:991-993` against the set built at `:17-25`, which a lane run widens with
 *   its own loopback origin through `E2E_TRUSTED_APP_ORIGINS`, set at `playwright/test-servers.ts:323`).
 *
 * ## What this lane cannot answer, measured rather than asserted
 *
 * The mock writes every answer through one `writeHead` that names the CORS set and a JSON type only, so it cannot
 * offer a `Content-Disposition`, a `content-length` (it answers chunked) or a binary body on any download path — test
 * 1 measures that on the mock's own answer. `scenario.fails` is not a switch this checkout's mock reads: test 7 arms
 * it and the call is answered 200 anyway. And the mock's permission list has no `INVOICES_VIEW`, so
 * `GET /api/invoices/download/:id` is refused by its own gate before `forwardToGauzy` runs on this lane — test 5 and
 * test 6 measure both halves. Those are recorded in `PLAN.md` as blockers, not worked around here.
 */

const DOCUMENT_ID = '2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d';
const FILE = `/api/plugins/docs/documents/${DOCUMENT_ID}/export.pdf`;
const INVOICE_ID = '11111111-1111-4111-8111-111111111111'; // the fixture tenant A's own id, as `auth-tenant-id`
const INVOICE_FILE = `/api/invoices/download/${INVOICE_ID}`;
const PERMISSIONS = '/api/role-permissions/me'; // app/api/role-permissions/me/route.ts:8 → forwardToGauzy, no options
const SESSIONS = '/api/auth/sessions'; // app/api/auth/sessions/route.ts:8 → forwardToGauzy, { noStore: true }
const FOREIGN_ORIGIN = 'https://some-other-site.example';

/** The mock's own answer, read straight from it: the headers and bytes the app is about to be handed. */
async function askMockDirectly(path: string, headers: Record<string, string> = {}) {
	const response = await fetch(`${MOCK_ORIGIN}${path}`, { headers });
	const text = await response.text();
	return { status: response.status, text, headers: Object.fromEntries(response.headers) };
}

const headerNames = (headers: Record<string, string>) => Object.keys(headers).sort();

/** Carried by every header assertion, so a red prints the whole answer instead of one name. */
const describeAnswer = (status: number, headers: Record<string, string>, body: string) =>
	`status ${status} · headers ${JSON.stringify(headerNames(headers))} · body(${body.length}) ${body.slice(0, 160)}`;

/** The mock's log entries for one upstream path, as `GET /api/x 200` lines. */
const asksFor = (requests: Array<{ method: string; path: string; status: number }>, path: string) =>
	requests
		.filter((request) => request.path === path)
		.map((request) => `${request.method} ${request.path} ${request.status}`);

const without = (header: string, ...names: string[]) =>
	header
		.split('; ')
		.filter((entry) => !names.includes(entry.split('=')[0]))
		.join('; ');

test.describe('lane-d · re-measuring the download claims: the answer headers, and whose tenant travels', () => {
	test('what the mock upstream actually answers on a download path, header by header', async () => {
		const file = await askMockDirectly(FILE);
		const fileWitness = describeAnswer(file.status, file.headers, file.text);

		expect(file.status, `the mock stopped answering the download path: ${fileWitness}`).toBe(200);
		expect(file.text, `the mock stopped falling through to its unknown-GET answer: ${fileWitness}`).toBe(
			'{"items":[],"total":0}'
		);
		// The names its one writeHead gives (mock-gauzy-server.mjs:1109 + the cors object at :997-1006).
		expect(file.headers['content-type'], `the upstream content-type changed: ${fileWitness}`).toBe(
			'application/json; charset=utf-8'
		);
		expect(file.headers['cache-control'], `the upstream cache-control changed: ${fileWitness}`).toBe('no-store');
		expect(file.headers['access-control-allow-credentials'], `the upstream CORS half changed: ${fileWitness}`).toBe(
			'true'
		);
		// The two names a file answer needs, measured off the upstream itself: this mock sends neither, on either path.
		expect(
			file.headers['content-disposition'],
			`the mock now offers a filename it used not to: ${fileWitness}`
		).toBeUndefined();
		expect(file.headers['content-length'], `the mock no longer answers chunked: ${fileWitness}`).toBeUndefined();
		expect(file.headers['transfer-encoding'], `the mock no longer answers chunked: ${fileWitness}`).toBe('chunked');

		const invoice = await askMockDirectly(INVOICE_FILE);
		expect(
			invoice.headers['content-disposition'],
			`the invoice download path gained a filename: ${describeAnswer(invoice.status, invoice.headers, invoice.text)}`
		).toBeUndefined();
		expect(invoice.status, `the mock's invoice download path answered: ${invoice.status} ${invoice.text}`).toBe(
			200
		);
	});

	test('the JSON proxy copies the upstream Content-Type and drops every other header the upstream sent', async ({
		api
	}) => {
		const upstream = await askMockDirectly(PERMISSIONS);
		await mockReset();

		const response = await api(PERMISSIONS);
		const body = await response.text();
		const headers = response.headers();
		const witness = describeAnswer(response.status(), headers, body);

		expect(response.status(), `the JSON proxy answer changed: ${witness}`).toBe(200);
		// Verbatim, charset and all: the only header `answerHeaders` (forward-to-gauzy.ts:22-28) can copy.
		expect(headers['content-type'], `content-type is no longer the upstream one: ${witness}`).toBe(
			upstream.headers['content-type']
		);
		// The upstream sent all three; `answerHeaders` names none of them, so none may appear.
		expect(
			headers['cache-control'],
			`the upstream cache-control was copied by a route that did not ask: ${witness}`
		).toBeUndefined();
		expect(
			headers['access-control-allow-credentials'],
			`the upstream CORS header travelled to the caller: ${witness}`
		).toBeUndefined();
		expect(
			headerNames(headers),
			`the JSON proxy answer carries upstream names it must not: ${witness}`
		).not.toContain('content-disposition');
		expect(asksFor(await mockRequests(), PERMISSIONS), `the upstream call changed: ${witness}`).toEqual([
			`GET ${PERMISSIONS} 200`
		]);
	});

	test('Cache-Control reaches the caller only on the route that asked for it, on the same upstream answer', async ({
		api
	}) => {
		const asked = await api(SESSIONS); // noStore: true (app/api/auth/sessions/route.ts:8)
		const notAsked = await api(PERMISSIONS); // no options (app/api/role-permissions/me/route.ts:8)
		const askedBody = await asked.text();
		const notAskedBody = await notAsked.text();

		expect(asked.status(), describeAnswer(asked.status(), asked.headers(), askedBody)).toBe(200);
		expect(notAsked.status(), describeAnswer(notAsked.status(), notAsked.headers(), notAskedBody)).toBe(200);
		// Same mock, same writeHead, same `cache-control: no-store` upstream; the only difference between the two
		// answers is the option the route passed, which is exactly what answerHeaders (forward-to-gauzy.ts:26) adds.
		expect(asked.headers()['cache-control'], `the no-store route lost its Cache-Control: ${askedBody}`).toBe(
			'no-store'
		);
		expect(
			notAsked.headers()['cache-control'],
			`a route that never asked for no-store now answers it: ${notAskedBody}`
		).toBeUndefined();
	});

	test('the download helper answers with its own copy, and with no filename because the upstream had none', async ({
		api
	}) => {
		const upstream = await askMockDirectly(FILE);
		await mockReset();

		const response = await api(FILE);
		const body = await response.text();
		const headers = response.headers();
		const witness = describeAnswer(response.status(), headers, body);

		expect(response.status(), `the download answer changed: ${witness}`).toBe(200);
		// PASSED_HEADERS (forward-download-to-gauzy.ts:10-16): content-type and cache-control travel, and the
		// `application/octet-stream` fallback (:75) did not fire, because the upstream did name a type.
		expect(headers['content-type'], `content-type is not the upstream copy: ${witness}`).toBe(
			upstream.headers['content-type']
		);
		expect(headers['cache-control'], `cache-control is not the copied no-store: ${witness}`).toBe('no-store');
		expect(
			headers['content-disposition'],
			`the download answer carries a content-disposition the mock never sent (${witness}) — the mock gained a ` +
				'download handler, so the filename half has to be written for real'
		).toBeUndefined();
		expect(
			headers['content-length'],
			`a content-length appeared on a chunked upstream: ${witness}`
		).toBeUndefined();
		expect(headers['x-content-type-options'], `x-content-type-options appeared: ${witness}`).toBeUndefined();
		expect(asksFor(await mockRequests(), FILE), `the upstream call changed: ${witness}`).toEqual([
			`GET ${FILE} 200`
		]);
	});

	test('GET /api/invoices/download/:id is refused by its own gate here, so the JSON proxy is never reached', async ({
		api
	}) => {
		const response = await api(INVOICE_FILE);
		const body = await response.text();
		const witness = describeAnswer(response.status(), response.headers(), body);

		expect(parseAnswer(body), `the invoice download answer changed: ${witness}`).toEqual({
			statusCode: 403,
			message: 'Forbidden resource'
		});
		// refuse-without-permission.ts:56 writes this itself; the route's forwardToGauzy (route.ts:14) never ran.
		expect(
			asksFor(await mockRequests(), INVOICE_FILE),
			`the invoice download path reached the platform although the caller was refused: ${witness} · log ` +
				logOf(await mockRequests())
		).toEqual([]);
		expect(
			asksFor(await mockRequests(), PERMISSIONS),
			`the permission read the gate makes is no longer this: ${witness} · log ${logOf(await mockRequests())}`
		).toEqual([`GET ${PERMISSIONS} 200`]);
	});

	test('and the reason is the mock fixture role: its permission list has no INVOICES_VIEW', async () => {
		const permissions = await askMockDirectly(PERMISSIONS);
		const rows = JSON.parse(permissions.text) as Array<{ permission?: string; enabled?: boolean }>;
		const held = rows.filter((row) => row.enabled === true).map((row) => row.permission);

		// invoice-access.ts:20-22 needs INVOICES_VIEW *and* a rate permission (rates.ts:11); the mock's own answer
		// (mock-gauzy-server.mjs:50-62, served at :611) holds the rate half and not the invoice half.
		expect(held, `the mock's fixture role permissions changed: ${JSON.stringify(held)}`).toContain(
			'ORG_EMPLOYEES_EDIT'
		);
		expect(
			held,
			`the fixture role can now view invoices, so the gate case above has to be re-measured: ${JSON.stringify(held)}`
		).not.toContain('INVOICES_VIEW');
	});

	test('scenario.fails is not a switch this mock reads, so an upstream refusal cannot be caused here', async ({
		api
	}) => {
		await mockScenario({ fails: { [FILE]: 503 } });
		const response = await api(FILE);
		const body = await response.text();
		const log = await mockRequests();

		// Armed exactly the way a test would arm it; the mock answers 200 and logs 200 (helpers.ts MockScenario
		// carries [key: string]: unknown, so this compiles even though the mock ignores the key).
		expect(response.status(), `the mock answered a refusal it cannot produce: ${body}`).toBe(200);
		expect(asksFor(log, FILE), `the download call the mock recorded changed: ${logOf(log)}`).toEqual([
			`GET ${FILE} 200`
		]);
		await mockReset();
	});

	test('a cross-site GET on the download route is forwarded, with the session bearer the cookie carries', async ({
		api,
		cookies,
		ids
	}) => {
		const token = mintAccessToken(ids.user, ids.organizationA, 'lane-d-cross-site');
		const response = await api(FILE, {
			headers: {
				cookie: cookies('A').replace(/auth-token=[^;]+/, `auth-token=${token}`),
				origin: FOREIGN_ORIGIN,
				'sec-fetch-site': 'cross-site'
			}
		});
		const body = await response.text();
		const log = await mockRequests();
		const witness = describeAnswer(response.status(), response.headers(), body);

		// forward-download-to-gauzy.ts has no origin check at all, and same-origin-request.ts:43-46 lets a GET through
		// even where it is reached: the platform was asked, with the cookie's token.
		expect(response.status(), `the cross-site download was refused: ${witness}`).toBe(200);
		expect(
			asksFor(log, FILE),
			`the cross-site download did not reach the platform: ${witness} · log ${logOf(log)}`
		).toEqual([`GET ${FILE} 200`]);
		expect(
			await receivedTokens(FILE),
			`the bearer that reached the platform is not the session's own: ${witness}`
		).toEqual([sha256(token)]);
	});

	test('the caller tenant-id header never reaches the platform; the auth-tenant-id cookie does', async ({
		api,
		cookies,
		ids
	}) => {
		// `drops` is keyed on the tenant the *platform call* carried (`${tenantId}:${pathname}`, then `tenant`, then
		// `pathname` — mock-gauzy-server.mjs:1044-1049, from the header read at :1013-1016). An arm that matches the
		// caller's own header therefore only bites if that header travelled.
		const arms = [
			{ key: `${ids.tenantA}:${FILE}`, appStatus: 502, mockStatus: 0, why: 'the cookie tenant' },
			{ key: `${ids.tenantB}:${FILE}`, appStatus: 200, mockStatus: 200, why: 'the caller header tenant' },
			{ key: ids.tenantB, appStatus: 200, mockStatus: 200, why: 'the caller header tenant, bare key' },
			{ key: FILE, appStatus: 502, mockStatus: 0, why: 'the path alone' }
		];

		for (const arm of arms) {
			await mockReset();
			await mockScenario({ drops: { [arm.key]: 1 } });
			const response = await api(FILE, { headers: { 'tenant-id': ids.tenantB } });
			const body = await response.text();
			const log = await mockRequests();
			const witness = `${arm.why} (${arm.key}) · ${describeAnswer(response.status(), response.headers(), body)} · log ${logOf(log)}`;

			expect(response.status(), `the drop on ${witness} did not answer the outage shape`).toBe(arm.appStatus);
			expect(asksFor(log, FILE), `the recorded call for ${witness} is wrong`).toEqual([
				`GET ${FILE} ${arm.mockStatus}`
			]);
		}

		// The cookie is what supplied it: drop the cookie and the same caller header leaves the call tenant-less.
		await mockReset();
		await mockScenario({ drops: { [FILE]: 1 } });
		const noCookie = await api(FILE, {
			headers: { cookie: without(cookies('A'), 'auth-tenant-id'), 'tenant-id': ids.tenantB }
		});
		const noCookieBody = await noCookie.text();
		expect(
			noCookie.status(),
			`a session without auth-tenant-id was not forwarded-and-dropped: ${describeAnswer(noCookie.status(), noCookie.headers(), noCookieBody)}`
		).toBe(502);
		expect(
			asksFor(await mockRequests(), FILE),
			`the tenant-less call is no longer recorded as one cut call`
		).toEqual([`GET ${FILE} 0`]);
	});

	test('the same differential on the JSON proxy route: its tenant-id comes from the cookie too', async ({
		api,
		cookies,
		ids
	}) => {
		const arms = [
			{ key: `${ids.tenantA}:${PERMISSIONS}`, appStatus: 502, mockStatus: 0, why: 'cookie tenant' },
			{ key: `${ids.tenantB}:${PERMISSIONS}`, appStatus: 200, mockStatus: 200, why: 'caller header tenant' }
		];
		for (const arm of arms) {
			await mockReset();
			await mockScenario({ drops: { [arm.key]: 1 } });
			const response = await api(PERMISSIONS, {
				headers: { 'tenant-id': ids.tenantB, 'sec-fetch-site': 'cross-site', origin: FOREIGN_ORIGIN }
			});
			const body = await response.text();
			const witness = `${arm.why} (${arm.key}) · ${describeAnswer(response.status(), response.headers(), body)}`;
			expect(response.status(), `the JSON proxy tenant differential broke: ${witness}`).toBe(arm.appStatus);
			expect(asksFor(await mockRequests(), PERMISSIONS), `the recorded call broke: ${witness}`).toEqual([
				`GET ${PERMISSIONS} ${arm.mockStatus}`
			]);
		}
		// SESSION_HEADERS (forward-to-gauzy.ts:11-19) holds tenant-id, so no route's forwardHeaders list can pass one
		// either; a cross-site *GET* is still forwarded (refuseForeignWrite, same-origin-request.ts:43-46).
		expect(
			without(cookies('A'), 'auth-tenant-id'),
			'the cookie composer stopped naming auth-tenant-id'
		).not.toContain('auth-tenant-id');
	});

	test('the mock origin guard, measured on this lane: a lane origin is answered, a foreign one is refused, and the forwarded call has no Origin at all', async () => {
		// Refuted mid-run: the first version of this case predicted 403 for `http://localhost:3034`, because
		// mock-gauzy-server.mjs:17 names only the canonical 3030 origins. It is answered 200 here, because
		// `laneServers` names this lane through `E2E_TRUSTED_APP_ORIGINS` (test-servers.ts:323) and the mock adds any
		// loopback entry of that variable (mock-gauzy-server.mjs:18-25). Re-pinned to what was measured.
		const laneOrigin = await askMockDirectly(FILE, { origin: 'http://localhost:3034' });
		expect(laneOrigin.status, `the mock stopped answering its own lane origin: ${laneOrigin.text}`).toBe(200);
		expect(
			laneOrigin.headers['access-control-allow-origin'],
			`the lane origin is no longer the one echoed back: ${JSON.stringify(laneOrigin.headers)}`
		).toBe('http://localhost:3034');

		const refused = await askMockDirectly(FILE, { origin: FOREIGN_ORIGIN });
		expect(refused.status, `the mock no longer refuses a foreign browser origin: ${refused.text}`).toBe(403);
		expect(parseAnswer(refused.text), `the origin refusal answer changed: ${refused.text}`).toEqual({
			error: 'Untrusted synthetic browser origin.'
		});
		expect(
			refused.headers['access-control-allow-origin'],
			`the refused origin was echoed: ${JSON.stringify(refused.headers)}`
		).toBeUndefined();

		// And the guard never touches an app-forwarded call: `fetch` (forward-download-to-gauzy.ts:43,
		// forward-to-gauzy.ts:112) sends no Origin, so the platform sees the session headers and nothing about where
		// the caller's page came from — which is why every cross-site case in this file is written as the *caller's*
		// Origin header reaching the app, and not as the app's own call.
		const noOrigin = await askMockDirectly(FILE);
		expect(noOrigin.status, `the tenant-less, origin-less call the app makes was refused: ${noOrigin.text}`).toBe(
			200
		);
		expect(
			headerNames(noOrigin.headers),
			`the origin-less answer now echoes a CORS origin: ${JSON.stringify(noOrigin.headers)}`
		).not.toContain('access-control-allow-origin');
	});
});
