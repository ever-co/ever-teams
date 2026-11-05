/**
 * PUT /api/organization-projects/:id/rate (proxy mode) sets a project's rate in Gauzy. The organization comes from the
 * session, the body holds the rate only, and Gauzy's refusal reaches the client with its own status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockUpdateProjectRate = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/rates', () => ({
	updateProjectRateRequest: (...args: unknown[]) => mockUpdateProjectRate(...args)
}));

import { PUT } from './route';

const PROJECT_ID = '3f0d6a8e-2b1c-4d5e-8f9a-0b1c2d3e4f5a';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

/** A non-2xx Gauzy answer as serverFetch rejects it: a handled rejected promise of the body. */
function gauzyRefusal(body: unknown): Promise<never> {
	const inner = Promise.reject(body);
	inner.catch(() => undefined);
	return Promise.reject(inner);
}

function putRate(body: unknown, id = PROJECT_ID) {
	const request = new Request(`http://localhost/api/organization-projects/${id}/rate`, {
		method: 'PUT',
		body: JSON.stringify(body)
	});
	return PUT(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockUpdateProjectRate.mockReset();
});

it("saves the rate for the session's organization, whatever the body says", async () => {
	mockUpdateProjectRate.mockResolvedValue({ data: { id: PROJECT_ID, billRateValue: 50 } });

	const response = await putRate({ billRateValue: 50, organizationId: 'someone-else' });

	expect(response.status).toBe(200);
	expect(mockUpdateProjectRate).toHaveBeenCalledWith({
		projectId: PROJECT_ID,
		billRateValue: 50,
		organizationId: 'organization-1',
		bearer_token: 'access-token',
		tenantId: 'tenant-1'
	});
});

it('clears the rate with null', async () => {
	mockUpdateProjectRate.mockResolvedValue({ data: { id: PROJECT_ID, billRateValue: null } });

	await putRate({ billRateValue: null });

	expect(mockUpdateProjectRate).toHaveBeenCalledWith(expect.objectContaining({ billRateValue: null }));
});

it('refuses a negative or missing rate, and an id that is not one, before asking Gauzy', async () => {
	expect((await putRate({ billRateValue: -5 })).status).toBe(400);
	expect((await putRate({})).status).toBe(400);
	expect((await putRate({ billRateValue: 5 }, '../employee')).status).toBe(400);
	expect(mockUpdateProjectRate).not.toHaveBeenCalled();
});

it("passes Gauzy's refusal on with its status", async () => {
	mockUpdateProjectRate.mockImplementation(() => gauzyRefusal({ statusCode: 403, message: 'Forbidden' }));

	const response = await putRate({ billRateValue: 50 });

	expect(response.status).toBe(403);
});

it('answers 502 when Gauzy cannot be reached', async () => {
	mockUpdateProjectRate.mockRejectedValue(new TypeError('fetch failed'));

	const response = await putRate({ billRateValue: 50 });

	expect(response.status).toBe(502);
});
