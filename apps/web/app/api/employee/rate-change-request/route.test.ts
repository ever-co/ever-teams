/**
 * POST /api/employee/rate-change-request (proxy mode) sends an employee's rate change request to Gauzy, which notifies
 * the organization's admins. The requester and the organization come from the session, never from the body.
 */
const mockAuthenticatedGuard = jest.fn();
const mockRequestRateChange = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/rates', () => ({
	requestRateChangeRequest: (...args: unknown[]) => mockRequestRateChange(...args)
}));

import { POST } from './route';

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

function postRequest(body: unknown) {
	const request = new Request('http://localhost/api/employee/rate-change-request', {
		method: 'POST',
		body: JSON.stringify(body)
	});
	return POST(request);
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockRequestRateChange.mockReset();
});

it('sends the request with the rate, currency and reason only, and answers 202', async () => {
	mockRequestRateChange.mockResolvedValue({ data: { notified: 2 } });

	const response = await postRequest({
		billRateValue: 55,
		billRateCurrency: 'EUR',
		reason: 'New certification',
		employeeId: 'someone-else',
		organizationId: 'another-organization'
	});

	expect(response.status).toBe(202);
	expect(await response.json()).toEqual({ notified: 2 });
	expect(mockRequestRateChange).toHaveBeenCalledWith({
		input: { billRateValue: 55, billRateCurrency: 'EUR', reason: 'New certification' },
		organizationId: 'organization-1',
		bearer_token: 'access-token',
		tenantId: 'tenant-1'
	});
});

it('refuses a request without a valid rate, or with a reason over 500 characters', async () => {
	expect((await postRequest({ billRateValue: -1 })).status).toBe(400);
	expect((await postRequest({ billRateValue: 'a lot' })).status).toBe(400);
	expect((await postRequest({ billRateValue: 10, reason: 'x'.repeat(501) })).status).toBe(400);
	expect(mockRequestRateChange).not.toHaveBeenCalled();
});

it("passes Gauzy's refusal on with its status", async () => {
	mockRequestRateChange.mockImplementation(() => gauzyRefusal({ statusCode: 404, message: 'Cannot POST' }));

	const response = await postRequest({ billRateValue: 55 });

	expect(response.status).toBe(404);
});

it('lets the session check answer a signed-out caller', async () => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: () => Response.json({ message: 'Unauthorized' }, { status: 401 }),
		user: null
	});

	const response = await postRequest({ billRateValue: 55 });

	expect(response.status).toBe(401);
	expect(mockRequestRateChange).not.toHaveBeenCalled();
});
