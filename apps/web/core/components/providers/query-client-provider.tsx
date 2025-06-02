'use client';

import React from 'react';
import { QueryClient, QueryClientProvider as ReactQueryClientProvider } from '@tanstack/react-query';
import { createQueryClientInstance } from '@/core/query/query-client';

export function QueryClientProvider({ children }: { children: React.ReactNode }) {
	const queryClientRef = React.useRef<QueryClient>(null);

	if (!queryClientRef.current) {
		queryClientRef.current = createQueryClientInstance();
	}

	return <ReactQueryClientProvider client={queryClientRef.current}>{children}</ReactQueryClientProvider>;
}
