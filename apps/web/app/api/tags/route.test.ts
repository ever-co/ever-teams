/**
 * GET /api/tags is the proxy-mode twin of Gauzy's tag list (ever-co/ever-teams#4803). It used to answer the whole
 * serverFetch result, { data, response }, so the client's { items, total } check failed and the project tag picker
 * stayed empty. The route must answer the list Gauzy returned, as /api/tags/level does.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

const originalFetch = global.fetch;

const tagListUrl = 'https://app.ever.team/api/tags?organizationTeamId=team-1';

const gauzyTagList = {
	items: [{ id: 'tag-1', name: 'Backend', color: '#1e90ff' }],
	total: 1
};

let fetchMock: jest.Mock;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (payload: unknown) => Response.json(payload),
		user: { id: 'user-1' },
		access_token: 'access-token',
		tenantId: 'tenant-1',
		organizationId: 'organization-1'
	});
	const gauzyAnswer = Response.json(gauzyTagList, { status: 200 });
	fetchMock = jest.fn().mockResolvedValue(gauzyAnswer);
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

describe('GET /api/tags', () => {
	it('answers the { items, total } list Gauzy returned', async () => {
		const request = new Request(tagListUrl);

		const response = await GET(request);

		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toEqual(gauzyTagList);
	});

	it('forwards the session scope and the selected team to Gauzy /tags/level', async () => {
		const request = new Request(tagListUrl);

		await GET(request);

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const upstreamUrl = String(fetchMock.mock.calls[0][0]);
		const upstream = new URL(upstreamUrl);
		expect(upstream.pathname).toMatch(/\/tags\/level$/);
		const upstreamQuery = Object.fromEntries(upstream.searchParams);
		expect(upstreamQuery).toEqual({
			tenantId: 'tenant-1',
			organizationId: 'organization-1',
			organizationTeamId: 'team-1'
		});
	});
});
