/**
 * The proxy-mode route behind "e-mail me a sign-in code". The link it gives Gauzy for the e-mail has to open this
 * app's sign-in page, `/auth/passcode`, which takes the link's `?email=&code=` and signs the person in. It used to be
 * the route's own URL followed by the invitation page's path: an address that does not exist.
 */
const mockSignInEmailRequest = jest.fn();

jest.mock('@/core/services/server/requests', () => ({
	signInEmailRequest: (...args: unknown[]) => mockSignInEmailRequest(...args)
}));

import { POST } from './route';

// The configured public origin of the app, read when the route runs
const ORIGIN_KEYS = ['NEXT_PUBLIC_WEB_APP_URL', 'AUTH_URL', 'NEXTAUTH_URL'] as const;
const originalOrigins = ORIGIN_KEYS.map((key) => process.env[key]);

function configureOrigin(values: Partial<Record<(typeof ORIGIN_KEYS)[number], string>>) {
	for (const key of ORIGIN_KEYS) {
		if (values[key] === undefined) delete process.env[key];
		else process.env[key] = values[key];
	}
}

function post(body: Record<string, unknown>, url: string) {
	return new Request(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

afterEach(() => {
	ORIGIN_KEYS.forEach((key, index) => {
		const original = originalOrigins[index];
		if (original === undefined) delete process.env[key];
		else process.env[key] = original;
	});
});

describe('POST /api/auth/signin-email', () => {
	it('links the e-mail to the sign-in page, on the configured origin and not on the address the request reached', async () => {
		configureOrigin({ NEXT_PUBLIC_WEB_APP_URL: 'https://teams.example.org/' });
		mockSignInEmailRequest.mockResolvedValue({ data: { status: 200, message: 'OK' } });

		// Behind a reverse proxy the request's own URL is the address the server listens on
		const res = await POST(post({ email: 'ada@example.org' }, 'http://0.0.0.0:3030/api/auth/signin-email'));

		expect(mockSignInEmailRequest).toHaveBeenCalledWith(
			'ada@example.org',
			'https://teams.example.org/auth/passcode'
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ status: 200, message: 'OK' });
	});

	it('names no page when no public origin is configured, whatever host the request names', async () => {
		configureOrigin({});
		mockSignInEmailRequest.mockResolvedValue({ data: { status: 200, message: 'OK' } });

		// The link carries a code that signs the person in: it is never built on a host a caller can choose
		const res = await POST(post({ email: 'ada@example.org' }, 'https://other.example/api/auth/signin-email'));

		expect(mockSignInEmailRequest).toHaveBeenCalledWith('ada@example.org', undefined);
		expect(res.status).toBe(200);
	});

	it('refuses an address that is not one, without asking Gauzy', async () => {
		configureOrigin({ NEXT_PUBLIC_WEB_APP_URL: 'https://teams.example.org' });

		const res = await POST(post({ email: 'not-an-address' }, 'https://teams.example.org/api/auth/signin-email'));

		expect(res.status).toBe(400);
		expect(mockSignInEmailRequest).not.toHaveBeenCalled();
	});
});
