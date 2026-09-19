const withNextIntl = require('next-intl/plugin')('./core/lib/i18n/request.ts');
const { withSentryConfig } = require('@sentry/nextjs');
const { parseImageHosts, serializeImageRemotePatterns } = require('./image-hosts');
const { version: webPackageVersion } = require('./package.json');
const webBuildSha =
	process.env.NEXT_PUBLIC_BUILD_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || 'dev';
const withBundleAnalyzer = require('@next/bundle-analyzer')({
	enabled: process.env.ANALYZE === 'true'
});
const isProduction = process.env.NODE_ENV === 'production';

const isSentryEnabled = isProduction && process.env.SENTRY_DSN;

// Parse images hosts from environment variable (defaults when unset: image-hosts.js DEFAULT_IMAGE_HOSTS).
// The default list and the parsing live in image-hosts.js, shared with proxy.ts: this list is frozen
// into the build (images.remotePatterns below), while hosts added at runtime are served unoptimized
// by proxy.ts (core/lib/helpers/image-request.ts).
const parseImagesHosts = () => parseImageHosts(process.env.NEXT_PUBLIC_IMAGES_HOSTS);

const allowedImageHosts = parseImagesHosts();
const localImageHosts = [
	{
		hostname: '127.0.0.1',
		port: '3000'
	},
	{
		hostname: 'localhost',
		port: '3030'
	},
	{
		hostname: '127.0.0.1',
		port: '3030'
	}
];

// next/image optimizer allowlist (images.remotePatterns). BUILD-time: output 'standalone' serializes
// the resolved config into server.js, so container env cannot change it. The same list reaches
// proxy.ts through the EVER_TEAMS_OPTIMIZED_IMAGE_HOSTS env key below.
const imageRemotePatterns = [
	// Static localhost patterns
	...localImageHosts.map((host) => ({
		protocol: 'http',
		hostname: host.hostname,
		port: host.port
	})),
	// Dynamic hosts from environment variable
	...allowedImageHosts.map((hostname) => ({
		protocol: 'https',
		hostname: hostname,
		port: ''
	}))
];

const BUILD_OUTPUT_MODE = process.env.NEXT_BUILD_OUTPUT_TYPE;

const sentryConfig = isSentryEnabled && {
	sentry: {
		// For all available options, see: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

		// Upload a larger set of source maps for prettier stack traces (increases build time)
		widenClientFileUpload: true,

		// Transpiles SDK to be compatible with IE11 (increases bundle size)
		transpileClientSDK: true,

		// Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
		tunnelRoute: '/monitoring',

		// Hides source maps from generated client bundles
		hideSourceMaps: true,

		// Automatically tree-shake Sentry logger statements to reduce bundle size
		disableLogger: true
	}
};
// Next.js 16: eslint configuration in next.config.js is no longer supported
// Use eslint.config.mjs for ESLint configuration instead
/** @type {import('next').NextConfig} */
const nextConfig = {
	output: ['standalone', 'export'].includes(BUILD_OUTPUT_MODE) ? BUILD_OUTPUT_MODE : undefined,
	// Next.js 16: Cache Components for explicit caching control
	// Note: Disabled for now due to incompatibility with route segment config "runtime"
	// cacheComponents: true,
	experimental: {
		optimizePackageImports: [
			'geist',
			'@ever-teams/constants',
			'@ever-teams/hooks',
			'@ever-teams/services',
			'@ever-teams/tookit',
			'@ever-teams/tookit-ui',
			'@ever-teams/tookit-types',
			'@ever-teams/types',
			'@ever-teams/utils',
			'@ever-teams/ui'
		],
		// Turbopack caching is enabled by default in Next.js 16
	},
	transpilePackages: [
		'geist',
		'@ever-teams/constants',
		'@ever-teams/hooks',
		'@ever-teams/services',
		'@ever-teams/types',
		'@ever-teams/utils',
		'@ever-teams/ui',
		'@radix-ui/react-icons',
		'react-icons',
		'@heroicons/react'
	],

	images: {
		// Next.js 16: remotePatterns replaces deprecated domains config
		remotePatterns: imageRemotePatterns
	},
	async rewrites() {
		// Next.js 16: rewrites should return an object with beforeFiles, afterFiles, and fallback
		return {
			beforeFiles: [],
			afterFiles: [
				{
					source: '/fonts/:path*',
					destination: '/assets/fonts/:path*'
				}
			],
			fallback: []
		};
	},
	// Only BUILD-identity values belong here: Next inlines every key of this block into the client AND
	// server bundles at build time. Branding (APP_NAME, APP_LOGO_URL, COMPANY_*, TERMS_LINK,
	// MAIN_PICTURE*, ...) is deliberately NOT listed: it is read at runtime (env-config.ts
	// readRuntimeEnv + the runtime env <script> in app/[locale]/layout.tsx), so a published Docker
	// image can be rebranded with container env instead of a rebuild.
	env: {
		NEXT_PUBLIC_BUILD_VERSION: process.env.NEXT_PUBLIC_BUILD_VERSION || webPackageVersion,
		NEXT_PUBLIC_BUILD_SHA: webBuildSha,
		NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
		NEXT_PUBLIC_SITE_TITLE: process.env.NEXT_PUBLIC_SITE_TITLE,
		NEXT_PUBLIC_SITE_DESCRIPTION: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
		NEXT_PUBLIC_SITE_KEYWORDS: process.env.NEXT_PUBLIC_SITE_KEYWORDS,
		NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
		NEXT_PUBLIC_TWITTER_USERNAME: process.env.NEXT_PUBLIC_TWITTER_USERNAME,
		// Build-time by nature: the hosts the /_next/image optimizer accepts (images.remotePatterns is
		// frozen into the build). proxy.ts compares them with the RUNTIME image hosts, and serves hosts
		// allowed only at runtime unoptimized instead of letting the optimizer reject them.
		EVER_TEAMS_OPTIMIZED_IMAGE_HOSTS: serializeImageRemotePatterns(imageRemotePatterns),
		ANALYZE: process.env.ANALYZE
		// NEXT_PUBLIC_DEMO is automatically accessible (no need to add it here)
	},
	...sentryConfig
};

// Injected content via Sentry wizard below
const sentryWebpackPluginOptions = {
	org: process.env.SENTRY_ORG || 'ever-co',
	project: process.env.SENTRY_PROJECT || 'ever-teams-web',

	// An auth token is required for uploading source maps.
	authToken: process.env.SENTRY_AUTH_TOKEN,

	silent: true, // Suppresses all logs

	dryRun: process.env.NODE_ENV !== 'production'

	// Additional config options for the Sentry Webpack plugin.
	// Keep in mind that https://github.com/getsentry/sentry-webpack-plugin#options.
};

// Make sure adding Sentry options is the last code to run before exporting
module.exports =
	process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN
		? withSentryConfig(withNextIntl(withBundleAnalyzer(nextConfig)), sentryWebpackPluginOptions)
		: withNextIntl(withBundleAnalyzer(nextConfig));
