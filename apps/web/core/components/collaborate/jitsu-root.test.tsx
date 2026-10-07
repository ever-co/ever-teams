/**
 * @jest-environment jsdom
 */
/**
 * Jitsu analytics is configured from the RUNTIME env (NEXT_PUBLIC_JITSU_*), so a published Docker image
 * can enable it with `docker run -e`; the build-time values (simulated by process.env, which the
 * `process.env.NEXT_PUBLIC_X` fallbacks read under Jest) are only a fallback.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { JitsuRoot } from './jitsu-root';

const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const ORIGINAL_ENV = process.env;
const JITSU_KEYS = [
	'NEXT_PUBLIC_JITSU_BROWSER_URL',
	'NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY',
	'NEXT_PUBLIC_JITSU_COOKIE_DOMAIN'
];
const mockJitsuOptions = jest.fn();
let consoleLog: jest.SpyInstance;

jest.mock('@jitsu/jitsu-react', () => ({
	JitsuProvider: ({ options, children }: { options: unknown; children: React.ReactNode }) => {
		mockJitsuOptions(options);
		return children;
	}
}));
jest.mock('@/core/components/analytics/jitsu-analytics', () => ({ JitsuAnalytics: () => null }));
jest.mock('@/core/hooks/queries/user-user.query', () => ({ useUserQuery: () => ({ data: undefined }) }));

function renderedOptions(pageProps?: React.ComponentProps<typeof JitsuRoot>['pageProps']) {
	render(<JitsuRoot pageProps={pageProps}>content</JitsuRoot>);
	return mockJitsuOptions.mock.calls.at(-1)?.[0];
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	for (const key of JITSU_KEYS) delete process.env[key];
	(globalThis as Record<string, unknown>)[GLOBAL] = {};
	consoleLog = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

afterEach(() => {
	consoleLog.mockRestore();
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('JitsuRoot configuration', () => {
	it('enables Jitsu from the runtime env, even over build-time values', () => {
		process.env.NEXT_PUBLIC_JITSU_BROWSER_URL = 'https://baked.example.org';
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			NEXT_PUBLIC_JITSU_BROWSER_URL: 'https://jitsu.example.org',
			NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY: 'runtime-write-key',
			NEXT_PUBLIC_JITSU_COOKIE_DOMAIN: '.example.org'
		};

		expect(renderedOptions()).toEqual({
			host: 'https://jitsu.example.org',
			writeKey: 'runtime-write-key',
			debug: false,
			cookieDomain: '.example.org',
			echoEvents: false
		});
	});

	it('falls back to the build-time values when the runtime env does not set them', () => {
		process.env.NEXT_PUBLIC_JITSU_BROWSER_URL = 'https://baked.example.org';
		process.env.NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY = 'baked-write-key';

		expect(renderedOptions()).toMatchObject({ host: 'https://baked.example.org', writeKey: 'baked-write-key' });
	});

	it('stays disabled when no host / write key is configured', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			NEXT_PUBLIC_JITSU_BROWSER_URL: 'https://jitsu.example.org'
		};

		expect(renderedOptions()).toEqual({ disabled: true });
	});

	it('keeps using an explicit pageProps configuration', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			NEXT_PUBLIC_JITSU_BROWSER_URL: 'https://jitsu.example.org',
			NEXT_PUBLIC_JITSU_BROWSER_WRITE_KEY: 'runtime-write-key'
		};

		expect(
			renderedOptions({ envs: {}, jitsuConf: { host: 'https://page.example.org', writeKey: 'page-write-key' } })
		).toMatchObject({ host: 'https://page.example.org', writeKey: 'page-write-key' });
	});
});
