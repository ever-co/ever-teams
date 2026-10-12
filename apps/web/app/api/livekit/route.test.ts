/**
 * GET /api/livekit signs a LiveKit room token with the server's secret, so it is its own authorization
 * boundary (see the authenticatedGuard doc): only a signed-in user gets one, the identity and the tenant come
 * from the session (never from the query or the client-writable tenant cookie), the room is scoped to that
 * tenant, and the grant is a meeting participant's, not a LiveKit admin's.
 *
 * It also checks NEXT_PUBLIC_LIVEKIT_URL from the live (container) env on every request — Next inlines a
 * build-time NEXT_PUBLIC_* literal into server bundles too, so the image would otherwise keep the value (or
 * the absence) it was built with. Behaviour-preservation tests: Jest never inlines env, so the "not frozen
 * at build time" half is pinned by test/architecture/self-hostable-docker-image.test.ts.
 */
import { NextRequest, NextResponse } from 'next/server';
import { GET } from './route';

const mockAuthenticatedGuard = jest.fn();
const mockAccessToken = jest.fn();
const mockAddGrant = jest.fn();

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

// livekit-server-sdk ships ESM only; the double records what the route puts in the token.
jest.mock('livekit-server-sdk', () => ({
	AccessToken: jest.fn().mockImplementation((...args: unknown[]) => {
		mockAccessToken(...args);
		return { addGrant: mockAddGrant, toJwt: jest.fn().mockResolvedValue('livekit-jwt') };
	})
}));

const SESSION_USER = { id: 'user-1', email: 'member@example.org', name: 'Team Member', tenantId: 'session-tenant' };

/** The guard's answer for a valid session; the tenant cookie deliberately differs from the session tenant. */
function signedIn(user: Record<string, unknown> = SESSION_USER) {
	return {
		$res: (data: unknown) => NextResponse.json(data),
		user,
		access_token: 'access-token',
		tenantId: 'cookie-tenant',
		organizationId: 'organization-1',
		teamId: 'team-1',
		taskId: undefined,
		projectId: undefined
	};
}

/** The guard's answer when Gauzy refuses the session (401) or cannot answer (503). */
function refused(status: number) {
	const message = status === 503 ? 'Session check unavailable, retry later' : 'Unauthorized';
	return {
		$res: (data: unknown) => NextResponse.json({ statusCode: status, message: data }, { status }),
		user: null,
		status,
		deny: () => NextResponse.json({ message }, { status })
	};
}

const ORIGINAL_ENV = process.env;
let consoleError: jest.SpyInstance;

function tokenRequest(query = 'roomName=room-1') {
	return new NextRequest(`https://teams.example.org/api/livekit?${query}`);
}

beforeEach(() => {
	process.env = {
		...ORIGINAL_ENV,
		LIVEKIT_API_KEY: 'api-key',
		LIVEKIT_API_SECRET: 'api-secret',
		NEXT_PUBLIC_LIVEKIT_URL: 'wss://livekit.example.org'
	};
	mockAuthenticatedGuard.mockResolvedValue(signedIn());
	consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	consoleError.mockRestore();
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('GET /api/livekit', () => {
	it('issues a token when NEXT_PUBLIC_LIVEKIT_URL is set in the current env', async () => {
		const response = await GET(tokenRequest());

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ token: 'livekit-jwt' });
	});

	it('reports a misconfigured server when NEXT_PUBLIC_LIVEKIT_URL is not set', async () => {
		delete process.env.NEXT_PUBLIC_LIVEKIT_URL;

		const response = await GET(tokenRequest());

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: 'Server misconfigured' });
	});

	describe('who gets a token', () => {
		it.each([
			['a refused session', 401],
			['a session check Gauzy could not answer', 503]
		])('answers %s with the guard status and mints no token', async (_case, status) => {
			mockAuthenticatedGuard.mockResolvedValue(refused(status));
			const request = tokenRequest();

			const response = await GET(request);

			expect(response.status).toBe(status);
			expect(mockAuthenticatedGuard.mock.calls[0][0]).toBe(request);
			expect(mockAccessToken).not.toHaveBeenCalled();
		});

		it('refuses an anonymous caller before looking at the LiveKit configuration', async () => {
			mockAuthenticatedGuard.mockResolvedValue(refused(401));
			delete process.env.LIVEKIT_API_SECRET;

			const response = await GET(tokenRequest());

			expect(response.status).toBe(401);
		});

		it('refuses a session without a tenant', async () => {
			mockAuthenticatedGuard.mockResolvedValue(signedIn({ ...SESSION_USER, tenantId: null }));

			const response = await GET(tokenRequest());

			expect(response.status).toBe(401);
			expect(mockAccessToken).not.toHaveBeenCalled();
		});

		it('refuses a missing room name and mints no token', async () => {
			const response = await GET(tokenRequest('roomName=%20%20'));

			expect(response.status).toBe(400);
			expect(mockAccessToken).not.toHaveBeenCalled();
		});
	});

	describe('what the token says', () => {
		it('is minted for the session user, whatever username the query sends', async () => {
			await GET(tokenRequest('roomName=room-1&username=ceo%40example.org'));

			expect(mockAccessToken).toHaveBeenCalledWith('api-key', 'api-secret', {
				identity: 'member@example.org',
				ttl: '1h'
			});
		});

		it('uses the session user id as the identity when the user has no email', async () => {
			mockAuthenticatedGuard.mockResolvedValue(signedIn({ ...SESSION_USER, email: null }));

			await GET(tokenRequest('roomName=room-1&username=someone-else'));

			expect(mockAccessToken).toHaveBeenCalledWith('api-key', 'api-secret', { identity: 'user-1', ttl: '1h' });
		});

		it("scopes the room to the session's tenant, not the tenant cookie", async () => {
			await GET(tokenRequest('roomName=%20VGVhbS1BbGljZQ%3D%3D%20'));

			expect(mockAddGrant).toHaveBeenCalledTimes(1);
			expect(mockAddGrant.mock.calls[0][0].room).toBe('session-tenant:VGVhbS1BbGljZQ==');
		});

		it("grants what a meeting participant needs and none of LiveKit's admin rights", async () => {
			await GET(tokenRequest());

			expect(mockAddGrant).toHaveBeenCalledWith({
				room: 'session-tenant:room-1',
				roomJoin: true,
				canPublish: true,
				canSubscribe: true,
				canPublishData: true
			});
		});
	});
});
