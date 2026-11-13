/**
 * PUT /api/user/:id/role (proxy mode) gives a workspace role to the account named in the path. It reads the
 * caller's permissions, the roles of the workspace and the account from Gauzy, forwards the role and nothing else
 * when the role menu would offer the change, and refuses it otherwise. Gauzy's refusal reaches the client with its
 * status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockAssignUserRole = jest.fn();
const mockGetUserById = jest.fn();
const mockGetRoles = jest.fn();
const mockGetMyRolePermissions = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/user', () => ({
	assignUserRoleRequest: (...args: unknown[]) => mockAssignUserRole(...args),
	getUserByIdRequest: (...args: unknown[]) => mockGetUserById(...args)
}));
jest.mock('@/core/services/server/requests/roles', () => ({
	getRolesRequest: (...args: unknown[]) => mockGetRoles(...args)
}));
jest.mock('@/core/services/server/requests/role-permissions', () => ({
	getMyRolePermissionsRequest: (...args: unknown[]) => mockGetMyRolePermissions(...args)
}));

import { PUT } from './route';

const CALLER_USER_ID = '1c9e4b7a-6d2f-4e8a-9b3c-5d7f0a1b2c3d';
const MEMBER_USER_ID = '3f0d6a8e-2b1c-4d5e-8f9a-0b1c2d3e4f5a';

const SUPER_ADMIN_ROLE_ID = '0a1b2c3d-0000-4000-8000-000000000001';
const ADMIN_ROLE_ID = '0a1b2c3d-0000-4000-8000-000000000002';
const EMPLOYEE_ROLE_ID = '0a1b2c3d-0000-4000-8000-000000000003';
const VIEWER_ROLE_ID = '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const SUPPORT_ROLE_ID = '0a1b2c3d-0000-4000-8000-000000000005';
const ROLE_OF_ANOTHER_WORKSPACE_ID = '0a1b2c3d-0000-4000-8000-000000000009';

const WORKSPACE_ROLES = {
	items: [
		{ id: SUPER_ADMIN_ROLE_ID, name: 'SUPER_ADMIN', isSystem: true },
		{ id: ADMIN_ROLE_ID, name: 'ADMIN', isSystem: true },
		{ id: EMPLOYEE_ROLE_ID, name: 'EMPLOYEE', isSystem: true },
		{ id: VIEWER_ROLE_ID, name: 'VIEWER', isSystem: true },
		{ id: SUPPORT_ROLE_ID, name: 'Support desk', isSystem: false }
	],
	total: 5
};

const ADMIN_PERMISSIONS = ['ORG_USERS_VIEW', 'ORG_USERS_EDIT', 'CHANGE_ROLES_PERMISSIONS'];
const SUPER_ADMIN_PERMISSIONS = [...ADMIN_PERMISSIONS, 'SUPER_ADMIN_EDIT'];

const SESSION = { bearer_token: 'access-token', tenantId: 'tenant-1' };

interface GauzyAnswers {
	callerRole?: string;
	callerPermissions?: string[];
	accountId?: string;
	accountRoleId?: string | null;
}

function gauzyAnswers({
	callerRole = 'ADMIN',
	callerPermissions = ADMIN_PERMISSIONS,
	accountId = MEMBER_USER_ID,
	accountRoleId = EMPLOYEE_ROLE_ID
}: GauzyAnswers = {}) {
	const permissionRows = callerPermissions.map((permission) => ({ permission, enabled: true }));
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (data: unknown) => Response.json(data),
		user: { id: CALLER_USER_ID, role: { name: callerRole } },
		access_token: 'access-token',
		tenantId: 'tenant-1'
	});
	mockGetMyRolePermissions.mockResolvedValue({ data: permissionRows });
	mockGetRoles.mockResolvedValue({ data: WORKSPACE_ROLES });
	mockGetUserById.mockResolvedValue({
		data: { id: accountId, email: 'ana@example.com', hash: 'kept-out', roleId: accountRoleId }
	});
}

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

async function expectRefusedWithoutWriting(response: Response) {
	expect(response.status).toBe(403);
	expect(await response.json()).toEqual({ statusCode: 403, message: 'You cannot give this role to this account.' });
	expect(mockAssignUserRole).not.toHaveBeenCalled();
}

beforeEach(() => {
	jest.clearAllMocks();
	gauzyAnswers();
	mockAssignUserRole.mockResolvedValue({
		data: { id: MEMBER_USER_ID, email: 'ana@example.com', roleId: VIEWER_ROLE_ID }
	});
});

describe('a change the role menu offers', () => {
	it('gives the role to the account of the path and sends nothing else of the body to Gauzy', async () => {
		const response = await putRole({ roleId: VIEWER_ROLE_ID, hash: 'new-password', email: 'taken@example.com' });

		expect(response.status).toBe(200);
		expect(mockAssignUserRole).toHaveBeenCalledTimes(1);
		expect(mockAssignUserRole).toHaveBeenCalledWith({ userId: MEMBER_USER_ID, roleId: VIEWER_ROLE_ID, ...SESSION });
		expect(await response.json()).toEqual({ id: MEMBER_USER_ID, roleId: VIEWER_ROLE_ID });
	});

	it("decides from Gauzy's own answers, read with the caller's token", async () => {
		await putRole({ roleId: VIEWER_ROLE_ID });

		expect(mockGetMyRolePermissions).toHaveBeenCalledWith(SESSION);
		expect(mockGetRoles).toHaveBeenCalledWith(SESSION);
		expect(mockGetUserById).toHaveBeenCalledWith({ id: MEMBER_USER_ID, ...SESSION });
	});

	it('lets an admin make another member an admin, and change the role of another admin', async () => {
		expect((await putRole({ roleId: ADMIN_ROLE_ID })).status).toBe(200);

		gauzyAnswers({ accountRoleId: ADMIN_ROLE_ID });

		expect((await putRole({ roleId: EMPLOYEE_ROLE_ID })).status).toBe(200);
		expect(mockAssignUserRole).toHaveBeenCalledTimes(2);
	});

	it('lets a super admin give any role to any other account', async () => {
		gauzyAnswers({
			callerRole: 'SUPER_ADMIN',
			callerPermissions: SUPER_ADMIN_PERMISSIONS,
			accountRoleId: SUPER_ADMIN_ROLE_ID
		});

		expect((await putRole({ roleId: SUPPORT_ROLE_ID })).status).toBe(200);
		expect((await putRole({ roleId: SUPER_ADMIN_ROLE_ID })).status).toBe(200);
	});
});

describe('a change the role menu does not offer', () => {
	it('refuses an admin who asks for super admin', async () => {
		await expectRefusedWithoutWriting(await putRole({ roleId: SUPER_ADMIN_ROLE_ID }));
	});

	it('refuses an admin who asks for a role the workspace created, which Gauzy would accept', async () => {
		await expectRefusedWithoutWriting(await putRole({ roleId: SUPPORT_ROLE_ID }));
	});

	it('refuses a role that is not one of the workspace', async () => {
		await expectRefusedWithoutWriting(await putRole({ roleId: ROLE_OF_ANOTHER_WORKSPACE_ID }));
	});

	it("refuses the caller's own account, also when the path names it in capitals", async () => {
		gauzyAnswers({ accountId: CALLER_USER_ID, accountRoleId: ADMIN_ROLE_ID });

		await expectRefusedWithoutWriting(await putRole({ roleId: EMPLOYEE_ROLE_ID }, CALLER_USER_ID));
		await expectRefusedWithoutWriting(await putRole({ roleId: EMPLOYEE_ROLE_ID }, CALLER_USER_ID.toUpperCase()));
	});

	it('refuses an admin on a super admin', async () => {
		gauzyAnswers({ accountRoleId: SUPER_ADMIN_ROLE_ID });

		await expectRefusedWithoutWriting(await putRole({ roleId: EMPLOYEE_ROLE_ID }));
	});

	it('refuses an admin on the holder of a role the workspace created, or of no role', async () => {
		gauzyAnswers({ accountRoleId: SUPPORT_ROLE_ID });
		await expectRefusedWithoutWriting(await putRole({ roleId: EMPLOYEE_ROLE_ID }));

		gauzyAnswers({ accountRoleId: null });
		await expectRefusedWithoutWriting(await putRole({ roleId: EMPLOYEE_ROLE_ID }));
	});

	it('refuses a caller who is not an admin, even one whose role holds ORG_USERS_EDIT', async () => {
		gauzyAnswers({ callerRole: 'Support desk' });
		await expectRefusedWithoutWriting(await putRole({ roleId: ADMIN_ROLE_ID }));

		gauzyAnswers({ callerRole: 'MANAGER', callerPermissions: SUPER_ADMIN_PERMISSIONS });
		await expectRefusedWithoutWriting(await putRole({ roleId: VIEWER_ROLE_ID }));
	});

	it('refuses an admin whose role lost ORG_USERS_EDIT', async () => {
		gauzyAnswers({ callerPermissions: ['ORG_USERS_VIEW', 'CHANGE_ROLES_PERMISSIONS'] });

		await expectRefusedWithoutWriting(await putRole({ roleId: VIEWER_ROLE_ID }));
	});

	it('counts a permission Gauzy answers turned off as not held', async () => {
		mockGetMyRolePermissions.mockResolvedValue({
			data: [
				{ permission: 'ORG_USERS_EDIT', enabled: false },
				{ permission: 'CHANGE_ROLES_PERMISSIONS', enabled: true }
			]
		});

		await expectRefusedWithoutWriting(await putRole({ roleId: VIEWER_ROLE_ID }));
	});
});

describe('what Gauzy refuses or leaves unanswered', () => {
	it("passes on Gauzy's refusal to read the roles, without writing", async () => {
		mockGetRoles.mockImplementation(() => gauzyRefusal({ statusCode: 403, message: 'Forbidden resource' }));

		const response = await putRole({ roleId: VIEWER_ROLE_ID });

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ statusCode: 403, message: 'Forbidden resource' });
		expect(mockAssignUserRole).not.toHaveBeenCalled();
	});

	it('passes on a 404 for an account Gauzy does not know, without writing', async () => {
		mockGetUserById.mockImplementation(() => gauzyRefusal({ statusCode: 404, message: 'Not Found' }));

		const response = await putRole({ roleId: VIEWER_ROLE_ID });

		expect(response.status).toBe(404);
		expect(mockAssignUserRole).not.toHaveBeenCalled();
	});

	it('writes nothing and answers a gateway error when an answer cannot be read', async () => {
		mockGetRoles.mockResolvedValue({ data: undefined });

		const response = await putRole({ roleId: VIEWER_ROLE_ID });

		expect(response.status).toBe(502);
		expect(await response.json()).toEqual({ message: 'The role could not be changed.' });
		expect(mockAssignUserRole).not.toHaveBeenCalled();
	});

	it("passes Gauzy's refusal of the change on with its status", async () => {
		mockAssignUserRole.mockImplementation(() => gauzyRefusal({ statusCode: 403, message: 'Forbidden' }));

		const response = await putRole({ roleId: VIEWER_ROLE_ID });

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ statusCode: 403, message: 'Forbidden' });
	});
});

describe('a request that is not one', () => {
	it('refuses an id or a role that is not one before asking Gauzy', async () => {
		expect((await putRole({ roleId: VIEWER_ROLE_ID }, '../me')).status).toBe(400);
		expect((await putRole({ roleId: 'ADMIN' })).status).toBe(400);
		expect((await putRole({})).status).toBe(400);
		expect(mockGetRoles).not.toHaveBeenCalled();
		expect(mockGetUserById).not.toHaveBeenCalled();
		expect(mockAssignUserRole).not.toHaveBeenCalled();
	});

	it('asks Gauzy nothing for a caller who is not signed in', async () => {
		mockAuthenticatedGuard.mockResolvedValue({
			$res: (data: unknown) => Response.json({ message: data }, { status: 401 }),
			user: null
		});

		expect((await putRole({ roleId: VIEWER_ROLE_ID })).status).toBe(401);
		expect(mockGetMyRolePermissions).not.toHaveBeenCalled();
		expect(mockGetRoles).not.toHaveBeenCalled();
		expect(mockGetUserById).not.toHaveBeenCalled();
		expect(mockAssignUserRole).not.toHaveBeenCalled();
	});
});
