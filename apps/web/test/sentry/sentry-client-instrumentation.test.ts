/**
 * @jest-environment jsdom
 */
/**
 * Browser Sentry must follow the RUNTIME env the server injected into the page (self.__EVER_TEAMS_RUNTIME_ENV__),
 * not a value inlined when the image was built, and stay off — the SDK not even downloaded — without a DSN.
 * instrumentation-client.ts is in every page's entry, so the SDK is imported lazily; errors thrown while it
 * downloads must still be reported.
 */
import type * as ClientConfigModule from '@/sentry.client.config';
import type * as InstrumentationClientModule from '@/instrumentation-client';

const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockCaptureRouterTransitionStart = jest.fn();
const mockReplayIntegration = jest.fn((options: object) => ({ name: 'Replay', options }));
let mockSdkLoads = 0;

jest.mock('@sentry/nextjs', () => {
	mockSdkLoads++;
	return {
		init: mockInit,
		captureException: mockCaptureException,
		captureRouterTransitionStart: mockCaptureRouterTransitionStart,
		replayIntegration: mockReplayIntegration
	};
});

type ClientConfig = typeof ClientConfigModule;
type InstrumentationClient = typeof InstrumentationClientModule;

const ORIGINAL_ENV = process.env;
const GLOBAL = '__EVER_TEAMS_RUNTIME_ENV__';
const RUNTIME_DSN = 'https://runtime-key@sentry.example.org/1';

function setRuntimeEnv(env: Record<string, string>) {
	(globalThis as Record<string, unknown>)[GLOBAL] = env;
}

function loadClientConfig(): ClientConfig {
	return require('@/sentry.client.config');
}

function loadInstrumentationClient(): InstrumentationClient {
	return require('@/instrumentation-client');
}

/** Lets the dynamic import of the SDK and the `.then` callbacks behind it settle. */
async function flushPromises() {
	for (let i = 0; i < 5; i++) await Promise.resolve();
}

beforeEach(() => {
	jest.resetModules();
	mockSdkLoads = 0;
	// A value baked into an image built by someone else, as Next would inline it: it must not win.
	process.env = { ...ORIGINAL_ENV, NEXT_PUBLIC_SENTRY_DSN: 'https://baked-key@sentry.example.org/9' };
	setRuntimeEnv({});
});

afterAll(() => {
	process.env = ORIGINAL_ENV;
	delete (globalThis as Record<string, unknown>)[GLOBAL];
});

describe('browser Sentry (sentry.client.config.ts)', () => {
	it('stays off, without downloading the SDK, when the runtime env has no DSN', async () => {
		delete process.env.NEXT_PUBLIC_SENTRY_DSN;

		await expect(loadClientConfig().initSentryClient()).resolves.toBeUndefined();

		expect(mockSdkLoads).toBe(0);
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('treats a whitespace-only runtime DSN (secret-store placeholder) as unset', async () => {
		delete process.env.NEXT_PUBLIC_SENTRY_DSN;
		setRuntimeEnv({ NEXT_PUBLIC_SENTRY_DSN: '   ' });

		await expect(loadClientConfig().initSentryClient()).resolves.toBeUndefined();
		expect(mockInit).not.toHaveBeenCalled();
	});

	it('initialises with the runtime DSN over the build-time one, keeping the original defaults', async () => {
		setRuntimeEnv({ NEXT_PUBLIC_SENTRY_DSN: RUNTIME_DSN });

		await expect(loadClientConfig().initSentryClient()).resolves.toBeDefined();

		expect(mockInit).toHaveBeenCalledTimes(1);
		expect(mockInit).toHaveBeenCalledWith({
			dsn: RUNTIME_DSN,
			tracesSampleRate: 0.1,
			debug: false,
			replaysOnErrorSampleRate: 1,
			replaysSessionSampleRate: 0.1,
			integrations: [{ name: 'Replay', options: { maskAllText: true, blockAllMedia: true } }]
		});
	});

	it('reads environment, release, sample rate and debug overrides from the runtime env', async () => {
		setRuntimeEnv({
			NEXT_PUBLIC_SENTRY_DSN: RUNTIME_DSN,
			NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'staging',
			NEXT_PUBLIC_SENTRY_RELEASE: 'ever-teams-web@1.2.3',
			NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: '0.2',
			NEXT_PUBLIC_SENTRY_DEBUG: 'true'
		});

		await loadClientConfig().initSentryClient();

		expect(mockInit).toHaveBeenCalledWith(
			expect.objectContaining({
				environment: 'staging',
				release: 'ever-teams-web@1.2.3',
				tracesSampleRate: 0.2,
				debug: true
			})
		);
	});

	it('takes the Session Replay rates from the runtime env and leaves Replay out when both are 0', async () => {
		setRuntimeEnv({
			NEXT_PUBLIC_SENTRY_DSN: RUNTIME_DSN,
			NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE: '0',
			NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE: '0'
		});

		await loadClientConfig().initSentryClient();

		expect(mockInit).toHaveBeenCalledWith(
			expect.objectContaining({ replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, integrations: [] })
		);
	});

	it('initialises once however many times it is started', async () => {
		setRuntimeEnv({ NEXT_PUBLIC_SENTRY_DSN: RUNTIME_DSN });
		const config = loadClientConfig();

		await Promise.all([config.initSentryClient(), config.initSentryClient()]);

		expect(mockInit).toHaveBeenCalledTimes(1);
	});

	it('reports the errors raised while the SDK was downloading, once it is initialised', async () => {
		setRuntimeEnv({ NEXT_PUBLIC_SENTRY_DSN: RUNTIME_DSN });
		const hydrationError = new Error('hydration failed');
		const rejection = new Error('request failed');

		const started = loadClientConfig().initSentryClient();
		window.dispatchEvent(new ErrorEvent('error', { error: hydrationError, message: hydrationError.message }));
		window.dispatchEvent(Object.assign(new Event('unhandledrejection'), { reason: rejection }));
		await started;

		expect(mockCaptureException).toHaveBeenCalledTimes(2);
		expect(mockCaptureException).toHaveBeenCalledWith(hydrationError, {
			mechanism: { handled: false, type: 'auto.browser.global_handlers.onerror' }
		});
		expect(mockCaptureException).toHaveBeenCalledWith(rejection, {
			mechanism: { handled: false, type: 'auto.browser.global_handlers.onunhandledrejection' }
		});
		// Reported after init, so the SDK has a client to send them with.
		expect(mockInit.mock.invocationCallOrder[0]).toBeLessThan(mockCaptureException.mock.invocationCallOrder[0]);

		// From now on the SDK's own global handlers take over (stood in for by `sdkHandler`, which also keeps jsdom
		// from rethrowing the event): the buffer no longer listens, so nothing is reported twice.
		const sdkHandler = jest.fn();
		window.addEventListener('error', sdkHandler);
		window.dispatchEvent(new ErrorEvent('error', { error: new Error('later'), message: 'later' }));
		window.removeEventListener('error', sdkHandler);
		expect(sdkHandler).toHaveBeenCalledTimes(1);
		expect(mockCaptureException).toHaveBeenCalledTimes(2);
	});
});

describe('instrumentation-client.ts', () => {
	it('starts Sentry on load and forwards router transitions once the SDK is there', async () => {
		setRuntimeEnv({ NEXT_PUBLIC_SENTRY_DSN: RUNTIME_DSN });

		const { onRouterTransitionStart } = loadInstrumentationClient();
		await flushPromises();
		onRouterTransitionStart('/en/tasks', 'push');

		expect(mockInit).toHaveBeenCalledTimes(1);
		expect(mockCaptureRouterTransitionStart).toHaveBeenCalledWith('/en/tasks', 'push');
	});

	it('exports a no-op router hook when Sentry is off', async () => {
		delete process.env.NEXT_PUBLIC_SENTRY_DSN;

		const { onRouterTransitionStart } = loadInstrumentationClient();
		await flushPromises();

		expect(() => onRouterTransitionStart('/en/tasks', 'push')).not.toThrow();
		expect(mockSdkLoads).toBe(0);
		expect(mockCaptureRouterTransitionStart).not.toHaveBeenCalled();
	});
});
