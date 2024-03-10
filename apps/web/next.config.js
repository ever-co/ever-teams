/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const withNextIntl = require('next-intl/plugin')();
const { withSentryConfig } = require('@sentry/nextjs');

const isProduction = process.env.NODE_ENV === 'production';

const isSentryEnabled = isProduction && process.env.SENTRY_DSN;

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

// eslint-disable-next-line @typescript-eslint/no-var-requires
/** @type {import('next').NextConfig} */
const nextConfig = {
	output: ['standalone', 'export'].includes(BUILD_OUTPUT_MODE) ? BUILD_OUTPUT_MODE : undefined,
	reactStrictMode: false,
	swcMinify: true,
	webpack: (config, { isServer }) => {
		config.resolve.alias['@app'] = path.join(__dirname, 'app');
		config.resolve.alias['@components'] = path.join(__dirname, 'components');
		config.resolve.alias['app'] = path.join(__dirname, 'app');
		config.resolve.alias['components'] = path.join(__dirname, 'components');
		config.resolve.alias['lib'] = path.join(__dirname, 'lib');

		const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test?.('.svg'));

		config.module.rules.push(
			{
				...fileLoaderRule,
				type: 'javascript/auto',
				test: /\.svg$/i,
				resourceQuery: /url/ // *.svg?url
			},
			{
				test: /\.svg$/i,
				type: 'javascript/auto',
				issuer: fileLoaderRule.issuer,
				resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
				use: [
					{
						loader: '@svgr/webpack',
						options: {
							dimensions: false
						}
					}
				]
			}
		);
		return config;
	},
	images: {
		domains: [
			'dummyimage.com',
			'res.cloudinary.com',
			'localhost',
			'127.0.0.1',
			'cdn-icons-png.flaticon.com', // Remove this domain once the Backend Icons list is added
			'api.gauzy.co',
			'apidev.gauzy.co',
			'apistage.gauzy.co',
			'api.ever.team',
			'apidev.ever.team',
			'gauzy.s3.wasabisys.com',
			'gauzystage.s3.wasabisys.com'
		]
	},
	async rewrites() {
		return [
			{
				source: '/fonts/:path*',
				destination: '/assets/fonts/:path*'
			}
		];
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
		? withSentryConfig(withNextIntl(nextConfig), sentryWebpackPluginOptions)
		: withNextIntl(nextConfig);
