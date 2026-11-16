/**
 * @jest-environment node
 */
/**
 * The proxy routes that predate forwardToGauzy read the session from the cookies themselves, and most read their body
 * whatever its declared type (or take none), so a form another site posted with those cookies reached them: a page of
 * a sibling subdomain, or of any site when the cookies are SameSite=None, could start the timer, change a task or
 * reset someone's two-factor as the signed-in person. Each write handler below refuses a request of another page than
 * this app's (`refuseForeignOrigin`) before it reads the session or the body, and still serves this app's own pages
 * and a client that sends no Origin (no browser). The newer routes got the same guard in #5376.
 *
 * The session checks (authenticatedGuard, and routeSession for the Ever Platform routes) are stand-ins that answer
 * "signed out": a request that gets past the origin check stops there, and no request leaves the test.
 */
import { NextResponse } from 'next/server';
import { TENANT_ID_COOKIE_NAME, TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';
import { APP_ORIGIN, FOREIGN_ORIGIN_HEADERS, SAME_ORIGIN_HEADERS } from '@/test/api/request-origin';

const mockAuthenticatedGuard = jest.fn();
const mockRouteSession = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	...jest.requireActual('@/core/services/server/guards/authenticated-guard-app'),
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/ever-platform/route-helpers', () => ({
	...jest.requireActual('@/core/services/server/ever-platform/route-helpers'),
	routeSession: (...args: unknown[]) => mockRouteSession(...args)
}));

type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Every write handler of these routes (under app/api) acts on the session of the cookies. */
const SESSION_WRITES: ReadonlyArray<[route: string, method: WriteMethod]> = [
	['ai/transcribe', 'POST'],
	['ai/voice-fill', 'POST'],
	['auth/create-workspace', 'POST'],
	['auth/two-factor/confirm', 'POST'],
	['auth/two-factor/disable', 'POST'],
	['auth/two-factor/enroll', 'POST'],
	['auth/two-factor/recovery-codes', 'POST'],
	['auth/two-factor/users/[userId]', 'DELETE'],
	['auth/verify/code', 'POST'],
	['auth/verify/resend-link', 'POST'],
	['chat', 'POST'],
	['comment', 'POST'],
	['comment/[id]', 'DELETE'],
	['comment/[id]', 'PUT'],
	['daily-plan', 'POST'],
	['daily-plan/[id]', 'DELETE'],
	['daily-plan/[id]', 'PUT'],
	['daily-plan/[id]/remove', 'PUT'],
	['daily-plan/[id]/task', 'POST'],
	['daily-plan/[id]/task', 'PUT'],
	['daily-plan/plan/[planId]', 'POST'],
	['daily-plan/plan/[planId]', 'PUT'],
	['editor-assist', 'POST'],
	['email-reset/request-change-email', 'POST'],
	['email-reset/verify-change-email', 'POST'],
	['employee-appointment', 'POST'],
	['employee-appointment/[id]', 'DELETE'],
	['employee-appointment/[id]', 'PUT'],
	['employee-notification-setting', 'POST'],
	['employee-notification-setting/[id]', 'PUT'],
	['employee-notification/[id]', 'PUT'],
	['employee-notification/mark-all-read', 'PUT'],
	['employee/[id]', 'PUT'],
	['employee/[id]/profile', 'PUT'],
	['employee/me/presence', 'PUT'],
	['employee/rate-change-request', 'POST'],
	['ever-connect/[...path]', 'DELETE'],
	['ever-connect/[...path]', 'POST'],
	['ever-connect/[...path]', 'PUT'],
	['ever-stats/enabled', 'PUT'],
	['favorite', 'POST'],
	['favorite/[id]', 'DELETE'],
	['image-assets/upload/[folder]', 'POST'],
	['integration-tenant/[id]', 'DELETE'],
	['integration/github/install', 'POST'],
	['integration/github/oauth', 'POST'],
	['integration/github/repository/sync', 'POST'],
	['invite/[id]', 'DELETE'],
	['invite/[id]', 'PUT'],
	['invite/emails', 'POST'],
	['invite/resend', 'POST'],
	['issue-types', 'POST'],
	['issue-types/[id]', 'DELETE'],
	['issue-types/[id]', 'PUT'],
	['organization-projects', 'POST'],
	['organization-projects/[id]', 'PUT'],
	['organization-projects/[id]/members/[employeeId]/rate', 'PUT'],
	['organization-projects/[id]/rate', 'PUT'],
	['organization-projects/setting/[id]', 'PUT'],
	['organization-team', 'POST'],
	['organization-team-employee/[id]', 'DELETE'],
	['organization-team-employee/[id]', 'PUT'],
	['organization-team-employee/[id]/active-task', 'PUT'],
	['organization-team-join/[id]/[action]', 'PUT'],
	['organization-team/[id]', 'DELETE'],
	['organization-team/[id]', 'PUT'],
	['organization-team/employee/[id]', 'DELETE'],
	['organization-team/employee/[id]', 'PUT'],
	['organization-team/teams/[id]', 'DELETE'],
	['plugins/docs/documents/upload', 'POST'],
	['plugins/docs/links', 'POST'],
	['plugins/docs/links/[id]', 'DELETE'],
	['role-permissions/[id]', 'PUT'],
	['roles', 'POST'],
	['roles/[id]', 'DELETE'],
	['roles/[id]', 'PUT'],
	['roles/options', 'POST'],
	['subscribe', 'POST'],
	['tags', 'POST'],
	['tags/[id]', 'DELETE'],
	['tags/[id]', 'PUT'],
	['tags/bulk', 'POST'],
	['task-priorities', 'POST'],
	['task-priorities/[id]', 'DELETE'],
	['task-priorities/[id]', 'PUT'],
	['task-related-issue-types', 'POST'],
	['task-related-issue-types/[id]', 'DELETE'],
	['task-related-issue-types/[id]', 'PUT'],
	['task-sizes', 'POST'],
	['task-sizes/[id]', 'DELETE'],
	['task-sizes/[id]', 'PUT'],
	['task-statuses', 'POST'],
	['task-statuses/[id]', 'DELETE'],
	['task-statuses/[id]', 'PUT'],
	['task-versions', 'POST'],
	['task-versions/[id]', 'DELETE'],
	['task-versions/[id]', 'PUT'],
	['tasks/[id]', 'PUT'],
	['tasks/employee/[employeeId]', 'DELETE'],
	['tasks/task-linked-issue', 'POST'],
	['tasks/task-linked-issue', 'PUT'],
	['tasks/task-linked-issue/[id]', 'DELETE'],
	['tasks/team', 'POST'],
	['tenant', 'PUT'],
	['timer/discard', 'POST'],
	['timer/slot', 'DELETE'],
	['timer/start', 'POST'],
	['timer/stop', 'POST'],
	['timer/sync', 'POST'],
	['timer/timesheet/bulk-delete', 'DELETE'],
	['timer/timesheet/status', 'PUT'],
	['timer/timesheet/time-log', 'POST'],
	['timer/timesheet/time-log/[id]', 'PUT'],
	['timer/toggle', 'POST'],
	['timer/toogle', 'POST'],
	['user-api-tokens', 'POST'],
	['user-api-tokens/[id]', 'DELETE'],
	['user/[id]', 'DELETE'],
	['user/[id]', 'PUT'],
	['user/[id]/role', 'PUT'],
	['user/reset', 'DELETE']
];

/** The Ever Platform routes read the session's token from the cookies directly (routeSession), not through the guard. */
const READS_COOKIES_DIRECTLY = new Set(['ever-connect/[...path]', 'ever-stats/enabled']);

/** The session check `route` reaches once a request gets past the origin check. */
function sessionCheckOf(route: string): jest.Mock {
	return READS_COOKIES_DIRECTLY.has(route) ? mockRouteSession : mockAuthenticatedGuard;
}

const ID = '3db49a7e-69d2-471a-9495-3b69ece6fc54';

/** The body a route checks before the session (every other route gets `{}`). */
const BODIES: Record<string, unknown> = {
	'timer/timesheet/bulk-delete': { logIds: [ID] }
};

/** One ever-connect write rule of each method (connect-proxy-rules.ts): anything else is its 404. */
const EVER_CONNECT_PATHS: Partial<Record<WriteMethod, string[]>> = {
	POST: ['integrations', 'refresh'],
	PUT: ['integrations', 'jira'],
	DELETE: ['links', ID]
};

type RouteContext = { params: Promise<Record<string, string | string[]>> };

/** What Next hands the dynamic route: every segment name these routes use. */
function contextOf(method: WriteMethod): RouteContext {
	return {
		params: Promise.resolve({
			id: ID,
			employeeId: ID,
			planId: ID,
			userId: ID,
			folder: 'profile_pictures',
			action: 'accept',
			path: EVER_CONNECT_PATHS[method] ?? []
		})
	};
}

type Handler = (req: Request, context: RouteContext) => Promise<Response | undefined> | Response | undefined;

const SIGNED_OUT = {
	user: null,
	status: 401,
	access_token: '',
	tenantId: '',
	organizationId: '',
	teamId: '',
	$res: (data: unknown) => NextResponse.json(data, { status: 401 }),
	deny: () => NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
};

const CROSS_SITE_REFUSAL = { statusCode: 403, message: 'Cross-site request refused' };

const originalFetch = global.fetch;
const fetchMock = jest.fn(() => Promise.reject(new Error('No request leaves this test')));

const ORIGINAL_ENV = process.env;

beforeAll(() => {
	// The Ever Platform routes are mounted, so a write gets as far as their session check
	process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_EVER_CONNECT_ENABLED: 'true', EVER_STATS_ENABLED: 'true' };
});

beforeEach(() => {
	jest.clearAllMocks();
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_OUT);
	mockRouteSession.mockReturnValue(null);
	global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
	global.fetch = originalFetch;
	process.env = ORIGINAL_ENV;
});

async function handlerOf(route: string, method: WriteMethod): Promise<Handler> {
	const routeModule = (await import(`@/app/api/${route}/route`)) as Partial<Record<WriteMethod, Handler>>;
	const handler = routeModule[method];
	if (!handler) throw new Error(`app/api/${route} has no ${method}`);
	return handler;
}

/** A JSON write to the route, with the cookies of a signed-in browser and the origin headers given. */
function write(route: string, method: WriteMethod, headers: Record<string, string> = {}): Request {
	const path = route.replace(/\[[^\]]+\]/g, ID);
	return new Request(`${APP_ORIGIN}/api/${path}`, {
		method,
		headers: {
			'content-type': 'application/json',
			cookie: `${TOKEN_COOKIE_NAME}=session-token; ${TENANT_ID_COOKIE_NAME}=tenant-1`,
			...headers
		},
		body: JSON.stringify(BODIES[route] ?? {})
	});
}

async function isCrossSiteRefusal(response: Response | undefined): Promise<boolean> {
	if (response?.status !== 403) return false;
	const body: unknown = await response
		.clone()
		.json()
		.catch(() => null);
	return JSON.stringify(body) === JSON.stringify(CROSS_SITE_REFUSAL);
}

describe.each(SESSION_WRITES)('%s %s', (route, method) => {
	it.each(FOREIGN_ORIGIN_HEADERS)(
		'is refused from %s, before the session or the body is read',
		async (_label, headers) => {
			const handler = await handlerOf(route, method);
			const req = write(route, method, headers);

			const response = await handler(req, contextOf(method));

			expect(response?.status).toBe(403);
			await expect(response?.json()).resolves.toEqual(CROSS_SITE_REFUSAL);
			expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
			expect(mockRouteSession).not.toHaveBeenCalled();
			expect(fetchMock).not.toHaveBeenCalled();
			expect(req.bodyUsed).toBe(false);
		}
	);

	it.each([
		["this app's own pages", SAME_ORIGIN_HEADERS],
		['a client that sends no Origin', {}]
	])('reaches the session check from %s', async (_label, headers) => {
		const handler = await handlerOf(route, method);
		const req = write(route, method, headers);

		const response = await handler(req, contextOf(method));

		await expect(isCrossSiteRefusal(response)).resolves.toBe(false);
		// The check of the route's own session, with this very request
		expect(sessionCheckOf(route)).toHaveBeenCalledTimes(1);
		expect(sessionCheckOf(route).mock.calls[0][0]).toBe(req);
	});
});
