/**
 * @jest-environment node
 */
/**
 * The proxy routes that hand a write on to Gauzy (forwardToGauzy, with refuseUnlessPermitted before it on the routes
 * that check a permission) act with the session's cookies, which a browser also attaches to a request another site
 * makes: a page of a sibling subdomain, or of any site when the cookies are SameSite=None. forwardToGauzy refuses a
 * form, but a write with no body needs neither a type nor a CORS preflight, so such a page could archive a
 * conversation, rotate a webhook's secret or start an import as the signed-in person. Every one of these write
 * handlers now refuses a request of another page than this app's before anything reaches Gauzy, and still serves this
 * app's own pages and a client that sends no Origin (no browser). The routes that do not forward are in
 * legacy-session-writes-origin.test.ts (#5381).
 *
 * The handlers are read from app/api itself (test/api/write-handlers.ts), so a forwarding write added later is in this
 * table too.
 */
import { GAUZY_API_SERVER_URL, TENANT_ID_COOKIE_NAME, TOKEN_COOKIE_NAME } from '@/core/constants/config/constants';
import {
	CLIENT_ARCHIVE_PERMISSIONS,
	CLIENT_CREATE_PERMISSIONS,
	CLIENT_EDIT_PERMISSIONS
} from '@/core/lib/utils/clients';
import { ORGANIZATION_DELETE_PERMISSIONS } from '@/core/lib/utils/organization-deletion';
import { APP_ORIGIN, FOREIGN_ORIGIN_HEADERS, SAME_ORIGIN_HEADERS } from '@/test/api/request-origin';
import { forwardsThroughProxyHelper, writeHandlers, type WriteMethod } from '@/test/api/write-handlers';

const FORWARDED_WRITES: ReadonlyArray<[route: string, method: WriteMethod]> = writeHandlers()
	.filter(forwardsThroughProxyHelper)
	.map(({ route, method }) => [route, method]);

const ID = '3db49a7e-69d2-471a-9495-3b69ece6fc54';

type RouteContext = { params: Promise<Record<string, string | string[]>> };
type Handler = (req: Request, context: RouteContext) => Promise<Response | undefined> | Response | undefined;

/** What Next hands the dynamic route: an id for each `[segment]`, one segment for a `[...rest]`. */
function contextOf(route: string): RouteContext {
	const params: Record<string, string | string[]> = {};
	for (const [, rest, name] of route.matchAll(/\[(\.\.\.)?([^\]]+)\]/g)) params[name] = rest ? [ID] : ID;
	return { params: Promise.resolve(params) };
}

/**
 * A write with the cookies of a signed-in browser and no body or type: what a page of another site can send without a
 * CORS preflight (`fetch(url, { method: 'POST', mode: 'no-cors', credentials: 'include' })`).
 */
function write(route: string, method: WriteMethod, headers: Record<string, string> = {}): Request {
	return new Request(`${APP_ORIGIN}/api/${route.replace(/\[[^\]]+\]/g, ID)}`, {
		method,
		headers: { cookie: `${TOKEN_COOKIE_NAME}=session-token; ${TENANT_ID_COOKIE_NAME}=tenant-1`, ...headers }
	});
}

async function handlerOf(route: string, method: WriteMethod): Promise<Handler> {
	const routeModule = (await import(`@/app/api/${route}/route`)) as Partial<Record<WriteMethod, Handler>>;
	const handler = routeModule[method];
	if (!handler) throw new Error(`app/api/${route} has no ${method}`);
	return handler;
}

const CROSS_SITE_REFUSAL = { statusCode: 403, message: 'Cross-site request refused' };

const PERMISSIONS_READ = `${GAUZY_API_SERVER_URL}/role-permissions/me`;

/**
 * Every permission the permission-checked forwarding routes ask for: invoices (with client rates and everyone's time),
 * clients, the timer's start and an organization's deletion.
 */
const ROLE_PERMISSIONS = [
	'INVOICES_VIEW',
	'INVOICES_EDIT',
	'CHANGE_SELECTED_EMPLOYEE',
	'ORG_EMPLOYEES_EDIT',
	'TIME_TRACKER',
	'ALLOW_MODIFY_TIME',
	...CLIENT_CREATE_PERMISSIONS,
	...CLIENT_EDIT_PERMISSIONS,
	...CLIENT_ARCHIVE_PERMISSIONS,
	...ORGANIZATION_DELETE_PERMISSIONS
].map((permission) => ({ permission, enabled: true }));

const originalFetch = global.fetch;
// Gauzy grants the role every permission a route asks for, and accepts the write itself
const fetchMock: jest.Mock<Promise<Response>, [string, RequestInit?]> = jest.fn((url: string) =>
	Promise.resolve(Response.json(url === PERMISSIONS_READ ? ROLE_PERMISSIONS : {}, { status: 200 }))
);

beforeEach(() => {
	jest.clearAllMocks();
	global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
	global.fetch = originalFetch;
});

it('reads the forwarding write handlers of app/api', () => {
	expect(FORWARDED_WRITES.length).toBeGreaterThan(100);
	expect(FORWARDED_WRITES).toContainEqual(['timer/started-at', 'PUT']);
	expect(FORWARDED_WRITES).toContainEqual(['chat/webhooks/[id]/secret', 'POST']);
});

describe.each(FORWARDED_WRITES)('%s %s', (route, method) => {
	it.each(FOREIGN_ORIGIN_HEADERS)('is refused from %s, before anything reaches Gauzy', async (_label, headers) => {
		const handler = await handlerOf(route, method);
		const req = write(route, method, headers);

		const response = await handler(req, contextOf(route));

		expect(response?.status).toBe(403);
		await expect(response?.json()).resolves.toEqual(CROSS_SITE_REFUSAL);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it.each([
		["this app's own pages", SAME_ORIGIN_HEADERS],
		['a client that sends no Origin', {}]
	])('reaches Gauzy from %s', async (_label, headers) => {
		const handler = await handlerOf(route, method);

		const response = await handler(write(route, method, headers), contextOf(route));

		// The write itself reaches Gauzy, with its own method, after the permission read of a route that checks one
		expect(response?.status).toBe(200);
		const writes = fetchMock.mock.calls.filter(([url]) => url !== PERMISSIONS_READ);
		expect(writes).toHaveLength(1);
		const [url, init] = writes[0];
		expect(url.startsWith(`${GAUZY_API_SERVER_URL}/`)).toBe(true);
		expect(init?.method).toBe(method);
	});
});
