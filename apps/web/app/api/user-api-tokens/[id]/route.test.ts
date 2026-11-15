/**
 * DELETE /api/user-api-tokens/[id] (proxy mode) revokes one of the caller's own tokens. Gauzy decides whose token it
 * is: another person's, or one already revoked, is its 404.
 */
const mockAuthenticatedGuard = jest.fn();
const mockRevokeToken = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/user-api-tokens', () => ({
	revokeUserApiTokenRequest: (...args: unknown[]) => mockRevokeToken(...args)
}));

import { DELETE } from './route';

const TOKEN_ID = '3f2c9a50-7c1b-4f7e-9d61-0b8a2e5c4d11';

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

function revoke(id: string) {
	return DELETE(new Request(`http://localhost/api/user-api-tokens/${id}`, { method: 'DELETE' }), {
		params: Promise.resolve({ id })
	});
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockRevokeToken.mockReset();
});

it("revokes the token with the caller's token and tenant, and answers no content", async () => {
	mockRevokeToken.mockResolvedValue({ data: undefined });

	const response = await revoke(TOKEN_ID);

	expect(response.status).toBe(204);
	expect(mockRevokeToken).toHaveBeenCalledWith({
		id: TOKEN_ID,
		bearer_token: 'access-token',
		tenantId: 'tenant-1'
	});
});

it('refuses a caller without a session and revokes nothing', async () => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (message: unknown) => Response.json({ statusCode: 401, message }, { status: 401 }),
		user: null,
		status: 401
	});

	const response = await revoke(TOKEN_ID);

	expect(response.status).toBe(401);
	expect(mockRevokeToken).not.toHaveBeenCalled();
});

it('refuses an id that is not a token id, and asks Gauzy nothing', async () => {
	const response = await revoke('not-an-id');

	expect(response.status).toBe(400);
	expect(mockRevokeToken).not.toHaveBeenCalled();
});

it("passes on Gauzy's 404 for a token that is not among the caller's own", async () => {
	mockRevokeToken.mockReturnValue(gauzyRefusal({ statusCode: 404, message: 'Not Found' }));

	const response = await revoke(TOKEN_ID);

	expect(response.status).toBe(404);
});
