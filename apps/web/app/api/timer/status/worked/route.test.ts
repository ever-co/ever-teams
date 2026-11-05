/**
 * GET /api/timer/status/worked is the proxy-mode twin of Gauzy's /timesheet/timer/status/worked. Without names it
 * reads the signed-in employee's last log; with names it forwards them, and Gauzy decides whose logs the caller sees.
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
		user: { id: 'user-1', employee: { id: 'signed-in-employee' } },
		access_token: 'access-token',
		tenantId: 'tenant-1',
		organizationId: 'organization-1'
	});
	fetchMock = jest.fn().mockResolvedValue(Response.json([], { status: 200 }));
	global.fetch = fetchMock;
});

afterEach(() => {
	global.fetch = originalFetch;
	jest.clearAllMocks();
});

const upstreamQuery = () => Object.fromEntries(new URL(String(fetchMock.mock.calls[0][0])).searchParams);

describe('GET /api/timer/status/worked', () => {
	it('forwards the named employees', async () => {
		const query = new URLSearchParams({ 'employeeIds[0]': 'employee-a', 'employeeIds[1]': 'employee-b' });

		await GET(new Request(`https://app.ever.team/api/timer/status/worked?${query}`));

		expect(new URL(String(fetchMock.mock.calls[0][0])).pathname.endsWith('/timesheet/timer/status/worked')).toBe(
			true
		);
		expect(upstreamQuery()).toEqual({
			tenantId: 'tenant-1',
			organizationId: 'organization-1',
			'employeeIds[0]': 'employee-a',
			'employeeIds[1]': 'employee-b'
		});
	});

	it('reads the signed-in employee when no employee is named', async () => {
		await GET(new Request('https://app.ever.team/api/timer/status/worked?employeeId=someone-else'));

		expect(upstreamQuery()).toEqual({
			tenantId: 'tenant-1',
			organizationId: 'organization-1',
			employeeId: 'signed-in-employee'
		});
	});
});
