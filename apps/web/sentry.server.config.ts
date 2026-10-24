// Server-side Sentry for the Node.js runtime, and for the edge runtime through sentry.edge.config.ts.
// instrumentation.ts register() starts it when the server boots. Every value is read from the RUNTIME env, so the
// published Docker image reports wherever the deployment points it; without a DSN nothing is initialised and the SDK
// is not even loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import type * as SentrySdk from '@sentry/nextjs';
import { readRuntimeEnv } from '@/env-config';

type Sentry = typeof SentrySdk;

// 10% of requests unless SENTRY_TRACES_SAMPLE_RATE says otherwise: every request is a transaction on the server.
const DEFAULT_TRACES_SAMPLE_RATE = 0.1;

/**
 * First non-blank value of the server-only `SENTRY_*` key, then of the `NEXT_PUBLIC_SENTRY_*` key the browser uses,
 * so one set of public values configures both sides. Read per call, never inlined at build time.
 */
function readSentryEnv(serverName: string, publicName: string): string | undefined {
	return (readRuntimeEnv(serverName) || readRuntimeEnv(publicName))?.trim() || undefined;
}

function readSampleRate(value: string | undefined, fallback: number): number {
	const rate = value ? Number(value) : Number.NaN;
	return rate >= 0 && rate <= 1 ? rate : fallback;
}

type ProbeSamplingContext = {
	name?: string;
	normalizedRequest?: { url?: string; headers?: Record<string, string | string[] | undefined> };
};

/**
 * Kubernetes liveness/readiness probes (User-Agent `kube-probe/...`) and /api/health checks hit every replica every
 * few seconds; tracing them would spend the Sentry quota on nothing.
 */
function isHealthProbe(context: ProbeSamplingContext): boolean {
	const userAgent = context.normalizedRequest?.headers?.['user-agent'];
	const agent = Array.isArray(userAgent) ? userAgent[0] : userAgent;
	if (agent?.toLowerCase().startsWith('kube-probe/')) return true;
	const target = `${context.name ?? ''} ${context.normalizedRequest?.url ?? ''}`;
	return /\/api\/health(?:[/?#\s]|$)/.test(target);
}

/** `Sentry.init` options for the server, or undefined when no DSN is configured (Sentry off). */
export function getSentryServerOptions(): Parameters<Sentry['init']>[0] | undefined {
	const dsn = readSentryEnv('SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN');
	if (!dsn) return undefined;

	const environment = readSentryEnv('SENTRY_ENVIRONMENT', 'NEXT_PUBLIC_SENTRY_ENVIRONMENT');
	const release = readSentryEnv('SENTRY_RELEASE', 'NEXT_PUBLIC_SENTRY_RELEASE');
	const tracesSampleRate = readSampleRate(
		readSentryEnv('SENTRY_TRACES_SAMPLE_RATE', 'NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE'),
		DEFAULT_TRACES_SAMPLE_RATE
	);

	return {
		dsn,
		// Only when set: otherwise the SDK keeps its own defaults (NODE_ENV, the release injected at build).
		...(environment ? { environment } : {}),
		...(release ? { release } : {}),

		tracesSampleRate,
		// Takes precedence over tracesSampleRate: never trace health probes, otherwise honour the incoming trace's
		// decision or the configured rate.
		tracesSampler: (context) => (isHealthProbe(context) ? 0 : context.inheritOrSampleWith(tracesSampleRate)),

		// Setting this option to true will print useful information to the console while you're setting up Sentry.
		debug: readRuntimeEnv('NEXT_PUBLIC_SENTRY_DEBUG') === 'true'
	};
}

/**
 * Starts server-side Sentry when a DSN is configured and returns the SDK; otherwise returns undefined without
 * loading it (the Node.js SDK pulls in OpenTelemetry, a real startup cost for deployments that do not use Sentry).
 */
export async function initSentryServer(): Promise<Sentry | undefined> {
	const options = getSentryServerOptions();
	if (!options) return undefined;

	const Sentry = await import('@sentry/nextjs');
	Sentry.init(options);
	return Sentry;
}
