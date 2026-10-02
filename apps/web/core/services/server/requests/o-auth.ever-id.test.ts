/**
 * The Ever ID sign-in through next-auth: the real auth.ts callbacks and GauzyAdapter, driven in the order
 * @auth/core calls them in its OAuth callback (adapter.getUserByAccount, then callbacks.signIn, then
 * getUserByAccount again and createUser/linkAccount for a new user, then callbacks.jwt).
 *
 * The Gauzy API is mocked at the request functions. Checked here: one ID token exchange per sign-in, the
 * redirect of each answer (a step marker at most in a URL, the one-time key in a sealed httpOnly cookie), the
 * preselected workspace, no account created behind the person's back, the chooser data dropped from the session
 * once the workspace sign-in is done, and the other providers' path unchanged.
 */

const mockSignWithEverId = jest.fn();
const mockSocialSignin = jest.fn();
const mockRegisterUser = jest.fn();
const mockLoginUser = jest.fn();
const mockCreateTenant = jest.fn();
const mockCreateOrganization = jest.fn();
const mockCreateEmployee = jest.fn();
const mockCreateTeam = jest.fn();
const mockRefreshToken = jest.fn();
const mockLinkSocialAccount = jest.fn();
const mockSocialUserByProvider = jest.fn();
const mockSigninWorkspace = jest.fn();
const mockUserOrganizations = jest.fn();
let mockNextAuthFactory: ((request: unknown) => Promise<Record<string, any>>) | undefined;
const mockCookieStore = { set: jest.fn() };
const mockRequestHeaders: Record<string, string> = {};

// The callback request's cookies and headers (next/headers works only inside a request).
jest.mock('next/headers', () => ({
	cookies: async () => mockCookieStore,
	headers: async () => new Headers(mockRequestHeaders)
}));

// next-auth ships ESM only: capture the configuration auth.ts hands to it.
jest.mock('next-auth', () => ({
	__esModule: true,
	default: (factory: (request: unknown) => Promise<Record<string, any>>) => {
		mockNextAuthFactory = factory;
		return { handlers: {}, signIn: jest.fn(), signOut: jest.fn(), auth: jest.fn() };
	}
}));
function mockProvider(id: string, name: string) {
	return { __esModule: true, default: (options: Record<string, unknown>) => ({ id, name, type: 'oauth', options }) };
}
jest.mock('next-auth/providers/apple', () => mockProvider('apple', 'Apple'));
jest.mock('next-auth/providers/discord', () => mockProvider('discord', 'Discord'));
jest.mock('next-auth/providers/facebook', () => mockProvider('facebook', 'Facebook'));
jest.mock('next-auth/providers/google', () => mockProvider('google', 'Google'));
jest.mock('next-auth/providers/github', () => mockProvider('github', 'GitHub'));
jest.mock('next-auth/providers/linkedin', () => mockProvider('linkedin', 'LinkedIn'));
jest.mock('next-auth/providers/microsoft-entra-id', () => mockProvider('microsoft-entra-id', 'Microsoft Entra ID'));
jest.mock('next-auth/providers/slack', () => mockProvider('slack', 'Slack'));
jest.mock('next-auth/providers/twitter', () => mockProvider('twitter', 'Twitter'));

jest.mock('@/core/services/server/requests/ever-id', () => ({
	signWithEverIdRequest: (...args: unknown[]) => mockSignWithEverId(...args)
}));
jest.mock('@/core/services/server/requests', () => ({
	signWithSocialLoginsRequest: (...args: unknown[]) => mockSocialSignin(...args),
	registerUserRequest: (...args: unknown[]) => mockRegisterUser(...args),
	loginUserRequest: (...args: unknown[]) => mockLoginUser(...args),
	createTenantRequest: (...args: unknown[]) => mockCreateTenant(...args),
	createTenantSmtpRequest: jest.fn(),
	createOrganizationRequest: (...args: unknown[]) => mockCreateOrganization(...args),
	createEmployeeFromUser: (...args: unknown[]) => mockCreateEmployee(...args),
	createOrganizationTeamRequest: (...args: unknown[]) => mockCreateTeam(...args),
	refreshTokenRequest: (...args: unknown[]) => mockRefreshToken(...args),
	linkUserToSocialAccount: (...args: unknown[]) => mockLinkSocialAccount(...args),
	signinGetSocialUserByProviderIdRequest: (...args: unknown[]) => mockSocialUserByProvider(...args)
}));
jest.mock('@/core/services/client/api/auth/signin.service', () => ({
	signinService: { signInWorkspace: (...args: unknown[]) => mockSigninWorkspace(...args) }
}));
jest.mock('@/core/services/client/api/users/user-organization.service', () => ({
	userOrganizationService: { getUserOrganizations: (...args: unknown[]) => mockUserOrganizations(...args) }
}));

const HANDOFF = 'k3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yK3yA';
/** An unsigned stand-in shaped like a compact JWS (built at runtime: it is test data, not a credential). */
const ID_TOKEN = [{ alg: 'none' }, { sub: 'person-1' }]
	.map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
	.concat('unsigned')
	.join('.');
const EVER_ID_ENV = [
	'NEXT_PUBLIC_EVER_ID_APP_NAME',
	'EVER_ID_ISSUER_URL',
	'EVER_ID_ISSUER',
	'EVER_ID_CLIENT_ID',
	'EVER_ID_CLIENT_SECRET',
	'EVER_PLATFORM_PROJECT_ID',
	'EVER_ID_TEAMS_AUTO_PROVISION',
	'GAUZY_API_SERVER_URL',
	'AUTH_SECRET'
];
const ORIGINAL_ENV = { ...process.env };
const CALLBACK_REQUEST = new Request('https://teams.example.test/api/auth/callback/ever-id?code=c&state=s');

const workspace = (id: string, tenantId: string, name: string) => ({
	token: `workspace-token-${id}`,
	user: {
		id,
		email: 'person@example.test',
		name: 'Test Person',
		imageUrl: null,
		lastTeamId: null,
		lastLoginAt: null,
		tenant: { id: tenantId, name, logo: '' }
	}
});
const workspaces = (...entries: ReturnType<typeof workspace>[]) => ({
	status: 200,
	data: {
		workspaces: entries,
		confirmed_email: 'person@example.test',
		show_popup: entries.length > 1,
		total_workspaces: entries.length,
		blocked_workspaces: []
	}
});

let logs: string[];

beforeEach(() => {
	mockRequestHeaders['x-forwarded-proto'] = 'https';
	logs = [];
	for (const method of ['info', 'warn', 'error', 'log'] as const) {
		jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
			logs.push(args.map(String).join(' '));
		});
	}
});

afterEach(() => {
	jest.restoreAllMocks();
	jest.resetAllMocks();
	process.env = { ...ORIGINAL_ENV };
});

/** The configuration factory auth.ts handed to next-auth (read through a call: it is set inside the mock). */
function capturedNextAuthFactory() {
	return mockNextAuthFactory;
}

/** Loads auth.ts as a server started with this env and returns next-auth's configuration and adapter. */
async function loadAuth(env: Record<string, string> = {}, request: Request = CALLBACK_REQUEST) {
	for (const key of EVER_ID_ENV) delete process.env[key];
	Object.assign(
		process.env,
		{
			NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID',
			EVER_ID_ISSUER_URL: 'https://id.example.test',
			EVER_ID_CLIENT_ID: 'teams-web-client',
			EVER_ID_CLIENT_SECRET: 'teams-web-secret',
			GAUZY_API_SERVER_URL: 'https://api.example.test',
			AUTH_SECRET: 'test-only-auth-secret'
		},
		env
	);
	for (const [key, value] of Object.entries(env)) {
		if (value === undefined) delete process.env[key];
	}
	mockNextAuthFactory = undefined;
	jest.isolateModules(() => {
		require('@/auth');
	});
	const factory = capturedNextAuthFactory();
	if (!factory) throw new Error('auth.ts did not configure next-auth');
	const config = await factory(request);
	return { config, adapter: config.adapter };
}

/** The cookie the callback set for a step, and the key it opens to (with the same secret). */
function setStepCookie() {
	expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
	const cookie = mockCookieStore.set.mock.calls[0][0] as Record<string, unknown>;
	const open = (step: 'confirm' | 'signup') => {
		let key: string | null = null;
		jest.isolateModules(() => {
			key = require('@/core/lib/auth/ever-id/handoff').openEverIdHandoff(cookie.value, step);
		});
		return key;
	};
	return { cookie, open };
}

function everIdAccount() {
	return {
		provider: 'ever-id',
		type: 'oidc',
		providerAccountId: 'person-1',
		id_token: ID_TOKEN,
		access_token: 'opaque-access-token'
	};
}

/** Runs one Ever ID callback in @auth/core's order. */
async function signInWithEverId(
	auth: Awaited<ReturnType<typeof loadAuth>>,
	profile: Record<string, unknown> = { sub: 'person-1', email: 'person@example.test' }
) {
	const { config, adapter } = auth;
	const account = everIdAccount();
	const lookup = { provider: account.provider, providerAccountId: account.providerAccountId };
	const before = await adapter.getUserByAccount(lookup);
	const signIn = await config.callbacks.signIn({
		user: before ?? { id: 'person-1', email: 'person@example.test' },
		account,
		profile
	});
	let user = null;
	let token = null;
	if (signIn === true) {
		user = await adapter.getUserByAccount(lookup);
		if (!user) {
			user = await adapter.createUser({ id: 'person-1', email: 'person@example.test', name: 'Test Person' });
			await adapter.linkAccount({ ...account, userId: user.id });
		}
		token = await config.callbacks.jwt({ token: { sub: user.id }, user, account, profile, trigger: 'signIn' });
	}
	return { before, signIn, user, token };
}

describe('Ever ID sign-in: the ID token exchange', () => {
	it('exchanges the ID token exactly once, resolves the linked user and keeps the workspaces for the chooser', async () => {
		mockSignWithEverId.mockResolvedValue(workspaces(workspace('user-1', 'tenant-1', 'Acme')));
		const auth = await loadAuth();

		const { before, signIn, user, token } = await signInWithEverId(auth);

		expect(before).toBeNull();
		expect(signIn).toBe(true);
		expect(mockSignWithEverId).toHaveBeenCalledTimes(1);
		expect(mockSignWithEverId).toHaveBeenCalledWith(ID_TOKEN);
		expect(user).toEqual({ id: 'user-1', email: 'person@example.test', name: 'Test Person', emailVerified: null });
		expect(token?.authCookie).toEqual({
			provider: 'ever-id',
			workspaces: [workspace('user-1', 'tenant-1', 'Acme')],
			confirmed_mail: 'person@example.test'
		});
		// No Gauzy token yet and no other Gauzy call: the chooser's workspace sign-in makes the session.
		expect(mockSigninWorkspace).not.toHaveBeenCalled();
		expect(mockSocialSignin).not.toHaveBeenCalled();
		expect(mockRegisterUser).not.toHaveBeenCalled();
		expect(mockLinkSocialAccount).not.toHaveBeenCalled();
		expect(logs.join('\n')).toContain('ever_id.signin outcome=ok');
	});

	it('preselects the workspace the ID token points at when exactly one matches', async () => {
		mockSignWithEverId.mockResolvedValue(
			workspaces(workspace('user-1', 'tenant-1', 'Acme'), workspace('user-2', 'tenant-2', 'Beta'))
		);
		const auth = await loadAuth();
		const profile = {
			sub: 'person-1',
			'urn:ever:orgs': [{ id: 'org-1', links: [{ instance_id: 'i-1', product_tenant_id: 'tenant-2' }] }]
		};

		const { token } = await signInWithEverId(auth, profile);

		expect(token?.authCookie.preselectTenantId).toBe('tenant-2');
	});

	it.each([
		['no link matches', [{ id: 'org-1', links: [{ product_tenant_id: 'tenant-9' }] }]],
		[
			'two workspaces match',
			[
				{ id: 'org-1', links: [{ product_tenant_id: 'tenant-1' }] },
				{ id: 'org-2', links: [{ product_tenant_id: 'tenant-2' }] }
			]
		],
		['the claim is malformed', 'not-an-array']
	])('starts on no particular workspace when %s', async (_label, orgs) => {
		mockSignWithEverId.mockResolvedValue(
			workspaces(workspace('user-1', 'tenant-1', 'Acme'), workspace('user-2', 'tenant-2', 'Beta'))
		);
		const auth = await loadAuth();

		const { token } = await signInWithEverId(auth, { sub: 'person-1', 'urn:ever:orgs': orgs });

		expect(token?.authCookie.preselectTenantId).toBeUndefined();
	});

	it('sends a link that needs the one-time e-mail code to the passcode page; the key goes into a sealed cookie', async () => {
		mockSignWithEverId.mockResolvedValue({ status: 200, data: { confirm_required: true, handoff: HANDOFF } });
		const auth = await loadAuth();

		const { signIn, token } = await signInWithEverId(auth);

		expect(signIn).toBe('/auth/passcode?ever_id=confirm');
		const { cookie, open } = setStepCookie();
		expect(cookie).toEqual(
			expect.objectContaining({
				name: 'ever-id-handoff',
				httpOnly: true,
				sameSite: 'lax',
				secure: true,
				path: '/api/auth',
				maxAge: 1800
			})
		);
		expect(String(cookie.value)).not.toContain(HANDOFF);
		expect(open('confirm')).toBe(HANDOFF);
		expect(open('signup')).toBeNull();
		expect(token).toBeNull();
		expect(mockSignWithEverId).toHaveBeenCalledTimes(1);
		expect(logs.join('\n')).toContain('ever_id.signin outcome=confirm_required');
	});

	it('sends a person new to the product to the sign-up page, the key in a sealed cookie, and creates nothing', async () => {
		mockSignWithEverId.mockResolvedValue({ status: 404, data: { code: 'signup_required', handoff: HANDOFF } });
		const auth = await loadAuth();

		const { signIn } = await signInWithEverId(auth);

		expect(signIn).toBe('/auth/signup?ever_id=signup');
		expect(setStepCookie().open('signup')).toBe(HANDOFF);
		expect(mockRegisterUser).not.toHaveBeenCalled();
		expect(mockCreateTenant).not.toHaveBeenCalled();
	});

	it('marks the cookie Secure only for a request that came over https', async () => {
		delete mockRequestHeaders['x-forwarded-proto'];
		mockSignWithEverId.mockResolvedValue({ status: 404, data: { code: 'signup_required', handoff: HANDOFF } });
		const auth = await loadAuth();

		await signInWithEverId(auth);

		expect(setStepCookie().cookie.secure).toBe(false);
	});

	it('refuses the sign-in, and sets nothing, for a malformed key or without a secret to seal it with', async () => {
		mockSignWithEverId.mockResolvedValue({
			status: 200,
			data: { confirm_required: true, handoff: 'person@example.test' }
		});
		expect((await signInWithEverId(await loadAuth())).signIn).toBe(false);

		mockSignWithEverId.mockResolvedValue({ status: 200, data: { confirm_required: true, handoff: HANDOFF } });
		expect((await signInWithEverId(await loadAuth({ AUTH_SECRET: undefined as unknown as string }))).signIn).toBe(
			false
		);

		expect(mockCookieStore.set).not.toHaveBeenCalled();
	});

	it.each([
		['the API refused the token (401)', { status: 401, data: { statusCode: 401 } }, 'rejected'],
		['the routes are switched off (404)', { status: 404, data: { statusCode: 404 } }, 'gauzy_error'],
		['the API limits the rate (429)', { status: 429, data: {} }, 'gauzy_error']
	])('refuses the sign-in when %s', async (_label, answer, outcome) => {
		mockSignWithEverId.mockResolvedValue(answer);
		const auth = await loadAuth();

		const { signIn } = await signInWithEverId(auth);

		expect(signIn).toBe(false);
		expect(logs.join('\n')).toContain(`ever_id.signin outcome=${outcome}`);
	});

	it('refuses the sign-in when the API cannot be reached', async () => {
		mockSignWithEverId.mockRejectedValue(new TypeError('fetch failed'));
		const auth = await loadAuth();

		expect((await signInWithEverId(auth)).signIn).toBe(false);
		expect(logs.join('\n')).toContain('ever_id.signin outcome=gauzy_error');
	});

	it('ends on the company sign-in notice when every linked workspace asks for it', async () => {
		mockSignWithEverId.mockResolvedValue({
			status: 200,
			data: {
				workspaces: [],
				confirmed_email: '',
				show_popup: false,
				total_workspaces: 0,
				blocked_workspaces: [{ tenantId: 'tenant-1', tenantName: 'Acme', reason: 'company_sign_in' }]
			}
		});
		const auth = await loadAuth();

		expect((await signInWithEverId(auth)).signIn).toBe('/auth/error?error=EverIdWorkspaceBlocked');
	});

	it('never logs the ID token or the e-mail address', async () => {
		mockSignWithEverId.mockResolvedValue(workspaces(workspace('user-1', 'tenant-1', 'Acme')));
		const auth = await loadAuth();

		await signInWithEverId(auth);

		expect(logs.join('\n')).not.toMatch(/eyJ|person@example\.test/);
	});
});

describe('Ever ID sign-in without a workspace', () => {
	it('ends on the no-workspace page and creates nothing (the sign-up offer is off by default)', async () => {
		mockSignWithEverId.mockResolvedValue({ status: 404, data: { code: 'no_workspace' } });
		const auth = await loadAuth();

		const { signIn } = await signInWithEverId(auth);

		expect(signIn).toBe('/auth/error?error=EverIdNoWorkspace');
		expect(mockRegisterUser).not.toHaveBeenCalled();
		await expect(auth.adapter.createUser({ id: 'x', email: 'person@example.test', name: 'P' })).rejects.toThrow();
		expect(mockRegisterUser).not.toHaveBeenCalled();
		expect(logs.join('\n')).toContain('ever_id.signin outcome=no_workspace');
	});

	it("only offers the usual sign-up when EVER_ID_TEAMS_AUTO_PROVISION is 'true', and still creates nothing", async () => {
		mockSignWithEverId.mockResolvedValue({ status: 404, data: { code: 'no_workspace' } });
		const auth = await loadAuth({ EVER_ID_TEAMS_AUTO_PROVISION: 'true' });

		const { signIn, user, token } = await signInWithEverId(auth);

		expect(signIn).toBe('/auth/error?error=EverIdNoWorkspaceSignup');
		expect(user).toBeNull();
		expect(token).toBeNull();
		// An account comes only from the sign-up the person completes, never from the Ever ID sign-in itself.
		await expect(auth.adapter.createUser({ id: 'x', email: 'person@example.test', name: 'P' })).rejects.toThrow();
		expect(mockRegisterUser).not.toHaveBeenCalled();
		expect(mockCreateTenant).not.toHaveBeenCalled();
		expect(mockLinkSocialAccount).not.toHaveBeenCalled();
	});

	it.each(['TRUE', '1', 'yes', ' '])(
		"does not offer the sign-up for EVER_ID_TEAMS_AUTO_PROVISION='%s' (exactly 'true' only)",
		async (value) => {
			mockSignWithEverId.mockResolvedValue({ status: 404, data: { code: 'no_workspace' } });
			const auth = await loadAuth({ EVER_ID_TEAMS_AUTO_PROVISION: value });

			expect((await signInWithEverId(auth)).signIn).toBe('/auth/error?error=EverIdNoWorkspace');
		}
	);
});

describe('overlapping Ever ID sign-ins of one person', () => {
	it('lets both finish, each with one exchange', async () => {
		mockSignWithEverId.mockResolvedValue(workspaces(workspace('user-1', 'tenant-1', 'Acme')));
		const { config, adapter } = await loadAuth();
		const first = everIdAccount();
		const second = everIdAccount();
		const lookup = { provider: 'ever-id', providerAccountId: 'person-1' };
		const profile = { sub: 'person-1' };

		expect(await config.callbacks.signIn({ user: {}, account: first, profile })).toBe(true);
		expect(await config.callbacks.signIn({ user: {}, account: second, profile })).toBe(true);
		const firstUser = await adapter.getUserByAccount(lookup);
		await config.callbacks.jwt({ token: {}, user: firstUser, account: first, profile, trigger: 'signIn' });
		const secondUser = await adapter.getUserByAccount(lookup);
		const secondToken = await config.callbacks.jwt({
			token: {},
			user: secondUser,
			account: second,
			profile,
			trigger: 'signIn'
		});

		expect(secondUser?.id).toBe('user-1');
		expect(secondToken.authCookie?.provider).toBe('ever-id');
		expect(mockSignWithEverId).toHaveBeenCalledTimes(2);
	});
});

describe('the next-auth session after the workspace sign-in', () => {
	it('drops the Ever ID chooser data (and whatever the update carries) once the chooser signed in', async () => {
		mockSignWithEverId.mockResolvedValue(workspaces(workspace('user-1', 'tenant-1', 'Acme')));
		const auth = await loadAuth();
		const { token } = await signInWithEverId(auth);
		expect(token?.authCookie.provider).toBe('ever-id');

		const updated = await auth.config.callbacks.jwt({
			token,
			trigger: 'update',
			session: { access_token: 'gauzy-access', refresh_token: { token: 'gauzy-refresh' }, workspaces: [] }
		});

		expect(updated.authCookie).toBeUndefined();
		expect(JSON.stringify(updated)).not.toMatch(/workspace-token|gauzy-access|gauzy-refresh/);
	});

	it("keeps the other providers' session update as it was", async () => {
		const { config } = await loadAuth({}, new Request('https://teams.example.test/api/auth/session'));
		const session = { access_token: 'gauzy-access', teamId: 'team-1' };

		const updated = await config.callbacks.jwt({
			token: { authCookie: { access_token: 'old' } },
			trigger: 'update',
			session
		});

		expect(updated.authCookie).toEqual(session);
	});
});

describe('GauzyAdapter for Ever ID', () => {
	it('links nothing here (the link lives in the API)', async () => {
		const { adapter } = await loadAuth();

		await expect(adapter.linkAccount({ ...everIdAccount(), userId: 'user-1' })).resolves.toBeNull();
		expect(mockLinkSocialAccount).not.toHaveBeenCalled();
	});

	it('asks the API about nothing when looking a user up', async () => {
		const { adapter } = await loadAuth();

		await expect(
			adapter.getUserByAccount({ provider: 'ever-id', providerAccountId: 'someone-else' })
		).resolves.toBeNull();
		expect(mockSocialUserByProvider).not.toHaveBeenCalled();
		expect(mockSignWithEverId).not.toHaveBeenCalled();
	});
});

describe('the other providers keep their path', () => {
	it('signs a Google account in through the social sign-in with its access token', async () => {
		mockSocialSignin.mockResolvedValue({
			data: {
				confirmed_email: 'person@example.test',
				workspaces: [{ token: 'w', current_teams: [{ team_id: 'team-1' }] }]
			}
		});
		mockSigninWorkspace.mockResolvedValue({
			token: 'gauzy-access',
			refresh_token: 'gauzy-refresh',
			user: { id: 'u1', tenantId: 't1' }
		});
		mockUserOrganizations.mockResolvedValue({ data: { items: [{ organizationId: 'org-1' }] } });
		const { config } = await loadAuth({}, new Request('https://teams.example.test/api/auth/callback/google'));
		const account = {
			provider: 'google',
			type: 'oauth',
			providerAccountId: 'g-1',
			access_token: 'ya29.google-token'
		};

		expect(await config.callbacks.signIn({ account, profile: {} })).toBe(true);
		const token = await config.callbacks.jwt({ token: {}, user: { id: 'u1' }, account, trigger: 'signIn' });

		expect(mockSocialSignin).toHaveBeenCalledWith('google', 'ya29.google-token');
		expect(mockSignWithEverId).not.toHaveBeenCalled();
		expect(token.authCookie).toEqual(expect.objectContaining({ access_token: 'gauzy-access', teamId: 'team-1' }));
	});

	it('still looks a social account up and links it through the API', async () => {
		mockSocialUserByProvider.mockResolvedValue({ data: { isUserExists: true, id: 'u1' } });
		mockLinkSocialAccount.mockResolvedValue({ data: { id: 'link-1' } });
		const { adapter } = await loadAuth({}, new Request('https://teams.example.test/api/auth/callback/github'));

		await adapter.getUserByAccount({ provider: 'github', providerAccountId: 'gh-1' });
		await adapter.linkAccount({
			provider: 'github',
			access_token: 'gho_token',
			providerAccountId: 'gh-1',
			type: 'oauth',
			userId: 'u1'
		});

		expect(mockSocialUserByProvider).toHaveBeenCalledWith({ provider: 'github', providerAccountId: 'gh-1' });
		expect(mockLinkSocialAccount).toHaveBeenCalledWith({ provider: 'github', token: 'gho_token' });
	});

	it('still creates an account for a new social sign-in, whatever the Ever ID settings', async () => {
		mockRegisterUser.mockResolvedValue({ data: { id: 'new-user' } });
		mockLoginUser.mockResolvedValue({ data: { token: 't1', refresh_token: 'r1' } });
		mockCreateTenant.mockResolvedValue({ data: { id: 'tenant-1' } });
		mockCreateOrganization.mockResolvedValue({ data: { id: 'org-1' } });
		mockCreateEmployee.mockResolvedValue({ data: { id: 'employee-1' } });
		mockCreateTeam.mockResolvedValue({ data: { id: 'team-1' } });
		mockRefreshToken.mockResolvedValue({ data: { token: 't2' } });
		const { adapter } = await loadAuth({}, new Request('https://teams.example.test/api/auth/callback/google'));

		await expect(adapter.createUser({ id: 'x', email: 'new@example.test', name: 'New Person' })).resolves.toEqual({
			id: 'new-user'
		});
		expect(mockRegisterUser).toHaveBeenCalledTimes(1);
	});
});
