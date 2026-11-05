/**
 * PUT /api/user/:id (proxy mode) forwards a profile update, the new password included, to Gauzy for the signed-in
 * account, and Gauzy's refusal reaches the client with its status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockUpdateUser = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	getTaskCreator: jest.fn(),
	updateUserAvatarRequest: (...args: unknown[]) => mockUpdateUser(...args)
}));
jest.mock('@/core/services/server/requests/user', () => ({ deleteUserRequest: jest.fn() }));

import { PUT } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1'
};

function gauzyRefusal(body: unknown): Promise<never> {
	const inner = Promise.reject(body);
	inner.catch(() => undefined);
	return Promise.reject(inner);
}

function putUser(body: unknown, id = 'user-1') {
	const request = new Request(`http://localhost/api/user/${id}`, { method: 'PUT', body: JSON.stringify(body) });
	return PUT(request, { params: Promise.resolve({ id }) } as never);
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockUpdateUser.mockReset();
});

it('forwards the new password to Gauzy for the signed-in account', async () => {
	mockUpdateUser.mockResolvedValue({ data: { id: 'user-1' } });

	const response = await putUser({ hash: 'new-password' });

	expect(response.status).toBe(200);
	expect(mockUpdateUser).toHaveBeenCalledWith(
		{ data: { hash: 'new-password' }, id: 'user-1', tenantId: 'tenant-1' },
		'access-token'
	);
});

it("passes Gauzy's refusal on with its status", async () => {
	mockUpdateUser.mockImplementation(() => gauzyRefusal({ statusCode: 403, message: 'Forbidden' }));

	const response = await putUser({ hash: 'new-password' });

	expect(response.status).toBe(403);
	expect(await response.json()).toEqual({ statusCode: 403, message: 'Forbidden' });
});
