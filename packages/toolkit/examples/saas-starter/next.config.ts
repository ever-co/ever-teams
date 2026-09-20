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
	// No `env:` block. Every key listed here is inlined by Next into the client AND the server bundles
	// at build time, so the published image would carry the values of whoever built it and no
	// `docker run -e ...` could change them. These are deployment values: the API URL comes from the
	// server root layout as a prop, the app URL is read per request in the route handler that needs it
	// (lib/runtime-env.ts).
};

export default withNextIntl(nextConfig);
