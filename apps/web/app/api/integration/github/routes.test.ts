/**
 * In proxy mode the browser asks /api/integration/github/{metadata,repositories}?integrationId=<id>, and the route
 * asks Gauzy for /integration/github/<id>/{metadata,repositories} as direct mode does (ever-co/ever-teams#4817). The
 * routes used to read integrationId as a property of URLSearchParams, so Gauzy was asked for
 * /integration/github/undefined/... and the GitHub team settings never loaded.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET as getMetadata } from './metadata/route';
import { GET as getRepositories } from './repositories/route';

const originalFetch = global.fetch;
let fetchMock: jest.Mock;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (payload: unknown) => Response.json(payload),
		user: { id: 'user-1' },
		access_token: 'access-token',
		tenantId: 'tenant-1',
		organizationId: 'organization-1'
	});
	fetchMock = jest.fn().mockResolvedValue(Response.json({}, { status: 200 }));
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

/** The URL Gauzy was asked for. */
function upstreamUrl(): URL {
	const [requestedUrl] = fetchMock.mock.calls[0];
	return new URL(String(requestedUrl));
}

/** The browser's proxy-mode request for `resource` of the integration `integrationId`. */
function proxyRequest(resource: string, integrationId: string): Request {
	const query = new URLSearchParams({ integrationId });
	return new Request(`https://app.ever.team/api/integration/github/${resource}?${query}`);
}

describe.each([
	['metadata', getMetadata],
	['repositories', getRepositories]
])('GET /api/integration/github/%s', (resource, handler) => {
	it('asks Gauzy for the integration the request names, in the signed-in tenant and organization', async () => {
		const response = await handler(proxyRequest(resource, 'integration-1'));

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const upstream = upstreamUrl();
		expect(upstream.pathname.endsWith(`/integration/github/integration-1/${resource}`)).toBe(true);
		expect(Object.fromEntries(upstream.searchParams)).toEqual({
			tenantId: 'tenant-1',
			organizationId: 'organization-1'
		});
	});

	it('keeps the integration id in one path segment', async () => {
		await handler(proxyRequest(resource, 'integration/1'));

		const upstreamPath = upstreamUrl().pathname;
		expect(upstreamPath.endsWith(`/integration/github/integration%2F1/${resource}`)).toBe(true);
	});
});
