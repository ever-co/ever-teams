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
import {
	getNextPublicEnv,
	readRuntimeEnv,
	RUNTIME_ENV_ATTRIBUTE,
	RUNTIME_ENV_SCRIPT_ID,
	serializeRuntimeEnvAttribute,
	serializeRuntimeEnvScript
} from '@/env-config';
import { useRuntimeEnvHtmlProps } from '@/core/components/providers/runtime-env-provider';

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
	document.documentElement.removeAttribute(RUNTIME_ENV_ATTRIBUTE);
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
	document.documentElement.removeAttribute(RUNTIME_ENV_ATTRIBUTE);
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

/**
 * The payload travels on <html>, not in a <head> script, so it is already there when the FIRST
 * bundle module is evaluated: Next puts its chunks in <head> as `async` scripts, which may run
 * before the rest of the document is parsed. A module-level constant that missed the payload would
 * hold a build-time value while the server rendered the runtime one — a hydration mismatch.
 */
describe('runtime env carried by the <html> attribute', () => {
	it('is what module-level constants read, with no script having run', () => {
		document.documentElement.setAttribute(
			RUNTIME_ENV_ATTRIBUTE,
			serializeRuntimeEnvAttribute({
				NEXT_PUBLIC_CAPTCHA_SITE_KEY: 'self-hosted-site-key',
				APP_NAME: 'Acme Teams'
			})
		);

		const constants = loadConstants();

		expect(constants.RECAPTCHA_SITE_KEY.value).toBe('self-hosted-site-key');
		expect(constants.APP_NAME).toBe('Acme Teams');
	});

	it('keeps working once the document no longer carries it (global-error re-renders <html>)', () => {
		document.documentElement.setAttribute(RUNTIME_ENV_ATTRIBUTE, serializeRuntimeEnvAttribute({ APP_NAME: 'Acme' }));
		let envConfig!: typeof import('@/env-config');
		jest.isolateModules(() => {
			envConfig = require('@/env-config');
		});

		expect(envConfig.readRuntimeEnv('APP_NAME')).toBe('Acme');
		document.documentElement.removeAttribute(RUNTIME_ENV_ATTRIBUTE);
		expect(envConfig.readRuntimeEnv('APP_NAME')).toBe('Acme');
	});

	it('falls back to the build-time values when the attribute is not valid JSON', () => {
		document.documentElement.setAttribute(RUNTIME_ENV_ATTRIBUTE, '{not json');

		expect(loadConstants().RECAPTCHA_SITE_KEY.value).toBe('ever-baked-site-key');
	});
});

describe('deployment-specific defaults in the browser', () => {
	beforeEach(() => {
		// Server-only keys are never inlined into the client bundle: in a browser only the injected env has them.
		// (next/jest loads apps/web/.env, which sets some of them; the NEXT_PUBLIC_ ones stand for build-time values.)
		const keys = ['APP_LINK', 'APP_LOGO_URL', 'APP_FAVICON_URL', 'APP_SLOGAN_TEXT', 'COMPANY_LINK', 'TERMS_LINK'];
		keys.push('PRIVACY_POLICY_LINK', 'GAUZY_API_SERVER_URL', 'NEXT_PUBLIC_GITHUB_APP_NAME');
		keys.push('NEXT_PUBLIC_POSTHOG_HOST', 'NEXT_PUBLIC_WEB_APP_URL');
		for (const key of keys) delete process.env[key];
		delete (globalThis as Record<string, unknown>).__everTeamsConfigWarnings;
	});

	it('derives the logo from the runtime APP_LINK and reads the runtime favicon', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			APP_LINK: 'https://teams.example.org/',
			APP_FAVICON_URL: '/assets/acme.ico'
		};

		const constants = loadConstants();

		expect(constants.APP_LOGO_URL).toBe('https://teams.example.org/assets/ever-teams.png');
		expect(constants.APP_LOGO_SRC).toBe('/assets/ever-teams.png');
		expect(constants.APP_FAVICON_URL).toBe('/assets/acme.ico');
	});

	it("resolves a path-valued logo against this app's public URL before APP_LINK", () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			APP_LINK: 'https://www.example.org',
			NEXT_PUBLIC_WEB_APP_URL: 'https://teams.example.org/'
		};

		expect(loadConstants().APP_LOGO_URL).toBe('https://teams.example.org/assets/ever-teams.png');
	});

	it("keeps Ever's logo and the default favicon when the runtime env sets neither", () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {};

		const constants = loadConstants();

		expect(constants.APP_LOGO_URL).toBe('https://app.ever.team/assets/ever-teams.png');
		expect(constants.APP_FAVICON_URL).toBe('/favicon.ico');
	});

	it("turns optional branding off with the runtime value 'none'", () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			APP_SLOGAN_TEXT: 'None',
			COMPANY_LINK: 'none',
			TERMS_LINK: 'NONE',
			PRIVACY_POLICY_LINK: 'none'
		};

		const constants = loadConstants();

		expect([
			constants.APP_SLOGAN_TEXT,
			constants.COMPANY_LINK,
			constants.TERMS_LINK,
			constants.PRIVACY_POLICY_LINK
		]).toEqual(['', '', '', '']);
		expect(constants.COMPANY_NAME).toBeTruthy();
	});

	it('reads the demo accounts, GitHub App and PostHog host from the runtime env', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			NEXT_PUBLIC_DEMO: 'true',
			NEXT_PUBLIC_DEMO_ACCOUNTS: '[{"type":"ADMIN","email":"demo@example.org","password":"demo-pass"}]',
			NEXT_PUBLIC_GITHUB_APP_NAME: 'acme-github',
			NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com'
		};

		const constants = loadConstants();

		expect(constants.DEMO_ACCOUNTS_CONFIG).toEqual([
			expect.objectContaining({
				type: 'ADMIN',
				email: 'demo@example.org',
				password: 'demo-pass',
				role: 'Admin',
				translationKey: 'DEMO_ADMIN'
			})
		]);
		expect(constants.GITHUB_APP_NAME.value).toBe('acme-github');
		expect(constants.POSTHOG_HOST.value).toBe('https://eu.i.posthog.com');
	});

	it('has no GitHub App and PostHog Cloud as host when the runtime env sets neither', () => {
		(globalThis as Record<string, unknown>)[GLOBAL] = {};

		const constants = loadConstants();

		expect(constants.GITHUB_APP_NAME.value).toBe('');
		expect(constants.POSTHOG_HOST.value).toBe('https://us.i.posthog.com');
	});

	it('never warns about the API proxy base in the browser', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
		Object.assign(process.env, { NODE_ENV: 'production' });
		delete process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL;
		(globalThis as Record<string, unknown>)[GLOBAL] = {
			NEXT_PUBLIC_GAUZY_API_SERVER_URL: 'https://api.example.org'
		};

		try {
			expect(loadConstants().GAUZY_API_SERVER_URL).toBe('https://api.example.org/api');
			(globalThis as Record<string, unknown>)[GLOBAL] = {};
			expect(loadConstants().GAUZY_API_SERVER_URL).toBe('https://api.ever.team/api');
			expect(warn).not.toHaveBeenCalled();
		} finally {
			warn.mockRestore();
		}
	});
});

describe('RuntimeEnvScript / RuntimeEnvProvider', () => {
	// Regular imports (not jest.isolateModules): the components must share the test's React instance.
	function HtmlPropsProbe() {
		return <div data-testid="probe" {...useRuntimeEnvHtmlProps()} />;
	}

	it('publishes the env as an <html> attribute, ahead of every bundle chunk', () => {
		const env = { NEXT_PUBLIC_CAPTCHA_SITE_KEY: 'self-hosted-site-key', APP_NAME: 'Acme Teams' };

		const { container } = render(
			<RuntimeEnvProvider env={env}>
				<HtmlPropsProbe />
			</RuntimeEnvProvider>
		);

		const probe = container.querySelector('[data-testid="probe"]');
		expect(JSON.parse(probe?.getAttribute(RUNTIME_ENV_ATTRIBUTE) ?? '{}')).toEqual(env);
	});

	it('publishes no attribute outside a provider', () => {
		const { container } = render(<HtmlPropsProbe />);

		expect(container.querySelector('[data-testid="probe"]')?.hasAttribute(RUNTIME_ENV_ATTRIBUTE)).toBe(false);
	});

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
