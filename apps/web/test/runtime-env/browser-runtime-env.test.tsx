/**
 * @jest-environment jsdom
 */
/**
 * Browser side of the runtime env contract: once the server-injected
 * `self.__EVER_TEAMS_RUNTIME_ENV__` is present (the inline <script> in app/[locale]/layout.tsx runs
 * before any bundle module), constants and lazy getters resolve to the RUNTIME values — not to the
 * value that was inlined when the image was built (simulated here by process.env, which is what the
 * `process.env.NEXT_PUBLIC_X` fallbacks read under Jest).
 */
import React from 'react';
import { render } from '@testing-library/react';
import { RuntimeEnvProvider, RuntimeEnvScript } from '@/core/components/providers/runtime-env-provider';
import { getNextPublicEnv, readRuntimeEnv, RUNTIME_ENV_SCRIPT_ID, serializeRuntimeEnvScript } from '@/env-config';

const ORIGINAL_ENV = process.env;
const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';

type Constants = typeof import('@/core/constants/config/constants');

function loadConstants(): Constants {
	let constants!: Constants;
	jest.isolateModules(() => {
		constants = require('@/core/constants/config/constants');
	});
	return constants;
}

beforeEach(() => {
	process.env = {
		...ORIGINAL_ENV,
		// "Build-time" values baked into an image built by someone else.
		NEXT_PUBLIC_CAPTCHA_SITE_KEY: 'ever-baked-site-key',
		NEXT_PUBLIC_CAPTCHA_TYPE: '',
		NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.ever.team',
		NEXT_PUBLIC_DEMO: 'false',
		APP_NAME: 'Ever Teams'
	};
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('runtime env in the browser', () => {
	it('prefers the injected runtime env over build-time values', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			NEXT_PUBLIC_CAPTCHA_SITE_KEY: 'self-hosted-site-key',
			NEXT_PUBLIC_CAPTCHA_TYPE: 'hcaptcha',
			NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.example.org',
			NEXT_PUBLIC_DEMO: 'true',
			APP_NAME: 'Acme Teams',
			TERMS_LINK: 'https://example.org/terms'
		};

		const constants = loadConstants();

		expect(constants.RECAPTCHA_SITE_KEY.value).toBe('self-hosted-site-key');
		expect(constants.CAPTCHA_TYPE).toBe('hcaptcha');
		expect(constants.GAUZY_API_BASE_SERVER_URL.value).toBe('https://api.example.org');
		expect(constants.IS_DEMO_MODE).toBe(true);
		expect(constants.DEFAULT_APP_PATH).toBe('/auth/password');
		expect(constants.DEMO_ACCOUNTS_CONFIG.length).toBeGreaterThan(0);
		expect(constants.APP_NAME).toBe('Acme Teams');
		expect(constants.TERMS_LINK).toBe('https://example.org/terms');
	});

	it('treats whitespace-only runtime values (secret-store placeholders) as unset', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			NEXT_PUBLIC_CAPTCHA_SITE_KEY: '   ',
			NEXT_PUBLIC_BOARD_APP_DOMAIN: ' ',
			NEXT_PUBLIC_MEET_TYPE: ' '
		};
		process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY = '';
		delete process.env.NEXT_PUBLIC_BOARD_APP_DOMAIN;

		const constants = loadConstants();

		// Not configured => no captcha widget, no board sharing (instead of `new URL(' ')` throwing).
		expect(constants.RECAPTCHA_SITE_KEY.value).toBeUndefined();
		expect(constants.BOARD_APP_DOMAIN.value).toBe('');
	});

	it('keeps a set-but-empty value distinct from an absent one (readers rely on it)', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = { NEXT_PUBLIC_GOOGLE_APP_NAME: ' ' };
		let envConfig!: typeof import('@/env-config');
		jest.isolateModules(() => {
			envConfig = require('@/env-config');
		});

		expect(envConfig.readRuntimeEnv('NEXT_PUBLIC_GOOGLE_APP_NAME')).toBe('');
		expect(envConfig.readRuntimeEnv('NEXT_PUBLIC_SLACK_APP_NAME')).toBeUndefined();
	});

	it('falls back to build-time values and code defaults when the runtime env does not set them', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {};
		delete process.env.APP_NAME;

		const constants = loadConstants();

		expect(constants.RECAPTCHA_SITE_KEY.value).toBe('ever-baked-site-key');
		expect(constants.GAUZY_API_BASE_SERVER_URL.value).toBe('https://api.ever.team');
		expect(constants.IS_DEMO_MODE).toBe(false);
		expect(constants.APP_NAME).toBe('Ever Teams');
		expect(constants.TERMS_LINK).toBe('https://ever.team/tos');
	});
});

describe('RuntimeEnvScript / RuntimeEnvProvider', () => {
	// Regular imports (not jest.isolateModules): the components must share the test's React instance.
	it('renders the injected env as an executable inline script and installs it', () => {
		const env = { NEXT_PUBLIC_CAPTCHA_SITE_KEY: 'self-hosted-site-key', APP_NAME: 'Acme </script> Teams' };

		const { container } = render(
			<RuntimeEnvProvider env={env}>
				<RuntimeEnvScript />
			</RuntimeEnvProvider>
		);

		const script = container.querySelector(`script#${RUNTIME_ENV_SCRIPT_ID}`);
		expect(script?.innerHTML).toBe(serializeRuntimeEnvScript(env));
		expect((globalThis as Record<string, unknown>)[GLOBAL]).toEqual(env);
		expect(readRuntimeEnv('APP_NAME')).toBe('Acme </script> Teams');
		expect(getNextPublicEnv('NEXT_PUBLIC_CAPTCHA_SITE_KEY').value).toBe('self-hosted-site-key');
	});

	it('renders nothing outside a provider', () => {
		const { container } = render(<RuntimeEnvScript />);

		expect(container.innerHTML).toBe('');
	});
});
