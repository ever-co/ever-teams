import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import './src/libs/Env';

const withNextIntl = createNextIntlPlugin('./src/libs/i18n.ts');

const bundleAnalyzer = withBundleAnalyzer({
	enabled: process.env.ANALYZE === 'true'
});

// --- ever-k8s: monorepo root is four levels up from packages/toolkit/examples/next-boilerplate-ixartz.
const monorepoRoot = path.join(__dirname, '../../../..');

/** @type {import('next').NextConfig} */
const composedConfig = withSentryConfig(
	bundleAnalyzer(
		withNextIntl({
			poweredByHeader: false,
			reactStrictMode: true,
			// --- ever-k8s: force Next standalone output for containerization ---
			output: 'standalone',
			outputFileTracingRoot: monorepoRoot,
			serverExternalPackages: ['@electric-sql/pglite'],
			env: {
				NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
				NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
				NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
				NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
				NEXT_PUBLIC_TEAMS_API_URL: process.env.NEXT_PUBLIC_TEAMS_API_URL
			}
		})
	),
	{
		// For all available options, see:
		// https://github.com/getsentry/sentry-webpack-plugin#options
		// FIXME: Add your Sentry organization and project names
		org: 'nextjs-boilerplate-org',
		project: 'nextjs-boilerplate',

		// Only print logs for uploading source maps in CI
		silent: !process.env.CI,

		// For all available options, see:
		// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

		// Upload a larger set of source maps for prettier stack traces (increases build time)
		widenClientFileUpload: true,

		// Automatically annotate React components to show their full name in breadcrumbs and session replay
		reactComponentAnnotation: {
			enabled: true
		},

		// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
		// This can increase your server load as well as your hosting bill.
		// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
		// side errors will fail.
		tunnelRoute: '/monitoring',

		// Hides source maps from generated client bundles
		hideSourceMaps: true,

		// Automatically tree-shake Sentry logger statements to reduce bundle size
		disableLogger: true,

		// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
		// See the following for more information:
		// https://docs.sentry.io/product/crons/
		// https://vercel.com/docs/cron-jobs
		automaticVercelMonitors: true,

		// Disable Sentry telemetry
		telemetry: false
	}
) as import('next').NextConfig;

// Force standalone on the composed config too, in case a wrapping plugin drops top-level keys.
composedConfig.output = 'standalone';
composedConfig.outputFileTracingRoot = monorepoRoot;

export default composedConfig;
