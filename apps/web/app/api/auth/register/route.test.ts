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

// No top-level import in this file: keep it a module so its consts stay file-scoped.
export {};

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
/**
 * Ever ID sign-up: a register body that carries the `ever_id` marker creates the account from the verified Ever
 * ID through the Gauzy API (`POST /api/auth/zitadel/signup`), only once the person confirmed, with the one-time key
 * of the sealed cookie the sign-in set. Without the marker the route is unchanged. These cases are appended; the
 * ones above are untouched.
 */
const mockEverIdRequests = {
	everIdSignupRequest: jest.fn(),
	everIdWorkspaceSigninRequest: jest.fn()
};
jest.mock('@/core/services/server/requests/ever-id', () => mockEverIdRequests);

const EVER_ID_HANDOFF = 'k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA';
const EVER_ID_TERMS = [{ documentId: 'tos:gauzy', version: '1.0.2', sha256: 'a'.repeat(64), locale: 'en' }];
const EVER_ID_KEYS = [
	'NEXT_PUBLIC_EVER_ID_APP_NAME',
	'EVER_ID_ISSUER_URL',
	'EVER_ID_CLIENT_ID',
	'EVER_ID_CLIENT_SECRET',
	'GAUZY_API_SERVER_URL',
	'AUTH_SECRET'
];
const EVER_ID_ORIGINAL_ENV = Object.fromEntries(EVER_ID_KEYS.map((key) => [key, process.env[key]]));

function configureEverId(on: boolean) {
	for (const key of EVER_ID_KEYS) delete process.env[key];
	process.env.AUTH_SECRET = 'test-only-auth-secret';
	if (on) {
		process.env.NEXT_PUBLIC_EVER_ID_APP_NAME = 'Ever ID';
		process.env.EVER_ID_ISSUER_URL = 'https://id.example.test';
		process.env.EVER_ID_CLIENT_ID = 'teams-web-client';
		process.env.EVER_ID_CLIENT_SECRET = 'teams-web-secret';
		process.env.GAUZY_API_SERVER_URL = 'https://api.example.test';
	}
}

function restoreEverIdEnv() {
	for (const [key, value] of Object.entries(EVER_ID_ORIGINAL_ENV)) {
		if (value === undefined) delete process.env[key];
		else process.env[key] = value;
	}
}

/** The Cookie header the Ever ID sign-in leaves for a step, sealed by this server. */
function everIdCookie(step: 'signup' | 'confirm' = 'signup', key = EVER_ID_HANDOFF): string {
	let value = '';
	jest.isolateModules(() => {
		value = require('@/core/lib/auth/ever-id/handoff').sealEverIdHandoff(key, step);
	});
	return `ever-id-handoff=${value}`;
}

const everIdBody = (extra: Record<string, unknown> = {}) => ({
	name: 'New Person',
	email: 'new.person@example.test',
	team: 'New Team',
	timezone: 'UTC',
	ever_id: 'signup',
	verified_name: true,
	terms: EVER_ID_TERMS,
	...extra
});

function postEverId(
	body: Record<string, unknown>,
	options: { cookie?: string | null; contentType?: string } = {}
): Request {
	const cookie = options.cookie === undefined ? everIdCookie() : options.cookie;
	return new Request('https://stage.ever.team/api/auth/register', {
		method: 'POST',
		headers: { 'content-type': options.contentType ?? 'application/json', ...(cookie ? { cookie } : {}) },
		body: JSON.stringify(body)
	});
}

/** Whether a response drops the step cookie. */
function dropsEverIdCookie(res: Response): boolean {
	return /ever-id-handoff=;.*Max-Age=0/i.test(res.headers.get('set-cookie') ?? '');
}

function primeEverIdHappyPath() {
	mockEverIdRequests.everIdSignupRequest.mockResolvedValue({
		status: 200,
		data: {
			workspaces: [
				{
					token: 'workspace-token-new',
					user: { id: 'new-user', email: 'new.person@example.test', tenant: null }
				}
			],
			confirmed_email: 'new.person@example.test',
			show_popup: false,
			total_workspaces: 1,
			blocked_workspaces: []
		}
	});
	mockEverIdRequests.everIdWorkspaceSigninRequest.mockResolvedValue({
		status: 200,
		data: { user: { id: 'new-user', tenantId: null }, token: 'access-1', refresh_token: 'refresh-1' }
	});
	mockRequests.createTenantRequest.mockResolvedValue({ data: { id: 'tenant-1' } });
	mockRequests.createOrganizationRequest.mockResolvedValue({ data: { id: 'org-1' } });
	mockRequests.createEmployeeFromUser.mockResolvedValue({ data: { id: 'emp-1' } });
	mockRequests.createOrganizationTeamRequest.mockResolvedValue({ data: { id: 'team-1' } });
	mockRequests.refreshTokenRequest.mockResolvedValue({ data: { token: 'access-2', refresh_token: 'refresh-2' } });
}

describe('POST /api/auth/register — Ever ID sign-up', () => {
	beforeEach(() => {
		configureEverId(true);
		// The outcome lines are checked by the log module's own tests.
		jest.spyOn(console, 'info').mockImplementation(() => undefined);
		jest.spyOn(console, 'warn').mockImplementation(() => undefined);
	});
	afterEach(() => {
		restoreEverIdEnv();
		jest.restoreAllMocks();
	});

	it('answers 400 and calls nothing without the confirmation', async () => {
		const { POST } = loadRoute({});

		const res = await POST(postEverId(everIdBody()));

		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toEqual({ errors: { confirm: expect.any(String) } });
		expect(mockEverIdRequests.everIdSignupRequest).not.toHaveBeenCalled();
		expect(mockRequests.registerUserRequest).not.toHaveBeenCalled();
	});

	it("creates the account through the Ever ID sign-up exactly once, with the cookie's key and the verified name", async () => {
		primeEverIdHappyPath();
		const { POST } = loadRoute({});

		const res = await POST(postEverId(everIdBody({ confirm: true })));

		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		expect(dropsEverIdCookie(res)).toBe(true);
		expect(mockEverIdRequests.everIdSignupRequest).toHaveBeenCalledTimes(1);
		// The name shown was the verified one: the API uses its own copy of it.
		expect(mockEverIdRequests.everIdSignupRequest).toHaveBeenCalledWith({
			handoff: EVER_ID_HANDOFF,
			terms: EVER_ID_TERMS
		});
		expect(mockRequests.registerUserRequest).not.toHaveBeenCalled();
		expect(mockRequests.loginUserRequest).not.toHaveBeenCalled();
		// Gauzy's unchanged workspace sign-in with the new account's token, then the usual setup steps.
		expect(mockEverIdRequests.everIdWorkspaceSigninRequest).toHaveBeenCalledWith(
			'new.person@example.test',
			'workspace-token-new'
		);
		expect(mockRequests.createTenantRequest).toHaveBeenCalledWith('New Team', 'access-1');
		expect(mockRequests.createOrganizationRequest).toHaveBeenCalledWith(
			{ currency: 'USD', name: 'New Team', tenantId: 'tenant-1', invitesAllowed: true },
			'access-1'
		);
		expect(mockRequests.createEmployeeFromUser).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'org-1', tenantId: 'tenant-1', userId: 'new-user' }),
			'access-1'
		);
		expect(mockRequests.createOrganizationTeamRequest).toHaveBeenCalledWith(
			{ name: 'New Team', tenantId: 'tenant-1', organizationId: 'org-1', managerIds: ['emp-1'], public: true },
			'access-1'
		);
		expect(mockRequests.refreshTokenRequest).toHaveBeenCalledWith('refresh-1');
	});

	it('sends the name the person entered when the Ever ID had none (first word, then the rest)', async () => {
		primeEverIdHappyPath();
		const { POST } = loadRoute({});

		await POST(postEverId(everIdBody({ confirm: true, verified_name: false, name: '  Mary Jane   Smith ' })));

		expect(mockEverIdRequests.everIdSignupRequest).toHaveBeenCalledWith({
			handoff: EVER_ID_HANDOFF,
			firstName: 'Mary',
			lastName: 'Jane Smith',
			terms: EVER_ID_TERMS
		});
	});

	it('sends the person to checkout when the API asks for a subscription first', async () => {
		mockEverIdRequests.everIdSignupRequest.mockResolvedValue({
			status: 403,
			data: {
				code: 'subscription_required',
				checkoutUrl: 'https://billing.example.test/checkout/1',
				handoff: 'next-key'
			}
		});
		const { POST } = loadRoute({});

		const res = await POST(postEverId(everIdBody({ confirm: true })));

		expect(res.status).toBe(403);
		await expect(res.json()).resolves.toEqual({ checkoutUrl: 'https://billing.example.test/checkout/1' });
		expect(dropsEverIdCookie(res)).toBe(true);
		expect(mockEverIdRequests.everIdWorkspaceSigninRequest).not.toHaveBeenCalled();
		expect(mockRequests.createTenantRequest).not.toHaveBeenCalled();
	});

	it.each([
		[400, 400, 'confirm', false],
		[410, 410, 'email', true],
		[429, 429, 'email', false],
		[500, 502, 'email', false]
	])('maps an API answer %s to %s', async (apiStatus, status, field, dropsCookie) => {
		mockEverIdRequests.everIdSignupRequest.mockResolvedValue({
			status: apiStatus,
			data: { statusCode: apiStatus }
		});
		const { POST } = loadRoute({});

		const res = await POST(postEverId(everIdBody({ confirm: true })));

		expect(res.status).toBe(status);
		expect(res.headers.get('cache-control')).toBe('no-store');
		expect(Object.keys((await res.json()).errors)).toEqual([field]);
		expect(dropsEverIdCookie(res)).toBe(dropsCookie);
		expect(mockRequests.createTenantRequest).not.toHaveBeenCalled();
	});

	it.each([
		['no cookie', null],
		['a cookie this server did not seal', `ever-id-handoff=${Buffer.from('forged').toString('base64url')}`],
		['the cookie of the code step', 'confirm']
	])('answers 410 and calls nothing for %s', async (_label, cookie) => {
		const { POST } = loadRoute({});

		const res = await POST(
			postEverId(everIdBody({ confirm: true }), {
				cookie: cookie === 'confirm' ? everIdCookie('confirm') : cookie
			})
		);

		expect(res.status).toBe(410);
		expect(mockEverIdRequests.everIdSignupRequest).not.toHaveBeenCalled();
		expect(mockRequests.registerUserRequest).not.toHaveBeenCalled();
	});

	it.each([
		['another marker', { ever_id: 'confirm' }, 'application/json'],
		['a body sent as plain text', {}, 'text/plain'],
		['malformed documents', { terms: [{ documentId: 'tos:gauzy' }] }, 'application/json'],
		['more documents than any form shows', { terms: Array(33).fill(EVER_ID_TERMS[0]) }, 'application/json']
	])('answers 400 and calls nothing for %s', async (_label, extra, contentType) => {
		const { POST } = loadRoute({});

		const res = await POST(postEverId(everIdBody({ confirm: true, ...extra }), { contentType }));

		expect(res.status).toBe(400);
		expect(mockEverIdRequests.everIdSignupRequest).not.toHaveBeenCalled();
		expect(mockRequests.registerUserRequest).not.toHaveBeenCalled();
	});

	it('submits one key five times at most, then answers 429 without calling the API', async () => {
		mockEverIdRequests.everIdSignupRequest.mockResolvedValue({ status: 400, data: {} });
		const { POST } = loadRoute({});

		const statuses: number[] = [];
		for (let attempt = 0; attempt < 6; attempt++) {
			statuses.push((await POST(postEverId(everIdBody({ confirm: true })))).status);
		}

		expect(statuses).toEqual([400, 400, 400, 400, 400, 429]);
		expect(mockEverIdRequests.everIdSignupRequest).toHaveBeenCalledTimes(5);
	});

	it('says plainly when the account was created but its workspace could not be set up', async () => {
		primeEverIdHappyPath();
		mockRequests.createOrganizationRequest.mockRejectedValue(new Error('API down'));
		const { POST } = loadRoute({});

		const res = await POST(postEverId(everIdBody({ confirm: true })));

		expect(res.status).toBe(502);
		expect((await res.json()).errors.team).toMatch(/account was created/);
		expect(dropsEverIdCookie(res)).toBe(true);
	});

	it('does not try the workspace sign-in without the verified e-mail address in the answer', async () => {
		primeEverIdHappyPath();
		mockEverIdRequests.everIdSignupRequest.mockResolvedValue({
			status: 200,
			data: {
				workspaces: [{ token: 'workspace-token-new', user: { id: 'new-user', email: null, tenant: null } }],
				confirmed_email: '',
				show_popup: false,
				total_workspaces: 1,
				blocked_workspaces: []
			}
		});
		const { POST } = loadRoute({});

		const res = await POST(postEverId(everIdBody({ confirm: true })));

		expect(res.status).toBe(502);
		expect(mockEverIdRequests.everIdWorkspaceSigninRequest).not.toHaveBeenCalled();
		expect(mockRequests.createTenantRequest).not.toHaveBeenCalled();
	});

	it('still requires the captcha when it is configured', async () => {
		const { POST } = loadRoute({ secret: 'real-secret', siteKey: 'real-site-key' });

		const res = await POST(postEverId(everIdBody({ confirm: true })));

		expect(res.status).toBe(400);
		expect(mockEverIdRequests.everIdSignupRequest).not.toHaveBeenCalled();
	});

	it('answers 404 and calls nothing while Ever ID is not configured', async () => {
		configureEverId(false);
		const { POST } = loadRoute({});

		const res = await POST(postEverId(everIdBody({ confirm: true })));

		expect(res.status).toBe(404);
		expect(mockEverIdRequests.everIdSignupRequest).not.toHaveBeenCalled();
		expect(mockRequests.registerUserRequest).not.toHaveBeenCalled();
	});

	it('keeps the plain register path, with the same request body, for a body without the marker', async () => {
		primeHappyPath();
		const { POST } = loadRoute({});

		const res = await POST(post(validBody));

		expect(res.status).toBe(200);
		expect(mockEverIdRequests.everIdSignupRequest).not.toHaveBeenCalled();
		expect(mockRequests.registerUserRequest).toHaveBeenCalledTimes(1);
		const [registerBody] = mockRequests.registerUserRequest.mock.calls[0];
		expect(registerBody).toEqual({
			password: expect.any(String),
			confirmPassword: registerBody.password,
			user: { firstName: 'E2E', lastName: 'Tester', email: 'e2e@example.com', timeZone: 'UTC' },
			appEmailConfirmationUrl: 'https://stage.ever.team/verify-email'
		});
	});
});
