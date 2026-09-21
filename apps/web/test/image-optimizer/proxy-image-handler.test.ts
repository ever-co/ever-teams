/**
 * proxy() on `/_next/image` requests, end to end through NextRequest/NextResponse: runtime-only image
 * hosts are redirected to the original image, everything else continues to Next's optimizer, and
 * neither path runs the i18n or auth handling.
 */
import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { currentAuthenticatedUserRequest, refreshTokenRequest } from '@/core/services/server/requests/auth';
import { proxy } from '@/proxy';

jest.mock('next-intl/middleware', () => ({ __esModule: true, default: jest.fn(() => jest.fn()) }));
jest.mock('@/auth', () => ({ auth: jest.fn() }));
jest.mock('@/core/services/server/requests/auth', () => ({
	currentAuthenticatedUserRequest: jest.fn(),
	refreshTokenRequest: jest.fn()
}));

const ENV_KEYS = [
	'EVER_TEAMS_OPTIMIZED_IMAGE_HOSTS',
	'NEXT_PUBLIC_IMAGES_HOSTS',
	'NEXT_PUBLIC_GAUZY_API_SERVER_URL',
	'GAUZY_API_SERVER_URL',
	'APP_LOGO_URL',
	'MAIN_PICTURE',
	'MAIN_PICTURE_DARK'
];
const savedEnv: Record<string, string | undefined> = {};

function imageRequest(url: string, cookie?: string): NextRequest {
	const search = new URLSearchParams({ url, w: '64', q: '75' });
	return new NextRequest(`http://localhost:3030/_next/image?${search}`, {
		headers: cookie ? { cookie } : undefined
	});
}

beforeEach(() => {
	for (const key of ENV_KEYS) {
		savedEnv[key] = process.env[key];
		delete process.env[key];
	}
	// What next.config.js inlines for a default build (subset).
	process.env.EVER_TEAMS_OPTIMIZED_IMAGE_HOSTS = 'http://localhost:3030,api.ever.team,gauzy.s3.wasabisys.com';
	process.env.NEXT_PUBLIC_IMAGES_HOSTS = 'minio.selfhost.example';
	process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL = 'http://192.168.1.10:3000';
	// Server-only internal URL: never a redirect target.
	process.env.GAUZY_API_SERVER_URL = 'http://gauzy-api:3000';
});

afterEach(() => {
	for (const key of ENV_KEYS) {
		if (savedEnv[key] === undefined) delete process.env[key];
		else process.env[key] = savedEnv[key];
	}
});

describe('proxy() for /_next/image', () => {
	it('redirects images from hosts allowed only at runtime to the original image', async () => {
		const response = await proxy(imageRequest('https://minio.selfhost.example/bucket/avatar.png'));

		expect(response.status).toBe(307);
		expect(response.headers.get('location')).toBe('https://minio.selfhost.example/bucket/avatar.png');

		const api = await proxy(imageRequest('http://192.168.1.10:3000/public/uploads/team.png'));
		expect(api.status).toBe(307);
		expect(api.headers.get('location')).toBe('http://192.168.1.10:3000/public/uploads/team.png');

		const internal = await proxy(imageRequest('http://gauzy-api:3000/public/uploads/team.png'));
		expect(internal.status).toBe(200);
		expect(internal.headers.get('location')).toBeNull();
	});

	it('lets the optimizer handle build-time hosts, relative images and hosts allowed nowhere', async () => {
		for (const url of [
			'https://api.ever.team/public/avatar.png',
			'/assets/cover/auth-bg-cover.png',
			'https://evil.example/a.png',
			'javascript:alert(1)'
		]) {
			const response = await proxy(imageRequest(url));
			expect(response.headers.get('x-middleware-next')).toBe('1');
			expect(response.headers.get('location')).toBeNull();
		}
	});

	it('never runs the i18n or auth handling for image requests', async () => {
		await proxy(imageRequest('https://minio.selfhost.example/a.png', 'auth-token=expired; auth-refresh-token=r'));
		await proxy(imageRequest('https://api.ever.team/a.png', 'auth-token=expired; auth-refresh-token=r'));

		expect(createMiddleware).not.toHaveBeenCalled();
		expect(currentAuthenticatedUserRequest).not.toHaveBeenCalled();
		expect(refreshTokenRequest).not.toHaveBeenCalled();
	});

	it('still runs the i18n handling for pages', async () => {
		await proxy(new NextRequest('http://localhost:3030/unauthorized'));

		expect(createMiddleware).toHaveBeenCalledTimes(1);
	});
});
