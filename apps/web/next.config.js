/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	images: {
		domains: [
			'dummyimage.com',
			'res.cloudinary.com',
			'localhost',
			'127.0.0.1',
			'cdn-icons-png.flaticon.com', // Remove this domain once Backend Icons list are added
			'api.gauzy.co',
			'apistage.gauzy.co',
			'gauzy.s3.wasabisys.com'
		]
	},
	experimental: {
		appDir: true
	}
};

// module.exports = nextConfig;

// Injected content via Sentry wizard below

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig(
	nextConfig,
	{
		// For all available options, see:
		// https://github.com/getsentry/sentry-webpack-plugin#options

		// Suppresses source map uploading logs during build
		silent: true,
		org: process.env.SENTRY_ORG,
		project: process.env.SENTRY_PROJECT
	},
	{
		// For all available options, see:
		// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

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
);
