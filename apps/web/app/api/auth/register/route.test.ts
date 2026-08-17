/**
 * Register route — the two failure modes that hung every stage.ever.team signup on 2026-08-17.
 *
 *  1. A blank (whitespace-only) CAPTCHA_SECRET_KEY / NEXT_PUBLIC_CAPTCHA_SITE_KEY must count as
 *     "captcha not configured". Stage's secrets held a single space; " " is truthy, so the route
 *     demanded a token that a `sitekey=" "` widget can never produce.
 *  2. Validation / captcha failures must be a real 400. The client only reads `errors` on 400 —
 *     a 200 body with `{ errors }` was treated as success and left the loader spinning forever.
 */

const RECAPTCHA_ERROR = 'Please check the ReCaptcha checkbox before continue';

const mockRequests = {
	registerUserRequest: jest.fn(),
	loginUserRequest: jest.fn(),
	createTenantRequest: jest.fn(),
	createTenantSmtpRequest: jest.fn(),
	createOrganizationRequest: jest.fn(),
	createEmployeeFromUser: jest.fn(),
	createOrganizationTeamRequest: jest.fn(),
	refreshTokenRequest: jest.fn()
};
const mockRecaptcha = jest.fn();

jest.mock('@/core/services/server/requests', () => mockRequests);
jest.mock('@/core/services/server/recaptcha', () => ({ recaptchaVerification: (...a: unknown[]) => mockRecaptcha(...a) }));
jest.mock('@/core/lib/helpers/cookies', () => ({ setAuthCookies: jest.fn() }));

type RouteModule = typeof import('./route');

/** Load the route with a given captcha env, isolated so `constants.tsx` re-evaluates. */
function loadRoute(env: { secret?: string; siteKey?: string }): RouteModule {
	let mod: RouteModule | undefined;
	jest.isolateModules(() => {
		if (env.secret === undefined) delete process.env.CAPTCHA_SECRET_KEY;
		else process.env.CAPTCHA_SECRET_KEY = env.secret;
		if (env.siteKey === undefined) delete process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
		else process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY = env.siteKey;
		mod = require('./route');
	});
	return mod as RouteModule;
}

function post(body: Record<string, unknown>) {
	return new Request('https://stage.ever.team/api/auth/register', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

const validBody = { name: 'E2E Tester', email: 'e2e@example.com', team: "E2E Tester's Team", timezone: 'UTC' };

function primeHappyPath() {
	mockRequests.registerUserRequest.mockResolvedValue({ data: { id: 'user-1' } });
	mockRequests.loginUserRequest.mockResolvedValue({ data: { token: 't1', refresh_token: 'r1' } });
	mockRequests.createTenantRequest.mockResolvedValue({ data: { id: 'tenant-1' } });
	mockRequests.createOrganizationRequest.mockResolvedValue({ data: { id: 'org-1' } });
	mockRequests.createEmployeeFromUser.mockResolvedValue({ data: { id: 'emp-1' } });
	mockRequests.createOrganizationTeamRequest.mockResolvedValue({ data: { id: 'team-1' } });
	mockRequests.refreshTokenRequest.mockResolvedValue({ data: { token: 't2' } });
}

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
	for (const k of ['CAPTCHA_SECRET_KEY', 'NEXT_PUBLIC_CAPTCHA_SITE_KEY']) {
		if (ORIGINAL_ENV[k] === undefined) delete process.env[k];
		else process.env[k] = ORIGINAL_ENV[k];
	}
	jest.resetAllMocks();
});

describe('POST /api/auth/register — captcha gating', () => {
	it.each([
		['unset', undefined],
		['empty string', ''],
		['a single space (the stage placeholder)', ' '],
		['tabs/newlines', ' \t\n']
	])('does NOT require a captcha token when CAPTCHA_SECRET_KEY is %s', async (_label, secret) => {
		primeHappyPath();
		const { POST } = loadRoute({ secret, siteKey: secret });

		const res = await POST(post(validBody));

		expect(res.status).toBe(200);
		expect(mockRecaptcha).not.toHaveBeenCalled();
		expect(mockRequests.registerUserRequest).toHaveBeenCalledTimes(1);
	});

	it('requires a captcha token when CAPTCHA_SECRET_KEY is genuinely set', async () => {
		const { POST } = loadRoute({ secret: 'real-secret', siteKey: 'real-site-key' });

		const res = await POST(post(validBody)); // no recaptcha field

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toEqual({ errors: expect.objectContaining({ recaptcha: RECAPTCHA_ERROR }) });
		expect(mockRequests.registerUserRequest).not.toHaveBeenCalled();
	});

	it('answers 400 when Google rejects the captcha token', async () => {
		mockRecaptcha.mockResolvedValue({ success: false });
		const { POST } = loadRoute({ secret: 'real-secret', siteKey: 'real-site-key' });

		const res = await POST(post({ ...validBody, recaptcha: 'bad-token' }));

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toEqual({ errors: { recaptcha: 'Invalid reCAPTCHA. Please try again' } });
		expect(mockRecaptcha).toHaveBeenCalledWith({ secret: 'real-secret', response: 'bad-token' });
		expect(mockRequests.registerUserRequest).not.toHaveBeenCalled();
	});
});

describe('POST /api/auth/register — validation', () => {
	it('answers 400 (not 200) with field errors when the body is invalid', async () => {
		const { POST } = loadRoute({});

		const res = await POST(post({ name: '', email: 'not-an-email', team: '' }));

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(Object.keys(body.errors)).toEqual(expect.arrayContaining(['name', 'email', 'team']));
		expect(mockRequests.registerUserRequest).not.toHaveBeenCalled();
	});

	it('never logs the generated password', async () => {
		primeHappyPath();
		const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
		const { POST } = loadRoute({});

		await POST(post(validBody));

		const logged = log.mock.calls.flat().map(String).join('\n');
		expect(logged).not.toMatch(/password/i);
		log.mockRestore();
	});
});
