/**
 * GET /api/organization-projects and GET /api/organization-projects/:id are the proxy-mode twins of Gauzy's project
 * reads. They used to drop the query the client sends (ever-co/ever-teams#4825), so projects came back without their
 * members, teams and tags: the relations, the paging and the filters must reach Gauzy as sent, the list keeps the
 * session's organization and tenant, and a request without a query reaches Gauzy as before.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET as listProjects } from './route';
import { GET as readProject } from './[id]/route';

/** The relations the client's project service asks for, indexed as it sends them. */
const RELATIONS = {
	'relations[0]': 'organizationContact',
	'relations[1]': 'members.employee.user',
	'relations[2]': 'tags',
	'relations[3]': 'teams'
};

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
	const [requested] = fetchMock.mock.calls[0];
	return new URL(String(requested));
}

/** GET /api/organization-projects with `query`, as the browser sends it in proxy mode. */
function list(query = '') {
	return listProjects(new Request(`https://app.ever.team/api/organization-projects${query}`));
}

/** GET /api/organization-projects/project-1 with `query`, as the browser sends it in proxy mode. */
function read(query = '') {
	const request = new Request(`https://app.ever.team/api/organization-projects/project-1${query}`);
	return readProject(request, { params: Promise.resolve({ id: 'project-1' }) });
}

describe('GET /api/organization-projects', () => {
	it('forwards the relations, the paging and the member filter the client sends', async () => {
		const sent = { ...RELATIONS, skip: '20', take: '20', 'where[members][employeeId]': 'employee-1' };
		const query = new URLSearchParams(sent);

		const response = await list(`?${query}`);

		expect(response.status).toBe(200);
		const upstream = upstreamUrl();
		expect(upstream.pathname).toMatch(/\/organization-projects$/);
		const forwarded = Object.fromEntries(upstream.searchParams);
		expect(forwarded).toEqual({
			'where[organizationId]': 'organization-1',
			'where[tenantId]': 'tenant-1',
			...sent
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

describe('GET /api/organization-projects/:id', () => {
	it('forwards the relations the client sends', async () => {
		const sent = { tenantId: 'tenant-1', ...RELATIONS };
		const query = new URLSearchParams(sent);

		const response = await read(`?${query}`);

		expect(response?.status).toBe(200);
		const upstream = upstreamUrl();
		expect(upstream.pathname).toMatch(/\/organization-projects\/project-1$/);
		const forwarded = Object.fromEntries(upstream.searchParams);
		expect(forwarded).toEqual(sent);
	});

	it('asks Gauzy exactly as before when the client sends no query', async () => {
		await read();

		const upstream = upstreamUrl();
		expect(upstream.pathname).toMatch(/\/organization-projects\/project-1$/);
		expect(upstream.search).toBe('');
	});
});
