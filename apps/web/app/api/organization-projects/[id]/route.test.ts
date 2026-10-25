/**
 * GET /api/organization-projects/:id is the proxy-mode twin of Gauzy's GET /organization-projects/:id. It used to send
 * Gauzy no query at all (ever-co/ever-teams#4825), so the project came back without its members, teams and tags: the
 * relations the client sends must reach Gauzy as sent.
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
	fetchMock = jest.fn().mockResolvedValue(Response.json({ id: 'project-1' }, { status: 200 }));
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

/** GET /api/organization-projects/project-1 with `query`, as the browser sends it in proxy mode. */
function read(query = '') {
	const request = new Request(`https://app.ever.team/api/organization-projects/project-1${query}`);
	return GET(request, { params: Promise.resolve({ id: 'project-1' }) });
}

describe('GET /api/organization-projects/:id', () => {
	it('forwards the relations the client sends', async () => {
		const query = new URLSearchParams({
			tenantId: 'tenant-1',
			'relations[0]': 'organizationContact',
			'relations[1]': 'members.employee.user',
			'relations[2]': 'tags',
			'relations[3]': 'teams'
		});

		const response = await read(`?${query}`);

		expect(response?.status).toBe(200);
		const upstream = upstreamUrl();
		expect(upstream.pathname).toMatch(/\/organization-projects\/project-1$/);
		const forwarded = Object.fromEntries(upstream.searchParams);
		expect(forwarded).toEqual({
			tenantId: 'tenant-1',
			'relations[0]': 'organizationContact',
			'relations[1]': 'members.employee.user',
			'relations[2]': 'tags',
			'relations[3]': 'teams'
		});
	});

	it('asks Gauzy exactly as before when the client sends no query', async () => {
		await read();

		const upstream = upstreamUrl();
		expect(upstream.pathname).toMatch(/\/organization-projects\/project-1$/);
		expect(upstream.search).toBe('');
	});
});
