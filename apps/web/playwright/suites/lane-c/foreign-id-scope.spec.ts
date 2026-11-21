import { createHash } from 'node:crypto';

import { expect, test, type StubRequest } from '../../api-fixtures';
import { receivedTokens } from '../../helpers';
import type { MockControl } from '../../fixtures';

/**
 * An id that arrives in a query string or a path segment is sent along as it arrived.
 *
 * Two shapes exist under `app/api`, and they differ on exactly one point: whose ids a request may name.
 *
 *   `authenticatedGuard` routes build their own upstream query from the session's cookies (`tenantId`,
 *   `organizationId`) and then spread in whatever the caller named — `getTeamProjectScope()`
 *   (`core/services/server/team-project-scope.ts`) hands `organizationTeamId` and `projectId` straight through, and
 *   `proxyListSavedReports` (`core/services/server/saved-report-proxy.ts`) takes `organizationId` from the query *in
 *   preference to* the session's own cookie.
 *   `forwardToGauzy` routes forward `new URL(req.url).search` untouched (line 112), every parameter the caller sent.
 *
 * The app performs no ownership or membership check on those ids, and `apps/web/README.md` says that is deliberate:
 * the same token is available in the browser and could be sent to the Gauzy API directly, so a check here would
 * protect nothing and would block the reads managers and admins legitimately make across teams. What this file can
 * prove is therefore the half the app *is* responsible for, and it proves it from the mock's request log: the id a
 * caller named travelled to the upstream, in the path or in the query, unaltered; and where a route builds its own
 * scope, the caller's `tenantId` never replaces the session's.
 *
 * What the mock cannot answer: "the bytes that came back belong to the tenant that owns them".
 * `mock-gauzy-server.mjs` answers its fixture rows from its own scenario scope, which follows the `tenant-id` header
 * or a `tenantId`/`where[tenantId]` query parameter and never an id in a path — so asking for another tenant's id
 * returns this tenant's row. "The id travelled unchecked" is provable here; "the platform honoured it" is not, and
 * that is written in PLAN.md instead of asserted.
 *
 * One thing the mock does record exactly: the bearer. `state.receivedTokens` holds the sha256 of every token the mock
 * was given (`helpers.receivedTokens(path)`), so a case can say both halves at once — this session's credentials
 * travelled, and the caller's foreign ids travelled with them.
 */

/** Not in the fixture and in no tenant: what a made-up id looks like. */
const FOREIGN_UUID = '99999999-9999-4999-8999-999999999999';
const FOREIGN_PROJECT = 'bbbbbbbb-bbbb-4bbb-8bbb-999999999999';

const base64url = (value: object) =>
	Buffer.from(JSON.stringify(value))
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');

/** The cookie token's shape, with a `jti` of this test's own (the session-check memo keys its answer by the token). */
function tokenOfNonce(ids: Record<string, string>, organizationId: string, nonce: string): string {
	const now = Math.floor(Date.now() / 1000);
	const claims = { sub: ids.user, organizationId, iat: now, exp: now + 86_400, jti: `lane-c-${nonce}` };
	return `${base64url({ alg: 'none', typ: 'JWT' })}.${base64url(claims)}.lane-c`;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const asText = (requests: StubRequest[]) =>
	requests.map((request) => `${request.method} ${request.path}?${request.query} ${request.status}`).join(', ');

/** Every recorded call whose path contains `fragment`, as `[method path status]` triples. */
async function triple(mock: MockControl, fragment: string) {
	return (await mock.calls(fragment)).map((request) => `${request.method} ${request.path} ${request.status}`);
}

test.describe('a route forwards the ids its caller named', () => {
	test('GET /api/task-statuses?organizationTeamId=<other team>&projectId=<other project> sends both, and is authenticated as this session', async ({
		api,
		ids,
		mock
	}) => {
		// `getTeamProjectScope` is the whole scope decision of the metadata reads (task-statuses, task-sizes,
		// task-versions, task-priorities, task-related-issue-types, issue-types): the team and project a caller asks
		// about are read out of the query and put into the upstream query, unchecked.
		const response = await api(`/api/task-statuses?organizationTeamId=${ids.teamB}&projectId=${FOREIGN_PROJECT}`);
		const text = await response.text();
		expect(response.status(), `the scoped metadata read answered ${response.status()} ${text}`).toBe(200);

		const asked = await mock.calls('/api/task-statuses');
		expect(
			await triple(mock, '/api/task-statuses'),
			`the metadata read did not reach the API as one call: ${asText(asked)}`
		).toEqual(['GET /api/task-statuses 200']);
		expect(asked[0].query, `the team id the caller named did not travel: ${asked[0].query}`).toContain(
			`organizationTeamId=${ids.teamB}`
		);
		expect(asked[0].query, `the project id the caller named did not travel: ${asked[0].query}`).toContain(
			`projectId=${FOREIGN_PROJECT}`
		);
		// The read is authenticated with, and scoped to, the session — not with what the caller named.
		expect(asked[0].query, `the read was not scoped to the session's tenant: ${asked[0].query}`).toContain(
			`tenantId=${ids.tenantA}`
		);

		// The honest half: the rows that came back are this tenant's, because the mock answers its own scope whatever
		// the query names. So what is proved is that a foreign team/project id travels, not that it is honoured.
		const rows = (JSON.parse(text) as { items?: Array<Record<string, unknown>> }).items ?? [];
		expect(
			rows.map((row) => row.tenantId),
			`the answered rows are not the session tenant's, so "the id travelled unchecked" has no body to go with it: ${text.slice(0, 300)}`
		).toContain(ids.tenantA);
	});

	test('GET /api/task-statuses?tenantId=<other tenant> cannot name the tenant the read is scoped to', async ({
		api,
		ids,
		mock
	}) => {
		// The same route, the other half: `getTaskStatusListRequest` builds `tenantId` from the guard's cookie, so a
		// caller-supplied `tenantId` is not what the upstream is scoped by. A regression that read it from the query
		// would show up as the other tenant's id in the forwarded query.
		const response = await api(`/api/task-statuses?tenantId=${ids.tenantB}`);
		const text = await response.text();
		expect(response.status(), `answered ${response.status()} ${text}`).toBe(200);

		const asked = await mock.calls('/api/task-statuses');
		expect(await triple(mock, '/api/task-statuses'), `the read did not reach the API exactly once: ${asText(asked)}`).toEqual([
			'GET /api/task-statuses 200'
		]);
		expect(asked[0].query, `a caller-named tenant reached the scoped read: ${asked[0].query}`).not.toContain(ids.tenantB);
		expect(asked[0].query, `the session's own tenant is missing from the read it authenticated: ${asked[0].query}`).toContain(
			`tenantId=${ids.tenantA}`
		);
	});

	test('GET /api/saved-reports?organizationId=<other organization> asks for it with this session’s token', async ({
		api,
		ids,
		mock
	}) => {
		// `proxyListSavedReports`: `const askedOrganizationId = searchParams.get('organizationId') ?? organizationId`
		// — a query value wins over the session's organization cookie, and the read then goes out with this session's
		// bearer. Pinned rather than approved: whether the platform answers it is the platform's decision.
		const response = await api(`/api/saved-reports?organizationId=${ids.organizationB}`);
		const text = await response.text();
		expect(response.status(), `the saved-reports read answered ${response.status()} ${text}`).toBeLessThan(500);

		const reports = await mock.calls('/api/saved-reports');
		expect(
			await triple(mock, '/api/saved-reports'),
			`the saved-reports read never happened: ${asText(reports)}`
		).toEqual(['GET /api/saved-reports 200']);
		expect(reports[0].query, `the organization the caller named is not the one the read asked for: ${reports[0].query}`).toContain(
			`organizationId=${ids.organizationB}`
		);

		// The route's own permission gate ran first and let it through — the fixture role holds TIME_TRACKER, one of
		// SAVED_REPORT_PERMISSIONS — which is what leaves the organization id as the only boundary in this request.
		expect(
			await triple(mock, '/api/role-permissions/me'),
			`the saved-reports permission gate did not run exactly once before the read: ${asText(await mock.requests())}`
		).toEqual(['GET /api/role-permissions/me 200']);
	});

	test('GET /api/employee/members?organizationTeamId=<other team> forwards the team it was handed', async ({
		api,
		ids,
		mock
	}) => {
		const response = await api(`/api/employee/members?organizationTeamId=${ids.teamB}`);
		const text = await response.text();
		expect(response.status(), `the members read answered ${response.status()} ${text}`).toBe(200);

		const asked = await mock.calls('/api/employee/members');
		expect(await triple(mock, '/api/employee/members'), `the members read never reached the API: ${asText(asked)}`).toEqual([
			'GET /api/employee/members 200'
		]);
		expect(asked[0].query, `the caller's team id did not travel: ${asked[0].query}`).toContain(`organizationTeamId=${ids.teamB}`);
	});

	test('forwardToGauzy forwards the whole query string it was given', async ({ api, cookies, ids, mock }) => {
		// Line 112 of `forward-to-gauzy.ts` is `new URL(req.url).search`: every parameter goes, including ones a
		// caller invents, and a caller may name another tenant's ids among them. The credentials it goes with are the
		// session's own — a caller cannot name whose token is used.
		const token = tokenOfNonce(ids, ids.organizationA, `query-${Date.now()}`);
		const cookie = cookies('A').replace(/auth-token=[^;]+/, `auth-token=${token}`);
		const query = `tenantId=${ids.tenantB}&organizationId=${ids.organizationB}&organizationTeamId=${ids.teamB}&where%5BtenantId%5D=${ids.tenantB}`;

		const response = await api(`/api/chat/conversations?${query}`, { headers: { cookie } });
		const text = await response.text();
		expect(response.status(), `the proxied chat read answered ${response.status()} ${text}`).toBe(200);

		const asked = await mock.calls('/api/chat/conversations');
		expect(
			await triple(mock, '/api/chat/conversations'),
			`the proxied read did not reach the API as one call: ${asText(asked)}`
		).toEqual(['GET /api/chat/conversations 200']);
		for (const fragment of [ids.tenantB, ids.organizationB, ids.teamB]) {
			expect(asked[0].query, `a caller-named id was dropped on the way: ${asked[0].query}`).toContain(fragment);
		}
		expect(
			await receivedTokens('/api/chat/conversations'),
			`the proxied read did not carry exactly the session's token: ${asText(await mock.requests())}`
		).toEqual([sha256(token)]);
	});

	test('an id that arrives in a path segment stays inside the endpoint it belongs to', async ({ api, mock }) => {
		// `organizationPathOf` encodes the segment, with the comment "so an id such as `../user` stays one path segment
		// instead of reaching another endpoint". This is that claim, proved on the mock's request log: a
		// walking-looking id — percent-encoded or double-encoded — may not produce a request at the collection path
		// `/api/organization` (which on a real API is the organization list) or at any other endpoint.
		const probes = ['..%2Fuser', '..%2F..%2Fuser%2Fme', '%252e%252e%252fuser', FOREIGN_UUID];

		for (const probe of probes) {
			const response = await api(`/api/organization/${probe}`);
			const text = await response.text();
			expect(
				response.status(),
				`GET /api/organization/${probe} answered ${response.status()} ${text} — the id must stay one encoded segment`
			).toBeLessThan(500);
		}

		const asked = await mock.calls('/api/organization');
		// A probe Next itself refuses (no handler reached) is not a leak and is not counted here; what must hold is
		// that every request that *did* leave reached a single-segment organization path.
		expect(asked.length, `no probe reached the API at all: ${asText(asked)}`).toBeGreaterThan(0);
		for (const request of asked) {
			// One segment, and not the collection path `/api/organization`: `encodeURIComponent` must keep a walking
			// value inside its own segment, exactly as the route file claims.
			expect(
				request.path,
				`a path parameter moved the proxied read out of its own segment: "${request.method} ${request.path} ${request.status}" (${asText(asked)})`
			).toMatch(/^\/api\/organization\/[^/]+$/);
		}
	});
});

test.describe('a proxied read that takes an id from the path asks for exactly that id', () => {
	test('GET /api/tasks/<an id that is not mine> is forwarded as that id, with my token', async ({ api, ids, mock }) => {
		// `app/api/tasks/[id]/route.ts` puts the id into `getTaskByIdRequest` together with the session's tenant and
		// organization; the upstream decides whether the id is the caller's. What this app did is provable: it put the
		// id it was given into a request authenticated as this session.
		const response = await api(`/api/tasks/${FOREIGN_UUID}`);
		const text = await response.text();
		expect(response.status(), `the task read answered ${response.status()} ${text}`).toBeLessThan(500);

		expect(
			await triple(mock, `/api/tasks/${FOREIGN_UUID}`),
			`the task read did not reach the API as the id it named: ${asText(await mock.requests())}`
		).toEqual([`GET /api/tasks/${FOREIGN_UUID} 200`]);
		expect(
			await receivedTokens(`/api/tasks/${FOREIGN_UUID}`),
			`the task read carried no bearer of this session (${ids.task} is the session's own task): ${asText(await mock.requests())}`
		).toHaveLength(1);
	});

	test('DELETE /api/tasks/<a walking-looking id> stays one segment on the way out', async ({ api, mock }) => {
		// The DELETE twin forwards (`/tasks/${encodeURIComponent(params.id)}`), so that encoding is the only thing
		// standing between a path parameter and another Gauzy endpoint.
		for (const probe of ['..%2Forganization', '%252e%252e%252forganization']) {
			const response = await api(`/api/tasks/${probe}`, { method: 'DELETE', body: {} });
			const text = await response.text();
			expect(
				response.status(),
				`DELETE /api/tasks/${probe} answered ${response.status()} ${text} — the id must stay one segment`
			).toBeLessThan(500);
		}

		const tasks = await mock.calls('/api/tasks');
		for (const request of tasks) {
			const segment = request.path.slice('/api/tasks/'.length);
			expect(
				segment,
				`the forwarded path left its own segment: "${request.method} ${request.path} ${request.status}" (segment: "${segment}")`
			).not.toContain('/');
		}
		expect(tasks.length, `the two deletes did not both reach the API: ${asText(tasks)}`).toBe(2);
	});
});
