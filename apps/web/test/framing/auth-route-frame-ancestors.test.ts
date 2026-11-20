/**
 * Auth.js serves its own sign-in and sign-out pages under /api/auth, where the proxy does not run: they say who may
 * frame them, as every page does (ever-co/ever-teams#5527).
 */
import { NextRequest } from 'next/server';
import { handlers } from '@/auth';
import { GET, POST } from '@/app/api/auth/[...nextauth]/route';

jest.mock('@/auth', () => ({
	handlers: {
		GET: jest.fn(async () => new Response('<form>Sign in</form>', { headers: { 'Content-Type': 'text/html' } })),
		POST: jest.fn(async () => new Response(null, { status: 302, headers: { Location: '/api/auth/signin' } }))
	}
}));

const mockGet = handlers.GET as jest.Mock;
const ORIGINAL_ENV = process.env;

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	delete process.env.FRAME_ANCESTORS;
});

afterEach(() => {
	process.env = ORIGINAL_ENV;
});

describe('the Auth.js route and framing', () => {
	it("answers the sign-in page with the app's framing policy", async () => {
		const response = await GET(new NextRequest('http://localhost:3030/api/auth/signin'));

		expect(response.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'self'");
		expect(await response.text()).toBe('<form>Sign in</form>');
	});

	it('adds the sites a deployment lists, and keeps the answer of a sign-out', async () => {
		process.env.FRAME_ANCESTORS = 'https://intranet.example.com';
		const response = await POST(new NextRequest('http://localhost:3030/api/auth/signout', { method: 'POST' }));

		expect(response.status).toBe(302);
		expect(response.headers.get('location')).toBe('/api/auth/signin');
		expect(response.headers.get('Content-Security-Policy')).toBe(
			"frame-ancestors 'self' https://intranet.example.com"
		);
	});

	it('hands the request to Auth.js unchanged', async () => {
		const request = new NextRequest('http://localhost:3030/api/auth/session');
		await GET(request);

		expect(mockGet).toHaveBeenCalledWith(request);
	});
});
