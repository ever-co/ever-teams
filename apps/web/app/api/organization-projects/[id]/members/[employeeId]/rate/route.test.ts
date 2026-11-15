/**
 * PUT /api/organization-projects/:id/members/:employeeId/rate (proxy mode) sets a member's client rate on a project in
 * Gauzy, with the day the new rate prices tracked time from when the editor picked one.
 */
const mockAuthenticatedGuard = jest.fn();
const mockUpdateProjectMemberRate = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/rates', () => ({
	updateProjectMemberRateRequest: (...args: unknown[]) => mockUpdateProjectMemberRate(...args)
}));

import { PUT } from './route';

const PROJECT_ID = '3f0d6a8e-2b1c-4d5e-8f9a-0b1c2d3e4f5a';
const EMPLOYEE_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

function putRate(body: unknown) {
	const request = new Request(
		`http://localhost/api/organization-projects/${PROJECT_ID}/members/${EMPLOYEE_ID}/rate`,
		{ method: 'PUT', body: JSON.stringify(body) }
	);
	return PUT(request, { params: Promise.resolve({ id: PROJECT_ID, employeeId: EMPLOYEE_ID }) });
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockUpdateProjectMemberRate.mockReset();
});

it('passes the day the new rate applies from on, and answers how many entries changed price', async () => {
	mockUpdateProjectMemberRate.mockResolvedValue({ data: { billRateValue: 70, repricedTimeLogs: 4 } });

	const response = await putRate({ billRateValue: 70, applyFrom: '2026-10-01T00:00:00+02:00' });

	expect(response.status).toBe(200);
	await expect(response.json()).resolves.toEqual({ billRateValue: 70, repricedTimeLogs: 4 });
	expect(mockUpdateProjectMemberRate).toHaveBeenCalledWith(
		expect.objectContaining({ billRateValue: 70, applyFrom: '2026-10-01T00:00:00+02:00' })
	);
});

it('refuses a day Gauzy would not read, before asking it', async () => {
	const response = await putRate({ billRateValue: 70, applyFrom: 'first of October' });

	expect(response.status).toBe(400);
	expect(mockUpdateProjectMemberRate).not.toHaveBeenCalled();
});
