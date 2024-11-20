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
const eslintBuildConfig = process.env.NEXT_IGNORE_ESLINT_ERROR_ON_BUILD
	? {
			// Warning: IF TRUE This allows production builds to successfully complete even if
			// your project has ESLint errors.
			eslint: {
				ignoreDuringBuilds: true
			}
		}
	: {};
// eslint-disable-next-line @typescript-eslint/no-var-requires
/** @type {import('next').NextConfig} */
const nextConfig = {
	output: ['standalone', 'export'].includes(BUILD_OUTPUT_MODE) ? BUILD_OUTPUT_MODE : undefined,
	reactStrictMode: false,
	...eslintBuildConfig,
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
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'dummyimage.com',
				port: ''
			},
			{ protocol: 'https', hostname: 'res.cloudinary.com', port: '' },
			{
				protocol: 'https',
				hostname: 'gauzy.sfo2.digitaloceanspaces.com',
				port: ''
			},
			{
				protocol: 'http',
				hostname: 'localhost',
				port: '3030'
			},
			{
				protocol: 'http',
				hostname: '127.0.0.1',
				port: '3030'
			},
			{
				// Remove this domain once the Backend Icons list is added
				protocol: 'https',
				hostname: 'cdn-icons-png.flaticon.com',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'api.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apida.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apicw.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apicivo.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apidev.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apidemo.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apidemocw.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apidemodt.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apidemodts.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apidemocivo.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apidemoda.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apistage.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apistagecivo.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apistagecw.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apistageda.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apistagedt.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apistagedts.gauzy.co',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'api.ever.team',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'app.ever.team',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'apidev.ever.team',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'gauzy.s3.wasabisys.com',
				port: ''
			},
			{
				protocol: 'https',
				hostname: 'gauzystage.s3.wasabisys.com',
				port: ''
			}
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
		MAIN_PICTURE_DARK: process.env.MAIN_PICTURE_DARK
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
