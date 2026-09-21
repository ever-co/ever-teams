import '@/styles/globals.css';
import 'react-loading-skeleton/dist/skeleton.css';
import { Toaster } from 'sonner';
import { connection } from 'next/server';
import { QueryClientProvider } from '@/core/components/providers/query-client-provider';
import { ProactiveTokenRefreshProvider } from '@/core/components/providers/proactive-token-refresh-provider';
import { RuntimeEnvProvider } from '@/core/components/providers/runtime-env-provider';
import { getPublicRuntimeEnv } from '@/core/services/server/runtime-env';
import dynamic from 'next/dynamic';

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
// `@tanstack/react-query-devtools` is useful only during development.
// A dynamic import ensures it isn’t included in the production bundle.
const ReactQueryDevtools =
	process.env.NODE_ENV === 'development'
		? dynamic(() => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools))
		: () => null;
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
	// The public runtime env must be read per request: a page prerendered at build time would freeze
	// the build machine's env into its HTML, which is exactly what self-hosted images must avoid.
	await connection();
	const runtimeEnv = getPublicRuntimeEnv();

	return (
		<RuntimeEnvProvider env={runtimeEnv}>
			<QueryClientProvider>
				<ProactiveTokenRefreshProvider>
					{children}
					<Toaster richColors />
					{/* Render devtools only in development */}
					{process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
				</ProactiveTokenRefreshProvider>
			</QueryClientProvider>
		</RuntimeEnvProvider>
	);
}
