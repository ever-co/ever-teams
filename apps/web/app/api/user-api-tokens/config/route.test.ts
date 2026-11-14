/**
 * GET /api/user-api-tokens/config (proxy mode) says whether the server has personal API tokens on, for the signed-in
 * caller only. Gauzy's own answer, or its refusal, reaches the client with its status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockGetConfig = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/user-api-tokens', () => ({
	getUserApiTokenConfigRequest: (...args: unknown[]) => mockGetConfig(...args)
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

function getConfig() {
	return GET(new Request('http://localhost/api/user-api-tokens/config'));
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockGetConfig.mockReset();
});

it("asks Gauzy with the caller's token and tenant, and answers whether the tokens are on", async () => {
	mockGetConfig.mockResolvedValue({ data: { enabled: true } });

	const response = await getConfig();

	expect(response.status).toBe(200);
	await expect(response.json()).resolves.toEqual({ enabled: true });
	expect(mockGetConfig).toHaveBeenCalledWith({ bearer_token: 'access-token', tenantId: 'tenant-1' });
});

it('refuses a caller without a session and asks Gauzy nothing', async () => {
	mockAuthenticatedGuard.mockResolvedValue({
		$res: (message: unknown) => Response.json({ statusCode: 401, message }, { status: 401 }),
		user: null,
		status: 401
	});

	const response = await getConfig();

	expect(response.status).toBe(401);
	expect(mockGetConfig).not.toHaveBeenCalled();
});

it('passes on the 404 of an API that has no personal tokens at all', async () => {
	mockGetConfig.mockReturnValue(gauzyRefusal({ statusCode: 404, message: 'Not Found' }));

	const response = await getConfig();

	expect(response.status).toBe(404);
});

it('answers a 502 when Gauzy answers something unreadable', async () => {
	mockGetConfig.mockResolvedValue({ data: { enabled: 'yes' } });

	const response = await getConfig();

	expect(response.status).toBe(502);
});
