import { test, expect } from '../../api-fixtures';
import { mockRequests, receivedTokens } from '../../helpers';
import type { StubRequest } from '../../helpers';
import { logOf } from '../api/log-helpers';

/**
 * lane-d · which platform endpoint the server really calls when the path segment decides it.
 *
 * Some server request builders put the id into the upstream path as the route read it. `cat -n` on
 * `core/services/server/requests/organization-projects.ts` shows both sides in one file:
 * `editOrganizationProjectsSettingsRequest` (`:6-24`) puts the id into `…/organization-projects/setting/{id}` with
 * nothing done to it (`:18`), while its sibling `editOrganizationProjectsRequest` (`:26-47`) writes
 * `const encodedId = encodeURIComponent(id)` (`:38`) above the comment "so an id such as `../employee` stays one path
 * segment instead of reaching another endpoint" (`:37`). This spec measures, route by route, which side the crafted
 * segment lands on — the mock's recorded `path` is the witness of which endpoint the platform was really asked for.
 *
 * ## What the two ends of the chain do to a segment, all of it measured here
 *
 * - The caller cannot write `../employee` in the app URL and have it arrive: Playwright resolves it while building the
 *   request, so the route is never reached (`suites/lane-d/download-claims-guid-token.spec.ts:173-187` pins that 404).
 *   The forms below are the encoded spellings: `..%2Femployee`, `%2E%2E%2Femployee`, `x%3Fy%3D1`, `x%23frag`.
 * - Next.js hands the handler the decoded segment: `..%2Femployee` and `%2E%2E%2Femployee` both reach the handler as
 *   `../employee`, and `x%3Fy%3D1` as `x?y=1`. That is what makes an unencoded builder dangerous — the decoded text
 *   carries a slash, a question mark or a hash into the string `serverFetch` hands to `fetch`
 *   (`core/services/server/fetch.ts:110`), and `fetch` parses that string as a URL: `…/setting/../employee` is
 *   normalised to `…/employee`, `…/x?y=1` splits into the path `…/x` plus the query `y=1`, and `…/x#frag` drops
 *   everything from the hash on. Each recorded path below is one of those three outcomes.
 * - A write needs no `Origin` header to be accepted: `refuseForeignOrigin`
 *   (`core/services/server/same-origin-request.ts:16-34`) refuses only a header that is present and names another
 *   host. Measured on this lane: the same `PUT /api/tags/<id>` answers 403
 *   `{"statusCode":403,"message":"Cross-site request refused"}` with `origin: http://example.com` and 200 with
 *   no `Origin` at all, which is what the `api` fixture sends (`playwright/api-fixtures.ts:89-102`), so no case
 *   here passes an origin.
 * - `authenticatedGuard` checks the token at `/user/me` (`core/services/server/guards/authenticated-guard-app.ts:76`)
 *   and `SessionCheckMemo` (`:29-31`) reuses that check for the same token for 5 s, so the guard's own
 *   `GET /api/user/me` shows up in some logs and not in others. It is filtered out (`GUARD_CALL`); it is never a call
 *   on the crafted id. Per the lane's known limitation every case here is signed in.
 *
 * ## The three classes, and how this file decides one (`classify`, below)
 *
 * - REFUSED — the platform was asked nothing about the id: after dropping the guard's own read the log is empty.
 * - CONTAINED — the platform was asked at exactly `/api` + the family this route means to call + the whole segment,
 *   with the crafted characters still percent-encoded, so they stayed inside one path segment.
 * - ESCAPED — a call was made and its recorded path is not that path: the `..` was resolved away and another endpoint
 *   was called, or the id stopped where a `?` or a `#` began (and a crafted `?` also moved part of the id into the
 *   query, which is pinned in the `keys` of the case).
 *
 * ## The measured table
 *
 * Run: `E2E_LANE=lane-d E2E_REUSE_SERVERS=1 npx playwright test --config playwright/playwright.lane.config.ts
 * path-segment-traversal`, log `E:\Coding\.tmp\s2-lane-d-trav-2.log`. `<id>` is the control id
 * `2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d`. `?n keys` is how many query keys the mock recorded for that call; the exact
 * key names are pinned in `CASES` below, and they carry the second finding: a crafted `?` swallows the first session
 * filter the builder appends (`organizationId`, `tenantId` or `where[organizationId]`) into the injected value and adds
 * a key `y`.
 *
 * Both route columns drop the `/api` prefix every one of these paths carries.
 *
 * `org-` stands for `organization-` in the two route columns; the pinned `CASES` table below spells both out in full.
 *
 * | app route (under /api) | segment sent | app | body | mock recorded (under /api) | class |
 * | --- | --- | --- | --- | --- | --- |
 * | PUT org-projects/setting/[id] | <id> | 200 | 2 | PUT org-projects/setting/<id> 200 | CONTAINED |
 * | PUT org-projects/setting/[id] | ..%2Femployee | 200 | 2230 | PUT org-projects/employee 200 | ESCAPED |
 * | PUT org-projects/setting/[id] | %2E%2E%2Femployee | 200 | 2230 | PUT org-projects/employee 200 | ESCAPED |
 * | PUT org-projects/setting/[id] | x%3Fy%3D1 | 200 | 2 | PUT org-projects/setting/x?1 keys 200 | ESCAPED |
 * | PUT org-projects/setting/[id] | x%23frag | 200 | 2 | PUT org-projects/setting/x 200 | ESCAPED |
 * | PUT org-projects/[id] | <id> | 200 | 2230 | PUT org-projects/<id> 200 | CONTAINED |
 * | PUT org-projects/[id] | ..%2Femployee | 200 | 2230 | PUT org-projects/..%2Femployee 200 | CONTAINED |
 * | PUT org-projects/[id] | %2E%2E%2Femployee | 200 | 2230 | PUT org-projects/..%2Femployee 200 | CONTAINED |
 * | PUT org-projects/[id] | x%3Fy%3D1 | 200 | 2230 | PUT org-projects/x%3Fy%3D1 200 | CONTAINED |
 * | PUT org-projects/[id] | x%23frag | 200 | 2230 | PUT org-projects/x%23frag 200 | CONTAINED |
 * | GET org-projects/[id] | <id> | 200 | 2230 | GET org-projects/<id> 200 | CONTAINED |
 * | GET org-projects/[id] | ..%2Femployee | 200 | 2230 | GET org-projects/..%2Femployee 200 | CONTAINED |
 * | GET org-projects/[id] | %2E%2E%2Femployee | 200 | 2230 | GET org-projects/..%2Femployee 200 | CONTAINED |
 * | GET org-projects/[id] | x%3Fy%3D1 | 200 | 2230 | GET org-projects/x%3Fy%3D1 200 | CONTAINED |
 * | GET org-projects/[id] | x%23frag | 200 | 2230 | GET org-projects/x%23frag 200 | CONTAINED |
 * | GET org-team/[id] | <id> | 200 | 27130 | GET org-team/<id>?14 keys 200 | CONTAINED |
 * | GET org-team/[id] | ..%2Femployee | 200 | 13029 | GET employee?14 keys 200 | ESCAPED |
 * | GET org-team/[id] | %2E%2E%2Femployee | 200 | 13029 | GET employee?14 keys 200 | ESCAPED |
 * | GET org-team/[id] | x%3Fy%3D1 | 200 | 27130 | GET org-team/x?14 keys 200 | ESCAPED |
 * | GET org-team/[id] | x%23frag | 200 | 27130 | GET org-team/x 200 | ESCAPED |
 * | DELETE org-team/[id] | <id> | 200 | 23 | DELETE org-team/<id>?1 keys 200 | CONTAINED |
 * | DELETE org-team/[id] | ..%2Femployee | 200 | 13029 | DELETE employee?1 keys 200 | ESCAPED |
 * | DELETE org-team/[id] | %2E%2E%2Femployee | 200 | 13029 | DELETE employee?1 keys 200 | ESCAPED |
 * | DELETE org-team/[id] | x%3Fy%3D1 | 200 | 23 | DELETE org-team/x?1 keys 200 | ESCAPED |
 * | DELETE org-team/[id] | x%23frag | 200 | 23 | DELETE org-team/x 200 | ESCAPED |
 * | PUT org-team-employee/[id] | <id> | 200 | 2 | PUT org-team-employee/<id> 200 | CONTAINED |
 * | PUT org-team-employee/[id] | ..%2Femployee | 200 | 13029 | PUT employee 200 | ESCAPED |
 * | PUT org-team-employee/[id] | %2E%2E%2Femployee | 200 | 13029 | PUT employee 200 | ESCAPED |
 * | PUT org-team-employee/[id] | x%3Fy%3D1 | 200 | 2 | PUT org-team-employee/x?1 keys 200 | ESCAPED |
 * | PUT org-team-employee/[id] | x%23frag | 200 | 2 | PUT org-team-employee/x 200 | ESCAPED |
 * | DELETE org-team-employee/[id] | <id> | 200 | 42 | DELETE org-team-employee/<id>?4 keys 200 | CONTAINED |
 * | DELETE org-team-employee/[id] | ..%2Femployee | 200 | 13029 | DELETE employee?4 keys 200 | ESCAPED |
 * | DELETE org-team-employee/[id] | %2E%2E%2Femployee | 200 | 13029 | DELETE employee?4 keys 200 | ESCAPED |
 * | DELETE org-team-employee/[id] | x%3Fy%3D1 | 200 | 42 | DELETE org-team-employee/x?4 keys 200 | ESCAPED |
 * | DELETE org-team-employee/[id] | x%23frag | 200 | 42 | DELETE org-team-employee/x 200 | ESCAPED |
 * | PUT issue-types/[id] | <id> | 200 | 2 | PUT issue-types/<id> 200 | CONTAINED |
 * | PUT issue-types/[id] | ..%2Femployee | 200 | 13029 | PUT employee 200 | ESCAPED |
 * | PUT issue-types/[id] | %2E%2E%2Femployee | 200 | 13029 | PUT employee 200 | ESCAPED |
 * | PUT issue-types/[id] | x%3Fy%3D1 | 200 | 2 | PUT issue-types/x?1 keys 200 | ESCAPED |
 * | PUT issue-types/[id] | x%23frag | 200 | 2 | PUT issue-types/x 200 | ESCAPED |
 * | DELETE tags/[id] | <id> | 200 | 23 | DELETE tags/<id> 200 | CONTAINED |
 * | DELETE tags/[id] | ..%2Femployee | 200 | 13029 | DELETE employee 200 | ESCAPED |
 * | DELETE tags/[id] | %2E%2E%2Femployee | 200 | 13029 | DELETE employee 200 | ESCAPED |
 * | DELETE tags/[id] | x%3Fy%3D1 | 200 | 23 | DELETE tags/x?1 keys 200 | ESCAPED |
 * | DELETE tags/[id] | x%23frag | 200 | 23 | DELETE tags/x 200 | ESCAPED |
 * | GET daily-plan/[id] | <id> | 200 | 22 | GET daily-plan/<id> 200 | CONTAINED |
 * | GET daily-plan/[id] | ..%2Femployee | 200 | 13029 | GET employee 200 | ESCAPED |
 * | GET daily-plan/[id] | %2E%2E%2Femployee | 200 | 13029 | GET employee 200 | ESCAPED |
 * | GET daily-plan/[id] | x%3Fy%3D1 | 200 | 22 | GET daily-plan/x?1 keys 200 | ESCAPED |
 * | GET daily-plan/[id] | x%23frag | 200 | 22 | GET daily-plan/x 200 | ESCAPED |
 * | POST daily-plan/[id]/task | <id> | 200 | 12 | POST daily-plan/<id>/task 200 | CONTAINED |
 * | POST daily-plan/[id]/task | ..%2Femployee | 200 | 12 | POST employee/task 200 | ESCAPED |
 * | POST daily-plan/[id]/task | %2E%2E%2Femployee | 200 | 12 | POST employee/task 200 | ESCAPED |
 * | POST daily-plan/[id]/task | x%3Fy%3D1 | 200 | 12 | POST daily-plan/x?1 keys 200 | ESCAPED |
 * | POST daily-plan/[id]/task | x%23frag | 200 | 12 | POST daily-plan/x 200 | ESCAPED |
 * | DELETE roles/[id] | <id> | 200 | 23 | DELETE roles/<id> 200 | CONTAINED |
 * | DELETE roles/[id] | ..%2Femployee | 200 | 13029 | DELETE employee 200 | ESCAPED |
 * | DELETE roles/[id] | %2E%2E%2Femployee | 200 | 13029 | DELETE employee 200 | ESCAPED |
 * | DELETE roles/[id] | x%3Fy%3D1 | 200 | 23 | DELETE roles/x?1 keys 200 | ESCAPED |
 * | DELETE roles/[id] | x%23frag | 200 | 23 | DELETE roles/x 200 | ESCAPED |
 * | GET tasks/[id] | <id> | 200 | 2841 | GET tasks/<id>?18 keys 200 | CONTAINED |
 * | GET tasks/[id] | ..%2Femployee | 200 | 13029 | GET employee?18 keys 200 | ESCAPED |
 * | GET tasks/[id] | %2E%2E%2Femployee | 200 | 13029 | GET employee?18 keys 200 | ESCAPED |
 * | GET tasks/[id] | x%3Fy%3D1 | 200 | 2841 | GET tasks/x?18 keys 200 | ESCAPED |
 * | GET tasks/[id] | x%23frag | 200 | 2841 | GET tasks/x 200 | ESCAPED |
 * | DELETE tasks/[id] | <id> | 200 | 23 | DELETE tasks/<id> 200 | CONTAINED |
 * | DELETE tasks/[id] | ..%2Femployee | 200 | 23 | DELETE tasks/..%2Femployee 200 | CONTAINED |
 * | DELETE tasks/[id] | %2E%2E%2Femployee | 200 | 23 | DELETE tasks/..%2Femployee 200 | CONTAINED |
 * | DELETE tasks/[id] | x%3Fy%3D1 | 200 | 23 | DELETE tasks/x%3Fy%3D1 200 | CONTAINED |
 * | DELETE tasks/[id] | x%23frag | 200 | 23 | DELETE tasks/x%23frag 200 | CONTAINED |
 * | DELETE plugins/docs/links/[id] | <id> | 200 | 23 | DELETE plugins/docs/links/<id> 200 | CONTAINED |
 * | DELETE plugins/docs/links/[id] | ..%2Femployee | 400 | 33 | nothing | REFUSED |
 * | DELETE plugins/docs/links/[id] | %2E%2E%2Femployee | 400 | 33 | nothing | REFUSED |
 * | DELETE plugins/docs/links/[id] | x%3Fy%3D1 | 400 | 33 | nothing | REFUSED |
 * | DELETE plugins/docs/links/[id] | x%23frag | 400 | 33 | nothing | REFUSED |
 */

/** What the mock proved about one case: which endpoint, with which query keys, at which status. */
type Call = { method: string; path: string; keys: string[]; status: number };

/** REFUSED / CONTAINED / ESCAPED, as decided by `classify` and pinned per case. */
type Class = 'REFUSED' | 'CONTAINED' | 'ESCAPED';

type RouteSpec = {
	key: string;
	/** The verb this handler exports. */
	method: 'GET' | 'PUT' | 'POST' | 'DELETE';
	/** The app route, with the crafted segment in place of `[id]`. */
	app: (segment: string) => string;
	/** The upstream family this route means to call, without the mock's `/api` prefix. */
	family: string;
	/** What the builder writes after the segment, when it writes anything there. */
	suffix?: string;
	/** The smallest body this handler reads. */
	body?: unknown;
};

type CaseRow = {
	route: string;
	/** Which of `FORMS` this row measured. */
	form: string;
	/** The app's answer. */
	status: number;
	/** And its length, as measured on this lane. */
	body: number;
	cls: Class;
	/** Every upstream call the case produced, in the order the mock recorded them. */
	calls: Call[];
};

/**
 * The five spellings of one segment. A literal `../employee` is resolved by the HTTP client before it is sent
 * (`suites/lane-d/download-claims-guid-token.spec.ts:173-187` pins that 404), so every crafted form here is written
 * percent-encoded and reaches the handler decoded.
 */
const FORMS: Array<{ key: string; segment: string }> = [
	{ key: 'plain', segment: '2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d' }, // the control id
	{ key: 'slash', segment: '..%2Femployee' },
	{ key: 'dots', segment: '%2E%2E%2Femployee' },
	{ key: 'query', segment: 'x%3Fy%3D1' },
	{ key: 'hash', segment: 'x%23frag' }
];

const ROUTES: RouteSpec[] = [
	{
		key: 'op-setting',
		method: 'PUT',
		app: (segment) => `/api/organization-projects/setting/${segment}`,
		family: '/organization-projects/setting',
		body: {}
	},
	{
		key: 'op-put',
		method: 'PUT',
		app: (segment) => `/api/organization-projects/${segment}`,
		family: '/organization-projects',
		body: {}
	},
	{
		key: 'op-get',
		method: 'GET',
		app: (segment) => `/api/organization-projects/${segment}`,
		family: '/organization-projects'
	},
	{
		key: 'team-get',
		method: 'GET',
		app: (segment) => `/api/organization-team/${segment}`,
		family: '/organization-team'
	},
	{
		key: 'team-delete',
		method: 'DELETE',
		app: (segment) => `/api/organization-team/${segment}`,
		family: '/organization-team'
	},
	{
		key: 'team-emp-put',
		method: 'PUT',
		app: (segment) => `/api/organization-team-employee/${segment}`,
		family: '/organization-team-employee',
		body: {}
	},
	{
		key: 'team-emp-delete',
		method: 'DELETE',
		app: (segment) => `/api/organization-team-employee/${segment}`,
		family: '/organization-team-employee'
	},
	{
		key: 'issue-put',
		method: 'PUT',
		app: (segment) => `/api/issue-types/${segment}`,
		family: '/issue-types',
		body: {}
	},
	{
		key: 'label-delete',
		method: 'DELETE',
		app: (segment) => `/api/tags/${segment}`,
		family: '/tags'
	},
	{
		key: 'plan-get',
		method: 'GET',
		app: (segment) => `/api/daily-plan/${segment}`,
		family: '/daily-plan'
	},
	{
		key: 'plan-task-post',
		method: 'POST',
		app: (segment) => `/api/daily-plan/${segment}/task`,
		family: '/daily-plan',
		suffix: '/task',
		body: { tasks: [] }
	},
	{ key: 'role-delete', method: 'DELETE', app: (segment) => `/api/roles/${segment}`, family: '/roles' },
	{ key: 'task-get', method: 'GET', app: (segment) => `/api/tasks/${segment}`, family: '/tasks' },
	{ key: 'task-delete', method: 'DELETE', app: (segment) => `/api/tasks/${segment}`, family: '/tasks' },
	{
		key: 'link-delete',
		method: 'DELETE',
		app: (segment) => `/api/plugins/docs/links/${segment}`,
		family: '/plugins/docs/links'
	}
];

const routeOf = (key: string): RouteSpec => {
	const found = ROUTES.find((route) => route.key === key);
	if (!found) {
		throw new Error(`the pinned table names a route this file does not describe: ${key}`);
	}
	return found;
};

const segmentOf = (key: string): string => {
	const found = FORMS.find((form) => form.key === key);
	if (!found) {
		throw new Error(`the pinned table names a form this file does not define: ${key}`);
	}
	return found.segment;
};

/** Every case, pinned from the measured table in the comment above. */
const CASES: CaseRow[] = [
	// PUT /api/organization-projects/setting/[id]: app/api/organization-projects/setting/[id]/route.ts:24-29 hands
	// the param to editOrganizationProjectsSettingsRequest untouched.
	{
		route: 'op-setting',
		form: 'plain',
		status: 200,
		body: 2,
		cls: 'CONTAINED',
		calls: [
			{
				method: 'PUT',
				path: '/api/organization-projects/setting/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d',
				keys: [],
				status: 200
			}
		]
	},
	// measured, not intended: core/services/server/requests/organization-projects.ts:18 writes
	// `path: `/organization-projects/setting/${id}`` with nothing done to the id, so the decoded `../employee`
	// becomes `…/setting/../employee` and `fetch` resolves it to `…/employee`: the platform was asked to update an
	// employee with this caller's bearer (proved by `receivedTokens`) and this case's body.
	{
		route: 'op-setting',
		form: 'slash',
		status: 200,
		body: 2230,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/organization-projects/employee', keys: [], status: 200 }]
	},
	{
		route: 'op-setting',
		form: 'dots',
		status: 200,
		body: 2230,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/organization-projects/employee', keys: [], status: 200 }]
	},
	{
		route: 'op-setting',
		form: 'query',
		status: 200,
		body: 2,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/organization-projects/setting/x', keys: ['y'], status: 200 }]
	},
	{
		route: 'op-setting',
		form: 'hash',
		status: 200,
		body: 2,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/organization-projects/setting/x', keys: [], status: 200 }]
	},
	// PUT /api/organization-projects/[id]: the control. core/services/server/requests/organization-projects.ts:38
	// encodes the id first, so every crafted form below stays one path segment on the upstream side.
	{
		route: 'op-put',
		form: 'plain',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [
			{
				method: 'PUT',
				path: '/api/organization-projects/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d',
				keys: [],
				status: 200
			}
		]
	},
	{
		route: 'op-put',
		form: 'slash',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [{ method: 'PUT', path: '/api/organization-projects/..%2Femployee', keys: [], status: 200 }]
	},
	{
		route: 'op-put',
		form: 'dots',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [{ method: 'PUT', path: '/api/organization-projects/..%2Femployee', keys: [], status: 200 }]
	},
	{
		route: 'op-put',
		form: 'query',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [{ method: 'PUT', path: '/api/organization-projects/x%3Fy%3D1', keys: [], status: 200 }]
	},
	{
		route: 'op-put',
		form: 'hash',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [{ method: 'PUT', path: '/api/organization-projects/x%23frag', keys: [], status: 200 }]
	},
	// GET /api/organization-projects/[id]: the other control. organization-projects.ts:62-63 encodes the id and
	// then appends the client query; the crafted `?` and `#` never reach that query.
	{
		route: 'op-get',
		form: 'plain',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [
			{
				method: 'GET',
				path: '/api/organization-projects/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d',
				keys: [],
				status: 200
			}
		]
	},
	{
		route: 'op-get',
		form: 'slash',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [{ method: 'GET', path: '/api/organization-projects/..%2Femployee', keys: [], status: 200 }]
	},
	{
		route: 'op-get',
		form: 'dots',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [{ method: 'GET', path: '/api/organization-projects/..%2Femployee', keys: [], status: 200 }]
	},
	{
		route: 'op-get',
		form: 'query',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [{ method: 'GET', path: '/api/organization-projects/x%3Fy%3D1', keys: [], status: 200 }]
	},
	{
		route: 'op-get',
		form: 'hash',
		status: 200,
		body: 2230,
		cls: 'CONTAINED',
		calls: [{ method: 'GET', path: '/api/organization-projects/x%23frag', keys: [], status: 200 }]
	},
	// GET /api/organization-team/[id]: app/api/organization-team/[id]/route.ts:24-31 passes the param as `teamId`.
	{
		route: 'team-get',
		form: 'plain',
		status: 200,
		body: 27130,
		cls: 'CONTAINED',
		calls: [
			{
				method: 'GET',
				path: '/api/organization-team/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d',
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
		]
	},
	// measured, not intended: core/services/server/requests/organization-team.ts:168 writes
	// `path: `/organization-team/${teamId}?${queryString}`` raw. The `..` is resolved away and the platform was
	// asked at `GET /api/employee`; with the crafted `?` the recorded query loses its `organizationId` key
	// (swallowed into the injected value) and gains `y`.
	{
		route: 'team-get',
		form: 'slash',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [
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
		]
	},
	{
		route: 'team-get',
		form: 'dots',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [
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
		]
	},
	{
		route: 'team-get',
		form: 'query',
		status: 200,
		body: 27130,
		cls: 'ESCAPED',
		calls: [
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
	},
	{
		route: 'team-get',
		form: 'hash',
		status: 200,
		body: 27130,
		cls: 'ESCAPED',
		calls: [{ method: 'GET', path: '/api/organization-team/x', keys: [], status: 200 }]
	},
	// DELETE /api/organization-team/[id]: app/api/organization-team/[id]/route.ts:80-85 passes the param as `id`.
	{
		route: 'team-delete',
		form: 'plain',
		status: 200,
		body: 23,
		cls: 'CONTAINED',
		calls: [
			{
				method: 'DELETE',
				path: '/api/organization-team/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d',
				keys: ['organizationId'],
				status: 200
			}
		]
	},
	// measured, not intended: core/services/server/requests/organization-team.ts:119 writes
	// `path: `/organization-team/${id}?organizationId=${organizationId}`` raw: the delete reached
	// `DELETE /api/employee`, and the session `organizationId` is gone from the query once the crafted `?` is
	// in front of it.
	{
		route: 'team-delete',
		form: 'slash',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/employee', keys: ['organizationId'], status: 200 }]
	},
	{
		route: 'team-delete',
		form: 'dots',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/employee', keys: ['organizationId'], status: 200 }]
	},
	{
		route: 'team-delete',
		form: 'query',
		status: 200,
		body: 23,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/organization-team/x', keys: ['y'], status: 200 }]
	},
	{
		route: 'team-delete',
		form: 'hash',
		status: 200,
		body: 23,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/organization-team/x', keys: [], status: 200 }]
	},
	// PUT /api/organization-team-employee/[id]: app/api/organization-team-employee/[id]/route.ts:26-31.
	{
		route: 'team-emp-put',
		form: 'plain',
		status: 200,
		body: 2,
		cls: 'CONTAINED',
		calls: [
			{
				method: 'PUT',
				path: '/api/organization-team-employee/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d',
				keys: [],
				status: 200
			}
		]
	},
	// measured, not intended: core/services/server/requests/organization-team-employee.ts:40 writes
	// `path: `/organization-team-employee/${id}`` raw, so this PUT was delivered to `PUT /api/employee`.
	{
		route: 'team-emp-put',
		form: 'slash',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'team-emp-put',
		form: 'dots',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'team-emp-put',
		form: 'query',
		status: 200,
		body: 2,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/organization-team-employee/x', keys: ['y'], status: 200 }]
	},
	{
		route: 'team-emp-put',
		form: 'hash',
		status: 200,
		body: 2,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/organization-team-employee/x', keys: [], status: 200 }]
	},
	// DELETE /api/organization-team-employee/[id]: app/api/organization-team-employee/[id]/route.ts:54-61.
	{
		route: 'team-emp-delete',
		form: 'plain',
		status: 200,
		body: 42,
		cls: 'CONTAINED',
		calls: [
			{
				method: 'DELETE',
				path: '/api/organization-team-employee/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d',
				keys: ['employeeId', 'organizationId', 'organizationTeamId', 'tenantId'],
				status: 200
			}
		]
	},
	// measured, not intended: core/services/server/requests/organization-team-employee.ts:20 writes the whole
	// query by hand behind the raw id, so the crafted `?` swallows the session `tenantId` into `y` and the delete
	// itself reached `DELETE /api/employee`.
	{
		route: 'team-emp-delete',
		form: 'slash',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [
			{
				method: 'DELETE',
				path: '/api/employee',
				keys: ['employeeId', 'organizationId', 'organizationTeamId', 'tenantId'],
				status: 200
			}
		]
	},
	{
		route: 'team-emp-delete',
		form: 'dots',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [
			{
				method: 'DELETE',
				path: '/api/employee',
				keys: ['employeeId', 'organizationId', 'organizationTeamId', 'tenantId'],
				status: 200
			}
		]
	},
	{
		route: 'team-emp-delete',
		form: 'query',
		status: 200,
		body: 42,
		cls: 'ESCAPED',
		calls: [
			{
				method: 'DELETE',
				path: '/api/organization-team-employee/x',
				keys: ['employeeId', 'organizationId', 'organizationTeamId', 'y'],
				status: 200
			}
		]
	},
	{
		route: 'team-emp-delete',
		form: 'hash',
		status: 200,
		body: 42,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/organization-team-employee/x', keys: [], status: 200 }]
	},
	// PUT /api/issue-types/[id]: app/api/issue-types/[id]/route.ts:21-26.
	{
		route: 'issue-put',
		form: 'plain',
		status: 200,
		body: 2,
		cls: 'CONTAINED',
		calls: [{ method: 'PUT', path: '/api/issue-types/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d', keys: [], status: 200 }]
	},
	// measured, not intended: core/services/server/requests/issue-type.ts:27 writes `path: `/issue-types/${id}``
	// raw; `…/issue-types/../employee` is `…/employee` by the time `fetch` parses it.
	{
		route: 'issue-put',
		form: 'slash',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'issue-put',
		form: 'dots',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'issue-put',
		form: 'query',
		status: 200,
		body: 2,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/issue-types/x', keys: ['y'], status: 200 }]
	},
	{
		route: 'issue-put',
		form: 'hash',
		status: 200,
		body: 2,
		cls: 'ESCAPED',
		calls: [{ method: 'PUT', path: '/api/issue-types/x', keys: [], status: 200 }]
	},
	// DELETE /api/tags/[id]: app/api/tags/[id]/route.ts:24-28.
	{
		route: 'label-delete',
		form: 'plain',
		status: 200,
		body: 23,
		cls: 'CONTAINED',
		calls: [{ method: 'DELETE', path: '/api/tags/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d', keys: [], status: 200 }]
	},
	// measured, not intended: core/services/server/requests/task-labels.ts:47 writes `path: `/tags/${id}`` raw,
	// so a delete of a label was delivered as `DELETE /api/employee`.
	{
		route: 'label-delete',
		form: 'slash',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'label-delete',
		form: 'dots',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'label-delete',
		form: 'query',
		status: 200,
		body: 23,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/tags/x', keys: ['y'], status: 200 }]
	},
	{
		route: 'label-delete',
		form: 'hash',
		status: 200,
		body: 23,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/tags/x', keys: [], status: 200 }]
	},
	// GET /api/daily-plan/[id]: app/api/daily-plan/[id]/route.ts:18-22 passes the param as `planId`.
	{
		route: 'plan-get',
		form: 'plain',
		status: 200,
		body: 22,
		cls: 'CONTAINED',
		calls: [{ method: 'GET', path: '/api/daily-plan/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d', keys: [], status: 200 }]
	},
	// measured, not intended: core/services/server/requests/daily-plan.ts:169 writes `path: `/daily-plan/${planId}``
	// raw, so the read reached `GET /api/employee`.
	{
		route: 'plan-get',
		form: 'slash',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'GET', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'plan-get',
		form: 'dots',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'GET', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'plan-get',
		form: 'query',
		status: 200,
		body: 22,
		cls: 'ESCAPED',
		calls: [{ method: 'GET', path: '/api/daily-plan/x', keys: ['y'], status: 200 }]
	},
	{
		route: 'plan-get',
		form: 'hash',
		status: 200,
		body: 22,
		cls: 'ESCAPED',
		calls: [{ method: 'GET', path: '/api/daily-plan/x', keys: [], status: 200 }]
	},
	// POST /api/daily-plan/[id]/task: app/api/daily-plan/[id]/task/route.ts:8-10 re-exports the POST of
	// app/api/daily-plan/plan/[planId]/route.ts:7-30, which passes `planId` to addTaskToDailyPlanRequest.
	{
		route: 'plan-task-post',
		form: 'plain',
		status: 200,
		body: 12,
		cls: 'CONTAINED',
		calls: [
			{ method: 'POST', path: '/api/daily-plan/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d/task', keys: [], status: 200 }
		]
	},
	// measured, not intended: core/services/server/requests/daily-plan.ts:227 writes
	// `path: `/daily-plan/${planId}/task`` raw, so the crafted id took the POST to `POST /api/employee/task`, and
	// the crafted `?` moved the `/task` suffix into the upstream query (`y=1/task`).
	{
		route: 'plan-task-post',
		form: 'slash',
		status: 200,
		body: 12,
		cls: 'ESCAPED',
		calls: [{ method: 'POST', path: '/api/employee/task', keys: [], status: 200 }]
	},
	{
		route: 'plan-task-post',
		form: 'dots',
		status: 200,
		body: 12,
		cls: 'ESCAPED',
		calls: [{ method: 'POST', path: '/api/employee/task', keys: [], status: 200 }]
	},
	{
		route: 'plan-task-post',
		form: 'query',
		status: 200,
		body: 12,
		cls: 'ESCAPED',
		calls: [{ method: 'POST', path: '/api/daily-plan/x', keys: ['y'], status: 200 }]
	},
	{
		route: 'plan-task-post',
		form: 'hash',
		status: 200,
		body: 12,
		cls: 'ESCAPED',
		calls: [{ method: 'POST', path: '/api/daily-plan/x', keys: [], status: 200 }]
	},
	// DELETE /api/roles/[id]: app/api/roles/[id]/route.ts:46-50.
	{
		route: 'role-delete',
		form: 'plain',
		status: 200,
		body: 23,
		cls: 'CONTAINED',
		calls: [{ method: 'DELETE', path: '/api/roles/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d', keys: [], status: 200 }]
	},
	// measured, not intended: core/services/server/requests/roles.ts:72 writes `path: `/roles/${id}`` raw, so this
	// delete reached `DELETE /api/employee`.
	{
		route: 'role-delete',
		form: 'slash',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'role-delete',
		form: 'dots',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/employee', keys: [], status: 200 }]
	},
	{
		route: 'role-delete',
		form: 'query',
		status: 200,
		body: 23,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/roles/x', keys: ['y'], status: 200 }]
	},
	{
		route: 'role-delete',
		form: 'hash',
		status: 200,
		body: 23,
		cls: 'ESCAPED',
		calls: [{ method: 'DELETE', path: '/api/roles/x', keys: [], status: 200 }]
	},
	// GET /api/tasks/[id]: app/api/tasks/[id]/route.ts:22-27 passes the param as `taskId`.
	{
		route: 'task-get',
		form: 'plain',
		status: 200,
		body: 2841,
		cls: 'CONTAINED',
		calls: [
			{
				method: 'GET',
				path: '/api/tasks/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d',
				keys: [
					'includeRootEpic',
					'join[alias]',
					'join[leftJoinAndSelect][members]',
					'join[leftJoinAndSelect][user]',
					'relations[0]',
					'relations[10]',
					'relations[11]',
					'relations[1]',
					'relations[2]',
					'relations[3]',
					'relations[4]',
					'relations[5]',
					'relations[6]',
					'relations[7]',
					'relations[8]',
					'relations[9]',
					'where[organizationId]',
					'where[tenantId]'
				],
				status: 200
			}
		]
	},
	// measured, not intended: core/services/server/requests/tasks.ts:119 writes `path: `/tasks/${taskId}?${query}``
	// raw: the read reached `GET /api/employee`, and with the crafted `?` the recorded query lost
	// `where[organizationId]` (swallowed into the injected value) and gained `y`.
	{
		route: 'task-get',
		form: 'slash',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [
			{
				method: 'GET',
				path: '/api/employee',
				keys: [
					'includeRootEpic',
					'join[alias]',
					'join[leftJoinAndSelect][members]',
					'join[leftJoinAndSelect][user]',
					'relations[0]',
					'relations[10]',
					'relations[11]',
					'relations[1]',
					'relations[2]',
					'relations[3]',
					'relations[4]',
					'relations[5]',
					'relations[6]',
					'relations[7]',
					'relations[8]',
					'relations[9]',
					'where[organizationId]',
					'where[tenantId]'
				],
				status: 200
			}
		]
	},
	{
		route: 'task-get',
		form: 'dots',
		status: 200,
		body: 13029,
		cls: 'ESCAPED',
		calls: [
			{
				method: 'GET',
				path: '/api/employee',
				keys: [
					'includeRootEpic',
					'join[alias]',
					'join[leftJoinAndSelect][members]',
					'join[leftJoinAndSelect][user]',
					'relations[0]',
					'relations[10]',
					'relations[11]',
					'relations[1]',
					'relations[2]',
					'relations[3]',
					'relations[4]',
					'relations[5]',
					'relations[6]',
					'relations[7]',
					'relations[8]',
					'relations[9]',
					'where[organizationId]',
					'where[tenantId]'
				],
				status: 200
			}
		]
	},
	{
		route: 'task-get',
		form: 'query',
		status: 200,
		body: 2841,
		cls: 'ESCAPED',
		calls: [
			{
				method: 'GET',
				path: '/api/tasks/x',
				keys: [
					'includeRootEpic',
					'join[alias]',
					'join[leftJoinAndSelect][members]',
					'join[leftJoinAndSelect][user]',
					'relations[0]',
					'relations[10]',
					'relations[11]',
					'relations[1]',
					'relations[2]',
					'relations[3]',
					'relations[4]',
					'relations[5]',
					'relations[6]',
					'relations[7]',
					'relations[8]',
					'relations[9]',
					'where[tenantId]',
					'y'
				],
				status: 200
			}
		]
	},
	{
		route: 'task-get',
		form: 'hash',
		status: 200,
		body: 2841,
		cls: 'ESCAPED',
		calls: [{ method: 'GET', path: '/api/tasks/x', keys: [], status: 200 }]
	},
	// DELETE /api/tasks/[id]: the third control. app/api/tasks/[id]/route.ts:83-84 encodes the id in the route
	// itself (`encodeURIComponent(params.id)`), so nothing crafted reaches the upstream path.
	{
		route: 'task-delete',
		form: 'plain',
		status: 200,
		body: 23,
		cls: 'CONTAINED',
		calls: [{ method: 'DELETE', path: '/api/tasks/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d', keys: [], status: 200 }]
	},
	{
		route: 'task-delete',
		form: 'slash',
		status: 200,
		body: 23,
		cls: 'CONTAINED',
		calls: [{ method: 'DELETE', path: '/api/tasks/..%2Femployee', keys: [], status: 200 }]
	},
	{
		route: 'task-delete',
		form: 'dots',
		status: 200,
		body: 23,
		cls: 'CONTAINED',
		calls: [{ method: 'DELETE', path: '/api/tasks/..%2Femployee', keys: [], status: 200 }]
	},
	{
		route: 'task-delete',
		form: 'query',
		status: 200,
		body: 23,
		cls: 'CONTAINED',
		calls: [{ method: 'DELETE', path: '/api/tasks/x%3Fy%3D1', keys: [], status: 200 }]
	},
	{
		route: 'task-delete',
		form: 'hash',
		status: 200,
		body: 23,
		cls: 'CONTAINED',
		calls: [{ method: 'DELETE', path: '/api/tasks/x%23frag', keys: [], status: 200 }]
	},
	// DELETE /api/plugins/docs/links/[id]: the refusing control. app/api/plugins/docs/links/[id]/route.ts:8 is
	// `const linkIdSchema = z.guid()` and `:14-17` answers 400 before the builder runs, so a crafted segment never
	// reaches core/services/server/requests/entity-files.ts:62, which would have written it raw.
	{
		route: 'link-delete',
		form: 'plain',
		status: 200,
		body: 23,
		cls: 'CONTAINED',
		calls: [
			{
				method: 'DELETE',
				path: '/api/plugins/docs/links/2f7e0b3a-4a53-4a1c-9c0e-8d7b6a5f4e3d',
				keys: [],
				status: 200
			}
		]
	},
	{ route: 'link-delete', form: 'slash', status: 400, body: 33, cls: 'REFUSED', calls: [] },
	{ route: 'link-delete', form: 'dots', status: 400, body: 33, cls: 'REFUSED', calls: [] },
	{ route: 'link-delete', form: 'query', status: 400, body: 33, cls: 'REFUSED', calls: [] },
	{ route: 'link-delete', form: 'hash', status: 400, body: 33, cls: 'REFUSED', calls: [] }
];

/**
 * `authenticatedGuard` checks the token at `/user/me` (core/services/server/guards/authenticated-guard-app.ts:76) and
 * `SessionCheckMemo` (`:29-31`) reuses that answer for the same token for 5 s, so this entry is in some logs and not
 * in others. It is never a call on the crafted id, so it is not part of any case.
 */
const GUARD_CALL = '/api/user/me';

/**
 * The upstream path this route would be asking for if the segment stayed one piece: the family, the whole segment
 * percent-encoded, and whatever the builder writes after it. Percent-encoding is what keeps a decoded `/`, `?` or `#`
 * inside one path segment, which is exactly what `encodeURIComponent(id)` does in the three encoded builders.
 */
const containedPath = (route: RouteSpec, segment: string): string =>
	`/api${route.family}/${encodeURIComponent(decodeURIComponent(segment))}${route.suffix ?? ''}`;

/** The class of a case, decided from the recorded calls and nothing else. */
function classify(route: RouteSpec, segment: string, calls: Call[]): Class {
	if (calls.length === 0) {
		return 'REFUSED';
	}
	const wanted = containedPath(route, segment);
	return calls.every((call) => call.path === wanted) ? 'CONTAINED' : 'ESCAPED';
}

/** The mock's log as this file reads it: the guard's read dropped, each call's query reduced to its key names. */
const resourceCalls = (log: StubRequest[]): Call[] =>
	log
		.filter((entry) => entry.path !== GUARD_CALL)
		.map((entry) => ({
			method: entry.method,
			path: entry.path,
			keys: Array.from(new Set(new URLSearchParams(entry.query).keys())).sort(),
			status: entry.status
		}));

test.describe('lane-d · a crafted path segment against the builders that interpolate an id raw', () => {
	for (const pinned of CASES) {
		const route = routeOf(pinned.route);
		const segment = segmentOf(pinned.form);

		test(`${pinned.route} · ${pinned.form} ${segment} · ${pinned.cls}`, async ({ api }) => {
			const path = route.app(segment);
			const response = await api(path, {
				method: route.method,
				...(route.body === undefined ? {} : { body: route.body })
			});
			const answer = await response.text();
			const log = await mockRequests();
			const calls = resourceCalls(log);
			const witness = `${route.method} ${path} · app ${response.status()} body(${answer.length}) ${answer.slice(
				0,
				60
			)} · mock ${logOf(log)}`;

			expect(response.status(), `the app answer changed: ${witness}`).toBe(pinned.status);
			// Only a refusal's length is this app's own answer. Every other body is the mock's fixture payload for the
			// endpoint that was reached, whose size says nothing about which endpoint that was — the recorded call does.
			if (pinned.cls === 'REFUSED') {
				expect(answer.length, `the refusal body changed: ${witness}`).toBe(pinned.body);
			}
			expect(calls, `the platform was asked for something else than measured: ${witness}`).toEqual(pinned.calls);
			expect(classify(route, segment, calls), `this case is no longer ${pinned.cls}: ${witness}`).toBe(
				pinned.cls
			);

			// An escaped call matters because it left with this caller's own session. The mock hashed a bearer for the
			// endpoint the case really reached, so the platform was addressed with this case's token and its body.
			if (pinned.cls === 'ESCAPED') {
				for (const call of pinned.calls) {
					const bearers = await receivedTokens(call.path);
					expect(
						bearers.length,
						`the escaped call reached ${call.path} without this case's bearer: ${witness}`
					).toBeGreaterThan(0);
				}
			}
		});
	}
});
