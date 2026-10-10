import type { Instrumentation } from 'next';
import { isEverStatsEnabled } from './core/lib/ever-platform/env';

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
		// Demo deployments: the default sign-in presets, kept out of the client code (see the module).
		const { applyDemoAccountDefaults } = await import('./core/lib/demo/default-demo-accounts');
		applyDemoAccountDefaults();

		const { initSentryServer } = await import('./sentry.server.config');
		captureRequestError = (await initSentryServer())?.captureRequestError;

		// Anonymous usage statistics (docs/ever-platform/anonymous-usage-statistics.md): loaded only when
		// EVER_STATS_ENABLED is not 'false', and silent unless the paired API says its statistics are on.
		if (isEverStatsEnabled()) {
			const { startEverStats } = await import('./core/services/server/ever-stats/scheduler');
			startEverStats();
		} else {
			console.info('ever_stats.reporter state=not_loaded (EVER_STATS_ENABLED=false)');
		}
	}

	if (process.env.NEXT_RUNTIME === 'edge') {
		const { initSentryEdge } = await import('./sentry.edge.config');
		captureRequestError = (await initSentryEdge())?.captureRequestError;
	}
}

// Errors thrown by server components, route handlers, server actions and the proxy (Sentry.captureRequestError).
export const onRequestError: Instrumentation.onRequestError = (...args) => captureRequestError?.(...args);
