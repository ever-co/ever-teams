/**
 * GET /api/livekit checks NEXT_PUBLIC_LIVEKIT_URL from the live (container) env on every request — Next
 * inlines a build-time NEXT_PUBLIC_* literal into server bundles too, so the image would otherwise keep
 * the value (or the absence) it was built with. Behaviour-preservation tests: Jest never inlines env, so
 * the "not frozen at build time" half is pinned by test/architecture/self-hostable-docker-image.test.ts.
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

// livekit-server-sdk ships ESM only; the route only needs a token.
jest.mock('livekit-server-sdk', () => ({
	AccessToken: jest.fn().mockImplementation(() => ({
		addGrant: jest.fn(),
		toJwt: jest.fn().mockResolvedValue('livekit-jwt')
	}))
}));

const ORIGINAL_ENV = process.env;
let consoleError: jest.SpyInstance;

function tokenRequest() {
	return new NextRequest('https://teams.example.org/api/livekit?roomName=room-1&username=user%40example.org');
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV, LIVEKIT_API_KEY: 'api-key', LIVEKIT_API_SECRET: 'api-secret' };
	delete process.env.NEXT_PUBLIC_LIVEKIT_URL;
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
		process.env.NEXT_PUBLIC_LIVEKIT_URL = 'wss://livekit.example.org';

		const response = await GET(tokenRequest());

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ token: 'livekit-jwt' });
	});

	it('reports a misconfigured server when NEXT_PUBLIC_LIVEKIT_URL is not set', async () => {
		const response = await GET(tokenRequest());

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: 'Server misconfigured' });
	});
});
