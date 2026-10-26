import { isServer, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * A server-side QueryClient lives for one request, so none of its queries may arm a cache GC timer: a pending timer
 * keeps the request's whole async context (its render, streams and buffers) in memory until it fires. With the
 * 24-hour gcTime below, every server render, health probes included, stayed in memory for a day: the web pods grew
 * ~170 MiB/h until the 3 GiB limit OOM-killed them (2026-10-25). TanStack Query's own server default is gcTime
 * Infinity, which arms no timer; this keeps it for every query on the server, also those that set their own gcTime.
 */
function withoutGcTimers(client: QueryClient): QueryClient {
	const defaultQueryOptions = client.defaultQueryOptions.bind(client);
	client.defaultQueryOptions = ((options: Parameters<QueryClient['defaultQueryOptions']>[0]) => ({
		...defaultQueryOptions(options),
		gcTime: Infinity
	})) as QueryClient['defaultQueryOptions'];
	return client;
}

/**
 * Create and configure a new QueryClient instance.
 * This function is called once on the client side and for each SSR request on the server side.
 */
export function createQueryClientInstance(): QueryClient {
	const client = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // The data is considered "fresh" for 5 minutes
				gcTime: 1000 * 60 * 60 * 24, // The cache is kept for 24 hours (garbage collection)
				refetchOnWindowFocus: false, // Do not refetch automatically when the window regains focus
				refetchOnReconnect: false, // Fetches paused while offline still resume; hooks that need a resync opt in
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
	return isServer ? withoutGcTimers(client) : client;
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
export const globalQueryClient = getQueryClient();
