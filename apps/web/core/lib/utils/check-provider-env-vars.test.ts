/**
 * check-provider-env-vars.ts is SERVER code (auth.ts, core/services/server/runtime-env.ts): whether a
 * provider is usable depends on its client id, which is server-only env a browser never has. The
 * browser receives the resulting provider ids through the runtime env payload instead.
 *
 * Display names are read from the container env first (readRuntimeEnv, stubbed here by mockContainerEnv)
 * with the literal `process.env.NEXT_PUBLIC_X` as the build-time fallback, which Next inlines into the
 * server bundle too (simulated here by process.env). The semantics are "set" vs "absent" (`??`): a
 * provider whose app name is set to '' is still advertised, and a runtime '' must NOT fall through to
 * the value that was inlined when the image was built. Client ids are plain server env (never inlined).
 */

import type * as ProviderModuleExports from './check-provider-env-vars';

const ORIGINAL_ENV = process.env;
const PROVIDER_KEYS = ['APPLE', 'DISCORD', 'FACEBOOK', 'GOOGLE', 'GITHUB', 'LINKEDIN', 'MICROSOFT', 'SLACK', 'TWITTER'];
const APP_NAME_KEYS = PROVIDER_KEYS.map((key) => `NEXT_PUBLIC_${key}_APP_NAME`);
const CLIENT_KEYS = PROVIDER_KEYS.flatMap((key) => [`${key}_CLIENT_ID`, `${key}_CLIENT_SECRET`]);

// next-auth ships ESM only; the unit under test only needs each provider's id and name.
function mockProvider(id: string, name: string) {
	return {
		__esModule: true,
		default: (options: Record<string, unknown>) => ({ id, name, type: 'oauth', options })
	};
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

// The container env of the running server, as readRuntimeEnv() returns it.
const mockContainerEnv: Record<string, string | undefined> = {};
jest.mock('@/env-config', () => ({
	...jest.requireActual('@/env-config'),
	readRuntimeEnv: (name: string) => mockContainerEnv[name]
}));

// Type-only import: the module itself is required fresh per test (it computes everything at import time).
type ProviderModule = Pick<
	typeof ProviderModuleExports,
	'providerNames' | 'filteredProviders' | 'mappedProviders' | 'getConfiguredAuthProviderIds'
>;

/** Loads the module fresh, as a server booting with this container env (and process.env) would. */
function loadWithContainerEnv(containerEnv: Record<string, string>): ProviderModule {
	for (const key of Object.keys(mockContainerEnv)) delete mockContainerEnv[key];
	Object.assign(mockContainerEnv, containerEnv);
	let mod!: ProviderModule;
	jest.isolateModules(() => {
		// Destructured straight from require() (no cast): that is how Knip sees which exports are used.
		const {
			providerNames,
			filteredProviders,
			mappedProviders,
			getConfiguredAuthProviderIds
		} = require('./check-provider-env-vars');
		mod = { providerNames, filteredProviders, mappedProviders, getConfiguredAuthProviderIds };
	});
	return mod;
}

const nextAuthIds = (mod: ProviderModule) => mod.mappedProviders.map((provider) => provider.id);

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	// Start from a server built and started WITHOUT social providers (apps/web/.env defines some names).
	for (const key of [...APP_NAME_KEYS, ...CLIENT_KEYS]) delete process.env[key];
	// Google and GitHub have client credentials; Twitter is advertised in some tests but has NO client id.
	process.env.GOOGLE_CLIENT_ID = 'google-client-id';
	process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
	process.env.GITHUB_CLIENT_ID = 'github-client-id';
	process.env.GITHUB_CLIENT_SECRET = 'github-client-secret';
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('providerNames / filteredProviders read at runtime', () => {
	it('advertises a provider whose runtime app name is set to an empty string', () => {
		const mod = loadWithContainerEnv({ NEXT_PUBLIC_GOOGLE_APP_NAME: '' });

		expect(mod.providerNames.google).toBe('');
		expect(nextAuthIds(mod)).toEqual(['google']);
	});

	it('keeps a runtime empty app name instead of falling through to the build-time value', () => {
		process.env.NEXT_PUBLIC_GOOGLE_APP_NAME = 'Baked Google';

		const mod = loadWithContainerEnv({ NEXT_PUBLIC_GOOGLE_APP_NAME: '' });

		expect(mod.providerNames.google).toBe('');
	});

	it('prefers the runtime app name over the build-time one', () => {
		process.env.NEXT_PUBLIC_GITHUB_APP_NAME = 'Baked GitHub';

		const mod = loadWithContainerEnv({ NEXT_PUBLIC_GITHUB_APP_NAME: 'Acme GitHub' });

		expect(mod.providerNames.github).toBe('Acme GitHub');
		expect(nextAuthIds(mod)).toEqual(['github']);
	});

	it('does not advertise a configured provider whose app name is absent at runtime and build time', () => {
		const mod = loadWithContainerEnv({});

		expect(mod.providerNames.google).toBeUndefined();
		expect(mod.providerNames.github).toBeUndefined();
		expect(nextAuthIds(mod)).toEqual([]);
	});

	it('falls back to the build-time app name when the runtime env does not set it (non-Docker builds)', () => {
		process.env.NEXT_PUBLIC_GITHUB_APP_NAME = 'GitHub';

		const mod = loadWithContainerEnv({});

		expect(mod.providerNames.github).toBe('GitHub');
		expect(nextAuthIds(mod)).toEqual(['github']);
	});

	it('still hides an advertised provider that has no client id', () => {
		const mod = loadWithContainerEnv({ NEXT_PUBLIC_TWITTER_APP_NAME: 'X', NEXT_PUBLIC_GOOGLE_APP_NAME: 'Google' });

		expect(mod.providerNames.twitter).toBe('X');
		expect(nextAuthIds(mod)).toEqual(['google']);
	});
});

describe('getConfiguredAuthProviderIds (published to the browser)', () => {
	it('returns exactly the providers next-auth is given, in display order', () => {
		process.env.TWITTER_CLIENT_ID = 'twitter-client-id';
		process.env.TWITTER_CLIENT_SECRET = 'twitter-client-secret';

		const mod = loadWithContainerEnv({
			NEXT_PUBLIC_TWITTER_APP_NAME: 'X',
			NEXT_PUBLIC_GITHUB_APP_NAME: 'GitHub',
			NEXT_PUBLIC_GOOGLE_APP_NAME: 'Google',
			NEXT_PUBLIC_FACEBOOK_APP_NAME: 'Facebook'
		});

		expect(mod.getConfiguredAuthProviderIds()).toEqual(['google', 'github', 'twitter']);
		expect(mod.getConfiguredAuthProviderIds()).toEqual(nextAuthIds(mod));
		expect(mod.filteredProviders).toHaveLength(3);
	});

	it('treats a whitespace-only client id (secret-store placeholder) as not configured', () => {
		process.env.GITHUB_CLIENT_ID = '  ';

		const mod = loadWithContainerEnv({
			NEXT_PUBLIC_GITHUB_APP_NAME: 'GitHub',
			NEXT_PUBLIC_GOOGLE_APP_NAME: 'Google'
		});

		expect(mod.getConfiguredAuthProviderIds()).toEqual(['google']);
	});

	it('hides a provider whose client secret is missing or blank (the token exchange would fail)', () => {
		process.env.GITHUB_CLIENT_SECRET = ' ';
		delete process.env.GOOGLE_CLIENT_SECRET;

		const mod = loadWithContainerEnv({
			NEXT_PUBLIC_GITHUB_APP_NAME: 'GitHub',
			NEXT_PUBLIC_GOOGLE_APP_NAME: 'Google'
		});

		expect(mod.getConfiguredAuthProviderIds()).toEqual([]);
	});

	it('returns provider ids only, never a client id or secret', () => {
		const mod = loadWithContainerEnv({ NEXT_PUBLIC_GOOGLE_APP_NAME: 'Google' });
		const published = JSON.stringify(mod.getConfiguredAuthProviderIds());

		expect(published).toBe('["google"]');
		expect(published).not.toContain('google-client-id');
		expect(published).not.toContain('google-client-secret');
	});
});

/**
 * Microsoft could never be enabled: the maps were keyed 'microsoftEntraId' and an all-lowercase variant, while
 * the provider answers to the id 'microsoft-entra-id' and the name 'Microsoft Entra ID'. Both the
 * `advertised` and the `configured` lookup missed, whatever the deployment set.
 */
describe('Microsoft Entra ID', () => {
	beforeEach(() => {
		process.env.MICROSOFT_CLIENT_ID = 'microsoft-client-id';
		process.env.MICROSOFT_CLIENT_SECRET = 'microsoft-client-secret';
	});

	it('is published when the deployment sets the app name and the client credentials', () => {
		const mod = loadWithContainerEnv({ NEXT_PUBLIC_MICROSOFT_APP_NAME: '' });

		expect(mod.providerNames['microsoft-entra-id']).toBe('');
		expect(mod.getConfiguredAuthProviderIds()).toEqual(['microsoft-entra-id']);
	});

	it('stays hidden when only the client credentials are set', () => {
		expect(loadWithContainerEnv({}).getConfiguredAuthProviderIds()).toEqual([]);
	});

	it('stays hidden when the client secret is blank', () => {
		process.env.MICROSOFT_CLIENT_SECRET = ' ';

		expect(loadWithContainerEnv({ NEXT_PUBLIC_MICROSOFT_APP_NAME: '' }).getConfiguredAuthProviderIds()).toEqual([]);
	});
});

describe('every provider next-auth is given is reachable from the env', () => {
	// Provider id -> env prefix. A provider whose id is not a key of providerNames / providerClientIds
	// is dead weight: registered with next-auth but impossible to switch on.
	const ENV_PREFIX: Record<string, string> = {
		apple: 'APPLE',
		discord: 'DISCORD',
		facebook: 'FACEBOOK',
		google: 'GOOGLE',
		github: 'GITHUB',
		linkedin: 'LINKEDIN',
		'microsoft-entra-id': 'MICROSOFT',
		slack: 'SLACK',
		twitter: 'TWITTER'
	};

	it('advertises and configures each registered provider through its own env vars', () => {
		for (const prefix of Object.values(ENV_PREFIX)) {
			process.env[`${prefix}_CLIENT_ID`] = `${prefix}-client-id`;
			process.env[`${prefix}_CLIENT_SECRET`] = `${prefix}-client-secret`;
		}
		const containerEnv = Object.fromEntries(
			Object.values(ENV_PREFIX).map((prefix) => [`NEXT_PUBLIC_${prefix}_APP_NAME`, ''])
		);

		const published = loadWithContainerEnv(containerEnv).getConfiguredAuthProviderIds();

		expect([...published].sort()).toEqual(Object.keys(ENV_PREFIX).sort());
	});
});

/**
 * Ever ID, an OpenID Connect provider: served only when NEXT_PUBLIC_EVER_ID_APP_NAME is set AND the issuer, the
 * client id and the client secret are all non-blank. These cases extend the suite; the ones above are unchanged.
 */
describe('Ever ID provider', () => {
	const EVER_ID_KEYS = [
		'NEXT_PUBLIC_EVER_ID_APP_NAME',
		'EVER_ID_ISSUER_URL',
		'EVER_ID_ISSUER',
		'EVER_ID_CLIENT_ID',
		'EVER_ID_CLIENT_SECRET',
		'EVER_PLATFORM_PROJECT_ID',
		'EVER_ID_TEAMS_AUTO_PROVISION'
	];
	const ISSUER = 'https://id.example.test';

	type EverIdModule = ProviderModule & {
		providers: typeof ProviderModuleExports.providers;
		isEverIdConfigured: () => boolean;
	};

	/** Loads the provider module and the Ever ID settings fresh, as a server booting with this env. */
	function loadEverId(containerEnv: Record<string, string>): EverIdModule {
		for (const key of Object.keys(mockContainerEnv)) delete mockContainerEnv[key];
		Object.assign(mockContainerEnv, containerEnv);
		let mod!: EverIdModule;
		jest.isolateModules(() => {
			const {
				providerNames,
				filteredProviders,
				mappedProviders,
				getConfiguredAuthProviderIds,
				providers
			} = require('./check-provider-env-vars');
			const { isEverIdConfigured } = require('@/core/lib/auth/ever-id/config');
			mod = {
				providerNames,
				filteredProviders,
				mappedProviders,
				getConfiguredAuthProviderIds,
				providers,
				isEverIdConfigured
			};
		});
		return mod;
	}

	function everIdProvider(mod: EverIdModule) {
		return mod.providers.find((provider) => typeof provider !== 'function' && provider.id === 'ever-id') as {
			id: string;
			name: string;
			type: string;
			issuer?: string;
			clientId?: string;
			checks?: string[];
			authorization?: { params?: { scope?: string } };
		};
	}

	beforeEach(() => {
		for (const key of EVER_ID_KEYS) delete process.env[key];
		process.env.EVER_ID_ISSUER_URL = ISSUER;
		process.env.EVER_ID_CLIENT_ID = 'teams-web-client';
		process.env.EVER_ID_CLIENT_SECRET = 'teams-web-secret';
		delete (globalThis as { __everTeamsConfigWarnings?: Set<string> }).__everTeamsConfigWarnings;
	});

	it('is served when the app name, the issuer, the client id and the client secret are all set', () => {
		const mod = loadEverId({ NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' });

		expect(mod.getConfiguredAuthProviderIds()).toEqual(['ever-id']);
		expect(mod.mappedProviders).toEqual([{ id: 'ever-id', name: 'Ever ID' }]);
		expect(mod.isEverIdConfigured()).toBe(true);
	});

	it.each([
		['the app name is absent', {}, {}],
		['the issuer is blank', { EVER_ID_ISSUER_URL: ' ' }, { NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' }],
		['the issuer is missing', { EVER_ID_ISSUER_URL: undefined }, { NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' }],
		['the client id is blank', { EVER_ID_CLIENT_ID: '  ' }, { NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' }],
		[
			'the client secret is missing',
			{ EVER_ID_CLIENT_SECRET: undefined },
			{ NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' }
		]
	])('is not served when %s (and the Ever ID routes agree)', (_label, env, containerEnv) => {
		for (const [key, value] of Object.entries(env as Record<string, string | undefined>)) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}

		const mod = loadEverId(containerEnv as Record<string, string>);

		expect(mod.getConfiguredAuthProviderIds()).not.toContain('ever-id');
		expect(mod.isEverIdConfigured()).toBe(false);
	});

	it('takes the runtime app name over the build-time one, and an empty runtime value counts as set', () => {
		process.env.NEXT_PUBLIC_EVER_ID_APP_NAME = 'Baked Ever ID';

		const mod = loadEverId({ NEXT_PUBLIC_EVER_ID_APP_NAME: '' });

		expect(mod.providerNames['ever-id']).toBe('');
		expect(mod.getConfiguredAuthProviderIds()).toEqual(['ever-id']);
	});

	it('falls back to the build-time app name', () => {
		process.env.NEXT_PUBLIC_EVER_ID_APP_NAME = 'Ever ID';

		expect(loadEverId({}).getConfiguredAuthProviderIds()).toEqual(['ever-id']);
	});

	it('accepts the deprecated EVER_ID_ISSUER, with a single warning', () => {
		delete process.env.EVER_ID_ISSUER_URL;
		process.env.EVER_ID_ISSUER = `${ISSUER}/`;
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

		const first = loadEverId({ NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' });
		loadEverId({ NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' });

		expect(first.getConfiguredAuthProviderIds()).toEqual(['ever-id']);
		expect(everIdProvider(first).issuer).toBe(ISSUER);
		const deprecations = warn.mock.calls.filter((call) => String(call[0]).includes('EVER_ID_ISSUER is deprecated'));
		expect(deprecations).toHaveLength(1);
		warn.mockRestore();
	});

	it('is listed right after Google, the other providers keeping their order', () => {
		process.env.TWITTER_CLIENT_ID = 'twitter-client-id';
		process.env.TWITTER_CLIENT_SECRET = 'twitter-client-secret';

		const mod = loadEverId({
			NEXT_PUBLIC_TWITTER_APP_NAME: 'X',
			NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID',
			NEXT_PUBLIC_GITHUB_APP_NAME: 'GitHub',
			NEXT_PUBLIC_GOOGLE_APP_NAME: 'Google'
		});

		expect(mod.getConfiguredAuthProviderIds()).toEqual(['google', 'ever-id', 'github', 'twitter']);
	});

	it('is an OpenID Connect provider that checks PKCE, state and nonce', () => {
		const provider = everIdProvider(loadEverId({ NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' }));

		expect(provider).toEqual(
			expect.objectContaining({
				id: 'ever-id',
				name: 'Ever ID',
				type: 'oidc',
				issuer: ISSUER,
				clientId: 'teams-web-client'
			})
		);
		expect(provider.checks).toEqual(['pkce', 'state', 'nonce']);
	});

	it('asks for the project audience only when EVER_PLATFORM_PROJECT_ID is set, and never for an organization', () => {
		const without = everIdProvider(loadEverId({ NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' }));
		process.env.EVER_PLATFORM_PROJECT_ID = '298765432109876543';
		const withProject = everIdProvider(loadEverId({ NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' }));

		expect(without.authorization?.params?.scope).toBe('openid profile email urn:zitadel:iam:user:resourceowner');
		expect(withProject.authorization?.params?.scope).toBe(
			'openid profile email urn:zitadel:iam:user:resourceowner urn:zitadel:iam:org:project:id:298765432109876543:aud'
		);
		for (const scope of [without.authorization?.params?.scope, withProject.authorization?.params?.scope]) {
			expect(scope).not.toContain('urn:zitadel:iam:org:id:');
		}
	});

	it('ignores a project id that is not a plain identifier (it could add scopes)', () => {
		process.env.EVER_PLATFORM_PROJECT_ID = '1 urn:zitadel:iam:org:id:2';

		const provider = everIdProvider(loadEverId({ NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' }));

		expect(provider.authorization?.params?.scope).toBe('openid profile email urn:zitadel:iam:user:resourceowner');
	});

	it('publishes the provider id only, never the client id, secret or issuer', () => {
		const mod = loadEverId({ NEXT_PUBLIC_EVER_ID_APP_NAME: 'Ever ID' });
		const published = JSON.stringify(mod.getConfiguredAuthProviderIds());

		expect(published).toBe('["ever-id"]');
		expect(published).not.toMatch(/teams-web-client|teams-web-secret|id\.example\.test/);
	});
});
