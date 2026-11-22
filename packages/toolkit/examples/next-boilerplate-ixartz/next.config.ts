import path from 'node:path';
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
			// The Docker image sets NEXT_BUILD_OUTPUT_TYPE=standalone (as apps/web does): Next then traces
			// the files the server needs into .next/standalone, so the image ships those instead of the
			// whole monorepo install. Tracing starts at the repository root, where yarn hoists node_modules.
			output: process.env.NEXT_BUILD_OUTPUT_TYPE === 'standalone' ? 'standalone' : undefined,
			outputFileTracingRoot: path.resolve(__dirname, '../../../..'),
			// Build tools that the hoisted monorepo install puts in reach of Next's server trace: webpack and the
			// minifiers it can load, plus the musl builds of sharp. `node server.js` never loads them (~110 MB).
			outputFileTracingExcludes: {
				'*': [
					'**/node_modules/webpack/**',
					'**/node_modules/minimizer-webpack-plugin/**',
					'**/node_modules/@swc/core/**',
					'**/node_modules/@swc/core-*/**',
					'**/node_modules/esbuild/**',
					'**/node_modules/@esbuild/**',
					'**/node_modules/{sass,svgo,csso,clean-css,uglify-js}/**',
					'**/node_modules/babel-plugin-react-compiler/**',
					'**/node_modules/@img/*linuxmusl*/**'
				]
			},
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
