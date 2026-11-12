/**
 * PUT /api/user/:id/role (proxy mode) gives a workspace role to the account named in the path. Only the role goes
 * through, and Gauzy's refusal reaches the client with its status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockAssignUserRole = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/user', () => ({
	assignUserRoleRequest: (...args: unknown[]) => mockAssignUserRole(...args)
}));

import { PUT } from './route';

const MEMBER_USER_ID = '3f0d6a8e-2b1c-4d5e-8f9a-0b1c2d3e4f5a';
const ROLE_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'admin-user' },
	access_token: 'access-token',
	tenantId: 'tenant-1'
};

function gauzyRefusal(body: unknown): Promise<never> {
	const inner = Promise.reject(body);
	inner.catch(() => undefined);
	return Promise.reject(inner);
}

function putRole(body: unknown, id = MEMBER_USER_ID) {
	const request = new Request(`http://localhost/api/user/${id}/role`, {
		method: 'PUT',
		body: JSON.stringify(body)
	});
	return PUT(request, { params: Promise.resolve({ id }) });
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockAssignUserRole.mockReset();
});

it('gives the role to the account of the path and sends nothing else of the body to Gauzy', async () => {
	mockAssignUserRole.mockResolvedValue({ data: { id: MEMBER_USER_ID, email: 'ana@example.com', roleId: ROLE_ID } });

	const response = await putRole({ roleId: ROLE_ID, hash: 'new-password', email: 'taken@example.com' });

	expect(response.status).toBe(200);
	expect(mockAssignUserRole).toHaveBeenCalledWith({
		userId: MEMBER_USER_ID,
		roleId: ROLE_ID,
		bearer_token: 'access-token',
		tenantId: 'tenant-1'
	});
	expect(await response.json()).toEqual({ id: MEMBER_USER_ID, roleId: ROLE_ID });
});

it('refuses an id or a role that is not one before asking Gauzy', async () => {
	expect((await putRole({ roleId: ROLE_ID }, '../me')).status).toBe(400);
	expect((await putRole({ roleId: 'ADMIN' })).status).toBe(400);
	expect((await putRole({})).status).toBe(400);
	expect(mockAssignUserRole).not.toHaveBeenCalled();
});

it("passes Gauzy's refusal on with its status", async () => {
	mockAssignUserRole.mockImplementation(() => gauzyRefusal({ statusCode: 403, message: 'Forbidden' }));

	const response = await putRole({ roleId: ROLE_ID });

	expect(response.status).toBe(403);
	expect(await response.json()).toEqual({ statusCode: 403, message: 'Forbidden' });
});

it('asks Gauzy nothing for a caller who is not signed in', async () => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (data: unknown) => Response.json({ message: data }, { status: 401 }),
		user: null
	});

	expect((await putRole({ roleId: ROLE_ID })).status).toBe(401);
	expect(mockAssignUserRole).not.toHaveBeenCalled();
});
