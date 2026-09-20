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
 * Microsoft could never be enabled: the maps were keyed 'microsoftEntraId' / 'microsoftentraid', while
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
