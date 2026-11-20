/**
 * Every page tells browsers who may show it in a frame (ever-co/ever-teams#5527). Without it, a page of any other site
 * could frame the sign-in page and draw whatever it wants around it.
 */
import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '@/proxy';

jest.mock('next-intl/middleware', () => ({
	__esModule: true,
	default: jest.fn(() => jest.fn(() => NextResponse.next()))
}));
jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/core/services/server/requests/auth', () => ({
	currentAuthenticatedUserRequest: jest.fn(),
	refreshTokenRequest: jest.fn()
}));

async function framingPolicyOf(path: string): Promise<string | null> {
	const response = await proxy(new NextRequest(`http://localhost:3030${path}`));
	return response.headers.get('Content-Security-Policy');
}

beforeEach(() => {
	jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
	delete process.env.FRAME_ANCESTORS;
});

describe('proxy() and framing', () => {
	it('lets only the app itself frame the sign-in page', async () => {
		expect(await framingPolicyOf('/auth/passcode')).toBe("frame-ancestors 'self'");
		expect(await framingPolicyOf('/fr/auth/passcode')).toBe("frame-ancestors 'self'");
	});

	it('sends the policy with the redirect of a signed-out visit to the sign-in page', async () => {
		const response = await proxy(new NextRequest('http://localhost:3030/'));

		expect(response.headers.get('location')).toMatch(/\/auth\//);
		expect(response.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'self'");
	});

	it('lets no site frame the page where a person allows a site to use their timer', async () => {
		expect(await framingPolicyOf('/embed/authorize')).toBe("frame-ancestors 'none'");
		expect(await framingPolicyOf('/fr/embed/authorize')).toBe("frame-ancestors 'none'");
	});

	it('adds the sites a deployment lists, read on every request so a published image needs no rebuild', async () => {
		process.env.FRAME_ANCESTORS = 'https://intranet.example.com';
		expect(await framingPolicyOf('/auth/passcode')).toBe("frame-ancestors 'self' https://intranet.example.com");

		process.env.FRAME_ANCESTORS = 'https://portal.example.org';
		expect(await framingPolicyOf('/auth/passcode')).toBe("frame-ancestors 'self' https://portal.example.org");
	});

	it("CONTROL: leaves the image optimizer's own policy alone", async () => {
		expect(await framingPolicyOf('/_next/image?url=%2Fassets%2Flogo.png&w=64&q=75')).toBeNull();
	});
});
