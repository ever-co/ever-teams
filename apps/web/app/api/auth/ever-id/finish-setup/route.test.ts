/**
 * POST /api/auth/ever-id/finish-setup: a workspace an Ever ID sign-in lists without a tenant (an account the API
 * created whose setup here did not finish, or a sign-up completed after checkout), or whose owner has no
 * organization yet (the setup stopped after the tenant), is set up instead of refused. The workspace token comes
 * from the Ever ID sign-in's next-auth session on the server, never from the page.
 */

const mockAuth = jest.fn();
const mockWorkspaceSignin = jest.fn();
const mockRequests = {
	createTenantRequest: jest.fn(),
	createTenantSmtpRequest: jest.fn(),
	createOrganizationRequest: jest.fn(),
	createEmployeeFromUser: jest.fn(),
	createOrganizationTeamRequest: jest.fn(),
	getUserOrganizationsRequest: jest.fn(),
	refreshTokenRequest: jest.fn()
};
const mockSetAuthCookies = jest.fn();

jest.mock('@/auth', () => ({ auth: () => mockAuth() }));
jest.mock('@/core/services/server/requests', () => mockRequests);
jest.mock('@/core/services/server/requests/ever-id', () => ({
	everIdWorkspaceSigninRequest: (...args: unknown[]) => mockWorkspaceSignin(...args)
}));
jest.mock('@/core/lib/helpers/cookies', () => ({
	setAuthCookies: (...args: unknown[]) => mockSetAuthCookies(...args)
}));

// No top-level import in this file: keep it a module so its consts stay file-scoped.
export {};

type RouteModule = typeof import('./route');

const EVER_ID_ENV = [
	'NEXT_PUBLIC_EVER_ID_APP_NAME',
	'EVER_ID_ISSUER_URL',
	'EVER_ID_CLIENT_ID',
	'EVER_ID_CLIENT_SECRET',
	'GAUZY_API_SERVER_URL'
];
const ORIGINAL_ENV = { ...process.env };

const workspace = (id: string, tenantId: string | null) => ({
	token: `workspace-token-${id}`,
	user: {
		id,
		email: 'person@example.test',
		name: 'Test Person',
		imageUrl: null,
		tenant: tenantId ? { id: tenantId, name: 'Acme', logo: '' } : null
	}
});

const everIdSession = (workspaces = [workspace('u1', 't1'), workspace('u2', null)]) => ({
	user: { name: 'Test Person' },
	authCookie: { provider: 'ever-id', workspaces, confirmed_mail: 'person@example.test' }
});

function loadRoute(configured = true): RouteModule {
	for (const key of EVER_ID_ENV) delete process.env[key];
	if (configured) {
		Object.assign(process.env, {
			NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID',
			EVER_ID_ISSUER_URL: 'https://id.example.test',
			EVER_ID_CLIENT_ID: 'teams-web-client',
			EVER_ID_CLIENT_SECRET: 'teams-web-secret',
			GAUZY_API_SERVER_URL: 'https://api.example.test'
		});
	}
	let mod: RouteModule | undefined;
	jest.isolateModules(() => {
		mod = require('./route');
	});
	return mod as RouteModule;
}

function post(body: unknown, contentType = 'application/json') {
	return new Request('https://teams.example.test/api/auth/ever-id/finish-setup', {
		method: 'POST',
		headers: { 'content-type': contentType },
		body: typeof body === 'string' ? body : JSON.stringify(body)
	});
}

function primeSetup() {
	mockWorkspaceSignin.mockResolvedValue({
		status: 200,
		data: {
			user: { id: 'u2', tenantId: null, name: 'Test Person' },
			token: 'access-1',
			refresh_token: 'refresh-1'
		}
	});
	mockRequests.createTenantRequest.mockResolvedValue({ data: { id: 'tenant-2' } });
	mockRequests.createOrganizationRequest.mockResolvedValue({ data: { id: 'org-2' } });
	mockRequests.createEmployeeFromUser.mockResolvedValue({ data: { id: 'emp-2' } });
	mockRequests.createOrganizationTeamRequest.mockResolvedValue({ data: { id: 'team-2' } });
	mockRequests.refreshTokenRequest.mockResolvedValue({ data: { token: 'access-2', refresh_token: 'refresh-2' } });
}

beforeEach(() => {
	mockAuth.mockResolvedValue(everIdSession());
	jest.spyOn(console, 'info').mockImplementation(() => undefined);
	jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.resetAllMocks();
	process.env = { ...ORIGINAL_ENV };
});

describe('POST /api/auth/ever-id/finish-setup', () => {
	it('answers 404 and calls nothing while Ever ID is not configured', async () => {
		const { POST } = loadRoute(false);

		const res = await POST(post({ workspace: 1 }));

		expect(res.status).toBe(404);
		expect(mockWorkspaceSignin).not.toHaveBeenCalled();
	});

	it("sets the workspace up with the session's token and signs the person in", async () => {
		primeSetup();
		const { POST } = loadRoute();

		const res = await POST(post({ workspace: 1, timezone: 'Europe/Paris' }));

		expect(res.status).toBe(200);
		expect(res.headers.get('cache-control')).toBe('no-store');
		expect(mockWorkspaceSignin).toHaveBeenCalledWith('person@example.test', 'workspace-token-u2');
		// The usual first team name, as the sign-up form proposes it.
		expect(mockRequests.createTenantRequest).toHaveBeenCalledWith("Test Person's Team", 'access-1');
		expect(mockRequests.createOrganizationTeamRequest).toHaveBeenCalledWith(
			expect.objectContaining({ name: "Test Person's Team", tenantId: 'tenant-2', managerIds: ['emp-2'] }),
			'access-1'
		);
		expect(mockSetAuthCookies).toHaveBeenCalledWith(
			expect.objectContaining({
				access_token: 'access-2',
				refresh_token: { token: 'refresh-2' },
				tenantId: 'tenant-2',
				organizationId: 'org-2',
				teamId: 'team-2',
				userId: 'u2',
				timezone: 'Europe/Paris'
			}),
			expect.anything()
		);
	});

	it.each([
		['an index outside the list', { workspace: 7 }],
		['no index', {}],
		['an index that is not a whole number', { workspace: 1.5 }]
	])('answers 400 and calls nothing for %s', async (_label, body) => {
		const { POST } = loadRoute();

		expect((await POST(post(body))).status).toBe(400);
		expect(mockWorkspaceSignin).not.toHaveBeenCalled();
	});

	it('answers 400 for a body that is not JSON', async () => {
		const { POST } = loadRoute();

		expect((await POST(post('workspace=1', 'text/plain'))).status).toBe(400);
	});

	it.each([
		['no session (sign in with Ever ID again)', null, 410],
		['a session of another sign-in', { user: {}, authCookie: { access_token: 'x' } }, 400]
	])('answers %s without calling the API', async (_label, session, status) => {
		mockAuth.mockResolvedValue(session);
		const { POST } = loadRoute();

		expect((await POST(post({ workspace: 1 }))).status).toBe(status);
		expect(mockWorkspaceSignin).not.toHaveBeenCalled();
	});

	it('answers 410 when the workspace token expired (the page starts the Ever ID sign-in again)', async () => {
		mockWorkspaceSignin.mockResolvedValue({
			status: 400,
			data: { statusCode: 400, message: 'JWT token has been expired.' }
		});
		const { POST } = loadRoute();

		const res = await POST(post({ workspace: 1 }));

		expect(res.status).toBe(410);
		expect(mockRequests.createTenantRequest).not.toHaveBeenCalled();
	});

	it('answers 409 and creates nothing when the account already has its workspace', async () => {
		mockWorkspaceSignin.mockResolvedValue({
			status: 200,
			data: { user: { id: 'u2', tenantId: 'tenant-9' }, token: 'access-1', refresh_token: 'refresh-1' }
		});
		const { POST } = loadRoute();

		expect((await POST(post({ workspace: 1 }))).status).toBe(409);
		expect(mockRequests.createTenantRequest).not.toHaveBeenCalled();
	});

	it('sets up one workspace at most 3 times a minute; then 429 with when to try again, without calling the API', async () => {
		let clock = Date.now();
		jest.spyOn(Date, 'now').mockImplementation(() => clock);
		mockWorkspaceSignin.mockResolvedValue({
			status: 200,
			data: { user: { id: 'u2', tenantId: 'tenant-9' }, token: 'access-1', refresh_token: 'refresh-1' }
		});
		const { POST } = loadRoute();

		const statuses: number[] = [];
		for (let attempt = 0; attempt < 3; attempt++) statuses.push((await POST(post({ workspace: 1 }))).status);
		clock += 45_000;
		const limited = await POST(post({ workspace: 1 }));

		expect(statuses).toEqual([409, 409, 409]);
		expect(limited.status).toBe(429);
		expect(limited.headers.get('retry-after')).toBe('15');
		expect(mockWorkspaceSignin).toHaveBeenCalledTimes(3);

		clock += 15_000;
		expect((await POST(post({ workspace: 1 }))).status).toBe(409);
	});

	it("resumes a setup that stopped after the tenant: the owner's tenant is kept, the remaining steps run", async () => {
		primeSetup();
		mockWorkspaceSignin.mockResolvedValue({
			status: 200,
			data: {
				user: { id: 'u1', tenantId: 't1', name: 'Test Person', role: { name: 'SUPER_ADMIN' } },
				token: 'access-1',
				refresh_token: 'refresh-1'
			}
		});
		mockRequests.getUserOrganizationsRequest.mockResolvedValue({ data: { items: [], total: 0 } });
		const { POST } = loadRoute();

		const res = await POST(post({ workspace: 0 }));

		expect(res.status).toBe(200);
		expect(mockWorkspaceSignin).toHaveBeenCalledWith('person@example.test', 'workspace-token-u1');
		expect(mockRequests.getUserOrganizationsRequest).toHaveBeenCalledWith(
			{ tenantId: 't1', userId: 'u1' },
			'access-1'
		);
		// The tenant exists: never a second one (the API allows one per account).
		expect(mockRequests.createTenantRequest).not.toHaveBeenCalled();
		expect(mockRequests.createTenantSmtpRequest).not.toHaveBeenCalled();
		expect(mockRequests.createOrganizationRequest).toHaveBeenCalledWith(
			expect.objectContaining({ name: "Test Person's Team", tenantId: 't1' }),
			'access-1'
		);
		expect(mockRequests.createEmployeeFromUser).toHaveBeenCalledWith(
			expect.objectContaining({ organizationId: 'org-2', tenantId: 't1', userId: 'u1' }),
			'access-1'
		);
		expect(mockSetAuthCookies).toHaveBeenCalledWith(
			expect.objectContaining({ tenantId: 't1', organizationId: 'org-2', teamId: 'team-2', userId: 'u1' }),
			expect.anything()
		);
	});

	it.each([
		[
			'the owner of a tenant that has its organization',
			{ name: 'SUPER_ADMIN' },
			{ data: { items: [{ organizationId: 'org-1' }], total: 1 } }
		],
		['a member of a tenant it does not own', { name: 'EMPLOYEE' }, undefined],
		['an account whose role the answer does not name', undefined, undefined]
	])('answers 409 and creates nothing for %s', async (_label, role, memberships) => {
		mockWorkspaceSignin.mockResolvedValue({
			status: 200,
			data: { user: { id: 'u1', tenantId: 't1', role }, token: 'access-1', refresh_token: 'refresh-1' }
		});
		if (memberships) mockRequests.getUserOrganizationsRequest.mockResolvedValue(memberships);
		const { POST } = loadRoute();

		expect((await POST(post({ workspace: 0 }))).status).toBe(409);
		expect(mockRequests.createTenantRequest).not.toHaveBeenCalled();
		expect(mockRequests.createOrganizationRequest).not.toHaveBeenCalled();
		expect(mockSetAuthCookies).not.toHaveBeenCalled();
		if (!memberships) expect(mockRequests.getUserOrganizationsRequest).not.toHaveBeenCalled();
	});

	it('answers 502 when a setup step fails', async () => {
		primeSetup();
		mockRequests.createOrganizationRequest.mockRejectedValue(new Error('API down'));
		const { POST } = loadRoute();

		expect((await POST(post({ workspace: 1 }))).status).toBe(502);
		expect(mockSetAuthCookies).not.toHaveBeenCalled();
	});
});
