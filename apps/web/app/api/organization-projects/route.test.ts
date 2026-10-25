/**
 * GET /api/organization-projects is the proxy-mode twin of Gauzy's GET /organization-projects. It used to rebuild the
 * Gauzy query from the session alone (ever-co/ever-teams#4825), so projects came back without their members, teams
 * and tags: the relations, the paging and the filters the client sends must reach Gauzy as sent, while the
 * organization and the tenant stay the session's.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

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
	fetchMock = jest.fn().mockResolvedValue(Response.json({ items: [], total: 0 }, { status: 200 }));
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

/** The URL Gauzy was asked for. */
function upstreamUrl(): URL {
	const [requested] = fetchMock.mock.calls[0];
	return new URL(String(requested));
}

/** GET /api/organization-projects with `query`, as the browser sends it in proxy mode. */
function list(query = '') {
	return GET(new Request(`https://app.ever.team/api/organization-projects${query}`));
}

describe('GET /api/organization-projects', () => {
	it('forwards the relations, the paging and the member filter the client sends', async () => {
		const query = new URLSearchParams({
			'relations[0]': 'organizationContact',
			'relations[1]': 'members.employee.user',
			'relations[2]': 'tags',
			'relations[3]': 'teams',
			skip: '20',
			take: '20',
			'where[members][employeeId]': 'employee-1'
		});

		const response = await list(`?${query}`);

		expect(response.status).toBe(200);
		const upstream = upstreamUrl();
		expect(upstream.pathname).toMatch(/\/organization-projects$/);
		const forwarded = Object.fromEntries(upstream.searchParams);
		expect(forwarded).toEqual({
			'where[organizationId]': 'organization-1',
			'where[tenantId]': 'tenant-1',
			'relations[0]': 'organizationContact',
			'relations[1]': 'members.employee.user',
			'relations[2]': 'tags',
			'relations[3]': 'teams',
			skip: '20',
			take: '20',
			'where[members][employeeId]': 'employee-1'
		});
	});

	it("keeps the session's organization and tenant over the ones the client sends", async () => {
		const query = new URLSearchParams({
			'where[organizationId]': 'other-organization',
			'where[tenantId]': 'other-tenant',
			'relations[0]': 'teams'
		});

		await list(`?${query}`);

		const forwarded = upstreamUrl().searchParams;
		expect(forwarded.getAll('where[organizationId]')).toEqual(['organization-1']);
		expect(forwarded.getAll('where[tenantId]')).toEqual(['tenant-1']);
		expect(forwarded.get('relations[0]')).toBe('teams');
	});

	it('asks Gauzy exactly as before when the client sends no query', async () => {
		await list();

		const upstream = upstreamUrl();
		expect(upstream.pathname).toMatch(/\/organization-projects$/);
		expect(upstream.search).toBe('?where%5BorganizationId%5D=organization-1&where%5BtenantId%5D=tenant-1');
	});
});
