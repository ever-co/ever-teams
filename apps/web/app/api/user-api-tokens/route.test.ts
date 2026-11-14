/**
 * GET and POST /api/user-api-tokens (proxy mode): the caller's own personal API tokens, and a new one. Only what the
 * settings page shows goes back to the browser, a new token's secret once; Gauzy's refusals keep their status.
 */
const mockAuthenticatedGuard = jest.fn();
const mockGetTokens = jest.fn();
const mockCreateToken = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));
jest.mock('@/core/services/server/requests/user-api-tokens', () => ({
	getUserApiTokensRequest: (...args: unknown[]) => mockGetTokens(...args),
	createUserApiTokenRequest: (...args: unknown[]) => mockCreateToken(...args)
}));

import { GET, POST } from './route';

const SIGNED_IN = {
	$res: (data: unknown) => Response.json(data),
	user: { id: 'user-1' },
	access_token: 'access-token',
	tenantId: 'tenant-1',
	organizationId: 'organization-1'
};

const STORED = {
	id: 'token-1',
	userId: 'user-1',
	tenantId: 'tenant-1',
	name: 'Friday report',
	prefix: 'gzy_abc',
	createdAt: '2026-11-14T09:00:00.000Z',
	expiresAt: null,
	lastUsedAt: null,
	revokedAt: null
};

function gauzyRefusal(body: unknown): Promise<never> {
	const inner = Promise.reject(body);
	inner.catch(() => undefined);
	return Promise.reject(inner);
}

function postToken(body: unknown) {
	return POST(
		new Request('http://localhost/api/user-api-tokens', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		})
	);
}

beforeEach(() => {
	mockAuthenticatedGuard.mockReset();
	mockAuthenticatedGuard.mockResolvedValue(SIGNED_IN);
	mockGetTokens.mockReset();
	mockCreateToken.mockReset();
});

describe('GET /api/user-api-tokens', () => {
	it("lists the caller's tokens with what the page shows, never the owner's ids", async () => {
		mockGetTokens.mockResolvedValue({ data: { items: [STORED], total: 1 } });

		const response = await GET(new Request('http://localhost/api/user-api-tokens'));

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual({
			items: [
				{
					id: 'token-1',
					name: 'Friday report',
					createdAt: '2026-11-14T09:00:00.000Z',
					expiresAt: null,
					lastUsedAt: null
				}
			],
			total: 1
		});
		expect(mockGetTokens).toHaveBeenCalledWith({ bearer_token: 'access-token', tenantId: 'tenant-1' });
	});

	it('refuses a caller without a session', async () => {
		mockAuthenticatedGuard.mockResolvedValue({
			$res: (message: unknown) => Response.json({ statusCode: 401, message }, { status: 401 }),
			user: null,
			status: 401
		});

		const response = await GET(new Request('http://localhost/api/user-api-tokens'));

		expect(response.status).toBe(401);
		expect(mockGetTokens).not.toHaveBeenCalled();
	});

	it("passes on Gauzy's 404 when the server has the tokens off", async () => {
		mockGetTokens.mockReturnValue(gauzyRefusal({ statusCode: 404, message: 'Not Found' }));

		const response = await GET(new Request('http://localhost/api/user-api-tokens'));

		expect(response.status).toBe(404);
	});
});

describe('POST /api/user-api-tokens', () => {
	it('forwards only the trimmed name and the expiry, and answers the secret once, never cached', async () => {
		mockCreateToken.mockResolvedValue({ data: { ...STORED, token: 'gzy_abc.secret' } });

		const response = await postToken({
			name: '  Friday report ',
			expiry: '90d',
			tenantId: 'tenant-2',
			userId: 'u-2'
		});

		expect(response.status).toBe(201);
		expect(response.headers.get('cache-control')).toBe('no-store');
		await expect(response.json()).resolves.toEqual({
			id: 'token-1',
			name: 'Friday report',
			createdAt: '2026-11-14T09:00:00.000Z',
			expiresAt: null,
			lastUsedAt: null,
			token: 'gzy_abc.secret'
		});
		expect(mockCreateToken).toHaveBeenCalledWith({
			input: { name: 'Friday report', expiry: '90d' },
			bearer_token: 'access-token',
			tenantId: 'tenant-1'
		});
	});

	it('refuses a request without a name or with an unknown expiry, and asks Gauzy nothing', async () => {
		const withoutName = await postToken({ name: ' ', expiry: '1y' });
		const unknownExpiry = await postToken({ name: 'Script', expiry: '30d' });

		expect(withoutName.status).toBe(400);
		expect(unknownExpiry.status).toBe(400);
		expect(mockCreateToken).not.toHaveBeenCalled();
	});

	it("passes on Gauzy's refusal of an eleventh token with its own message", async () => {
		const tooMany = {
			statusCode: 400,
			message: 'You can hold 10 API tokens at once. Revoke one you no longer use first.'
		};
		mockCreateToken.mockReturnValue(gauzyRefusal(tooMany));

		const response = await postToken({ name: 'Eleventh', expiry: 'never' });

		expect(response.status).toBe(400);
		await expect(response.json()).resolves.toEqual(tooMany);
	});

	it.each([
		['text/plain', { 'content-type': 'text/plain' }],
		['form data', { 'content-type': 'application/x-www-form-urlencoded' }],
		['no type', {}]
	])('refuses a body sent as %s with 415, before it reads the session', async (_case, headers) => {
		const response = await POST(
			new Request('http://localhost/api/user-api-tokens', {
				method: 'POST',
				headers,
				body: JSON.stringify({ name: 'Another site', expiry: 'never' })
			})
		);

		expect(response.status).toBe(415);
		expect(mockAuthenticatedGuard).not.toHaveBeenCalled();
		expect(mockCreateToken).not.toHaveBeenCalled();
	});

	it('answers a 502 rather than a token without its secret', async () => {
		mockCreateToken.mockResolvedValue({ data: STORED });

		const response = await postToken({ name: 'Friday report', expiry: '90d' });

		expect(response.status).toBe(502);
	});
});
