/**
 * PUT /api/employee/:id/profile (proxy mode) saves one's own billing rate, its currency and weekly limit through
 * Gauzy's own-profile route. Only those fields go through, and Gauzy's refusal reaches the client with its status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockUpdateOwnProfileRates = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/rates', () => ({
	updateOwnProfileRatesRequest: (...args: unknown[]) => mockUpdateOwnProfileRates(...args)
}));

import { PUT } from './route';

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

function putRates(body: unknown, id = EMPLOYEE_ID) {
	const request = new Request(`http://localhost/api/employee/${id}/profile`, {
		method: 'PUT',
		body: JSON.stringify(body)
	});
	return PUT(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockUpdateOwnProfileRates.mockReset();
});

it('saves only the billing rate, its currency and the weekly limit, never a pay rate', async () => {
	mockUpdateOwnProfileRates.mockResolvedValue({ data: { id: EMPLOYEE_ID } });

	const response = await putRates({
		billRateValue: 55,
		billRateCurrency: 'EUR',
		reWeeklyLimit: 30,
		payRateValue: 99
	});

	expect(response.status).toBe(200);
	expect(mockUpdateOwnProfileRates).toHaveBeenCalledWith({
		employeeId: EMPLOYEE_ID,
		rates: { billRateValue: 55, billRateCurrency: 'EUR', reWeeklyLimit: 30 },
		bearer_token: 'access-token',
		tenantId: 'tenant-1',
		organizationId: 'organization-1'
	});
});

it('refuses a negative rate and an id that is not one before asking Gauzy', async () => {
	expect((await putRates({ billRateValue: -5 })).status).toBe(400);
	expect((await putRates({ billRateValue: 5 }, '../me')).status).toBe(400);
	expect(mockUpdateOwnProfileRates).not.toHaveBeenCalled();
});

it("passes Gauzy's refusal on with its status", async () => {
	mockUpdateOwnProfileRates.mockImplementation(() => gauzyRefusal({ statusCode: 403, message: 'Forbidden' }));

	expect((await putRates({ billRateValue: 55 })).status).toBe(403);
});
