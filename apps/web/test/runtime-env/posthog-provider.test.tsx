/**
 * @jest-environment jsdom
 */
/**
 * PostHog in a reused image: the host defaults to PostHog Cloud (US), so a deployment only needs its key,
 * and analytics stay OFF until that key is configured. The provider reads the real constants when it
 * loads, as in the browser once the runtime env script has run.
 */
import React from 'react';

const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const ORIGINAL_ENV = process.env;

const mockPostHogInit = jest.fn();
const mockPostHogProvider = ({ children }: React.PropsWithChildren) => <>{children}</>;
jest.mock('posthog-js', () => ({ __esModule: true, default: { init: mockPostHogInit } }));
jest.mock('posthog-js/react', () => ({ PostHogProvider: mockPostHogProvider }));

type ProviderModule = typeof import('@/app/[locale]/(main)/integration/posthog/provider');

function loadProvider(runtimeEnv: Record<string, string>): ProviderModule {
	(globalThis as Record<string, unknown>)[GLOBAL] = runtimeEnv;
	let provider!: ProviderModule;
	jest.isolateModules(() => {
		provider = require('@/app/[locale]/(main)/integration/posthog/provider');
	});
	return provider;
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	// Build-time values (apps/web/.env) must not decide it: the runtime env does.
	delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
	delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('PHProvider', () => {
	it('stays off without a key, even though the host has a default', () => {
		const { PHProvider } = loadProvider({});

		const element = PHProvider({ children: 'app' }) as React.ReactElement<React.PropsWithChildren>;

		expect(mockPostHogInit).not.toHaveBeenCalled();
		expect(element.type).not.toBe(mockPostHogProvider);
		expect(element.props.children).toBe('app');
	});

	it('starts with PostHog Cloud (US) as host when only the key is set', () => {
		const { PHProvider } = loadProvider({ NEXT_PUBLIC_POSTHOG_KEY: 'runtime-project-key' });

		const element = PHProvider({ children: 'app' }) as React.ReactElement<React.PropsWithChildren>;

		expect(mockPostHogInit).toHaveBeenCalledWith(
			'runtime-project-key',
			expect.objectContaining({ api_host: 'https://us.i.posthog.com' })
		);
		expect(element.type).toBe(mockPostHogProvider);
	});

	it('uses the configured host', () => {
		loadProvider({
			NEXT_PUBLIC_POSTHOG_KEY: 'runtime-project-key',
			NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com'
		});

		expect(mockPostHogInit).toHaveBeenCalledWith(
			'runtime-project-key',
			expect.objectContaining({ api_host: 'https://eu.i.posthog.com' })
		);
	});
});
