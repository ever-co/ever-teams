import React, { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * The app's one query client, created once outside React: a client made during a render would be replaced, with its
 * cache, each time the navigator renders again, which a change of the phone's light or dark mode now does.
 */
export const queryClient = new QueryClient();

export function AppQueryProvider({ children }: { children: ReactNode }) {
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
