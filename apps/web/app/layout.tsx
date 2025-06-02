import '@/styles/globals.css';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import 'react-loading-skeleton/dist/skeleton.css';
import { Toaster } from 'sonner';
import { QueryClientProvider } from '@/core/components/providers/query-client-provider';

// Since we have a `not-found.tsx` page on the root, a layout file
// is required, even if it's just passing children through.
export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<QueryClientProvider>
					{children}
					<Toaster richColors />
					<ReactQueryDevtools initialIsOpen={false} />
				</QueryClientProvider>
			</body>
		</html>
	);
}
