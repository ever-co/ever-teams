import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';
import createNextIntlPlugin from 'next-intl/plugin';
import './src/libs/Env';

const withNextIntl = createNextIntlPlugin('./src/libs/i18n.ts');

const bundleAnalyzer = withBundleAnalyzer({
	enabled: process.env.ANALYZE === 'true'
});

/** @type {import('next').NextConfig} */
export default withSentryConfig(
	bundleAnalyzer(
		withNextIntl({
			poweredByHeader: false,
			reactStrictMode: true,
			serverExternalPackages: ['@electric-sql/pglite'],
			// No `env:` block. Every key listed here is inlined by Next into the client AND the server
			// bundles at build time, so the published image would carry the values of whoever built it and
			// no `docker run -e ...` could change them. Read deployment values per request instead
			// (src/libs/runtime-env.ts) and pass them to client components as props.
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
);
