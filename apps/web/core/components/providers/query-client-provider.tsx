'use client';
import React from 'react';
import { QueryClient, QueryClientProvider as ReactQueryClientProvider, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/core/query/config'; // Import the configuration

/**
 * This provider wraps the application and provides the QueryClient.
 * It also handles the hydration of the data on the client side for the SSR.
 */
export function QueryClientProvider({ children }: { children: React.ReactNode }) {
	// We use a ref to ensure that QueryClient is created only once for the client.
	const queryClientRef = React.useRef<QueryClient>(getQueryClient());
	if (!queryClientRef.current) {
		queryClientRef.current = getQueryClient();
	}

	return <ReactQueryClientProvider client={queryClientRef.current}>{children}</ReactQueryClientProvider>;
}

// Function to dehydrate the state of the QueryClient on the server side
export { dehydrate };
