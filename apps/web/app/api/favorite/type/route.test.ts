/**
 * @jest-environment node
 */
/**
 * GET /api/favorite/type is the proxy-mode twin of Gauzy's GET /favorite/type (ever-co/ever-teams#5017): the
 * person's favourite tasks of every team, with the query as the client sent it. No other kind is read this way.
 */
const mockAuthenticatedGuard = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

import { GET } from './route';

const originalFetch = global.fetch;
const TASKS = { items: [{ id: 'task-1', title: 'Ship the favorites page' }], total: 1 };
const query = (entity: string) =>
	new URLSearchParams({
		'where[entity]': entity,
		'where[employeeId]': 'employee-1',
		'where[organizationId]': 'organization-1'
	}).toString();

let fetchMock: jest.Mock;

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (payload: unknown) => Response.json(payload),
		user: { id: 'user-1' },
		access_token: 'access-token',
		tenantId: 'tenant-1'
	});
	fetchMock = jest.fn().mockResolvedValue(Response.json(TASKS, { status: 200 }));
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

describe('GET /api/favorite/type', () => {
	it("forwards the favourite tasks' query to Gauzy and answers its tasks", async () => {
		const response = await GET(new Request(`https://app.ever.team/api/favorite/type?${query('Task')}`));

		expect(await response.json()).toEqual(TASKS);
		const upstream = new URL(String(fetchMock.mock.calls[0][0]));
		expect(upstream.pathname).toMatch(/\/favorite\/type$/);
		expect(upstream.searchParams.get('where[entity]')).toBe('Task');
		expect(upstream.searchParams.get('where[employeeId]')).toBe('employee-1');
	});

	it('reads no other kind, pages included', async () => {
		const response = await GET(new Request(`https://app.ever.team/api/favorite/type?${query('Document')}`));

		expect(response.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('refuses a request without a session', async () => {
		mockAuthenticatedGuard.mockResolvedValue({
			$res: () => Response.json({ error: 'Unauthorized' }, { status: 401 }),
			user: null
		});

		const response = await GET(new Request(`https://app.ever.team/api/favorite/type?${query('Task')}`));

		expect(response.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
