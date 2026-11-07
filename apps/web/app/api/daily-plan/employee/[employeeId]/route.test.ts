/**
 * GET /api/daily-plan/employee/:employeeId (proxy mode) reads an employee's plans with the session's scope and forwards
 * the shape the browser asked for (ever-co/ever-gauzy#11730); an unknown or absent shape is not forwarded.
 */
const mockAuthenticatedGuard = jest.fn();
const mockGetDayPlansByEmployee = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	...jest.requireActual('@/core/services/server/requests/response-shape'),
	getDayPlansByEmployee: (...args: unknown[]) => mockGetDayPlansByEmployee(...args)
}));

import { GET } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	teamId: 'team-1'
};

const params = Promise.resolve({ employeeId: 'employee-1' });

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockGetDayPlansByEmployee.mockReset();
	mockGetDayPlansByEmployee.mockResolvedValue({ data: { items: [], total: 0 } });
});

it('forwards shape=lean with the employee and the session scope', async () => {
	const response = await GET(new Request('http://localhost/api/daily-plan/employee/employee-1?shape=lean'), { params });
	expect(response.status).toBe(200);
	expect(mockGetDayPlansByEmployee).toHaveBeenCalledWith({
		bearer_token: 'access-token',
		employeeId: 'employee-1',
		organizationId: 'organization-1',
		tenantId: 'tenant-1',
		organizationTeamId: 'team-1',
		shape: 'lean'
	});
});

it.each(['', '?shape=compact'])('forwards no shape for "%s"', async (query) => {
	await GET(new Request(`http://localhost/api/daily-plan/employee/employee-1${query}`), { params });
	expect(mockGetDayPlansByEmployee).toHaveBeenCalledWith(expect.objectContaining({ shape: undefined }));
});
