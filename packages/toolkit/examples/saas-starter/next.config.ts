import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/i18n.ts');

const nextConfig: NextConfig = {
	// Nextjs Configuration
	webpack: (config, { isServer }) => {
		// Exclude Node.js modules from client-side bundle
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
				crypto: false,
				stream: false,
				url: false,
				zlib: false,
				http: false,
				https: false,
				assert: false,
				os: false,
				path: false,
				perf_hooks: false
			};

			// Add externals to prevent bundling server-side modules
			config.externals = config.externals || [];
			config.externals.push({
				postgres: 'commonjs postgres'
			});
		}
		return config;
	},
	env: {
		// Only include NEXT_PUBLIC_ variables here as they need to be available at build time
		// Server-side variables should be accessed directly via process.env at runtime
		NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
		NEXT_PUBLIC_TEAMS_API_URL: process.env.NEXT_PUBLIC_TEAMS_API_URL,
		NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
	}
};

export default withNextIntl(nextConfig);
