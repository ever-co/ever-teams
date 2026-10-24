// Browser Sentry. instrumentation-client.ts starts it: Next.js loads that file on every page, with Turbopack and
// webpack alike. Webpack builds wrapped by withSentryConfig also inject THIS file into the client entry, which is
// why it has no side effects of its own (the SDK must be initialised once).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import type * as SentrySdk from '@sentry/nextjs';
import { readRuntimeEnv } from '@/env-config';

type Sentry = typeof SentrySdk;
type EarlyError = { error: unknown; mechanism: string };

const DEFAULT_TRACES_SAMPLE_RATE = 0.1;
const DEFAULT_REPLAYS_SESSION_SAMPLE_RATE = 0.1;
const DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE = 1;
// Enough for a burst of startup errors, bounded in case the SDK chunk never arrives.
const MAX_EARLY_ERRORS = 20;

let sentryClient: Promise<Sentry | undefined> | undefined;

/**
 * The browser DSN, from the runtime env the server injected into the page (the literal is only the
 * build-time fallback). Undefined — Sentry off — when the deployment leaves it unset or blank.
 */
export function getSentryClientDsn(): string | undefined {
	return (readRuntimeEnv('NEXT_PUBLIC_SENTRY_DSN') || process.env.NEXT_PUBLIC_SENTRY_DSN)?.trim() || undefined;
}

function readSampleRate(value: string | undefined, fallback: number): number {
	const rate = value?.trim() ? Number(value) : Number.NaN;
	return rate >= 0 && rate <= 1 ? rate : fallback;
}

/** `Sentry.init` options for the browser. The values of the original wizard config remain the defaults. */
export function getSentryClientOptions(Sentry: Sentry, dsn: string): SentrySdk.BrowserOptions {
	const environment = (
		readRuntimeEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT') || process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT
	)?.trim();
	const release = (readRuntimeEnv('NEXT_PUBLIC_SENTRY_RELEASE') || process.env.NEXT_PUBLIC_SENTRY_RELEASE)?.trim();
	// Session Replay rates are runtime settings too; 0 for both leaves the Replay integration out entirely.
	const replaysSessionSampleRate = readSampleRate(
		readRuntimeEnv('NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE') ||
			process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
		DEFAULT_REPLAYS_SESSION_SAMPLE_RATE
	);
	const replaysOnErrorSampleRate = readSampleRate(
		readRuntimeEnv('NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE') ||
			process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE,
		DEFAULT_REPLAYS_ON_ERROR_SAMPLE_RATE
	);

	return {
		dsn,
		// Only when set: otherwise the SDK keeps its own defaults (NODE_ENV, the release injected at build).
		...(environment ? { environment } : {}),
		...(release ? { release } : {}),

		// Adjust this value in production, or use tracesSampler for greater control
		tracesSampleRate: readSampleRate(
			readRuntimeEnv('NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE') ||
				process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
			DEFAULT_TRACES_SAMPLE_RATE
		),

		// Setting this option to true will print useful information to the console while you're setting up Sentry.
		debug: (readRuntimeEnv('NEXT_PUBLIC_SENTRY_DEBUG') || process.env.NEXT_PUBLIC_SENTRY_DEBUG) === 'true',

		replaysOnErrorSampleRate,

		// Share of all sessions recorded (default 10%); replaysOnErrorSampleRate covers sessions with an error.
		replaysSessionSampleRate,

		// Replay may only be enabled for the client-side
		integrations:
			replaysSessionSampleRate > 0 || replaysOnErrorSampleRate > 0
				? [
						Sentry.replayIntegration({
							// Additional Replay configuration goes in here, for example:
							maskAllText: true,
							blockAllMedia: true
						})
					]
				: []
	};
}

/**
 * Keeps the uncaught errors and unhandled rejections raised while the SDK chunk downloads (hydration errors
 * included), so that loading it lazily loses none of them. Returns the function that stops listening and hands
 * them over, tagged like the SDK's own global handlers would tag them.
 */
function bufferEarlyErrors(): () => EarlyError[] {
	const errors: EarlyError[] = [];
	const keep = (error: unknown, mechanism: string) => {
		if (errors.length < MAX_EARLY_ERRORS) errors.push({ error, mechanism });
	};
	const onError = (event: ErrorEvent) => keep(event.error ?? event.message, 'auto.browser.global_handlers.onerror');
	const onRejection = (event: PromiseRejectionEvent) =>
		keep(event.reason, 'auto.browser.global_handlers.onunhandledrejection');

	window.addEventListener('error', onError);
	window.addEventListener('unhandledrejection', onRejection);
	return () => {
		window.removeEventListener('error', onError);
		window.removeEventListener('unhandledrejection', onRejection);
		return errors;
	};
}

async function loadSentryClient(): Promise<Sentry | undefined> {
	const dsn = typeof window === 'undefined' ? undefined : getSentryClientDsn();
	if (!dsn) return undefined;

	// Registered synchronously, before the first await: nothing thrown from here on is missed.
	const takeEarlyErrors = bufferEarlyErrors();
	let Sentry: Sentry;
	try {
		Sentry = await import('@sentry/nextjs');
	} catch {
		// Monitoring is optional: a chunk that fails to load must not break the page.
		takeEarlyErrors();
		return undefined;
	}

	const earlyErrors = takeEarlyErrors();
	Sentry.init(getSentryClientOptions(Sentry, dsn));
	for (const { error, mechanism } of earlyErrors) {
		Sentry.captureException(error, { mechanism: { handled: false, type: mechanism } });
	}
	return Sentry;
}

/**
 * Starts Sentry in the browser when a DSN is configured at runtime and resolves to the SDK. Without a DSN it
 * resolves to undefined and the SDK is never downloaded: it is loaded with a dynamic import because
 * instrumentation-client.ts is part of every page's entry, and the SDK with tracing and replay weighs close to 90 KB
 * gzipped. Idempotent.
 */
export function initSentryClient(): Promise<Sentry | undefined> {
	sentryClient ??= loadSentryClient();
	return sentryClient;
}
