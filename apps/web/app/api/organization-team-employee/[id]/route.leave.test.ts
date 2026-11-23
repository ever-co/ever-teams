/**
 * @jest-environment node
 */
/**
 * DELETE /api/organization-team-employee/:id (#5737): the API removes a plain member from the team the request names,
 * so the route hands on the team the page named, and only falls back to the active-team cookie every tab shares.
 */
const mockAuthenticatedGuard = jest.fn();
const mockDeleteRequest = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	deleteOrganizationTeamEmployeeRequest: (...args: unknown[]) => mockDeleteRequest(...args),
	updateOrganizationTeamEmployeeRequest: jest.fn()
}));

import { DELETE } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'session-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1',
	teamId: 'team-payments'
};

const ROUTE = 'https://app.example.com/api/organization-team-employee/membership-design-ops';

function leave(query: string) {
	const request = new Request(`${ROUTE}?${query}`, { method: 'DELETE' });
	return DELETE(request, { params: Promise.resolve({ id: 'membership-design-ops' }) });
}

describe('DELETE /api/organization-team-employee/:id', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
		mockDeleteRequest.mockResolvedValue({ data: { affected: 1, raw: [] } });
	});

	it('hands on the team the page named, with the active-team cookie on another team', async () => {
		const response = await leave('employeeId=employee-1&organizationTeamId=team-design-ops');

		expect(response?.status).toBe(200);
		expect(mockDeleteRequest).toHaveBeenCalledWith({
			id: 'membership-design-ops',
			bearer_token: 'session-token',
			tenantId: 'tenant-1',
			organizationId: 'organization-1',
			employeeId: 'employee-1',
			organizationTeamId: 'team-design-ops'
		});
	});

	it('keeps the team of the cookie for a request that names none', async () => {
		await leave('employeeId=employee-1');

		expect(mockDeleteRequest.mock.calls[0][0]).toMatchObject({ organizationTeamId: 'team-payments' });
	});

	it('deletes nothing without a session', async () => {
		mockAuthenticatedGuard.mockResolvedValue({ ...SIGNED_IN, user: null });

		await leave('employeeId=employee-1&organizationTeamId=team-design-ops');

		expect(mockDeleteRequest).not.toHaveBeenCalled();
	});
});
