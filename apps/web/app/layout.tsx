import '@/styles/globals.css';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import 'react-loading-skeleton/dist/skeleton.css';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@/core/components/providers/query-client-provider';
import dynamic from 'next/dynamic';

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
// `@tanstack/react-query-devtools` is useful only during development.
// A dynamic import ensures it isn’t included in the production bundle.
const ReactQueryDevtools =
	process.env.NODE_ENV === 'development'
		? dynamic(() => import('@tanstack/react-query-devtools').then((mod) => mod.ReactQueryDevtools))
		: () => null;
export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider>
			{children}
			<Toaster richColors />
			{/* Render devtools only in development */}
			{process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	);
}
