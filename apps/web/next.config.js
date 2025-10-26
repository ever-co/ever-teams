const withNextIntl = require('next-intl/plugin')('./core/lib/i18n/request.ts');
const { withSentryConfig } = require('@sentry/nextjs');
const withBundleAnalyzer = require('@next/bundle-analyzer')({
	enabled: process.env.ANALYZE === 'true'
});
const isProduction = process.env.NODE_ENV === 'production';

const isSentryEnabled = isProduction && process.env.SENTRY_DSN;

// Parse images hosts from environment variable
const parseImagesHosts = () => {
	const hostsEnv = process.env.NEXT_PUBLIC_IMAGES_HOSTS;
	if (!hostsEnv) {
		// Default hosts if environment variable is not set
		return [
			'dummyimage.com',
			'res.cloudinary.com',
			'gauzy.sfo2.digitaloceanspaces.com',
			'cdn-icons-png.flaticon.com',
			'api.gauzy.co',
			'apida.gauzy.co',
			'apicw.gauzy.co',
			'apicivo.gauzy.co',
			'apidev.gauzy.co',
			'apidemo.gauzy.co',
			'apidemocw.gauzy.co',
			'apidemodt.gauzy.co',
			'apidemodts.gauzy.co',
			'apidemocivo.gauzy.co',
			'apidemoda.gauzy.co',
			'apistage.gauzy.co',
			'apistagecivo.gauzy.co',
			'apistagecw.gauzy.co',
			'apistageda.gauzy.co',
			'apistagedt.gauzy.co',
			'apistagedts.gauzy.co',
			'api.ever.team',
			'app.ever.team',
			'apidev.ever.team',
			'gauzy.s3.wasabisys.com',
			'gauzystage.s3.wasabisys.com'
		];
	}
	return hostsEnv.split(',').map((host) => host.trim());
};

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
			'@ever-teams/types',
			'@ever-teams/utils',
			'@ever-teams/ui'
		],
		// Next.js 16: Turbopack File System Caching for faster builds
		turbopackFileSystemCacheForDev: true
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
		remotePatterns: [
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
		],
		// Next.js 16: New image optimization defaults
		minimumCacheTTL: 14400, // 4 hours (changed from 60s in Next.js 16)
		dangerouslyAllowLocalIP: true, // Allow local IP optimization for development
		maximumRedirects: 3 // Limit redirects to prevent infinite loops
	},
	async rewrites() {
		return [
			{
				source: '/fonts/:path*',
				destination: '/assets/fonts/:path*'
			}
		];
	},
	env: {
		APP_NAME: process.env.APP_NAME,
		APP_SIGNATURE: process.env.APP_SIGNATURE,
		APP_LOGO_URL: process.env.APP_LOGO_URL,
		APP_LINK: process.env.APP_LINK,
		APP_SLOGAN_TEXT: process.env.APP_SLOGAN_TEXT,
		COMPANY_NAME: process.env.COMPANY_NAME,
		COMPANY_LINK: process.env.COMPANY_LINK,
		TERMS_LINK: process.env.TERMS_LINK,
		PRIVACY_POLICY_LINK: process.env.PRIVACY_POLICY_LINK,
		MAIN_PICTURE: process.env.MAIN_PICTURE,
		MAIN_PICTURE_DARK: process.env.MAIN_PICTURE_DARK,
		// New branding variables
		NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
		NEXT_PUBLIC_SITE_TITLE: process.env.NEXT_PUBLIC_SITE_TITLE,
		NEXT_PUBLIC_SITE_DESCRIPTION: process.env.NEXT_PUBLIC_SITE_DESCRIPTION,
		NEXT_PUBLIC_SITE_KEYWORDS: process.env.NEXT_PUBLIC_SITE_KEYWORDS,
		NEXT_PUBLIC_WEB_APP_URL: process.env.NEXT_PUBLIC_WEB_APP_URL,
		NEXT_PUBLIC_TWITTER_USERNAME: process.env.NEXT_PUBLIC_TWITTER_USERNAME,
		ANALYZE: process.env.ANALYZE
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
