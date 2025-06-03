// apps/web/core/query/config/index.ts
import { isServer, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Create and configure a new QueryClient instance.
 * This function is called once on the client side and for each SSR request on the server side.
 */
export function createQueryClientInstance(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // The data is considered "fresh" for 5 minutes
				gcTime: 1000 * 60 * 60 * 24, // The cache is kept for 24 hours (garbage collection)
				refetchOnWindowFocus: false, // Do not refetch automatically when the window regains focus
				retry: 1 // Retry the request 1 time in case of failure
			},
			mutations: {
				onError: (error) => {
					// Handle global mutation errors
					const message = error.message;
					toast.error(`Mutation Error: ${message}`);
					console.error('Global Mutation Error:', error);
					// Optional: report the error to an error monitoring service (ex: Sentry)
				}
			}
		}
	});
}

let browserQueryClient: QueryClient | undefined = undefined;

export const getQueryClient = () => {
	if (isServer) {
		// Server: always make a new query client
		return createQueryClientInstance();
	} else {
		// Browser: make a new query client if we don't already have one
		// This is very important, so we don't re-make a new client if React
		// suspends during the initial render. This may not be needed if we
		// have a suspense boundary BELOW the creation of the query client
		if (!browserQueryClient) browserQueryClient = createQueryClientInstance();
		return browserQueryClient;
	}
};
