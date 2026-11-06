/**
 * In proxy mode the GitHub team settings look up the organization's GitHub integration with
 * /api/integration-tenant/remember/state?name=Github, and the route asks Gauzy's /integration-tenant with that name as
 * a filter, as direct mode does (ever-co/ever-teams#4817). The route used to read name as a property of
 * URLSearchParams, so Gauzy got no name filter, answered every integration of the organization and the page took the
 * first one.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

/** The guard's answer for the signed-in user. */
const SIGNED_IN = {
	$res: (payload: unknown) => Response.json(payload),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

const originalFetch = global.fetch;

describe('GET /api/integration-tenant/remember/state', () => {
	afterEach(() => {
		global.fetch = originalFetch;
		jest.clearAllMocks();
	});

	it('filters the lookup by the integration name the request names', async () => {
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
		const fetchMock = jest.fn().mockResolvedValue(Response.json({ items: [], total: 0 }, { status: 200 }));
		global.fetch = fetchMock;

		const request = new Request('https://app.ever.team/api/integration-tenant/remember/state?name=Github');
		const response = await GET(request);

		expect(response.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [requestedUrl] = fetchMock.mock.calls[0];
		const upstream = new URL(String(requestedUrl));
		expect(upstream.pathname.endsWith('/integration-tenant')).toBe(true);
		expect(Object.fromEntries(upstream.searchParams)).toEqual({
			'where[organizationId]': 'organization-1',
			'where[tenantId]': 'tenant-1',
			'where[name]': 'Github'
		});
	});
});
