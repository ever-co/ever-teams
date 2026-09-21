import type { Instrumentation } from 'next';

// Server-side Sentry. Next.js calls register() once per runtime when the server starts — in the published Docker
// image too, unlike next.config.js's withSentryConfig, which only matters when SENTRY_DSN is set at BUILD time
// (source-map upload). The DSN and options come from the container env (sentry.server.config.ts); without a DSN
// nothing is initialised and the SDK is not loaded.
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation

// Set by register() only when Sentry started.
let captureRequestError: Instrumentation.onRequestError | undefined;

export async function register() {
	// Literal NEXT_RUNTIME checks: Next inlines them per bundle, so each runtime only bundles its own SDK build.
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		const { initSentryServer } = await import('./sentry.server.config');
		captureRequestError = (await initSentryServer())?.captureRequestError;
	}

	if (process.env.NEXT_RUNTIME === 'edge') {
		const { initSentryEdge } = await import('./sentry.edge.config');
		captureRequestError = (await initSentryEdge())?.captureRequestError;
	}
}

// Errors thrown by server components, route handlers, server actions and the proxy (Sentry.captureRequestError).
export const onRequestError: Instrumentation.onRequestError = (...args) => captureRequestError?.(...args);
