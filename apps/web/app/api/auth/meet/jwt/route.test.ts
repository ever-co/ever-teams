/**
 * GET /api/auth/meet/jwt signs a Jitsi token with the server's secret, so it is its own authorization boundary
 * (see the authenticatedGuard doc): only a signed-in user gets one, the identity and the tenant come from the
 * session (never from the query or the client-writable tenant cookie), and the token opens one room of that
 * tenant, never '*', which Jitsi accepts for every room on the server.
 *
 * The token is the real signed JWT, checked with the secret the way Jitsi's Prosody plugin checks it: that
 * plugin lowercases the room claim and compares it with the room Jitsi Meet joins (lowercased, URI-encoded).
 */
import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { GET } from './route';

const mockAuthenticatedGuard = jest.fn();
const mockMeetConfig: { domain: string; appId?: string; secret?: string } = {
	domain: 'meet.example.org',
	appId: 'ever_teams',
	secret: 'meet-secret'
};

jest.mock('@/core/services/server/guards/authenticated-guard-app', () => ({
	authenticatedGuard: (...args: unknown[]) => mockAuthenticatedGuard(...args)
}));

jest.mock('@/core/constants/config/constants', () => ({
	MEET_DOMAIN: {
		get value() {
			return mockMeetConfig.domain;
		}
	},
	get MEET_JWT_APP_ID() {
		return mockMeetConfig.appId;
	},
	get MEET_JWT_APP_SECRET() {
		return mockMeetConfig.secret;
	}
}));

const SESSION_USER = {
	id: 'user-1',
	email: 'member@example.org',
	name: 'Team Member',
	imageUrl: 'https://cdn.example.org/member.png',
	tenantId: 'session-tenant'
};

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

function tokenRequest(query = 'room=TeamName-Alice-room0123456789a') {
	return new NextRequest(`https://teams.example.org/api/auth/meet/jwt?${query}`);
}

/** The token's claims, verified the way the Jitsi server verifies them. */
function verified(token: string) {
	return jwt.verify(token, 'meet-secret', {
		algorithms: ['HS256'],
		audience: 'jitsi',
		issuer: 'ever_teams'
	}) as jwt.JwtPayload;
}

let consoleError: jest.SpyInstance;

beforeEach(() => {
	mockMeetConfig.domain = 'meet.example.org';
	mockMeetConfig.appId = 'ever_teams';
	mockMeetConfig.secret = 'meet-secret';
	mockAuthenticatedGuard.mockResolvedValue(signedIn());
	consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
	consoleError.mockRestore();
});

describe('GET /api/auth/meet/jwt', () => {
	describe('who gets a token', () => {
		it.each([
			['a refused session', 401],
			['a session check Gauzy could not answer', 503]
		])('answers %s with the guard status and signs no token', async (_case, status) => {
			mockAuthenticatedGuard.mockResolvedValue(refused(status));
			const request = tokenRequest();

			const response = await GET(request);

			expect(response.status).toBe(status);
			expect(mockAuthenticatedGuard.mock.calls[0][0]).toBe(request);
			expect(await response.json()).not.toHaveProperty('token');
		});

		it('refuses an anonymous caller before looking at the Jitsi configuration', async () => {
			mockAuthenticatedGuard.mockResolvedValue(refused(401));
			mockMeetConfig.secret = undefined;

			const response = await GET(tokenRequest());

			expect(response.status).toBe(401);
		});

		it('refuses a session without a tenant', async () => {
			mockAuthenticatedGuard.mockResolvedValue(signedIn({ ...SESSION_USER, tenantId: null }));

			const response = await GET(tokenRequest());

			expect(response.status).toBe(401);
			expect(await response.json()).not.toHaveProperty('token');
		});

		it.each([
			['no room', ''],
			['an empty room', 'room='],
			['a room with no usable character', 'room=%20_%3A%2F%20']
		])('refuses %s instead of signing a token without one', async (_case, query) => {
			const response = await GET(tokenRequest(query));

			expect(response.status).toBe(400);
			expect(await response.json()).not.toHaveProperty('token');
		});

		it.each([
			['the application secret', 'secret'],
			['the application id', 'appId']
		] as const)('reports a misconfigured server when %s is not set', async (_case, key) => {
			mockMeetConfig[key] = undefined;

			const response = await GET(tokenRequest());

			expect(response.status).toBe(500);
			expect(await response.json()).toEqual({ error: 'Server misconfigured' });
		});

		it('reports a misconfigured server when the meet domain is not set', async () => {
			mockMeetConfig.domain = '';

			const response = await GET(tokenRequest());

			expect(response.status).toBe(500);
		});
	});

	describe('what the token says', () => {
		it("opens the requested room in the session's tenant only, never every room", async () => {
			const response = await GET(tokenRequest());
			const body = await response.json();
			const claims = verified(body.token);

			expect(response.status).toBe(200);
			expect(claims.room).toBe('teamname-alice-room0123456789a_session-tenant');
			expect(claims.room).not.toContain('*');
			// The page joins the room the response names, which is the one the token opens
			expect(body.room).toBe(claims.room);
		});

		it('expires after an hour', async () => {
			const claims = verified((await (await GET(tokenRequest())).json()).token);

			expect(claims.exp! - claims.iat!).toBe(60 * 60);
		});

		it('names the meet domain and the application the way Jitsi expects', async () => {
			const claims = verified((await (await GET(tokenRequest())).json()).token);

			expect(claims).toMatchObject({ aud: 'jitsi', iss: 'ever_teams', sub: 'meet.example.org' });
		});

		it('is signed for the session user, whatever the query says', async () => {
			const response = await GET(tokenRequest('room=Room-1&id=user-2&email=ceo%40example.org&name=CEO'));
			const claims = verified((await response.json()).token);

			expect(claims.context.user).toEqual({
				id: 'user-1',
				email: 'member@example.org',
				name: 'Team Member',
				avatar: 'https://cdn.example.org/member.png'
			});
		});

		it("scopes the room to the session's tenant, not the tenant cookie", async () => {
			const body = await (await GET(tokenRequest())).json();

			expect(body.room.endsWith('_session-tenant')).toBe(true);
			expect(body.room).not.toContain('cookie-tenant');
		});

		it("cannot be pointed at another tenant's room through the room name", async () => {
			// Another tenant's room for the same link is "teamname-alice-room0123456789a_victim-tenant"
			const body = await (await GET(tokenRequest('room=TeamName-Alice-room0123456789a_victim-tenant'))).json();

			expect(body.room).toBe('teamname-alice-room0123456789a-victim-tenant_session-tenant');
			// Everything after the first "_" is the tenant, and that is always the caller's
			expect(body.room.slice(body.room.indexOf('_') + 1)).toBe('session-tenant');
		});

		it('keeps only the characters Jitsi leaves unchanged when it lowercases and URI-encodes the room', async () => {
			const body = await (await GET(tokenRequest('room=%20Équipe%20Été%3A%2F%25Ab_c%20'))).json();

			expect(body.room).toBe('equipe-ete-ab-c_session-tenant');
			expect(encodeURIComponent(body.room.normalize('NFKC').toLowerCase()).toLowerCase()).toBe(body.room);
		});
	});
});
