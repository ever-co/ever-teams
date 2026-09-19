/**
 * @jest-environment jsdom
 */
/**
 * Social providers are advertised from the RUNTIME env (NEXT_PUBLIC_<X>_APP_NAME), so a published Docker
 * image can offer its own providers without a rebuild. The semantics are "set" vs "absent" (`??`): a
 * provider whose app name is set to '' is still advertised, and a runtime '' must NOT fall through to the
 * value that was inlined when the image was built (simulated here by process.env, which is what the
 * `process.env.NEXT_PUBLIC_X` fallbacks read under Jest).
 */

import type * as ProviderModuleExports from './check-provider-env-vars';

const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const ORIGINAL_ENV = process.env;
const APP_NAME_KEYS = [
	'NEXT_PUBLIC_APPLE_APP_NAME',
	'NEXT_PUBLIC_DISCORD_APP_NAME',
	'NEXT_PUBLIC_FACEBOOK_APP_NAME',
	'NEXT_PUBLIC_GOOGLE_APP_NAME',
	'NEXT_PUBLIC_GITHUB_APP_NAME',
	'NEXT_PUBLIC_LINKEDIN_APP_NAME',
	'NEXT_PUBLIC_MICROSOFTENTRAID_APP_NAME',
	'NEXT_PUBLIC_SLACK_APP_NAME',
	'NEXT_PUBLIC_TWITTER_APP_NAME'
];

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
jest.mock('next-auth/providers/azure-ad', () => mockProvider('azure-ad', 'Azure Active Directory'));
jest.mock('next-auth/providers/slack', () => mockProvider('slack', 'Slack'));
jest.mock('next-auth/providers/twitter', () => mockProvider('twitter', 'Twitter'));

// Google and GitHub have client ids; Twitter is advertised in some tests but has NO client id.
jest.mock('@/core/constants/config/constants', () => ({
	GOOGLE_CLIENT_ID: 'google-client-id',
	GITHUB_CLIENT_ID: 'github-client-id'
}));

// Type-only import: the module itself is required fresh per test (providerNames is computed at import time).
type ProviderModule = typeof ProviderModuleExports;

/** providerNames is computed at import time: load it fresh, after the runtime env is in place. */
function loadWithRuntimeEnv(runtimeEnv: Record<string, string>): ProviderModule {
	(globalThis as Record<string, unknown>)[GLOBAL] = runtimeEnv;
	let mod!: ProviderModule;
	jest.isolateModules(() => {
		mod = require('./check-provider-env-vars');
	});
	return mod;
}

const advertisedIds = (mod: ProviderModule) => mod.mappedProviders.map((provider) => provider.id);

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	// Start from an image built WITHOUT provider names (apps/web/.env may define some).
	for (const key of APP_NAME_KEYS) delete process.env[key];
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('providerNames / filteredProviders read at runtime', () => {
	it('advertises a provider whose runtime app name is set to an empty string', () => {
		const mod = loadWithRuntimeEnv({ NEXT_PUBLIC_GOOGLE_APP_NAME: '' });

		expect(mod.providerNames.google).toBe('');
		expect(advertisedIds(mod)).toEqual(['google']);
	});

	it('keeps a runtime empty app name instead of falling through to the build-time value', () => {
		process.env.NEXT_PUBLIC_GOOGLE_APP_NAME = 'Baked Google';

		const mod = loadWithRuntimeEnv({ NEXT_PUBLIC_GOOGLE_APP_NAME: '' });

		expect(mod.providerNames.google).toBe('');
	});

	it('prefers the runtime app name over the build-time one', () => {
		process.env.NEXT_PUBLIC_GITHUB_APP_NAME = 'Baked GitHub';

		const mod = loadWithRuntimeEnv({ NEXT_PUBLIC_GITHUB_APP_NAME: 'Acme GitHub' });

		expect(mod.providerNames.github).toBe('Acme GitHub');
		expect(advertisedIds(mod)).toEqual(['github']);
	});

	it('does not advertise a configured provider whose app name is absent at runtime and build time', () => {
		const mod = loadWithRuntimeEnv({});

		expect(mod.providerNames.google).toBeUndefined();
		expect(mod.providerNames.github).toBeUndefined();
		expect(advertisedIds(mod)).toEqual([]);
	});

	it('falls back to the build-time app name when the runtime env does not set it (non-Docker builds)', () => {
		process.env.NEXT_PUBLIC_GITHUB_APP_NAME = 'GitHub';

		const mod = loadWithRuntimeEnv({});

		expect(mod.providerNames.github).toBe('GitHub');
		expect(advertisedIds(mod)).toEqual(['github']);
	});

	it('still hides an advertised provider that has no client id', () => {
		const mod = loadWithRuntimeEnv({ NEXT_PUBLIC_TWITTER_APP_NAME: 'X', NEXT_PUBLIC_GOOGLE_APP_NAME: 'Google' });

		expect(mod.providerNames.twitter).toBe('X');
		expect(advertisedIds(mod)).toEqual(['google']);
	});
});
