/**
 * GET /api/employee/inactive (proxy mode) lists the employees of the caller's organization whose work ended, cut to
 * what the members settings show. Gauzy's refusal reaches the client with its status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockGetInactiveEmployeesPage = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/employee', () => ({
	getInactiveEmployeesPageRequest: (...args: unknown[]) => mockGetInactiveEmployeesPage(...args)
}));

import { GET } from './route';

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

function getPage(search: string) {
	return GET(new Request(`http://localhost/api/employee/inactive${search}`));
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockGetInactiveEmployeesPage.mockReset();
});

it("asks Gauzy for the page in the caller's organization and tenant, whatever the query names", async () => {
	mockGetInactiveEmployeesPage.mockResolvedValue({ data: { items: [], total: 0 } });

	const response = await getPage('?page=2&organizationId=organization-2&tenantId=tenant-2');

	expect(response.status).toBe(200);
	expect(mockGetInactiveEmployeesPage).toHaveBeenCalledWith({
		page: 2,
		organizationId: 'organization-1',
		bearer_token: 'access-token',
		tenantId: 'tenant-1'
	});
});

it('answers only what the inactive list shows of an employee and of their account', async () => {
	mockGetInactiveEmployeesPage.mockResolvedValue({
		data: {
			items: [
				{
					id: 'employee-1',
					fullName: 'Ana Lima',
					endWork: '2026-11-05T09:00:00.000Z',
					payRateValue: 80,
					user: {
						email: 'ana@example.com',
						imageUrl: null,
						phoneNumber: '+33 6 00 00 00 00',
						roleId: 'role-1'
					},
					teams: [{ id: 'membership-1', organizationTeamId: 'team-1', isManager: true }]
				}
			],
			total: 1
		}
	});

	const response = await getPage('?page=1');

	expect(await response.json()).toEqual({
		items: [
			{
				id: 'employee-1',
				fullName: 'Ana Lima',
				endWork: '2026-11-05T09:00:00.000Z',
				user: { email: 'ana@example.com', imageUrl: null },
				teams: [{ organizationTeamId: 'team-1' }]
			}
		],
		total: 1
	});
});

it('refuses a missing or unreadable page before asking Gauzy', async () => {
	expect((await getPage('')).status).toBe(400);
	expect((await getPage('?page=0')).status).toBe(400);
	expect((await getPage('?page=first')).status).toBe(400);
	expect(mockGetInactiveEmployeesPage).not.toHaveBeenCalled();
});

it("passes Gauzy's refusal on with its status", async () => {
	mockGetInactiveEmployeesPage.mockImplementation(() => gauzyRefusal({ statusCode: 403, message: 'Forbidden' }));

	const response = await getPage('?page=1');

	expect(response.status).toBe(403);
	expect(await response.json()).toEqual({ statusCode: 403, message: 'Forbidden' });
});

it('answers 502 when Gauzy does not answer a page of employees', async () => {
	mockGetInactiveEmployeesPage.mockResolvedValue({ data: { message: 'unexpected' } });

	expect((await getPage('?page=1')).status).toBe(502);
});

it('asks Gauzy nothing for a caller who is not signed in', async () => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (data: unknown) => Response.json({ message: data }, { status: 401 }),
		user: null
	});

	expect((await getPage('?page=1')).status).toBe(401);
	expect(mockGetInactiveEmployeesPage).not.toHaveBeenCalled();
});
