/**
 * PUT /api/tenant (proxy mode) renames the workspace of the session in Gauzy (#5087). Gauzy renames the tenant of
 * the session's token: the body holds the name and the tenant the page means, a tenant that is not the session's is
 * refused, and Gauzy's refusal of anyone but the super admin reaches the client with its own status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockRenameTenant = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/tenant', () => ({
	renameTenantRequest: (...args: unknown[]) => mockRenameTenant(...args)
}));

import { PUT } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1', tenantId: 'tenant-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

const SIGNED_OUT = {
	$res: (message: unknown) => Response.json({ statusCode: 401, message }, { status: 401 }),
	user: null,
	status: 401
};

/** A non-2xx Gauzy answer as serverFetch rejects it: a handled rejected promise of the body. */
function gauzyRefusal(body: unknown): Promise<never> {
	const inner = Promise.reject(body);
	inner.catch(() => undefined);
	return Promise.reject(inner);
}

function putName(body: unknown) {
	const request = new Request('http://localhost/api/tenant', { method: 'PUT', body: JSON.stringify(body) });
	return PUT(request);
}

beforeEach(() => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockRenameTenant.mockReset();
});

it("renames the session's tenant with the trimmed name and nothing else the body carries", async () => {
	mockRenameTenant.mockResolvedValue({ data: { affected: 1 } });

	const response = await putName({
		name: ' Acme Labs ',
		tenantId: 'tenant-1',
		logo: 'https://example.com/x.png'
	});

	expect(response.status).toBe(200);
	await expect(response.json()).resolves.toEqual({ name: 'Acme Labs' });
	expect(mockRenameTenant).toHaveBeenCalledWith({
		name: 'Acme Labs',
		bearer_token: 'access-token',
		tenantId: 'tenant-1'
	});
});

it('refuses a rename meant for another workspace than the one the session is on now', async () => {
	const response = await putName({ name: 'Acme Labs', tenantId: 'tenant-2' });

	expect(response.status).toBe(409);
	expect(mockRenameTenant).not.toHaveBeenCalled();
});

it("renames the session's tenant for a caller that names no tenant, as Gauzy's own route does", async () => {
	mockRenameTenant.mockResolvedValue({ data: { affected: 1 } });

	const response = await putName({ name: 'Acme Labs' });

	expect(response.status).toBe(200);
	expect(mockRenameTenant).toHaveBeenCalledWith({
		name: 'Acme Labs',
		bearer_token: 'access-token',
		tenantId: 'tenant-1'
	});
});

it('refuses a missing, blank or too long name, and a body that is not JSON, before asking Gauzy', async () => {
	const notJson = new Request('http://localhost/api/tenant', { method: 'PUT', body: 'name=Acme' });

	expect((await putName({})).status).toBe(400);
	expect((await putName({ name: '   ' })).status).toBe(400);
	expect((await putName({ name: 'x'.repeat(61) })).status).toBe(400);
	expect((await PUT(notJson)).status).toBe(400);
	expect(mockRenameTenant).not.toHaveBeenCalled();
});

it("passes on Gauzy's refusal of a member who is not the super admin, with its status", async () => {
	mockRenameTenant.mockImplementation(() => gauzyRefusal({ statusCode: 403, message: 'Forbidden resource' }));

	const response = await putName({ name: 'Acme Labs' });

	expect(response.status).toBe(403);
	await expect(response.json()).resolves.toEqual({ statusCode: 403, message: 'Forbidden resource' });
});

it('answers a signed-out caller without asking Gauzy to rename anything', async () => {
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_OUT);

	const response = await putName({ name: 'Acme Labs' });

	expect(response.status).toBe(401);
	expect(mockRenameTenant).not.toHaveBeenCalled();
});

it('answers 502 when Gauzy cannot be reached', async () => {
	mockRenameTenant.mockRejectedValue(new TypeError('fetch failed'));

	const response = await putName({ name: 'Acme Labs' });

	expect(response.status).toBe(502);
});
