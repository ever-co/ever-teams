/**
 * Server side of the runtime env contract (core/services/server/runtime-env.ts + env-config.ts):
 * the per-request payload sent to the browser contains the public configuration read from the
 * LIVE process env — and never a secret.
 */
import vm from 'node:vm';

const ORIGINAL_ENV = process.env;

function loadModules() {
	let modules!: {
		runtimeEnv: typeof import('@/core/services/server/runtime-env');
		envConfig: typeof import('@/env-config');
	};
	jest.isolateModules(() => {
		modules = {
			runtimeEnv: require('@/core/services/server/runtime-env'),
			envConfig: require('@/env-config')
		};
	});
	return modules;
}

beforeEach(() => {
	process.env = { ...ORIGINAL_ENV };
	delete process.env.NEXT_PUBLIC_IS_DESKTOP_APP;
	delete process.env.IS_DESKTOP_APP;
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('getPublicRuntimeEnv', () => {
	it('returns NEXT_PUBLIC_* and branding keys read at call time', () => {
		const { runtimeEnv } = loadModules();

		process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY = 'self-hosted-site-key';
		process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL = 'https://api.example.org';
		process.env.APP_NAME = 'Acme Teams';
		process.env.APP_LOGO_URL = 'https://cdn.example.org/logo.png';

		const env = runtimeEnv.getPublicRuntimeEnv();

		expect(env.NEXT_PUBLIC_CAPTCHA_SITE_KEY).toBe('self-hosted-site-key');
		expect(env.NEXT_PUBLIC_GAUZY_API_SERVER_URL).toBe('https://api.example.org');
		expect(env.APP_NAME).toBe('Acme Teams');
		expect(env.APP_LOGO_URL).toBe('https://cdn.example.org/logo.png');

		// Changing the container env changes the next response — nothing is cached at build/boot.
		process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY = 'rotated-site-key';
		expect(runtimeEnv.getPublicRuntimeEnv().NEXT_PUBLIC_CAPTCHA_SITE_KEY).toBe('rotated-site-key');
	});

	it('never exposes server secrets', () => {
		const { runtimeEnv } = loadModules();

		Object.assign(process.env, {
			AUTH_SECRET: 'auth-secret',
			CAPTCHA_SECRET_KEY: 'captcha-secret',
			GOOGLE_CLIENT_ID: 'google-client-id',
			GOOGLE_CLIENT_SECRET: 'google-client-secret',
			SMTP_PASSWORD: 'smtp-password',
			SENTRY_AUTH_TOKEN: 'sentry-token',
			MEET_JWT_APP_SECRET: 'meet-secret',
			LIVEKIT_API_SECRET: 'livekit-secret',
			GAUZY_API_SERVER_URL: 'http://gauzy-internal:3000'
		});

		const env = runtimeEnv.getPublicRuntimeEnv();
		const serialized = JSON.stringify(env);

		for (const value of [
			'auth-secret',
			'captcha-secret',
			'google-client-id',
			'google-client-secret',
			'smtp-password',
			'sentry-token',
			'meet-secret',
			'livekit-secret',
			'gauzy-internal'
		]) {
			expect(serialized).not.toContain(value);
		}
		expect(
			Object.keys(env).every(
				(key) =>
					key.startsWith('NEXT_PUBLIC_') ||
					key.startsWith('APP_') ||
					/^(COMPANY_|TERMS_|PRIVACY_|MAIN_PICTURE)/.test(key)
			)
		).toBe(true);
	});

	it('keeps set-but-empty keys (readers distinguish "set" from "absent")', () => {
		const { runtimeEnv } = loadModules();

		process.env.NEXT_PUBLIC_GOOGLE_APP_NAME = '';
		delete process.env.NEXT_PUBLIC_SLACK_APP_NAME;

		const env = runtimeEnv.getPublicRuntimeEnv();

		expect(env).toHaveProperty('NEXT_PUBLIC_GOOGLE_APP_NAME', '');
		expect(env).not.toHaveProperty('NEXT_PUBLIC_SLACK_APP_NAME');
	});

	it('points the desktop app browser at the API configured for the desktop server', () => {
		process.env.NEXT_PUBLIC_IS_DESKTOP_APP = 'true';
		process.env.IS_DESKTOP_APP = 'true';
		process.env.GAUZY_API_SERVER_URL = 'http://localhost:3000';
		process.env.NEXT_PUBLIC_GAUZY_API_SERVER_URL = 'https://stale.example.org';

		const { runtimeEnv } = loadModules();

		expect(runtimeEnv.getPublicRuntimeEnv().NEXT_PUBLIC_GAUZY_API_SERVER_URL).toBe('http://localhost:3000');
	});
});

describe('readRuntimeEnv (server)', () => {
	it('reads the live process env, not a build-time snapshot', () => {
		const { envConfig } = loadModules();

		process.env.NEXT_PUBLIC_CAPTCHA_TYPE = 'hcaptcha';
		expect(envConfig.readRuntimeEnv('NEXT_PUBLIC_CAPTCHA_TYPE')).toBe('hcaptcha');

		delete process.env.NEXT_PUBLIC_CAPTCHA_TYPE;
		expect(envConfig.readRuntimeEnv('NEXT_PUBLIC_CAPTCHA_TYPE')).toBeUndefined();
	});
});

describe('serializeRuntimeEnvScript', () => {
	it('round-trips values and cannot break out of the <script> element', () => {
		const { envConfig } = loadModules();
		const hostile = '</script><script>alert(1)</script> & \u2028\u2029 "quoted" \'single\'';
		const script = envConfig.serializeRuntimeEnvScript({ APP_NAME: hostile, NEXT_PUBLIC_X: 'x' });

		expect(script).not.toMatch(/<\/script/i);
		expect(script).not.toContain('<');
		expect(script).not.toContain('\u2028');
		expect(script).not.toContain('\u2029');

		const sandbox: Record<string, any> = {};
		sandbox.self = sandbox;
		vm.runInNewContext(script, sandbox);

		expect(sandbox[envConfig.RUNTIME_ENV_GLOBAL]).toEqual({ APP_NAME: hostile, NEXT_PUBLIC_X: 'x' });
	});
});
