/**
 * GET /api/auth/ever-id/verify-email: opens Ever ID's e-mail verification form for the person whose sign-in was
 * refused because Ever ID has not verified their e-mail address yet. Who they are comes from the sealed cookie that
 * sign-in set, never from the page or the URL.
 */
export {};

const SUBJECT = '395561089942685120';
const EVER_ID_ENV = [
	'NEXT_PUBLIC_EVER_ID_APP_NAME',
	'EVER_ID_ISSUER_URL',
	'EVER_ID_CLIENT_ID',
	'EVER_ID_CLIENT_SECRET'
];
const ORIGINAL_ENV = { ...process.env };

type RouteModule = typeof import('./route');

// Set before the test table below seals its cookies.
process.env.AUTH_SECRET = 'test-only-auth-secret';

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

function loadRoute(configured: boolean): RouteModule {
	for (const key of EVER_ID_ENV) delete process.env[key];
	process.env.GAUZY_API_SERVER_URL = 'https://api.example.test';
	if (configured) {
		process.env.NEXT_PUBLIC_EVER_ID_APP_NAME = 'Ever ID';
		process.env.EVER_ID_ISSUER_URL = 'https://id.example.test';
		process.env.EVER_ID_CLIENT_ID = 'teams-web-client';
		process.env.EVER_ID_CLIENT_SECRET = 'teams-web-secret';
	}
	let mod: RouteModule | undefined;
	jest.isolateModules(() => {
		mod = jest.requireActual<RouteModule>('./route');
	});
	return mod as RouteModule;
}

/** The Cookie header a refused sign-in leaves for `step`, sealed by this server. */
function sealedCookie(value: string, step: 'verify_email' | 'confirm' = 'verify_email'): string {
	let sealed: string | null = null;
	jest.isolateModules(() => {
		sealed = jest
			.requireActual<typeof import('@/core/lib/auth/ever-id/handoff')>('@/core/lib/auth/ever-id/handoff')
			.sealEverIdHandoff(value, step);
	});
	if (!sealed) throw new Error('the test secret must seal the cookie');
	return `ever-id-handoff=${sealed}`;
}

function get(cookie?: string) {
	return new Request('https://teams.example.test/api/auth/ever-id/verify-email', {
		headers: cookie ? { cookie } : {}
	});
}

describe('GET /api/auth/ever-id/verify-email', () => {
	it("sends the browser to Ever ID's verification form for the person the sealed cookie names", () => {
		const response = loadRoute(true).GET(get(sealedCookie(SUBJECT)));

		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe(`https://id.example.test/ui/v2/login/verify?userId=${SUBJECT}`);
		expect(response.headers.get('cache-control')).toBe('no-store');
	});

	it.each([
		['no cookie', undefined],
		['a cookie this server did not seal', 'ever-id-handoff=forged'],
		["another step's cookie", sealedCookie('k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA', 'confirm')]
	])('goes back to the sign-in with %s', (_label, cookie) => {
		const response = loadRoute(true).GET(get(cookie));

		expect(response.status).toBe(303);
		expect(response.headers.get('location')).toBe('/auth/passcode');
	});

	it('answers 404 while the Ever ID sign-in is not configured', () => {
		const response = loadRoute(false).GET(get(sealedCookie(SUBJECT)));

		expect(response.status).toBe(404);
		expect(response.headers.get('location')).toBeNull();
	});
});
