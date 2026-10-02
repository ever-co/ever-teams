/**
 * Architecture guard: with no Ever ID settings (the default of every deployment), Ever Teams behaves exactly as
 * before and never contacts an Ever ID issuer or the Ever ID routes of the API.
 *
 * - next-auth is not given the provider, the browser is not told about it and no button renders (also with a blank
 *   app name, an issuer that is not https, or no explicitly configured API to exchange the ID tokens with);
 * - the Ever ID routes answer 404, and the register route refuses an Ever ID sign-up body;
 * - none of the above makes a single outbound request;
 * - the issuer is configuration only: no Ever ID issuer host is written into the app's source.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

let mockNextAuthFactory: ((request: unknown) => Promise<Record<string, any>>) | undefined;

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
jest.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
// jose ships as an ES module only and jest runs CommonJS: Node itself loads it (require of an ES module).
jest.mock('jose', () => process.getBuiltinModule('node:module').createRequire(__filename)('jose'));
// A server action: the real module imports next-auth, which only runs on the server.
jest.mock('@/core/lib/helpers/social-logins', () => ({ signInFunction: jest.fn() }));
// The shared button pulls in the whole hooks barrel; a plain button is enough to see what renders.
jest.mock('@/core/components/common/button', () => ({
	Button: ({ children, variant: _variant, ...props }: { children?: unknown; variant?: string }) =>
		require('react').createElement('button', props, children)
}));

const WEB_ROOT = join(__dirname, '..', '..');
const EVER_ID_KEYS = [
	'NEXT_PUBLIC_EVER_ID_APP_NAME',
	'EVER_ID_ISSUER_URL',
	'EVER_ID_ISSUER',
	'EVER_ID_CLIENT_ID',
	'EVER_ID_CLIENT_SECRET',
	'EVER_PLATFORM_PROJECT_ID',
	'EVER_ID_TEAMS_AUTO_PROVISION'
];
const ORIGINAL_ENV = { ...process.env };

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
	for (const key of EVER_ID_KEYS) delete process.env[key];
	// No captcha: the register route then reaches the Ever ID check whatever the environment of the run.
	delete process.env.CAPTCHA_SECRET_KEY;
	delete process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY;
	// A configured API: only the Ever ID settings are missing.
	process.env.GAUZY_API_SERVER_URL = 'https://api.example.test';
	fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('no outbound request expected'));
});

afterEach(() => {
	fetchSpy.mockRestore();
	process.env = { ...ORIGINAL_ENV };
});

function post(path: string, body: string, contentType = 'application/json') {
	return new Request(`https://teams.example.test${path}`, {
		method: 'POST',
		headers: { 'content-type': contentType },
		body
	});
}

/**
 * Boots the app's auth modules with the current env, as a server start would, and renders the sign-in
 * buttons with the runtime env the browser would receive.
 */
async function boot() {
	let providerIds: string[] = [];
	let published: Record<string, string> = {};
	let markup = '';
	mockNextAuthFactory = undefined;
	jest.isolateModules(() => {
		require('@/auth');
		providerIds = require('@/core/lib/utils/check-provider-env-vars').getConfiguredAuthProviderIds();
		published = require('@/core/services/server/runtime-env').getPublicRuntimeEnv();
		// Rendered with the React of this module registry, the one the components use.
		const { createElement } = require('react');
		const { renderToStaticMarkup } = require('react-dom/server');
		const SocialLogins = require('@/core/components/auth/social-logins-buttons').default;
		const { RuntimeEnvProvider } = require('@/core/components/providers/runtime-env-provider');
		markup = renderToStaticMarkup(
			createElement(RuntimeEnvProvider, { env: published }, createElement(SocialLogins))
		);
	});
	const factory = mockNextAuthFactory as unknown as (request: unknown) => Promise<Record<string, any>>;
	const config = await factory(new Request('https://teams.example.test/auth/passcode'));
	const nextAuthProviderIds = (config.providers as Array<{ id: string }>).map((provider) => provider.id);
	return { nextAuthProviderIds, providerIds, published, markup };
}

describe('Ever ID with no settings', () => {
	it('is not given to next-auth, not published to the browser and renders no button, without any request', async () => {
		const { nextAuthProviderIds, providerIds, published, markup } = await boot();

		expect(nextAuthProviderIds).not.toContain('ever-id');
		expect(providerIds).not.toContain('ever-id');
		expect(published.EVER_TEAMS_AUTH_PROVIDERS ?? '').not.toContain('ever-id');
		expect(Object.keys(published).filter((key) => key.includes('EVER_ID'))).toEqual([]);
		expect(markup).not.toContain('Ever ID');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('(control) the same boot shows the provider once it is configured, still without contacting the issuer', async () => {
		Object.assign(process.env, {
			NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID',
			EVER_ID_ISSUER_URL: 'https://id.example.test',
			EVER_ID_CLIENT_ID: 'teams-web-client',
			EVER_ID_CLIENT_SECRET: 'teams-web-secret'
		});

		const { nextAuthProviderIds, published, markup } = await boot();

		expect(nextAuthProviderIds).toContain('ever-id');
		expect(published.EVER_TEAMS_AUTH_PROVIDERS).toContain('ever-id');
		expect(markup).toContain('Ever ID');
		// Never the client id or secret in what the browser receives.
		expect(JSON.stringify(published)).not.toMatch(/teams-web-client|teams-web-secret/);
		// The issuer is contacted only when someone signs in with it, never at start.
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it.each([
		['a blank app name (an unset compose variable)', { NEXT_PUBLIC_EVER_ID_APP_NAME: ' ' }],
		['an issuer that is not https', { EVER_ID_ISSUER_URL: 'http://id.example.test' }],
		['no explicitly configured API', { GAUZY_API_SERVER_URL: '' }]
	])('stays off with %s, without any request', async (_label, override) => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		try {
			Object.assign(process.env, {
				NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID',
				EVER_ID_ISSUER_URL: 'https://id.example.test',
				EVER_ID_CLIENT_ID: 'teams-web-client',
				EVER_ID_CLIENT_SECRET: 'teams-web-secret',
				...override
			});
			delete process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL;

			const { nextAuthProviderIds, providerIds, markup } = await boot();

			expect(nextAuthProviderIds).not.toContain('ever-id');
			expect(providerIds).not.toContain('ever-id');
			expect(markup).not.toContain('Ever ID');
			expect(fetchSpy).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});

	it('answers 404 on every Ever ID route, without any request', async () => {
		const routes: Record<string, { POST: (req: Request) => Promise<Response> }> = {};
		jest.isolateModules(() => {
			routes.backchannel = require('@/app/api/auth/ever-id/backchannel-logout/route');
			routes.confirm = require('@/app/api/auth/ever-id/confirm/route');
			routes.signup = require('@/app/api/auth/ever-id/signup-handoff/route');
		});
		const answers = await Promise.all([
			routes.backchannel.POST(
				post('/api/auth/ever-id/backchannel-logout', 'logout_token=a.b.c', 'application/x-www-form-urlencoded')
			),
			routes.confirm.POST(post('/api/auth/ever-id/confirm', JSON.stringify({ code: 'ABCD1234' }))),
			routes.signup.POST(post('/api/auth/ever-id/signup-handoff', JSON.stringify({ locale: 'en' })))
		]);

		expect(answers.map((answer) => answer.status)).toEqual([404, 404, 404]);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('refuses an Ever ID sign-up body on the register route, without any request', async () => {
		let register: { POST: (req: Request) => Promise<Response> } | undefined;
		jest.isolateModules(() => {
			register = require('@/app/api/auth/register/route');
		});
		const body = {
			name: 'New Person',
			email: 'new.person@example.test',
			team: 'New Team',
			ever_id: 'signup',
			confirm: true
		};

		const answer = await (register as NonNullable<typeof register>).POST(
			post('/api/auth/register', JSON.stringify(body))
		);

		expect(answer.status).toBe(404);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('refuses an Ever ID callback in next-auth, without any request', async () => {
		let signInCallback: ((account: object) => Promise<boolean | string>) | undefined;
		jest.isolateModules(() => {
			signInCallback = require('@/core/services/server/ever-id/sign-in').everIdSignInCallback;
		});

		const result = await (signInCallback as NonNullable<typeof signInCallback>)({
			provider: 'ever-id',
			providerAccountId: 'person-1',
			id_token: 'a.b.c'
		});

		expect(result).toBe(false);
		expect(fetchSpy).not.toHaveBeenCalled();
	});
});

describe('Ever ID issuer is configuration only', () => {
	/** Source files of the app, without tests, test stand-ins, build output and dependencies. */
	function sourceFiles(directory: string, out: string[] = []): string[] {
		for (const entry of readdirSync(directory)) {
			if (['node_modules', '.next', 'out', 'build', 'coverage', 'test', 'cypress', 'public'].includes(entry))
				continue;
			const path = join(directory, entry);
			if (statSync(path).isDirectory()) sourceFiles(path, out);
			else if (/\.(?:[cm]?[jt]sx?|json)$/.test(entry) && !/\.(?:test|spec)\.[jt]sx?$/.test(entry)) out.push(path);
		}
		return out;
	}

	const files = sourceFiles(WEB_ROOT);
	const display = (path: string) => relative(WEB_ROOT, path).split(sep).join('/');

	it('scans the app source (sanity)', () => {
		expect(files.length).toBeGreaterThan(500);
	});

	it('names no Ever ID issuer host anywhere in the app', () => {
		const issuerHost = /\bauth(?:-[a-z0-9]+)?\.ever\.co\b/i;

		expect(files.filter((path) => issuerHost.test(readFileSync(path, 'utf8'))).map(display)).toEqual([]);
	});

	it('keeps every Ever ID module free of any Ever hostname', () => {
		const everIdModules = files.filter((path) => /ever-id/.test(display(path)));

		expect(everIdModules.length).toBeGreaterThan(5);
		expect(everIdModules.filter((path) => /\bever\.co\b/i.test(readFileSync(path, 'utf8'))).map(display)).toEqual(
			[]
		);
	});
});
