/**
 * GET /api/employee/:id/pay-rate (proxy mode) reads an employee's pay rate from Gauzy for the session's organization.
 * Gauzy's 403 and 404 reach the client with their status, which the screens read as "no pay rate to show".
 */
const mockAuthenticatedGuard = jest.fn();
const mockGetEmployeePayRate = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/rates', () => ({
	getEmployeePayRateRequest: (...args: unknown[]) => mockGetEmployeePayRate(...args)
}));

import { GET } from './route';

const EMPLOYEE_ID = '3f0d6a8e-2b1c-4d5e-8f9a-0b1c2d3e4f5a';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

function gauzyRefusal(body: unknown): Promise<never> {
	const inner = Promise.reject(body);
	inner.catch(() => undefined);
	return Promise.reject(inner);
}

function getPayRate(id = EMPLOYEE_ID) {
	const request = new Request(`http://localhost/api/employee/${id}/pay-rate`);
	return GET(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockGetEmployeePayRate.mockReset();
});

it("reads the pay rate for the session's organization", async () => {
	const payRate = { employeeId: EMPLOYEE_ID, payRateValue: 30, payRateCurrency: null, currency: 'EUR' };
	mockGetEmployeePayRate.mockResolvedValue({ data: payRate });

	const response = await getPayRate();

	expect(response.status).toBe(200);
	expect(await response.json()).toEqual(payRate);
	expect(mockGetEmployeePayRate).toHaveBeenCalledWith({
		employeeId: EMPLOYEE_ID,
		organizationId: 'organization-1',
		bearer_token: 'access-token',
		tenantId: 'tenant-1'
	});
});

it('refuses an id that is not one before asking Gauzy', async () => {
	expect((await getPayRate('../me')).status).toBe(400);
	expect(mockGetEmployeePayRate).not.toHaveBeenCalled();
});

it("passes Gauzy's 403 and 404 on with their status", async () => {
	mockGetEmployeePayRate.mockImplementationOnce(() => gauzyRefusal({ statusCode: 403, message: 'Forbidden' }));
	expect((await getPayRate()).status).toBe(403);

	mockGetEmployeePayRate.mockImplementationOnce(() => gauzyRefusal({ statusCode: 404, message: 'Not Found' }));
	expect((await getPayRate()).status).toBe(404);
});
