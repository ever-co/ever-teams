/**
 * Server-side Sentry must work in the published Docker image: instrumentation.ts register() starts it from the
 * RUNTIME env (next.config.js's withSentryConfig only runs when SENTRY_DSN is set at build time, which the image
 * never is), and it must stay off — without even loading the SDK — when the deployment configures no DSN.
 */
import type { Instrumentation } from 'next';
import type * as ServerConfigModule from '@/sentry.server.config';
import type * as InstrumentationModuleExports from '@/instrumentation';

const mockInit = jest.fn();
const mockCaptureRequestError = jest.fn();
let mockSdkLoads = 0;

jest.mock('@sentry/nextjs', () => {
	mockSdkLoads++;
	return { init: mockInit, captureRequestError: mockCaptureRequestError };
});

type ServerConfig = typeof ServerConfigModule;
type InstrumentationModule = typeof InstrumentationModuleExports;

const ORIGINAL_ENV = process.env;
const RUNTIME_DSN = 'https://runtime-key@sentry.example.org/1';

const requestErrorArgs: Parameters<Instrumentation.onRequestError> = [
	new Error('render failed'),
	{ path: '/en/tasks', method: 'GET', headers: {} },
	{ routerKind: 'App Router', routePath: '/[locale]/tasks', routeType: 'render', revalidateReason: undefined }
];

function loadServerConfig(): ServerConfig {
	return require('@/sentry.server.config');
}

function loadInstrumentation(): InstrumentationModule {
	return require('@/instrumentation');
}

beforeEach(() => {
	jest.resetModules();
	mockSdkLoads = 0;
	process.env = { ...ORIGINAL_ENV };
	for (const key of Object.keys(process.env)) {
		if (key.includes('SENTRY') || key === 'NEXT_RUNTIME') delete process.env[key];
	}
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
});

describe('server Sentry options (sentry.server.config.ts)', () => {
	it('stays off, without loading the SDK, when no DSN is configured', async () => {
		expect(loadServerConfig().getSentryServerOptions()).toBeUndefined();
		await expect(loadServerConfig().initSentryServer()).resolves.toBeUndefined();

		expect(mockSdkLoads).toBe(0);
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('treats a whitespace-only DSN (secret-store placeholder) as unset', async () => {
		process.env.SENTRY_DSN = '  ';
		process.env.NEXT_PUBLIC_SENTRY_DSN = ' ';

		await expect(loadServerConfig().initSentryServer()).resolves.toBeUndefined();
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('initialises with the runtime SENTRY_DSN and the original defaults', async () => {
		process.env.SENTRY_DSN = RUNTIME_DSN;

		await expect(loadServerConfig().initSentryServer()).resolves.toBeDefined();

		expect(mockInit).toHaveBeenCalledTimes(1);
		// No environment/release keys: the SDK keeps its own defaults for them.
		expect(mockInit).toHaveBeenCalledWith({ dsn: RUNTIME_DSN, tracesSampleRate: 1, debug: false });
	});

	it('falls back to NEXT_PUBLIC_SENTRY_DSN, and prefers the server-only SENTRY_DSN', () => {
		process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public-key@sentry.example.org/2';
		expect(loadServerConfig().getSentryServerOptions()?.dsn).toBe('https://public-key@sentry.example.org/2');

		process.env.SENTRY_DSN = RUNTIME_DSN;
		expect(loadServerConfig().getSentryServerOptions()?.dsn).toBe(RUNTIME_DSN);
	});

	it('reads environment, release, sample rate and debug overrides from the runtime env', () => {
		process.env.SENTRY_DSN = RUNTIME_DSN;
		process.env.SENTRY_ENVIRONMENT = 'staging';
		process.env.NEXT_PUBLIC_SENTRY_RELEASE = 'ever-teams-web@1.2.3';
		process.env.SENTRY_TRACES_SAMPLE_RATE = '0.25';
		process.env.NEXT_PUBLIC_SENTRY_DEBUG = 'true';

		expect(loadServerConfig().getSentryServerOptions()).toEqual({
			dsn: RUNTIME_DSN,
			environment: 'staging',
			release: 'ever-teams-web@1.2.3',
			tracesSampleRate: 0.25,
			debug: true
		});
	});

	it.each(['1.5', '-0.1', 'abc'])('keeps the default sample rate for an invalid value (%s)', (rate) => {
		process.env.SENTRY_DSN = RUNTIME_DSN;
		process.env.SENTRY_TRACES_SAMPLE_RATE = rate;

		expect(loadServerConfig().getSentryServerOptions()?.tracesSampleRate).toBe(1);
	});
});

describe('instrumentation.ts', () => {
	it('does nothing without a DSN: no SDK, no init, onRequestError is a no-op', async () => {
		process.env.NEXT_RUNTIME = 'nodejs';
		const instrumentation = loadInstrumentation();

		await instrumentation.register();
		await instrumentation.onRequestError(...requestErrorArgs);

		expect(mockSdkLoads).toBe(0);
		expect(mockInit).not.toHaveBeenCalled();
		expect(mockCaptureRequestError).not.toHaveBeenCalled();
	});

	it.each(['nodejs', 'edge'])('starts Sentry in the %s runtime and reports request errors', async (runtime) => {
		process.env.NEXT_RUNTIME = runtime;
		process.env.SENTRY_DSN = RUNTIME_DSN;
		const instrumentation = loadInstrumentation();

		await instrumentation.register();
		await instrumentation.onRequestError(...requestErrorArgs);

		expect(mockInit).toHaveBeenCalledTimes(1);
		expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({ dsn: RUNTIME_DSN }));
		expect(mockCaptureRequestError).toHaveBeenCalledWith(...requestErrorArgs);
	});

	it('does nothing outside the Node.js and edge runtimes', async () => {
		process.env.SENTRY_DSN = RUNTIME_DSN;

		await loadInstrumentation().register();

		expect(mockInit).not.toHaveBeenCalled();
	});
});
